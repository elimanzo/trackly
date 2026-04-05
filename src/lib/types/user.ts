import { z } from 'zod'

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const UserRoleSchema = z.enum(['owner', 'admin', 'editor', 'viewer'])
export type UserRole = z.infer<typeof UserRoleSchema>

export const USER_ROLES = UserRoleSchema.options

export const InviteStatusSchema = z.enum(['active', 'pending', 'deactivated'])
export type InviteStatus = z.infer<typeof InviteStatusSchema>

// ---------------------------------------------------------------------------
// Org membership (one row per user per org — carries role and invite status)
// ---------------------------------------------------------------------------

export const OrgMembershipSchema = z.object({
  userId: z.string().uuid(),
  orgId: z.string().uuid(),
  role: UserRoleSchema,
  inviteStatus: InviteStatusSchema,
  createdAt: z.string().datetime(),
})

export type OrgMembership = z.infer<typeof OrgMembershipSchema>

// ---------------------------------------------------------------------------
// Profile (identity only — role/org live on OrgMembership)
// ---------------------------------------------------------------------------

export const ProfileSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string().min(1).max(100),
  email: z.string().email(),
  avatarUrl: z.string().url().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export type Profile = z.infer<typeof ProfileSchema>

// ---------------------------------------------------------------------------
// User department membership
// ---------------------------------------------------------------------------

export const UserDepartmentSchema = z.object({
  userId: z.string().uuid(),
  orgId: z.string().uuid(),
  departmentId: z.string().uuid(),
  createdAt: z.string().datetime(),
})

export type UserDepartment = z.infer<typeof UserDepartmentSchema>

// ---------------------------------------------------------------------------
// Invite
// ---------------------------------------------------------------------------

export const InviteSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  email: z.string().email(),
  role: UserRoleSchema.exclude(['owner']),
  token: z.string(),
  invitedBy: z.string().uuid(),
  invitedByName: z.string(),
  acceptedAt: z.string().datetime().nullable(),
  expiresAt: z.string().datetime(),
  createdAt: z.string().datetime(),
})

export type Invite = z.infer<typeof InviteSchema>

// ---------------------------------------------------------------------------
// Create / update forms
// ---------------------------------------------------------------------------

export const InviteUserSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  role: UserRoleSchema.exclude(['owner']),
  departmentIds: z.array(z.string().uuid()).min(0),
})

export type InviteUserInput = z.infer<typeof InviteUserSchema>

export const UpdateProfileSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(100),
  avatarUrl: z.string().url().nullable().optional(),
})

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>

// ---------------------------------------------------------------------------
// Profile with department list (for display in tables)
// ---------------------------------------------------------------------------

// ProfileWithDepartments is the shape returned by AuthProvider to the UI.
// In Phase 1 it carries the first (active) membership's org/role/inviteStatus
// for backward compatibility. Phase 2 will replace orgId with memberships[].
export type ProfileWithDepartments = Profile & {
  orgId: string | null
  role: UserRole
  inviteStatus: InviteStatus
  departmentIds: string[]
  departmentNames: string[]
}
