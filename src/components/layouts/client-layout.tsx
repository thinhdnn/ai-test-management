"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layouts/sidebar";

interface ClientLayoutProps {
  children: React.ReactNode;
}

export function ClientLayout({ children }: ClientLayoutProps) {
  const pathname = usePathname();
  const isAuthRoute = pathname.startsWith("/login");

  if (isAuthRoute) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-full">
      <Sidebar />
      <div className="flex-1 overflow-auto lg:ml-64">
        <main className="min-h-screen">{children}</main>
      </div>
    </div>
  );
}
