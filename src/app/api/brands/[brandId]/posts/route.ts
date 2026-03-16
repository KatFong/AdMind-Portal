import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBrandAccess } from "@/lib/utils";

// GET /api/brands/:id/posts
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  const { brandId } = await params;
  try {
    await requireBrandAccess(brandId, ["ADMIN", "BRAND_MANAGER", "CREATOR"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const week = searchParams.get("week");

  const posts = await prisma.post.findMany({
    where: {
      brandId,
      ...(status ? { status } : {}),
      ...(week ? { weekNumber: parseInt(week) } : {}),
    },
    include: {
      variations: true,
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { reviewer: { select: { id: true, name: true, email: true } } },
      },
      approver: { select: { id: true, name: true } },
    },
    orderBy: [{ weekNumber: "asc" }, { dayOfWeek: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json(posts);
}
