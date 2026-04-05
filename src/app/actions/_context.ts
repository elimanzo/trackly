import { createPolicy } from '@/lib/permissions'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/lib/types'

export type ActionContext = {
  userId: string
  orgId: string
  actorName: string
  role: UserRole
  departmentIds: string[]
  admin: ReturnType<typeof createAdminClient>
  requireRole(level: 'editor' | 'admin'): { error: string } | null
}

export type ActionClients = {
  supabase?: Awaited<ReturnType<typeof createClient>>
  admin?: ReturnType<typeof createAdminClient>
}

export async function getContext(clients?: ActionClients): Promise<ActionContext | null> {
  const supabase = clients?.supabase ?? (await createClient())
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const admin = clients?.admin ?? createAdminClient()

  // Step 1: resolve the user's active membership (first one in Phase 1;
  // Phase 2 will select by org slug from the URL)
  const { data: membership } = await admin
    .from('user_org_memberships')
    .select('org_id, role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership?.org_id) return null

  // Step 2: fetch display name + scoped departments in parallel
  const [{ data: profile }, { data: deptRows }] = await Promise.all([
    admin.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
    admin
      .from('user_departments')
      .select('department_id')
      .eq('user_id', user.id)
      .eq('org_id', membership.org_id),
  ])

  const role = membership.role as UserRole
  const departmentIds = (deptRows ?? []).map((r: { department_id: string }) => r.department_id)

  return {
    userId: user.id,
    orgId: membership.org_id as string,
    actorName: (profile?.full_name as string) ?? 'Unknown',
    role,
    departmentIds,
    admin,
    requireRole(level: 'editor' | 'admin') {
      const action = level === 'admin' ? 'department:manage' : 'asset:create'
      return createPolicy({ role, departmentIds }).enforce(action)
    },
  }
}

/** Get context and assert admin role in one call. Returns the context or an error object. */
export async function getAdminCtx(): Promise<ActionContext | { error: string }> {
  const ctx = await getContext()
  if (!ctx) return { error: 'Not authenticated' }
  return ctx.requireRole('admin') ?? ctx
}
