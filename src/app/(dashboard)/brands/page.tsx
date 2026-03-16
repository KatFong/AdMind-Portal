import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Building2, ShieldCheck, Globe, Zap } from "lucide-react";

export default async function BrandsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const memberships = await prisma.brandMembership.findMany({
    where: { userId: session.user.id },
    include: {
      brand: {
        include: {
          _count: { select: { posts: true, strategies: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Brands</h1>
          <p className="text-gray-500 mt-1">Manage your brand workspaces</p>
        </div>
        <Link href="/brands/new">
          <Button>
            <Plus className="h-4 w-4" />
            New Brand
          </Button>
        </Link>
      </div>

      {memberships.length === 0 ? (
        <div className="text-center py-20">
          <Building2 className="h-16 w-16 text-gray-200 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-600">No brands yet</h2>
          <p className="text-gray-400 mt-1 mb-6">Create your first brand to get started</p>
          <Link href="/brands/new">
            <Button size="lg">
              <Plus className="h-4 w-4" />
              Create Brand
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {memberships.map(({ brand, role }) => (
            <Link key={brand.id} href={`/brands/${brand.id}`}>
              <Card className="hover:shadow-lg transition-all hover:-translate-y-0.5 cursor-pointer h-full">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-lg font-bold shadow-sm">
                      {brand.name.charAt(0)}
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      {brand.publishingMode === "DRAFT_ONLY" ? (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <ShieldCheck className="h-3 w-3" />
                          Draft Only
                        </Badge>
                      ) : (
                        <Badge variant="warning" className="text-xs gap-1">
                          <Zap className="h-3 w-3" />
                          Live Publishing
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">{role}</Badge>
                    </div>
                  </div>

                  <h3 className="font-semibold text-gray-900 text-base mb-1">{brand.name}</h3>
                  {brand.industry && (
                    <p className="text-xs text-indigo-600 font-medium mb-2">{brand.industry}</p>
                  )}
                  {brand.overview && (
                    <p className="text-sm text-gray-500 line-clamp-2 mb-4">{brand.overview}</p>
                  )}

                  <div className="flex items-center gap-3 text-xs text-gray-400 mt-auto">
                    {brand.websiteUrl && (
                      <span className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        Website
                      </span>
                    )}
                    <span>{brand._count.strategies} strategies</span>
                    <span>{brand._count.posts} posts</span>
                  </div>

                  {/* Channels */}
                  <div className="flex gap-1.5 mt-3">
                    {brand.usesFacebook && <ChannelPill label="FB" />}
                    {brand.usesInstagram && <ChannelPill label="IG" />}
                    {brand.usesGoogleAds && <ChannelPill label="Google Ads" />}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function ChannelPill({ label }: { label: string }) {
  return (
    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-medium">
      {label}
    </span>
  );
}
