import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBrandAccess, writeAuditLog } from "@/lib/utils";

// GET /api/brands/:id
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

  const brand = await prisma.brand.findUnique({
    where: { id: brandId },
    include: {
      memberships: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      _count: { select: { posts: true, strategies: true } },
    },
  });

  if (!brand) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(brand);
}

// PATCH /api/brands/:id
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  const { brandId } = await params;
  let actor;
  try {
    actor = await requireBrandAccess(brandId, ["ADMIN", "BRAND_MANAGER"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    // Guard: publishingMode toggle requires ADMIN
    if (body.publishingMode && actor.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only Admin can toggle publishing mode" },
        { status: 403 }
      );
    }

    const updated = await prisma.brand.update({
      where: { id: brandId },
      data: {
        ...body,
        keyDifferentiators: body.keyDifferentiators
          ? JSON.stringify(body.keyDifferentiators)
          : undefined,
        targetAudience: body.targetAudience
          ? JSON.stringify(body.targetAudience)
          : undefined,
        mainProducts: body.mainProducts
          ? JSON.stringify(body.mainProducts)
          : undefined,
      },
    });

    if (body.publishingMode) {
      await writeAuditLog("PUBLISH_MODE_CHANGED", {
        brandId,
        actorUserId: actor.userId,
        metadata: { newMode: body.publishingMode },
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[UPDATE_BRAND]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
