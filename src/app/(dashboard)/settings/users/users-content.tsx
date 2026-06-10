"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, UserX, UserCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createUserSchema, type CreateUserFormData } from "@/lib/validations/auth.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
import { getInitials, ROLE_LABELS, formatDate } from "@/lib/utils";
import type { SafeUser, UserGroup, UserRole } from "@/types";

export function UsersContent() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("none");

  const { data: users, isLoading } = useQuery<SafeUser[]>({
    queryKey: ["users"],
    queryFn: () => fetch("/api/users").then((r) => r.json()),
  });

  const { data: groups } = useQuery<UserGroup[]>({
    queryKey: ["user-groups"],
    queryFn: () => fetch("/api/user-groups").then((r) => r.json()),
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

  function handleGroupSelect(groupId: string) {
    setSelectedGroupId(groupId);
  }

  async function onCreateUser(data: CreateUserFormData) {
    const payload: Record<string, unknown> = {
      name: data.name,
      email: data.email,
      password: data.password,
      role: data.role,
    };
    if (selectedGroupId !== "none") {
      payload.groupId = selectedGroupId;
    }

    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Failed to create user");
      return;
    }

    toast.success("User created successfully");
    setShowCreate(false);
    setSelectedGroupId("none");
    reset();
    queryClient.invalidateQueries({ queryKey: ["users"] });
  }

  async function toggleActive(user: SafeUser) {
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

  function handleDialogClose(open: boolean) {
    if (!open) {
      setShowCreate(false);
      setSelectedGroupId("none");
      reset();
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="User Management"
        description="Manage team members and their access roles (Super Admin only)"
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
          ) : !users?.length ? (
            <div className="flex flex-col items-center justify-center py-16">
              <p className="text-muted-foreground text-sm">No users found</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between px-4 py-4"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">{user.name}</p>
                        {!user.isActive && (
                          <Badge variant="muted" className="text-xs">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <Badge variant="secondary">
                      {ROLE_LABELS[user.role]}
                    </Badge>
                    {user.group && (
                      <Badge variant="outline" className="text-xs">
                        {user.group.name}
                      </Badge>
                    )}
                    <p className="text-xs text-muted-foreground hidden md:block">
                      Joined {formatDate(user.createdAt)}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => toggleActive(user)}
                      title={user.isActive ? "Deactivate user" : "Activate user"}
                    >
                      {user.isActive ? (
                        <UserX className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <UserCheck className="h-4 w-4 text-emerald-600" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={showCreate} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Add a new team member to the admin portal
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onCreateUser)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input id="name" placeholder="Jane Doe" {...register("name")} />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="jane@craftxlabs.com"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            {/* User Group (optional) - above Role */}
            <div className="space-y-2">
              <Label>User Group</Label>
              <Select
                value={selectedGroupId}
                onValueChange={handleGroupSelect}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No group</SelectItem>
                  {groups
                    ?.filter((g) => g.isActive)
                    .map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Role *</Label>
              <Select
                defaultValue="CEO"
                onValueChange={(v) =>
                  setValue("role", v as CreateUserFormData["role"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["SUPER_ADMIN", "CEO", "CMO", "CFO", "CTO", "COO"] as UserRole[]).map(
                    (role) => (
                      <SelectItem key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                placeholder="Min. 8 characters"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Repeat password"
                {...register("confirmPassword")}
              />
              {errors.confirmPassword && (
                <p className="text-xs text-destructive">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDialogClose(false)}
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
