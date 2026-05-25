"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Plus, Search, Filter, Eye, Edit, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/PageWrapper";
import { RoleGuard } from "@/components/guards/RoleGuard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatCurrency,
  formatDate,
  CLIENT_STATUS_LABELS,
  BILLING_CYCLE_LABELS,
} from "@/lib/utils";
import type { ClientStatus, ClientWithRelations } from "@/types";

const STATUS_VARIANT_MAP: Record<
  ClientStatus,
  "success" | "info" | "warning" | "destructive"
> = {
  ACTIVE: "success",
  TRIAL: "info",
  INACTIVE: "warning",
  CHURNED: "destructive",
};

interface ClientsResponse {
  data: ClientWithRelations[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export function ClientsContent() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch } = useQuery<ClientsResponse>({
    queryKey: ["clients", page, search, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
        ...(search && { search }),
        ...(statusFilter !== "ALL" && { status: statusFilter }),
      });
      return fetch(`/api/clients?${params}`).then((r) => r.json());
    },
  });

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete client "${name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/clients/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Client deleted");
      refetch();
    } else {
      toast.error("Failed to delete client");
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Clients"
        description="Manage your client accounts and subscriptions"
        actions={
          <RoleGuard permission="createClients">
            <Button onClick={() => router.push("/clients/new")}>
              <Plus className="h-4 w-4" />
              Add Client
            </Button>
          </RoleGuard>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40">
            <Filter className="h-4 w-4 mr-1 text-muted-foreground" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="TRIAL">Trial</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
            <SelectItem value="CHURNED">Churned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : !data?.data?.length ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <p className="text-muted-foreground text-sm">No clients found</p>
              <RoleGuard permission="createClients">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/clients/new")}
                >
                  <Plus className="h-4 w-4" />
                  Add your first client
                </Button>
              </RoleGuard>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Client
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">
                      Company
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">
                      Subscription
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">
                      Joined
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((client) => (
                    <tr
                      key={client.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-foreground">{client.name}</p>
                          <p className="text-xs text-muted-foreground">{client.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                        {client.company}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_VARIANT_MAP[client.status]}>
                          {CLIENT_STATUS_LABELS[client.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {client.subscription ? (
                          <div>
                            <p className="font-medium">{client.subscription.planName}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatCurrency(
                                Number(client.subscription.price),
                                client.subscription.currency
                              )}{" "}
                              /{" "}
                              {BILLING_CYCLE_LABELS[
                                client.subscription.billingCycle
                              ]?.toLowerCase()}
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            No plan
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">
                        {formatDate(client.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => router.push(`/clients/${client.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <RoleGuard permission="editClients">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() =>
                                router.push(`/clients/${client.id}?edit=true`)
                              }
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </RoleGuard>
                          <RoleGuard permission="deleteClients">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() =>
                                handleDelete(client.id, client.name)
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </RoleGuard>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {data?.meta && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">
            Showing {(page - 1) * 10 + 1}–
            {Math.min(page * 10, data.meta.total)} of {data.meta.total} clients
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page === data.meta.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
