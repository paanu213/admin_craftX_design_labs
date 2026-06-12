"use client";

import { useState } from "react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import {
  ExternalLink,
  Copy,
  Check,
  Loader2,
  MessageCircle,
  AlertCircle,
  QrCode,
  Link2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ClientWithRelations } from "@/types";

interface RazorpayPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: ClientWithRelations;
  onSuccess: () => void;
}

interface CreatedLink {
  razorpayLinkId: string;
  url: string;
  shortUrl: string | null;
  amount: number;
  currency: string;
  clientPhone: string;
}

function formatWhatsAppPhone(phone: string): string {
  const cleaned = phone.replace(/[\s\-()]/g, "");
  if (cleaned.startsWith("+")) return cleaned.replace("+", "");
  if (cleaned.startsWith("91") && cleaned.length === 12) return cleaned;
  if (cleaned.length === 10) return `91${cleaned}`;
  return cleaned;
}

export function RazorpayPaymentDialog({
  open,
  onOpenChange,
  client,
  onSuccess,
}: RazorpayPaymentDialogProps) {
  const sub = client.subscription;
  const [amount, setAmount] = useState(
    sub ? String(Number(sub.price)) : ""
  );
  const [description, setDescription] = useState(
    sub ? `${sub.planName ?? "Subscription"} payment` : ""
  );
  const [isCreating, setIsCreating] = useState(false);
  const [created, setCreated] = useState<CreatedLink | null>(null);
  const [copied, setCopied] = useState(false);
  const [amountError, setAmountError] = useState("");

  function handleClose() {
    onOpenChange(false);
    if (created) onSuccess();
    setCreated(null);
    setAmount(sub ? String(Number(sub.price)) : "");
    setDescription(sub ? `${sub.planName ?? "Subscription"} payment` : "");
    setAmountError("");
  }

  async function handleCreate() {
    const n = Number(amount);
    if (!amount || isNaN(n) || n <= 0) {
      setAmountError("Enter a valid amount greater than 0");
      return;
    }
    setAmountError("");
    setIsCreating(true);
    try {
      const res = await fetch("/api/razorpay/payment-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: client.id,
          subscriptionId: sub?.id ?? null,
          amount: n,
          currency: sub?.currency ?? "INR",
          description: description.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to create payment link");
        return;
      }
      setCreated(data as CreatedLink);
    } catch {
      toast.error("Failed to create payment link");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleCopyLink() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.url);
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  }

  function handleOpenLink() {
    if (!created) return;
    window.open(created.url, "_blank", "noopener,noreferrer");
  }

  function handleWhatsApp() {
    if (!created || !client.phone) return;
    const waPhone = formatWhatsAppPhone(client.phone);
    const currencySymbol =
      (created.currency === "USD" && "$") ||
      (created.currency === "EUR" && "€") ||
      (created.currency === "GBP" && "£") ||
      "₹";
    const msg = encodeURIComponent(
      `Hi ${client.name},\n\nPlease use the following link to complete your payment of ${currencySymbol}${Number(created.amount).toLocaleString()} for ${client.company}:\n\n${created.url}\n\nThank you!`
    );
    window.open(`https://wa.me/${waPhone}?text=${msg}`, "_blank", "noopener,noreferrer");
  }

  const paymentUrl = created?.url ?? "";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        {!created ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5 text-primary" />
                Send Payment Link
              </DialogTitle>
              <DialogDescription>
                Create a Razorpay payment link for{" "}
                <strong>{client.company}</strong>
                {client.clientCode && (
                  <span className="ml-1 font-mono text-xs">({client.clientCode})</span>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="rzp-amount">
                  Amount *{" "}
                  <span className="text-xs text-muted-foreground font-normal">
                    ({sub?.currency ?? "INR"})
                  </span>
                </Label>
                <Input
                  id="rzp-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={amount}
                  aria-invalid={!!amountError}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    if (amountError) setAmountError("");
                  }}
                  onBlur={() => {
                    const n = Number(amount);
                    if (!amount || isNaN(n) || n <= 0)
                      setAmountError("Enter a valid amount greater than 0");
                  }}
                />
                {amountError && (
                  <p className="flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {amountError}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rzp-desc">Description</Label>
                <Input
                  id="rzp-desc"
                  placeholder="e.g. Monthly subscription payment"
                  maxLength={255}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {!client.phone && (
                <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-md px-3 py-2">
                  No phone number on file for this client — WhatsApp sharing will not be available.
                </p>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={isCreating}>
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Link2 className="h-4 w-4" />
                    Create Payment Link
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Payment Link Ready</DialogTitle>
              <DialogDescription>
                Share via WhatsApp or let the client scan the QR code.
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="link" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="link" className="gap-1.5">
                  <Link2 className="h-3.5 w-3.5" />
                  Link
                </TabsTrigger>
                <TabsTrigger value="qr" className="gap-1.5">
                  <QrCode className="h-3.5 w-3.5" />
                  QR Code
                </TabsTrigger>
              </TabsList>

              <TabsContent value="link" className="space-y-4 pt-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <code className="flex-1 truncate rounded-md border bg-muted px-3 py-2 text-sm font-mono">
                      {paymentUrl}
                    </code>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleCopyLink}
                      title="Copy link"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Amount:{" "}
                    <strong>
                      {created.currency === "USD"
                        ? "$"
                        : created.currency === "EUR"
                        ? "€"
                        : created.currency === "GBP"
                        ? "£"
                        : "₹"}
                      {Number(created.amount).toLocaleString()}
                    </strong>
                    {" · "}
                    Razorpay Link ID:{" "}
                    <span className="font-mono">{created.razorpayLinkId}</span>
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  {client.phone && (
                    <Button
                      onClick={handleWhatsApp}
                      className="gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Send via WhatsApp to {client.name}
                    </Button>
                  )}
                  <Button variant="outline" onClick={handleOpenLink} className="gap-2">
                    <ExternalLink className="h-4 w-4" />
                    Open Payment Page
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="qr" className="flex flex-col items-center gap-4 pt-4">
                <div className="rounded-xl border bg-white p-4 shadow-sm">
                  <QRCodeSVG
                    value={paymentUrl}
                    size={200}
                    level="M"
                    includeMargin={false}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center max-w-xs">
                  Client can scan this QR code with their phone camera or payment app to open the payment page directly.
                </p>
                <Button variant="outline" size="sm" onClick={handleCopyLink} className="gap-2">
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  Copy link
                </Button>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
