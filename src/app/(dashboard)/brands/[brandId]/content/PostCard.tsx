"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { safeJson } from "@/lib/utils";
import {
  Facebook, Instagram, MonitorPlay, CheckCircle, XCircle, Clock,
  Image, ChevronDown, ChevronUp, CalendarDays, Sparkles,
} from "lucide-react";

interface PostVariation {
  id: string;
  label: string;
  captionFacebook: string | null;
  captionInstagram: string | null;
  imagePrompts: string | null;
  googleAdsAssets: string | null;
  status: string;
}

interface PostReview {
  id: string;
  action: string;
  comments: string | null;
  reviewer: { name: string | null } | null;
}

interface Post {
  id: string;
  weekNumber: number | null;
  dayOfWeek: number | null;
  platforms: string;
  theme: string | null;
  contentPillar: string | null;
  captionFacebook: string | null;
  captionInstagram: string | null;
  imagePrompts: string | null;
  googleAdsAssets: string | null;
  status: string;
  scheduledTime: Date | null;
  rejectedReason: string | null;
  variations: PostVariation[];
  reviews: PostReview[];
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "success" | "warning" | "outline" }> = {
  DRAFT: { label: "Draft", variant: "secondary" },
  PENDING_REVIEW: { label: "Pending Review", variant: "warning" },
  APPROVED: { label: "Approved", variant: "success" },
  REJECTED: { label: "Rejected", variant: "destructive" },
  SCHEDULED: { label: "Scheduled", variant: "default" },
  PUBLISHED: { label: "Published", variant: "success" },
  SIMULATED_PUBLISHED: { label: "Simulated Published", variant: "outline" },
};

export default function PostCard({
  post,
  brandId,
  canApprove,
}: {
  post: Post;
  brandId: string;
  canApprove: boolean;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"facebook" | "instagram" | "google">("facebook");

  const platforms = post.platforms.split(",");
  const status = STATUS_CONFIG[post.status] ?? { label: post.status, variant: "outline" as const };
  const imagePrompts = safeJson(post.imagePrompts) as string[] | null;
  const googleAds = safeJson(post.googleAdsAssets) as {
    headlines?: string[];
    descriptions?: string[];
    path1?: string;
    path2?: string;
  } | null;

  const handleApprove = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/brands/${brandId}/posts/${post.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "APPROVE" }),
      });
      if (res.ok) router.refresh();
      else alert("Failed to approve");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/brands/${brandId}/posts/${post.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "REJECT", comments: rejectReason }),
      });
      if (res.ok) {
        setShowRejectDialog(false);
        setRejectReason("");
        router.refresh();
      } else alert("Failed to reject");
    } finally {
      setLoading(false);
    }
  };

  const handleSchedule = async () => {
    if (!scheduleTime) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/brands/${brandId}/posts/${post.id}/schedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledTime: new Date(scheduleTime).toISOString() }),
      });
      if (res.ok) {
        setShowScheduleDialog(false);
        router.refresh();
      } else {
        const d = await res.json();
        alert(d.error ?? "Failed to schedule");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card className={`transition-all ${post.status === "REJECTED" ? "border-red-200 bg-red-50/30" : ""}`}>
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {post.dayOfWeek !== null && post.dayOfWeek !== undefined && (
                  <span className="text-xs font-medium text-gray-500">{DAYS[post.dayOfWeek]}</span>
                )}
                {post.contentPillar && (
                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">
                    {post.contentPillar}
                  </span>
                )}
              </div>
              {post.theme && (
                <p className="text-sm font-medium text-gray-900 mt-1 truncate">{post.theme}</p>
              )}
            </div>
            <Badge variant={status.variant} className="ml-2 flex-shrink-0">{status.label}</Badge>
          </div>

          {/* Platform pills */}
          <div className="flex gap-1.5 mb-3">
            {platforms.includes("FACEBOOK") && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">
                <Facebook className="h-3 w-3" /> FB
              </span>
            )}
            {platforms.includes("INSTAGRAM") && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-pink-50 text-pink-600 rounded text-xs">
                <Instagram className="h-3 w-3" /> IG
              </span>
            )}
            {platforms.includes("GOOGLE_ADS") && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-600 rounded text-xs">
                <MonitorPlay className="h-3 w-3" /> Ads
              </span>
            )}
            {post.variations.length > 1 && (
              <span className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded text-xs">
                {post.variations.length} variants
              </span>
            )}
          </div>

          {/* Caption preview */}
          {post.captionFacebook && (
            <p className="text-sm text-gray-600 line-clamp-2 mb-3">{post.captionFacebook}</p>
          )}

          {/* Reject reason */}
          {post.status === "REJECTED" && post.rejectedReason && (
            <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded-lg mb-3 text-xs text-red-700">
              <XCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
              <span>Rejected: {post.rejectedReason}</span>
            </div>
          )}

          {/* Scheduled time */}
          {post.scheduledTime && (
            <div className="flex items-center gap-1.5 text-xs text-blue-600 mb-3">
              <Clock className="h-3.5 w-3.5" />
              {new Date(post.scheduledTime).toLocaleString()}
            </div>
          )}

          {/* Expand/Collapse */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 mb-3"
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {expanded ? "Collapse" : "View full content"}
          </button>

          {expanded && (
            <div className="border-t border-gray-100 pt-3 mb-3">
              {/* Tab switcher */}
              <div className="flex gap-1 mb-3">
                {platforms.includes("FACEBOOK") && (
                  <button
                    onClick={() => setActiveTab("facebook")}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${activeTab === "facebook" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}
                  >
                    Facebook
                  </button>
                )}
                {platforms.includes("INSTAGRAM") && (
                  <button
                    onClick={() => setActiveTab("instagram")}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${activeTab === "instagram" ? "bg-pink-600 text-white" : "bg-gray-100 text-gray-600"}`}
                  >
                    Instagram
                  </button>
                )}
                {platforms.includes("GOOGLE_ADS") && googleAds && (
                  <button
                    onClick={() => setActiveTab("google")}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${activeTab === "google" ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600"}`}
                  >
                    Google Ads
                  </button>
                )}
              </div>

              {activeTab === "facebook" && post.captionFacebook && (
                <div className="bg-blue-50 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap">
                  {post.captionFacebook}
                </div>
              )}

              {activeTab === "instagram" && post.captionInstagram && (
                <div className="bg-pink-50 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap">
                  {post.captionInstagram}
                </div>
              )}

              {activeTab === "google" && googleAds && (
                <div className="bg-green-50 rounded-lg p-3 space-y-3">
                  {googleAds.headlines && (
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-1">Headlines</p>
                      {googleAds.headlines.map((h, i) => (
                        <p key={i} className="text-xs text-gray-700 bg-white rounded px-2 py-1 mb-1">{h}</p>
                      ))}
                    </div>
                  )}
                  {googleAds.descriptions && (
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-1">Descriptions</p>
                      {googleAds.descriptions.map((d, i) => (
                        <p key={i} className="text-xs text-gray-700 bg-white rounded px-2 py-1 mb-1">{d}</p>
                      ))}
                    </div>
                  )}
                  {(googleAds.path1 || googleAds.path2) && (
                    <p className="text-xs text-gray-600">
                      URL Path: /{googleAds.path1}/{googleAds.path2}
                    </p>
                  )}
                </div>
              )}

              {/* Image prompts */}
              {imagePrompts && imagePrompts.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <Image className="h-3.5 w-3.5" />
                    Image Prompts ({imagePrompts.length})
                  </p>
                  <div className="space-y-1.5">
                    {imagePrompts.map((prompt, i) => (
                      <div key={i} className="flex items-start gap-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
                        <Sparkles className="h-3.5 w-3.5 text-indigo-400 flex-shrink-0 mt-0.5" />
                        <span>{prompt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          {canApprove && (
            <div className="flex gap-2 flex-wrap">
              {(post.status === "DRAFT" || post.status === "PENDING_REVIEW") && (
                <>
                  <Button size="sm" variant="success" onClick={handleApprove} loading={loading}>
                    <CheckCircle className="h-3.5 w-3.5" />
                    Approve
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => setShowRejectDialog(true)}>
                    <XCircle className="h-3.5 w-3.5" />
                    Reject
                  </Button>
                </>
              )}
              {post.status === "APPROVED" && (
                <Button size="sm" variant="outline" onClick={() => setShowScheduleDialog(true)}>
                  <CalendarDays className="h-3.5 w-3.5" />
                  Schedule
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Post</DialogTitle>
            <DialogDescription>
              Provide feedback — the AI will generate a revised version automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Reason / Feedback</Label>
            <Textarea
              rows={4}
              placeholder="e.g. The tone is too formal, please make it more casual. Also add a discount offer."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleReject} loading={loading}>
                Reject & Regenerate
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Schedule Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Post</DialogTitle>
            <DialogDescription>
              Set the date and time to publish this post.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Publish Date & Time</Label>
            <Input
              type="datetime-local"
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowScheduleDialog(false)}>Cancel</Button>
              <Button onClick={handleSchedule} loading={loading} disabled={!scheduleTime}>
                <CalendarDays className="h-3.5 w-3.5" />
                Confirm Schedule
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
