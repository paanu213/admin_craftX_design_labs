"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Tag, Pencil, Trash2, MoreVertical, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/layout/PageWrapper";
import type { AppCategoryMaster } from "@/types";

export function MasterDataContent() {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AppCategoryMaster | null>(null);
  const [newKey, setNewKey] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [editLabel, setEditLabel] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: categories, isLoading } = useQuery<AppCategoryMaster[]>({
    queryKey: ["app-categories"],
    queryFn: () => fetch("/api/master-data/categories").then((r) => r.json()),
  });

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newKey.trim() || !newLabel.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/master-data/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: newKey.trim(), label: newLabel.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to add category");
        return;
      }
      toast.success("Category added");
      queryClient.invalidateQueries({ queryKey: ["app-categories"] });
      setAddOpen(false);
      setNewKey("");
      setNewLabel("");
    } finally {
      setSaving(false);
    }
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget || !editLabel.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/master-data/categories/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: editLabel.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Failed to update");
        return;
      }
      toast.success("Category updated");
      queryClient.invalidateQueries({ queryKey: ["app-categories"] });
      setEditTarget(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(cat: AppCategoryMaster) {
    const res = await fetch(`/api/master-data/categories/${cat.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !cat.isActive }),
    });
    if (res.ok) {
      queryClient.invalidateQueries({ queryKey: ["app-categories"] });
    } else {
      toast.error("Failed to update");
    }
  }

  async function handleDelete(cat: AppCategoryMaster) {
    if (!confirm(`Delete category "${cat.label}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/master-data/categories/${cat.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Category deleted");
      queryClient.invalidateQueries({ queryKey: ["app-categories"] });
    } else {
      const data = await res.json().catch(() => ({}));
      toast.error(data.error ?? "Failed to delete");
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Master Data"
        description="Manage reference data used across the application"
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Tag className="h-4 w-4 text-muted-foreground" />
            App Categories
          </CardTitle>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Category
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : !categories?.length ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Tag className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No categories found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Label</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Key</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Active</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat) => (
                    <tr
                      key={cat.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-foreground">{cat.label}</td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                          {cat.key}
                        </code>
                      </td>
                      <td className="px-4 py-3">
                        {cat.isSystem ? (
                          <Badge variant="secondary" className="gap-1 text-xs">
                            <ShieldCheck className="h-3 w-3" />
                            System
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">Custom</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Switch
                          checked={cat.isActive}
                          onCheckedChange={() => handleToggle(cat)}
                          aria-label={`Toggle ${cat.label}`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditTarget(cat);
                                  setEditLabel(cat.label);
                                }}
                              >
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit Label
                              </DropdownMenuItem>
                              {!cat.isSystem && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => handleDelete(cat)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Category Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add App Category</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-label">Label <span className="text-destructive">*</span></Label>
              <Input
                id="new-label"
                placeholder="e.g. Education"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-key">Key <span className="text-destructive">*</span></Label>
              <Input
                id="new-key"
                placeholder="e.g. EDUCATION"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value.toUpperCase().replace(/\s+/g, "_").replace(/[^A-Z0-9_]/g, ""))}
                required
              />
              <p className="text-xs text-muted-foreground">Uppercase letters, numbers and underscores only. Auto-formatted.</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)} disabled={saving}>Cancel</Button>
              <Button type="submit" disabled={saving || !newKey.trim() || !newLabel.trim()}>
                {saving ? "Adding..." : "Add Category"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Label Dialog */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Category Label</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSave} className="space-y-4">
            <div className="space-y-2">
              <Label>Key</Label>
              <code className="block text-xs bg-muted px-3 py-2 rounded font-mono">{editTarget?.key}</code>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-label">Label <span className="text-destructive">*</span></Label>
              <Input
                id="edit-label"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditTarget(null)} disabled={saving}>Cancel</Button>
              <Button type="submit" disabled={saving || !editLabel.trim()}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
