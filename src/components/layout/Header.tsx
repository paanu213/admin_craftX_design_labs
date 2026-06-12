"use client";

import { signOut, useSession } from "next-auth/react";
import { Bell, LogOut, Menu } from "lucide-react";
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
import type { UserRole } from "@/types";
import { ChangePasswordDialog } from "@/components/layout/ChangePasswordDialog";

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  const { data: session } = useSession();
  const { toggleSidebar } = useUIStore();

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
      <div className="flex items-center gap-4">
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
