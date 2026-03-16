"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, UserPlus, Trash2 } from "lucide-react";

interface Member {
  id: string;
  role: string;
  user: { id: string; name: string | null; email: string; image: string | null };
}

interface Props {
  brandId: string;
  members: Member[];
  isAdmin: boolean;
  currentUserId: string;
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  BRAND_MANAGER: "Brand Manager",
  CREATOR: "Creator",
};

export default function MembersSection({ brandId, members, isAdmin, currentUserId }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "BRAND_MANAGER" | "CREATOR">("CREATOR");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  const handleAddMember = async () => {
    setError("");
    setAdding(true);
    try {
      const res = await fetch(`/api/brands/${brandId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to add member");
      } else {
        setEmail("");
        router.refresh();
      }
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm("Remove this member from the brand?")) return;
    await fetch(`/api/brands/${brandId}/members?userId=${userId}`, { method: "DELETE" });
    router.refresh();
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
          <Users className="h-5 w-5 text-purple-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Team Members</h3>
          <p className="text-sm text-gray-500">{members.length} member{members.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* Members list */}
      <div className="space-y-2 mb-5">
        {members.map((m) => (
          <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {(m.user.name ?? m.user.email).charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{m.user.name ?? m.user.email}</p>
              <p className="text-xs text-gray-400 truncate">{m.user.email}</p>
            </div>
            <Badge variant="outline">{ROLE_LABELS[m.role] ?? m.role}</Badge>
            {isAdmin && m.user.id !== currentUserId && (
              <button
                onClick={() => handleRemoveMember(m.user.id)}
                className="text-gray-400 hover:text-red-500 transition-colors p-1"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add member */}
      {isAdmin && (
        <div className="border-t border-gray-100 pt-4">
          <p className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Add Team Member
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1"
            />
            <Select value={role} onValueChange={(v) => setRole(v as typeof role)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CREATOR">Creator</SelectItem>
                <SelectItem value="BRAND_MANAGER">Brand Manager</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleAddMember} loading={adding} disabled={!email}>
              Add
            </Button>
          </div>
          {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
        </div>
      )}
    </div>
  );
}
