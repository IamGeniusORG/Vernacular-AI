import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export async function GET() {
  const start = Date.now();
  let backendStatus = "unknown";
  let backendLatency = 0;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(`${API_BASE}/health`, {
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    backendLatency = Date.now() - start;
    backendStatus = res.ok ? "online" : `status_${res.status}`;
  } catch (e: unknown) {
    const err = e instanceof Error ? e.message : "unreachable";
    backendStatus = `offline (${err})`;
    backendLatency = Date.now() - start;
  }

  return NextResponse.json(
    {
      status: "healthy",
      service: "vernacular-ai-frontend",
      timestamp: new Date().toISOString(),
      backend: {
        url: API_BASE,
        status: backendStatus,
        latency_ms: backendLatency,
      },
    },
    { status: 200 }
  );
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
