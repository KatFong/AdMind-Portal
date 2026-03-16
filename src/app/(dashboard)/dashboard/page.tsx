import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Building2, FileText, CheckCircle, Clock, AlertTriangle, Plus, TrendingUp, ShieldCheck,
} from "lucide-react";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;
  const isSuperAdmin = session.user.isSuperAdmin;

  // Fetch brands for this user
  const memberships = await prisma.brandMembership.findMany({
    where: { userId },
    include: {
      brand: {
        include: {
          _count: {
            select: {
              posts: true,
              strategies: true,
            },
          },
        },
      },
    },
  });

  const brands = memberships.map((m) => ({ ...m.brand, userRole: m.role }));

  // Aggregate stats
  const totalBrands = brands.length;

  const postStats = await prisma.post.groupBy({
    by: ["status"],
    where: {
      brandId: { in: brands.map((b) => b.id) },
    },
    _count: true,
  });

  const statsMap = Object.fromEntries(postStats.map((s) => [s.status, s._count]));

  const stats = [
    { label: "Total Brands", value: totalBrands, icon: Building2, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "Posts in Draft", value: (statsMap["DRAFT"] ?? 0) + (statsMap["PENDING_REVIEW"] ?? 0), icon: FileText, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Approved Posts", value: statsMap["APPROVED"] ?? 0, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Scheduled", value: statsMap["SCHEDULED"] ?? 0, icon: Clock, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Published", value: (statsMap["PUBLISHED"] ?? 0) + (statsMap["SIMULATED_PUBLISHED"] ?? 0), icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Needs Review", value: statsMap["PENDING_REVIEW"] ?? 0, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
  ];

  // Recent audit logs
  const recentLogs = await prisma.auditLog.findMany({
    where: isSuperAdmin ? {} : { brandId: { in: brands.map((b) => b.id) } },
    orderBy: { createdAt: "desc" },
    take: 8,
    include: {
      brand: { select: { name: true } },
      actor: { select: { name: true } },
    },
  });

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {session.user.name?.split(" ")[0] ?? "there"} 👋
          </h1>
          <p className="text-gray-500 mt-1">Here's what's happening across your brands</p>
        </div>
        <Link href="/brands/new">
          <Button>
            <Plus className="h-4 w-4" />
            New Brand
          </Button>
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className={`w-9 h-9 ${bg} rounded-lg flex items-center justify-center mb-3`}>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Brands list */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle>Your Brands</CardTitle>
              <Link href="/brands">
                <Button variant="ghost" size="sm">View all</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {brands.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No brands yet</p>
                <Link href="/brands/new">
                  <Button size="sm" className="mt-3">
                    <Plus className="h-3.5 w-3.5" />
                    Add your first brand
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {brands.slice(0, 5).map((brand) => (
                  <Link
                    key={brand.id}
                    href={`/brands/${brand.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold">
                        {brand.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-sm text-gray-900">{brand.name}</p>
                        <p className="text-xs text-gray-400">{brand._count.posts} posts · {brand._count.strategies} strategies</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {brand.publishingMode === "DRAFT_ONLY" ? (
                        <Badge variant="secondary" className="text-xs">
                          <ShieldCheck className="h-3 w-3 mr-1" />
                          Draft Only
                        </Badge>
                      ) : (
                        <Badge variant="warning" className="text-xs">Live</Badge>
                      )}
                      <Badge variant="outline" className="text-xs">{brand.userRole}</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent activity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentLogs.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No activity yet</p>
            ) : (
              <div className="space-y-3">
                {recentLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-indigo-300 mt-1.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-gray-700 font-medium">{formatAction(log.actionType)}</p>
                      <p className="text-xs text-gray-400">
                        {log.brand?.name && <span className="font-medium">{log.brand.name} · </span>}
                        {log.actor?.name ?? "System"} · {formatTime(log.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function formatAction(action: string): string {
  const map: Record<string, string> = {
    BRAND_CREATED: "New brand created",
    POST_GENERATED: "Content plan generated",
    POST_APPROVED: "Post approved",
    POST_REJECTED: "Post rejected",
    PUBLISH_SIMULATED: "Post simulated (draft mode)",
    PUBLISH_REAL_ATTEMPT: "Real publish attempted",
    PUBLISH_MODE_CHANGED: "Publishing mode changed",
    STRATEGY_GENERATED: "Strategy generated",
    MEMBER_ADDED: "Team member added",
    MEMBER_REMOVED: "Team member removed",
    POST_SCHEDULED: "Post scheduled",
  };
  return map[action] ?? action;
}

function formatTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return date.toLocaleDateString();
}
