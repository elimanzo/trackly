'use client'

import { Loader2 } from 'lucide-react'
import { notFound, redirect } from 'next/navigation'
import { use } from 'react'

import { AssetForm } from '@/components/assets/AssetForm'
import { PageHeader } from '@/components/shared/PageHeader'
import { useAsset } from '@/lib/hooks/useAssets'
import { createPolicy } from '@/lib/permissions'
import { useAuth } from '@/providers/AuthProvider'

interface EditAssetPageProps {
  params: Promise<{ id: string }>
}

export default function EditAssetPage({ params }: EditAssetPageProps) {
  const { id } = use(params)
  const { data: asset, isLoading } = useAsset(id)
  const { user } = useAuth()

  if (
    user &&
    !createPolicy({ role: user.role, departmentIds: user.departmentIds }).can('asset:create')
  ) {
    redirect('/assets')
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    )
  }

  if (!asset) return notFound()

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Edit asset" description={asset.name} />
      <AssetForm asset={asset} />
    </div>
  )
}
