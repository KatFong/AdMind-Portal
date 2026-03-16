import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Check if admin exists
  const existing = await prisma.user.findUnique({
    where: { email: "admin@admind.io" },
  });

  if (existing) {
    console.log("✅ Admin user already exists");
    return;
  }

  // Create super admin
  const admin = await prisma.user.create({
    data: {
      name: "Admin",
      email: "admin@admind.io",
      passwordHash: await bcrypt.hash("admin123!", 12),
      isSuperAdmin: true,
    },
  });

  console.log(`✅ Created super admin: ${admin.email} (password: admin123!)`);

  // Create a sample brand
  const brand = await prisma.brand.create({
    data: {
      name: "Bloom Coffee",
      websiteUrl: "https://example.com",
      industry: "F&B",
      overview: "A specialty coffee shop in Hong Kong focusing on single-origin beans and warm hospitality.",
      keyDifferentiators: JSON.stringify(["Single-origin beans", "Sustainable sourcing", "Latte art mastery"]),
      targetAudience: JSON.stringify({
        demographics: "Adults 25-40, professionals and creatives",
        geographics: "Hong Kong, Wan Chai and Central districts",
        painPoints: ["Hard to find quality coffee", "Generic chain coffee shops", "Want a cozy workspace"],
      }),
      mainProducts: JSON.stringify(["Espresso-based drinks", "Pour-over coffee", "Homemade pastries"]),
      toneOfVoice: "Warm, knowledgeable, community-focused",
      language: "MIXED",
      usesFacebook: true,
      usesInstagram: true,
      usesGoogleAds: false,
      monthlyBudget: 8000,
      postingFrequencyPerWeek: 3,
      publishingMode: "DRAFT_ONLY",
      createdByUserId: admin.id,
    },
  });

  // Add admin as brand manager
  await prisma.brandMembership.create({
    data: {
      userId: admin.id,
      brandId: brand.id,
      role: "ADMIN",
    },
  });

  // Log creation
  await prisma.auditLog.create({
    data: {
      actionType: "BRAND_CREATED",
      brandId: brand.id,
      actorUserId: admin.id,
      metadata: JSON.stringify({ brandName: brand.name, note: "Seeded sample brand" }),
    },
  });

  console.log(`✅ Created sample brand: ${brand.name} (${brand.id})`);
  console.log("\n🚀 Ready! Login at http://localhost:3000/login");
  console.log("   Email: admin@admind.io");
  console.log("   Password: admin123!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
