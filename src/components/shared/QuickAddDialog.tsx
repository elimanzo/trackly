'use client'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

interface QuickAddDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  onAdd: (name: string) => Promise<string | null>
}

export function QuickAddDialog({ open, onOpenChange, title, onAdd }: QuickAddDialogProps) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    const id = await onAdd(name.trim())
    setSaving(false)
    if (id) {
      setName('')
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <Input
          autoFocus
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              void handleSave()
            }
          }}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!name.trim() || saving} onClick={() => void handleSave()}>
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
