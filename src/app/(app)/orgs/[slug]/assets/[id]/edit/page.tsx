'use client'

import { notFound, useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'
import { use } from 'react'

import { AssetForm } from '@/components/assets/AssetForm'
import { PageHeader } from '@/components/shared/PageHeader'
import { Skeleton } from '@/components/ui/skeleton'
import { useAsset } from '@/lib/hooks/useAssets'
import { createPolicy } from '@/lib/permissions'
import { useOrg } from '@/providers/OrgProvider'

interface EditAssetPageProps {
  params: Promise<{ id: string }>
}

export default function EditAssetPage({ params }: EditAssetPageProps) {
  const { id } = use(params)
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const { data: asset, isLoading } = useAsset(id)
  const { role, departmentIds } = useOrg()

  if (role && !createPolicy({ role, departmentIds }).can('asset:create')) {
    router.replace(`/orgs/${slug}/assets`)
    return null
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <Skeleton className="h-7 w-24" />
          <Skeleton className="mt-1 h-4 w-40" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          ))}
        </div>
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
