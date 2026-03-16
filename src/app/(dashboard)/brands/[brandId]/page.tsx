import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { getUserBrandRole, safeJson } from "@/lib/utils";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import GenerateStrategyButton from "./GenerateStrategyButton";
import GenerateContentButton from "./GenerateContentButton";
import { ActiveJobsPanel } from "@/components/ui/active-jobs-panel";
import {
  ShieldCheck, Zap, FileText, CheckCircle, Clock, AlertTriangle,
  TrendingUp, BarChart3, Settings, Users, Globe,
} from "lucide-react";

export default async function BrandDetailPage({
  params,
}: {
  params: Promise<{ brandId: string }>;
}) {
  const { brandId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [brand, role] = await Promise.all([
    prisma.brand.findUnique({
      where: { id: brandId },
      include: {
        memberships: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        strategies: {
          where: { isActive: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        _count: { select: { posts: true, strategies: true } },
      },
    }),
    getUserBrandRole(session.user.id, brandId),
  ]);

  if (!brand || !role) notFound();

  const postStats = await prisma.post.groupBy({
    by: ["status"],
    where: { brandId },
    _count: true,
  });
  const sm = Object.fromEntries(postStats.map((s) => [s.status, s._count]));

  const activeStrategy = brand.strategies[0];
  const canManage = role === "ADMIN" || role === "BRAND_MANAGER";

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <ActiveJobsPanel brandId={brandId} />
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-2xl font-bold shadow-sm">
            {brand.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{brand.name}</h1>
              {brand.publishingMode === "DRAFT_ONLY" ? (
                <Badge variant="secondary" className="gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Draft Only
                </Badge>
              ) : (
                <Badge variant="warning" className="gap-1">
                  <Zap className="h-3.5 w-3.5" />
                  Live Publishing ON
                </Badge>
              )}
              <Badge variant="outline">{role}</Badge>
            </div>
            {brand.industry && <p className="text-indigo-600 text-sm font-medium mt-0.5">{brand.industry}</p>}
            {brand.websiteUrl && (
              <a href={brand.websiteUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-500 mt-1">
                <Globe className="h-3 w-3" />
                {brand.websiteUrl}
              </a>
            )}
          </div>
        </div>
        {canManage && (
          <Link href={`/brands/${brandId}/settings`}>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4" />
              Settings
            </Button>
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
        {[
          { label: "Total Posts", value: brand._count.posts, icon: FileText, color: "text-indigo-600", bg: "bg-indigo-50" },
          { label: "Draft", value: sm["DRAFT"] ?? 0, icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Approved", value: sm["APPROVED"] ?? 0, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Scheduled", value: sm["SCHEDULED"] ?? 0, icon: Clock, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Published", value: (sm["PUBLISHED"] ?? 0) + (sm["SIMULATED_PUBLISHED"] ?? 0), icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-50" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center mb-2`}>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <p className="text-xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Quick actions */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {canManage && (
                <GenerateStrategyButton brandId={brandId} />
              )}
              {canManage && activeStrategy && (
                <GenerateContentButton brandId={brandId} />
              )}
              <Link href={`/brands/${brandId}/content`} className="block">
                <Button variant="outline" className="w-full justify-start">
                  <BarChart3 className="h-4 w-4" />
                  View Content Calendar
                </Button>
              </Link>
              <Link href={`/brands/${brandId}/review`} className="block">
                <Button variant="outline" className="w-full justify-start">
                  <CheckCircle className="h-4 w-4" />
                  Review Queue
                  {(sm["DRAFT"] ?? 0) + (sm["PENDING_REVIEW"] ?? 0) > 0 && (
                    <span className="ml-auto bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full">
                      {(sm["DRAFT"] ?? 0) + (sm["PENDING_REVIEW"] ?? 0)}
                    </span>
                  )}
                </Button>
              </Link>
              {role === "ADMIN" && (
                <Link href={`/brands/${brandId}/members`} className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="h-4 w-4" />
                    Team Members
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>

          {/* Channels */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Channels</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {brand.usesFacebook && <ChannelBadge label="Facebook" active={brand.metaConnected} />}
              {brand.usesInstagram && <ChannelBadge label="Instagram" active={brand.metaConnected} />}
              {brand.usesGoogleAds && <ChannelBadge label="Google Ads" active={brand.googleAdsConnected} />}
            </CardContent>
          </Card>
        </div>

        {/* Right: Brand overview + strategy */}
        <div className="lg:col-span-2 space-y-4">
          {/* Brand overview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Brand Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {brand.overview && (
                <p className="text-sm text-gray-600">{brand.overview}</p>
              )}
              {brand.keyDifferentiators && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Key Differentiators</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(safeJson(brand.keyDifferentiators) as string[])?.map((d, i) => (
                      <span key={i} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs">{d}</span>
                    ))}
                  </div>
                </div>
              )}
              {brand.toneOfVoice && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Tone of Voice</p>
                  <p className="text-sm text-gray-600">{brand.toneOfVoice}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active strategy */}
          {activeStrategy ? (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Active Strategy</CardTitle>
                  <Link href={`/brands/${brandId}/strategy`}>
                    <Button variant="ghost" size="sm">View full →</Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <p className="font-medium text-gray-900 mb-2">{activeStrategy.title}</p>
                {activeStrategy.positioning && (
                  <p className="text-sm text-gray-500 mb-3">{activeStrategy.positioning}</p>
                )}
                {activeStrategy.contentPillars && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Content Pillars</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(safeJson(activeStrategy.contentPillars) as Array<{ name: string; percentage: number }>)?.map((p, i) => (
                        <span key={i} className="px-2.5 py-1 bg-purple-50 text-purple-700 rounded-full text-xs">
                          {p.name} ({p.percentage}%)
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <BarChart3 className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="font-medium text-gray-600">No strategy yet</p>
                <p className="text-sm text-gray-400 mt-1">Generate a marketing strategy to get started</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function ChannelBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
      {label} {active ? "✓" : "Not connected"}
    </span>
  );
}
