import { get, set, del } from "idb-keyval";
import { useState, useEffect, useCallback } from "react";

const QUEUE_KEY = "vernacular_offline_catalog_queue";

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
}

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

// React Hook for Offline State & Auto-Sync
export const useOfflineSync = (
  token?: string | null,
  onSyncComplete?: (result: { synced: number; failed: number }) => void
) => {
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [queueCount, setQueueCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncResult, setLastSyncResult] = useState<{ synced: number; failed: number } | null>(null);

  // Refresh current queue length
  const refreshQueueCount = useCallback(async () => {
    const queue = await getOfflineQueue();
    setQueueCount(queue.length);
  }, []);

  // Sync execution handler
  const triggerSync = useCallback(async () => {
    if (!navigator.onLine || isSyncing) return;
    setIsSyncing(true);
    try {
      const result = await syncOfflineQueue(token);
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

    const timer = setTimeout(() => {
      refreshQueueCount();
    }, 0);

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
      clearTimeout(timer);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [triggerSync, refreshQueueCount]);

  return {
    isOnline,
    queueCount,
    isSyncing,
    lastSyncResult,
    refreshQueueCount,
    triggerSync,
  };
};
