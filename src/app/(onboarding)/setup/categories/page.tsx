'use client'

import { Tag } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { SUGGESTED_CATEGORIES } from '@/lib/constants'
import { useOnboarding } from '@/providers/OnboardingProvider'

export default function SetupCategoriesPage() {
  const router = useRouter()
  const { categories, setCategories } = useOnboarding()
  const [selected, setSelected] = useState<Set<string>>(new Set(categories))
  const [custom, setCustom] = useState('')

  function toggle(name: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  function addCustom() {
    const trimmed = custom.trim()
    if (trimmed) {
      setSelected((prev) => new Set([...prev, trimmed]))
      setCustom('')
    }
  }

  function onBack() {
    setCategories(Array.from(selected))
    router.push('/setup/departments')
  }

  function onContinue() {
    setCategories(Array.from(selected))
    router.push('/setup/complete')
  }

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="text-primary h-5 w-5" />
          Set up asset categories
        </CardTitle>
        <CardDescription>
          Categories help you organize and filter your assets. Pick the ones that match your
          inventory.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {SUGGESTED_CATEGORIES.map(({ name }) => (
            <label
              key={name}
              className="border-border hover:bg-accent flex cursor-pointer items-center gap-2 rounded-lg border p-3 transition-colors"
            >
              <Checkbox checked={selected.has(name)} onCheckedChange={() => toggle(name)} />
              <span className="text-sm font-medium">{name}</span>
            </label>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Add custom category…"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCustom()}
          />
          <Button variant="outline" onClick={addCustom} disabled={!custom.trim()}>
            Add
          </Button>
        </div>

        {Array.from(selected)
          .filter((c) => !SUGGESTED_CATEGORIES.some((s) => s.name === c))
          .map((cat) => (
            <div
              key={cat}
              className="border-primary/30 bg-primary/5 flex items-center justify-between rounded-lg border px-3 py-2"
            >
              <span className="text-sm font-medium">{cat}</span>
              <button
                onClick={() => toggle(cat)}
                className="text-muted-foreground hover:text-destructive text-xs"
              >
                Remove
              </button>
            </div>
          ))}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onContinue}>
          {selected.size > 0 ? `Continue (${selected.size} selected)` : 'Skip'}
        </Button>
      </CardFooter>
    </Card>
  )
}
