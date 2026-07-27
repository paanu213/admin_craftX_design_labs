"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { travelanFetch, extractList, extractPagination } from "@/lib/travelan";
import { Header } from "@/components/layout/Header";
import { PageWrapper, PageHeader } from "@/components/layout/PageWrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, Phone, Clock, MessageSquare } from "lucide-react";

interface ContactMessage {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  message?: string;
  subject?: string;
  agencyName?: string;
  createdAt: string;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}
function threeMonthsAgo() {
  const d = new Date();
  d.setMonth(d.getMonth() - 3);
  return d.toISOString().slice(0, 10);
}

export default function TravelanContactsPage() {
  const [from, setFrom] = useState(threeMonthsAgo());
  const [to, setTo] = useState(today());
  const [applied, setApplied] = useState({ from: threeMonthsAgo(), to: today() });
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ["travelan", "contacts", page, applied],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      params.set("from", applied.from);
      params.set("to", applied.to);
      return travelanFetch(`contacts?${params}`);
    },
    retry: 1,
  });

  const contacts = extractList<ContactMessage>(data);
  const { total, totalPages } = extractPagination(data);

  return (
    <>
      <Header title="Contacts" />
      <PageWrapper>
        <PageHeader title="Contact Messages" description={`${total} contact form submissions`} />

        {/* Date range filter */}
        <div className="flex flex-wrap items-end gap-3 p-4 rounded-lg border bg-muted/30">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ct-from" className="text-xs">From</Label>
            <Input id="ct-from" type="date" className="w-36" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ct-to" className="text-xs">To</Label>
            <Input id="ct-to" type="date" className="w-36" value={to} min={from} max={today()} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Button size="sm" onClick={() => { setApplied({ from, to }); setPage(1); }}>Apply</Button>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {(error as Error).message}
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
          </div>
        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <MessageSquare className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">No contact messages in this period</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {contacts.map((contact) => (
              <Card key={contact.id}>
                <CardContent className="p-4 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-sm">{contact.name}</p>
                      {contact.agencyName && (
                        <p className="text-xs text-muted-foreground">{contact.agencyName}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                      <Clock className="h-3 w-3" />
                      {new Date(contact.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  {(contact.subject) && (
                    <p className="text-sm font-medium">{contact.subject}</p>
                  )}
                  {contact.message && (
                    <p className="text-sm text-muted-foreground line-clamp-3">{contact.message}</p>
                  )}
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {contact.email && (
                      <a href={`mailto:${contact.email}`} className="flex items-center gap-1 hover:text-foreground">
                        <Mail className="h-3 w-3" />
                        {contact.email}
                      </a>
                    )}
                    {contact.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {contact.phone}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </PageWrapper>
    </>
  );
}
