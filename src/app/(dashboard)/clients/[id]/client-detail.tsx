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
  ShieldOff,
  Loader2,
  PlusCircle,
  CheckCircle,
  XCircle,
  Banknote,
  ArrowUpCircle,
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
import { GenerateKeyDialog } from "@/components/dialogs/GenerateKeyDialog";
import { RecordPaymentDialog } from "@/components/dialogs/RecordPaymentDialog";
import {
  formatCurrency,
  formatDate,
  CLIENT_STATUS_LABELS,
  CLIENT_STATUS_VARIANT,
  BILLING_CYCLE_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_RECEIVER_LABELS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_VARIANT,
  KEY_TYPE_LABELS,
} from "@/lib/utils";
import type { ClientWithRelations, Payment } from "@/types";
import { useSession } from "next-auth/react";

const KEY_STATUS_VARIANT: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
  ACTIVE: "success",
  PENDING: "warning",
  REVOKED: "destructive",
  EXPIRED: "destructive",
};

const KEY_STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Activated",
  PENDING: "Awaiting Activation",
  REVOKED: "Revoked",
  EXPIRED: "Expired",
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
  const { data: session } = useSession();
  const [editing, setEditing] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [keyLoading, setKeyLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generateKeyOpen, setGenerateKeyOpen] = useState(false);
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [renewPaymentOpen, setRenewPaymentOpen] = useState(false);

  // Payment action states
  const [depositingId, setDepositingId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionNote, setRejectionNote] = useState<Record<string, string>>({});

  const { data: client, isLoading } = useQuery<ClientWithRelations>({
    queryKey: ["client", clientId],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${clientId}`);
      if (!res.ok) throw new Error("Failed to load client");
      return res.json();
    },
  });

  const { data: payments, refetch: refetchPayments } = useQuery<Payment[]>({
    queryKey: ["client-payments", clientId],
    queryFn: () =>
      fetch(`/api/payments?clientId=${clientId}`).then((r) => r.json()),
    enabled: !!clientId,
  });

  function invalidateClient() {
    queryClient.invalidateQueries({ queryKey: ["client", clientId] });
    queryClient.invalidateQueries({ queryKey: ["clients"] });
  }

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

  async function handleStatusChange(newStatus: string) {
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
      invalidateClient();
    } else {
      toast.error("Failed to update status");
    }
  }

  async function handleRevokeKey() {
    if (
      !confirm(
        "Revoke this key? The client's application will stop working until a new key is generated."
      )
    )
      return;
    setKeyLoading(true);
    const res = await fetch(`/api/keys/${clientId}`, { method: "DELETE" });
    setKeyLoading(false);
    if (res.ok) {
      toast.success("Key revoked");
      invalidateClient();
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

  async function handleDepositPayment(paymentId: string) {
    setDepositingId(paymentId);
    const res = await fetch(`/api/payments/${paymentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "deposit" }),
    });
    setDepositingId(null);
    if (res.ok) {
      toast.success("Marked as deposited — awaiting CEO approval");
      refetchPayments();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Failed to update payment");
    }
  }

  async function handleApprovePayment(paymentId: string) {
    setApprovingId(paymentId);
    const res = await fetch(`/api/payments/${paymentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve" }),
    });
    setApprovingId(null);
    if (res.ok) {
      toast.success("Payment approved");
      refetchPayments();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Failed to approve");
    }
  }

  async function handleRejectPayment(paymentId: string) {
    const note = rejectionNote[paymentId];
    if (!note?.trim()) {
      toast.error("Enter a rejection reason");
      return;
    }
    setRejectingId(paymentId);
    const res = await fetch(`/api/payments/${paymentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject", rejectionNote: note }),
    });
    setRejectingId(null);
    if (res.ok) {
      toast.success("Payment rejected");
      setRejectionNote((prev) => ({ ...prev, [paymentId]: "" }));
      refetchPayments();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Failed to reject");
    }
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
          invalidateClient();
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
          invalidateClient();
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
  const isCEO = ["CEO", "SUPER_ADMIN"].includes(session?.user?.role ?? "");

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Dialogs */}
      {client && (
        <>
          <GenerateKeyDialog
            open={generateKeyOpen}
            onOpenChange={setGenerateKeyOpen}
            client={client}
            onSuccess={invalidateClient}
          />
          <RecordPaymentDialog
            open={recordPaymentOpen}
            onOpenChange={setRecordPaymentOpen}
            client={client}
            onSuccess={refetchPayments}
          />
          <RecordPaymentDialog
            open={renewPaymentOpen}
            onOpenChange={setRenewPaymentOpen}
            client={client}
            onSuccess={refetchPayments}
            isRenewal={true}
          />
        </>
      )}

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
          <Badge variant={CLIENT_STATUS_VARIANT[client.status] ?? "secondary"}>
            {CLIENT_STATUS_LABELS[client.status]}
          </Badge>

          <RoleGuard permission="editClients">
            <Select
              defaultValue={client.status}
              onValueChange={(v) => handleStatusChange(v)}
              disabled={updatingStatus}
            >
              <SelectTrigger className="h-8 text-xs w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="REGISTERED">Registered</SelectItem>
                <SelectItem value="KEY_GENERATED">Key Generated</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
                <SelectItem value="CHURNED">Churned</SelectItem>
                <SelectItem value="TRIAL">Trial</SelectItem>
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
                  {Array.isArray(client.subscription.features) &&
                    client.subscription.features.length > 0 && (
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingSubscription(true)}
                  >
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
                  onClick={() => setGenerateKeyOpen(true)}
                  disabled={keyLoading}
                >
                  <KeyRound className="h-3.5 w-3.5" />
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
                <div className="flex items-center gap-2">
                  <Badge variant={KEY_STATUS_VARIANT[ak.status]}>
                    {KEY_STATUS_LABEL[ak.status]}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {KEY_TYPE_LABELS[ak.keyType] ?? ak.keyType}
                  </Badge>
                </div>
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

              {ak.expiresAt && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {ak.status === "EXPIRED"
                    ? `Expired on ${formatDate(ak.expiresAt)}`
                    : `Expires on ${formatDate(ak.expiresAt)}`}
                </p>
              )}

              {ak.status === "ACTIVE" && ak.activatedAt && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Activated on {formatDate(ak.activatedAt)}
                </p>
              )}

              {ak.status === "PENDING" && (
                <p className="text-xs text-muted-foreground">
                  Share this key with the client. The subscription starts when
                  they enter it in the installed application.
                </p>
              )}

              {ak.status === "REVOKED" && (
                <p className="text-xs text-destructive">
                  This key is revoked. Generate a new key to reactivate the
                  client&apos;s application.
                </p>
              )}

              {ak.status === "EXPIRED" && (
                <p className="text-xs text-destructive">
                  This key has expired. Renew the subscription and generate a
                  new key to reactivate.
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
              <KeyRound className="h-8 w-8 text-muted-foreground/40" />
              <div>
                <p className="text-sm font-medium">No activation key yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  CEO or Super Admin can generate a key to activate the
                  client&apos;s application.
                </p>
              </div>
              <RoleGuard permission="generateKey">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setGenerateKeyOpen(true)}
                >
                  <KeyRound className="h-4 w-4" />
                  Generate Activation Key
                </Button>
              </RoleGuard>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payments */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Banknote className="h-4 w-4" />
              Payments
            </CardTitle>
            <div className="flex gap-2">
              <RoleGuard permission="recordPayments">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRecordPaymentOpen(true)}
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  Record Payment
                </Button>
              </RoleGuard>
              {client.subscription && (
                <RoleGuard permission="recordPayments">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRenewPaymentOpen(true)}
                  >
                    <ArrowUpCircle className="h-3.5 w-3.5" />
                    Record Renewal
                  </Button>
                </RoleGuard>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!payments || payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
              <Banknote className="h-7 w-7 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No payments recorded yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="border border-border rounded-lg p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">
                          {formatCurrency(payment.amount, payment.currency)}
                        </span>
                        <Badge
                          variant={
                            PAYMENT_STATUS_VARIANT[payment.status] ?? "secondary"
                          }
                          className="text-xs"
                        >
                          {PAYMENT_STATUS_LABELS[payment.status]}
                        </Badge>
                        {payment.isRenewal && (
                          <Badge variant="secondary" className="text-xs">
                            Renewal
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {PAYMENT_METHOD_LABELS[payment.method]} ·{" "}
                        {PAYMENT_RECEIVER_LABELS[payment.receivedBy]} ·{" "}
                        {formatDate(payment.paymentDate)}
                      </p>
                      {payment.note && (
                        <p className="text-xs text-muted-foreground mt-0.5 italic">
                          {payment.note}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Recorded by {payment.recordedBy.name}
                      </p>
                      {payment.status === "REJECTED" && payment.rejectionNote && (
                        <p className="text-xs text-destructive mt-1">
                          Rejected: {payment.rejectionNote}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                      {/* Employee: deposit button */}
                      {payment.status === "PENDING_DEPOSIT" &&
                        payment.recordedById === session?.user?.id && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => handleDepositPayment(payment.id)}
                            disabled={depositingId === payment.id}
                          >
                            {depositingId === payment.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <ArrowUpCircle className="h-3 w-3" />
                            )}
                            Mark Deposited
                          </Button>
                        )}

                      {/* CEO: approve/reject */}
                      {isCEO && payment.status === "PENDING_APPROVAL" && (
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => handleApprovePayment(payment.id)}
                            disabled={approvingId === payment.id}
                          >
                            {approvingId === payment.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <CheckCircle className="h-3 w-3" />
                            )}
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs text-destructive hover:text-destructive"
                            onClick={() =>
                              setRejectionNote((prev) => ({
                                ...prev,
                                [payment.id]: prev[payment.id] ?? "",
                              }))
                            }
                          >
                            <XCircle className="h-3 w-3" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* CEO reject inline input */}
                  {isCEO &&
                    payment.status === "PENDING_APPROVAL" &&
                    rejectionNote[payment.id] !== undefined && (
                      <div className="flex gap-2 items-center mt-1">
                        <input
                          className="flex-1 text-xs border border-border rounded px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                          placeholder="Rejection reason..."
                          value={rejectionNote[payment.id]}
                          onChange={(e) =>
                            setRejectionNote((prev) => ({
                              ...prev,
                              [payment.id]: e.target.value,
                            }))
                          }
                        />
                        <Button
                          size="sm"
                          className="h-6 text-xs"
                          variant="destructive"
                          onClick={() => handleRejectPayment(payment.id)}
                          disabled={rejectingId === payment.id}
                        >
                          {rejectingId === payment.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            "Confirm"
                          )}
                        </Button>
                        <Button
                          size="sm"
                          className="h-6 text-xs"
                          variant="ghost"
                          onClick={() =>
                            setRejectionNote((prev) => {
                              const next = { ...prev };
                              delete next[payment.id];
                              return next;
                            })
                          }
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Application Requirements */}
      {Array.isArray(client.appRequirements) &&
        client.appRequirements.length > 0 && (
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
                        <Badge variant="secondary" className="text-xs">
                          Primary
                        </Badge>
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
