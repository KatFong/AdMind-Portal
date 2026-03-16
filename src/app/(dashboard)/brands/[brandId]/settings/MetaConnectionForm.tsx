"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Facebook, CheckCircle, AlertCircle } from "lucide-react";

interface Props {
  brandId: string;
  metaConnected: boolean;
  metaPageId: string;
  instagramBusinessId: string;
  isAdmin: boolean;
}

export default function MetaConnectionForm({
  brandId, metaConnected, metaPageId, instagramBusinessId, isAdmin
}: Props) {
  const router = useRouter();
  const [pageId, setPageId] = useState(metaPageId);
  const [igId, setIgId] = useState(instagramBusinessId);
  const [accessToken, setAccessToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        metaPageId: pageId || null,
        instagramBusinessId: igId || null,
        metaConnected: !!(pageId && accessToken),
      };
      if (accessToken) {
        const { encrypt } = await import("@/lib/encrypt");
        body.metaAccessTokenEncrypted = encrypt(accessToken);
      }

      const res = await fetch(`/api/brands/${brandId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        router.refresh();
      } else {
        alert("Failed to save");
      }
    } catch {
      alert("Error saving settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
          <Facebook className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Meta Connection</h3>
          <p className="text-sm text-gray-500">Facebook Page & Instagram Business</p>
        </div>
        <div className="ml-auto">
          {metaConnected ? (
            <Badge variant="success" className="gap-1">
              <CheckCircle className="h-3 w-3" />
              Connected
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1">
              <AlertCircle className="h-3 w-3" />
              Not connected
            </Badge>
          )}
        </div>
      </div>

      {!isAdmin ? (
        <p className="text-sm text-gray-500">Only Admin can manage channel connections.</p>
      ) : (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Facebook Page ID</Label>
            <Input
              placeholder="e.g. 123456789012345"
              value={pageId}
              onChange={(e) => setPageId(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Instagram Business Account ID</Label>
            <Input
              placeholder="e.g. 987654321"
              value={igId}
              onChange={(e) => setIgId(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Page Access Token (leave blank to keep existing)</Label>
            <Input
              type="password"
              placeholder="Enter new token to update..."
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
            />
            <p className="text-xs text-gray-400">Tokens are stored encrypted. Never stored in plain text.</p>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={handleSave} loading={saving} size="sm">
              Save Connection
            </Button>
            {saved && (
              <span className="text-xs text-emerald-600 flex items-center gap-1">
                <CheckCircle className="h-3.5 w-3.5" />
                Saved
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
