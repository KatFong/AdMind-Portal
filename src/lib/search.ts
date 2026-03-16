import { tavily } from "@tavily/core";

// ─── Search client ────────────────────────────────────────────────────────────

function createSearchClient() {
  const key = process.env.TAVILY_API_KEY;
  if (!key || key === "tvly-...") return null;
  return tavily({ apiKey: key });
}

export interface SearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

export interface CompetitorResearch {
  competitors: CompetitorProfile[];
  industryBenchmarks: string[];
  successCases: SuccessCase[];
  marketInsights: string[];
  sources: { title: string; url: string }[];
  searchedAt: string;
  method: "web_search" | "ai_knowledge";
}

export interface CompetitorProfile {
  name: string;
  description: string;
  strengths: string[];
  marketingApproach: string;
  estimatedReach?: string;
}

export interface SuccessCase {
  brand: string;
  campaign: string;
  result: string;
  tactic: string;
  data?: string;
}

// ─── Main competitive research function ──────────────────────────────────────

export async function researchCompetitors(params: {
  brandName: string;
  industry: string;
  targetAudience?: string;
  channels: string[];
  language: string;
}): Promise<CompetitorResearch> {
  const client = createSearchClient();

  if (!client) {
    // Fallback: no Tavily key — use AI knowledge only
    return {
      competitors: [],
      industryBenchmarks: [],
      successCases: [],
      marketInsights: [],
      sources: [],
      searchedAt: new Date().toISOString(),
      method: "ai_knowledge",
    };
  }

  const lang = params.language === "CANTONESE_TC" || params.language === "MIXED" ? "Hong Kong" : "global";

  const queries = [
    `${params.industry} brand marketing strategy success case study results data ${lang} 2024 2025`,
    `best ${params.industry} social media marketing campaigns engagement rate ROI examples`,
    `${params.industry} digital marketing benchmark statistics conversion rate ${lang}`,
    `top ${params.industry} brands ${lang} marketing tactics Facebook Instagram`,
  ];

  // Run all searches in parallel
  const searchPromises = queries.map((q) =>
    client
      .search(q, {
        searchDepth: "advanced",
        maxResults: 4,
        includeAnswer: true,
      })
      .catch(() => null)
  );

  const results = await Promise.all(searchPromises);

  // Flatten & deduplicate sources
  const allSources: SearchResult[] = [];
  const seenUrls = new Set<string>();

  for (const res of results) {
    if (!res) continue;
    for (const r of res.results ?? []) {
      if (!seenUrls.has(r.url)) {
        seenUrls.add(r.url);
        allSources.push({
          title: r.title ?? "",
          url: r.url ?? "",
          content: r.content ?? "",
          score: r.score ?? 0,
        });
      }
    }
  }

  // Sort by relevance score and take top 10
  const topSources = allSources.sort((a, b) => b.score - a.score).slice(0, 10);

  return {
    competitors: [],
    industryBenchmarks: [],
    successCases: [],
    marketInsights: [],
    sources: topSources.map((s) => ({ title: s.title, url: s.url })),
    searchedAt: new Date().toISOString(),
    method: "web_search",
    // Raw content passed to AI for synthesis
    _rawContent: topSources.map((s) => `SOURCE: ${s.title}\nURL: ${s.url}\n${s.content}`).join("\n\n---\n\n"),
  } as CompetitorResearch & { _rawContent?: string };
}

export function isTavilyConfigured(): boolean {
  const key = process.env.TAVILY_API_KEY;
  return !!(key && key.length > 10 && key !== "tvly-...");
}
