'use client'

import { CheckCircle2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

import { completeOnboardingSetup } from '@/app/actions/org'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useOnboarding } from '@/providers/OnboardingProvider'

export default function SetupCompletePage() {
  const router = useRouter()
  const { name, slug, departments, categories } = useOnboarding()
  const [saving, setSaving] = useState(false)

  // Guard: if user lands here without going through the wizard (e.g. direct URL),
  // send them back to start.
  if (!name || !slug) {
    router.replace('/org/new')
    return null
  }

  async function handleComplete() {
    setSaving(true)
    const result = await completeOnboardingSetup({ name, slug }, departments, categories)
    if (result?.error) {
      toast.error(result.error)
      setSaving(false)
    }
    // On success the server action redirects to /dashboard
  }

  return (
    <Card className="text-center shadow-md">
      <CardHeader className="pb-2">
        <div className="bg-primary/10 mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full">
          <CheckCircle2 className="text-primary h-8 w-8" />
        </div>
        <CardTitle className="text-xl">Ready to go!</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">
          Here&apos;s what will be created for your workspace:
        </p>
        <ul className="mt-4 space-y-2 text-left text-sm">
          <li className="text-muted-foreground flex items-center gap-2">
            <CheckCircle2 className="text-primary h-4 w-4 shrink-0" />
            Organization: <span className="font-medium">{name}</span>
          </li>
          <li className="text-muted-foreground flex items-center gap-2">
            <CheckCircle2 className="text-primary h-4 w-4 shrink-0" />
            {departments.length > 0
              ? `${departments.length} department${departments.length !== 1 ? 's' : ''}`
              : 'No departments (you can add them later)'}
          </li>
          <li className="text-muted-foreground flex items-center gap-2">
            <CheckCircle2 className="text-primary h-4 w-4 shrink-0" />
            {categories.length > 0
              ? `${categories.length} asset categor${categories.length !== 1 ? 'ies' : 'y'}`
              : 'No categories (you can add them later)'}
          </li>
        </ul>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="ghost" onClick={() => router.push('/setup/categories')} disabled={saving}>
          Back
        </Button>
        <Button onClick={handleComplete} disabled={saving}>
          {saving ? 'Creating workspace…' : 'Complete Setup'}
        </Button>
      </CardFooter>
    </Card>
  )
}
