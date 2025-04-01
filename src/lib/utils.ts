import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null): string {
  if (!date) return "N/A";
  const d = typeof date === "string" ? new Date(date) : date;

  // Format date in DD/MM/YYYY format
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
}

export const BROWSER_OPTIONS = [
  { value: "chromium", label: "Chromium" },
  { value: "chrome", label: "Chrome" },
  { value: "firefox", label: "Firefox" },
  { value: "safari", label: "Safari" },
  { value: "edge", label: "Edge" },
];

export const ENVIRONMENT_OPTIONS = [
  { value: "development", label: "Development" },
  { value: "staging", label: "Staging" },
  { value: "production", label: "Production" },
];

export const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "passed", label: "Passed" },
  { value: "failed", label: "Failed" },
];

export const TAG_OPTIONS = [
  { value: "@high", label: "High" },
  { value: "@medium", label: "Medium" },
  { value: "@low", label: "Low" },
  { value: "@regression", label: "Regression" },
  { value: "@smoke", label: "Smoke" },
  { value: "@e2e", label: "E2E" },
  { value: "@ui", label: "UI" },
  { value: "@api", label: "API" },
  { value: "@performance", label: "Performance" },
];

/**
 * Convert a string to a valid file name
 * - Remove invalid special characters
 * - Replace spaces with hyphens
 * - Convert to lowercase
 */
export function toValidFileName(name: string): string {
  // Remove invalid special characters
  // and replace spaces with hyphens
  return name
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove all characters that are not letters, numbers, spaces or hyphens
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Remove consecutive hyphens
    .toLowerCase(); // Convert to lowercase
}

export function toKebabCase(str: string): string {
  return str
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
}
