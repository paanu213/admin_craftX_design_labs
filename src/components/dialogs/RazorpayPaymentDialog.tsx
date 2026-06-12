"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, Link2 } from "lucide-react";
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
import type { ClientWithRelations } from "@/types";

interface RazorpayPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: ClientWithRelations;
  onSuccess: () => void;
}

export function RazorpayPaymentDialog({
  open,
  onOpenChange,
  client,
  onSuccess,
}: RazorpayPaymentDialogProps) {
  const sub = client.subscription;

  // amount is derived from subscription — not user-editable
  const amount = sub ? Number(sub.price) : 0;

  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Sync description when the dialog opens (in case subscription data loaded
  // after the component first mounted, which causes blank state on first open)
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open) {
      setDescription(sub ? `${sub.planName ?? "Subscription"} payment` : "");
    }
  }, [open, sub]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function handleClose() {
    onOpenChange(false);
  }

  async function handleCreate() {
    // Amount is read-only from subscription; guard against negative edge cases
    if (amount < 0) {
      toast.error("Amount cannot be negative");
      return;
    }
    setIsCreating(true);
    try {
      const res = await fetch("/api/razorpay/payment-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: client.id,
          subscriptionId: sub?.id ?? null,
          amount,
          currency: sub?.currency ?? "INR",
          description: description.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to create payment link");
        return;
      }
      toast.success("Payment link created");
      onSuccess();
      handleClose();
    } catch {
      toast.error("Failed to create payment link");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Create Payment Link
          </DialogTitle>
          <DialogDescription>
            Generate a Razorpay payment link for{" "}
            <strong>{client.company}</strong>
            {client.clientCode && (
              <span className="ml-1 font-mono text-xs">({client.clientCode})</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="rzp-amount">
              Amount{" "}
              <span className="text-xs text-muted-foreground font-normal">
                ({sub?.currency ?? "INR"}) — from subscription
              </span>
            </Label>
            <Input
              id="rzp-amount"
              type="number"
              value={amount}
              readOnly
              className="bg-muted/50 cursor-not-allowed"
              tabIndex={-1}
            />
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
              No phone number on file — WhatsApp sharing will not be available.
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
                Create Link
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
