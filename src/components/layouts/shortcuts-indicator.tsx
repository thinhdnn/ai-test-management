"use client";

import { useState } from "react";
import { Keyboard } from "lucide-react";
import { ShortcutTooltip } from "@/components/ui/shortcut-tooltip";
import { useKeyboardShortcutContext } from "./keyboard-shortcuts-provider";
import { PageKey } from "@/lib/hooks/useKeyboardShortcuts";

export function ShortcutsIndicator() {
  const [showHint, setShowHint] = useState(false);
  const { shortcuts, currentPage } = useKeyboardShortcutContext();

  // Count active shortcuts for current page
  const getActiveShortcutsCount = () => {
    const globalShortcuts = shortcuts.filter((s) => {
      if (Array.isArray(s.page)) return s.page.includes("global");
      return s.page === "global";
    });

    const pageShortcuts = shortcuts.filter((s) => {
      if (Array.isArray(s.page)) return s.page.includes(currentPage);
      return s.page === currentPage;
    });

    return globalShortcuts.length + pageShortcuts.length;
  };

  const activeShortcutsCount = getActiveShortcutsCount();

  // Get page label
  const getPageLabel = (page: PageKey): string => {
    const labels: Record<PageKey, string> = {
      global: "Global",
      home: "Home",
      projects: "Projects List",
      "project-detail": "Project Details",
      "test-cases": "Test Cases",
      "test-case-detail": "Test Case Details",
      users: "Users",
      settings: "Settings",
    };

    return labels[page];
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <ShortcutTooltip
        shortcut="?"
        description="Show keyboard shortcuts"
        side="left"
      >
        <button
          className="flex items-center justify-center h-10 w-10 rounded-full bg-primary text-primary-foreground shadow-md hover:bg-primary/90 transition-colors relative"
          onClick={() => {
            // Trigger the "?" key to open the shortcuts dialog
            const event = new KeyboardEvent("keydown", {
              key: "?",
              bubbles: true,
            });
            document.dispatchEvent(event);
          }}
          onMouseEnter={() => setShowHint(true)}
          onMouseLeave={() => setShowHint(false)}
        >
          <Keyboard className="h-5 w-5" />
          {activeShortcutsCount > 0 && (
            <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground translate-x-1/3 -translate-y-1/3">
              {activeShortcutsCount}
            </span>
          )}
        </button>
      </ShortcutTooltip>
    </div>
  );
}
