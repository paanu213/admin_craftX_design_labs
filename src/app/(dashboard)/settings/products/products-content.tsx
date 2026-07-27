"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  Globe,
  Package,
  MoreVertical,
  RefreshCw,
  Key,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/PageWrapper";
import { RoleGuard } from "@/components/guards/RoleGuard";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import type { Product } from "@/types";

const EMPTY_FORM = {
  name: "",
  slug: "",
  description: "",
  logoUrl: "",
  websiteUrl: "",
  launchDate: "",
  apiUrl: "",
  apiKey: "",
  isActive: true,
  sortOrder: 0,
};

type FormData = typeof EMPTY_FORM;

function autoSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

interface ProductFormProps {
  initial?: FormData;
  onSubmit: (data: FormData) => void;
  loading: boolean;
  onClose: () => void;
}

function ProductForm({ initial, onSubmit, loading, onClose }: ProductFormProps) {
  const [form, setForm] = useState<FormData>(initial ?? EMPTY_FORM);

  function set(field: keyof FormData, value: string | boolean | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleNameChange(v: string) {
    set("name", v);
    if (!initial) set("slug", autoSlug(v));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>Name *</Label>
          <Input value={form.name} onChange={(e) => handleNameChange(e.target.value)} placeholder="Travelan" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Slug *</Label>
          <Input
            value={form.slug}
            onChange={(e) => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            placeholder="travelan"
          />
          <p className="text-[10px] text-muted-foreground">URL path: /{form.slug || "…"}</p>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Description</Label>
        <Textarea
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          rows={2}
          placeholder="Brief description of this product"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>Logo URL</Label>
          <Input value={form.logoUrl} onChange={(e) => set("logoUrl", e.target.value)} placeholder="https://…" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Website URL</Label>
          <Input value={form.websiteUrl} onChange={(e) => set("websiteUrl", e.target.value)} placeholder="https://…" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>Launch Date</Label>
          <Input type="date" value={form.launchDate} onChange={(e) => set("launchDate", e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Sort Order</Label>
          <Input
            type="number"
            value={form.sortOrder}
            onChange={(e) => set("sortOrder", Number(e.target.value))}
            placeholder="0"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>External API URL</Label>
        <Input value={form.apiUrl} onChange={(e) => set("apiUrl", e.target.value)} placeholder="https://api.product.com/api/external" />
        <p className="text-[10px] text-muted-foreground">Base URL for the product&apos;s external admin API</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>API Key</Label>
        <div className="relative">
          <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="password"
            className="pl-8"
            value={form.apiKey}
            onChange={(e) => set("apiKey", e.target.value)}
            placeholder="••••••••"
          />
        </div>
        <p className="text-[10px] text-muted-foreground">Stored securely server-side; never exposed to the browser</p>
      </div>
      <div className="flex items-center gap-3">
        <Switch checked={form.isActive} onCheckedChange={(v) => set("isActive", v)} id="is-active" />
        <Label htmlFor="is-active">Active (visible in product switcher)</Label>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
        <Button onClick={() => onSubmit(form)} disabled={loading || !form.name || !form.slug}>
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Product
        </Button>
      </DialogFooter>
    </div>
  );
}

export function ProductsContent() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => {
      const r = await fetch("/api/products");
      if (!r.ok) throw new Error(`Failed to fetch products: ${r.status}`);
      return r.json() as Promise<Product[]>;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) =>
      fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? "Failed to create product");
        return r.json();
      }),
    onSuccess: () => {
      toast.success("Product created");
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["products-switcher"] });
      setCreateOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) =>
      fetch(`/api/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? "Failed to update product");
        return r.json();
      }),
    onSuccess: () => {
      toast.success("Product updated");
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["products-switcher"] });
      setEditProduct(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/products/${id}`, { method: "DELETE" }).then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? "Failed to delete product");
      }),
    onSuccess: () => {
      toast.success("Product deleted");
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["products-switcher"] });
      setDeleteProduct(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Products"
        description="Manage connected external products. Each product has its own dashboard with live data from its API."
        actions={
          <RoleGuard permission="manageProducts">
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </RoleGuard>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="p-4 rounded-full bg-muted">
            <Package className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="font-medium text-muted-foreground">No products yet</p>
          <p className="text-sm text-muted-foreground max-w-sm">
            Add a product to integrate external applications and view their data from this dashboard.
          </p>
          <RoleGuard permission="manageProducts">
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </RoleGuard>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => (
            <Card key={product.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted border">
                      {product.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={product.logoUrl} alt={product.name} className="h-7 w-7 rounded object-contain" />
                      ) : (
                        <Package className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{product.name}</p>
                      <p className="text-xs text-muted-foreground">/{product.slug}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={product.isActive ? "default" : "secondary"} className="text-[10px]">
                      {product.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <RoleGuard permission="manageProducts">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreVertical className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditProduct(product)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleteProduct(product)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </RoleGuard>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 flex flex-col gap-2">
                {product.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{product.description}</p>
                )}
                <div className="flex flex-col gap-1.5 mt-1">
                  {product.apiUrl && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <RefreshCw className="h-3 w-3 shrink-0" />
                      <span className="truncate">{product.apiUrl}</span>
                      <Badge variant="outline" className="text-[9px] px-1 py-0 ml-auto shrink-0">API</Badge>
                    </div>
                  )}
                  {product.websiteUrl && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Globe className="h-3 w-3 shrink-0" />
                      <a
                        href={product.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate hover:text-foreground flex items-center gap-1"
                      >
                        {product.websiteUrl}
                        <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                      </a>
                    </div>
                  )}
                  {product.launchDate && (
                    <p className="text-[10px] text-muted-foreground">
                      Launched: {new Date(product.launchDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Product</DialogTitle>
            <DialogDescription>Connect a new external product to this dashboard.</DialogDescription>
          </DialogHeader>
          <ProductForm
            onSubmit={(data) => createMutation.mutate(data)}
            loading={createMutation.isPending}
            onClose={() => setCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {editProduct && (
        <Dialog open={!!editProduct} onOpenChange={() => setEditProduct(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Product</DialogTitle>
              <DialogDescription>Update the product details and API connection.</DialogDescription>
            </DialogHeader>
            <ProductForm
              initial={{
                name: editProduct.name,
                slug: editProduct.slug,
                description: editProduct.description ?? "",
                logoUrl: editProduct.logoUrl ?? "",
                websiteUrl: editProduct.websiteUrl ?? "",
                launchDate: editProduct.launchDate ? editProduct.launchDate.split("T")[0] : "",
                apiUrl: editProduct.apiUrl ?? "",
                apiKey: editProduct.apiKey ?? "",
                isActive: editProduct.isActive,
                sortOrder: editProduct.sortOrder,
              }}
              onSubmit={(data) => updateMutation.mutate({ id: editProduct.id, data })}
              loading={updateMutation.isPending}
              onClose={() => setEditProduct(null)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirm */}
      {deleteProduct && (
        <Dialog open={!!deleteProduct} onOpenChange={() => setDeleteProduct(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete Product</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete <strong>{deleteProduct.name}</strong>? This cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteProduct(null)}>Cancel</Button>
              <Button
                variant="destructive"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteProduct.id)}
              >
                {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
