"use client";

import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const registerSW = () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          if (process.env.NODE_ENV === "development") {
            console.log("[PWA] ServiceWorker registered with scope:", registration.scope);
          }
          // Immediately check for updates
          registration.update().catch(() => {});
        })
        .catch((err) => {
          console.warn("[PWA] ServiceWorker registration failed:", err);
        });
    };

    if (document.readyState === "complete" || document.readyState === "interactive") {
      registerSW();
    } else {
      window.addEventListener("load", registerSW, { once: true });
    }
  }, []);

  return null;
}
