"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Globe, Wand2, AlertCircle, CheckCircle, ArrowLeft, Info,
  Facebook, Instagram, Sparkles, ChevronDown, ChevronUp,
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
  name: "", websiteUrl: "", industry: "", overview: "",
  keyDifferentiators: [""],
  targetAudience: { demographics: "", geographics: "", painPoints: [""] },
  mainProducts: [""], toneOfVoice: "", toneOfVoiceNotes: "",
  language: "MIXED", usesFacebook: true, usesInstagram: true, usesGoogleAds: false,
  monthlyBudget: "", postingFrequencyPerWeek: 2,
};

export default function NewBrandPage() {
  const router = useRouter();
  const [form, setForm] = useState<BrandFormData>(defaultForm);
  const [autoFillStatus, setAutoFillStatus] = useState<"idle" | "loading" | "success" | "partial" | "error">("idle");
  const [autoFillMessage, setAutoFillMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formExpanded, setFormExpanded] = useState(false);

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
        setAutoFillMessage(data.error ?? "無法提取資料，請手動填寫");
        return;
      }

      const d = data.data;
      setForm((prev) => ({
        ...prev,
        // Auto-fill name only if not already entered
        name: (d.name && !prev.name) ? d.name : prev.name,
        industry: d.industry ?? prev.industry,
        overview: d.overview ?? prev.overview,
        keyDifferentiators: Array.isArray(d.keyDifferentiators) && d.keyDifferentiators.length > 0
          ? d.keyDifferentiators : prev.keyDifferentiators,
        targetAudience: {
          demographics: d.targetAudience?.demographics ?? prev.targetAudience.demographics,
          geographics: d.targetAudience?.geographics ?? prev.targetAudience.geographics,
          painPoints: Array.isArray(d.targetAudience?.painPoints) && d.targetAudience.painPoints.length > 0
            ? d.targetAudience.painPoints : prev.targetAudience.painPoints,
        },
        mainProducts: Array.isArray(d.mainProducts) && d.mainProducts.length > 0
          ? d.mainProducts : prev.mainProducts,
        toneOfVoice: d.toneOfVoice ?? prev.toneOfVoice,
        language: (d.language as BrandFormData["language"]) ?? prev.language,
      }));

      setFormExpanded(true); // Auto-expand form after analysis

      if (data.partial) {
        setAutoFillStatus("partial");
        setAutoFillMessage(data.message ?? "已從網站提取基本資料，請補充剩餘欄位。");
      } else {
        setAutoFillStatus("success");
        setAutoFillMessage(
          data.aiEnriched
            ? "✓ DeepSeek AI 分析完成！請確認及調整以下資料。"
            : "✓ 已從網站 Meta 標籤提取基本資料，請確認及補充。"
        );
      }
    } catch {
      setAutoFillStatus("error");
      setAutoFillMessage("網絡錯誤，請重試或手動填寫");
    }
  };

  // ── Array helpers ─────────────────────────────────────────────────────────
  const updateArr = (f: "keyDifferentiators" | "mainProducts", i: number, v: string) =>
    setForm((p) => { const a = [...p[f]]; a[i] = v; return { ...p, [f]: a }; });
  const addArr = (f: "keyDifferentiators" | "mainProducts") =>
    setForm((p) => ({ ...p, [f]: [...p[f], ""] }));
  const removeArr = (f: "keyDifferentiators" | "mainProducts", i: number) =>
    setForm((p) => { const a = p[f].filter((_, j) => j !== i); return { ...p, [f]: a.length > 0 ? a : [""] }; });
  const updatePainPoint = (i: number, v: string) =>
    setForm((p) => { const pts = [...p.targetAudience.painPoints]; pts[i] = v; return { ...p, targetAudience: { ...p.targetAudience, painPoints: pts } }; });

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          monthlyBudget: form.monthlyBudget ? parseFloat(form.monthlyBudget) : undefined,
          keyDifferentiators: form.keyDifferentiators.filter(Boolean),
          mainProducts: form.mainProducts.filter(Boolean),
          targetAudience: { ...form.targetAudience, painPoints: form.targetAudience.painPoints.filter(Boolean) },
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to create brand"); }
      else { router.push(`/brands/${data.id}`); }
    } catch { setError("Network error — please try again"); }
    finally { setSaving(false); }
  };

  const analysed = autoFillStatus === "success" || autoFillStatus === "partial";

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link href="/brands" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to Brands
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">新增品牌</h1>
        <p className="text-gray-500 mt-1">輸入一次品牌資料，AI 會自動生成策略及內容計畫</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />{error}
          </div>
        )}

        {/* ── Step 1: Website Analysis (TOP, prominent) ───────────────────── */}
        <div className="bg-gradient-to-br from-indigo-950 to-slate-900 rounded-2xl p-6 text-white">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 bg-indigo-500/20 rounded-xl border border-indigo-400/30 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-indigo-300" />
            </div>
            <div>
              <p className="font-semibold text-white">Step 1 · DeepSeek AI 網站分析</p>
              <p className="text-xs text-indigo-300">輸入官網網址，AI 自動提取品牌資料</p>
            </div>
          </div>

          {/* Website URL */}
          <div className="mb-4">
            <label className="text-xs font-medium text-indigo-200 mb-1.5 block">官網網址</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="url"
                  placeholder="https://yourbrand.com"
                  value={form.websiteUrl}
                  onChange={(e) => setForm((p) => ({ ...p, websiteUrl: e.target.value }))}
                  className="w-full pl-9 pr-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                />
              </div>
              <Button
                type="button"
                onClick={handleAutoFill}
                disabled={!form.websiteUrl || autoFillStatus === "loading"}
                loading={autoFillStatus === "loading"}
                className="bg-indigo-500 hover:bg-indigo-400 text-white border-0 flex-shrink-0"
              >
                <Wand2 className="h-4 w-4" />
                {autoFillStatus === "loading" ? "分析中…" : "AI 分析"}
              </Button>
            </div>
          </div>

          {/* Company name — shown after analysis or editable standalone */}
          <div>
            <label className="text-xs font-medium text-indigo-200 mb-1.5 block">公司 / 品牌名稱 *</label>
            <input
              required
              placeholder="分析後自動填入，或手動輸入"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className="w-full px-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {/* Status feedback */}
          {autoFillStatus === "success" && (
            <div className="flex items-start gap-2 mt-4 p-3 bg-emerald-500/15 border border-emerald-400/30 rounded-lg">
              <CheckCircle className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-emerald-200">{autoFillMessage}</p>
            </div>
          )}
          {autoFillStatus === "partial" && (
            <div className="flex items-start gap-2 mt-4 p-3 bg-amber-500/15 border border-amber-400/30 rounded-lg">
              <Info className="h-4 w-4 text-amber-300 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-200">{autoFillMessage}</p>
            </div>
          )}
          {autoFillStatus === "error" && (
            <div className="flex items-start gap-2 mt-4 p-3 bg-red-500/15 border border-red-400/30 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-200">{autoFillMessage}</p>
            </div>
          )}
        </div>

        {/* ── Step 2: Brand Details (collapsible, auto-opens after analysis) ── */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <button
            type="button"
            onClick={() => setFormExpanded(!formExpanded)}
            className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">2</span>
              <div>
                <p className="font-semibold text-gray-900 text-sm">品牌詳細資料</p>
                <p className="text-xs text-gray-400">{analysed ? "已從網站分析預填，請確認" : "手動填寫品牌資訊"}</p>
              </div>
            </div>
            {formExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
          </button>

          {formExpanded && (
            <div className="px-6 pb-6 space-y-6 border-t border-gray-100 pt-5">
              {/* Industry + Overview */}
              <Section title="基本資料">
                <Field label="行業類別">
                  <Input placeholder="例：餐飲、零售、科技、醫療" value={form.industry}
                    onChange={(e) => setForm((p) => ({ ...p, industry: e.target.value }))} />
                </Field>
                <Field label="品牌簡介">
                  <Textarea rows={3} placeholder="簡述品牌做什麼、代表什麼…" value={form.overview}
                    onChange={(e) => setForm((p) => ({ ...p, overview: e.target.value }))} />
                </Field>
              </Section>

              {/* Differentiators */}
              <Section title="核心優勢 / 差異化">
                {form.keyDifferentiators.map((item, i) => (
                  <div key={i} className="flex gap-2">
                    <Input placeholder={`優勢 ${i + 1}`} value={item}
                      onChange={(e) => updateArr("keyDifferentiators", i, e.target.value)} />
                    {form.keyDifferentiators.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeArr("keyDifferentiators", i)}>×</Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => addArr("keyDifferentiators")}>+ 新增優勢</Button>
              </Section>

              {/* Target Audience */}
              <Section title="目標受眾">
                <Field label="人口特徵">
                  <Input placeholder="例：25-40 歲女性，城市專業人士" value={form.targetAudience.demographics}
                    onChange={(e) => setForm((p) => ({ ...p, targetAudience: { ...p.targetAudience, demographics: e.target.value } }))} />
                </Field>
                <Field label="地理位置">
                  <Input placeholder="例：香港、九龍" value={form.targetAudience.geographics}
                    onChange={(e) => setForm((p) => ({ ...p, targetAudience: { ...p.targetAudience, geographics: e.target.value } }))} />
                </Field>
                <Field label="主要痛點">
                  {form.targetAudience.painPoints.map((pt, i) => (
                    <div key={i} className="flex gap-2 mb-2">
                      <Input placeholder={`痛點 ${i + 1}`} value={pt} onChange={(e) => updatePainPoint(i, e.target.value)} />
                      {form.targetAudience.painPoints.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => {
                          setForm((p) => { const pts = p.targetAudience.painPoints.filter((_, j) => j !== i); return { ...p, targetAudience: { ...p.targetAudience, painPoints: pts.length > 0 ? pts : [""] } }; });
                        }}>×</Button>
                      )}
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={() =>
                    setForm((p) => ({ ...p, targetAudience: { ...p.targetAudience, painPoints: [...p.targetAudience.painPoints, ""] } }))}>
                    + 新增痛點
                  </Button>
                </Field>
              </Section>

              {/* Products */}
              <Section title="主要產品 / 服務">
                {form.mainProducts.map((item, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <Input placeholder={`產品 / 服務 ${i + 1}`} value={item}
                      onChange={(e) => updateArr("mainProducts", i, e.target.value)} />
                    {form.mainProducts.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeArr("mainProducts", i)}>×</Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => addArr("mainProducts")}>+ 新增產品</Button>
              </Section>

              {/* Tone & Language */}
              <Section title="語調 & 語言">
                <Field label="語調風格">
                  <Input placeholder="例：專業、親切、活潑、正式" value={form.toneOfVoice}
                    onChange={(e) => setForm((p) => ({ ...p, toneOfVoice: e.target.value }))} />
                </Field>
                <Field label="補充說明">
                  <Textarea rows={2} placeholder="例：使用輕鬆粵語、加入 emoji、避免過於正式" value={form.toneOfVoiceNotes}
                    onChange={(e) => setForm((p) => ({ ...p, toneOfVoiceNotes: e.target.value }))} />
                </Field>
                <Field label="主要語言">
                  <div className="flex gap-3">
                    {(["CANTONESE_TC", "ENGLISH", "MIXED"] as const).map((lang) => (
                      <button key={lang} type="button" onClick={() => setForm((p) => ({ ...p, language: lang }))}
                        className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                          form.language === lang ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-300 hover:border-indigo-300"
                        }`}>
                        {lang === "CANTONESE_TC" ? "粵語 + 繁中" : lang === "ENGLISH" ? "English" : "Mixed"}
                      </button>
                    ))}
                  </div>
                </Field>
              </Section>

              {/* Channels */}
              <Section title="主要渠道">
                <div className="flex flex-wrap gap-3">
                  <ChannelToggle label="Facebook" icon={<Facebook className="h-4 w-4" />} checked={form.usesFacebook}
                    onChange={(v) => setForm((p) => ({ ...p, usesFacebook: v }))} color="bg-blue-600" />
                  <ChannelToggle label="Instagram" icon={<Instagram className="h-4 w-4" />} checked={form.usesInstagram}
                    onChange={(v) => setForm((p) => ({ ...p, usesInstagram: v }))} color="bg-pink-600" />
                  <ChannelToggle label="Google Ads" icon={<span className="text-xs font-bold">G</span>} checked={form.usesGoogleAds}
                    onChange={(v) => setForm((p) => ({ ...p, usesGoogleAds: v }))} color="bg-green-600" />
                </div>
              </Section>

              {/* Budget */}
              <Section title="預算 & 發帖頻率">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="每月預算 (HKD)">
                    <Input type="number" placeholder="例：10000" value={form.monthlyBudget}
                      onChange={(e) => setForm((p) => ({ ...p, monthlyBudget: e.target.value }))} />
                  </Field>
                  <Field label="每週貼文數">
                    <Input type="number" min={1} max={14} value={form.postingFrequencyPerWeek}
                      onChange={(e) => setForm((p) => ({ ...p, postingFrequencyPerWeek: parseInt(e.target.value) || 2 }))} />
                  </Field>
                </div>
              </Section>
            </div>
          )}
        </div>

        {/* Safety notice */}
        <div className="flex items-start gap-3 p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
          <Badge variant="default" className="flex-shrink-0 mt-0.5">安全模式</Badge>
          <p className="text-sm text-indigo-700">
            所有新品牌預設為 <strong>草稿模式</strong>。系統可生成策略、內容及模擬發佈，但不會真正發佈至 Meta 或 Google Ads，除非在品牌設定中明確開啟。
          </p>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
          <Link href="/brands"><Button type="button" variant="outline">取消</Button></Link>
          <Button type="submit" loading={saving} size="lg" disabled={!form.name}>
            確認並儲存品牌
          </Button>
        </div>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
        <span className="w-1 h-4 bg-indigo-400 rounded-full inline-block" />{title}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5"><Label>{label}</Label>{children}</div>
  );
}

function ChannelToggle({ label, icon, checked, onChange, color }: {
  label: string; icon: React.ReactNode; checked: boolean; onChange: (v: boolean) => void; color: string;
}) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
        checked ? `${color} text-white border-transparent shadow-sm` : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
      }`}>
      {icon}{label}
    </button>
  );
}
