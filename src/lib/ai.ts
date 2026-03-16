// Lazy AI client — OpenAI SDK is only loaded when chat() is first called,
// not at module import time. This significantly reduces cold start time.
import type OpenAI from "openai";

let _client: OpenAI | null = null;
let _model: string | null = null;

function getModel(): string {
  if (_model) return _model;
  const provider = process.env.AI_PROVIDER ?? "openai";
  const envModel = process.env.AI_MODEL;
  if (envModel) return (_model = envModel);
  const defaults: Record<string, string> = {
    openai: "gpt-4o-mini",
    perplexity: "llama-3.1-sonar-large-128k-online",
    deepseek: "deepseek-chat",
    groq: "llama3-8b-8192",
    azure: "gpt-4o",
  };
  return (_model = defaults[provider] ?? "gpt-4o-mini");
}

async function getClient(): Promise<OpenAI> {
  if (_client) return _client;
  // Dynamic import — only loads openai SDK when actually needed
  const { default: OpenAI } = await import("openai");
  const provider = process.env.AI_PROVIDER ?? "openai";
  const configs: Record<string, { apiKey: string; baseURL?: string }> = {
    openai:      { apiKey: process.env.OPENAI_API_KEY ?? "" },
    perplexity:  { apiKey: process.env.PERPLEXITY_API_KEY ?? "", baseURL: "https://api.perplexity.ai" },
    deepseek:    { apiKey: process.env.DEEPSEEK_API_KEY ?? "",   baseURL: "https://api.deepseek.com/v1" },
    groq:        { apiKey: process.env.GROQ_API_KEY ?? "",       baseURL: "https://api.groq.com/openai/v1" },
    azure:       { apiKey: process.env.AZURE_OPENAI_API_KEY ?? "", baseURL: process.env.AZURE_OPENAI_ENDPOINT ?? "" },
  };
  _client = new OpenAI(configs[provider] ?? configs.openai);
  return _client;
}

// ─── Core helper ─────────────────────────────────────────────────────────────

export async function chat(
  systemPrompt: string,
  userPrompt: string,
  opts: { json?: boolean; maxTokens?: number } = {}
): Promise<string> {
  const ai = await getClient();
  const response = await ai.chat.completions.create({
    model: getModel(),
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    max_tokens: opts.maxTokens ?? 4096,
    response_format: opts.json ? { type: "json_object" } : undefined,
  });
  return response.choices[0]?.message?.content ?? "";
}

export function isAIConfigured(): boolean {
  const provider = process.env.AI_PROVIDER ?? "openai";
  const keyMap: Record<string, string | undefined> = {
    openai: process.env.OPENAI_API_KEY,
    perplexity: process.env.PERPLEXITY_API_KEY,
    deepseek: process.env.DEEPSEEK_API_KEY,
    groq: process.env.GROQ_API_KEY,
    azure: process.env.AZURE_OPENAI_API_KEY,
  };
  const key = keyMap[provider];
  return !!(key && key.length > 10 && !key.startsWith("sk-...") && key !== "sk-...");
}

// ─── Website scraping + AI extraction ────────────────────────────────────────

export const SCRAPE_SYSTEM_PROMPT = `你是一位品牌分析師助手。
你會收到從公司網站爬取的 HTML 或純文字內容。
請提取並以繁體中文回傳以下 JSON 格式（如找不到則填 null）：
{
  "brandName": "品牌／公司正式名稱",
  "industry": "行業類別（繁體中文）",
  "overview": "品牌簡介（繁體中文，2-4句）",
  "keyDifferentiators": ["差異化優勢1", "差異化優勢2", ...],
  "targetAudience": {
    "demographics": "目標受眾人口特徵（繁體中文）",
    "geographics": "地理位置（繁體中文）",
    "painPoints": ["痛點1", "痛點2", ...]
  },
  "mainProducts": ["產品/服務1", "產品/服務2", ...],
  "toneOfVoice": "語調風格（例如：專業、親切、活潑）",
  "language": "CANTONESE_TC | ENGLISH | MIXED"
}
只回傳有效 JSON，不要加任何 markdown。`;

// ─── Strategy generation ──────────────────────────────────────────────────────

export const STRATEGY_SYSTEM_PROMPT = `你是一位資深數碼行銷策略師。
請根據提供的品牌資料，以【繁體中文】撰寫完整的行銷策略。
所有文字欄位必須使用繁體中文，數字欄位保持數字格式。
回傳以下 JSON 格式：
{
  "title": "策略標題（繁體中文）",
  "targetAudience": {
    "primary": "主要目標受眾描述",
    "secondary": "次要目標受眾描述",
    "keyInsights": ["洞察1", "洞察2", ...]
  },
  "positioning": "品牌定位聲明",
  "valuePropositions": ["價值主張1", "價值主張2", ...],
  "contentPillars": [
    { "name": "內容支柱名稱", "description": "說明", "percentage": 數字 }
  ],
  "channelMix": {
    "facebook": { "focus": "重點", "contentType": "內容類型", "frequency": "發佈頻率" },
    "instagram": { "focus": "重點", "contentType": "內容類型", "frequency": "發佈頻率" },
    "googleAds": { "focus": "重點", "campaignType": "廣告類型", "budget": "預算建議" }
  },
  "kpis": ["KPI指標1", "KPI指標2", ...],
  "budgetSplit": {
    "organic": 數字,
    "paidSocial": 數字,
    "paidSearch": 數字
  },
  "recommendations": ["建議1", "建議2", ...]
}
只回傳有效 JSON，不要加任何 markdown。`;

// ─── Content generation ───────────────────────────────────────────────────────

export const CONTENT_SYSTEM_PROMPT = `你是一位創意社交媒體文案撰寫師及內容策略師。
請以品牌的語調和指定語言撰寫貼文，所有說明性文字使用繁體中文。
Facebook 和 Instagram 文案須以品牌語言撰寫（視乎品牌設定為粵語、英文或混合）。
圖片提示詞（imagePrompts）請用英文撰寫，以便 AI 圖像生成工具使用。
Google Ads 文案視乎品牌語言設定。

回傳以下 JSON 格式：
{
  "slots": [
    {
      "weekNumber": 數字,
      "dayOfWeek": 數字（0=週日，1=週一，...6=週六）,
      "theme": "貼文主題（繁體中文）",
      "contentPillar": "內容支柱（繁體中文）",
      "v1": {
        "captionFacebook": "Facebook 文案（包含吸引開頭、內文、CTA、hashtags）",
        "captionInstagram": "Instagram 文案（較短、視覺感強、含 hashtags）",
        "imagePrompts": ["English image generation prompt 1 (detailed, specific style)", "English image prompt 2"],
        "googleAdsAssets": {
          "headlines": ["標題1（最多30字）", "標題2", "標題3"],
          "descriptions": ["描述1（最多90字）", "描述2"],
          "path1": "路徑1（最多15字）",
          "path2": "路徑2（最多15字）"
        }
      },
      "v2": {
        "captionFacebook": "另一角度的 Facebook 文案",
        "captionInstagram": "另一角度的 Instagram 文案",
        "imagePrompts": ["English image prompt 1", "English image prompt 2"],
        "googleAdsAssets": {
          "headlines": ["標題1", "標題2", "標題3"],
          "descriptions": ["描述1", "描述2"],
          "path1": "路徑1",
          "path2": "路徑2"
        }
      }
    }
  ]
}
只回傳有效 JSON，不要加任何 markdown。`;

