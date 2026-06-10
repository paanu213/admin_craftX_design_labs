"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Power, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/PageWrapper";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { UserGroup } from "@/types";

interface GroupFormState {
  name: string;
  description: string;
}

const defaultForm: GroupFormState = { name: "", description: "" };

export function UserGroupsContent() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editingGroup, setEditingGroup] = useState<UserGroup | null>(null);
  const [form, setForm] = useState<GroupFormState>(defaultForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: groups, isLoading } = useQuery<UserGroup[]>({
    queryKey: ["user-groups"],
    queryFn: () => fetch("/api/user-groups").then((r) => r.json()),
  });

  function openCreate() {
    setForm(defaultForm);
    setShowCreate(true);
  }

  function openEdit(group: UserGroup) {
    setForm({ name: group.name, description: group.description ?? "" });
    setEditingGroup(group);
  }

  function closeDialogs() {
    setShowCreate(false);
    setEditingGroup(null);
    setForm(defaultForm);
  }

  async function handleCreate() {
    if (!form.name.trim()) {
      toast.error("Group name is required");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/user-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Failed to create group");
        return;
      }
      toast.success("Group created successfully");
      closeDialogs();
      queryClient.invalidateQueries({ queryKey: ["user-groups"] });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleEdit() {
    if (!editingGroup) return;
    if (!form.name.trim()) {
      toast.error("Group name is required");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/user-groups/${editingGroup.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Failed to update group");
        return;
      }
      toast.success("Group updated successfully");
      closeDialogs();
      queryClient.invalidateQueries({ queryKey: ["user-groups"] });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggleActive(group: UserGroup) {
    const res = await fetch(`/api/user-groups/${group.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !group.isActive }),
    });
    if (res.ok) {
      toast.success(group.isActive ? "Group deactivated" : "Group activated");
      queryClient.invalidateQueries({ queryKey: ["user-groups"] });
    } else {
      toast.error("Failed to update group");
    }
  }

  async function handleDelete(group: UserGroup) {
    const memberCount = group._count?.members ?? 0;
    if (memberCount > 0) return;
    if (!confirm(`Delete group "${group.name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/user-groups/${group.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Group deleted");
      queryClient.invalidateQueries({ queryKey: ["user-groups"] });
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Failed to delete group");
    }
  }

  const dialogForm = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="group-name">Group Name *</Label>
        <Input
          id="group-name"
          placeholder="e.g. Founders"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="group-description">Description</Label>
        <Input
          id="group-description"
          placeholder="Optional description"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="User Groups"
        description="Organise team members into groups"
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Create Group
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : !groups?.length ? (
            <div className="flex flex-col items-center justify-center py-16">
              <p className="text-muted-foreground text-sm">No groups found</p>
              <Button variant="outline" className="mt-4" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                Create your first group
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {groups.map((group) => {
                const memberCount = group._count?.members ?? 0;
                return (
                  <div
                    key={group.id}
                    className="flex items-center justify-between px-4 py-4 gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium truncate">{group.name}</p>
                        <Badge variant={group.isActive ? "success" : "muted"}>
                          {group.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      {group.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {group.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground hidden sm:block">
                        {memberCount} {memberCount === 1 ? "member" : "members"}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(group)}
                        title="Edit group"
                      >
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleToggleActive(group)}
                        title={group.isActive ? "Deactivate group" : "Activate group"}
                      >
                        <Power
                          className={
                            group.isActive
                              ? "h-4 w-4 text-muted-foreground"
                              : "h-4 w-4 text-emerald-600"
                          }
                        />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDelete(group)}
                        disabled={memberCount > 0}
                        title={
                          memberCount > 0
                            ? "Cannot delete a group with members"
                            : "Delete group"
                        }
                      >
                        <Trash2 className="h-4 w-4 text-destructive/70" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Group Dialog */}
      <Dialog open={showCreate} onOpenChange={(open) => { if (!open) closeDialogs(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create User Group</DialogTitle>
            <DialogDescription>
              Add a new group to organise team members
            </DialogDescription>
          </DialogHeader>
          {dialogForm}
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={closeDialogs} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Group"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Group Dialog */}
      <Dialog open={!!editingGroup} onOpenChange={(open) => { if (!open) closeDialogs(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User Group</DialogTitle>
            <DialogDescription>
              Update the group details
            </DialogDescription>
          </DialogHeader>
          {dialogForm}
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={closeDialogs} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
