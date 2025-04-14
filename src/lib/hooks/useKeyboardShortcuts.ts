import { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";

export type PageKey =
  | "global"
  | "home"
  | "projects"
  | "project-detail"
  | "test-cases"
  | "test-case-detail"
  | "users"
  | "settings";

export type KeyboardShortcut = {
  key: string;
  action: () => void;
  description: string;
  windowsKey?: string;
  macKey?: string;
  preventDefault?: boolean;
  page: PageKey | PageKey[];
};

export const useKeyboardShortcuts = (shortcuts: KeyboardShortcut[]) => {
  const [isMac, setIsMac] = useState(false);
  const [currentPage, setCurrentPage] = useState<PageKey>("global");
  const pathname = usePathname();

  // Determine current page based on URL
  const determineCurrentPage = useCallback(() => {
    if (pathname === "/") return "home";
    if (pathname === "/projects") return "projects";
    if (/^\/projects\/[^\/]+$/.test(pathname)) return "project-detail";
    if (/^\/projects\/[^\/]+\/test-cases$/.test(pathname)) return "test-cases";
    if (/^\/projects\/[^\/]+\/test-cases\/[^\/]+/.test(pathname))
      return "test-case-detail";
    if (pathname === "/users") return "users";
    if (pathname === "/settings") return "settings";

    return "global";
  }, [pathname]);

  useEffect(() => {
    // Determine operating system
    setIsMac(navigator.platform.toUpperCase().indexOf("MAC") >= 0);
  }, []);

  // Update current page when URL changes
  useEffect(() => {
    setCurrentPage(determineCurrentPage());
  }, [pathname, determineCurrentPage]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check control keys: Ctrl/Command, Alt/Option, Shift
      const ctrlKey = event.ctrlKey || event.metaKey;
      const altKey = event.altKey;
      const shiftKey = event.shiftKey;

      // Handle special case for Alt+A on Mac which produces "å"
      if (altKey && event.key === "å") {
        console.log("Detected Option+A (å) on Mac");
        const addStepButton = document.querySelector(
          '[data-test-id="add-test-step-button"]'
        ) as HTMLButtonElement;

        if (addStepButton) {
          console.log("Add test step button found via special handler");
          event.preventDefault();
          addStepButton.click();
          return;
        }
      }

      // Filter shortcuts that are active on the current page
      const activeShortcuts = shortcuts.filter((shortcut) => {
        if (Array.isArray(shortcut.page)) {
          return (
            shortcut.page.includes("global") ||
            shortcut.page.includes(currentPage)
          );
        }
        return shortcut.page === "global" || shortcut.page === currentPage;
      });

      for (const shortcut of activeShortcuts) {
        const shortcutKey = shortcut.key.toLowerCase();
        const eventKey = event.key.toLowerCase();

        // Check shortcuts with format like "Alt+a"
        if (shortcutKey.includes("+")) {
          const [modifier, key] = shortcutKey.split("+");

          if (
            (modifier === "alt" && altKey && eventKey === key) ||
            (modifier === "ctrl" && ctrlKey && eventKey === key) ||
            (modifier === "shift" && shiftKey && eventKey === key)
          ) {
            if (shortcut.preventDefault !== false) {
              event.preventDefault();
            }
            shortcut.action();
            break;
          }
          continue;
        }

        // Handle simple shortcuts
        if (eventKey === shortcutKey) {
          if (shortcut.preventDefault !== false) {
            event.preventDefault();
          }
          shortcut.action();
          break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [shortcuts, isMac, currentPage]);

  // Return keyboard shortcut information based on operating system
  return {
    shortcuts: shortcuts.map((shortcut) => ({
      ...shortcut,
      displayKey: isMac
        ? shortcut.macKey ||
          shortcut.key
            .replace("Ctrl", "⌘")
            .replace("Alt", "⌥")
            .replace("Shift", "⇧")
        : shortcut.windowsKey || shortcut.key,
    })),
    currentPage,
  };
};
