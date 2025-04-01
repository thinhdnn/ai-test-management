"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Shield, Settings, Cpu } from "lucide-react";

const settingsNavItems = [
  {
    title: "General Settings",
    href: "/settings",
    icon: Settings,
  },
  {
    title: "Role-Based Access Control (RBAC)",
    href: "/settings/rbac",
    icon: Shield,
  },
  {
    title: "AI Configuration",
    href: "/settings/ai",
    icon: Cpu,
  },
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav className="flex border-b border-border mb-6">
      {settingsNavItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "flex items-center px-4 py-3 text-sm font-medium border-b-2 hover:text-primary",
            pathname === item.href
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground"
          )}
        >
          <item.icon className="mr-2 h-4 w-4" />
          <span>{item.title}</span>
        </Link>
      ))}
    </nav>
  );
}
