"use client";

import { useState, useEffect, useCallback } from "react";
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
  LucideWrench,
  LucideShield,
  LucideCpu,
  LucideFolder,
} from "lucide-react";
import { SidebarShortcuts } from "./sidebar-shortcuts";
import { useAuth } from "@/contexts/auth-context";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermission } from "@/lib/hooks/usePermission";
import React from "react";

// Define route type for better type checking
interface RouteItem {
  href: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  permission: string;
  children?: Array<Omit<RouteItem, 'children'>>;
}

interface SidebarProps {
  className?: string;
}

interface SidebarItemProps {
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  active?: boolean;
  children?: Array<Omit<SidebarItemProps, 'children'>>;
  currentPath?: string;
}

function SidebarItem({ href, icon: Icon, title, active, children, currentPath }: SidebarItemProps) {
  // Initialize expanded state based on whether path starts with href or a child is active
  const [expanded, setExpanded] = useState(() => {
    if (!currentPath) return false;
    
    // Luôn mở menu Settings theo mặc định
    if (href === "/settings") return true;
    
    // Automatically expand if the current path is a direct match or a child route
    const isDirectMatch = currentPath === href;
    const hasActiveChild = children?.some(child => currentPath.startsWith(child.href)) || false;
    
    return isDirectMatch || hasActiveChild;
  });
  
  // Don't use useEffect to manage the expanded state anymore - set it only on click
  
  return (
    <div>
      <Link
        href={href}
        className={cn(
          "flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-all",
          active
            ? "bg-accent text-accent-foreground font-medium"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        )}
        onClick={(e) => {
          if (children && children.length > 0) {
            e.preventDefault();
            setExpanded(!expanded);
          }
        }}
      >
        <div className="flex items-center gap-3">
          {Icon && <Icon className="h-5 w-5" />}
          <span>{title}</span>
        </div>
        {children && children.length > 0 && (
          <span className="text-xs">{expanded ? "▼" : "▶"}</span>
        )}
      </Link>
      
      {children && children.length > 0 && expanded && (
        <div className="ml-7 mt-1 space-y-1">
          {children.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-all",
                currentPath?.startsWith(child.href)
                  ? "bg-accent/70 text-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
              )}
            >
              {child.icon && <child.icon className="h-4 w-4" />}
              <span>{child.title}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// Define routes outside of the component to prevent recreation on each render
const ALL_ROUTES: RouteItem[] = [
  {
    href: "/dashboard",
    title: "Dashboard",
    icon: LucideLayoutDashboard,
    permission: "project.read"
  },
  {
    href: "/projects",
    title: "Projects",
    icon: LucideFolder,
    permission: "project.read"
  },
  {
    href: "/users",
    title: "Users",
    icon: LucideUsers,
    permission: "user.manage"
  },
  {
    href: "/settings",
    title: "Settings",
    icon: LucideSettings,
    permission: "system.settings",
    children: [
      {
        href: "/settings",
        title: "General Settings",
        permission: "system.settings.general",
        icon: LucideWrench
      },
      {
        href: "/settings/rbac",
        title: "Roles",
        permission: "system.settings.rbac",
        icon: LucideShield
      },
      {
        href: "/settings/ai",
        title: "AI Configuration",
        permission: "system.settings.ai",
        icon: LucideCpu
      }
    ]
  },
];

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { user, isLoading, logout } = useAuth();
  const { hasPermission } = usePermission();
  const [visibleRoutes, setVisibleRoutes] = useState<RouteItem[]>(ALL_ROUTES);

  // Stabilize the hasPermission reference using useCallback
  const checkPermission = useCallback((permission: string) => {
    try {
      return hasPermission(permission);
    } catch (e) {
      console.error("Permission check error:", e);
      return false;
    }
  }, [hasPermission]);

  // Store user ID in a ref to avoid re-renders
  const userIdRef = React.useRef<string | null>(null);
  
  // Update routes when auth status changes
  useEffect(() => {
    // Skip if the user ID hasn't changed
    const currentUserId = user?.id || null;
    if (userIdRef.current === currentUserId) {
      // Skip further processing if ID hasn't changed
      return;
    }
    
    // Update the ref
    userIdRef.current = currentUserId;
    
    // Khi đang loading, giữ nguyên menu
    if (isLoading) {
      return;
    }
    
    // Nếu không có user, hiển thị tất cả route
    if (!user) {
      setVisibleRoutes(ALL_ROUTES);
      return;
    }

    // Filter routes based on user permissions
    const filtered = ALL_ROUTES
      .filter(route => checkPermission(route.permission))
      .map(route => {
        // Also filter children based on permissions
        if (route.children) {
          const filteredChildren = route.children.filter(child => 
            checkPermission(child.permission)
          );
          
          return {
            ...route,
            children: filteredChildren.length > 0 ? filteredChildren : undefined
          };
        }
        return route;
      });

    setVisibleRoutes(filtered);
  }, [user?.id, isLoading, checkPermission]);

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
            <span className="text-xl">AI Test Management</span>
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
            {isLoading ? (
              // Show skeletons while loading
              Array(3).fill(0).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2">
                  <Skeleton className="h-5 w-5" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))
            ) : (
              visibleRoutes.map((route) => (
                <SidebarItem
                  key={route.href}
                  href={route.href}
                  icon={route.icon}
                  title={route.title}
                  active={pathname === route.href}
                  children={route.children}
                  currentPath={pathname}
                />
              ))
            )}
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
                      {user.roles?.join(", ") || "No role"}
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
