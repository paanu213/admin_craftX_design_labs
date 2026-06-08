"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Globe,
  ExternalLink,
  Calendar,
  User,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { RoleGuard } from "@/components/guards/RoleGuard";
import { ApplicationForm } from "@/components/forms/ApplicationForm";
import {
  formatCurrency,
  formatDate,
  APP_CATEGORY_LABELS,
  APP_STATUS_LABELS,
  APP_STATUS_VARIANT,
  BILLING_CYCLE_LABELS,
  CLIENT_STATUS_LABELS,
  CLIENT_STATUS_VARIANT,
  ROLE_LABELS,
} from "@/lib/utils";
import type { Application, Subscription } from "@/types";

interface SubscriptionWithClient extends Subscription {
  client: {
    id: string;
    name: string;
    company: string;
    status: string;
  };
}

interface ApplicationDetail extends Application {
  subscriptions: SubscriptionWithClient[];
}

export function ApplicationDetail({ appId }: { appId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  const { data: app, isLoading } = useQuery<ApplicationDetail>({
    queryKey: ["application", appId],
    queryFn: async () => {
      const res = await fetch(`/api/applications/${appId}`);
      if (!res.ok) throw new Error("Failed to load application");
      return res.json();
    },
  });

  async function handleDelete() {
    if (!confirm(`Delete application "${app?.name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/applications/${appId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Application deleted");
      router.push("/applications");
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Failed to delete application");
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-3xl">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!app) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Application not found</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
          Go back
        </Button>
      </div>
    );
  }

  if (editing) {
    return (
      <ApplicationForm
        application={app}
        onSuccess={() => {
          setEditing(false);
          queryClient.invalidateQueries({ queryKey: ["application", appId] });
          queryClient.invalidateQueries({ queryKey: ["applications"] });
        }}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="outline" size="icon" className="shrink-0" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-bold truncate">{app.name}</h2>
              <span className="text-sm text-muted-foreground font-mono">v{app.version}</span>
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant={APP_STATUS_VARIANT[app.status]}>
                {APP_STATUS_LABELS[app.status]}
              </Badge>
              <Badge variant="secondary">
                {APP_CATEGORY_LABELS[app.category] ?? app.category}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <RoleGuard permission="editApplications">
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Edit className="h-4 w-4" />
              Edit
            </Button>
          </RoleGuard>
          <RoleGuard permission="deleteApplications">
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </RoleGuard>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Total Clients</p>
            <p className="text-2xl font-bold">{app._count?.subscriptions ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Active Subscriptions</p>
            <p className="text-2xl font-bold">{app.activeSubscriptions ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Added by</p>
            <p className="text-sm font-semibold truncate mt-1">{app.createdBy?.name}</p>
            <p className="text-xs text-muted-foreground">{ROLE_LABELS[app.createdBy?.role] ?? app.createdBy?.role}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Created</p>
            <p className="text-sm font-semibold mt-1">{formatDate(app.createdAt)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Application Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {app.description && (
            <>
              <div>
                <p className="text-sm font-medium mb-1">Description</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{app.description}</p>
              </div>
              <Separator />
            </>
          )}

          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            {app.monthlyPrice != null && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Monthly Price:</span>
                <span className="font-semibold">{formatCurrency(app.monthlyPrice, app.currency)}</span>
              </div>
            )}
            {app.yearlyPrice != null && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Yearly Price:</span>
                <span className="font-semibold">{formatCurrency(app.yearlyPrice, app.currency)}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Currency:</span>
              <span>{app.currency}</span>
            </div>
          </div>

          {(app.website || app.playStoreUrl || app.appStoreUrl) && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-sm font-medium">Links</p>
                <div className="flex flex-wrap gap-2">
                  {app.website && (
                    <a
                      href={app.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs rounded-md border border-border px-2.5 py-1.5 hover:bg-muted transition-colors"
                    >
                      <Globe className="h-3.5 w-3.5" />
                      Website
                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                    </a>
                  )}
                  {app.playStoreUrl && (
                    <a
                      href={app.playStoreUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs rounded-md border border-border px-2.5 py-1.5 hover:bg-muted transition-colors"
                    >
                      <Smartphone className="h-3.5 w-3.5" />
                      Play Store
                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                    </a>
                  )}
                  {app.appStoreUrl && (
                    <a
                      href={app.appStoreUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs rounded-md border border-border px-2.5 py-1.5 hover:bg-muted transition-colors"
                    >
                      <Smartphone className="h-3.5 w-3.5" />
                      App Store
                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                    </a>
                  )}
                </div>
              </div>
            </>
          )}

          <Separator />
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              Added by {app.createdBy?.name}
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(app.createdAt)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Clients / Subscriptions Table */}
      {app.subscriptions && app.subscriptions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Clients using this application ({app.subscriptions.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Client</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Plan</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Billing</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Renewal</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {app.subscriptions.map((sub) => (
                    <tr
                      key={sub.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => router.push(`/clients/${sub.clientId}`)}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium">{sub.client.company}</p>
                        <p className="text-xs text-muted-foreground">{sub.client.name}</p>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <p>{sub.planName}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(sub.price, sub.currency)}
                        </p>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                        {BILLING_CYCLE_LABELS[sub.billingCycle] ?? sub.billingCycle}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                        {sub.renewalDate ? formatDate(sub.renewalDate) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={CLIENT_STATUS_VARIANT[sub.client.status] as "success" | "info" | "warning" | "destructive" | "secondary" | "muted"}>
                          {CLIENT_STATUS_LABELS[sub.client.status] ?? sub.client.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
