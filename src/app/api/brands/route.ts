import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { writeAuditLog } from "@/lib/utils";
import { z } from "zod";

const createBrandSchema = z.object({
  name: z.string().min(1),
  websiteUrl: z.string().url().optional().or(z.literal("")),
  industry: z.string().optional(),
  overview: z.string().optional(),
  keyDifferentiators: z.array(z.string()).optional(),
  targetAudience: z.object({
    demographics: z.string().optional(),
    geographics: z.string().optional(),
    painPoints: z.array(z.string()).optional(),
  }).optional(),
  mainProducts: z.array(z.string()).optional(),
  toneOfVoice: z.string().optional(),
  toneOfVoiceNotes: z.string().optional(),
  language: z.enum(["CANTONESE_TC", "ENGLISH", "MIXED"]).default("MIXED"),
  usesFacebook: z.boolean().default(false),
  usesInstagram: z.boolean().default(false),
  usesGoogleAds: z.boolean().default(false),
  monthlyBudget: z.number().optional(),
  postingFrequencyPerWeek: z.number().int().min(1).max(14).default(2),
});

// GET /api/brands — list brands for current user
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  let brands;
  if (session.user.isSuperAdmin) {
    brands = await prisma.brand.findMany({
      include: {
        memberships: { include: { user: { select: { id: true, name: true, email: true } } } },
        _count: { select: { posts: true, strategies: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  } else {
    brands = await prisma.brand.findMany({
      where: { memberships: { some: { userId } } },
      include: {
        memberships: {
          where: { userId },
          select: { role: true },
        },
        _count: { select: { posts: true, strategies: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  return NextResponse.json(brands);
}

// POST /api/brands — create brand
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = createBrandSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;

    const brand = await prisma.brand.create({
      data: {
        name: data.name,
        websiteUrl: data.websiteUrl || null,
        industry: data.industry,
        overview: data.overview,
        keyDifferentiators: data.keyDifferentiators ? JSON.stringify(data.keyDifferentiators) : null,
        targetAudience: data.targetAudience ? JSON.stringify(data.targetAudience) : null,
        mainProducts: data.mainProducts ? JSON.stringify(data.mainProducts) : null,
        toneOfVoice: data.toneOfVoice,
        toneOfVoiceNotes: data.toneOfVoiceNotes,
        language: data.language,
        usesFacebook: data.usesFacebook,
        usesInstagram: data.usesInstagram,
        usesGoogleAds: data.usesGoogleAds,
        monthlyBudget: data.monthlyBudget,
        postingFrequencyPerWeek: data.postingFrequencyPerWeek,
        publishingMode: "DRAFT_ONLY",
        createdByUserId: session.user.id,
      },
    });

    // Auto-add creator as BRAND_MANAGER (or ADMIN if super admin)
    await prisma.brandMembership.create({
      data: {
        userId: session.user.id,
        brandId: brand.id,
        role: session.user.isSuperAdmin ? "ADMIN" : "BRAND_MANAGER",
      },
    });

    await writeAuditLog("BRAND_CREATED", {
      brandId: brand.id,
      actorUserId: session.user.id,
      metadata: { brandName: brand.name },
    });

    return NextResponse.json(brand, { status: 201 });
  } catch (error) {
    console.error("[CREATE_BRAND]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
