import { redirect } from 'next/navigation'
import { Suspense } from 'react'

import { createClient } from '@/lib/supabase/server'

import { AcceptInviteForm } from './AcceptInviteForm'

export default async function AcceptInvitePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Only show this page if the user has a valid pending invite
  const { data: invite } = await supabase
    .from('invites')
    .select('id')
    .eq('email', user.email!.toLowerCase())
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (!invite) redirect('/dashboard')

  return (
    <Suspense>
      <AcceptInviteForm />
    </Suspense>
  )
}
