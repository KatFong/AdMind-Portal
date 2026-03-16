import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { chat, SCRAPE_SYSTEM_PROMPT, isAIConfigured } from "@/lib/ai";
import axios from "axios";
import * as cheerio from "cheerio";

// ─── Scrape helpers ───────────────────────────────────────────────────────────

async function scrapeWebsite(url: string): Promise<{ raw: string; quick: QuickExtract }> {
  const response = await axios.get(url, {
    timeout: 15000,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
    },
    maxRedirects: 5,
  });

  const $ = cheerio.load(response.data as string);
  $("script, style, nav, footer, header, [class*='cookie'], [class*='popup']").remove();

  // ── Quick extraction (no AI needed) ──────────────────────────────────────
  const quick = extractWithoutAI($, url);

  // ── Raw text for AI (if available) ───────────────────────────────────────
  const metaTitle = $("title").text().trim();
  const metaDesc = $('meta[name="description"]').attr("content") ?? "";
  const ogDesc = $('meta[property="og:description"]').attr("content") ?? "";
  const h1 = $("h1").map((_, el) => $(el).text().trim()).get().join(" | ");
  const h2 = $("h2").map((_, el) => $(el).text().trim()).get().slice(0, 10).join(" | ");
  const bodyText = $(
    "main, article, section, [class*='about'], [class*='hero'], [class*='service'], [id*='about']"
  )
    .map((_, el) => $(el).text())
    .get()
    .join("\n")
    .replace(/\s+/g, " ")
    .slice(0, 4000);

  const raw = [
    `PAGE TITLE: ${metaTitle}`,
    `META DESCRIPTION: ${metaDesc}`,
    `OG DESCRIPTION: ${ogDesc}`,
    `HEADINGS H1: ${h1}`,
    `HEADINGS H2: ${h2}`,
    `MAIN CONTENT:\n${bodyText}`,
  ].join("\n\n");

  return { raw, quick };
}

interface QuickExtract {
  name: string | null;
  industry: string | null;
  overview: string | null;
  keyDifferentiators: string[];
  targetAudience: { demographics: string | null; geographics: string | null; painPoints: string[] };
  mainProducts: string[];
  toneOfVoice: string | null;
  language: "CANTONESE_TC" | "ENGLISH" | "MIXED";
}

function extractWithoutAI($: ReturnType<typeof cheerio.load>, url: string): QuickExtract {
  // Brand name: og:site_name > title (strip tagline) > domain
  const ogSiteName = $('meta[property="og:site_name"]').attr("content")?.trim();
  const titleTag = $("title").text().trim().split(/[|\-–—]/)[0].trim();
  const domainName = new URL(url).hostname.replace(/^www\./, "").split(".")[0];
  const name = ogSiteName || (titleTag.length < 50 ? titleTag : null) || domainName || null;

  // Overview: meta description or OG description
  const overview =
    $('meta[property="og:description"]').attr("content") ||
    $('meta[name="description"]').attr("content") ||
    $("h1").first().text().trim() ||
    null;

  // Try to find products/services from common selectors
  const productItems: string[] = [];
  $("[class*='product'], [class*='service'], [class*='menu'], [class*='item'], [id*='product'], [id*='service']")
    .find("h2, h3, h4")
    .slice(0, 8)
    .each((_, el) => {
      const t = $(el).text().trim();
      if (t && t.length < 80) productItems.push(t);
    });

  // Detect language from content
  const fullText = $("body").text();
  const chineseChars = (fullText.match(/[\u4e00-\u9fff]/g) || []).length;
  const totalChars = fullText.replace(/\s/g, "").length || 1;
  const chineseRatio = chineseChars / totalChars;

  let language: "CANTONESE_TC" | "ENGLISH" | "MIXED" = "ENGLISH";
  if (chineseRatio > 0.4) language = "CANTONESE_TC";
  else if (chineseRatio > 0.1) language = "MIXED";

  // Detect geographics from common patterns
  const domainMatch = url.match(/\.hk\b|\.com\.hk\b/);
  const geographics = domainMatch ? "Hong Kong" : null;

  // Try to infer tone from writing style
  const hasExclamation = (fullText.match(/!/g) || []).length > 5;
  const toneOfVoice = hasExclamation ? "energetic, enthusiastic" : "professional";

  return {
    name,
    industry: null,
    overview: overview ? overview.slice(0, 400) : null,
    keyDifferentiators: [],
    targetAudience: {
      demographics: null,
      geographics,
      painPoints: [],
    },
    mainProducts: productItems.slice(0, 6),
    toneOfVoice,
    language,
  };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let url: string;
  try {
    const body = await req.json();
    url = body.url;
    new URL(url); // validate
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  // Step 1: Scrape the website
  let scraped: { raw: string; quick: QuickExtract };
  try {
    scraped = await scrapeWebsite(url);
  } catch (scrapeError) {
    console.error("[AUTOFILL] Scrape failed:", scrapeError);
    return NextResponse.json(
      {
        success: false,
        error: "Could not reach the website — please check the URL or fill manually",
      },
      { status: 422 }
    );
  }

  // Step 2: Try AI enrichment if configured
  if (isAIConfigured()) {
    try {
      const aiResponse = await chat(
        SCRAPE_SYSTEM_PROMPT,
        `Analyze this website content and extract brand information:\n\n${scraped.raw}`,
        { json: true, maxTokens: 2048 }
      );
      const aiData = JSON.parse(aiResponse);

      // Merge AI results with quick fallback
      const merged = {
        name: aiData.brandName ?? aiData.name ?? scraped.quick.name,
        industry: aiData.industry ?? scraped.quick.industry,
        overview: aiData.overview ?? scraped.quick.overview,
        keyDifferentiators: aiData.keyDifferentiators?.length
          ? aiData.keyDifferentiators
          : scraped.quick.keyDifferentiators,
        targetAudience: {
          demographics: aiData.targetAudience?.demographics ?? scraped.quick.targetAudience.demographics,
          geographics: aiData.targetAudience?.geographics ?? scraped.quick.targetAudience.geographics,
          painPoints: aiData.targetAudience?.painPoints?.length
            ? aiData.targetAudience.painPoints
            : scraped.quick.targetAudience.painPoints,
        },
        mainProducts: aiData.mainProducts?.length ? aiData.mainProducts : scraped.quick.mainProducts,
        toneOfVoice: aiData.toneOfVoice ?? scraped.quick.toneOfVoice,
        language: aiData.language ?? scraped.quick.language,
      };

      return NextResponse.json({
        success: true,
        aiEnriched: true,
        data: merged,
      });
    } catch (aiError) {
      // AI failed — fall through to basic extraction below
      console.warn("[AUTOFILL] AI enrichment failed, using basic extraction:", 
        aiError instanceof Error ? aiError.message : aiError
      );
    }
  }

  // Step 3: Fallback — return basic extraction without AI
  const hasAnyData =
    scraped.quick.overview ||
    scraped.quick.mainProducts.length > 0 ||
    scraped.quick.language !== "ENGLISH";

  if (hasAnyData) {
    return NextResponse.json({
      success: true,
      aiEnriched: false,
      partial: true,
      message: isAIConfigured()
        ? "AI extraction failed — basic info pre-filled from meta tags. Please review and complete manually."
        : "DeepSeek API 未設定 — 已從網站 Meta 標籤提取基本資訊，請手動補充剩餘欄位。",
      data: scraped.quick,
    });
  }

  return NextResponse.json(
    {
      success: false,
      error: "Could not extract useful information from this website — please fill manually",
    },
    { status: 422 }
  );
}
