import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export type ActionContext = {
  userId: string
  orgId: string
  actorName: string

  admin: ReturnType<typeof createAdminClient>
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
  const { data: profile } = await admin
    .from('profiles')
    .select('org_id, full_name')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.org_id) return null
  return {
    userId: user.id,
    orgId: profile.org_id as string,
    actorName: (profile.full_name as string) ?? 'Unknown',
    admin,
  }
}
