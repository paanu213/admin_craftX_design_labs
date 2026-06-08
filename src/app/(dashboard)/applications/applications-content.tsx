"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Search, Filter, Eye, Edit, Trash2, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/layout/PageWrapper";
import { RoleGuard } from "@/components/guards/RoleGuard";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatCurrency,
  APP_CATEGORY_LABELS,
  APP_STATUS_LABELS,
  APP_STATUS_VARIANT,
} from "@/lib/utils";
import type { Application } from "@/types";

interface ApplicationsResponse {
  data: Application[];
}

export function ApplicationsContent() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const { data, isLoading, refetch } = useQuery<ApplicationsResponse>({
    queryKey: ["applications", search, categoryFilter, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams({
        ...(search && { search }),
        ...(categoryFilter !== "ALL" && { category: categoryFilter }),
        ...(statusFilter !== "ALL" && { status: statusFilter }),
      });
      return fetch(`/api/applications?${params}`).then((r) => r.json());
    },
  });

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete application "${name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/applications/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Application deleted");
      refetch();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Failed to delete application");
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Applications"
        description="Manage your portfolio of software products"
        actions={
          <RoleGuard permission="createApplications">
            <Button onClick={() => router.push("/applications/new")}>
              <Plus className="h-4 w-4" />
              Add Application
            </Button>
          </RoleGuard>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search applications..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <Filter className="h-4 w-4 mr-1 text-muted-foreground" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Categories</SelectItem>
            <SelectItem value="BILLING">Billing</SelectItem>
            <SelectItem value="INVENTORY">Inventory</SelectItem>
            <SelectItem value="POS">Point of Sale</SelectItem>
            <SelectItem value="RESTAURANT">Restaurant</SelectItem>
            <SelectItem value="HOSPITAL">Hospital</SelectItem>
            <SelectItem value="SCHOOL">School</SelectItem>
            <SelectItem value="REAL_ESTATE">Real Estate</SelectItem>
            <SelectItem value="LOGISTICS">Logistics</SelectItem>
            <SelectItem value="CRM">CRM</SelectItem>
            <SelectItem value="HR_PAYROLL">HR & Payroll</SelectItem>
            <SelectItem value="FINANCE">Finance</SelectItem>
            <SelectItem value="MANUFACTURING">Manufacturing</SelectItem>
            <SelectItem value="E_COMMERCE">E-Commerce</SelectItem>
            <SelectItem value="OTHER">Other</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="BETA">Beta</SelectItem>
            <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
            <SelectItem value="DEPRECATED">Deprecated</SelectItem>
          </SelectContent>
        </Select>
      </div>

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
              <p className="text-muted-foreground text-sm">No applications found</p>
              <RoleGuard permission="createApplications">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/applications/new")}
                >
                  <Plus className="h-4 w-4" />
                  Add your first application
                </Button>
              </RoleGuard>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Application
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">
                      Category
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">
                      Version
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">
                      Monthly
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">
                      Yearly
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden md:table-cell">
                      Clients
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden md:table-cell">
                      Active Subs
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden xl:table-cell">
                      Added by
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((app) => (
                    <tr
                      key={app.id}
                      className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <button
                          className="font-medium text-foreground hover:text-primary hover:underline text-left"
                          onClick={() => router.push(`/applications/${app.id}`)}
                        >
                          {app.name}
                        </button>
                        {app.description && (
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {app.description}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <Badge variant="secondary">
                          {APP_CATEGORY_LABELS[app.category] ?? app.category}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">
                        v{app.version}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={APP_STATUS_VARIANT[app.status]}>
                          {APP_STATUS_LABELS[app.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                        {app.monthlyPrice != null
                          ? formatCurrency(app.monthlyPrice, app.currency)
                          : <span className="text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                        {app.yearlyPrice != null
                          ? formatCurrency(app.yearlyPrice, app.currency)
                          : <span className="text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right hidden md:table-cell text-muted-foreground">
                        {app._count?.subscriptions ?? 0}
                      </td>
                      <td className="px-4 py-3 text-right hidden md:table-cell text-muted-foreground">
                        {app.activeSubscriptions ?? 0}
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell text-muted-foreground text-xs">
                        {app.createdBy?.name}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1.5 text-xs"
                            onClick={() => router.push(`/applications/${app.id}`)}
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
                              <RoleGuard permission="editApplications">
                                <DropdownMenuItem
                                  onClick={() => router.push(`/applications/${app.id}/edit`)}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                              </RoleGuard>
                              <RoleGuard permission="deleteApplications">
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => handleDelete(app.id, app.name)}
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
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
