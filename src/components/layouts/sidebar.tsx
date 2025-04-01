"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LucideLayoutDashboard,
  LucideUsers,
  LucideSettings,
  LucideMenu,
  LucideX,
  LucideLogOut,
} from "lucide-react";
import { SidebarShortcuts } from "./sidebar-shortcuts";
import { useAuth } from "@/contexts/auth-context";
import { Skeleton } from "@/components/ui/skeleton";

interface SidebarProps {
  className?: string;
}

interface SidebarItemProps {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  active?: boolean;
}

function SidebarItem({ href, icon: Icon, title, active }: SidebarItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
        active
          ? "bg-accent text-accent-foreground font-medium"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      <Icon className="h-5 w-5" />
      <span>{title}</span>
    </Link>
  );
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { user, isLoading, logout } = useAuth();

  const routes = [
    {
      href: "/projects",
      title: "Projects",
      icon: LucideLayoutDashboard,
    },
    {
      href: "/users",
      title: "Users",
      icon: LucideUsers,
    },
    {
      href: "/settings",
      title: "Settings",
      icon: LucideSettings,
    },
  ];

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="fixed left-4 top-4 z-50 lg:hidden"
        onClick={() => setOpen(true)}
      >
        <LucideMenu className="h-6 w-6" />
      </Button>

      <div
        className={cn(
          "fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden",
          open ? "block" : "hidden"
        )}
        onClick={() => setOpen(false)}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 border-r bg-background transition-transform",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          className
        )}
      >
        <div className="flex h-16 items-center border-b px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="text-xl">Playwright Gemini</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4 lg:hidden"
            onClick={() => setOpen(false)}
          >
            <LucideX className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex flex-col h-[calc(100%-4rem)] overflow-y-auto">
          <nav className="space-y-1 px-3 py-4">
            {routes.map((route) => (
              <SidebarItem
                key={route.href}
                href={route.href}
                icon={route.icon}
                title={route.title}
                active={pathname.startsWith(route.href)}
              />
            ))}
          </nav>

          <div className="mt-auto">
            <SidebarShortcuts />

            <div className="border-t p-4">
              {isLoading ? (
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
              ) : user ? (
                <div className="flex flex-col space-y-3">
                  <div>
                    <p className="text-sm font-medium">{user.username}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {user.role}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full flex justify-start"
                    onClick={logout}
                  >
                    <LucideLogOut className="mr-2 h-4 w-4" />
                    Logout
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
