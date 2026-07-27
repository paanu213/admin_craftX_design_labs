"use client";

import { signOut, useSession } from "next-auth/react";
import { Bell, LogOut, Menu, Settings, Package, Users, UsersRound, Database, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getInitials, ROLE_LABELS } from "@/lib/utils";
import { useUIStore } from "@/store/ui.store";
import { usePermissions } from "@/hooks/usePermissions";
import type { UserRole } from "@/types";
import type { Permission } from "@/lib/permissions";
import { ChangePasswordDialog } from "@/components/layout/ChangePasswordDialog";
import { ProductSwitcher } from "@/components/layout/ProductSwitcher";

interface HeaderProps {
  title?: string;
}

const SETTINGS_NAV: { label: string; href: string; icon: LucideIcon; permission: Permission }[] = [
  { label: "Products",    href: "/settings/products",    icon: Package,    permission: "viewProducts" },
  { label: "Users",       href: "/settings/users",       icon: Users,      permission: "manageUsers"  },
  { label: "User Groups", href: "/settings/user-groups", icon: UsersRound, permission: "manageUsers"  },
  { label: "Master Data", href: "/master-data",          icon: Database,   permission: "viewMasterData" },
];

export function Header({ title }: HeaderProps) {
  const { data: session } = useSession();
  const { toggleSidebar } = useUIStore();
  const { can } = usePermissions();

  const visibleSettingsItems = SETTINGS_NAV.filter(
    (item, idx, arr) =>
      can(item.permission) &&
      arr.findIndex((x) => x.href === item.href) === idx
  );

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="md:hidden"
        >
          <Menu className="h-4 w-4" />
        </Button>
        {title && (
          <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        )}
      </div>

      <div className="flex items-center gap-2">
        <ProductSwitcher />

        {visibleSettingsItems.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground" title="Settings">
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Settings
              </DropdownMenuLabel>
              {visibleSettingsItems.map((item) => (
                <DropdownMenuItem key={item.href} asChild>
                  <Link href={item.href} className="flex items-center gap-2 cursor-pointer">
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                    {item.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <Button variant="ghost" size="icon" className="relative text-muted-foreground">
          <Bell className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 h-9 px-2">
              <Avatar className="h-7 w-7">
                <AvatarImage src={session?.user?.image ?? ""} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {getInitials(session?.user?.name ?? "U")}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col items-start">
                <span className="text-sm font-medium leading-none">
                  {session?.user?.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {ROLE_LABELS[session?.user?.role as UserRole] ?? ""}
                </span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>
              <p className="font-medium">{session?.user?.name}</p>
              <p className="text-xs text-muted-foreground font-normal truncate">
                {session?.user?.email}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <ChangePasswordDialog />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive gap-2 cursor-pointer"
              onClick={async () => {
                await signOut({ redirect: false });
                window.location.assign("/login");
              }}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
