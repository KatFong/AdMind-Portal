import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBrandAccess, safeJson } from "@/lib/utils";
import { generateStrategyPdf, type StrategyPdfData } from "@/lib/pdf/strategy-pdf";

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

  const [brand, strategy] = await Promise.all([
    prisma.brand.findUnique({ where: { id: brandId }, select: { name: true } }),
    prisma.marketingStrategy.findFirst({
      where: { brandId, isActive: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!brand || !strategy) {
    return NextResponse.json({ error: "Strategy not found" }, { status: 404 });
  }

  const rawData = safeJson(strategy.rawContent) as Record<string, unknown> | null;

  const pdfData: StrategyPdfData = {
    brandName: brand.name,
    strategyTitle: strategy.title ?? "行銷策略報告",
    strategyVersion: strategy.version,
    createdAt: strategy.createdAt.toISOString(),
    positioning: strategy.positioning ?? undefined,
    targetAudience: (safeJson(strategy.targetAudience) as StrategyPdfData["targetAudience"]) ?? undefined,
    valuePropositions: (safeJson(strategy.valuePropositions) as string[]) ?? undefined,
    contentPillars: (safeJson(strategy.contentPillars) as StrategyPdfData["contentPillars"]) ?? undefined,
    channelMix: (safeJson(strategy.channelMix) as StrategyPdfData["channelMix"]) ?? undefined,
    budgetSplit: (safeJson(strategy.budgetSplit) as StrategyPdfData["budgetSplit"]) ?? undefined,
    kpis: (safeJson(strategy.kpis) as string[]) ?? undefined,
    ci: (rawData?.competitiveIntelligence as StrategyPdfData["ci"]) ?? undefined,
  };

  try {
    const pdfBuffer = await generateStrategyPdf(pdfData);
    const filename = `${brand.name.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, "_")}_strategy_v${strategy.version}.pdf`;

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[PDF] Generation failed:", err);
    return NextResponse.json(
      { error: "PDF generation failed", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
