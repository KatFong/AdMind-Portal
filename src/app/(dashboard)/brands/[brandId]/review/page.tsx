import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { getUserBrandRole } from "@/lib/utils";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle, Clock } from "lucide-react";
import PostCard from "../content/PostCard";

export default async function ReviewQueuePage({ params }: { params: Promise<{ brandId: string }> }) {
  const { brandId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const role = await getUserBrandRole(session.user.id, brandId);
  if (!role) notFound();

  const brand = await prisma.brand.findUnique({
    where: { id: brandId },
    select: { name: true },
  });
  if (!brand) notFound();

  const canApprove = role === "ADMIN" || role === "BRAND_MANAGER";

  const pendingPosts = await prisma.post.findMany({
    where: {
      brandId,
      status: { in: ["DRAFT", "PENDING_REVIEW"] },
    },
    include: {
      variations: true,
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { reviewer: { select: { name: true } } },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const scheduledPosts = await prisma.post.findMany({
    where: { brandId, status: "SCHEDULED" },
    include: {
      variations: true,
      reviews: { orderBy: { createdAt: "desc" }, take: 1, include: { reviewer: { select: { name: true } } } },
    },
    orderBy: { scheduledTime: "asc" },
  });

  const recentHistory = await prisma.postReview.findMany({
    where: { post: { brandId } },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      post: { select: { theme: true, weekNumber: true } },
      reviewer: { select: { name: true } },
    },
  });

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <Link href={`/brands/${brandId}`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft className="h-4 w-4" />
          Back to {brand.name}
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Review Queue</h1>
            <p className="text-gray-500 mt-1">
              {pendingPosts.length} item{pendingPosts.length !== 1 ? "s" : ""} need{pendingPosts.length === 1 ? "s" : ""} review
            </p>
          </div>
        </div>
      </div>

      {/* Pending */}
      <section className="mb-10">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-400" />
          Pending Review ({pendingPosts.length})
        </h2>
        {pendingPosts.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center">
              <CheckCircle className="h-10 w-10 text-emerald-300 mx-auto mb-3" />
              <p className="font-medium text-gray-600">All caught up!</p>
              <p className="text-sm text-gray-400 mt-1">No posts need review right now</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingPosts.map((post) => (
              <PostCard key={post.id} post={post} brandId={brandId} canApprove={canApprove} />
            ))}
          </div>
        )}
      </section>

      {/* Scheduled */}
      {scheduledPosts.length > 0 && (
        <section className="mb-10">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-600" />
            Scheduled ({scheduledPosts.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {scheduledPosts.map((post) => (
              <PostCard key={post.id} post={post} brandId={brandId} canApprove={canApprove} />
            ))}
          </div>
        </section>
      )}

      {/* Approval History */}
      {recentHistory.length > 0 && (
        <section>
          <h2 className="font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-2">
            {recentHistory.map((review) => (
              <div key={review.id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200 text-sm">
                <Badge variant={review.action === "APPROVE" ? "success" : "destructive"}>
                  {review.action === "APPROVE" ? "Approved" : "Rejected"}
                </Badge>
                <span className="text-gray-700">
                  {review.post.theme ?? `Week ${review.post.weekNumber}`}
                </span>
                <span className="text-gray-400 ml-auto text-xs">
                  by {review.reviewer.name} · {new Date(review.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
