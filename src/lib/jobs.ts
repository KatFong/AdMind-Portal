import { prisma } from "@/lib/prisma";

export interface JobStep {
  step: string;
  status: "pending" | "running" | "done" | "error";
}

// ─── Update job progress ──────────────────────────────────────────────────────

export async function updateJob(
  jobId: string,
  data: {
    status?: string;
    currentStep?: string;
    progressPct?: number;
    steps?: JobStep[];
    resultId?: string;
    errorMessage?: string;
  }
) {
  await prisma.job.update({
    where: { id: jobId },
    data: {
      ...data,
      steps: data.steps ? JSON.stringify(data.steps) : undefined,
    },
  });
}

// ─── Strategy generation (runs inside after()) ───────────────────────────────

export async function processStrategyJob(jobId: string) {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) return;

  const steps: JobStep[] = [
    { step: "讀取品牌資料", status: "running" },
    { step: "搜尋競爭對手市場數據", status: "pending" },
    { step: "AI 分析及生成策略", status: "pending" },
    { step: "儲存策略", status: "pending" },
  ];

  await updateJob(jobId, { status: "RUNNING", steps, progressPct: 5, currentStep: "讀取品牌資料" });

  try {
    const { safeJson, writeAuditLog } = await import("@/lib/utils");
    const { chat, STRATEGY_SYSTEM_PROMPT, isAIConfigured } = await import("@/lib/ai");
    const { researchCompetitors } = await import("@/lib/search");

    const brand = await prisma.brand.findUnique({ where: { id: job.brandId } });
    if (!brand) throw new Error("Brand not found");

    if (!isAIConfigured()) throw new Error("AI provider not configured");

    steps[0].status = "done";
    steps[1].status = "running";
    await updateJob(jobId, { steps, progressPct: 15, currentStep: "搜尋競爭對手市場數據（Tavily）" });

    // ── Competitive research ──
    let competitorContext = "";
    let searchMethod: "web_search" | "ai_knowledge" = "ai_knowledge";
    let sourcesForSave: { title: string; url: string }[] = [];

    try {
      const channels: string[] = [];
      if (brand.usesFacebook) channels.push("Facebook");
      if (brand.usesInstagram) channels.push("Instagram");
      if (brand.usesGoogleAds) channels.push("Google Ads");

      type ResearchWithRaw = Awaited<ReturnType<typeof researchCompetitors>> & { _rawContent?: string };
      const research = await researchCompetitors({
        brandName: brand.name,
        industry: brand.industry ?? "general business",
        channels,
        language: brand.language,
      }) as ResearchWithRaw;

      searchMethod = research.method;
      sourcesForSave = research.sources;

      if (research.method === "web_search" && research._rawContent) {
        competitorContext = `
## 真實市場調查數據（來源：網路搜尋，${new Date().toLocaleDateString()}）
以下是從網路搜尋到的 ${brand.industry} 行業成功行銷案例及競爭對手資料。
請將這些真實數據、個案研究及統計數字融入策略分析中。

${research._rawContent}
---
請根據以上真實市場數據制定策略，引用具體品牌名稱、活動名稱或數據。`;
      } else {
        competitorContext = `
## 競爭研究（基於 AI 訓練知識）
請提供至少 3 個 ${brand.industry} 行業真實競爭對手品牌、成功案例及行業基準數據。`;
      }
    } catch (searchErr) {
      console.warn("[JOB:STRATEGY] Competitor search failed:", searchErr);
    }

    steps[1].status = "done";
    steps[2].status = "running";
    await updateJob(jobId, { steps, progressPct: 40, currentStep: "DeepSeek AI 分析及生成策略…" });

    // ── AI generation ──
    const brandProfile = {
      name: brand.name, industry: brand.industry, overview: brand.overview,
      keyDifferentiators: safeJson(brand.keyDifferentiators),
      targetAudience: safeJson(brand.targetAudience),
      mainProducts: safeJson(brand.mainProducts),
      toneOfVoice: brand.toneOfVoice, language: brand.language,
      channels: { facebook: brand.usesFacebook, instagram: brand.usesInstagram, googleAds: brand.usesGoogleAds },
      monthlyBudget: brand.monthlyBudget, postingFrequencyPerWeek: brand.postingFrequencyPerWeek,
    };

    const enhancedSystemPrompt = `${STRATEGY_SYSTEM_PROMPT}

重要：你的回應必須在所有其他欄位旁邊加入 "competitiveIntelligence" 欄位，結構如下（所有文字用繁體中文）：
{
  "competitiveIntelligence": {
    "topCompetitors": [{"name":"品牌名","marketingApproach":"行銷手法","keyTactics":["戰術"],"estimatedReach":"觸及估算","relevantData":"具體數據"}],
    "successCases": [{"brand":"品牌","campaign":"活動","tactic":"做法","result":"成果","data":"具體數字"}],
    "industryBenchmarks": ["基準數據1","基準數據2"],
    "marketGaps": ["市場機遇1","市場機遇2"],
    "differentiationOpportunity": "差異化策略",
    "searchMethod": "web_search 或 ai_knowledge",
    "sources": [{"title":"來源","url":"https://..."}]
  }
}`;

    const aiResponse = await chat(
      enhancedSystemPrompt,
      `請為以下品牌生成完整行銷策略（含競爭情報），所有內容以繁體中文撰寫。

品牌資料：
${JSON.stringify(brandProfile, null, 2)}

${competitorContext}

要求：
1. competitiveIntelligence 必須含真實品牌名稱、活動案例及行業數據
2. 市場重點：${brand.language === "CANTONESE_TC" ? "香港粵語市場" : brand.language === "MIXED" ? "香港中英雙語市場" : "英語市場"}
3. 所有策略建議、分析文字必須使用繁體中文`,
      { json: true, maxTokens: 6000 }
    );

    const strategy = JSON.parse(aiResponse);
    if (searchMethod === "web_search" && sourcesForSave.length > 0) {
      if (!strategy.competitiveIntelligence) strategy.competitiveIntelligence = {};
      strategy.competitiveIntelligence.sources = sourcesForSave;
      strategy.competitiveIntelligence.searchMethod = "web_search";
    }

    steps[2].status = "done";
    steps[3].status = "running";
    await updateJob(jobId, { steps, progressPct: 85, currentStep: "儲存策略至資料庫…" });

    // ── Save ──
    await prisma.marketingStrategy.updateMany({
      where: { brandId: job.brandId, isActive: true },
      data: { isActive: false },
    });

    const lastVersion = await prisma.marketingStrategy.count({ where: { brandId: job.brandId } });
    const saved = await prisma.marketingStrategy.create({
      data: {
        brandId: job.brandId,
        version: lastVersion + 1,
        title: strategy.title ?? `策略 v${lastVersion + 1}`,
        isActive: true,
        targetAudience: JSON.stringify(strategy.targetAudience),
        positioning: strategy.positioning,
        valuePropositions: JSON.stringify(strategy.valuePropositions),
        contentPillars: JSON.stringify(strategy.contentPillars),
        channelMix: JSON.stringify(strategy.channelMix),
        kpis: JSON.stringify(strategy.kpis),
        budgetSplit: JSON.stringify(strategy.budgetSplit),
        rawContent: JSON.stringify({ ...strategy, _searchMethod: searchMethod, _sourcesCount: sourcesForSave.length }),
        createdByUserId: job.triggeredByUserId,
      },
    });

    await writeAuditLog("STRATEGY_GENERATED", {
      brandId: job.brandId,
      actorUserId: job.triggeredByUserId ?? undefined,
      metadata: { strategyId: saved.id, version: saved.version, jobId, searchMethod },
    });

    steps[3].status = "done";
    await updateJob(jobId, {
      status: "DONE",
      steps,
      progressPct: 100,
      currentStep: "策略已生成！",
      resultId: saved.id,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[JOB:STRATEGY] Failed:", msg);
    await updateJob(jobId, {
      status: "FAILED",
      errorMessage: msg,
      currentStep: `失敗：${msg}`,
      progressPct: 0,
    });
  }
}

// ─── Content plan generation (runs inside after()) ───────────────────────────

export async function processContentJob(jobId: string) {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) return;

  const steps: JobStep[] = [
    { step: "讀取品牌資料及策略", status: "running" },
    { step: "AI 生成 4 週內容計畫", status: "pending" },
    { step: "儲存所有貼文", status: "pending" },
  ];

  await updateJob(jobId, { status: "RUNNING", steps, progressPct: 5, currentStep: "讀取品牌資料及策略" });

  try {
    const { safeJson, writeAuditLog } = await import("@/lib/utils");
    const { chat, CONTENT_SYSTEM_PROMPT, isAIConfigured } = await import("@/lib/ai");

    const brand = await prisma.brand.findUnique({ where: { id: job.brandId } });
    if (!brand) throw new Error("Brand not found");
    if (!isAIConfigured()) throw new Error("AI provider not configured");

    const strategy = await prisma.marketingStrategy.findFirst({
      where: { brandId: job.brandId, isActive: true },
      orderBy: { createdAt: "desc" },
    });
    if (!strategy) throw new Error("請先生成行銷策略");

    steps[0].status = "done";
    steps[1].status = "running";
    const totalPosts = brand.postingFrequencyPerWeek * 4;
    await updateJob(jobId, { steps, progressPct: 20, currentStep: `DeepSeek 生成 ${totalPosts} 篇貼文內容…` });

    const context = {
      brandName: brand.name, language: brand.language,
      toneOfVoice: brand.toneOfVoice, toneOfVoiceNotes: brand.toneOfVoiceNotes,
      channels: { facebook: brand.usesFacebook, instagram: brand.usesInstagram, googleAds: brand.usesGoogleAds },
      postingFrequencyPerWeek: brand.postingFrequencyPerWeek, totalPostsToGenerate: totalPosts,
      strategy: {
        positioning: strategy.positioning,
        valuePropositions: safeJson(strategy.valuePropositions),
        contentPillars: safeJson(strategy.contentPillars),
        targetAudience: safeJson(strategy.targetAudience),
        channelMix: safeJson(strategy.channelMix),
      },
    };

    const aiResponse = await chat(
      CONTENT_SYSTEM_PROMPT,
      `請為以下品牌生成 4 週內容日曆，共 ${totalPosts} 篇貼文（每週 ${brand.postingFrequencyPerWeek} 篇）。

品牌資料：
${JSON.stringify(context, null, 2)}

要求：
- 每個時段生成 v1 和 v2 兩個版本
- 平均分佈於 4 週內
- Facebook 和 Instagram 文案以品牌語言撰寫（${brand.language === "CANTONESE_TC" ? "粵語＋繁體中文" : brand.language === "MIXED" ? "繁體中文／英文混合" : "英文"}）
- theme 和 contentPillar 欄位使用繁體中文
- imagePrompts 必須用英文（供 AI 圖像生成工具使用）`,
      { json: true, maxTokens: 8192 }
    );

    const contentPlan = JSON.parse(aiResponse) as { slots: ContentSlot[] };

    steps[1].status = "done";
    steps[2].status = "running";
    await updateJob(jobId, {
      steps, progressPct: 75,
      currentStep: `儲存 ${contentPlan.slots.length} 篇貼文…`,
    });

    const platforms = [
      brand.usesFacebook && "FACEBOOK",
      brand.usesInstagram && "INSTAGRAM",
      brand.usesGoogleAds && "GOOGLE_ADS",
    ].filter(Boolean).join(",");

    let saved = 0;
    for (const slot of contentPlan.slots) {
      const post = await prisma.post.create({
        data: {
          brandId: job.brandId, strategyId: strategy.id,
          weekNumber: slot.weekNumber, dayOfWeek: slot.dayOfWeek,
          platforms, theme: slot.theme, contentPillar: slot.contentPillar,
          status: "DRAFT",
          captionFacebook: slot.v1?.captionFacebook,
          captionInstagram: slot.v1?.captionInstagram,
          imagePrompts: slot.v1?.imagePrompts ? JSON.stringify(slot.v1.imagePrompts) : null,
          googleAdsAssets: slot.v1?.googleAdsAssets ? JSON.stringify(slot.v1.googleAdsAssets) : null,
          createdByUserId: job.triggeredByUserId,
        },
      });

      if (slot.v1) {
        await prisma.postVariation.create({
          data: {
            postId: post.id, label: "v1",
            captionFacebook: slot.v1.captionFacebook, captionInstagram: slot.v1.captionInstagram,
            imagePrompts: slot.v1.imagePrompts ? JSON.stringify(slot.v1.imagePrompts) : null,
            googleAdsAssets: slot.v1.googleAdsAssets ? JSON.stringify(slot.v1.googleAdsAssets) : null,
            status: "SELECTED",
          },
        });
      }
      if (slot.v2) {
        await prisma.postVariation.create({
          data: {
            postId: post.id, label: "v2",
            captionFacebook: slot.v2.captionFacebook, captionInstagram: slot.v2.captionInstagram,
            imagePrompts: slot.v2.imagePrompts ? JSON.stringify(slot.v2.imagePrompts) : null,
            googleAdsAssets: slot.v2.googleAdsAssets ? JSON.stringify(slot.v2.googleAdsAssets) : null,
            status: "CANDIDATE",
          },
        });
      }
      saved++;
    }

    await writeAuditLog("POST_GENERATED", {
      brandId: job.brandId,
      actorUserId: job.triggeredByUserId ?? undefined,
      metadata: { count: saved, strategyId: strategy.id, jobId },
    });

    steps[2].status = "done";
    await updateJob(jobId, {
      status: "DONE", steps,
      progressPct: 100,
      currentStep: `完成！已生成 ${saved} 篇貼文`,
      resultId: String(saved),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[JOB:CONTENT] Failed:", msg);
    await updateJob(jobId, {
      status: "FAILED", errorMessage: msg,
      currentStep: `失敗：${msg}`, progressPct: 0,
    });
  }
}

interface ContentSlot {
  weekNumber: number; dayOfWeek: number; theme: string; contentPillar: string;
  v1: { captionFacebook: string; captionInstagram: string; imagePrompts: string[]; googleAdsAssets: { headlines: string[]; descriptions: string[]; path1: string; path2: string; }; };
  v2: { captionFacebook: string; captionInstagram: string; imagePrompts: string[]; googleAdsAssets: { headlines: string[]; descriptions: string[]; path1: string; path2: string; }; };
}
