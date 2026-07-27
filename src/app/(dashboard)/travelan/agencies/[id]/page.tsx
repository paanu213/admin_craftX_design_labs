"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { travelanFetch } from "@/lib/travelan";
import { Header } from "@/components/layout/Header";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Mail, Phone, Globe, User, Calendar, CreditCard } from "lucide-react";

interface AgencyDetail {
  id: string;
  name: string;
  email: string;
  phone?: string;
  website?: string;
  plan?: string;
  status?: string;
  agencyCode?: string;
  createdAt?: string;
  contactName?: string;
  address?: string;
  city?: string;
  country?: string;
  subscription?: {
    planName: string;
    price: number;
    billingCycle: string;
    startDate: string;
    endDate?: string;
    status: string;
  };
  contacts?: Array<{ id: string; name: string; email?: string; phone?: string; role?: string }>;
  stats?: { openTickets: number; totalPayments: number };
}

export default function AgencyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const { data: agency, isLoading, error } = useQuery<AgencyDetail>({
    queryKey: ["travelan", "agencies", id],
    queryFn: () => travelanFetch(`agencies/${id}`),
    retry: 1,
  });

  return (
    <>
      <Header title={agency?.name ?? "Agency Details"} />
      <PageWrapper>
        <div className="flex items-center gap-3 mb-2">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {(error as Error).message}
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-40" />
            <Skeleton className="h-32" />
          </div>
        ) : agency ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 flex flex-col gap-6">
              {/* Basic info */}
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-xl">{agency.name}</CardTitle>
                      {agency.agencyCode && (
                        <p className="text-sm text-muted-foreground mt-1">{agency.agencyCode}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {agency.plan && (
                        <Badge variant="default">{agency.plan}</Badge>
                      )}
                      {agency.status && (
                        <Badge variant={agency.status === "ACTIVE" ? "default" : "secondary"}>
                          {agency.status}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    {agency.email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4 shrink-0" />
                        <a href={`mailto:${agency.email}`} className="hover:text-foreground truncate">{agency.email}</a>
                      </div>
                    )}
                    {agency.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4 shrink-0" />
                        <span>{agency.phone}</span>
                      </div>
                    )}
                    {agency.website && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Globe className="h-4 w-4 shrink-0" />
                        <a href={agency.website} target="_blank" rel="noopener noreferrer" className="hover:text-foreground truncate">
                          {agency.website}
                        </a>
                      </div>
                    )}
                    {agency.contactName && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <User className="h-4 w-4 shrink-0" />
                        <span>{agency.contactName}</span>
                      </div>
                    )}
                    {agency.createdAt && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4 shrink-0" />
                        <span>Joined {new Date(agency.createdAt).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                  {(agency.address || agency.city || agency.country) && (
                    <>
                      <Separator />
                      <p className="text-sm text-muted-foreground">
                        {[agency.address, agency.city, agency.country].filter(Boolean).join(", ")}
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Subscription */}
              {agency.subscription && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Subscription
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Plan</p>
                      <p className="font-medium">{agency.subscription.planName}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Status</p>
                      <Badge variant={agency.subscription.status === "ACTIVE" ? "default" : "secondary"} className="mt-0.5">
                        {agency.subscription.status}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Price</p>
                      <p className="font-medium">₹{(agency.subscription.price / 100).toLocaleString("en-IN")} / {agency.subscription.billingCycle.toLowerCase()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Start Date</p>
                      <p className="font-medium">{new Date(agency.subscription.startDate).toLocaleDateString()}</p>
                    </div>
                    {agency.subscription.endDate && (
                      <div>
                        <p className="text-muted-foreground text-xs">End Date</p>
                        <p className="font-medium">{new Date(agency.subscription.endDate).toLocaleDateString()}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Contacts */}
              {agency.contacts && agency.contacts.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Contacts</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    {agency.contacts.map((contact) => (
                      <div key={contact.id} className="flex items-start justify-between gap-2 py-2 border-b last:border-0">
                        <div>
                          <p className="text-sm font-medium">{contact.name}</p>
                          {contact.role && <p className="text-xs text-muted-foreground">{contact.role}</p>}
                          {contact.email && <p className="text-xs text-muted-foreground">{contact.email}</p>}
                          {contact.phone && <p className="text-xs text-muted-foreground">{contact.phone}</p>}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Stats sidebar */}
            {agency.stats && (
              <div className="flex flex-col gap-4">
                <Card>
                  <CardHeader><CardTitle className="text-sm">Stats</CardTitle></CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Open Tickets</p>
                      <p className="text-2xl font-bold">{agency.stats.openTickets}</p>
                    </div>
                    <Separator />
                    <div>
                      <p className="text-xs text-muted-foreground">Total Payments</p>
                      <p className="text-2xl font-bold">₹{(agency.stats.totalPayments / 100).toLocaleString("en-IN")}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        ) : null}
      </PageWrapper>
    </>
  );
}
