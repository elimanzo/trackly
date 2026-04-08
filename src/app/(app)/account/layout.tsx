'use client'

import { ArrowLeft, BoxesIcon, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getInitials } from '@/lib/utils/formatters'
import { useAuth } from '@/providers/AuthProvider'

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, signOut } = useAuth()

  async function handleSignOut() {
    await signOut()
    router.push('/login')
  }

  return (
    <div className="bg-background flex h-screen flex-col overflow-hidden">
      <header className="border-border bg-card flex h-14 shrink-0 items-center border-b px-6">
        <div className="flex items-center gap-2">
          <div className="bg-primary flex h-7 w-7 items-center justify-center rounded-lg shadow-sm">
            <BoxesIcon className="text-primary-foreground h-4 w-4" />
          </div>
          <span className="text-sm font-semibold">Trackly</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground ml-4"
          onClick={() => router.back()}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back
        </Button>
        <div className="flex-1" />
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                aria-label="Open user menu"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                    {getInitials(user.fullName)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="font-normal">
                <p className="text-sm font-medium">{user.fullName}</p>
                <p className="text-muted-foreground truncate text-xs">{user.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-6 py-10">{children}</div>
      </div>
    </div>
  )
}
