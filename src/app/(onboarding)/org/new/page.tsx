import { Suspense } from 'react'

import { CreateOrgForm } from './CreateOrgForm'

export default function CreateOrgPage() {
  return (
    <Suspense>
      <CreateOrgForm />
    </Suspense>
  )
}
