import type {
  OrgAccessClient,
  OrgAccessFilterBuilder,
  OrgAccessMembershipRow,
  OrgAccessQueryBuilder,
} from '../ports'

export type SeededMembership = {
  userId: string
  slug: string
  orgId: string
  inviteStatus: string
}

export class SpyOrgAccessClient implements OrgAccessClient {
  fromCalls = 0

  constructor(private readonly memberships: SeededMembership[]) {}

  from(_relation: string): OrgAccessQueryBuilder {
    this.fromCalls++
    const filters: Record<string, string> = {}

    const builder: OrgAccessFilterBuilder = {
      eq(column, value) {
        filters[column] = value
        return builder
      },
      neq(column, value) {
        filters[`neq:${column}`] = value
        return builder
      },
      maybeSingle: async () => {
        const userId = filters['user_id']
        const slug = filters['organizations.slug']
        const excludedStatus = filters['neq:invite_status']

        const match = this.memberships.find(
          (m) => m.userId === userId && m.slug === slug && m.inviteStatus !== excludedStatus
        )

        const data: OrgAccessMembershipRow | null = match ? { org_id: match.orgId } : null
        return { data }
      },
    }

    return { select: () => builder }
  }
}
