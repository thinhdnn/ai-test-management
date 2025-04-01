import { Metadata } from "next";
import { SettingsNav } from "@/components/settings/settings-nav";

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your application settings",
};

interface SettingsLayoutProps {
  children: React.ReactNode;
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  return (
    <div className="w-full space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight mb-2">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your application settings and permissions.
        </p>
      </div>
      <SettingsNav />
      <div>{children}</div>
    </div>
  );
}
