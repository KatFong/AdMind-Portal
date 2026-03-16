import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { getUserBrandRole, safeJson } from "@/lib/utils";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Facebook, Instagram, MonitorPlay, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import PostCard from "./PostCard";

export default async function ContentPage({ params }: { params: Promise<{ brandId: string }> }) {
  const { brandId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const role = await getUserBrandRole(session.user.id, brandId);
  if (!role) notFound();

  const brand = await prisma.brand.findUnique({
    where: { id: brandId },
    select: { name: true, publishingMode: true },
  });
  if (!brand) notFound();

  const posts = await prisma.post.findMany({
    where: { brandId },
    include: {
      variations: { orderBy: { createdAt: "asc" } },
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { reviewer: { select: { name: true } } },
      },
    },
    orderBy: [{ weekNumber: "asc" }, { dayOfWeek: "asc" }],
  });

  // Group by week
  const weeks: Record<number, typeof posts> = {};
  for (const post of posts) {
    const week = post.weekNumber ?? 0;
    if (!weeks[week]) weeks[week] = [];
    weeks[week].push(post);
  }

  const weekNumbers = Object.keys(weeks)
    .map(Number)
    .sort((a, b) => a - b);

  const canApprove = role === "ADMIN" || role === "BRAND_MANAGER";

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <Link href={`/brands/${brandId}`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft className="h-4 w-4" />
          Back to {brand.name}
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Content Calendar</h1>
            <p className="text-gray-500 mt-1">{posts.length} posts across {weekNumbers.length} weeks</p>
          </div>
          <div className="flex items-center gap-2">
            {brand.publishingMode === "DRAFT_ONLY" && (
              <Badge variant="secondary" className="text-xs">Draft Only Mode</Badge>
            )}
          </div>
        </div>
      </div>

      {posts.length === 0 ? (
        <Card>
          <CardContent className="p-16 text-center">
            <MonitorPlay className="h-12 w-12 text-gray-200 mx-auto mb-4" />
            <p className="font-medium text-gray-600">No content yet</p>
            <p className="text-sm text-gray-400 mt-1">Generate a strategy first, then create a 4-week content plan</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {weekNumbers.map((weekNum) => (
            <div key={weekNum}>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  {weekNum === 0 ? "Unscheduled Posts" : `Week ${weekNum}`}
                </h2>
                <span className="text-sm text-gray-400">{weeks[weekNum].length} posts</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {weeks[weekNum].map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    brandId={brandId}
                    canApprove={canApprove}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
