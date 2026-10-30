import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://vernacular-ai-mw9i.onrender.com";

export async function GET() {
  const start = Date.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000); // Allow up to 60s for cold start
    const res = await fetch(`${API_BASE}/health`, {
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeout);

    return NextResponse.json({
      warmed: true,
      backend_status: res.status,
      elapsed_ms: Date.now() - start,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Warmup timeout";
    return NextResponse.json(
      {
        warmed: false,
        error: message,
        elapsed_ms: Date.now() - start,
      },
      { status: 504 }
    );
  }
}
