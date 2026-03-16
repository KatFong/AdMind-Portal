import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    // Note: connection_limit is managed by Neon's pgBouncer pooler via DATABASE_URL
  });

// Reuse the same instance across hot-reloads in development
// In production (Vercel), each serverless function gets its own instance
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
