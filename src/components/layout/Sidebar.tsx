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
  Wrench,
} from 'lucide-react'
import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'

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
  activePrefix?: string
}

function buildNavMain(base: string): NavItem[] {
  return [
    { label: 'Dashboard', href: `${base}/dashboard`, icon: LayoutDashboard },
    { label: 'Assets', href: `${base}/assets`, icon: Package },
    { label: 'Maintenance', href: `${base}/maintenance`, icon: Wrench },
    { label: 'Reports', href: `${base}/reports`, icon: BarChart3 },
  ]
}

function buildNavManage(base: string, deptLabel: string): NavItem[] {
  return [
    { label: `${deptLabel}s`, href: `${base}/departments`, icon: Building2 },
    { label: 'Categories', href: `${base}/categories`, icon: Tag },
    { label: 'Locations', href: `${base}/locations`, icon: MapPin },
    { label: 'Vendors', href: `${base}/vendors`, icon: Truck },
    { label: 'Users', href: `${base}/users`, icon: Users },
  ]
}

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
      scroll={false}
      onClick={onNavClick}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-sidebar-primary text-sidebar-primary-foreground'
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
  const { org, role, departmentIds } = useOrg()
  const params = useParams<{ slug?: string }>()
  const slug = params.slug ?? ''
  const base = slug ? `/orgs/${slug}` : ''

  const hasOrg = !!org
  const isAdmin =
    role != null ? createPolicy({ role, departmentIds }).can('department:manage') : false
  const visibleManageItems = isAdmin
    ? buildNavManage(base, org?.departmentLabel ?? 'Department')
    : []

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
            {buildNavMain(base).map((item) => (
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

        {isAdmin && base && (
          <>
            <Separator className="bg-sidebar-border my-3" />
            <nav className="space-y-1">
              <NavLink
                item={{
                  label: 'Settings',
                  href: `${base}/settings/org`,
                  icon: Settings,
                  activePrefix: `${base}/settings`,
                }}
                pathname={pathname}
                onNavClick={onNavClick}
              />
            </nav>
          </>
        )}
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
              {role && <RoleBadge role={role} className="mt-0.5 text-[10px]" />}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
