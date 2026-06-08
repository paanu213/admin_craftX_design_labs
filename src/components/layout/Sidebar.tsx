"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  Receipt,
  BarChart3,
  Settings,
  ChevronLeft,
  Building2,
  X,
  LayoutGrid,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/ui.store";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard, permission: null },
  { label: "Clients", href: "/clients", icon: Users, permission: "viewClients" as const },
  { label: "Applications", href: "/applications", icon: LayoutGrid, permission: "viewApplications" as const },
  { label: "Expenses", href: "/expenses", icon: Receipt, permission: "viewExpenses" as const },
  { label: "Reports", href: "/reports", icon: BarChart3, permission: "viewReports" as const },
];

const adminItems = [
  { label: "Users", href: "/settings/users", icon: Settings, permission: "manageUsers" as const },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = useUIStore();
  const { can } = usePermissions();

  // On mobile, start with sidebar closed
  useEffect(() => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, [setSidebarOpen]);

  function handleNavClick() {
    if (window.innerWidth < 768) setSidebarOpen(false);
  }

  return (
    <>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          "flex flex-col border-r border-border bg-card transition-all duration-300 ease-in-out",
          // Mobile: fixed full-height overlay
          "fixed inset-y-0 left-0 z-50 w-64",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          // Desktop: inline, no transform, width toggle
          "md:static md:inset-auto md:z-auto md:translate-x-0",
          sidebarOpen ? "md:w-64" : "md:w-16"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 px-4 border-b border-border">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Building2 className="h-5 w-5" />
          </div>
          {sidebarOpen && (
            <div className="overflow-hidden flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground truncate">CraftX</p>
              <p className="text-xs text-muted-foreground truncate">Design Labs</p>
            </div>
          )}
          {/* Mobile close button */}
          {sidebarOpen && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 md:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-1 p-3 flex-1 overflow-y-auto">
          {navItems.map((item) => {
            if (item.permission && !can(item.permission)) return null;
            const isActive =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleNavClick}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {sidebarOpen && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}

          {adminItems.some((i) => can(i.permission)) && (
            <>
              <Separator className="my-2" />
              {adminItems.map((item) => {
                if (!can(item.permission)) return null;
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={handleNavClick}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {sidebarOpen && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {/* Desktop collapse toggle */}
        <div className="hidden md:block p-3 border-t border-border">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="w-full h-8 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft
              className={cn(
                "h-4 w-4 transition-transform duration-300",
                !sidebarOpen && "rotate-180"
              )}
            />
          </Button>
        </div>
      </aside>
    </>
  );
}
