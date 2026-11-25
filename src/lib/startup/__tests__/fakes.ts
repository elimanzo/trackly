import type {
  DepartmentRow,
  MembershipRow,
  ProfileRow,
  StartupClient,
  StartupQueryBuilder,
} from '../ports'

type Seed = {
  profile: ProfileRow | null
  memberships: MembershipRow[]
  departments: DepartmentRow[]
  // Relations that resolve on a macrotask instead of a microtask, so a test can
  // prove one read is not on another's critical path.
  slow?: string[]
}

export class SpyStartupClient implements StartupClient {
  events: string[] = []
  dispatched: string[] = []
  departmentOrgIdFilter: string[] | null = null
  private readonly slow: Set<string>

  constructor(private readonly seed: Seed) {
    this.slow = new Set(seed.slow ?? [])
  }

  private settle(relation: string): Promise<void> {
    return this.slow.has(relation)
      ? new Promise((resolve) => setTimeout(resolve, 0))
      : Promise.resolve()
  }

  from<Row = Record<string, unknown>>(relation: string): StartupQueryBuilder<Row> {
    this.events.push(`dispatch:${relation}`)
    this.dispatched.push(relation)

    const builder: StartupQueryBuilder<Row> = {
      select: () => builder,
      eq: () => builder,
      in: (_column, values) => {
        if (relation === 'user_departments') this.departmentOrgIdFilter = values
        return builder
      },
      maybeSingle: () => this.resolveSingle<Row>(relation),
      then: (onfulfilled, onrejected) =>
        this.resolveList<Row>(relation).then(onfulfilled, onrejected),
    }

    return builder
  }

  private resolveSingle<Row>(relation: string): Promise<{ data: Row | null }> {
    return this.settle(relation).then(() => {
      this.events.push(`resolve:${relation}`)
      const data = relation === 'profiles' ? this.seed.profile : null
      return { data: data as Row | null }
    })
  }

  private resolveList<Row>(relation: string): Promise<{ data: Row[] | null }> {
    return this.settle(relation).then(() => {
      this.events.push(`resolve:${relation}`)
      const rows =
        relation === 'user_org_memberships'
          ? this.seed.memberships
          : relation === 'user_departments'
            ? this.seed.departments
            : []
      return { data: rows as Row[] }
    })
  }
}
