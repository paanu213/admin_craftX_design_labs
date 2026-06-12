"use client";

import { useState, useEffect } from "react";
import { format, addDays } from "date-fns";
import { toast } from "sonner";
import {
  Clock,
  CreditCard,
  Loader2,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  KeyRound,
  AlertCircle,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn, formatCurrency, formatDate, PAYMENT_METHOD_LABELS } from "@/lib/utils";
import type { ClientWithRelations, Payment } from "@/types";

interface GenerateKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: ClientWithRelations;
  onSuccess: () => void;
  payments?: Payment[];
}

type KeyType = "TRIAL" | "SUBSCRIPTION";
type PaymentMethod = "CASH" | "UPI" | "CARD" | "BANK_TRANSFER";
type ReceivedBy = "EMPLOYEE" | "COMPANY";

const METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Cash",
  UPI: "UPI",
  CARD: "Card",
  BANK_TRANSFER: "Bank Transfer",
};

export function GenerateKeyDialog({
  open,
  onOpenChange,
  client,
  onSuccess,
  payments,
}: GenerateKeyDialogProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [keyType, setKeyType] = useState<KeyType>("SUBSCRIPTION");
  const [loading, setLoading] = useState(false);

  // Manual payment fields (used only when no approved payment exists)
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [receivedBy, setReceivedBy] = useState<ReceivedBy>("COMPANY");
  const [paymentDate, setPaymentDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [note, setNote] = useState("");

  const sub = client.subscription;
  const trialExpiry = format(addDays(new Date(), 15), "MMM d, yyyy");

  // Find most recent approved payment for this client
  const approvedPayment = payments?.find(p => p.status === "APPROVED") ?? null;

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) return;
    setStep(1);
    setNote("");
    setPaymentDate(format(new Date(), "yyyy-MM-dd"));
    if (sub) {
      setAmount(String(Number(sub.price)));
      setCurrency(sub.currency ?? "INR");
    }
  }, [open, sub]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function reset() {
    setStep(1);
    setKeyType("SUBSCRIPTION");
    setLoading(false);
  }

  function handleClose(v: boolean) {
    if (!v) reset();
    onOpenChange(v);
  }

  async function handleSubmit() {
    setLoading(true);

    const body: Record<string, unknown> = { clientId: client.id, keyType };

    if (keyType === "SUBSCRIPTION" && !approvedPayment) {
      // Manual payment entry — validate and include in request
      if (!amount || Number(amount) <= 0) {
        toast.error("Enter a valid payment amount");
        setLoading(false);
        return;
      }
      body.payment = {
        amount: Number(amount),
        currency,
        method,
        receivedBy,
        paymentDate,
        note: note || undefined,
      };
    }
    // If approvedPayment exists, skip sending payment — it's already recorded

    const res = await fetch("/api/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setLoading(false);

    if (res.ok) {
      toast.success(
        keyType === "TRIAL"
          ? "Trial key generated — expires in 15 days"
          : "Activation key generated"
      );
      handleClose(false);
      onSuccess();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Failed to generate key");
    }
  }

  const hasExistingKey =
    client.activationKey && client.activationKey.status !== "REVOKED";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Generate Activation Key
          </DialogTitle>
          {hasExistingKey && (
            <div className="flex items-start gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-2 mt-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                This client already has an active key. Generating a new one will
                invalidate the old key.
              </span>
            </div>
          )}
        </DialogHeader>

        {step === 1 && (
          <>
            <DialogDescription>
              Choose how you want to activate this client.
            </DialogDescription>
            <div className="grid grid-cols-2 gap-3 py-2">
              {/* Trial card */}
              <button
                type="button"
                onClick={() => setKeyType("TRIAL")}
                className={cn(
                  "flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-all",
                  keyType === "TRIAL"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/40"
                )}
              >
                <Clock
                  className={cn(
                    "h-6 w-6",
                    keyType === "TRIAL" ? "text-primary" : "text-muted-foreground"
                  )}
                />
                <div>
                  <p className="font-semibold text-sm">Trial Period</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    15-day free trial
                  </p>
                  <p className="text-xs text-muted-foreground">
                    No payment needed
                  </p>
                </div>
              </button>

              {/* Subscription card */}
              <button
                type="button"
                onClick={() => setKeyType("SUBSCRIPTION")}
                className={cn(
                  "flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-all",
                  keyType === "SUBSCRIPTION"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/40"
                )}
              >
                <CreditCard
                  className={cn(
                    "h-6 w-6",
                    keyType === "SUBSCRIPTION"
                      ? "text-primary"
                      : "text-muted-foreground"
                  )}
                />
                <div>
                  <p className="font-semibold text-sm">Subscription</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Paid plan
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {approvedPayment ? "Payment verified ✓" : "Record payment details"}
                  </p>
                </div>
              </button>
            </div>

            {keyType === "SUBSCRIPTION" && !approvedPayment && (
              <div className="flex items-start gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  No approved payment found. You can enter payment details manually on the next step, or send a Razorpay payment link first.
                </span>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button onClick={() => setStep(2)}>
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 2 && keyType === "TRIAL" && (
          <>
            <DialogDescription>Confirm the trial period details.</DialogDescription>
            <div className="space-y-3 py-2">
              <div className="rounded-xl bg-muted/50 p-4 space-y-2.5">
                <div className="flex items-center gap-2.5 text-sm">
                  <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>
                    <span className="font-medium">15-day</span> free trial period
                  </span>
                </div>
                <div className="flex items-center gap-2.5 text-sm">
                  <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>
                    Key expires on{" "}
                    <span className="font-medium">{trialExpiry}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2.5 text-sm">
                  <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>
                    Client status will be set to{" "}
                    <Badge variant="secondary" className="text-xs">
                      Trial
                    </Badge>
                  </span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>No payment required</span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <KeyRound className="h-4 w-4" />
                )}
                Generate Trial Key
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 2 && keyType === "SUBSCRIPTION" && approvedPayment && (
          <>
            <DialogDescription>
              Payment verified — ready to generate key.
            </DialogDescription>
            <div className="space-y-3 py-2">
              {sub && (
                <div className="rounded-xl bg-muted/50 px-4 py-3 text-sm space-y-1">
                  <p className="font-medium">{sub.planName}</p>
                  {sub.renewalDate && (
                    <p className="text-xs text-muted-foreground">
                      Next renewal: {format(new Date(sub.renewalDate), "MMM d, yyyy")}
                    </p>
                  )}
                </div>
              )}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900 px-4 py-3 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  <CheckCircle className="h-4 w-4" />
                  Payment already recorded
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div className="flex justify-between">
                    <span>Amount</span>
                    <span className="font-medium text-foreground">
                      {formatCurrency(Number(approvedPayment.amount), approvedPayment.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Method</span>
                    <span className="font-medium text-foreground">
                      {PAYMENT_METHOD_LABELS[approvedPayment.method] ?? approvedPayment.method}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date</span>
                    <span className="font-medium text-foreground">
                      {formatDate(approvedPayment.paymentDate)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <KeyRound className="h-4 w-4" />
                )}
                Generate Key
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 2 && keyType === "SUBSCRIPTION" && !approvedPayment && (
          <>
            <DialogDescription>
              Enter the payment details for this subscription.
            </DialogDescription>
            <div className="space-y-4 py-1">
              {sub && (
                <>
                  <div className="rounded-xl bg-muted/50 px-4 py-3 text-sm space-y-1">
                    <p className="font-medium">{sub.planName}</p>
                    {sub.renewalDate && (
                      <p className="text-xs text-muted-foreground">
                        Next renewal:{" "}
                        {format(new Date(sub.renewalDate), "MMM d, yyyy")}
                      </p>
                    )}
                  </div>
                  <Separator />
                </>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="pay-amount">Amount *</Label>
                  <Input
                    id="pay-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Currency</Label>
                  <Select value={currency} onValueChange={setCurrency}>
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
                  <Label>Payment Method *</Label>
                  <Select
                    value={method}
                    onValueChange={(v) => setMethod(v as PaymentMethod)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(METHOD_LABELS) as PaymentMethod[]).map((m) => (
                        <SelectItem key={m} value={m}>
                          {METHOD_LABELS[m]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Payment Date *</Label>
                  <Input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Received By *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(["EMPLOYEE", "COMPANY"] as ReceivedBy[]).map((rb) => (
                    <button
                      key={rb}
                      type="button"
                      onClick={() => setReceivedBy(rb)}
                      className={cn(
                        "rounded-lg border-2 px-3 py-2.5 text-sm text-left transition-all",
                        receivedBy === rb
                          ? "border-primary bg-primary/5 font-medium"
                          : "border-border hover:border-muted-foreground/40"
                      )}
                    >
                      {rb === "EMPLOYEE" ? (
                        <>
                          <p className="font-medium">I Received It</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Employee received cash/UPI
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="font-medium">Paid to Company</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Client paid company account
                          </p>
                        </>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pay-note">Notes</Label>
                <Input
                  id="pay-note"
                  placeholder="Transaction ID, UPI ref, or any other note..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <KeyRound className="h-4 w-4" />
                )}
                Generate Key &amp; Record Payment
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
