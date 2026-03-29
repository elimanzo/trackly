'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

import type { ActionClients } from './_context'

export async function googleSignInDestination(
  clients?: ActionClients
): Promise<{ destination: string } | { error: string }> {
  const supabase = clients?.supabase ?? (await createClient())
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const admin = clients?.admin ?? createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .maybeSingle()

  return { destination: profile?.org_id ? '/dashboard' : '/org/new' }
}
