import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBrandAccess } from "@/lib/utils";

// GET /api/brands/:brandId/jobs — list recent/active jobs for a brand
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

  const jobs = await prisma.job.findMany({
    where: {
      brandId,
      OR: [
        { status: { in: ["PENDING", "RUNNING"] } },
        {
          status: { in: ["DONE", "FAILED"] },
          updatedAt: { gte: new Date(Date.now() - 10 * 60 * 1000) }, // last 10 min
        },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return NextResponse.json(
    jobs.map((j) => ({
      id: j.id,
      brandId: j.brandId,
      type: j.type,
      status: j.status,
      progressPct: j.progressPct,
      currentStep: j.currentStep,
      steps: j.steps ? JSON.parse(j.steps) : [],
      resultId: j.resultId,
      errorMessage: j.errorMessage,
      createdAt: j.createdAt,
      updatedAt: j.updatedAt,
    }))
  );
}
