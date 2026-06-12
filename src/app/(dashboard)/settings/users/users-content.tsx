"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, UserX, UserCheck, KeyRound, MoreVertical, Edit2, AlertCircle } from "lucide-react";
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
const ALL_ROLES: UserRole[] = ["CEO", "COO", "CMO", "CFO", "CTO", "EMPLOYEE"];

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

interface EditState {
  user: SafeUserWithGroups;
  name: string;
  email: string;
  role: UserRole;
  groupIds: string[];
}

export function UsersContent() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [createGroupIds, setCreateGroupIds] = useState<string[]>([]);
  const [resetPasswordUser, setResetPasswordUser] = useState<SafeUserWithGroups | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [page, setPage] = useState(1);

  // Edit state
  const [edit, setEdit] = useState<EditState | null>(null);
  const [editErrors, setEditErrors] = useState<{ name?: string; email?: string }>({});

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
    defaultValues: { role: "EMPLOYEE" },
  });

  const allUsers = Array.isArray(users) ? users : [];
  const totalPages = Math.ceil(allUsers.length / PAGE_LIMIT);
  const pagedUsers = allUsers.slice((page - 1) * PAGE_LIMIT, page * PAGE_LIMIT);
  const activeGroups = groups?.filter((g) => g.isActive) ?? [];

  // ── Edit helpers ────────────────────────────────────────────
  function openEdit(user: SafeUserWithGroups) {
    setEdit({
      user,
      name: user.name,
      email: user.email,
      role: user.role,
      groupIds: user.groupMemberships.map((m) => m.group.id),
    });
    setEditErrors({});
  }

  function toggleEditGroup(groupId: string) {
    setEdit((prev) =>
      prev
        ? {
            ...prev,
            groupIds: prev.groupIds.includes(groupId)
              ? prev.groupIds.filter((id) => id !== groupId)
              : [...prev.groupIds, groupId],
          }
        : null
    );
  }

  function validateEdit(): boolean {
    const errs: { name?: string; email?: string } = {};
    if (!edit?.name?.trim() || edit.name.trim().length < 2)
      errs.name = "Name must be at least 2 characters";
    if (!edit?.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(edit.email))
      errs.email = "Enter a valid email address";
    setEditErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSaveEdit() {
    if (!edit || !validateEdit()) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/users/${edit.user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: edit.name.trim(),
          email: edit.email.trim(),
          role: edit.role,
          groupIds: edit.groupIds,
        }),
      });
      if (res.ok) {
        toast.success("User updated — group permission changes take effect immediately");
        setEdit(null);
        queryClient.invalidateQueries({ queryKey: ["users"] });
      } else {
        const err = await res.json().catch(() => ({}));
        if (err.error?.toLowerCase().includes("email")) {
          setEditErrors((prev) => ({ ...prev, email: err.error }));
        } else {
          toast.error(err.error ?? "Failed to update user");
        }
      }
    } finally {
      setIsSaving(false);
    }
  }

  // ── Toggle active ─────────────────────────────────────────
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

  // ── Reset password ────────────────────────────────────────
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

  // ── Create user ───────────────────────────────────────────
  async function onCreateUser(data: CreateUserFormData) {
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role,
        groupIds: createGroupIds,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Failed to create user");
      return;
    }
    toast.success("User created successfully");
    setShowCreate(false);
    setCreateGroupIds([]);
    reset();
    queryClient.invalidateQueries({ queryKey: ["users"] });
  }

  // ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <PageHeader
        title="User Management"
        description="Manage team members, designations, and group memberships"
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
                    <Badge variant="secondary">
                      {ROLE_LABELS[user.role] ?? user.role}
                    </Badge>
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
                        <DropdownMenuItem onClick={() => openEdit(user)}>
                          <Edit2 className="h-4 w-4 mr-2" />
                          Edit User
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
            Showing {(page - 1) * PAGE_LIMIT + 1}–{Math.min(page * PAGE_LIMIT, allUsers.length)} of{" "}
            {allUsers.length} users
          </p>
          <div className="flex gap-2 justify-center sm:justify-end">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* ── Edit User Dialog ─────────────────────────────────── */}
      <Dialog open={!!edit} onOpenChange={(open) => { if (!open) setEdit(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update details for <strong>{edit?.user.name}</strong>. Group changes take effect immediately — designation is for display only.
            </DialogDescription>
          </DialogHeader>

          {edit && (
            <div className="space-y-4">
              {/* Name */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-name">Full Name *</Label>
                <Input
                  id="edit-name"
                  placeholder="Jane Doe"
                  value={edit.name}
                  aria-invalid={!!editErrors.name}
                  onChange={(e) => {
                    setEdit((prev) => prev ? { ...prev, name: e.target.value } : null);
                    if (editErrors.name) setEditErrors((p) => ({ ...p, name: undefined }));
                  }}
                />
                {editErrors.name && (
                  <p className="flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle className="h-3 w-3 shrink-0" />{editErrors.name}
                  </p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-email">Email Address *</Label>
                <Input
                  id="edit-email"
                  type="email"
                  placeholder="jane@craftxlabs.com"
                  value={edit.email}
                  aria-invalid={!!editErrors.email}
                  onChange={(e) => {
                    setEdit((prev) => prev ? { ...prev, email: e.target.value } : null);
                    if (editErrors.email) setEditErrors((p) => ({ ...p, email: undefined }));
                  }}
                />
                {editErrors.email && (
                  <p className="flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle className="h-3 w-3 shrink-0" />{editErrors.email}
                  </p>
                )}
              </div>

              {/* Designation */}
              <div className="space-y-1.5">
                <Label>Designation</Label>
                <Select
                  value={edit.role}
                  onValueChange={(v) => setEdit((prev) => prev ? { ...prev, role: v as UserRole } : null)}
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
                <p className="text-xs text-muted-foreground">
                  Designation is a display label only. Access to features is controlled by User Groups.
                </p>
              </div>

              {/* Group memberships */}
              {activeGroups.length > 0 && (
                <div className="space-y-1.5">
                  <Label>Group Memberships</Label>
                  <p className="text-xs text-muted-foreground">
                    Users can belong to multiple groups — permissions are combined.
                  </p>
                  <div className="border border-border rounded-md p-3 space-y-2 max-h-44 overflow-y-auto">
                    {activeGroups.map((group) => (
                      <div key={group.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`eg-${group.id}`}
                          checked={edit.groupIds.includes(group.id)}
                          onCheckedChange={() => toggleEditGroup(group.id)}
                        />
                        <label htmlFor={`eg-${group.id}`} className="text-sm cursor-pointer select-none flex-1">
                          {group.name}
                        </label>
                      </div>
                    ))}
                  </div>
                  {edit.groupIds.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {edit.groupIds.length} group{edit.groupIds.length !== 1 ? "s" : ""} selected
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setEdit(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Reset Password Dialog ────────────────────────────── */}
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
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>Set a new password for {resetPasswordUser?.name}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Min. 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
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

      {/* ── Create User Dialog ───────────────────────────────── */}
      <Dialog
        open={showCreate}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreate(false);
            setCreateGroupIds([]);
            reset();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>Add a new team member to the admin portal</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onCreateUser)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="c-name">Full Name *</Label>
              <Input id="c-name" placeholder="Jane Doe" {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="c-email">Email Address *</Label>
              <Input id="c-email" type="email" placeholder="jane@craftxlabs.com" {...register("email")} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Designation</Label>
              <Select
                defaultValue="EMPLOYEE"
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

            {activeGroups.length > 0 && (
              <div className="space-y-1.5">
                <Label>User Groups</Label>
                <div className="border border-border rounded-md p-3 space-y-2 max-h-36 overflow-y-auto">
                  {activeGroups.map((group) => (
                    <div key={group.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`cg-${group.id}`}
                        checked={createGroupIds.includes(group.id)}
                        onCheckedChange={() =>
                          setCreateGroupIds((prev) =>
                            prev.includes(group.id)
                              ? prev.filter((id) => id !== group.id)
                              : [...prev, group.id]
                          )
                        }
                      />
                      <label htmlFor={`cg-${group.id}`} className="text-sm cursor-pointer select-none">
                        {group.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="c-password">Password *</Label>
              <Input id="c-password" type="password" placeholder="Min. 8 characters" {...register("password")} />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="c-confirm">Confirm Password *</Label>
              <Input id="c-confirm" type="password" placeholder="Repeat password" {...register("confirmPassword")} />
              {errors.confirmPassword && (
                <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreate(false);
                  setCreateGroupIds([]);
                  reset();
                }}
              >
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
