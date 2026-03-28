'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Mail, MoreHorizontal, Pencil, Plus, Trash2, UserX } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { PageHeader } from '@/components/shared/PageHeader'
import { PageLoader } from '@/components/shared/PageLoader'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { USER_ROLE_CONFIG } from '@/lib/constants'
import { useDepartments } from '@/lib/hooks/useDepartments'
import { useOrgUserMutations, useOrgUsers } from '@/lib/hooks/useOrgUsers'
import type { ProfileWithDepartments } from '@/lib/types'
import { UserRoleSchema } from '@/lib/types'
import { formatRelativeTime } from '@/lib/utils/formatters'
import { getInitials } from '@/lib/utils/formatters'
import { useAuth } from '@/providers/AuthProvider'
import { useOrg } from '@/providers/OrgProvider'

const InviteFormSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  role: UserRoleSchema.exclude(['owner']),
})
type InviteFormInput = z.infer<typeof InviteFormSchema>

export default function UsersPage() {
  const { users, pendingInvites, isLoading } = useOrgUsers()
  const { data: departments } = useDepartments()
  const { sendInvite, revokeInvite, removeUser, updateUserRole, updateUserDepartments } =
    useOrgUserMutations()

  const { user: currentUser } = useAuth()
  const { org } = useOrg()
  const deptLabel = org?.departmentLabel ?? 'Department'
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteDeptIds, setInviteDeptIds] = useState<string[]>([])
  const [removeId, setRemoveId] = useState<string | null>(null)
  const [revokeId, setRevokeId] = useState<string | null>(null)
  const [editingUser, setEditingUser] = useState<ProfileWithDepartments | null>(null)
  const [editRole, setEditRole] =
    useState<Exclude<ProfileWithDepartments['role'], 'owner'>>('viewer')
  const [editDeptIds, setEditDeptIds] = useState<string[]>([])

  const form = useForm<InviteFormInput>({
    resolver: zodResolver(InviteFormSchema),
    defaultValues: { email: '', role: 'viewer' },
  })

  if (isLoading) return <PageLoader />

  function openEdit(u: ProfileWithDepartments) {
    setEditingUser(u)
    setEditRole(u.role === 'owner' ? 'admin' : u.role)
    setEditDeptIds(u.departmentIds)
  }

  async function saveEdit() {
    if (!editingUser) return
    await updateUserRole(editingUser.id, editRole)
    await updateUserDepartments(editingUser.id, editDeptIds)
    setEditingUser(null)
  }

  function onInvite(data: InviteFormInput) {
    sendInvite(data.email, data.role, inviteDeptIds)
    form.reset()
    setInviteDeptIds([])
    setInviteOpen(false)
  }

  function toggleInviteDept(deptId: string) {
    setInviteDeptIds((prev) =>
      prev.includes(deptId) ? prev.filter((id) => id !== deptId) : [...prev, deptId]
    )
  }

  function toggleDept(deptId: string) {
    setEditDeptIds((prev) =>
      prev.includes(deptId) ? prev.filter((id) => id !== deptId) : [...prev, deptId]
    )
  }

  return (
    <>
      <div className="space-y-8">
        <PageHeader
          title="Users"
          description="Manage team members and invites"
          action={
            <Button onClick={() => setInviteOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Invite user
            </Button>
          }
        />

        {/* Active users */}
        <div className="space-y-3">
          <h2 className="text-foreground text-sm font-semibold">
            Active members{' '}
            <span className="text-muted-foreground font-normal">({users.length})</span>
          </h2>
          <div className="rounded-md border shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>{deptLabel}s</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {getInitials(u.fullName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-foreground text-sm font-medium">{u.fullName}</p>
                          <p className="text-muted-foreground text-xs">{u.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {USER_ROLE_CONFIG[u.role].label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground text-xs">
                        {u.departmentNames.length > 0 ? u.departmentNames.join(', ') : '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground text-xs">
                        {formatRelativeTime(u.createdAt)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {u.id !== currentUser?.id && u.role !== 'owner' && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(u)}>
                              <Pencil className="mr-2 h-3.5 w-3.5" />
                              Edit role & {deptLabel.toLowerCase()}s
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setRemoveId(u.id)}
                            >
                              <UserX className="mr-2 h-3.5 w-3.5" />
                              Remove user
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Pending invites */}
        {pendingInvites.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-foreground text-sm font-semibold">
              Pending invites{' '}
              <span className="text-muted-foreground font-normal">({pendingInvites.length})</span>
            </h2>
            <div className="rounded-md border shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Invited by</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingInvites.map((invite) => (
                    <TableRow key={invite.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="text-muted-foreground h-4 w-4" />
                          <span className="text-foreground text-sm">{invite.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {USER_ROLE_CONFIG[invite.role].label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground text-xs">
                          {invite.invitedByName}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground text-xs">
                          {formatRelativeTime(invite.createdAt)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive h-8 w-8"
                          onClick={() => setRevokeId(invite.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      {/* Edit role & departments sheet */}
      <Sheet
        open={editingUser !== null}
        onOpenChange={(open) => {
          if (!open) setEditingUser(null)
        }}
      >
        <SheetContent>
          <SheetHeader className="px-4">
            <SheetTitle>Edit {editingUser?.fullName}</SheetTitle>
          </SheetHeader>
          <div className="space-y-6 overflow-y-auto px-4 pb-6">
            {/* Role */}
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={editRole} onValueChange={(v) => setEditRole(v as typeof editRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)]">
                  {(['admin', 'editor', 'viewer'] as const).map((r) => (
                    <SelectItem key={r} value={r}>
                      <span className="font-medium">{USER_ROLE_CONFIG[r].label}</span>
                      <span className="text-muted-foreground block text-xs">
                        {USER_ROLE_CONFIG[r].description}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Departments */}
            <div className="space-y-2">
              <Label>{deptLabel}s</Label>
              {departments.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No {deptLabel.toLowerCase()}s created yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {departments.map((dept) => (
                    <div key={dept.id} className="flex items-center gap-2">
                      <Checkbox
                        id={dept.id}
                        checked={editDeptIds.includes(dept.id)}
                        onCheckedChange={() => toggleDept(dept.id)}
                      />
                      <label htmlFor={dept.id} className="cursor-pointer text-sm">
                        {dept.name}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button onClick={saveEdit}>Save changes</Button>
              <Button variant="outline" onClick={() => setEditingUser(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Invite modal */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite a team member</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onInvite)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email address</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="colleague@company.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent
                        position="popper"
                        className="w-[var(--radix-select-trigger-width)]"
                      >
                        {(['admin', 'editor', 'viewer'] as const).map((r) => (
                          <SelectItem key={r} value={r}>
                            <span className="font-medium">{USER_ROLE_CONFIG[r].label}</span>
                            <span className="text-muted-foreground block text-xs">
                              {USER_ROLE_CONFIG[r].description}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {departments.length > 0 && (
                <div className="space-y-2">
                  <Label>{deptLabel}s (optional)</Label>
                  <div className="space-y-2">
                    {departments.map((dept) => (
                      <div key={dept.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`invite-dept-${dept.id}`}
                          checked={inviteDeptIds.includes(dept.id)}
                          onCheckedChange={() => toggleInviteDept(dept.id)}
                        />
                        <label
                          htmlFor={`invite-dept-${dept.id}`}
                          className="cursor-pointer text-sm"
                        >
                          {dept.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Send invite</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={removeId !== null}
        onOpenChange={(open) => {
          if (!open) setRemoveId(null)
        }}
        title="Remove user?"
        description="This user will lose access to the organisation."
        confirmLabel="Remove"
        destructive
        onConfirm={() => {
          if (removeId) removeUser(removeId)
          setRemoveId(null)
        }}
      />

      <ConfirmDialog
        open={revokeId !== null}
        onOpenChange={(open) => {
          if (!open) setRevokeId(null)
        }}
        title="Revoke invite?"
        description="The invite link will be invalidated."
        confirmLabel="Revoke"
        destructive
        onConfirm={() => {
          if (revokeId) revokeInvite(revokeId)
          setRevokeId(null)
        }}
      />
    </>
  )
}
