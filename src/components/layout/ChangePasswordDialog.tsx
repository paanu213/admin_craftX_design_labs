"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Lock, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="flex items-center gap-1 text-xs text-destructive mt-1">
      <AlertCircle className="h-3 w-3 shrink-0" />
      {message}
    </p>
  );
}

export function ChangePasswordDialog() {
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [currentError, setCurrentError] = useState("");
  const [newError, setNewError] = useState("");
  const [confirmError, setConfirmError] = useState("");

  function clearFields() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setCurrentError("");
    setNewError("");
    setConfirmError("");
  }

  function validateNewPassword(val: string): string {
    if (!val) return "New password is required";
    if (val.length < 8) return `Password is too short — ${8 - val.length} more character${8 - val.length === 1 ? "" : "s"} needed`;
    return "";
  }

  function validateConfirm(val: string, newVal: string): string {
    if (!val) return "Please confirm your new password";
    if (val !== newVal) return "Passwords do not match";
    return "";
  }

  async function handleSubmit() {
    const cErr = currentPassword ? "" : "Current password is required";
    const nErr = validateNewPassword(newPassword);
    const cfErr = validateConfirm(confirmPassword, newPassword);

    setCurrentError(cErr);
    setNewError(nErr);
    setConfirmError(cfErr);

    if (cErr || nErr || cfErr) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/profile/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });

      if (res.ok) {
        toast.success("Password changed successfully");
        setOpen(false);
        clearFields();
      } else {
        const err = await res.json().catch(() => ({}));
        if (err.error?.toLowerCase().includes("current")) {
          setCurrentError(err.error);
        } else {
          toast.error(err.error ?? "Failed to change password");
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const passwordsMatch = confirmPassword.length > 0 && confirmPassword === newPassword;

  return (
    <>
      <DropdownMenuItem
        className="gap-2 cursor-pointer"
        onSelect={(e) => {
          e.preventDefault();
          setOpen(true);
        }}
      >
        <Lock className="h-4 w-4" />
        Change Password
      </DropdownMenuItem>

      <Dialog
        open={open}
        onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) clearFields();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter your current password and choose a new one.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                placeholder="Current password"
                value={currentPassword}
                aria-invalid={!!currentError}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  if (currentError) setCurrentError("");
                }}
                onBlur={() => {
                  if (!currentPassword) setCurrentError("Current password is required");
                }}
              />
              <FieldError message={currentError} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cp-new-password">New Password</Label>
              <Input
                id="cp-new-password"
                type="password"
                placeholder="Min. 8 characters"
                value={newPassword}
                aria-invalid={!!newError}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setNewError(validateNewPassword(e.target.value));
                  // Re-validate confirm if it's already been touched
                  if (confirmPassword) {
                    setConfirmError(validateConfirm(confirmPassword, e.target.value));
                  }
                }}
                onBlur={() => setNewError(validateNewPassword(newPassword))}
              />
              {newError ? (
                <FieldError message={newError} />
              ) : newPassword.length >= 8 ? (
                <p className="flex items-center gap-1 text-xs text-emerald-600 mt-1">
                  <CheckCircle2 className="h-3 w-3 shrink-0" />
                  Password length looks good
                </p>
              ) : newPassword.length > 0 ? (
                <p className="text-xs text-muted-foreground mt-1">
                  {8 - newPassword.length} more character{8 - newPassword.length === 1 ? "" : "s"} needed
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cp-confirm-password">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="cp-confirm-password"
                  type="password"
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  aria-invalid={!!confirmError}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setConfirmError(validateConfirm(e.target.value, newPassword));
                  }}
                  onBlur={() => setConfirmError(validateConfirm(confirmPassword, newPassword))}
                />
                {passwordsMatch && (
                  <CheckCircle2 className="absolute right-3 top-2.5 h-4 w-4 text-emerald-600 pointer-events-none" />
                )}
              </div>
              {confirmError ? (
                <FieldError message={confirmError} />
              ) : passwordsMatch ? (
                <p className="flex items-center gap-1 text-xs text-emerald-600 mt-1">
                  <CheckCircle2 className="h-3 w-3 shrink-0" />
                  Passwords match
                </p>
              ) : null}
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
                clearFields();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Changing..." : "Change Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
