"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ArrowLeft, MapPin } from "lucide-react";
import { clientSchema, type ClientFormData } from "@/lib/validations/client.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageWrapper";
import type { ClientWithRelations } from "@/types";

const BUSINESS_TYPES = [
  "Ecommerce",
  "Billing App",
  "Inventory Management",
  "Store Management",
  "Restaurant Management",
  "Hospital Management",
  "School Management",
  "Real Estate",
  "Logistics & Supply Chain",
  "CRM",
  "HR & Payroll",
  "Finance & Accounting",
  "Manufacturing",
  "Travel & Hospitality",
  "Other",
];

const APP_REQUIREMENT_OPTIONS = [
  { value: "WEB", label: "Web Application" },
  { value: "MOBILE", label: "Mobile App" },
  { value: "DESKTOP", label: "Desktop App" },
];

interface PincodeResult {
  state: string;
  cities: string[];
  localities: string[];
}

interface ClientFormProps {
  client?: ClientWithRelations;
  onSuccess?: () => void;
}

export function ClientForm({ client, onSuccess }: ClientFormProps) {
  const router = useRouter();
  const isEditing = !!client;

  const [pincodeResult, setPincodeResult] = useState<PincodeResult | null>(
    client?.state
      ? {
          state: client.state,
          cities: client.city ? [client.city] : [],
          localities: client.locality ? [client.locality] : [],
        }
      : null
  );
  const [pincodeLoading, setPincodeLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: client
      ? {
          name: client.name,
          email: client.email,
          phone: client.phone ?? "",
          company: client.company,
          industry: client.industry ?? "",
          website: client.website ?? "",
          businessType: client.businessType ?? "",
          gstNumber: client.gstNumber ?? "",
          panNumber: client.panNumber ?? "",
          pincode: client.pincode ?? "",
          state: client.state ?? "",
          city: client.city ?? "",
          locality: client.locality ?? "",
          addressLine1: client.addressLine1 ?? "",
          addressLine2: client.addressLine2 ?? "",
          appRequirements: client.appRequirements ?? [],
          status: client.status,
          notes: client.notes ?? "",
        }
      : { status: "TRIAL", appRequirements: [] },
  });

  const watchedPincode = watch("pincode") ?? "";
  const watchedAppRequirements = watch("appRequirements") ?? [];

  useEffect(() => {
    if (watchedPincode.length !== 6 || !/^\d{6}$/.test(watchedPincode)) return;

    setPincodeLoading(true);
    fetch(`https://api.postalpincode.in/pincode/${watchedPincode}`)
      .then((r) => r.json())
      .then((data) => {
        if (data[0]?.Status === "Success" && data[0].PostOffice?.length > 0) {
          const offices = data[0].PostOffice as Array<{
            Name: string;
            District: string;
            State: string;
          }>;
          const state = offices[0].State;
          const cities = [...new Set(offices.map((o) => o.District))] as string[];
          const localities = offices.map((o) => o.Name);
          setPincodeResult({ state, cities, localities });
          setValue("state", state);
          if (cities.length === 1) setValue("city", cities[0]);
        } else {
          toast.error("Pincode not found. Please enter manually.");
          setPincodeResult(null);
        }
      })
      .catch(() => toast.error("Could not look up pincode. Please fill manually."))
      .finally(() => setPincodeLoading(false));
  }, [watchedPincode, setValue]);

  function toggleAppRequirement(value: string) {
    const current = watchedAppRequirements;
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    setValue("appRequirements", updated);
  }

  async function onSubmit(data: ClientFormData) {
    const url = isEditing ? `/api/clients/${client.id}` : "/api/clients";
    const method = isEditing ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Failed to save client");
      return;
    }

    toast.success(isEditing ? "Client updated" : "Client created");
    if (onSuccess) {
      onSuccess();
    } else {
      const created = await res.json();
      router.push(`/clients/${created.id}`);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader
        title={isEditing ? "Edit Client" : "Add New Client"}
        description={
          isEditing
            ? "Update client information"
            : "Register a new client in the system"
        }
        actions={
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Basic Information</CardTitle>
            <CardDescription>Client personal and contact details</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input id="name" placeholder="Rahul Sharma" {...register("name")} />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="rahul@company.com"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+91 98765 43210"
                {...register("phone")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                defaultValue={client?.status ?? "TRIAL"}
                onValueChange={(v) =>
                  setValue("status", v as ClientFormData["status"])
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="TRIAL">Trial</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                  <SelectItem value="CHURNED">Churned</SelectItem>
                </SelectContent>
              </Select>
              {errors.status && (
                <p className="text-xs text-destructive">{errors.status.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Business Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Business Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="company">Company Name *</Label>
              <Input
                id="company"
                placeholder="Acme Pvt. Ltd."
                {...register("company")}
              />
              {errors.company && (
                <p className="text-xs text-destructive">{errors.company.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessType">Business Type</Label>
              <Select
                defaultValue={client?.businessType ?? ""}
                onValueChange={(v) => setValue("businessType", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select business type" />
                </SelectTrigger>
                <SelectContent>
                  {BUSINESS_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gstNumber">GST Number</Label>
              <Input
                id="gstNumber"
                placeholder="22AAAAA0000A1Z5"
                className="uppercase"
                {...register("gstNumber", {
                  setValueAs: (v: string) => v?.toUpperCase() ?? "",
                })}
              />
              {errors.gstNumber && (
                <p className="text-xs text-destructive">{errors.gstNumber.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="panNumber">PAN Number</Label>
              <Input
                id="panNumber"
                placeholder="ABCDE1234F"
                className="uppercase"
                {...register("panNumber", {
                  setValueAs: (v: string) => v?.toUpperCase() ?? "",
                })}
              />
              {errors.panNumber && (
                <p className="text-xs text-destructive">{errors.panNumber.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                placeholder="Technology"
                {...register("industry")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                placeholder="https://acme.com"
                {...register("website")}
              />
              {errors.website && (
                <p className="text-xs text-destructive">{errors.website.message}</p>
              )}
            </div>

            {/* Address inside Business Information */}
            <div className="sm:col-span-2 pt-2 border-t">
              <p className="text-sm font-medium mb-4 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Business Address
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="pincode">Pincode</Label>
                  <div className="relative">
                    <Input
                      id="pincode"
                      placeholder="400001"
                      maxLength={6}
                      {...register("pincode")}
                    />
                    {pincodeLoading && (
                      <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enter 6-digit pincode to auto-fill state &amp; area
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    placeholder="Auto-filled from pincode"
                    {...register("state")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">City / District</Label>
                  {pincodeResult && pincodeResult.cities.length > 1 ? (
                    <Select
                      defaultValue={client?.city ?? ""}
                      onValueChange={(v) => setValue("city", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select city" />
                      </SelectTrigger>
                      <SelectContent>
                        {pincodeResult.cities.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id="city"
                      placeholder="Mumbai"
                      {...register("city")}
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="locality">Locality / Area</Label>
                  {pincodeResult && pincodeResult.localities.length > 0 ? (
                    <Select
                      defaultValue={client?.locality ?? ""}
                      onValueChange={(v) => setValue("locality", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select locality" />
                      </SelectTrigger>
                      <SelectContent>
                        {pincodeResult.localities.map((l) => (
                          <SelectItem key={l} value={l}>
                            {l}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      id="locality"
                      placeholder="Andheri East"
                      {...register("locality")}
                    />
                  )}
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="addressLine1">Address Line 1</Label>
                  <Input
                    id="addressLine1"
                    placeholder="Shop No. 5, Building Name"
                    {...register("addressLine1")}
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="addressLine2">Address Line 2</Label>
                  <Input
                    id="addressLine2"
                    placeholder="Street / Road / Landmark"
                    {...register("addressLine2")}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Application Requirements */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Application Requirements</CardTitle>
            <CardDescription>
              Select the type(s) of application the client needs (choose one or more)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-8">
              {APP_REQUIREMENT_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-center gap-2">
                  <Checkbox
                    id={`app-${option.value}`}
                    checked={watchedAppRequirements.includes(option.value)}
                    onCheckedChange={() => toggleAppRequirement(option.value)}
                  />
                  <Label
                    htmlFor={`app-${option.value}`}
                    className="cursor-pointer font-normal text-sm"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
            {watchedAppRequirements.length === 0 && (
              <p className="text-xs text-muted-foreground mt-3">
                No application type selected — you can update this later.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Additional notes about this client..."
              rows={4}
              {...register("notes")}
            />
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : isEditing ? (
              "Save Changes"
            ) : (
              "Create Client"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
