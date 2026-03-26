import { connection } from 'next/server'
import { Suspense } from 'react'

import { AuthCallbackHandler } from './AuthCallbackHandler'

export default async function AuthCallbackPage() {
  await connection()
  return (
    <Suspense>
      <AuthCallbackHandler />
    </Suspense>
  )
}
