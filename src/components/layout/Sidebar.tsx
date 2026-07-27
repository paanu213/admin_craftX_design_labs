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
  Banknote,
  Terminal,
  UsersRound,
  Database,
  Plane,
  CreditCard,
  Ticket,
  PhoneCall,
  Tag,
  RefreshCcw,
  Package,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/ui.store";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { Permission } from "@/lib/permissions";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  permission: Permission | null;
}

const craftxNavItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard, permission: null },
  { label: "Clients", href: "/clients", icon: Users, permission: "viewClients" },
  { label: "Applications", href: "/applications", icon: LayoutGrid, permission: "viewApplications" },
  { label: "Expenses", href: "/expenses", icon: Receipt, permission: "viewExpenses" },
  { label: "Payments", href: "/payments", icon: Banknote, permission: "viewPayments" },
  { label: "Dev Access", href: "/dev-access", icon: Terminal, permission: "viewDevAccess" },
  { label: "Reports", href: "/reports", icon: BarChart3, permission: "viewReports" },
];

const craftxAdminItems: NavItem[] = [
  { label: "Master Data", href: "/master-data", icon: Database, permission: "viewMasterData" },
  { label: "Users", href: "/settings/users", icon: Settings, permission: "manageUsers" },
  { label: "User Groups", href: "/settings/user-groups", icon: UsersRound, permission: "manageUsers" },
  { label: "Products", href: "/settings/products", icon: Package, permission: "viewProducts" },
];

// Product-specific nav definitions — add a new entry per product slug
const PRODUCT_NAV: Record<string, { items: NavItem[]; label: string }> = {
  travelan: {
    label: "Travelan",
    items: [
      { label: "Overview", href: "/travelan", icon: LayoutDashboard, permission: null },
      { label: "Agencies", href: "/travelan/agencies", icon: Plane, permission: null },
      { label: "Subscriptions", href: "/travelan/subscriptions", icon: CreditCard, permission: null },
      { label: "Finance", href: "/travelan/finance", icon: Banknote, permission: null },
      { label: "Support Tickets", href: "/travelan/tickets", icon: Ticket, permission: null },
      { label: "Contacts", href: "/travelan/contacts", icon: PhoneCall, permission: null },
      { label: "Coupons", href: "/travelan/coupons", icon: Tag, permission: null },
      { label: "Refunds", href: "/travelan/refunds", icon: RefreshCcw, permission: null },
    ],
  },
};

function getActiveProduct(pathname: string): string | null {
  for (const slug of Object.keys(PRODUCT_NAV)) {
    if (pathname.startsWith(`/${slug}`)) return slug;
  }
  return null;
}

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = useUIStore();
  const { can } = usePermissions();

  const activeProduct = getActiveProduct(pathname);
  const productNav = activeProduct ? PRODUCT_NAV[activeProduct] : null;

  useEffect(() => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, [setSidebarOpen]);

  function handleNavClick() {
    if (window.innerWidth < 768) setSidebarOpen(false);
  }

  function renderNavItem(item: NavItem) {
    if (item.permission && !can(item.permission)) return null;
    const isActive =
      item.href === "/" || item.href === `/${activeProduct}`
        ? pathname === item.href
        : pathname.startsWith(item.href);
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
  }

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          "flex flex-col border-r border-border bg-card transition-all duration-300 ease-in-out",
          "fixed inset-y-0 left-0 z-50 w-64",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          "md:static md:inset-auto md:z-auto md:translate-x-0",
          sidebarOpen ? "md:w-64" : "md:w-16"
        )}
      >
        {/* Logo / Product label */}
        <div className="flex h-16 items-center gap-3 px-4 border-b border-border">
          <div className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-primary-foreground",
            productNav ? "bg-indigo-600" : "bg-primary"
          )}>
            {productNav ? <Plane className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
          </div>
          {sidebarOpen && (
            <div className="overflow-hidden flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground truncate">
                {productNav ? productNav.label : "CraftX"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {productNav ? "Product Dashboard" : "Design Labs"}
              </p>
            </div>
          )}
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
          {productNav ? (
            // Product-specific nav
            productNav.items.map(renderNavItem)
          ) : (
            // CraftX admin nav
            <>
              {craftxNavItems.map(renderNavItem)}
              {craftxAdminItems.some((i) => !i.permission || can(i.permission)) && (
                <>
                  <Separator className="my-2" />
                  {craftxAdminItems.map(renderNavItem)}
                </>
              )}
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
