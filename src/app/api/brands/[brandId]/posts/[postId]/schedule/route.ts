import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBrandAccess, writeAuditLog } from "@/lib/utils";
import { z } from "zod";

const scheduleSchema = z.object({
  scheduledTime: z.string().datetime(),
});

// PATCH /api/brands/:brandId/posts/:postId/schedule
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ brandId: string; postId: string }> }
) {
  const { brandId, postId } = await params;
  let actor;
  try {
    actor = await requireBrandAccess(brandId, ["ADMIN", "BRAND_MANAGER"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = scheduleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid scheduledTime" }, { status: 400 });
  }

  const post = await prisma.post.findUnique({ where: { id: postId, brandId } });
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  if (post.status !== "APPROVED") {
    return NextResponse.json(
      { error: "Post must be APPROVED before scheduling" },
      { status: 422 }
    );
  }

  const updated = await prisma.post.update({
    where: { id: postId },
    data: {
      scheduledTime: new Date(parsed.data.scheduledTime),
      status: "SCHEDULED",
    },
  });

  await writeAuditLog("POST_SCHEDULED", {
    brandId,
    actorUserId: actor.userId,
    metadata: { postId, scheduledTime: parsed.data.scheduledTime },
  });

  return NextResponse.json(updated);
}
