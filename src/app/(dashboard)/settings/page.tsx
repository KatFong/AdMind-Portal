import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Activity, Clock } from "lucide-react";

export default async function GlobalSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const recentLogs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      brand: { select: { name: true } },
      actor: { select: { name: true, email: true } },
    },
  });

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings & Audit Log</h1>
        <p className="text-gray-500 mt-1">System activity and security log</p>
      </div>

      <div className="space-y-6">
        {/* Safety reminder */}
        <div className="flex items-start gap-4 p-5 bg-emerald-50 border border-emerald-200 rounded-xl">
          <Shield className="h-6 w-6 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-emerald-800">System Safety Status</p>
            <p className="text-sm text-emerald-700 mt-1">
              All brands start in <strong>Draft Only mode</strong>. Real publishing to Meta or Google Ads is only possible when:
            </p>
            <ul className="text-sm text-emerald-700 mt-2 space-y-1 list-disc list-inside">
              <li>An Admin explicitly enables "Allow real publishing" for a specific brand</li>
              <li>Valid API credentials are configured for that brand</li>
              <li>The post status is "APPROVED" and has a scheduled time</li>
            </ul>
          </div>
        </div>

        {/* Audit Log */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-indigo-600" />
              Audit Log (last 20 actions)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentLogs.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No activity yet</p>
            ) : (
              <div className="space-y-2">
                {recentLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 text-sm">
                    <div className="w-2 h-2 rounded-full bg-indigo-300 mt-1.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-gray-900">{formatAction(log.actionType)}</span>
                        {log.brand && (
                          <Badge variant="secondary" className="text-xs">{log.brand.name}</Badge>
                        )}
                        {log.actionType === "PUBLISH_MODE_CHANGED" && (
                          <Badge variant="warning" className="text-xs">Security</Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {log.actor ? `${log.actor.name ?? log.actor.email}` : "System"} ·{" "}
                        <Clock className="h-3 w-3 inline" /> {new Date(log.createdAt).toLocaleString()}
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
    BRAND_CREATED: "Brand created",
    POST_GENERATED: "Content plan generated",
    POST_APPROVED: "Post approved",
    POST_REJECTED: "Post rejected",
    POST_SCHEDULED: "Post scheduled",
    PUBLISH_SIMULATED: "Simulated publish (Draft Mode)",
    PUBLISH_REAL_ATTEMPT: "Real publish attempted",
    PUBLISH_MODE_CHANGED: "Publishing mode changed ⚠️",
    STRATEGY_GENERATED: "Strategy generated",
    MEMBER_ADDED: "Member added to brand",
    MEMBER_REMOVED: "Member removed from brand",
    CREDENTIALS_UPDATED: "API credentials updated",
  };
  return map[action] ?? action;
}
