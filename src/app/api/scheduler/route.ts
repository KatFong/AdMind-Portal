import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/utils";

// This endpoint is called by a cron job (e.g. Vercel Cron, GitHub Actions, etc.)
// GET /api/scheduler?secret=SCHEDULER_SECRET
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== (process.env.SCHEDULER_SECRET ?? "dev-scheduler")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Find all SCHEDULED posts where scheduledTime has passed
  const duePosts = await prisma.post.findMany({
    where: {
      status: "SCHEDULED",
      scheduledTime: { lte: now },
    },
    include: {
      brand: true,
    },
  });

  const results = [];

  for (const post of duePosts) {
    const { brand } = post;
    const isDraftOnly = brand.publishingMode !== "REAL_ALLOWED";

    const platforms = post.platforms.split(",").filter(Boolean);

    for (const platform of platforms) {
      if (isDraftOnly) {
        // ── SAFE MODE: Simulate publish ───────────────────────────────
        const payload = buildPayload(post, platform);

        await prisma.publishRecord.create({
          data: {
            postId: post.id,
            brandId: brand.id,
            platform,
            mode: "SIMULATED",
            payloadSnapshot: JSON.stringify(payload),
            status: "SUCCESS",
          },
        });

        await writeAuditLog("PUBLISH_SIMULATED", {
          brandId: brand.id,
          metadata: { postId: post.id, platform, payload },
        });

        results.push({ postId: post.id, platform, mode: "SIMULATED", status: "SUCCESS" });
      } else {
        // ── REAL MODE: Call platform API ─────────────────────────────
        const payload = buildPayload(post, platform);

        try {
          let externalId: string | null = null;

          if (platform === "FACEBOOK") {
            externalId = await publishToFacebook(post, brand);
          } else if (platform === "INSTAGRAM") {
            externalId = await publishToInstagram(post, brand);
          } else if (platform === "GOOGLE_ADS") {
            externalId = await exportGoogleAdsAssets(post, brand);
          }

          await prisma.publishRecord.create({
            data: {
              postId: post.id,
              brandId: brand.id,
              platform,
              mode: "REAL",
              payloadSnapshot: JSON.stringify(payload),
              externalId,
              status: "SUCCESS",
            },
          });

          await writeAuditLog("PUBLISH_REAL_ATTEMPT", {
            brandId: brand.id,
            metadata: { postId: post.id, platform, externalId, success: true },
          });

          results.push({ postId: post.id, platform, mode: "REAL", status: "SUCCESS", externalId });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          await prisma.publishRecord.create({
            data: {
              postId: post.id,
              brandId: brand.id,
              platform,
              mode: "REAL",
              payloadSnapshot: JSON.stringify(payload),
              status: "FAILED",
              errorMessage,
            },
          });

          await writeAuditLog("PUBLISH_REAL_ATTEMPT", {
            brandId: brand.id,
            metadata: { postId: post.id, platform, error: errorMessage, success: false },
          });

          results.push({ postId: post.id, platform, mode: "REAL", status: "FAILED", error: errorMessage });
        }
      }
    }

    // Mark post as published/simulated
    const newStatus = isDraftOnly ? "SIMULATED_PUBLISHED" : "PUBLISHED";
    await prisma.post.update({
      where: { id: post.id },
      data: { status: newStatus },
    });
  }

  return NextResponse.json({
    processed: duePosts.length,
    results,
    timestamp: now.toISOString(),
  });
}

// ─── Payload builder ──────────────────────────────────────────────────────────

function buildPayload(post: { captionFacebook?: string | null; captionInstagram?: string | null; imagePrompts?: string | null; googleAdsAssets?: string | null }, platform: string) {
  if (platform === "FACEBOOK") {
    return { message: post.captionFacebook, imagePrompt: post.imagePrompts ? JSON.parse(post.imagePrompts)?.[0] : null };
  }
  if (platform === "INSTAGRAM") {
    return { caption: post.captionInstagram, imagePrompt: post.imagePrompts ? JSON.parse(post.imagePrompts)?.[0] : null };
  }
  if (platform === "GOOGLE_ADS") {
    return post.googleAdsAssets ? JSON.parse(post.googleAdsAssets) : {};
  }
  return {};
}

// ─── Real publishers (only called when publishingMode = REAL_ALLOWED) ─────────

async function publishToFacebook(
  post: { captionFacebook?: string | null },
  brand: { metaPageId?: string | null; metaAccessTokenEncrypted?: string | null }
): Promise<string> {
  if (!brand.metaPageId) throw new Error("Meta Page ID not configured");
  if (!brand.metaAccessTokenEncrypted) throw new Error("Meta access token not configured");

  const { decrypt } = await import("@/lib/encrypt");
  const accessToken = decrypt(brand.metaAccessTokenEncrypted);

  const { default: axios } = await import("axios");
  const response = await axios.post(
    `https://graph.facebook.com/v20.0/${brand.metaPageId}/feed`,
    {
      message: post.captionFacebook,
      access_token: accessToken,
    }
  );

  return response.data.id;
}

async function publishToInstagram(
  post: { captionInstagram?: string | null },
  brand: { instagramBusinessId?: string | null; metaAccessTokenEncrypted?: string | null }
): Promise<string> {
  if (!brand.instagramBusinessId) throw new Error("Instagram Business ID not configured");
  if (!brand.metaAccessTokenEncrypted) throw new Error("Meta access token not configured");

  const { decrypt } = await import("@/lib/encrypt");
  const accessToken = decrypt(brand.metaAccessTokenEncrypted);

  const { default: axios } = await import("axios");

  // Step 1: Create media container
  const containerRes = await axios.post(
    `https://graph.facebook.com/v20.0/${brand.instagramBusinessId}/media`,
    {
      caption: post.captionInstagram,
      media_type: "IMAGE",
      image_url: "https://placeholder.example.com/image.jpg", // real flow: upload image first
      access_token: accessToken,
    }
  );

  // Step 2: Publish container
  const publishRes = await axios.post(
    `https://graph.facebook.com/v20.0/${brand.instagramBusinessId}/media_publish`,
    {
      creation_id: containerRes.data.id,
      access_token: accessToken,
    }
  );

  return publishRes.data.id;
}

async function exportGoogleAdsAssets(
  post: { id: string; googleAdsAssets?: string | null },
  brand: { name: string }
): Promise<string> {
  // Google Ads: export a JSON file with structured ad assets
  // In a real integration, this would call Google Ads API to create a paused campaign
  const assets = post.googleAdsAssets ? JSON.parse(post.googleAdsAssets) : {};
  const exportData = {
    exportedAt: new Date().toISOString(),
    brandName: brand.name,
    postId: post.id,
    adAssets: assets,
    status: "PAUSED", // Never auto-enable
    note: "Import into Google Ads Editor or use API to upload. Status is PAUSED — must be manually enabled.",
  };

  // In production: save to S3/storage and return URL
  // For now, return a string identifier
  return `google-ads-export-${post.id}`;
}
