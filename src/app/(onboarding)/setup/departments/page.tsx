'use client'

import { Building2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

import { createDepartment } from '@/app/actions/departments'
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
import { SUGGESTED_DEPARTMENTS } from '@/lib/constants'

export default function SetupDepartmentsPage() {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [custom, setCustom] = useState('')
  const [saving, setSaving] = useState(false)

  function toggleDept(name: string) {
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

  async function onContinue() {
    setSaving(true)
    for (const name of selected) {
      const result = await createDepartment({ name })
      if ('error' in result) {
        toast.error(`Failed to create "${name}": ${result.error}`)
        setSaving(false)
        return
      }
    }
    router.push('/setup/categories')
  }

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="text-primary h-5 w-5" />
          Set up departments
        </CardTitle>
        <CardDescription>
          Select the departments in your organization. Assets will be assigned to these.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {SUGGESTED_DEPARTMENTS.map((dept) => (
            <label
              key={dept}
              className="border-border hover:bg-accent flex cursor-pointer items-center gap-2 rounded-lg border p-3 transition-colors"
            >
              <Checkbox checked={selected.has(dept)} onCheckedChange={() => toggleDept(dept)} />
              <span className="text-sm font-medium">{dept}</span>
            </label>
          ))}
        </div>

        {/* Custom department */}
        <div className="flex gap-2">
          <Input
            placeholder="Add custom department…"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCustom()}
          />
          <Button variant="outline" onClick={addCustom} disabled={!custom.trim()}>
            Add
          </Button>
        </div>

        {/* Selected custom ones not in suggestions */}
        {Array.from(selected)
          .filter((d) => !SUGGESTED_DEPARTMENTS.includes(d))
          .map((dept) => (
            <div
              key={dept}
              className="border-primary/30 bg-primary/5 flex items-center justify-between rounded-lg border px-3 py-2"
            >
              <span className="text-sm font-medium">{dept}</span>
              <button
                onClick={() => toggleDept(dept)}
                className="text-muted-foreground hover:text-destructive text-xs"
              >
                Remove
              </button>
            </div>
          ))}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="ghost" onClick={() => router.push('/org/new')}>
          Back
        </Button>
        <Button onClick={onContinue} disabled={saving}>
          {saving ? 'Saving…' : selected.size > 0 ? `Continue (${selected.size} selected)` : 'Skip'}
        </Button>
      </CardFooter>
    </Card>
  )
}
