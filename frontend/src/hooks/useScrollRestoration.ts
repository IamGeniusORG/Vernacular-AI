"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const STORAGE_PREFIX = "vernacular_scroll_pos_";

export function saveScrollPosition(path?: string) {
  if (typeof window === "undefined") return;
  const targetPath = path || window.location.pathname;
  try {
    sessionStorage.setItem(`${STORAGE_PREFIX}${targetPath}`, window.scrollY.toString());
  } catch {}
}

export function getSavedScrollPosition(path: string): number | null {
  if (typeof window === "undefined") return null;
  try {
    const val = sessionStorage.getItem(`${STORAGE_PREFIX}${path}`);
    return val ? parseInt(val, 10) : null;
  } catch {
    return null;
  }
}

export function clearScrollPosition(path: string) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(`${STORAGE_PREFIX}${path}`);
  } catch {}
}

/**
 * Hook to restore and preserve scroll position across Next.js route navigation
 * @param ready - optional boolean indicating whether async data/items have finished rendering
 */
export function useScrollRestoration(ready = true) {
  const pathname = usePathname();
  const hasRestoredRef = useRef(false);

  // 1. Restore scroll position once data is ready
  useEffect(() => {
    if (typeof window === "undefined" || !ready || hasRestoredRef.current) return;

    const saved = getSavedScrollPosition(pathname);
    if (saved && saved > 0) {
      // Allow DOM repaint before restoring scroll
      const raf = requestAnimationFrame(() => {
        window.scrollTo({ top: saved, behavior: "instant" as ScrollBehavior });
        hasRestoredRef.current = true;
      });

      // Second-pass safety check for async images
      const timer = setTimeout(() => {
        if (Math.abs(window.scrollY - saved) > 50) {
          window.scrollTo({ top: saved, behavior: "instant" as ScrollBehavior });
        }
      }, 100);

      return () => {
        cancelAnimationFrame(raf);
        clearTimeout(timer);
      };
    } else {
      hasRestoredRef.current = true;
    }
  }, [pathname, ready]);

  // 2. Continuously track scroll position on this page
  useEffect(() => {
    if (typeof window === "undefined") return;

    let timeoutId: NodeJS.Timeout | null = null;
    const handleScroll = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        saveScrollPosition(pathname);
      }, 100);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (timeoutId) clearTimeout(timeoutId);
      // Save exact position on unmount
      saveScrollPosition(pathname);
    };
  }, [pathname]);
}
