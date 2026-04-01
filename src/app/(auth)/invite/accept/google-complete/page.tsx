import { redirect } from 'next/navigation'
import { Suspense } from 'react'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

import { GoogleCompleteForm } from './GoogleCompleteForm'

export default async function GoogleCompleteInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>
}) {
  const { org: orgName = '' } = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: invite } = await admin
    .from('invites')
    .select('id')
    .eq('email', user.email!.toLowerCase())
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (!invite) redirect('/login?error=invalid_link')

  const googleName = (user.user_metadata?.full_name as string | undefined) ?? ''

  return (
    <Suspense>
      <GoogleCompleteForm defaultName={googleName} orgName={orgName} />
    </Suspense>
  )
}
