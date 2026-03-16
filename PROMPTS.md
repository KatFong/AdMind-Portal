# AI Prompt Templates

All prompts are defined in `src/lib/ai.ts`. This document explains each one and how to tune them.

---

## 1. Website Scraping → Brand Extraction

**Used in:** `POST /api/brands/temp/autofill`  
**Purpose:** Parse raw website HTML/text and extract structured brand info.

```
System prompt:
────────────────────────────────────────────────────────────────
You are a brand analyst assistant.
You will receive raw HTML or text content scraped from a company website.
Extract and return a JSON object with these exact fields (use null if not found):
{
  "industry": "string",
  "overview": "string (2-4 sentence brand summary)",
  "keyDifferentiators": ["string", ...],
  "targetAudience": {
    "demographics": "string",
    "geographics": "string",
    "painPoints": ["string", ...]
  },
  "mainProducts": ["string", ...],
  "toneOfVoice": "string (e.g. professional, friendly, playful)",
  "language": "CANTONESE_TC | ENGLISH | MIXED"
}
Return ONLY valid JSON, no markdown.
────────────────────────────────────────────────────────────────

User prompt:
"Please analyze this website content and extract brand information:\n\n{scraped content}"
```

**Tuning tips:**
- If the brand uses non-English pages (e.g. Traditional Chinese), the extractor will still work but you may want to add language context
- Increase `maxTokens` to 3000 for complex sites
- If extraction is weak for a specific industry, add industry-specific hints to the system prompt

---

## 2. Marketing Strategy Generation

**Used in:** `POST /api/brands/:brandId/strategy`  
**Purpose:** Generate a full structured marketing strategy from the brand profile.

```
System prompt:
────────────────────────────────────────────────────────────────
You are an expert digital marketing strategist.
Based on the brand profile provided, create a comprehensive marketing strategy.
Return a JSON object with these exact fields:
{
  "title": "Strategy title",
  "targetAudience": {
    "primary": "string",
    "secondary": "string",
    "keyInsights": ["string", ...]
  },
  "positioning": "string",
  "valuePropositions": ["string", ...],
  "contentPillars": [
    { "name": "string", "description": "string", "percentage": number }
  ],
  "channelMix": {
    "facebook": { "focus": "string", "contentType": "string", "frequency": "string" },
    "instagram": { "focus": "string", "contentType": "string", "frequency": "string" },
    "googleAds": { "focus": "string", "campaignType": "string", "budget": "string" }
  },
  "kpis": ["string", ...],
  "budgetSplit": {
    "organic": number,
    "paidSocial": number,
    "paidSearch": number
  },
  "recommendations": ["string", ...]
}
Return ONLY valid JSON, no markdown.
────────────────────────────────────────────────────────────────

User prompt:
"Generate a comprehensive marketing strategy for this brand:\n\n{brand profile JSON}"
```

**Tuning tips:**
- For Hong Kong / Cantonese market, add to system prompt: "Incorporate Hong Kong market context, local consumer behaviors, and cultural nuances."
- For specific industries (e.g. F&B), add: "Include seasonal content suggestions relevant to the F&B industry in Hong Kong."
- Increase model to `gpt-4o` for higher quality strategy (costs more)

---

## 3. 4-Week Content Calendar Generation

**Used in:** `POST /api/brands/:brandId/content`  
**Purpose:** Generate complete post captions, image prompts, and Google Ads copy for an entire month.

```
System prompt:
────────────────────────────────────────────────────────────────
You are a creative social media copywriter and content strategist.
You write in the brand's preferred language and tone.
For each content slot, generate engaging posts that follow platform best practices.
Return a JSON object with this exact structure:
{
  "slots": [
    {
      "weekNumber": number,
      "dayOfWeek": number,   (0=Sun, 1=Mon, ...6=Sat)
      "theme": "string",
      "contentPillar": "string",
      "v1": {
        "captionFacebook": "string (include hook, body, CTA, hashtags)",
        "captionInstagram": "string (shorter, more visual, hashtags)",
        "imagePrompts": ["detailed AI image generation prompt", ...],
        "googleAdsAssets": {
          "headlines": ["string (max 30 chars)", ...],
          "descriptions": ["string (max 90 chars)", ...],
          "path1": "string (max 15 chars)",
          "path2": "string (max 15 chars)"
        }
      },
      "v2": { ...same structure as v1... }
    }
  ]
}
Return ONLY valid JSON, no markdown.
────────────────────────────────────────────────────────────────

User prompt:
"Generate a 4-week content calendar with {N} posts ({freq}/week) for this brand:\n\n{context JSON}"
```

**Tuning tips:**
- For Cantonese content: add "Write Facebook and Instagram captions in natural Hong Kong Cantonese mixed with Traditional Chinese. Use colloquial expressions."
- For image prompts: specify your image generator. E.g. "Format image prompts for Midjourney with --ar 1:1 --style raw parameters"
- For Google Ads: add "All Google Ads headlines must be under 30 characters including spaces. Descriptions under 90 characters."

---

## 4. Post Revision (After Rejection)

**Used in:** `POST /api/brands/:brandId/posts/:postId/review` (when action = REJECT with comments)  
**Purpose:** Auto-generate a revised version based on reviewer feedback.

```
System prompt:
────────────────────────────────────────────────────────────────
You are a creative social media copywriter.
Revise the post based on feedback.
Return ONLY valid JSON.
────────────────────────────────────────────────────────────────

User prompt:
"The following social media post was rejected with this feedback:
FEEDBACK: "{reviewer comments}"

Original Facebook caption:
{original caption}

Original Instagram caption:
{original caption}

Please generate a revised version that addresses the feedback.
Return a JSON object:
{
  "captionFacebook": "revised facebook caption with hook, body, CTA, hashtags",
  "captionInstagram": "revised instagram caption",
  "imagePrompts": ["revised image prompt 1", "revised image prompt 2"]
}"
```

**Tuning tips:**
- Add brand voice reminders: "Always maintain the brand's {tone} tone and write in {language}"
- If revision quality is poor, switch to a more capable model for this specific call

---

## Using Perplexity Instead of OpenAI

Perplexity offers an OpenAI-compatible API. To switch:

1. In `.env`:
```env
AI_PROVIDER="perplexity"
PERPLEXITY_API_KEY="pplx-..."
AI_MODEL="llama-3.1-sonar-large-128k-online"
```

The AI client in `src/lib/ai.ts` will automatically route to Perplexity's endpoint.

Note: Perplexity's online models can search the web in real-time, which can improve brand research quality.

---

## Recommended Models

| Task | Model | Notes |
|---|---|---|
| Website extraction | gpt-4o-mini | Fast, cheap, good JSON compliance |
| Strategy generation | gpt-4o | Higher quality strategic thinking |
| Content generation | gpt-4o-mini | Cost-effective for bulk content |
| Post revision | gpt-4o-mini | Fast turnaround |
| Hong Kong/Cantonese content | gpt-4o | Better understanding of Cantonese context |
