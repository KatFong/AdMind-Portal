import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { getUserBrandRole } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import PublishingModeToggle from "./PublishingModeToggle";
import MetaConnectionForm from "./MetaConnectionForm";
import MembersSection from "./MembersSection";

export default async function BrandSettingsPage({
  params,
}: {
  params: Promise<{ brandId: string }>;
}) {
  const { brandId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const role = await getUserBrandRole(session.user.id, brandId);
  if (!role || role === "CREATOR") {
    redirect(`/brands/${brandId}`);
  }

  const brand = await prisma.brand.findUnique({
    where: { id: brandId },
    include: {
      memberships: {
        include: { user: { select: { id: true, name: true, email: true, image: true } } },
      },
    },
  });
  if (!brand) notFound();

  const isAdmin = role === "ADMIN";

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <Link href={`/brands/${brandId}`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft className="h-4 w-4" />
          Back to {brand.name}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Brand Settings</h1>
        <p className="text-gray-500 mt-1">Manage connections, publishing mode, and team members</p>
      </div>

      <div className="space-y-6">
        {/* Publishing Mode Toggle */}
        {isAdmin && (
          <PublishingModeToggle
            brandId={brandId}
            brandName={brand.name}
            currentMode={brand.publishingMode}
          />
        )}

        {/* Meta Connection */}
        <MetaConnectionForm
          brandId={brandId}
          metaConnected={brand.metaConnected}
          metaPageId={brand.metaPageId ?? ""}
          instagramBusinessId={brand.instagramBusinessId ?? ""}
          isAdmin={isAdmin}
        />

        {/* Team Members */}
        <MembersSection
          brandId={brandId}
          members={brand.memberships}
          isAdmin={isAdmin}
          currentUserId={session.user.id}
        />
      </div>
    </div>
  );
}
