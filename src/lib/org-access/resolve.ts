import type { OrgAccess, OrgAccessClient } from './ports'

export async function resolveOrgAccess(
  client: OrgAccessClient,
  { userId, slug }: { userId: string; slug: string }
): Promise<OrgAccess> {
  const { data } = await client
    .from('user_org_memberships')
    .select('org_id, organizations!inner(slug)')
    .eq('user_id', userId)
    .eq('organizations.slug', slug)
    .neq('invite_status', 'deactivated')
    .maybeSingle()

  if (!data?.org_id) return { isMember: false, orgId: null }
  return { isMember: true, orgId: data.org_id }
}
