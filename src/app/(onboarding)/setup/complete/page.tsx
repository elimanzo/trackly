'use client'

import { CheckCircle2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useOrg } from '@/providers/OrgProvider'

export default function SetupCompletePage() {
  const { completeOnboarding } = useOrg()
  const router = useRouter()

  function handleGoToDashboard() {
    completeOnboarding()
    router.push('/dashboard')
  }

  return (
    <Card className="text-center shadow-md">
      <CardHeader className="pb-2">
        <div className="bg-primary/10 mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full">
          <CheckCircle2 className="text-primary h-8 w-8" />
        </div>
        <CardTitle className="text-xl">You&apos;re all set!</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">
          Your organization is ready. Start adding assets, inviting team members, and tracking
          everything from your dashboard.
        </p>
        <ul className="mt-4 space-y-2 text-left text-sm">
          {['Organization created', 'Departments configured', 'Asset categories set up'].map(
            (item) => (
              <li key={item} className="text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="text-primary h-4 w-4 shrink-0" />
                {item}
              </li>
            )
          )}
        </ul>
      </CardContent>
      <CardFooter>
        <Button className="w-full" onClick={handleGoToDashboard}>
          Go to Dashboard
        </Button>
      </CardFooter>
    </Card>
  )
}
