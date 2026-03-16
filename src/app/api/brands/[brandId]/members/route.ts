import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBrandAccess, writeAuditLog } from "@/lib/utils";
import { z } from "zod";

const addMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN", "BRAND_MANAGER", "CREATOR"]),
});

// GET /api/brands/:brandId/members
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  const { brandId } = await params;
  try {
    await requireBrandAccess(brandId, ["ADMIN", "BRAND_MANAGER"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const members = await prisma.brandMembership.findMany({
    where: { brandId },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
  });

  return NextResponse.json(members);
}

// POST /api/brands/:brandId/members — add member by email
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  const { brandId } = await params;
  let actor;
  try {
    actor = await requireBrandAccess(brandId, ["ADMIN"]);
  } catch {
    return NextResponse.json({ error: "Only Admin can manage members" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = addMemberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const targetUser = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!targetUser) {
    return NextResponse.json({ error: "User not found — they must register first" }, { status: 404 });
  }

  const membership = await prisma.brandMembership.upsert({
    where: { userId_brandId: { userId: targetUser.id, brandId } },
    update: { role: parsed.data.role },
    create: { userId: targetUser.id, brandId, role: parsed.data.role },
  });

  await writeAuditLog("MEMBER_ADDED", {
    brandId,
    actorUserId: actor.userId,
    metadata: { targetUserId: targetUser.id, role: parsed.data.role },
  });

  return NextResponse.json(membership);
}

// DELETE /api/brands/:brandId/members?userId=xxx
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  const { brandId } = await params;
  let actor;
  try {
    actor = await requireBrandAccess(brandId, ["ADMIN"]);
  } catch {
    return NextResponse.json({ error: "Only Admin can manage members" }, { status: 403 });
  }

  const targetUserId = req.nextUrl.searchParams.get("userId");
  if (!targetUserId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  await prisma.brandMembership.deleteMany({
    where: { userId: targetUserId, brandId },
  });

  await writeAuditLog("MEMBER_REMOVED", {
    brandId,
    actorUserId: actor.userId,
    metadata: { targetUserId },
  });

  return NextResponse.json({ success: true });
}
