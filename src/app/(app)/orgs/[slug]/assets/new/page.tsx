'use client'

import { useParams, useRouter } from 'next/navigation'

import { AssetForm } from '@/components/assets/AssetForm'
import { PageHeader } from '@/components/shared/PageHeader'
import { useNextAssetTag } from '@/lib/hooks/useAssets'
import { createPolicy } from '@/lib/permissions'
import { useOrg } from '@/providers/OrgProvider'

export default function NewAssetPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const nextTag = useNextAssetTag()
  const { role, departmentIds } = useOrg()

  if (role && !createPolicy({ role, departmentIds }).can('asset:create')) {
    router.replace(`/orgs/${slug}/assets`)
    return null
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Add asset" description="Fill in the details to register a new asset." />
      <AssetForm defaultAssetTag={nextTag} />
    </div>
  )
}
