import type { OrgAccess, OrgAccessClient } from './ports'

/**
 * Resolve whether `userId` may reach the org named by `slug`.
 *
 * Folds the old slug -> org -> membership chain into one round-trip: a single
 * select on `user_org_memberships` with a `!inner` join to `organizations`
 * filtered by slug. No matching row means the slug is unknown, the user is not
 * a member, or the membership is deactivated — all of which deny access.
 */
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
