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
import { ArrowLeft, Mail, Phone, Globe, MapPin, Calendar, CreditCard, Users } from "lucide-react";

interface AgencyUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

interface AgencySubscription {
  id: string;
  plan: string;
  billingCycle: string;
  status: string;
  amount: number;
  gstAmount?: number;
  startDate: string;
  endDate?: string;
  couponRedemptions?: Array<{ discountAmount: number; coupon: { code: string } }>;
}

interface AgencyDetail {
  id: string;
  name: string;
  email: string;
  slug?: string;
  phone?: string;
  address?: string;
  website?: string;
  country?: string;
  currency?: string;
  timezone?: string;
  subscriptionPlan?: string;
  subscriptionStatus?: string;
  subscriptionExpiresAt?: string;
  users?: AgencyUser[];
  subscriptions?: AgencySubscription[];
  customerCount?: number;
  itineraryCount?: number;
  tripCount?: number;
  leadCount?: number;
}

const STATUS_COLORS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  ACTIVE: "default",
  TRIAL: "secondary",
  INACTIVE: "outline",
  EXPIRED: "destructive",
  CANCELLED: "destructive",
};

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
            <Skeleton className="h-48" />
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
                      {agency.slug && <p className="text-sm text-muted-foreground mt-1">/{agency.slug}</p>}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {agency.subscriptionPlan && (
                        <Badge variant="outline">{agency.subscriptionPlan}</Badge>
                      )}
                      {agency.subscriptionStatus && (
                        <Badge variant={STATUS_COLORS[agency.subscriptionStatus] ?? "secondary"}>
                          {agency.subscriptionStatus}
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
                        <a href={agency.website} target="_blank" rel="noopener noreferrer" className="hover:text-foreground truncate">{agency.website}</a>
                      </div>
                    )}
                    {agency.country && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4 shrink-0" />
                        <span>{agency.country}{agency.currency ? ` · ${agency.currency}` : ""}</span>
                      </div>
                    )}
                    {agency.subscriptionExpiresAt && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4 shrink-0" />
                        <span>Expires {new Date(agency.subscriptionExpiresAt).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                  {agency.address && (
                    <>
                      <Separator />
                      <p className="text-sm text-muted-foreground">{agency.address}</p>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Team members */}
              {agency.users && agency.users.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Team Members ({agency.users.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2">
                    {agency.users.map((user) => (
                      <div key={user.id} className="flex items-center justify-between gap-2 py-2 border-b last:border-0">
                        <div>
                          <p className="text-sm font-medium">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">{user.role}</Badge>
                          {!user.isActive && <Badge variant="secondary" className="text-[10px]">Inactive</Badge>}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Subscription history */}
              {agency.subscriptions && agency.subscriptions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Subscription History
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    {agency.subscriptions.map((sub) => (
                      <div key={sub.id} className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm py-2 border-b last:border-0">
                        <div>
                          <p className="text-xs text-muted-foreground">Plan</p>
                          <p className="font-medium">{sub.plan} · {sub.billingCycle.toLowerCase()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Amount</p>
                          <p className="font-medium">₹{(sub.amount / 100).toLocaleString("en-IN")}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Status</p>
                          <Badge variant={STATUS_COLORS[sub.status] ?? "secondary"} className="text-[10px]">{sub.status}</Badge>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Start</p>
                          <p>{new Date(sub.startDate).toLocaleDateString()}</p>
                        </div>
                        {sub.endDate && (
                          <div>
                            <p className="text-xs text-muted-foreground">End</p>
                            <p>{new Date(sub.endDate).toLocaleDateString()}</p>
                          </div>
                        )}
                        {sub.couponRedemptions && sub.couponRedemptions.length > 0 && (
                          <div>
                            <p className="text-xs text-muted-foreground">Coupon</p>
                            <p className="font-mono text-xs">{sub.couponRedemptions[0].coupon.code}
                              <span className="text-muted-foreground ml-1">
                                (−₹{(sub.couponRedemptions[0].discountAmount / 100).toLocaleString("en-IN")})
                              </span>
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Stats sidebar */}
            <div className="flex flex-col gap-4">
              <Card>
                <CardHeader><CardTitle className="text-sm">Entity Counts</CardTitle></CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {[
                    { label: "Customers", val: agency.customerCount },
                    { label: "Trips", val: agency.tripCount },
                    { label: "Itineraries", val: agency.itineraryCount },
                    { label: "Leads", val: agency.leadCount },
                  ].filter(r => r.val !== undefined).map(({ label, val }) => (
                    <div key={label}>
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="text-2xl font-bold">{val}</p>
                      <Separator className="mt-2" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : null}
      </PageWrapper>
    </>
  );
}
