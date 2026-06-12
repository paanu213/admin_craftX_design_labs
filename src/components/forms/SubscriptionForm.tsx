"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, AlertCircle } from "lucide-react";
import {
  subscriptionSchema,
  type SubscriptionFormData,
} from "@/lib/validations/client.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageWrapper";
import type { Subscription, Application } from "@/types";
import { format, addMonths, addYears, subDays } from "date-fns";

function computeRenewalDate(startDate: string, billingCycle: string): string {
  const start = new Date(startDate);
  if (isNaN(start.getTime())) return "";
  let next: Date;
  if (billingCycle === "MONTHLY") next = addMonths(start, 1);
  else if (billingCycle === "QUARTERLY") next = addMonths(start, 3);
  else next = addYears(start, 1);
  return format(subDays(next, 1), "yyyy-MM-dd");
}

interface SubscriptionFormProps {
  clientId: string;
  subscription?: Subscription;
  onSuccess: () => void;
  onCancel: () => void;
}

export function SubscriptionForm({
  clientId,
  subscription,
  onSuccess,
  onCancel,
}: SubscriptionFormProps) {
  const isEditing = !!subscription;

  const { data: appsData } = useQuery<{ data: Application[] }>({
    queryKey: ["applications-list"],
    queryFn: () => fetch("/api/applications?status=ACTIVE").then((r) => r.json()),
  });
  const apps = appsData?.data ?? [];

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SubscriptionFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(subscriptionSchema) as any,
    mode: "onTouched",
    defaultValues: subscription
      ? {
          applicationId: (subscription as any).applicationId ?? null,
          planName: subscription.planName,
          price: Number(subscription.price),
          currency: subscription.currency as SubscriptionFormData["currency"],
          billingCycle: subscription.billingCycle,
          startDate: format(new Date(subscription.startDate), "yyyy-MM-dd"),
          renewalDate: subscription.renewalDate
            ? format(new Date(subscription.renewalDate), "yyyy-MM-dd")
            : "",
          isAutoRenew: subscription.isAutoRenew,
          features: subscription.features,
        }
      : {
          applicationId: null,
          currency: "INR",
          billingCycle: "MONTHLY",
          isAutoRenew: true,
          features: [],
        },
  });

  const watchedStartDate = watch("startDate");
  const watchedBillingCycle = watch("billingCycle");
  const watchedAppId = watch("applicationId");

  // Auto-calculate renewal date
  useEffect(() => {
    if (!watchedStartDate) return;
    const renewal = computeRenewalDate(watchedStartDate, watchedBillingCycle ?? "MONTHLY");
    if (renewal) setValue("renewalDate", renewal);
  }, [watchedStartDate, watchedBillingCycle, setValue]);

  // Auto-fill price when app or billing cycle changes
  useEffect(() => {
    if (!watchedAppId) return;
    const app = apps.find((a) => a.id === watchedAppId);
    if (!app) return;
    const cycle = watchedBillingCycle ?? "MONTHLY";
    if (cycle === "ANNUALLY" && app.yearlyPrice != null) {
      setValue("price", app.yearlyPrice);
      if (app.currency) setValue("currency", app.currency as SubscriptionFormData["currency"]);
    } else if (app.monthlyPrice != null) {
      setValue("price", app.monthlyPrice);
      if (app.currency) setValue("currency", app.currency as SubscriptionFormData["currency"]);
    }
  }, [watchedAppId, watchedBillingCycle, apps, setValue]);

  async function onSubmit(data: SubscriptionFormData) {
    const res = await fetch(`/api/clients/${clientId}/subscription`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      toast.error("Failed to save subscription");
      return;
    }

    toast.success(isEditing ? "Subscription updated" : "Subscription created");
    onSuccess();
  }

  const selectedApp = apps.find((a) => a.id === watchedAppId);

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader title={isEditing ? "Edit Subscription" : "Add Subscription"} />

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <form onSubmit={(handleSubmit as any)(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Subscription Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">

            {/* Application selector */}
            <div className="space-y-2 sm:col-span-2">
              <Label>Application</Label>
              <Select
                defaultValue={(subscription as any)?.applicationId ?? "none"}
                onValueChange={(v) => setValue("applicationId", v === "none" ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select application (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific application</SelectItem>
                  {apps.map((app) => (
                    <SelectItem key={app.id} value={app.id}>
                      {app.name} — v{app.version}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedApp && (
                <p className="text-xs text-muted-foreground">
                  {selectedApp.monthlyPrice != null && (
                    <span>Monthly: ₹{selectedApp.monthlyPrice}</span>
                  )}
                  {selectedApp.monthlyPrice != null && selectedApp.yearlyPrice != null && " · "}
                  {selectedApp.yearlyPrice != null && (
                    <span>Yearly: ₹{selectedApp.yearlyPrice}</span>
                  )}
                  {" — price auto-filled based on billing cycle"}
                </p>
              )}
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="planName">Plan Name *</Label>
              <Input
                id="planName"
                placeholder="Professional Plan"
                maxLength={100}
                aria-invalid={!!errors.planName}
                {...register("planName")}
              />
              {errors.planName && (
                <p className="flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="h-3 w-3 shrink-0" />{errors.planName.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Billing Cycle *</Label>
              <Select
                defaultValue={subscription?.billingCycle ?? "MONTHLY"}
                onValueChange={(v) =>
                  setValue("billingCycle", v as SubscriptionFormData["billingCycle"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                  <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                  <SelectItem value="ANNUALLY">Annually</SelectItem>
                </SelectContent>
              </Select>
              {errors.billingCycle && (
                <p className="flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="h-3 w-3 shrink-0" />{errors.billingCycle.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="price">Price *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                aria-invalid={!!errors.price}
                {...register("price", { valueAsNumber: true })}
              />
              {errors.price && (
                <p className="flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="h-3 w-3 shrink-0" />{errors.price.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="currency">Currency</Label>
              <Select
                defaultValue={subscription?.currency ?? "INR"}
                onValueChange={(v) => setValue("currency", v as SubscriptionFormData["currency"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INR">INR (₹)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                id="startDate"
                type="date"
                aria-invalid={!!errors.startDate}
                {...register("startDate")}
              />
              {errors.startDate && (
                <p className="flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="h-3 w-3 shrink-0" />{errors.startDate.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="renewalDate">Renewal Date</Label>
              <Input id="renewalDate" type="date" {...register("renewalDate")} />
              {errors.renewalDate ? (
                <p className="flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="h-3 w-3 shrink-0" />{errors.renewalDate.message}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Auto-calculated from start date &amp; billing cycle.
                </p>
              )}
            </div>

          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Subscription"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
