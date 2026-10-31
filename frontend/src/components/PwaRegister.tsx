"use client";

import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => {
            if (process.env.NODE_ENV === "development") {
              console.log("PWA ServiceWorker registered:", reg.scope);
            }
          })
          .catch((err) => {
            console.warn("PWA ServiceWorker registration failed:", err);
          });
      });
    }
  }, []);

  return null;
}
