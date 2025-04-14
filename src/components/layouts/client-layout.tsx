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
    <div className="flex min-h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 lg:ml-64">
        <main>{children}</main>
      </div>
    </div>
  );
}
