"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, UserX, UserCheck, KeyRound, MoreVertical, Edit2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createUserSchema, type CreateUserFormData } from "@/lib/validations/auth.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHeader } from "@/components/layout/PageWrapper";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getInitials, ROLE_LABELS, formatDate } from "@/lib/utils";
import type { UserGroup, UserRole } from "@/types";

const PAGE_LIMIT = 12;

const ALL_ROLES: UserRole[] = ["SUPER_ADMIN", "CEO", "CMO", "CFO", "CTO", "COO"];

interface SafeUserWithGroups {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  groupMemberships: { group: { id: string; name: string } }[];
}

export function UsersContent() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [resetPasswordUser, setResetPasswordUser] = useState<SafeUserWithGroups | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [page, setPage] = useState(1);

  // Edit user state
  const [editUser, setEditUser] = useState<SafeUserWithGroups | null>(null);
  const [editRole, setEditRole] = useState<UserRole>("CEO");
  const [editGroupIds, setEditGroupIds] = useState<string[]>([]);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const { data: users, isLoading } = useQuery<SafeUserWithGroups[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const r = await fetch("/api/users");
      if (!r.ok) throw new Error("Forbidden");
      return r.json();
    },
  });

  const { data: groups } = useQuery<UserGroup[]>({
    queryKey: ["user-groups"],
    queryFn: async () => {
      const r = await fetch("/api/user-groups");
      if (!r.ok) return [];
      return r.json();
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { role: "CEO" },
  });

  const allUsers = Array.isArray(users) ? users : [];
  const totalPages = Math.ceil(allUsers.length / PAGE_LIMIT);
  const pagedUsers = allUsers.slice((page - 1) * PAGE_LIMIT, page * PAGE_LIMIT);

  function toggleGroupSelection(groupId: string) {
    setSelectedGroupIds((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
  }

  function toggleEditGroup(groupId: string) {
    setEditGroupIds((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
  }

  function openEditUser(user: SafeUserWithGroups) {
    setEditUser(user);
    setEditRole(user.role);
    setEditGroupIds(user.groupMemberships.map((m) => m.group.id));
  }

  async function handleSaveEdit() {
    if (!editUser) return;
    setIsSavingEdit(true);
    try {
      const res = await fetch(`/api/users/${editUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: editRole,
          groupIds: editGroupIds,
        }),
      });
      if (res.ok) {
        toast.success("User updated — changes take effect on their next sign-in");
        setEditUser(null);
        queryClient.invalidateQueries({ queryKey: ["users"] });
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Failed to update user");
      }
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function onCreateUser(data: CreateUserFormData) {
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role,
        groupIds: selectedGroupIds,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Failed to create user");
      return;
    }

    toast.success("User created successfully");
    setShowCreate(false);
    setSelectedGroupIds([]);
    reset();
    queryClient.invalidateQueries({ queryKey: ["users"] });
  }

  async function toggleActive(user: SafeUserWithGroups) {
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !user.isActive }),
    });

    if (res.ok) {
      toast.success(user.isActive ? "User deactivated" : "User activated");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    } else {
      toast.error("Failed to update user");
    }
  }

  async function handleResetPassword() {
    if (!resetPasswordUser) return;
    if (newPassword !== confirmNewPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setIsResetting(true);
    try {
      const res = await fetch(`/api/users/${resetPasswordUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
      if (res.ok) {
        toast.success("Password reset successfully");
        setResetPasswordUser(null);
        setNewPassword("");
        setConfirmNewPassword("");
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Failed to reset password");
      }
    } finally {
      setIsResetting(false);
    }
  }

  function handleCreateDialogClose(open: boolean) {
    if (!open) {
      setShowCreate(false);
      setSelectedGroupIds([]);
      reset();
    }
  }

  const activeGroups = groups?.filter((g) => g.isActive) ?? [];

  return (
    <div className="space-y-4">
      <PageHeader
        title="User Management"
        description="Manage team members, roles, and group memberships"
        actions={
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />
            Add User
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : !allUsers.length ? (
            <div className="flex flex-col items-center justify-center py-16">
              <p className="text-muted-foreground text-sm">No users found</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {pagedUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between px-4 py-4 gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">{user.name}</p>
                        {!user.isActive && (
                          <Badge variant="muted" className="text-xs">Inactive</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {/* Role badge */}
                    <Badge variant={user.role === "SUPER_ADMIN" ? "default" : "secondary"}>
                      {ROLE_LABELS[user.role] ?? user.role}
                    </Badge>
                    {/* Group badges */}
                    {user.groupMemberships?.map((m) => (
                      <Badge key={m.group.id} variant="outline" className="text-xs">
                        {m.group.name}
                      </Badge>
                    ))}
                    <p className="text-xs text-muted-foreground hidden md:block">
                      Joined {formatDate(user.createdAt)}
                    </p>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditUser(user)}>
                          <Edit2 className="h-4 w-4 mr-2" />
                          Edit Role &amp; Groups
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setResetPasswordUser(user)}>
                          <KeyRound className="h-4 w-4 mr-2" />
                          Reset Password
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => toggleActive(user)}>
                          {user.isActive ? (
                            <>
                              <UserX className="h-4 w-4 mr-2 text-destructive" />
                              <span className="text-destructive">Deactivate</span>
                            </>
                          ) : (
                            <>
                              <UserCheck className="h-4 w-4 mr-2 text-emerald-600" />
                              <span className="text-emerald-600">Activate</span>
                            </>
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm">
          <p className="text-muted-foreground text-center sm:text-left">
            Showing {(page - 1) * PAGE_LIMIT + 1}–{Math.min(page * PAGE_LIMIT, allUsers.length)} of {allUsers.length} users
          </p>
          <div className="flex gap-2 justify-center sm:justify-end">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Edit Role & Groups Dialog */}
      <Dialog open={!!editUser} onOpenChange={(open) => { if (!open) setEditUser(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Role &amp; Groups</DialogTitle>
            <DialogDescription>
              Change the role and group memberships for{" "}
              <strong>{editUser?.name}</strong>. Changes take effect on their next sign-in.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={editRole} onValueChange={(v) => setEditRole(v as UserRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {ROLE_LABELS[role] ?? role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editRole === "SUPER_ADMIN" && (
                <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-md px-3 py-2">
                  Super Admin has full access to everything, regardless of group permissions.
                </p>
              )}
            </div>

            {activeGroups.length > 0 && (
              <div className="space-y-2">
                <Label>Group Memberships</Label>
                <p className="text-xs text-muted-foreground">
                  Users can belong to multiple groups. Permissions are combined.
                </p>
                <div className="border border-border rounded-md p-3 space-y-2 max-h-48 overflow-y-auto">
                  {activeGroups.map((group) => (
                    <div key={group.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`edit-group-${group.id}`}
                        checked={editGroupIds.includes(group.id)}
                        onCheckedChange={() => toggleEditGroup(group.id)}
                      />
                      <label
                        htmlFor={`edit-group-${group.id}`}
                        className="text-sm cursor-pointer select-none flex-1"
                      >
                        {group.name}
                      </label>
                    </div>
                  ))}
                </div>
                {editGroupIds.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {editGroupIds.length} group{editGroupIds.length !== 1 ? "s" : ""} selected
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setEditUser(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSavingEdit}>
              {isSavingEdit ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog
        open={!!resetPasswordUser}
        onOpenChange={(open) => {
          if (!open) {
            setResetPasswordUser(null);
            setNewPassword("");
            setConfirmNewPassword("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Password for {resetPasswordUser?.name}</DialogTitle>
            <DialogDescription>Enter a new password for this user.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Min. 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-new-password">Confirm New Password</Label>
              <Input
                id="confirm-new-password"
                type="password"
                placeholder="Repeat new password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setResetPasswordUser(null);
                setNewPassword("");
                setConfirmNewPassword("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleResetPassword} disabled={isResetting}>
              {isResetting ? "Resetting..." : "Reset Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={showCreate} onOpenChange={handleCreateDialogClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>Add a new team member to the admin portal</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onCreateUser)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input id="name" placeholder="Jane Doe" {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input id="email" type="email" placeholder="jane@craftxlabs.com" {...register("email")} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            {activeGroups.length > 0 && (
              <div className="space-y-2">
                <Label>User Groups</Label>
                <div className="border border-border rounded-md p-3 space-y-2 max-h-36 overflow-y-auto">
                  {activeGroups.map((group) => (
                    <div key={group.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`group-${group.id}`}
                        checked={selectedGroupIds.includes(group.id)}
                        onCheckedChange={() => toggleGroupSelection(group.id)}
                      />
                      <label htmlFor={`group-${group.id}`} className="text-sm cursor-pointer select-none">
                        {group.name}
                      </label>
                    </div>
                  ))}
                </div>
                {selectedGroupIds.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {selectedGroupIds.length} group{selectedGroupIds.length !== 1 ? "s" : ""} selected
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Role *</Label>
              <Select
                defaultValue="CEO"
                onValueChange={(v) => setValue("role", v as CreateUserFormData["role"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {ROLE_LABELS[role] ?? role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input id="password" type="password" placeholder="Min. 8 characters" {...register("password")} />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <Input id="confirmPassword" type="password" placeholder="Repeat password" {...register("confirmPassword")} />
              {errors.confirmPassword && (
                <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => handleCreateDialogClose(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
