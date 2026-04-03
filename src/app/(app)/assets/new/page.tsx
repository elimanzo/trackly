'use client'

import { redirect } from 'next/navigation'

import { AssetForm } from '@/components/assets/AssetForm'
import { PageHeader } from '@/components/shared/PageHeader'
import { useNextAssetTag } from '@/lib/hooks/useAssets'
import { createPolicy } from '@/lib/permissions'
import { useAuth } from '@/providers/AuthProvider'

export default function NewAssetPage() {
  const { user } = useAuth()
  const nextTag = useNextAssetTag()

  if (
    user &&
    !createPolicy({ role: user.role, departmentIds: user.departmentIds }).can('asset:create')
  ) {
    redirect('/assets')
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Add asset" description="Fill in the details to register a new asset." />
      <AssetForm defaultAssetTag={nextTag} />
    </div>
  )
}
