import type { AssetStatus, UserRole } from '@/lib/types'

// ---------------------------------------------------------------------------
// Asset status display config
// ---------------------------------------------------------------------------

export const ASSET_STATUS_CONFIG: Record<
  AssetStatus,
  {
    label: string
    color: string
    badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline'
  }
> = {
  active: { label: 'Active', color: '#22c55e', badgeVariant: 'default' },
  under_maintenance: { label: 'Under Maintenance', color: '#f59e0b', badgeVariant: 'secondary' },
  retired: { label: 'Retired', color: '#6b7280', badgeVariant: 'outline' },
  lost: { label: 'Lost', color: '#ef4444', badgeVariant: 'destructive' },
  in_storage: { label: 'In Storage', color: '#8b5cf6', badgeVariant: 'secondary' },
  checked_out: { label: 'Checked Out', color: '#3b82f6', badgeVariant: 'default' },
  reserved: { label: 'Reserved', color: '#f97316', badgeVariant: 'secondary' },
}

// ---------------------------------------------------------------------------
// User role display config
// ---------------------------------------------------------------------------

export const USER_ROLE_CONFIG: Record<UserRole, { label: string; description: string }> = {
  owner: {
    label: 'Owner',
    description: 'Full access; cannot be demoted',
  },
  admin: {
    label: 'Admin',
    description: 'Manage all assets, users, and departments',
  },
  editor: {
    label: 'Editor',
    description: 'Add, edit, and delete assets in assigned departments',
  },
  viewer: {
    label: 'Viewer',
    description: 'View and export assets in assigned departments',
  },
}

// ---------------------------------------------------------------------------
// Onboarding suggested department names
// ---------------------------------------------------------------------------

export const SUGGESTED_DEPARTMENTS = [
  'IT',
  'Finance',
  'HR',
  'Operations',
  'Marketing',
  'Sales',
  'Legal',
  'Facilities',
]

// ---------------------------------------------------------------------------
// Onboarding suggested categories (with Lucide icon names)
// ---------------------------------------------------------------------------

export const SUGGESTED_CATEGORIES = [
  { name: 'Laptop', icon: 'laptop' },
  { name: 'Monitor', icon: 'monitor' },
  { name: 'Desk Phone', icon: 'phone' },
  { name: 'Printer', icon: 'printer' },
  { name: 'Office Chair', icon: 'armchair' },
  { name: 'Desk', icon: 'table-2' },
  { name: 'Server', icon: 'server' },
  { name: 'Network Switch', icon: 'network' },
  { name: 'Tablet', icon: 'tablet' },
  { name: 'Camera', icon: 'camera' },
]

// ---------------------------------------------------------------------------
// Pagination defaults
// ---------------------------------------------------------------------------

export const DEFAULT_PAGE_SIZE = 20

// ---------------------------------------------------------------------------
// Warranty alert threshold (days)
// ---------------------------------------------------------------------------

export const WARRANTY_ALERT_DAYS = 30

// ---------------------------------------------------------------------------
// Asset tag prefix
// ---------------------------------------------------------------------------

export const ASSET_TAG_PREFIX = 'AT'
