"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Terminal, Save, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/layout/PageWrapper";
import { GenerateDevPasswordDialog } from "@/components/dialogs/GenerateDevPasswordDialog";
import {
  formatDate,
  DEV_PASSWORD_STATUS_LABELS,
  DEV_PASSWORD_STATUS_VARIANT,
  ROLE_LABELS,
} from "@/lib/utils";
import type { DevAccessPassword } from "@/types";

function getPasswordStatus(record: DevAccessPassword): "ACTIVE" | "USED" | "EXPIRED" {
  if (record.usedAt) return "USED";
  if (new Date(record.expiresAt) < new Date()) return "EXPIRED";
  return "ACTIVE";
}

interface DevAccessContentProps {
  canGenerate: boolean;
  userId: string;
}

export function DevAccessContent({ canGenerate }: DevAccessContentProps) {
  const isFounder = canGenerate;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function copyPassword(id: string, password: string) {
    try {
      await navigator.clipboard.writeText(password);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // clipboard not available
    }
  }
  const [expiryHours, setExpiryHours] = useState<string>("2");
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  const {
    data: passwords,
    isLoading,
    isError,
    refetch,
  } = useQuery<DevAccessPassword[]>({
    queryKey: ["dev-passwords"],
    queryFn: async () => {
      const res = await fetch("/api/dev-passwords");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load passwords");
      return Array.isArray(json) ? json : [];
    },
  });

  const { data: settings, refetch: refetchSettings } = useQuery<Record<string, string>>({
    queryKey: ["settings"],
    queryFn: () => fetch("/api/settings").then((r) => r.json()),
    enabled: isFounder,
  });

  // Initialize expiry input from settings once loaded (don't override if user has typed)
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (settings?.DEV_PASSWORD_EXPIRY_HOURS && !settingsLoaded) {
      setExpiryHours(settings.DEV_PASSWORD_EXPIRY_HOURS);
      setSettingsLoaded(true);
    }
  }, [settings, settingsLoaded]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function handleSaveSettings() {
    const hours = parseInt(expiryHours || "0", 10);
    if (isNaN(hours) || hours < 1 || hours > 168) {
      toast.error("Expiry must be between 1 and 168 hours");
      return;
    }

    setSavingSettings(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "DEV_PASSWORD_EXPIRY_HOURS", value: String(hours) }),
      });

      if (res.ok) {
        toast.success("Settings saved");
        refetchSettings();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error ?? "Failed to save settings");
      }
    } finally {
      setSavingSettings(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Dev Access"
        description="Manage temporary dev access passwords for client applications"
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Generate Dev Password
          </Button>
        }
      />

      {/* Settings Card — founders only */}
      {isFounder && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Terminal className="h-4 w-4 text-muted-foreground" />
              Dev Password Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="expiry-hours">Dev Password Expiry</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="expiry-hours"
                    type="number"
                    min={1}
                    max={168}
                    value={expiryHours}
                    onChange={(e) => setExpiryHours(e.target.value)}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">hours</span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="self-start sm:self-auto"
              >
                <Save className="h-4 w-4" />
                {savingSettings ? "Saving..." : "Save"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <p className="text-destructive text-sm">Failed to load dev passwords. Please try again.</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
            </div>
          ) : !passwords?.length ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Terminal className="h-8 w-8 text-muted-foreground" />
              <p className="text-muted-foreground text-sm">No dev access passwords found</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDialogOpen(true)}
              >
                <Plus className="h-4 w-4" />
                Generate your first password
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Client
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Password
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">
                      Reason
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">
                      Generated By
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">
                      Created At
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">
                      Expires At
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">
                      Used At
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {passwords.map((record) => {
                    const status = getPasswordStatus(record);
                    return (
                      <tr
                        key={record.id}
                        className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <p className="font-semibold text-foreground">
                            {record.client?.company ?? "—"}
                          </p>
                          {record.client?.clientCode && (
                            <p className="text-xs font-mono text-muted-foreground">
                              {record.client.clientCode}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {status === "ACTIVE" && record.password ? (
                            <div className="flex items-center gap-1.5">
                              <code className="font-mono font-bold text-base tracking-widest text-foreground">
                                {record.password}
                              </code>
                              <button
                                onClick={() => copyPassword(record.id, record.password!)}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                                title="Copy password"
                              >
                                {copiedId === record.id ? (
                                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <p className="text-muted-foreground max-w-[240px] truncate">
                            {record.reason}
                          </p>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">
                          <p>{record.generatedBy?.name ?? "—"}</p>
                          <p>{ROLE_LABELS[record.generatedBy?.role] ?? record.generatedBy?.role}</p>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">
                          {formatDate(record.createdAt)}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell text-muted-foreground text-xs">
                          {formatDate(record.expiresAt, "MMM d, yyyy h:mm a")}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={DEV_PASSWORD_STATUS_VARIANT[status]}>
                            {DEV_PASSWORD_STATUS_LABELS[status]}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">
                          {record.usedAt ? (
                            <div>
                              <p>{formatDate(record.usedAt)}</p>
                              {record.usedFromIp && (
                                <p className="font-mono">{record.usedFromIp}</p>
                              )}
                            </div>
                          ) : (
                            <span>—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <GenerateDevPasswordDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={refetch}
      />
    </div>
  );
}
