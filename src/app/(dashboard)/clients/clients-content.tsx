"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Plus, Search, Filter, Eye, Edit, Trash2,
  MoreVertical, PowerOff, Users, CheckCircle,
  Clock, KeyRound, UserX, TrendingDown,
} from "lucide-react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  formatDate,
  CLIENT_STATUS_LABELS,
  CLIENT_STATUS_VARIANT,
} from "@/lib/utils";
import type { ClientWithRelations } from "@/types";

interface ClientsResponse {
  data: ClientWithRelations[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

interface StatsResponse {
  total: number;
  byStatus: Record<string, number>;
}

type Period = "all" | "this_month" | "last_month" | "yearly";

const PERIOD_TABS: { value: Period; label: string }[] = [
  { value: "all", label: "All Time" },
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "yearly", label: "This Year" },
];

const STAT_CARDS = [
  { status: "total",         label: "Total",         icon: Users,        iconClass: "text-blue-500"   },
  { status: "ACTIVE",        label: "Active",         icon: CheckCircle,  iconClass: "text-emerald-500"},
  { status: "TRIAL",         label: "Trial",          icon: Clock,        iconClass: "text-violet-500" },
  { status: "KEY_GENERATED", label: "Key Generated",  icon: KeyRound,     iconClass: "text-amber-500"  },
  { status: "REGISTERED",    label: "Registered",     icon: Users,        iconClass: "text-sky-500"    },
  { status: "INACTIVE",      label: "Inactive",       icon: UserX,        iconClass: "text-orange-500" },
  { status: "CHURNED",       label: "Churned",        icon: TrendingDown, iconClass: "text-rose-500"   },
];

export function ClientsContent() {
  const router = useRouter();
  const [period, setPeriod] = useState<Period>("all");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  const { data: stats, isLoading: statsLoading } = useQuery<StatsResponse>({
    queryKey: ["clients-stats", period],
    queryFn: () => fetch(`/api/clients/stats?period=${period}`).then((r) => r.json()),
  });

  const { data, isLoading, isError, error, refetch } = useQuery<ClientsResponse>({
    queryKey: ["clients", page, search, statusFilter, period],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: "12",
        ...(search && { search }),
        ...(statusFilter !== "ALL" && { status: statusFilter }),
        ...(period !== "all" && { period }),
      });
      const res = await fetch(`/api/clients?${params}`);
      if (!res.ok) throw new Error("Failed to load clients");
      return res.json();
    },
  });

  async function handleDelete(id: string, company: string) {
    if (!confirm(`Delete client "${company}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/clients/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Client deleted");
      refetch();
    } else {
      toast.error("Failed to delete client");
    }
  }

  async function handleDeactivate(id: string, company: string) {
    if (!confirm(`Deactivate "${company}"? Their access will be suspended.`)) return;
    const res = await fetch(`/api/clients/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "INACTIVE" }),
    });
    if (res.ok) {
      toast.success("Client deactivated");
      refetch();
    } else {
      toast.error("Failed to deactivate client");
    }
  }

  const statValue = (status: string) =>
    status === "total" ? (stats?.total ?? 0) : (stats?.byStatus[status] ?? 0);

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

      {/* Period tabs */}
      <div className="flex gap-1 border-b border-border">
        {PERIOD_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setPeriod(tab.value);
              setPage(1);
            }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              period === tab.value
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {STAT_CARDS.map(({ status, label, icon: Icon, iconClass }) => (
          <Card key={status} className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Icon className={`h-3.5 w-3.5 ${iconClass}`} />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
            {statsLoading ? (
              <Skeleton className="h-6 w-8" />
            ) : (
              <p className="text-xl font-bold text-foreground">{statValue(status)}</p>
            )}
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
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
          <SelectTrigger className="w-full sm:w-40">
            <Filter className="h-4 w-4 mr-1 text-muted-foreground" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="REGISTERED">Registered</SelectItem>
            <SelectItem value="KEY_GENERATED">Key Generated</SelectItem>
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
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <p className="text-destructive text-sm font-medium">Failed to load clients</p>
              <p className="text-muted-foreground text-xs max-w-sm text-center">{String(error)}</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
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
                      Company
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">
                      Client &amp; Mobile
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">
                      Location
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">
                      Registered
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((client) => {
                    const location = [client.city, client.state].filter(Boolean).join(", ");
                    return (
                      <tr
                        key={client.id}
                        className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                      >
                          {/* Company */}
                        <td className="px-4 py-3">
                          <p className="font-semibold text-foreground">{client.company}</p>
                        </td>

                        {/* Client name + mobile */}
                        <td className="px-4 py-3 hidden md:table-cell">
                          <p className="text-sm text-foreground">{client.name}</p>
                          {client.phone && (
                            <p className="text-xs text-muted-foreground">{client.phone}</p>
                          )}
                        </td>

                        {/* Location */}
                        <td className="px-4 py-3 hidden lg:table-cell text-sm text-muted-foreground">
                          {location || <span className="text-xs">—</span>}
                        </td>

                        {/* Registered date */}
                        <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                          {formatDate(client.createdAt)}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <Badge variant={CLIENT_STATUS_VARIANT[client.status] ?? "secondary"}>
                            {CLIENT_STATUS_LABELS[client.status]}
                          </Badge>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 gap-1.5 text-xs"
                              onClick={() => router.push(`/clients/${client.id}`)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </Button>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <RoleGuard permission="editClients">
                                  <DropdownMenuItem
                                    onClick={() =>
                                      router.push(`/clients/${client.id}?edit=true`)
                                    }
                                  >
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                </RoleGuard>

                                <RoleGuard permission="editClients">
                                  <DropdownMenuItem
                                    disabled={client.status === "INACTIVE"}
                                    onClick={() =>
                                      handleDeactivate(client.id, client.company)
                                    }
                                  >
                                    <PowerOff className="h-4 w-4 mr-2" />
                                    Deactivate
                                  </DropdownMenuItem>
                                </RoleGuard>

                                <RoleGuard permission="deleteClients">
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() =>
                                      handleDelete(client.id, client.company)
                                    }
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </RoleGuard>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {data?.meta && data.meta.totalPages > 1 && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm">
          <p className="text-muted-foreground text-center sm:text-left">
            Showing {(page - 1) * 10 + 1}–
            {Math.min(page * 10, data.meta.total)} of {data.meta.total} clients
          </p>
          <div className="flex gap-2 justify-center sm:justify-end">
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
