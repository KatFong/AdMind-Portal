import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBrandAccess } from "@/lib/utils";
import { processStrategyJob } from "@/lib/jobs";

function isAIReady() {
  const provider = process.env.AI_PROVIDER ?? "openai";
  const keyMap: Record<string, string | undefined> = {
    openai: process.env.OPENAI_API_KEY, perplexity: process.env.PERPLEXITY_API_KEY,
    deepseek: process.env.DEEPSEEK_API_KEY, groq: process.env.GROQ_API_KEY,
    azure: process.env.AZURE_OPENAI_API_KEY,
  };
  const key = keyMap[provider];
  return !!(key && key.length > 10 && !key.startsWith("sk-..."));
}

// GET /api/brands/:id/strategy — list strategies
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  const { brandId } = await params;
  try {
    await requireBrandAccess(brandId, ["ADMIN", "BRAND_MANAGER", "CREATOR"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const strategies = await prisma.marketingStrategy.findMany({
    where: { brandId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(strategies);
}

// POST /api/brands/:id/strategy — kick off background strategy job
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  const { brandId } = await params;
  let actor;
  try {
    actor = await requireBrandAccess(brandId, ["ADMIN", "BRAND_MANAGER"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isAIReady()) {
    return NextResponse.json(
      {
        error: "AI provider not configured. 請在 .env 設定 DEEPSEEK_API_KEY。",
        hint: "設定 AI_PROVIDER=deepseek 及 DEEPSEEK_API_KEY 後重啟 server。",
      },
      { status: 503 }
    );
  }

  const brand = await prisma.brand.findUnique({ where: { id: brandId } });
  if (!brand) return NextResponse.json({ error: "Brand not found" }, { status: 404 });

  // Check if a job is already running for this brand
  const running = await prisma.job.findFirst({
    where: { brandId, type: "GENERATE_STRATEGY", status: { in: ["PENDING", "RUNNING"] } },
  });
  if (running) {
    return NextResponse.json({ jobId: running.id, alreadyRunning: true });
  }

  // Create job record — this is instant
  const job = await prisma.job.create({
    data: {
      brandId,
      type: "GENERATE_STRATEGY",
      status: "PENDING",
      triggeredByUserId: actor.userId,
      currentStep: "等待開始…",
      progressPct: 0,
    },
  });

  // after() runs AFTER the response is sent — continues even if browser navigates away
  after(async () => {
    await processStrategyJob(job.id);
  });

  return NextResponse.json({ jobId: job.id }, { status: 202 });
}
