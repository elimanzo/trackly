import type { SupabaseClient } from '@supabase/supabase-js'

import type { StartupClient } from './ports'

export function asStartupClient(client: SupabaseClient): StartupClient {
  return client as unknown as StartupClient
}
