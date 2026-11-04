import { get, set, del } from "idb-keyval";
import { useState, useEffect, useCallback } from "react";

const QUEUE_KEY = "vernacular_offline_catalog_queue";
const ACTIONS_QUEUE_KEY = "vernacular_offline_actions_queue";

export interface QueuedImage {
  name: string;
  type: string;
  base64: string;
}

export interface QueuedAudio {
  name: string;
  type: string;
  base64: string;
}

export interface QueuedListing {
  id: string;
  artisanId: string;
  images: QueuedImage[];
  audio?: QueuedAudio;
  notes?: string;
  language: string;
  timestamp: number;
  manualPrice?: number | null;
  stockQuantity?: number | null;
  estimatedWeavingDays?: number | null;
}

export interface QueuedOfflineAction {
  id: string;
  type: "UPDATE_PROFILE" | "DELETE_PRODUCT" | "UPDATE_STOCK" | "GENERIC_API";
  endpoint: string;
  method: "PATCH" | "POST" | "PUT" | "DELETE";
  payload: Record<string, unknown>;
  artisanId?: string;
  timestamp: number;
  description: string;
}

// Check if client is currently offline
export const isOffline = (): boolean => {
  return typeof navigator !== "undefined" ? !navigator.onLine : false;
};

// Convert File / Blob to Base64 data URL
export const fileToBase64 = (file: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

// Convert Base64 data URL back to Blob / File
export const base64ToFile = (base64Data: string, filename: string, mimeType: string): File => {
  const arr = base64Data.split(",");
  const bstr = atob(arr[1] || arr[0]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mimeType });
};

// Retrieve current queued listings from IndexedDB
export const getOfflineQueue = async (): Promise<QueuedListing[]> => {
  try {
    const queue = await get<QueuedListing[]>(QUEUE_KEY);
    return queue || [];
  } catch (err) {
    console.error("Failed to read offline queue from IndexedDB:", err);
    return [];
  }
};

// Save a new listing to IndexedDB
export const enqueueListing = async (listing: QueuedListing): Promise<void> => {
  try {
    const queue = await getOfflineQueue();
    queue.push(listing);
    await set(QUEUE_KEY, queue);
  } catch (err) {
    console.error("Failed to enqueue listing:", err);
  }
};

// Remove a synced listing from IndexedDB
export const dequeueListing = async (id: string): Promise<void> => {
  try {
    const queue = await getOfflineQueue();
    const filtered = queue.filter((item) => item.id !== id);
    await set(QUEUE_KEY, filtered);
  } catch (err) {
    console.error("Failed to dequeue listing:", err);
  }
};

// Clear entire queue
export const clearOfflineQueue = async (): Promise<void> => {
  try {
    await del(QUEUE_KEY);
  } catch (err) {
    console.error("Failed to clear offline queue:", err);
  }
};

// Synchronize all queued listings to FastAPI backend
export const syncOfflineQueue = async (
  token?: string | null
): Promise<{ synced: number; failed: number }> => {
  const queue = await getOfflineQueue();
  if (!queue.length) return { synced: 0, failed: 0 };

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
  let synced = 0;
  let failed = 0;

  for (const item of queue) {
    try {
      const formData = new FormData();
      formData.append("artisan_id", item.artisanId);
      formData.append("language", item.language || "en");
      if (item.notes) {
        formData.append("notes", item.notes);
      }
      if (item.manualPrice) {
        formData.append("manual_price", item.manualPrice.toString());
      }
      if (item.stockQuantity) {
        formData.append("stock_quantity", item.stockQuantity.toString());
      }
      if (item.estimatedWeavingDays) {
        formData.append("estimated_weaving_days", item.estimatedWeavingDays.toString());
      }

      // Reconstitute images
      item.images.forEach((img, i) => {
        const file = base64ToFile(img.base64, img.name || `photo_${i}.jpg`, img.type || "image/jpeg");
        formData.append("images", file);
      });

      // Reconstitute audio
      if (item.audio) {
        const audioFile = base64ToFile(
          item.audio.base64,
          item.audio.name || "voice_story.webm",
          item.audio.type || "audio/webm"
        );
        formData.append("audio", audioFile);
      }

      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`${backendUrl}/api/v1/products/generate`, {
        method: "POST",
        headers,
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      // Dequeue on success
      await dequeueListing(item.id);
      synced++;
    } catch (err) {
      console.error(`Sync failed for offline listing ${item.id}:`, err);
      failed++;
    }
  }

  return { synced, failed };
};

// ── Global Offline Actions Queue (Settings, WhatsApp, Stock, Deletions) ──

export const getOfflineActionsQueue = async (): Promise<QueuedOfflineAction[]> => {
  try {
    const queue = await get<QueuedOfflineAction[]>(ACTIONS_QUEUE_KEY);
    return queue || [];
  } catch (err) {
    console.error("Failed to read offline actions from IndexedDB:", err);
    return [];
  }
};

export const enqueueOfflineAction = async (
  action: Omit<QueuedOfflineAction, "id" | "timestamp">
): Promise<void> => {
  try {
    const queue = await getOfflineActionsQueue();
    const item: QueuedOfflineAction = {
      ...action,
      id: "act_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      timestamp: Date.now(),
    };
    queue.push(item);
    await set(ACTIONS_QUEUE_KEY, queue);
  } catch (err) {
    console.error("Failed to enqueue offline action:", err);
  }
};

export const dequeueOfflineAction = async (id: string): Promise<void> => {
  try {
    const queue = await getOfflineActionsQueue();
    const filtered = queue.filter((item) => item.id !== id);
    await set(ACTIONS_QUEUE_KEY, filtered);
  } catch (err) {
    console.error("Failed to dequeue offline action:", err);
  }
};

export const syncOfflineActions = async (
  token?: string | null
): Promise<{ synced: number; failed: number }> => {
  const queue = await getOfflineActionsQueue();
  if (!queue.length) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;

  for (const item of queue) {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(item.endpoint, {
        method: item.method,
        headers,
        body: item.payload ? JSON.stringify(item.payload) : undefined,
      });

      if (res.ok) {
        await dequeueOfflineAction(item.id);
        synced++;
      } else {
        if (res.status >= 500) {
          failed++;
        } else {
          // If 4xx client error, discard
          await dequeueOfflineAction(item.id);
        }
      }
    } catch (err) {
      console.warn(`Sync failed for offline action ${item.id}:`, err);
      failed++;
    }
  }

  return { synced, failed };
};

// Global intercept helper for buttons/forms
export const handleOfflineIntercept = async (
  action: Omit<QueuedOfflineAction, "id" | "timestamp">,
  onIntercepted?: (message: string) => void
): Promise<boolean> => {
  if (isOffline()) {
    await enqueueOfflineAction(action);
    const msg = "Saved offline. Will sync when internet returns.";
    if (onIntercepted) onIntercepted(msg);
    return true;
  }
  return false;
};

// React Hook for Offline State & Auto-Sync
export const useOfflineSync = (
  token?: string | null,
  onSyncComplete?: (result: { synced: number; failed: number }) => void
) => {
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [queueCount, setQueueCount] = useState<number>(0);
  const [isQueueLoading, setIsQueueLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncResult, setLastSyncResult] = useState<{ synced: number; failed: number } | null>(null);

  // Refresh current queue length non-blockingly (combines catalog drafts + action queue)
  const refreshQueueCount = useCallback(async () => {
    try {
      const [catalogQueue, actionsQueue] = await Promise.all([
        getOfflineQueue(),
        getOfflineActionsQueue(),
      ]);
      setQueueCount(catalogQueue.length + actionsQueue.length);
    } catch {
      setQueueCount(0);
    } finally {
      setIsQueueLoading(false);
    }
  }, []);

  // Sync execution handler (flushes both catalog drafts and offline actions)
  const triggerSync = useCallback(async () => {
    if (!navigator.onLine || isSyncing) return;
    setIsSyncing(true);
    try {
      const [catalogRes, actionsRes] = await Promise.all([
        syncOfflineQueue(token),
        syncOfflineActions(token),
      ]);
      const totalSynced = catalogRes.synced + actionsRes.synced;
      const totalFailed = catalogRes.failed + actionsRes.failed;
      const result = { synced: totalSynced, failed: totalFailed };

      setLastSyncResult(result);
      await refreshQueueCount();
      if (result && result.synced > 0) {
        onSyncComplete?.(result);
      }
      return result;
    } finally {
      setIsSyncing(false);
    }
  }, [token, isSyncing, refreshQueueCount, onSyncComplete]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Decouple IndexedDB reads: schedule after initial component mount & first paint
    let idleHandle: number | null = null;
    let timerHandle: ReturnType<typeof setTimeout> | null = null;

    if (typeof window.requestIdleCallback === "function") {
      idleHandle = window.requestIdleCallback(() => {
        refreshQueueCount();
      }, { timeout: 1200 });
    } else {
      timerHandle = setTimeout(() => {
        refreshQueueCount();
      }, 50);
    }

    const handleOnline = () => {
      setIsOnline(true);
      // Auto flush queue when connectivity resumes
      triggerSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      if (idleHandle !== null && typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleHandle);
      }
      if (timerHandle !== null) {
        clearTimeout(timerHandle);
      }
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [triggerSync, refreshQueueCount]);

  return {
    isOnline,
    queueCount,
    isQueueLoading,
    isSyncing,
    lastSyncResult,
    refreshQueueCount,
    triggerSync,
  };
};
