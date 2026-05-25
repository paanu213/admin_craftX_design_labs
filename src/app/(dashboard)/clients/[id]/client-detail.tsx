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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
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

export function ClientDetail({ clientId }: { clientId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState(false);

  const { data: client, isLoading } = useQuery<ClientWithRelations>({
    queryKey: ["client", clientId],
    queryFn: () => fetch(`/api/clients/${clientId}`).then((r) => r.json()),
  });

  async function handleDelete() {
    if (!confirm(`Delete client "${client?.name}"? This cannot be undone.`))
      return;
    const res = await fetch(`/api/clients/${clientId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Client deleted");
      router.push("/clients");
    } else {
      toast.error("Failed to delete client");
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

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold">{client.name}</h2>
            <p className="text-sm text-muted-foreground">{client.company}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={STATUS_VARIANT_MAP[client.status]}>
            {CLIENT_STATUS_LABELS[client.status]}
          </Badge>
          <RoleGuard permission="editClients">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing(true)}
            >
              <Edit className="h-4 w-4" />
              Edit
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
              Delete
            </Button>
          </RoleGuard>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Contact Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <a
                href={`mailto:${client.email}`}
                className="text-primary hover:underline"
              >
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
            {(client.city || client.country) && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>
                  {[client.address, client.city, client.country]
                    .filter(Boolean)
                    .join(", ")}
                </span>
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
                  {client.subscription.features.length > 0 && (
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
                <p className="text-sm text-muted-foreground">
                  No subscription set up
                </p>
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
                <div key={contact.id} className="py-3 flex items-center justify-between">
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
