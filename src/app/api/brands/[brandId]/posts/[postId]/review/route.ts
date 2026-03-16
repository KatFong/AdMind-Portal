import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBrandAccess, writeAuditLog } from "@/lib/utils";
import { z } from "zod";

const reviewSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  comments: z.string().optional(),
});

// POST /api/brands/:brandId/posts/:postId/review
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ brandId: string; postId: string }> }
) {
  const { brandId, postId } = await params;
  let actor;
  try {
    actor = await requireBrandAccess(brandId, ["ADMIN", "BRAND_MANAGER"]);
  } catch {
    return NextResponse.json({ error: "Unauthorized — only Brand Manager or Admin can review" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const post = await prisma.post.findUnique({
    where: { id: postId, brandId },
    include: { variations: true },
  });

  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  const { action, comments } = parsed.data;

  if (action === "APPROVE") {
    await prisma.post.update({
      where: { id: postId },
      data: {
        status: "APPROVED",
        approvedByUserId: actor.userId,
        approvedAt: new Date(),
        rejectedReason: null,
      },
    });

    await prisma.postReview.create({
      data: { postId, reviewerId: actor.userId, action: "APPROVE", comments },
    });

    await writeAuditLog("POST_APPROVED", {
      brandId,
      actorUserId: actor.userId,
      metadata: { postId },
    });

    return NextResponse.json({ success: true, status: "APPROVED" });
  }

  if (action === "REJECT") {
    await prisma.post.update({
      where: { id: postId },
      data: {
        status: "REJECTED",
        rejectedReason: comments,
        approvedByUserId: null,
        approvedAt: null,
      },
    });

    await prisma.postReview.create({
      data: { postId, reviewerId: actor.userId, action: "REJECT", comments },
    });

    await writeAuditLog("POST_REJECTED", {
      brandId,
      actorUserId: actor.userId,
      metadata: { postId, reason: comments },
    });

    // AI regenerates a revision based on feedback (lazy import to reduce cold start)
    if (comments) {
      try {
        const { chat } = await import("@/lib/ai");
        const revisionPrompt = `以下社交媒體貼文被退回，附有修改意見，請根據意見重新撰寫：

修改意見：「${comments}」

原版 Facebook 文案：
${post.captionFacebook}

原版 Instagram 文案：
${post.captionInstagram}

請生成改善版本，確保解決上述修改意見。
以繁體中文撰寫文案。imagePrompts 請用英文（供 AI 圖像生成工具使用）。
回傳 JSON 格式：
{
  "captionFacebook": "改善後的 Facebook 文案（含吸引開頭、內文、CTA、hashtags）",
  "captionInstagram": "改善後的 Instagram 文案",
  "imagePrompts": ["English image prompt 1", "English image prompt 2"]
}`;

        const aiResponse = await chat(
          "你是一位創意社交媒體文案撰寫師。請根據修改意見重新撰寫貼文，以繁體中文撰寫文案，imagePrompts 用英文。只回傳有效 JSON。",
          revisionPrompt,
          { json: true }
        );

        const revision = JSON.parse(aiResponse);

        // Add as a new variation
        const existingVariations = await prisma.postVariation.count({ where: { postId } });
        await prisma.postVariation.create({
          data: {
            postId,
            label: `revision-${existingVariations + 1}`,
            captionFacebook: revision.captionFacebook,
            captionInstagram: revision.captionInstagram,
            imagePrompts: revision.imagePrompts ? JSON.stringify(revision.imagePrompts) : null,
            status: "CANDIDATE",
            feedback: comments,
          },
        });

        // Update post status to DRAFT for re-review
        await prisma.post.update({
          where: { id: postId },
          data: {
            status: "DRAFT",
            captionFacebook: revision.captionFacebook,
            captionInstagram: revision.captionInstagram,
            imagePrompts: revision.imagePrompts ? JSON.stringify(revision.imagePrompts) : null,
          },
        });

        return NextResponse.json({ success: true, status: "DRAFT", aiRevision: true });
      } catch (error) {
        console.error("[AI_REVISION]", error);
        return NextResponse.json({ success: true, status: "REJECTED", aiRevision: false });
      }
    }

    return NextResponse.json({ success: true, status: "REJECTED" });
  }
}
