"use client";

import * as React from "react";
import { ReactNode } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ShortcutTooltipProps {
  children: ReactNode;
  shortcut: string;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  description?: string;
}

export function ShortcutTooltip({
  children,
  shortcut,
  side = "top",
  align = "center",
  description,
}: ShortcutTooltipProps) {
  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side} align={align} className="flex flex-col gap-1">
        {description && <span className="text-xs">{description}</span>}
        <div className="flex items-center gap-1">
          {shortcut.split("+").map((key, index) => (
            <React.Fragment key={index}>
              {index > 0 && <span className="text-xs opacity-70">+</span>}
              <kbd className="px-1.5 py-0.5 text-[10px] font-semibold bg-black/20 dark:bg-white/20 rounded border border-black/10 dark:border-white/10">
                {key}
              </kbd>
            </React.Fragment>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export function detectOS() {
  if (typeof window === "undefined") return "Windows";

  const userAgent = window.navigator.userAgent;
  const platform = window.navigator.platform;
  const macosPlatforms = ["Macintosh", "MacIntel", "MacPPC", "Mac68K"];

  if (macosPlatforms.includes(platform)) return "Mac";
  return "Windows";
}

export function formatShortcut(shortcut: string): string {
  const isMac = detectOS() === "Mac";

  if (isMac) {
    return shortcut
      .replace(/Ctrl/g, "⌘")
      .replace(/Alt/g, "⌥")
      .replace(/Shift/g, "⇧");
  }

  return shortcut;
}
