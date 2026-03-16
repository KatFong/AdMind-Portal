import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Lightweight keep-alive endpoint.
// Call this every 4 minutes via an external cron (e.g. cron-job.org free tier)
// to prevent Neon database cold starts.
// GET /api/ping
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, ts: Date.now() });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
