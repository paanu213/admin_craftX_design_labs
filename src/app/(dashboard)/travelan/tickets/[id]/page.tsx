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
import { ArrowLeft, Clock, MessageSquare, User } from "lucide-react";

interface Response {
  id: string;
  message: string;
  isFromAdmin: boolean;
  createdAt: string;
}

interface TicketDetail {
  id: string;
  subject: string;
  description?: string;
  status: string;
  priority?: string;
  agency?: { id: string; name: string; email: string };
  raisedBy?: { id: string; name: string; email: string };
  createdAt: string;
  updatedAt?: string;
  responses?: Response[];
}

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  OPEN: "destructive",
  IN_PROGRESS: "default",
  RESOLVED: "secondary",
  CLOSED: "outline",
};

export default function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const { data: ticket, isLoading, error } = useQuery<TicketDetail>({
    queryKey: ["travelan", "tickets", id],
    queryFn: () => travelanFetch(`tickets/${id}`),
    retry: 1,
  });

  return (
    <>
      <Header title={ticket?.subject ?? "Ticket Details"} />
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
            <Skeleton className="h-24" />
          </div>
        ) : ticket ? (
          <div className="flex flex-col gap-6 max-w-3xl">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-lg leading-snug">{ticket.subject}</CardTitle>
                  <div className="flex gap-1.5 shrink-0">
                    <Badge variant={STATUS_VARIANTS[ticket.status] ?? "outline"}>
                      {ticket.status.replace("_", " ")}
                    </Badge>
                    {ticket.priority && (
                      <Badge variant="secondary">{ticket.priority}</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {ticket.description && (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{ticket.description}</p>
                )}
                <Separator />
                <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                  {ticket.agency?.name && (
                    <div className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" />
                      <span>{ticket.agency.name}</span>
                    </div>
                  )}
                  {ticket.raisedBy?.name && (
                    <div className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" />
                      <span>Reported by {ticket.raisedBy.name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Created {new Date(ticket.createdAt).toLocaleString()}</span>
                  </div>
                  {ticket.updatedAt && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      <span>Updated {new Date(ticket.updatedAt).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Responses */}
            {ticket.responses && ticket.responses.length > 0 && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold">Responses ({ticket.responses.length})</h3>
                </div>
                {ticket.responses.map((resp) => (
                  <Card key={resp.id} className={resp.isFromAdmin ? "border-primary/20 bg-primary/5" : ""}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          {resp.isFromAdmin && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Admin</Badge>
                          )}
                          {!resp.isFromAdmin && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">Agency</Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(resp.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{resp.message}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </PageWrapper>
    </>
  );
}
