import type { SupabaseClient } from '@supabase/supabase-js'

import type { OrgAccessClient } from './ports'

export function asOrgAccessClient(client: SupabaseClient): OrgAccessClient {
  return client as unknown as OrgAccessClient
}
