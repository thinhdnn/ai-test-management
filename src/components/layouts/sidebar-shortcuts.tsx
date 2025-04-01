"use client";

import { useKeyboardShortcutContext } from "./keyboard-shortcuts-provider";
import { formatShortcut } from "@/components/ui/shortcut-tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState } from "react";
import { ChevronDown, ChevronRight, Keyboard } from "lucide-react";

export function SidebarShortcuts() {
  const { shortcuts, currentPage } = useKeyboardShortcutContext();
  const [isOpen, setIsOpen] = useState(false);

  // Filter shortcuts for current page
  const getFilteredShortcuts = () => {
    // Global shortcuts
    const globalShortcuts = shortcuts.filter((s) => {
      if (Array.isArray(s.page)) return s.page.includes("global");
      return s.page === "global";
    });

    // Current page shortcuts
    const pageShortcuts = shortcuts.filter((s) => {
      if (Array.isArray(s.page)) return s.page.includes(currentPage);
      return s.page === currentPage;
    });

    // Combined shortcuts
    return [...globalShortcuts, ...pageShortcuts];
  };

  const activeShortcuts = getFilteredShortcuts();

  // No shortcuts to show
  if (!activeShortcuts.length) {
    return null;
  }

  return (
    <div className="px-3 py-2">
      <Collapsible
        open={isOpen}
        onOpenChange={setIsOpen}
        className="border rounded-md"
      >
        <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground rounded-md">
          <div className="flex items-center gap-2">
            <Keyboard className="h-4 w-4" />
            <span>Keyboard Shortcuts</span>
          </div>
          {isOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent className="px-4 pt-1 pb-3">
          <div className="space-y-2 text-sm">
            {activeShortcuts.map((shortcut, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">
                  {shortcut.description}
                </span>
                <kbd className="px-1.5 py-0.5 text-[10px] font-medium bg-muted rounded border border-border">
                  {formatShortcut(shortcut.displayKey)}
                </kbd>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
