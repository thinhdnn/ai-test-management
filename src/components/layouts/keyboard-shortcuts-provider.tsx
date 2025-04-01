"use client";

import { createContext, useContext, ReactNode, useMemo } from "react";
import {
  useKeyboardShortcuts,
  PageKey,
} from "@/lib/hooks/useKeyboardShortcuts";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type KeyboardShortcutContextType = {
  shortcuts: Array<{
    key: string;
    description: string;
    displayKey: string;
    page: PageKey | PageKey[];
  }>;
  currentPage: PageKey;
};

const KeyboardShortcutContext = createContext<KeyboardShortcutContextType>({
  shortcuts: [],
  currentPage: "global",
});

export const useKeyboardShortcutContext = () =>
  useContext(KeyboardShortcutContext);

export function KeyboardShortcutsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();

  const { shortcuts, currentPage } = useKeyboardShortcuts([
    // Navigation - global shortcuts
    {
      key: "g+h",
      macKey: "g h",
      windowsKey: "g h",
      description: "Go to home page",
      action: () => router.push("/"),
      page: "global",
    },
    {
      key: "g+p",
      macKey: "g p",
      windowsKey: "g p",
      description: "Go to projects list",
      action: () => router.push("/projects"),
      page: "global",
    },
    {
      key: "g+u",
      macKey: "g u",
      windowsKey: "g u",
      description: "Go to users list",
      action: () => router.push("/users"),
      page: "global",
    },
    {
      key: "g+s",
      macKey: "g s",
      windowsKey: "g s",
      description: "Go to settings",
      action: () => router.push("/settings"),
      page: "global",
    },

    // Projects page shortcuts
    {
      key: "Ctrl+n",
      macKey: "⌘+n",
      windowsKey: "Ctrl+n",
      description: "Create new project",
      action: () => {
        router.push("/projects/new");
      },
      page: "projects",
    },

    // Test cases page shortcuts
    {
      key: "Ctrl+n",
      macKey: "⌘+n",
      windowsKey: "Ctrl+n",
      description: "Create new test case",
      action: () => {
        const url = window.location.pathname;
        if (url.includes("/project/") && url.includes("/test-cases")) {
          // Get projectId from URL: /project/[id]/test-cases
          const projectId = url.split("/")[2];
          router.push(`/project/${projectId}/test-cases/new`);
        }
      },
      page: "test-cases",
    },

    // Test case detail page shortcuts
    {
      key: "Ctrl+r",
      macKey: "⌘+r",
      windowsKey: "Ctrl+r",
      description: "Run test case",
      action: () => {
        const runButton = document.querySelector(
          '[data-test-id="run-test-button"]'
        ) as HTMLButtonElement;
        if (runButton) {
          runButton.click();
        } else {
          toast.info("Run test button not found on this page");
        }
      },
      page: "test-case-detail",
    },
    {
      key: "Ctrl+Shift+a",
      macKey: "⌘+⇧+a",
      windowsKey: "Ctrl+Shift+a",
      description: "Add test step",
      action: () => {
        console.log("Ctrl+Shift+A shortcut triggered");
        const addStepButton = document.querySelector(
          '[data-test-id="add-test-step-button"]'
        ) as HTMLButtonElement;
        if (addStepButton) {
          console.log("Add test step button found, clicking...");
          addStepButton.click();
        } else {
          console.log("Add test step button NOT found", {
            elements: document.querySelectorAll("button").length,
            testIds: Array.from(
              document.querySelectorAll("[data-test-id]")
            ).map((el) => el.getAttribute("data-test-id")),
          });
          toast.info("Add test step button not found on this page");
        }
      },
      page: "test-case-detail",
    },
    {
      key: "Enter",
      description: "Save test step",
      action: () => {
        // Only works when test step dialog is open
        const dialog = document.querySelector('[role="dialog"]');
        if (dialog) {
          const submitButton = dialog.querySelector(
            'button[type="submit"]'
          ) as HTMLButtonElement;
          if (submitButton && !submitButton.disabled) {
            submitButton.click();
          }
        }
      },
      page: "test-case-detail",
    },

    // Forms/Editing shortcuts - active on multiple pages
    {
      key: "Ctrl+s",
      macKey: "⌘+s",
      windowsKey: "Ctrl+s",
      description: "Save changes",
      action: () => {
        const saveButton = document.querySelector(
          '[data-test-id="save-button"]'
        ) as HTMLButtonElement;
        if (saveButton) {
          saveButton.click();
        } else {
          toast.info("Save button not found on this page");
        }
      },
      page: ["project-detail", "test-case-detail", "settings"],
    },

    // Escape to cancel (active on multiple pages with forms)
    {
      key: "Escape",
      description: "Cancel editing",
      action: () => {
        const cancelButton = document.querySelector(
          '[data-test-id="cancel-button"]'
        ) as HTMLButtonElement;
        if (cancelButton) {
          cancelButton.click();
        }
      },
      page: ["project-detail", "test-case-detail", "settings"],
    },

    // Help shortcut - global
    {
      key: "?",
      description: "Show keyboard shortcuts help",
      action: () => {
        // The modal will be shown by the KeyboardShortcutsHelp component
      },
      page: "global",
    },
  ]);

  return (
    <KeyboardShortcutContext.Provider value={{ shortcuts, currentPage }}>
      {children}
    </KeyboardShortcutContext.Provider>
  );
}
