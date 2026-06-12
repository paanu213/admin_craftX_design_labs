"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Check, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/utils";

interface GenerateDevPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId?: string;
  clientName?: string;
  onSuccess: () => void;
}

interface ClientOption {
  id: string;
  name: string;
  company: string;
  clientCode?: string | null;
}

interface GenerateResponse {
  id: string;
  plaintext: string;
  expiresAt: string;
  expiryHours: number;
  client: { id: string; name: string; company: string; clientCode?: string | null };
}

export function GenerateDevPasswordDialog({
  open,
  onOpenChange,
  clientId: prefillClientId,
  clientName: prefillClientName,
  onSuccess,
}: GenerateDevPasswordDialogProps) {
  const [selectedClientId, setSelectedClientId] = useState(prefillClientId ?? "");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generated, setGenerated] = useState<GenerateResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: clientsData } = useQuery<{ data: ClientOption[] }>({
    queryKey: ["clients-list-minimal"],
    queryFn: () =>
      fetch("/api/clients?limit=200&status=ACTIVE").then((r) => r.json()),
    enabled: open && !prefillClientId,
  });

  const clients = clientsData?.data ?? [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const clientIdToUse = prefillClientId ?? selectedClientId;
    if (!clientIdToUse) {
      toast.error("Please select a client");
      return;
    }
    if (!reason.trim()) {
      toast.error("Reason is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/dev-passwords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: clientIdToUse, reason: reason.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to generate password");
        return;
      }

      setGenerated(data as GenerateResponse);
    } catch {
      toast.error("Failed to generate password");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCopy() {
    if (!generated) return;
    try {
      await navigator.clipboard.writeText(generated.plaintext);
      setCopied(true);
      toast.success("Password copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy password");
    }
  }

  function handleClose() {
    if (generated) {
      onSuccess();
    }
    onOpenChange(false);
    // Reset state
    setGenerated(null);
    setReason("");
    setCopied(false);
    if (!prefillClientId) setSelectedClientId("");
  }

  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const displayClientName =
    prefillClientName ??
    (selectedClient
      ? `${selectedClient.company}${selectedClient.clientCode ? ` (${selectedClient.clientCode})` : ""}`
      : generated?.client
      ? `${generated.client.company}${generated.client.clientCode ? ` (${generated.client.clientCode})` : ""}`
      : "");

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {!generated ? (
          <>
            <DialogHeader>
              <DialogTitle>Generate Dev Access Password</DialogTitle>
              <DialogDescription>
                Generate a temporary password for dev access to a client application.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!prefillClientId && (
                <div className="space-y-2">
                  <Label htmlFor="client-select">Client</Label>
                  <Select
                    value={selectedClientId}
                    onValueChange={setSelectedClientId}
                  >
                    <SelectTrigger id="client-select">
                      <SelectValue placeholder="Select a client..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.company}{client.clientCode ? ` (${client.clientCode})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {prefillClientId && prefillClientName && (
                <div className="space-y-2">
                  <Label>Client</Label>
                  <p className="text-sm text-muted-foreground rounded-md border bg-muted/50 px-3 py-2">
                    {prefillClientName}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="reason">Reason <span className="text-destructive">*</span></Label>
                <Textarea
                  id="reason"
                  placeholder="e.g. SQL debugging for order sync issue (ticket #1234)"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  required
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Generating..." : "Generate Password"}
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
                <DialogTitle>Dev Access Password Generated</DialogTitle>
              </div>
              {displayClientName && (
                <DialogDescription>
                  For client: <strong>{displayClientName}</strong>
                </DialogDescription>
              )}
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Password</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-md border bg-muted px-4 py-3 font-mono text-lg font-semibold tracking-widest text-center">
                    {generated.plaintext}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleCopy}
                    title="Copy password"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                Expires in {generated.expiryHours} hour{generated.expiryHours !== 1 ? "s" : ""} on{" "}
                <strong>{formatDate(generated.expiresAt, "MMM d, yyyy 'at' h:mm a")}</strong>
              </p>
            </div>

            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
