"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Loader2, PlusCircle, AlertCircle } from "lucide-react";
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
import { cn } from "@/lib/utils";
import type { ClientWithRelations } from "@/types";

interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: ClientWithRelations;
  onSuccess: () => void;
  isRenewal?: boolean;
}

type PaymentMethod = "CASH" | "UPI" | "CARD" | "BANK_TRANSFER";
type ReceivedBy = "EMPLOYEE" | "COMPANY";

const METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Cash",
  UPI: "UPI",
  CARD: "Card",
  BANK_TRANSFER: "Bank Transfer",
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="flex items-center gap-1 text-xs text-destructive mt-1">
      <AlertCircle className="h-3 w-3 shrink-0" />
      {message}
    </p>
  );
}

export function RecordPaymentDialog({
  open,
  onOpenChange,
  client,
  onSuccess,
  isRenewal = false,
}: RecordPaymentDialogProps) {
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [receivedBy, setReceivedBy] = useState<ReceivedBy>("COMPANY");
  const [paymentDate, setPaymentDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [note, setNote] = useState("");

  // Inline field errors
  const [amountError, setAmountError] = useState("");
  const [dateError, setDateError] = useState("");

  const sub = client.subscription;

  useEffect(() => {
    if (!open) return;
    setNote("");
    setPaymentDate(format(new Date(), "yyyy-MM-dd"));
    setAmountError("");
    setDateError("");
    if (sub) {
      setAmount(String(Number(sub.price)));
      setCurrency(sub.currency ?? "INR");
    } else {
      setAmount("");
    }
  }, [open, sub]);

  function validateAmount(val: string): string {
    if (!val || val.trim() === "") return "Amount is required";
    const n = Number(val);
    if (isNaN(n)) return "Enter a valid number";
    if (n <= 0) return "Amount must be greater than 0";
    return "";
  }

  function validateDate(val: string): string {
    if (!val) return "Payment date is required";
    return "";
  }

  function handleClose(v: boolean) {
    onOpenChange(v);
  }

  async function handleSubmit() {
    const aErr = validateAmount(amount);
    const dErr = validateDate(paymentDate);
    setAmountError(aErr);
    setDateError(dErr);
    if (aErr || dErr) return;

    setLoading(true);
    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: client.id,
        subscriptionId: sub?.id ?? null,
        amount: Number(amount),
        currency,
        method,
        receivedBy,
        paymentDate,
        note: note || undefined,
        isRenewal,
      }),
    });
    setLoading(false);

    if (res.ok) {
      toast.success("Payment recorded");
      handleClose(false);
      onSuccess();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Failed to record payment");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5" />
            {isRenewal ? "Record Renewal Payment" : "Record Payment"}
          </DialogTitle>
          <DialogDescription>
            For {client.company} — {client.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="rp-amount">Amount *</Label>
              <Input
                id="rp-amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                aria-invalid={!!amountError}
                onChange={(e) => {
                  setAmount(e.target.value);
                  if (amountError) setAmountError(validateAmount(e.target.value));
                }}
                onBlur={() => setAmountError(validateAmount(amount))}
                placeholder="0.00"
              />
              <FieldError message={amountError} />
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
                aria-invalid={!!dateError}
                onChange={(e) => {
                  setPaymentDate(e.target.value);
                  if (dateError) setDateError(validateDate(e.target.value));
                }}
                onBlur={() => setDateError(validateDate(paymentDate))}
              />
              <FieldError message={dateError} />
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
                        Cash / UPI to me
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-medium">Paid to Company</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Directly to account
                      </p>
                    </>
                  )}
                </button>
              ))}
            </div>
            {receivedBy === "EMPLOYEE" && (
              <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-2">
                You will need to deposit this to the company account and mark it
                as deposited before CEO approval.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rp-note">Notes</Label>
            <Input
              id="rp-note"
              placeholder="Transaction ID, UPI ref, or any other note..."
              maxLength={500}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            {note.length > 400 && (
              <p className="text-xs text-muted-foreground text-right">{note.length}/500</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <PlusCircle className="h-4 w-4" />
            )}
            Record Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
