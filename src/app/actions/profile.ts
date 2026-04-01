'use server'

import { redirect } from 'next/navigation'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { UpdateProfileInput } from '@/lib/types'

export async function updateProfileAction(
  input: UpdateProfileInput
): Promise<{ error: string } | { error: null }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const patch: Record<string, unknown> = {
    full_name: input.fullName,
    updated_at: new Date().toISOString(),
  }
  if (input.avatarUrl !== undefined) patch.avatar_url = input.avatarUrl

  const { error } = await admin.from('profiles').update(patch).eq('id', user.id)

  return { error: error?.message ?? null }
}
