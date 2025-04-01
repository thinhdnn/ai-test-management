"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Hook to track URL changes in Next.js
 * and call a callback when URL changes
 */
export const usePageNavigation = (callback: () => void) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    callback();
  }, [pathname, searchParams, callback]);
};
