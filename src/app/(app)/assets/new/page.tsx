'use client'

import { redirect } from 'next/navigation'

import { AssetForm } from '@/components/assets/AssetForm'
import { PageHeader } from '@/components/shared/PageHeader'
import { useNextAssetTag } from '@/lib/hooks/useAssets'
import { canEdit } from '@/lib/utils/permissions'
import { useAuth } from '@/providers/AuthProvider'

export default function NewAssetPage() {
  const { user } = useAuth()
  const nextTag = useNextAssetTag()

  if (user && !canEdit(user.role)) {
    redirect('/assets')
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Add asset" description="Fill in the details to register a new asset." />
      <AssetForm defaultAssetTag={nextTag} />
    </div>
  )
}
