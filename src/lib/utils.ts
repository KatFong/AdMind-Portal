import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function safeJson(value: string | null | undefined): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export function toJsonString(value: unknown): string {
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

// ─── Brand permissions ────────────────────────────────────────────────────────

export type BrandRole = "ADMIN" | "BRAND_MANAGER" | "CREATOR";

export async function getUserBrandRole(
  userId: string,
  brandId: string
): Promise<BrandRole | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user?.isSuperAdmin) return "ADMIN";

  const membership = await prisma.brandMembership.findUnique({
    where: { userId_brandId: { userId, brandId } },
  });
  return (membership?.role as BrandRole) ?? null;
}

export async function requireBrandAccess(
  brandId: string,
  requiredRoles: BrandRole[] = ["ADMIN", "BRAND_MANAGER", "CREATOR"]
): Promise<{ userId: string; role: BrandRole }> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("UNAUTHORIZED");
  }
  const role = await getUserBrandRole(session.user.id, brandId);
  if (!role || !requiredRoles.includes(role)) {
    throw new Error("FORBIDDEN");
  }
  return { userId: session.user.id, role };
}

// ─── Audit logging ────────────────────────────────────────────────────────────

export async function writeAuditLog(
  actionType: string,
  opts: { brandId?: string; actorUserId?: string; metadata?: object }
) {
  await prisma.auditLog.create({
    data: {
      actionType,
      brandId: opts.brandId,
      actorUserId: opts.actorUserId,
      metadata: opts.metadata ? JSON.stringify(opts.metadata) : undefined,
    },
  });
}

// ─── Safe mode check ─────────────────────────────────────────────────────────

export async function isBrandInDraftMode(brandId: string): Promise<boolean> {
  const brand = await prisma.brand.findUnique({ where: { id: brandId } });
  return !brand || brand.publishingMode !== "REAL_ALLOWED";
}
