import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/auth-context";
import { KeyboardShortcutsProvider } from "@/components/layouts/keyboard-shortcuts-provider";
import { KeyboardShortcutsHelp } from "@/components/keyboard-shortcuts-help";
import { ShortcutsIndicator } from "@/components/layouts/shortcuts-indicator";
import { ClientLayout } from "@/components/layouts/client-layout";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Test Management",
  description: "Automated testing project management platform with Playwright",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <AuthProvider>
          <TooltipProvider>
            <KeyboardShortcutsProvider>
              <ClientLayout>{children}</ClientLayout>
              <KeyboardShortcutsHelp />
              <ShortcutsIndicator />
              <Toaster position="top-center" />
            </KeyboardShortcutsProvider>
          </TooltipProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
