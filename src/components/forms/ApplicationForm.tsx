"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRef, useState } from "react";
import { Loader2, ArrowLeft, Upload, X, ImageIcon, AlertCircle } from "lucide-react";
import { applicationSchema, type ApplicationFormData } from "@/lib/validations/application.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageWrapper";
import type { Application, AppCategoryMaster } from "@/types";

const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2 MB

interface ApplicationFormProps {
  application?: Application;
  onSuccess?: () => void;
}

export function ApplicationForm({ application, onSuccess }: ApplicationFormProps) {
  const router = useRouter();
  const isEditing = !!application;
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(application?.logoUrl ?? null);

  const { data: categoriesData } = useQuery<AppCategoryMaster[]>({
    queryKey: ["app-categories"],
    queryFn: async () => {
      const r = await fetch("/api/master-data/categories");
      if (!r.ok) throw new Error(`Failed to fetch categories: ${r.status}`);
      return r.json();
    },
  });
  const categories = (Array.isArray(categoriesData) ? categoriesData : []).filter((c) => c.isActive);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ApplicationFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(applicationSchema) as any,
    mode: "onTouched",
    defaultValues: application
      ? {
          name: application.name,
          description: application.description ?? "",
          category: application.category,
          version: application.version,
          status: application.status,
          logoUrl: application.logoUrl ?? "",
          monthlyPrice: application.monthlyPrice ?? undefined,
          yearlyPrice: application.yearlyPrice ?? undefined,
          currency: application.currency as ApplicationFormData["currency"],
          website: application.website ?? "",
          playStoreUrl: application.playStoreUrl ?? "",
          appStoreUrl: application.appStoreUrl ?? "",
        }
      : {
          status: "ACTIVE",
          currency: "INR",
        },
  });

  const logoUrlValue = watch("logoUrl");

  async function handleLogoFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are allowed for the logo");
      return;
    }
    if (file.size > MAX_LOGO_SIZE) {
      toast.error("Logo must be under 2 MB");
      return;
    }

    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload/logo", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Upload failed");
        return;
      }
      setValue("logoUrl", data.url);
      setLogoPreview(data.url);
      toast.success("Logo uploaded");
    } catch {
      toast.error("Upload failed");
    } finally {
      setLogoUploading(false);
    }
  }

  function handleLogoDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleLogoFile(file);
  }

  function clearLogo() {
    setValue("logoUrl", "");
    setLogoPreview(null);
    if (logoInputRef.current) logoInputRef.current.value = "";
  }

  async function onSubmit(data: ApplicationFormData) {
    const url = isEditing ? `/api/applications/${application.id}` : "/api/applications";
    const method = isEditing ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Failed to save application");
      return;
    }

    toast.success(isEditing ? "Application updated" : "Application created");
    if (onSuccess) {
      onSuccess();
    } else {
      router.push("/applications");
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title={isEditing ? "Edit Application" : "Add New Application"}
        description={
          isEditing ? "Update application details" : "Add a new software product to your portfolio"
        }
        actions={
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        }
      />

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <form onSubmit={(handleSubmit as any)(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Application Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" placeholder="My Application" maxLength={100} aria-invalid={!!errors.name} {...register("name")} />
              {errors.name && (
                <p className="flex items-center gap-1 text-xs text-destructive"><AlertCircle className="h-3 w-3 shrink-0" />{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Category *</Label>
              <Select
                defaultValue={application?.category}
                onValueChange={(v) => setValue("category", v)}
              >
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.length > 0 ? (
                    categories.map((cat) => (
                      <SelectItem key={cat.key} value={cat.key}>
                        {cat.label}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="" disabled>Loading categories...</SelectItem>
                  )}
                </SelectContent>
              </Select>
              {errors.category && (
                <p className="flex items-center gap-1 text-xs text-destructive"><AlertCircle className="h-3 w-3 shrink-0" />{errors.category.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="version">Version *</Label>
              <Input id="version" placeholder="1.0.0" maxLength={20} aria-invalid={!!errors.version} {...register("version")} />
              {errors.version && (
                <p className="flex items-center gap-1 text-xs text-destructive"><AlertCircle className="h-3 w-3 shrink-0" />{errors.version.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                defaultValue={application?.status ?? "ACTIVE"}
                onValueChange={(v) => setValue("status", v as ApplicationFormData["status"])}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="BETA">Beta</SelectItem>
                  <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                  <SelectItem value="DEPRECATED">Deprecated</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Currency</Label>
              <Select
                defaultValue={application?.currency ?? "INR"}
                onValueChange={(v) => setValue("currency", v as ApplicationFormData["currency"])}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="INR">INR (₹)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthlyPrice">Monthly Price</Label>
              <Input
                id="monthlyPrice"
                type="number"
                step="0.01"
                min="0"
                placeholder="999.00"
                {...register("monthlyPrice", { valueAsNumber: true })}
              />
              {errors.monthlyPrice && (
                <p className="flex items-center gap-1 text-xs text-destructive"><AlertCircle className="h-3 w-3 shrink-0" />{errors.monthlyPrice.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="yearlyPrice">Yearly Price</Label>
              <Input
                id="yearlyPrice"
                type="number"
                step="0.01"
                min="0"
                placeholder="9999.00"
                {...register("yearlyPrice", { valueAsNumber: true })}
              />
              {errors.yearlyPrice && (
                <p className="flex items-center gap-1 text-xs text-destructive"><AlertCircle className="h-3 w-3 shrink-0" />{errors.yearlyPrice.message}</p>
              )}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of the application..."
                rows={3}
                {...register("description")}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Links &amp; Logo</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {/* Logo Upload */}
            <div className="space-y-2 sm:col-span-2">
              <Label>App Logo</Label>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleLogoFile(file);
                }}
              />

              {logoPreview || logoUrlValue ? (
                <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
                  <div className="h-14 w-14 shrink-0 rounded-md overflow-hidden border bg-background flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={logoPreview ?? logoUrlValue ?? ""}
                      alt="Logo preview"
                      className="h-full w-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground truncate">{logoUrlValue}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={clearLogo}
                    title="Remove logo"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <div
                  className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-6 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => logoInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleLogoDrop}
                >
                  {logoUploading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      <div className="text-center">
                        <p className="text-sm font-medium">Upload logo</p>
                        <p className="text-xs text-muted-foreground">PNG, JPG, WebP up to 2 MB — drag & drop or click</p>
                      </div>
                      <Button type="button" variant="outline" size="sm" disabled={logoUploading}>
                        <Upload className="h-3.5 w-3.5" />
                        Choose file
                      </Button>
                    </>
                  )}
                </div>
              )}

              {/* Fallback: manual URL */}
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Or enter a URL directly</p>
                <Input
                  placeholder="https://example.com/logo.png"
                  {...register("logoUrl")}
                  onChange={(e) => {
                    register("logoUrl").onChange(e);
                    setLogoPreview(e.target.value || null);
                  }}
                />
                {errors.logoUrl && (
                  <p className="flex items-center gap-1 text-xs text-destructive"><AlertCircle className="h-3 w-3 shrink-0" />{errors.logoUrl.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="website">Website</Label>
              <Input id="website" placeholder="https://..." {...register("website")} />
              {errors.website && (
                <p className="flex items-center gap-1 text-xs text-destructive"><AlertCircle className="h-3 w-3 shrink-0" />{errors.website.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="playStoreUrl">Play Store URL</Label>
              <Input id="playStoreUrl" placeholder="https://play.google.com/..." {...register("playStoreUrl")} />
              {errors.playStoreUrl && (
                <p className="flex items-center gap-1 text-xs text-destructive"><AlertCircle className="h-3 w-3 shrink-0" />{errors.playStoreUrl.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="appStoreUrl">App Store URL</Label>
              <Input id="appStoreUrl" placeholder="https://apps.apple.com/..." {...register("appStoreUrl")} />
              {errors.appStoreUrl && (
                <p className="flex items-center gap-1 text-xs text-destructive"><AlertCircle className="h-3 w-3 shrink-0" />{errors.appStoreUrl.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || logoUploading}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : isEditing ? (
              "Save Changes"
            ) : (
              "Create Application"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
