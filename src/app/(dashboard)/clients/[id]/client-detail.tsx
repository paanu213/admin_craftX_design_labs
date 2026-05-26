"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Mail,
  Phone,
  Globe,
  MapPin,
  CreditCard,
  Users,
  Calendar,
  Monitor,
  Smartphone,
  LayoutGrid,
  Building2,
  KeyRound,
  Copy,
  CheckCheck,
  RefreshCw,
  ShieldOff,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RoleGuard } from "@/components/guards/RoleGuard";
import { ClientForm } from "@/components/forms/ClientForm";
import { SubscriptionForm } from "@/components/forms/SubscriptionForm";
import {
  formatCurrency,
  formatDate,
  CLIENT_STATUS_LABELS,
  BILLING_CYCLE_LABELS,
} from "@/lib/utils";
import type { ClientStatus, ClientWithRelations } from "@/types";

const STATUS_VARIANT_MAP: Record<
  ClientStatus,
  "success" | "info" | "warning" | "destructive"
> = {
  ACTIVE: "success",
  TRIAL: "info",
  INACTIVE: "warning",
  CHURNED: "destructive",
};

const KEY_STATUS_VARIANT: Record<string, "success" | "warning" | "destructive"> = {
  ACTIVE: "success",
  PENDING: "warning",
  REVOKED: "destructive",
};

const KEY_STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Activated",
  PENDING: "Awaiting Activation",
  REVOKED: "Revoked",
};

const APP_ICONS: Record<string, React.ReactNode> = {
  WEB: <LayoutGrid className="h-3.5 w-3.5" />,
  MOBILE: <Smartphone className="h-3.5 w-3.5" />,
  DESKTOP: <Monitor className="h-3.5 w-3.5" />,
};

const APP_LABELS: Record<string, string> = {
  WEB: "Web App",
  MOBILE: "Mobile App",
  DESKTOP: "Desktop App",
};

export function ClientDetail({ clientId }: { clientId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [keyLoading, setKeyLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: client, isLoading } = useQuery<ClientWithRelations>({
    queryKey: ["client", clientId],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${clientId}`);
      if (!res.ok) throw new Error("Failed to load client");
      return res.json();
    },
  });

  async function handleDelete() {
    if (!confirm(`Delete client "${client?.name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/clients/${clientId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Client deleted");
      router.push("/clients");
    } else {
      toast.error("Failed to delete client");
    }
  }

  async function handleStatusChange(newStatus: ClientStatus) {
    if (!client) return;
    setUpdatingStatus(true);
    const res = await fetch(`/api/clients/${clientId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...client, status: newStatus }),
    });
    setUpdatingStatus(false);
    if (res.ok) {
      toast.success(`Status updated to ${CLIENT_STATUS_LABELS[newStatus]}`);
      queryClient.invalidateQueries({ queryKey: ["client", clientId] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    } else {
      toast.error("Failed to update status");
    }
  }

  async function handleGenerateKey() {
    if (!client?.subscription) {
      toast.error("Add a subscription plan before generating a key");
      return;
    }
    if (
      client.activationKey?.status === "ACTIVE" &&
      !confirm("This client already has an active key. Generate a new one? The old key will stop working.")
    ) {
      return;
    }
    setKeyLoading(true);
    const res = await fetch("/api/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId }),
    });
    setKeyLoading(false);
    if (res.ok) {
      toast.success("Activation key generated");
      queryClient.invalidateQueries({ queryKey: ["client", clientId] });
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Failed to generate key");
    }
  }

  async function handleRevokeKey() {
    if (!confirm("Revoke this key? The client's application will stop working until a new key is generated.")) return;
    setKeyLoading(true);
    const res = await fetch(`/api/keys/${clientId}`, { method: "DELETE" });
    setKeyLoading(false);
    if (res.ok) {
      toast.success("Key revoked");
      queryClient.invalidateQueries({ queryKey: ["client", clientId] });
    } else {
      toast.error("Failed to revoke key");
    }
  }

  async function copyKey(key: string) {
    await navigator.clipboard.writeText(key);
    setCopied(true);
    toast.success("Key copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-4xl">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Client not found</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
          Go back
        </Button>
      </div>
    );
  }

  if (editing) {
    return (
      <ClientForm
        client={client}
        onSuccess={() => {
          setEditing(false);
          queryClient.invalidateQueries({ queryKey: ["client", clientId] });
          queryClient.invalidateQueries({ queryKey: ["clients"] });
        }}
      />
    );
  }

  if (editingSubscription) {
    return (
      <SubscriptionForm
        clientId={clientId}
        subscription={client.subscription ?? undefined}
        onSuccess={() => {
          setEditingSubscription(false);
          queryClient.invalidateQueries({ queryKey: ["client", clientId] });
        }}
        onCancel={() => setEditingSubscription(false)}
      />
    );
  }

  const fullAddress = [
    client.addressLine1,
    client.addressLine2,
    client.locality,
    client.city,
    client.state,
    client.pincode,
  ]
    .filter(Boolean)
    .join(", ");

  const ak = client.activationKey;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="outline" size="icon" className="shrink-0" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold truncate">{client.name}</h2>
            <p className="text-sm text-muted-foreground truncate">{client.company}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={STATUS_VARIANT_MAP[client.status]}>
            {CLIENT_STATUS_LABELS[client.status]}
          </Badge>

          <RoleGuard permission="editClients">
            <Select
              defaultValue={client.status}
              onValueChange={(v) => handleStatusChange(v as ClientStatus)}
              disabled={updatingStatus}
            >
              <SelectTrigger className="h-8 text-xs w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TRIAL">Trial</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
                <SelectItem value="CHURNED">Churned</SelectItem>
              </SelectContent>
            </Select>
          </RoleGuard>

          <RoleGuard permission="editClients">
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Edit className="h-4 w-4" />
              <span className="hidden sm:inline">Edit</span>
            </Button>
          </RoleGuard>
          <RoleGuard permission="deleteClients">
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Delete</span>
            </Button>
          </RoleGuard>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Business Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Business Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <a href={`mailto:${client.email}`} className="text-primary hover:underline">
                {client.email}
              </a>
            </div>
            {client.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{client.phone}</span>
              </div>
            )}
            {client.website && (
              <div className="flex items-center gap-2 text-sm">
                <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                <a
                  href={client.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline truncate"
                >
                  {client.website}
                </a>
              </div>
            )}
            {fullAddress && (
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <span>{fullAddress}</span>
              </div>
            )}
            <Separator />
            <div className="text-sm space-y-1">
              {client.industry && (
                <p>
                  <span className="text-muted-foreground">Industry: </span>
                  {client.industry}
                </p>
              )}
              {client.businessType && (
                <p>
                  <span className="text-muted-foreground">Business Type: </span>
                  {client.businessType}
                </p>
              )}
              {client.gstNumber && (
                <p>
                  <span className="text-muted-foreground">GST: </span>
                  <span className="font-mono">{client.gstNumber}</span>
                </p>
              )}
              {client.panNumber && (
                <p>
                  <span className="text-muted-foreground">PAN: </span>
                  <span className="font-mono">{client.panNumber}</span>
                </p>
              )}
              <p>
                <span className="text-muted-foreground">Joined: </span>
                {formatDate(client.createdAt)}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Subscription */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Subscription
              </CardTitle>
              <RoleGuard permission="editClients">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingSubscription(true)}
                >
                  <Edit className="h-3 w-3 mr-1" />
                  {client.subscription ? "Edit" : "Add"}
                </Button>
              </RoleGuard>
            </div>
          </CardHeader>
          <CardContent>
            {client.subscription ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-lg">
                    {client.subscription.planName}
                  </span>
                  <span className="text-xl font-bold text-primary">
                    {formatCurrency(
                      Number(client.subscription.price),
                      client.subscription.currency
                    )}
                    <span className="text-sm font-normal text-muted-foreground">
                      /{" "}
                      {BILLING_CYCLE_LABELS[
                        client.subscription.billingCycle
                      ]?.toLowerCase()}
                    </span>
                  </span>
                </div>
                <Separator />
                <div className="text-sm space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Started: </span>
                    {formatDate(client.subscription.startDate)}
                  </div>
                  {client.subscription.renewalDate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Renews: </span>
                      {formatDate(client.subscription.renewalDate)}
                    </div>
                  )}
                  {Array.isArray(client.subscription.features) && client.subscription.features.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {client.subscription.features.map((f) => (
                        <Badge key={f} variant="secondary" className="text-xs">
                          {f}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <p className="text-sm text-muted-foreground">No subscription set up</p>
                <RoleGuard permission="editClients">
                  <Button variant="outline" size="sm" onClick={() => setEditingSubscription(true)}>
                    Add Subscription
                  </Button>
                </RoleGuard>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activation Key */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              Activation Key
            </CardTitle>
            <RoleGuard permission="generateKey">
              <div className="flex items-center gap-2">
                {ak && ak.status !== "REVOKED" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={handleRevokeKey}
                    disabled={keyLoading}
                  >
                    {keyLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ShieldOff className="h-3.5 w-3.5" />
                    )}
                    Revoke
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateKey}
                  disabled={keyLoading}
                >
                  {keyLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  {ak ? "Regenerate" : "Generate Key"}
                </Button>
              </div>
            </RoleGuard>
          </div>
        </CardHeader>
        <CardContent>
          {ak ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <Badge variant={KEY_STATUS_VARIANT[ak.status]}>
                  {KEY_STATUS_LABEL[ak.status]}
                </Badge>
                <p className="text-xs text-muted-foreground">
                  Generated by {ak.generatedBy.name} · {formatDate(ak.generatedAt)}
                </p>
              </div>

              {ak.status !== "REVOKED" && (
                <div className="flex items-center gap-2 bg-muted rounded-lg px-4 py-3">
                  <code className="flex-1 font-mono text-sm tracking-widest select-all">
                    {ak.key}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => copyKey(ak.key)}
                  >
                    {copied ? (
                      <CheckCheck className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              )}

              {ak.status === "ACTIVE" && ak.activatedAt && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Activated on {formatDate(ak.activatedAt)}
                </p>
              )}

              {ak.status === "PENDING" && (
                <p className="text-xs text-muted-foreground">
                  Share this key with the client. The subscription starts when they enter it in the installed application.
                </p>
              )}

              {ak.status === "REVOKED" && (
                <p className="text-xs text-destructive">
                  This key is revoked. Generate a new key to reactivate the client&apos;s application.
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
              <KeyRound className="h-8 w-8 text-muted-foreground/40" />
              <div>
                <p className="text-sm font-medium">No activation key yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {client.subscription
                    ? "CEO or Super Admin can generate a key to activate the client's application."
                    : "Add a subscription plan first, then generate an activation key."}
                </p>
              </div>
              <RoleGuard permission="generateKey">
                {client.subscription && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateKey}
                    disabled={keyLoading}
                  >
                    {keyLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <KeyRound className="h-4 w-4" />
                    )}
                    Generate Activation Key
                  </Button>
                )}
              </RoleGuard>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Application Requirements */}
      {Array.isArray(client.appRequirements) && client.appRequirements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              Application Requirements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {client.appRequirements.map((req) => (
                <Badge
                  key={req}
                  variant="secondary"
                  className="flex items-center gap-1.5 px-3 py-1"
                >
                  {APP_ICONS[req]}
                  {APP_LABELS[req] ?? req}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contacts */}
      {client.contacts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Contacts ({client.contacts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {client.contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="py-3 flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{contact.name}</p>
                      {contact.isPrimary && (
                        <Badge variant="secondary" className="text-xs">Primary</Badge>
                      )}
                    </div>
                    {contact.role && (
                      <p className="text-xs text-muted-foreground">{contact.role}</p>
                    )}
                  </div>
                  <div className="text-right text-xs text-muted-foreground space-y-0.5">
                    {contact.email && <p>{contact.email}</p>}
                    {contact.phone && <p>{contact.phone}</p>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {client.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {client.notes}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
