"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ShieldCheck, Zap, AlertTriangle } from "lucide-react";

interface Props {
  brandId: string;
  brandName: string;
  currentMode: string;
}

export default function PublishingModeToggle({ brandId, brandName, currentMode }: Props) {
  const router = useRouter();
  const isRealAllowed = currentMode === "REAL_ALLOWED";
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingMode, setPendingMode] = useState<string | null>(null);

  const handleToggle = (checked: boolean) => {
    setPendingMode(checked ? "REAL_ALLOWED" : "DRAFT_ONLY");
    setShowConfirmDialog(true);
  };

  const confirmToggle = async () => {
    if (!pendingMode) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/brands/${brandId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publishingMode: pendingMode }),
      });
      if (res.ok) {
        setShowConfirmDialog(false);
        router.refresh();
      } else {
        const d = await res.json();
        alert(d.error ?? "Failed to update");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isRealAllowed ? "bg-amber-50" : "bg-emerald-50"}`}>
            {isRealAllowed ? (
              <Zap className="h-5 w-5 text-amber-600" />
            ) : (
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Publishing Mode</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {isRealAllowed
                    ? "⚠️ Real publishing is ENABLED — approved posts can be sent to Meta"
                    : "✅ Draft Only — no posts will be sent to any platform"}
                </p>
              </div>
              <Switch
                checked={isRealAllowed}
                onCheckedChange={handleToggle}
                className={isRealAllowed ? "data-[state=checked]:bg-amber-500" : ""}
              />
            </div>

            {!isRealAllowed && (
              <div className="mt-4 p-3 bg-emerald-50 rounded-lg text-sm text-emerald-700">
                <strong>Safe Mode is ON.</strong> The portal can create strategies, generate content, and simulate publishing — but will never call Meta or Google Ads APIs.
              </div>
            )}

            {isRealAllowed && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                <strong>Real Publishing is ON for {brandName}.</strong> Approved & scheduled posts will be published via Meta API. Google Ads assets will only create paused drafts.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {pendingMode === "REAL_ALLOWED"
                ? "Enable Real Publishing?"
                : "Switch to Draft Only?"}
            </DialogTitle>
            <DialogDescription>
              {pendingMode === "REAL_ALLOWED" ? (
                <>
                  <p className="mb-2">You are about to <strong>enable real publishing</strong> for <strong>{brandName}</strong>.</p>
                  <p>After this, all <strong>Approved + Scheduled</strong> posts will be published live to Meta (Facebook/Instagram) when their scheduled time arrives.</p>
                  <p className="mt-2 font-medium text-amber-700">Make sure your Meta credentials are correctly configured before enabling this.</p>
                </>
              ) : (
                <>
                  <p>You are switching <strong>{brandName}</strong> back to <strong>Draft Only mode</strong>.</p>
                  <p className="mt-2">No further posts will be sent to any platform. Existing scheduled posts will only be simulated.</p>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>Cancel</Button>
            <Button
              variant={pendingMode === "REAL_ALLOWED" ? "warning" : "default"}
              onClick={confirmToggle}
              loading={loading}
            >
              {pendingMode === "REAL_ALLOWED" ? "Enable Real Publishing" : "Switch to Draft Only"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
