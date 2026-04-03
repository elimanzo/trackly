'use client'

import {
  BarChart3,
  BoxesIcon,
  Building2,
  LayoutDashboard,
  MapPin,
  Package,
  Settings,
  Tag,
  Truck,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { RoleBadge } from '@/components/shared/RoleBadge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { createPolicy } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import { useAuth } from '@/providers/AuthProvider'
import { useOrg } from '@/providers/OrgProvider'

type NavItem = {
  label: string
  href: string
  icon: React.ElementType
  adminOnly?: boolean
  activePrefix?: string
}

const NAV_MAIN: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Assets', href: '/assets', icon: Package },
  { label: 'Reports', href: '/reports', icon: BarChart3 },
]

function buildNavManage(deptLabel: string): NavItem[] {
  return [
    { label: `${deptLabel}s`, href: '/departments', icon: Building2, adminOnly: true },
    { label: 'Categories', href: '/categories', icon: Tag, adminOnly: true },
    { label: 'Locations', href: '/locations', icon: MapPin, adminOnly: true },
    { label: 'Vendors', href: '/vendors', icon: Truck, adminOnly: true },
    { label: 'Users', href: '/users', icon: Users, adminOnly: true },
  ]
}

const NAV_SETTINGS: NavItem[] = [
  { label: 'Settings', href: '/settings/org', icon: Settings, activePrefix: '/settings' },
]

interface NavLinkProps {
  item: NavItem
  pathname: string
  onNavClick?: () => void
}

function NavLink({ item, pathname, onNavClick }: NavLinkProps) {
  const prefix = item.activePrefix ?? item.href
  const isActive =
    pathname === item.href || pathname.startsWith(`${prefix}/`) || pathname === prefix
  const Icon = item.icon

  return (
    <Link
      href={item.href}
      onClick={onNavClick}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {item.label}
    </Link>
  )
}

interface SidebarProps {
  onNavClick?: () => void
}

export function Sidebar({ onNavClick }: SidebarProps) {
  const pathname = usePathname()
  const { user } = useAuth()
  const { org } = useOrg()
  const hasOrg = !!user?.orgId
  const isAdmin = user
    ? createPolicy({ role: user.role, departmentIds: user.departmentIds }).can('department:manage')
    : false
  const visibleManageItems = isAdmin ? buildNavManage(org?.departmentLabel ?? 'Department') : []

  return (
    <div className="bg-sidebar flex h-full flex-col">
      {/* Logo */}
      <div className="border-sidebar-border flex h-14 items-center gap-2 border-b px-4">
        <div className="bg-sidebar-primary flex h-7 w-7 items-center justify-center rounded-lg shadow-sm">
          <BoxesIcon className="text-sidebar-primary-foreground h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sidebar-foreground truncate text-sm font-semibold">Trackly</p>
          {org && <p className="text-muted-foreground truncate text-xs">{org.name}</p>}
        </div>
      </div>

      {/* Nav */}
      <ScrollArea className="flex-1 px-3 py-3">
        {hasOrg && (
          <nav className="space-y-1">
            {NAV_MAIN.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} onNavClick={onNavClick} />
            ))}
          </nav>
        )}

        {visibleManageItems.length > 0 && (
          <>
            <Separator className="bg-sidebar-border my-3" />
            <p className="text-muted-foreground mb-1 px-3 text-xs font-semibold tracking-wider uppercase">
              Manage
            </p>
            <nav className="space-y-1">
              {visibleManageItems.map((item) => (
                <NavLink key={item.href} item={item} pathname={pathname} onNavClick={onNavClick} />
              ))}
            </nav>
          </>
        )}

        {(hasOrg || visibleManageItems.length > 0) && (
          <Separator className="bg-sidebar-border my-3" />
        )}
        <nav className="space-y-1">
          {NAV_SETTINGS.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} onNavClick={onNavClick} />
          ))}
        </nav>
      </ScrollArea>

      {/* User info */}
      {user && (
        <div className="border-sidebar-border border-t p-3">
          <div className="flex items-center gap-2">
            <div className="bg-sidebar-primary/20 text-sidebar-primary flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
              {user.fullName
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sidebar-foreground truncate text-xs font-medium">
                {user.fullName}
              </p>
              <RoleBadge role={user.role} className="mt-0.5 text-[10px]" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
