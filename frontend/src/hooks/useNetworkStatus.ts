"use client";

import { useState, useEffect } from "react";

export function useNetworkStatus(onStatusChangeToast?: (msg: string) => void) {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return navigator.onLine;
    }
    return true;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => {
      setIsOnline(true);
      if (onStatusChangeToast) {
        onStatusChangeToast("Back online. Syncing catalogs...");
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      if (onStatusChangeToast) {
        onStatusChangeToast("Internet lost. Switching to offline mode.");
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [onStatusChangeToast]);

  return {
    isOnline,
    isOffline: !isOnline,
  };
}
