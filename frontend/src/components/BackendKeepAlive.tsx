"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { Zap, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" && window.location.hostname !== "localhost"
    ? "https://vernacular-ai-mw9i.onrender.com"
    : "http://127.0.0.1:8000");

export default function BackendKeepAlive() {
  const [status, setStatus] = useState<"idle" | "waking" | "online" | "failed">("idle");
  const [isVisible, setIsVisible] = useState(false);
  const [isManualPinging, setIsManualPinging] = useState(false);
  const lastPingTimeRef = useRef<number>(0);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const pingBackend = useCallback(async (isInitial = false) => {
    let slowTimer: NodeJS.Timeout | null = null;

    if (isInitial) {
      // If the backend doesn't respond within 2.2s, it's a Render cold start.
      // Reveal the friendly warmup status banner.
      slowTimer = setTimeout(() => {
        setStatus("waking");
        setIsVisible(true);
      }, 2200);
    }

    try {
      // 1. Try FastAPI backend directly
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 65000); // Allow up to 65s for Render cold start

      const res = await fetch(`${API_BASE}/health`, {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      if (slowTimer) clearTimeout(slowTimer);

      if (res.ok) {
        lastPingTimeRef.current = Date.now();
        setStatus("online");

        // If we showed the waking status banner, celebrate success then smoothly hide it
        if (isVisible || isInitial) {
          if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
          hideTimeoutRef.current = setTimeout(() => {
            setIsVisible(false);
          }, 3000);
        }
        return true;
      }
    } catch {
      // Also try fallback Next.js internal warmup route if backend fails
      try {
        await fetch("/api/warmup", { cache: "no-store" });
      } catch {}
    } finally {
      if (slowTimer) clearTimeout(slowTimer);
      setIsManualPinging(false);
    }

    return false;
  }, [isVisible]);

  useEffect(() => {
    lastPingTimeRef.current = Date.now();

    // 1. Warmup ping deferred slightly to prevent synchronous render cascades
    const initialWarmupTimer = setTimeout(() => {
      pingBackend(true);
    }, 150);

    // 2. Heartbeat every 4 minutes (240,000ms) to prevent 15-min Render idle sleep while site is open
    const interval = setInterval(() => {
      pingBackend(false);
    }, 4 * 60 * 1000);

    // 3. Tab focus trigger: if user switches back to tab after being away for > 4 mins, pre-warm
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const elapsed = Date.now() - lastPingTimeRef.current;
        if (elapsed > 4 * 60 * 1000) {
          pingBackend(false);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearTimeout(initialWarmupTimer);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [pingBackend]);

  const handleManualWake = async () => {
    setIsManualPinging(true);
    setStatus("waking");
    setIsVisible(true);
    await pingBackend(false);
  };

  // Only render visual UI if server is waking up or user triggered manual check
  if (!isVisible && status !== "waking") {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div
        className={`px-3.5 py-2 rounded-2xl shadow-xl border backdrop-blur-md flex items-center gap-2.5 text-xs font-semibold select-none transition-all ${
          status === "waking"
            ? "bg-amber-500/90 text-white border-amber-400"
            : status === "online"
            ? "bg-emerald-600/95 text-white border-emerald-500"
            : "bg-stone-900/90 text-white border-stone-700"
        }`}
      >
        {status === "waking" ? (
          <>
            <RefreshCw size={14} className="animate-spin text-amber-100" />
            <div className="flex flex-col">
              <span className="leading-tight">Waking up AI backend...</span>
              <span className="text-[10px] font-normal text-amber-100/90">
                Render cold-start (~30s)
              </span>
            </div>
          </>
        ) : status === "online" ? (
          <>
            <CheckCircle2 size={15} className="text-emerald-200 shrink-0" />
            <div className="flex flex-col">
              <span className="leading-tight">AI Backend is live & ready!</span>
              <span className="text-[10px] font-normal text-emerald-100">
                Zero cold-start delay
              </span>
            </div>
          </>
        ) : (
          <>
            <AlertCircle size={14} className="text-amber-300 shrink-0" />
            <span className="leading-tight">Checking backend...</span>
          </>
        )}

        <button
          type="button"
          onClick={handleManualWake}
          disabled={isManualPinging || status === "waking"}
          className="ml-1 p-1 hover:bg-white/20 rounded-lg transition active:scale-95 disabled:opacity-50"
          title="Ping backend now"
        >
          <Zap size={13} className="text-amber-200" />
        </button>
      </div>
    </div>
  );
}
