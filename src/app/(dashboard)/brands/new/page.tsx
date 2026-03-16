"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Globe, Wand2, AlertCircle, CheckCircle, ArrowLeft, Info, Facebook, Instagram,
} from "lucide-react";
import Link from "next/link";

interface BrandFormData {
  name: string;
  websiteUrl: string;
  industry: string;
  overview: string;
  keyDifferentiators: string[];
  targetAudience: { demographics: string; geographics: string; painPoints: string[] };
  mainProducts: string[];
  toneOfVoice: string;
  toneOfVoiceNotes: string;
  language: "CANTONESE_TC" | "ENGLISH" | "MIXED";
  usesFacebook: boolean;
  usesInstagram: boolean;
  usesGoogleAds: boolean;
  monthlyBudget: string;
  postingFrequencyPerWeek: number;
}

const defaultForm: BrandFormData = {
  name: "",
  websiteUrl: "",
  industry: "",
  overview: "",
  keyDifferentiators: [""],
  targetAudience: { demographics: "", geographics: "", painPoints: [""] },
  mainProducts: [""],
  toneOfVoice: "",
  toneOfVoiceNotes: "",
  language: "MIXED",
  usesFacebook: true,
  usesInstagram: true,
  usesGoogleAds: false,
  monthlyBudget: "",
  postingFrequencyPerWeek: 2,
};

export default function NewBrandPage() {
  const router = useRouter();
  const [form, setForm] = useState<BrandFormData>(defaultForm);
  const [autoFillStatus, setAutoFillStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [autoFillMessage, setAutoFillMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // ── Auto-fill ──────────────────────────────────────────────────────────────
  const handleAutoFill = async () => {
    if (!form.websiteUrl) return;
    setAutoFillStatus("loading");
    setAutoFillMessage("");

    try {
      const res = await fetch(`/api/brands/temp/autofill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: form.websiteUrl }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setAutoFillStatus("error");
        setAutoFillMessage(data.error ?? "Could not extract — please fill manually");
        return;
      }

      const d = data.data;
      setForm((prev) => ({
        ...prev,
        industry: d.industry ?? prev.industry,
        overview: d.overview ?? prev.overview,
        keyDifferentiators:
          Array.isArray(d.keyDifferentiators) && d.keyDifferentiators.length > 0
            ? d.keyDifferentiators
            : prev.keyDifferentiators,
        targetAudience: {
          demographics: d.targetAudience?.demographics ?? prev.targetAudience.demographics,
          geographics: d.targetAudience?.geographics ?? prev.targetAudience.geographics,
          painPoints:
            Array.isArray(d.targetAudience?.painPoints) && d.targetAudience.painPoints.length > 0
              ? d.targetAudience.painPoints
              : prev.targetAudience.painPoints,
        },
        mainProducts:
          Array.isArray(d.mainProducts) && d.mainProducts.length > 0
            ? d.mainProducts
            : prev.mainProducts,
        toneOfVoice: d.toneOfVoice ?? prev.toneOfVoice,
        language: (d.language as BrandFormData["language"]) ?? prev.language,
      }));

      if (data.partial) {
        // Basic extraction only — no AI
        setAutoFillStatus("error");
        setAutoFillMessage(data.message ?? "Partial info pre-filled. Please complete the remaining fields manually.");
      } else {
        setAutoFillStatus("success");
        setAutoFillMessage(
          data.aiEnriched
            ? "AI-powered extraction complete! Review and adjust the pre-filled fields below."
            : "Basic info pre-filled from website meta tags. Review and complete manually."
        );
      }
    } catch {
      setAutoFillStatus("error");
      setAutoFillMessage("Network error — please fill manually");
    }
  };

  // ── Array field helpers ────────────────────────────────────────────────────
  const updateArrayField = (
    field: "keyDifferentiators" | "mainProducts",
    index: number,
    value: string
  ) => {
    setForm((prev) => {
      const arr = [...prev[field]];
      arr[index] = value;
      return { ...prev, [field]: arr };
    });
  };

  const addArrayItem = (field: "keyDifferentiators" | "mainProducts") => {
    setForm((prev) => ({ ...prev, [field]: [...prev[field], ""] }));
  };

  const removeArrayItem = (field: "keyDifferentiators" | "mainProducts", index: number) => {
    setForm((prev) => {
      const arr = prev[field].filter((_, i) => i !== index);
      return { ...prev, [field]: arr.length > 0 ? arr : [""] };
    });
  };

  const updatePainPoint = (index: number, value: string) => {
    setForm((prev) => {
      const pts = [...prev.targetAudience.painPoints];
      pts[index] = value;
      return { ...prev, targetAudience: { ...prev.targetAudience, painPoints: pts } };
    });
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const payload = {
        ...form,
        monthlyBudget: form.monthlyBudget ? parseFloat(form.monthlyBudget) : undefined,
        keyDifferentiators: form.keyDifferentiators.filter(Boolean),
        mainProducts: form.mainProducts.filter(Boolean),
        targetAudience: {
          ...form.targetAudience,
          painPoints: form.targetAudience.painPoints.filter(Boolean),
        },
      };

      const res = await fetch("/api/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to create brand");
      } else {
        router.push(`/brands/${data.id}`);
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link href="/brands" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft className="h-4 w-4" />
          Back to Brands
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Create New Brand</h1>
        <p className="text-gray-500 mt-1">Enter brand info once — AI will use it to generate strategies and content</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Section: Basic Info */}
        <Section title="Basic Information">
          <Field label="Brand Name *">
            <Input
              required
              placeholder="e.g. Bloom Coffee"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
          </Field>

          <Field label="Official Website URL">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="url"
                  placeholder="https://yourbrand.com"
                  value={form.websiteUrl}
                  onChange={(e) => setForm((p) => ({ ...p, websiteUrl: e.target.value }))}
                  className="pl-9"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleAutoFill}
                disabled={!form.websiteUrl || autoFillStatus === "loading"}
                loading={autoFillStatus === "loading"}
              >
                <Wand2 className="h-4 w-4" />
                Auto-fill from website
              </Button>
            </div>

            {autoFillStatus === "success" && (
              <div className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700 mt-2">
                <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                {autoFillMessage}
              </div>
            )}
            {autoFillStatus === "error" && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700 mt-2">
                <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                {autoFillMessage}
              </div>
            )}
          </Field>

          <Field label="Industry">
            <Input
              placeholder="e.g. F&B, Retail, Tech, Healthcare"
              value={form.industry}
              onChange={(e) => setForm((p) => ({ ...p, industry: e.target.value }))}
            />
          </Field>

          <Field label="Brand Overview">
            <Textarea
              rows={3}
              placeholder="Brief description of what your brand does and stands for..."
              value={form.overview}
              onChange={(e) => setForm((p) => ({ ...p, overview: e.target.value }))}
            />
          </Field>
        </Section>

        {/* Section: Differentiators */}
        <Section title="Key Differentiators">
          {form.keyDifferentiators.map((item, i) => (
            <div key={i} className="flex gap-2">
              <Input
                placeholder={`Differentiator ${i + 1}`}
                value={item}
                onChange={(e) => updateArrayField("keyDifferentiators", i, e.target.value)}
              />
              {form.keyDifferentiators.length > 1 && (
                <Button type="button" variant="ghost" size="icon" onClick={() => removeArrayItem("keyDifferentiators", i)}>
                  ×
                </Button>
              )}
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => addArrayItem("keyDifferentiators")}>
            + Add differentiator
          </Button>
        </Section>

        {/* Section: Target Audience */}
        <Section title="Target Audience">
          <Field label="Demographics">
            <Input
              placeholder="e.g. Women 25-40, urban professionals"
              value={form.targetAudience.demographics}
              onChange={(e) => setForm((p) => ({ ...p, targetAudience: { ...p.targetAudience, demographics: e.target.value } }))}
            />
          </Field>
          <Field label="Geographics">
            <Input
              placeholder="e.g. Hong Kong, Kowloon"
              value={form.targetAudience.geographics}
              onChange={(e) => setForm((p) => ({ ...p, targetAudience: { ...p.targetAudience, geographics: e.target.value } }))}
            />
          </Field>
          <Field label="Key Pain Points">
            {form.targetAudience.painPoints.map((pt, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <Input
                  placeholder={`Pain point ${i + 1}`}
                  value={pt}
                  onChange={(e) => updatePainPoint(i, e.target.value)}
                />
                {form.targetAudience.painPoints.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => {
                    setForm((p) => {
                      const pts = p.targetAudience.painPoints.filter((_, j) => j !== i);
                      return { ...p, targetAudience: { ...p.targetAudience, painPoints: pts.length > 0 ? pts : [""] } };
                    });
                  }}>×</Button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => {
              setForm((p) => ({ ...p, targetAudience: { ...p.targetAudience, painPoints: [...p.targetAudience.painPoints, ""] } }));
            }}>
              + Add pain point
            </Button>
          </Field>
        </Section>

        {/* Section: Products / Services */}
        <Section title="Main Products / Services">
          {form.mainProducts.map((item, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <Input
                placeholder={`Product / service ${i + 1}`}
                value={item}
                onChange={(e) => updateArrayField("mainProducts", i, e.target.value)}
              />
              {form.mainProducts.length > 1 && (
                <Button type="button" variant="ghost" size="icon" onClick={() => removeArrayItem("mainProducts", i)}>×</Button>
              )}
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => addArrayItem("mainProducts")}>
            + Add product / service
          </Button>
        </Section>

        {/* Section: Tone & Language */}
        <Section title="Tone of Voice & Language">
          <Field label="Tone of Voice">
            <Input
              placeholder="e.g. Friendly, professional, playful, inspirational"
              value={form.toneOfVoice}
              onChange={(e) => setForm((p) => ({ ...p, toneOfVoice: e.target.value }))}
            />
          </Field>
          <Field label="Additional Notes on Tone">
            <Textarea
              rows={2}
              placeholder="e.g. Use casual Cantonese phrases, avoid formal language, include emojis"
              value={form.toneOfVoiceNotes}
              onChange={(e) => setForm((p) => ({ ...p, toneOfVoiceNotes: e.target.value }))}
            />
          </Field>
          <Field label="Primary Language">
            <div className="flex gap-3">
              {(["CANTONESE_TC", "ENGLISH", "MIXED"] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, language: lang }))}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                    form.language === lang
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-gray-600 border-gray-300 hover:border-indigo-300"
                  }`}
                >
                  {lang === "CANTONESE_TC" ? "粵語 + 繁中" : lang === "ENGLISH" ? "English" : "Mixed"}
                </button>
              ))}
            </div>
          </Field>
        </Section>

        {/* Section: Channels */}
        <Section title="Main Channels">
          <div className="flex flex-wrap gap-3">
            <ChannelToggle
              label="Facebook"
              icon={<Facebook className="h-4 w-4" />}
              checked={form.usesFacebook}
              onChange={(v) => setForm((p) => ({ ...p, usesFacebook: v }))}
              color="bg-blue-600"
            />
            <ChannelToggle
              label="Instagram"
              icon={<Instagram className="h-4 w-4" />}
              checked={form.usesInstagram}
              onChange={(v) => setForm((p) => ({ ...p, usesInstagram: v }))}
              color="bg-pink-600"
            />
            <ChannelToggle
              label="Google Ads"
              icon={<span className="text-xs font-bold">G</span>}
              checked={form.usesGoogleAds}
              onChange={(v) => setForm((p) => ({ ...p, usesGoogleAds: v }))}
              color="bg-green-600"
            />
          </div>
        </Section>

        {/* Section: Budget & Frequency */}
        <Section title="Budget & Posting Frequency">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Monthly Budget (HKD)">
              <Input
                type="number"
                placeholder="e.g. 10000"
                value={form.monthlyBudget}
                onChange={(e) => setForm((p) => ({ ...p, monthlyBudget: e.target.value }))}
              />
            </Field>
            <Field label="Posts per Week">
              <Input
                type="number"
                min={1}
                max={14}
                value={form.postingFrequencyPerWeek}
                onChange={(e) => setForm((p) => ({ ...p, postingFrequencyPerWeek: parseInt(e.target.value) || 2 }))}
              />
            </Field>
          </div>
        </Section>

        {/* Safety notice */}
        <div className="flex items-start gap-3 p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
          <Badge variant="default" className="flex-shrink-0 mt-0.5">Safe Mode</Badge>
          <p className="text-sm text-indigo-700">
            All new brands start in <strong>Draft Only mode</strong>. The portal can create strategies, content, and simulate publishing — but will never post to Meta or Google Ads until you explicitly enable real publishing in Brand Settings.
          </p>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
          <Link href="/brands">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" loading={saving} size="lg">
            Confirm & Save Brand
          </Button>
        </div>
      </form>
    </div>
  );
}

// ─── UI Helpers ───────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
        <span className="w-1.5 h-5 bg-indigo-500 rounded-full inline-block" />
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function ChannelToggle({
  label, icon, checked, onChange, color,
}: {
  label: string;
  icon: React.ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
  color: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
        checked
          ? `${color} text-white border-transparent shadow-sm`
          : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
