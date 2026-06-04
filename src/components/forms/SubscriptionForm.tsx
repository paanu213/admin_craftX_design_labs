"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
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
import type { Subscription } from "@/types";
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

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SubscriptionFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(subscriptionSchema) as any,
    defaultValues: subscription
      ? {
          planName: subscription.planName,
          price: Number(subscription.price),
          currency: subscription.currency as SubscriptionFormData["currency"],
          billingCycle: subscription.billingCycle,
          startDate: format(new Date(subscription.startDate), "yyyy-MM-dd"),
          endDate: subscription.endDate
            ? format(new Date(subscription.endDate), "yyyy-MM-dd")
            : "",
          renewalDate: subscription.renewalDate
            ? format(new Date(subscription.renewalDate), "yyyy-MM-dd")
            : "",
          isAutoRenew: subscription.isAutoRenew,
          features: subscription.features,
        }
      : {
          currency: "INR",
          billingCycle: "MONTHLY",
          isAutoRenew: true,
          features: [],
        },
  });

  const watchedStartDate = watch("startDate");
  const watchedBillingCycle = watch("billingCycle");

  useEffect(() => {
    if (!watchedStartDate) return;
    const renewal = computeRenewalDate(watchedStartDate, watchedBillingCycle ?? "MONTHLY");
    if (renewal) setValue("renewalDate", renewal);
  }, [watchedStartDate, watchedBillingCycle, setValue]);

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

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title={isEditing ? "Edit Subscription" : "Add Subscription"}
      />

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <form onSubmit={(handleSubmit as any)(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Subscription Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="planName">Plan Name *</Label>
              <Input
                id="planName"
                placeholder="Professional Plan"
                {...register("planName")}
              />
              {errors.planName && (
                <p className="text-xs text-destructive">{errors.planName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Price *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                placeholder="99.00"
                {...register("price", { valueAsNumber: true })}
              />
              {errors.price && (
                <p className="text-xs text-destructive">{errors.price.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select
                defaultValue="INR"
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

            <div className="space-y-2">
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                id="startDate"
                type="date"
                {...register("startDate")}
              />
              {errors.startDate && (
                <p className="text-xs text-destructive">{errors.startDate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="renewalDate">Renewal Date</Label>
              <Input
                id="renewalDate"
                type="date"
                {...register("renewalDate")}
              />
              <p className="text-xs text-muted-foreground">
                Auto-calculated from start date &amp; billing cycle. You can override.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                {...register("endDate")}
              />
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
