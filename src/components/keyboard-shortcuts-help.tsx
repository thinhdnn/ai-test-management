"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useKeyboardShortcutContext } from "./layouts/keyboard-shortcuts-provider";
import { formatShortcut } from "@/components/ui/shortcut-tooltip";
import { PageKey } from "@/lib/hooks/useKeyboardShortcuts";

const PAGE_LABELS: Record<PageKey, string> = {
  global: "Global",
  home: "Home",
  projects: "Projects List",
  "project-detail": "Project Details",
  "test-cases": "Test Cases",
  "test-case-detail": "Test Case Details",
  users: "Users",
  settings: "Settings",
};

export function KeyboardShortcutsHelp() {
  const [isOpen, setIsOpen] = useState(false);
  const { shortcuts, currentPage } = useKeyboardShortcutContext();

  // Listen for the "?" key to open the modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === "?" &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.metaKey
      ) {
        event.preventDefault();
        setIsOpen(true);
      } else if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Filter and get shortcuts for current page
  const getFilteredShortcuts = (pageKey: PageKey) => {
    return shortcuts.filter((s) => {
      if (Array.isArray(s.page)) {
        return s.page.includes(pageKey);
      }
      return s.page === pageKey;
    });
  };

  // Get global shortcuts and current page shortcuts
  const globalShortcuts = getFilteredShortcuts("global");
  const currentPageShortcuts =
    currentPage !== "global" ? getFilteredShortcuts(currentPage) : [];

  // Combined shortcuts for current page
  const activeShortcuts = [...globalShortcuts, ...currentPageShortcuts];

  // Categorize shortcuts by group
  const navigationShortcuts = activeShortcuts.filter((s) =>
    s.description.toLowerCase().includes("go to")
  );
  const actionShortcuts = activeShortcuts.filter(
    (s) =>
      !s.description.toLowerCase().includes("go to") &&
      s.key !== "?" &&
      s.key !== "Escape"
  );
  const utilityShortcuts = activeShortcuts.filter(
    (s) => s.key === "?" || s.key === "Escape"
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            {`Shortcuts for ${PAGE_LABELS[currentPage]}`}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          {navigationShortcuts.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">
                Navigation
              </h3>
              <div className="space-y-3">
                {navigationShortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex gap-1">
                      {shortcut.displayKey.split(" ").map((key, keyIndex) => (
                        <kbd
                          key={keyIndex}
                          className="px-2 py-1 bg-black/5 dark:bg-white/10 rounded border border-black/10 dark:border-white/20 text-xs font-medium"
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {actionShortcuts.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Actions</h3>
              <div className="space-y-3">
                {actionShortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex gap-1">
                      {formatShortcut(shortcut.displayKey)
                        .split("+")
                        .map((key, keyIndex) => (
                          <kbd
                            key={keyIndex}
                            className="px-2 py-1 bg-black/5 dark:bg-white/10 rounded border border-black/10 dark:border-white/20 text-xs font-medium"
                          >
                            {key}
                          </kbd>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {utilityShortcuts.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Utility</h3>
              <div className="space-y-3">
                {utilityShortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <kbd className="px-2 py-1 bg-black/5 dark:bg-white/10 rounded border border-black/10 dark:border-white/20 text-xs font-medium">
                      {shortcut.key}
                    </kbd>
                  </div>
                ))}
                <div className="flex justify-between items-center">
                  <span className="text-sm">Close dialog</span>
                  <kbd className="px-2 py-1 bg-black/5 dark:bg-white/10 rounded border border-black/10 dark:border-white/20 text-xs font-medium">
                    ESC
                  </kbd>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 pt-4 border-t text-sm text-muted-foreground">
          <p className="flex gap-3 flex-wrap">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-black/5 dark:bg-white/10 rounded border border-black/10 dark:border-white/20 text-xs font-medium">
                ⌘
              </kbd>
              <span>= Command (Mac)</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-black/5 dark:bg-white/10 rounded border border-black/10 dark:border-white/20 text-xs font-medium">
                ⌥
              </kbd>
              <span>= Option (Mac)</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-black/5 dark:bg-white/10 rounded border border-black/10 dark:border-white/20 text-xs font-medium">
                ⇧
              </kbd>
              <span>= Shift</span>
            </span>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
