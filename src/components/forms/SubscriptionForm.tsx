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
    queryFn: async () => {
      const r = await fetch("/api/applications?status=ACTIVE");
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? "Failed to load applications");
      return json;
    },
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          applicationId: (subscription as any).applicationId ?? null,
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

  const selectedApp = apps.find((a) => a.id === watchedAppId);

  // Unique cycles only (MONTHLY and QUARTERLY both need monthlyPrice)
  const uniqueCycles = selectedApp
    ? [
        ...(selectedApp.monthlyPrice != null ? ["MONTHLY", "QUARTERLY"] : []),
        ...(selectedApp.yearlyPrice != null ? ["ANNUALLY"] : []),
      ]
    : ["MONTHLY", "QUARTERLY", "ANNUALLY"];

  const CYCLE_LABELS: Record<string, string> = {
    MONTHLY: "Monthly",
    QUARTERLY: "Quarterly",
    ANNUALLY: "Annually",
  };

  // Auto-calculate renewal date
  useEffect(() => {
    if (!watchedStartDate) return;
    const renewal = computeRenewalDate(watchedStartDate, watchedBillingCycle ?? "MONTHLY");
    if (renewal) setValue("renewalDate", renewal);
  }, [watchedStartDate, watchedBillingCycle, setValue]);

  // Auto-fill price and currency when app or billing cycle changes
  useEffect(() => {
    if (!watchedAppId || !selectedApp) return;
    const cycle = watchedBillingCycle ?? "MONTHLY";
    if (cycle === "ANNUALLY" && selectedApp.yearlyPrice != null) {
      setValue("price", Number(selectedApp.yearlyPrice));
    } else if (selectedApp.monthlyPrice != null) {
      setValue("price", Number(selectedApp.monthlyPrice));
    }
    if (selectedApp.currency) {
      setValue("currency", selectedApp.currency as SubscriptionFormData["currency"]);
    }
  }, [watchedAppId, watchedBillingCycle, selectedApp, setValue]);

  // If app changes and current billing cycle is not available, reset to first available
  useEffect(() => {
    if (!selectedApp) return;
    if (!uniqueCycles.includes(watchedBillingCycle ?? "")) {
      setValue("billingCycle", uniqueCycles[0] as SubscriptionFormData["billingCycle"]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedAppId]);

  async function onSubmit(data: SubscriptionFormData) {
    const res = await fetch(`/api/clients/${clientId}/subscription`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Failed to save subscription");
      return;
    }

    toast.success(isEditing ? "Subscription updated" : "Subscription created");
    onSuccess();
  }

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
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
                <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground space-y-0.5">
                  <p className="font-medium text-foreground">{selectedApp.name}</p>
                  <div className="flex flex-wrap gap-3">
                    {selectedApp.monthlyPrice != null && (
                      <span>Monthly: {selectedApp.currency === "USD" ? "$" : selectedApp.currency === "EUR" ? "€" : selectedApp.currency === "GBP" ? "£" : "₹"}{Number(selectedApp.monthlyPrice).toLocaleString()}</span>
                    )}
                    {selectedApp.yearlyPrice != null && (
                      <span>Yearly: {selectedApp.currency === "USD" ? "$" : selectedApp.currency === "EUR" ? "€" : selectedApp.currency === "GBP" ? "£" : "₹"}{Number(selectedApp.yearlyPrice).toLocaleString()}</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Billing Cycle — dynamic based on app */}
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
                  {uniqueCycles.map((cycle) => (
                    <SelectItem key={cycle} value={cycle}>
                      {CYCLE_LABELS[cycle]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.billingCycle && (
                <p className="flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="h-3 w-3 shrink-0" />{errors.billingCycle.message}
                </p>
              )}
            </div>

            {/* Price — auto-filled from app */}
            <div className="space-y-1.5">
              <Label htmlFor="price">
                Price *
                {selectedApp?.currency && (
                  <span className="ml-1 text-xs text-muted-foreground font-normal">({selectedApp.currency})</span>
                )}
              </Label>
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
              {selectedApp && (
                <p className="text-xs text-muted-foreground">
                  Auto-filled from application pricing
                </p>
              )}
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
