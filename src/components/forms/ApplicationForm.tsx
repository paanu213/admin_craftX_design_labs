"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";
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
import type { Application } from "@/types";

interface ApplicationFormProps {
  application?: Application;
  onSuccess?: () => void;
}

export function ApplicationForm({ application, onSuccess }: ApplicationFormProps) {
  const router = useRouter();
  const isEditing = !!application;

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ApplicationFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(applicationSchema) as any,
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
              <Input id="name" placeholder="My Application" {...register("name")} />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Category *</Label>
              <Select
                defaultValue={application?.category}
                onValueChange={(v) => setValue("category", v as ApplicationFormData["category"])}
              >
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BILLING">Billing</SelectItem>
                  <SelectItem value="INVENTORY">Inventory</SelectItem>
                  <SelectItem value="POS">Point of Sale</SelectItem>
                  <SelectItem value="RESTAURANT">Restaurant</SelectItem>
                  <SelectItem value="HOSPITAL">Hospital</SelectItem>
                  <SelectItem value="SCHOOL">School</SelectItem>
                  <SelectItem value="REAL_ESTATE">Real Estate</SelectItem>
                  <SelectItem value="LOGISTICS">Logistics</SelectItem>
                  <SelectItem value="CRM">CRM</SelectItem>
                  <SelectItem value="HR_PAYROLL">HR & Payroll</SelectItem>
                  <SelectItem value="FINANCE">Finance</SelectItem>
                  <SelectItem value="MANUFACTURING">Manufacturing</SelectItem>
                  <SelectItem value="E_COMMERCE">E-Commerce</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
              {errors.category && (
                <p className="text-xs text-destructive">{errors.category.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="version">Version *</Label>
              <Input id="version" placeholder="1.0.0" {...register("version")} />
              {errors.version && (
                <p className="text-xs text-destructive">{errors.version.message}</p>
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
                <p className="text-xs text-destructive">{errors.monthlyPrice.message}</p>
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
                <p className="text-xs text-destructive">{errors.yearlyPrice.message}</p>
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
            <CardTitle className="text-base">Links</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="logoUrl">Logo URL</Label>
              <Input id="logoUrl" placeholder="https://..." {...register("logoUrl")} />
              {errors.logoUrl && (
                <p className="text-xs text-destructive">{errors.logoUrl.message}</p>
              )}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="website">Website</Label>
              <Input id="website" placeholder="https://..." {...register("website")} />
              {errors.website && (
                <p className="text-xs text-destructive">{errors.website.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="playStoreUrl">Play Store URL</Label>
              <Input id="playStoreUrl" placeholder="https://play.google.com/..." {...register("playStoreUrl")} />
              {errors.playStoreUrl && (
                <p className="text-xs text-destructive">{errors.playStoreUrl.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="appStoreUrl">App Store URL</Label>
              <Input id="appStoreUrl" placeholder="https://apps.apple.com/..." {...register("appStoreUrl")} />
              {errors.appStoreUrl && (
                <p className="text-xs text-destructive">{errors.appStoreUrl.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
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
