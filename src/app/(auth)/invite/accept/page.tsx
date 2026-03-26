import { connection } from 'next/server'
import { Suspense } from 'react'

import { AcceptInviteForm } from './AcceptInviteForm'

export default async function AcceptInvitePage() {
  await connection()
  return (
    <Suspense>
      <AcceptInviteForm />
    </Suspense>
  )
}
