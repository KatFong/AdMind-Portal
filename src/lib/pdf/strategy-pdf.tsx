import React from "react";
import {
  Document, Page, View, Text, Font, Svg,
  Rect, Line, Circle, Path, G,
  StyleSheet, pdf,
} from "@react-pdf/renderer";
import path from "path";

// ─── Font registration ────────────────────────────────────────────────────────

const fontDir = path.join(process.cwd(), "public", "fonts");
Font.register({
  family: "NotoSansTC",
  fonts: [
    { src: path.join(fontDir, "NotoSansTC-Regular.otf"), fontWeight: 400 },
    { src: path.join(fontDir, "NotoSansTC-Bold.otf"), fontWeight: 700 },
  ],
});
Font.registerHyphenationCallback((word) => [word]);

// ─── Color palette ────────────────────────────────────────────────────────────

const C = {
  navy: "#0F172A",
  navyLight: "#1E293B",
  indigo: "#4F46E5",
  indigoLight: "#818CF8",
  purple: "#7C3AED",
  emerald: "#10B981",
  amber: "#F59E0B",
  pink: "#EC4899",
  slate100: "#F1F5F9",
  slate200: "#E2E8F0",
  slate400: "#94A3B8",
  slate600: "#475569",
  slate800: "#1E293B",
  white: "#FFFFFF",
  chartColors: ["#4F46E5", "#7C3AED", "#10B981", "#F59E0B", "#EC4899", "#06B6D4"],
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: { fontFamily: "NotoSansTC", backgroundColor: C.white, padding: 0 },
  coverPage: { fontFamily: "NotoSansTC", backgroundColor: C.navy, padding: 0 },

  // Cover
  coverBg: { flex: 1, padding: 56, justifyContent: "space-between" },
  coverTag: { fontSize: 9, color: C.indigoLight, letterSpacing: 2, marginBottom: 8, fontWeight: 700 },
  coverBrandInitial: {
    width: 72, height: 72, borderRadius: 18,
    backgroundColor: C.indigo, alignItems: "center", justifyContent: "center",
    marginBottom: 32,
  },
  coverInitialText: { fontSize: 36, color: C.white, fontWeight: 700 },
  coverBrand: { fontSize: 11, color: C.indigoLight, letterSpacing: 1, fontWeight: 700, marginBottom: 8 },
  coverTitle: { fontSize: 28, color: C.white, fontWeight: 700, lineHeight: 1.3, marginBottom: 16 },
  coverDate: { fontSize: 10, color: C.slate400, marginTop: 8 },
  coverFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  coverFooterTag: { fontSize: 9, color: C.slate400 },
  coverDivider: { height: 2, width: 48, backgroundColor: C.indigo, marginBottom: 32 },

  // Page header stripe
  pageStripe: { height: 5, backgroundColor: C.indigo },
  pageBody: { padding: "32 40 40 40", flex: 1 },

  // Section heading
  sectionTag: { fontSize: 8, color: C.indigo, letterSpacing: 2, fontWeight: 700, marginBottom: 6 },
  sectionTitle: { fontSize: 18, color: C.navy, fontWeight: 700, marginBottom: 4 },
  sectionSub: { fontSize: 9, color: C.slate400, marginBottom: 20 },
  divider: { height: 1, backgroundColor: C.slate200, marginBottom: 20 },

  // Cards
  card: { backgroundColor: C.slate100, borderRadius: 8, padding: 14, marginBottom: 10 },
  cardDark: { backgroundColor: C.navyLight, borderRadius: 8, padding: 14, marginBottom: 10 },
  cardTitle: { fontSize: 11, color: C.navy, fontWeight: 700, marginBottom: 4 },
  cardTitleLight: { fontSize: 11, color: C.white, fontWeight: 700, marginBottom: 4 },
  cardBody: { fontSize: 9, color: C.slate600, lineHeight: 1.6 },
  cardBodyLight: { fontSize: 9, color: C.slate400, lineHeight: 1.6 },

  // Tags/pills
  pill: { backgroundColor: "#EEF2FF", borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, marginRight: 4, marginBottom: 4 },
  pillText: { fontSize: 8, color: C.indigo, fontWeight: 700 },
  pillDark: { backgroundColor: "rgba(79,70,229,0.2)", borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, marginRight: 4, marginBottom: 4 },
  pillDarkText: { fontSize: 8, color: C.indigoLight },

  // Data stat
  statBox: { flex: 1, backgroundColor: "rgba(79,70,229,0.12)", borderRadius: 8, padding: 12, alignItems: "center" },
  statNum: { fontSize: 18, color: C.indigoLight, fontWeight: 700 },
  statLabel: { fontSize: 8, color: C.slate400, marginTop: 2, textAlign: "center" },

  // Grid
  row: { flexDirection: "row", gap: 10 },
  col: { flex: 1 },

  // Text
  label: { fontSize: 8, color: C.slate400, letterSpacing: 1, fontWeight: 700, marginBottom: 4 },
  body: { fontSize: 9.5, color: C.slate600, lineHeight: 1.7 },
  bodySmall: { fontSize: 8.5, color: C.slate600, lineHeight: 1.6 },
  highlight: { fontSize: 10, color: C.emerald, fontWeight: 700 },
  pageNum: { position: "absolute", bottom: 16, right: 40, fontSize: 8, color: C.slate400 },
  footer: { position: "absolute", bottom: 16, left: 40, fontSize: 8, color: C.slate400 },
});

// ─── Helper: Bar chart (SVG) ──────────────────────────────────────────────────

function BarChart({ data, width = 480, height = 120 }: {
  data: { label: string; value: number; color: string }[];
  width?: number;
  height?: number;
}) {
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const barH = 16;
  const gap = 10;
  const labelW = 120;
  const barMaxW = width - labelW - 60;
  return (
    <Svg width={width} height={data.length * (barH + gap) + 10}>
      {data.map((d, i) => {
        const y = i * (barH + gap);
        const barW = (d.value / maxVal) * barMaxW;
        return (
          <G key={i}>
            <Rect x={0} y={y + 2} width={barW} height={barH} rx={4} fill={d.color} />
            <Rect x={0} y={y + 2} width={barW} height={barH} rx={4} fill={d.color} opacity={0.15} />
            <Rect x={0} y={y + 2} width={barW} height={barH} rx={4} fill={d.color} />
          </G>
        );
      })}
    </Svg>
  );
}

// ─── Helper: Donut chart (SVG) ────────────────────────────────────────────────

function DonutChart({ data, size = 120 }: {
  data: { label: string; value: number; color: string }[];
  size?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.38;
  const innerR = size * 0.22;
  const total = data.reduce((s, d) => s + d.value, 0) || 1;

  let cumAngle = -90;
  const arcs: React.ReactElement[] = [];

  data.forEach((d, i) => {
    const angle = (d.value / total) * 360;
    const start = cumAngle;
    const end = cumAngle + angle;
    const startRad = (start * Math.PI) / 180;
    const endRad = (end * Math.PI) / 180;
    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);
    const ix1 = cx + innerR * Math.cos(startRad);
    const iy1 = cy + innerR * Math.sin(startRad);
    const ix2 = cx + innerR * Math.cos(endRad);
    const iy2 = cy + innerR * Math.sin(endRad);
    const largeArc = angle > 180 ? 1 : 0;

    const pathD = [
      `M ${x1} ${y1}`,
      `A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${ix2} ${iy2}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix1} ${iy1}`,
      "Z",
    ].join(" ");

    arcs.push(<Path key={i} d={pathD} fill={d.color} />);
    cumAngle += angle;
  });

  return (
    <Svg width={size} height={size}>
      {arcs}
      <Circle cx={cx} cy={cy} r={innerR - 2} fill={C.white} />
    </Svg>
  );
}

// ─── Page wrapper ─────────────────────────────────────────────────────────────

function ReportPage({ children, pageNum, brandName }: {
  children: React.ReactNode;
  pageNum: number;
  brandName: string;
}) {
  return (
    <Page size="A4" style={s.page}>
      <View style={s.pageStripe} />
      <View style={s.pageBody}>{children}</View>
      <Text style={s.footer}>{brandName} · AI Marketing Portal</Text>
      <Text style={s.pageNum}>{pageNum}</Text>
    </Page>
  );
}

// ─── Data types ───────────────────────────────────────────────────────────────

export interface StrategyPdfData {
  brandName: string;
  strategyTitle: string;
  strategyVersion: number;
  createdAt: string;
  positioning?: string;
  targetAudience?: { primary?: string; secondary?: string; keyInsights?: string[] };
  valuePropositions?: string[];
  contentPillars?: Array<{ name: string; description?: string; percentage: number }>;
  channelMix?: Record<string, { focus?: string; contentType?: string; frequency?: string; budget?: string }>;
  budgetSplit?: { organic?: number; paidSocial?: number; paidSearch?: number };
  kpis?: string[];
  ci?: {
    topCompetitors?: Array<{ name: string; marketingApproach: string; keyTactics?: string[]; estimatedReach?: string; relevantData?: string }>;
    successCases?: Array<{ brand: string; campaign?: string; tactic: string; result: string; data?: string }>;
    industryBenchmarks?: string[];
    marketGaps?: string[];
    differentiationOpportunity?: string;
    searchMethod?: string;
    sources?: Array<{ title: string; url: string }>;
  };
}

// ─── PDF Document ─────────────────────────────────────────────────────────────

export function StrategyPdfDocument({ data }: { data: StrategyPdfData }) {
  const today = new Date(data.createdAt).toLocaleDateString("zh-TW", {
    year: "numeric", month: "long", day: "numeric",
  });
  let pageNum = 1;

  const budgetData = [
    { label: "自然內容", value: data.budgetSplit?.organic ?? 0, color: C.indigo },
    { label: "付費社交", value: data.budgetSplit?.paidSocial ?? 0, color: C.pink },
    { label: "付費搜尋", value: data.budgetSplit?.paidSearch ?? 0, color: C.amber },
  ].filter((d) => d.value > 0);

  const pillarData = (data.contentPillars ?? []).map((p, i) => ({
    label: p.name, value: p.percentage, color: C.chartColors[i % C.chartColors.length],
  }));

  return (
    <Document title={`${data.brandName} 行銷策略報告`} author="AI Marketing Portal">
      {/* ── Page 1: Cover ─────────────────────────────────────────────────── */}
      <Page size="A4" style={s.coverPage}>
        <View style={s.coverBg}>
          <View>
            <Text style={s.coverTag}>AI MARKETING PORTAL · STRATEGY REPORT</Text>
            <View style={s.coverDivider} />
            <View style={s.coverBrandInitial}>
              <Text style={s.coverInitialText}>{data.brandName.charAt(0)}</Text>
            </View>
            <Text style={s.coverBrand}>{data.brandName.toUpperCase()}</Text>
            <Text style={s.coverTitle}>{data.strategyTitle}</Text>
            <Text style={s.coverDate}>策略版本 v{data.strategyVersion} · 生成日期：{today}</Text>
          </View>

          <View style={s.coverFooter}>
            <Text style={s.coverFooterTag}>CONFIDENTIAL · FOR CLIENT USE ONLY</Text>
            <Text style={s.coverFooterTag}>第 1 頁</Text>
          </View>
        </View>
      </Page>

      {/* ── Page 2: Competitive Intelligence — Competitors ─────────────────── */}
      {data.ci && (
        <ReportPage pageNum={++pageNum} brandName={data.brandName}>
          <Text style={s.sectionTag}>COMPETITIVE INTELLIGENCE</Text>
          <Text style={s.sectionTitle}>競爭對手分析</Text>
          <Text style={s.sectionSub}>
            {data.ci.searchMethod === "web_search"
              ? `即時網路搜尋數據 · ${data.ci.sources?.length ?? 0} 個來源`
              : "基於 AI 訓練知識"}
          </Text>
          <View style={s.divider} />

          {(data.ci.topCompetitors ?? []).slice(0, 3).map((comp, i) => (
            <View key={i} style={s.card}>
              <View style={[s.row, { marginBottom: 6 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardTitle}>#{i + 1} {comp.name}</Text>
                  {comp.estimatedReach && (
                    <Text style={{ fontSize: 8, color: C.indigo }}>觸及估算：{comp.estimatedReach}</Text>
                  )}
                </View>
                {/* Mini bar — reach indicator */}
                <View style={{ width: 80, justifyContent: "center" }}>
                  <View style={{ height: 6, backgroundColor: C.slate200, borderRadius: 3 }}>
                    <View style={{
                      height: 6, borderRadius: 3,
                      width: `${Math.max(20, 100 - i * 25)}%`,
                      backgroundColor: C.chartColors[i],
                    }} />
                  </View>
                </View>
              </View>
              <Text style={s.cardBody}>{comp.marketingApproach}</Text>
              {comp.keyTactics && comp.keyTactics.length > 0 && (
                <View style={[s.row, { flexWrap: "wrap", marginTop: 6 }]}>
                  {comp.keyTactics.slice(0, 4).map((t, j) => (
                    <View key={j} style={s.pill}><Text style={s.pillText}>{t}</Text></View>
                  ))}
                </View>
              )}
              {comp.relevantData && (
                <View style={{ marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: C.slate200 }}>
                  <Text style={{ fontSize: 8, color: C.indigo }}>📊 {comp.relevantData}</Text>
                </View>
              )}
            </View>
          ))}

          {/* Extra competitors (4+) */}
          {(data.ci.topCompetitors ?? []).length > 3 && (
            <View style={[s.row, { flexWrap: "wrap" }]}>
              {(data.ci.topCompetitors ?? []).slice(3).map((comp, i) => (
                <View key={i} style={[s.pill, { marginBottom: 6 }]}>
                  <Text style={s.pillText}>{comp.name}</Text>
                </View>
              ))}
            </View>
          )}
        </ReportPage>
      )}

      {/* ── Page 3: Success Cases & Benchmarks ────────────────────────────── */}
      {data.ci && (
        <ReportPage pageNum={++pageNum} brandName={data.brandName}>
          <Text style={s.sectionTag}>MARKET RESEARCH</Text>
          <Text style={s.sectionTitle}>成功案例與行業基準</Text>
          <View style={s.divider} />

          <View style={s.row}>
            {/* Success cases */}
            <View style={[s.col, { flex: 1.2 }]}>
              <Text style={[s.label, { marginBottom: 8 }]}>🏆 成功行銷案例</Text>
              {(data.ci.successCases ?? []).slice(0, 4).map((sc, i) => (
                <View key={i} style={[s.card, { marginBottom: 8 }]}>
                  <Text style={[s.cardTitle, { fontSize: 10 }]}>{sc.brand}</Text>
                  {sc.campaign && <Text style={{ fontSize: 8, color: C.slate400, marginBottom: 4 }}>{sc.campaign}</Text>}
                  <Text style={s.cardBody}>{sc.tactic}</Text>
                  {sc.data && (
                    <View style={{ marginTop: 6, backgroundColor: "#ECFDF5", borderRadius: 6, padding: 6 }}>
                      <Text style={{ fontSize: 8, color: C.emerald, fontWeight: 700 }}>📈 {sc.data}</Text>
                    </View>
                  )}
                  {!sc.data && sc.result && (
                    <Text style={{ fontSize: 8, color: C.emerald, marginTop: 4 }}>✓ {sc.result}</Text>
                  )}
                </View>
              ))}
            </View>

            {/* Benchmarks + Gaps */}
            <View style={s.col}>
              <Text style={[s.label, { marginBottom: 8 }]}>◆ 行業基準數據</Text>
              {(data.ci.industryBenchmarks ?? []).map((b, i) => (
                <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 6 }}>
                  <Text style={{ color: C.amber, fontSize: 9, marginRight: 4, marginTop: 1 }}>◆</Text>
                  <Text style={[s.bodySmall, { flex: 1 }]}>{b}</Text>
                </View>
              ))}

              {(data.ci.marketGaps ?? []).length > 0 && (
                <>
                  <Text style={[s.label, { marginTop: 16, marginBottom: 8 }]}>⚡ 市場機遇</Text>
                  {(data.ci.marketGaps ?? []).map((gap, i) => (
                    <View key={i} style={{ backgroundColor: "#FFFBEB", borderRadius: 6, padding: 7, marginBottom: 6, borderLeftWidth: 2, borderLeftColor: C.amber }}>
                      <Text style={[s.bodySmall, { color: "#92400E" }]}>{gap}</Text>
                    </View>
                  ))}
                </>
              )}

              {data.ci.differentiationOpportunity && (
                <>
                  <Text style={[s.label, { marginTop: 16, marginBottom: 8 }]}>🎯 差異化機會</Text>
                  <View style={{ backgroundColor: "#EEF2FF", borderRadius: 6, padding: 10, borderLeftWidth: 3, borderLeftColor: C.indigo }}>
                    <Text style={[s.bodySmall, { color: "#3730A3" }]}>{data.ci.differentiationOpportunity}</Text>
                  </View>
                </>
              )}
            </View>
          </View>

          {/* Sources */}
          {data.ci.sources && data.ci.sources.length > 0 && (
            <View style={{ marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.slate200 }}>
              <Text style={[s.label, { marginBottom: 6 }]}>資料來源</Text>
              <View style={[s.row, { flexWrap: "wrap" }]}>
                {data.ci.sources.slice(0, 5).map((src, i) => (
                  <View key={i} style={[s.pill, { marginBottom: 4 }]}>
                    <Text style={[s.pillText, { fontWeight: 400 }]}>
                      [{i + 1}] {src.title.slice(0, 35)}{src.title.length > 35 ? "…" : ""}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ReportPage>
      )}

      {/* ── Page 4: Brand Strategy ─────────────────────────────────────────── */}
      <ReportPage pageNum={++pageNum} brandName={data.brandName}>
        <Text style={s.sectionTag}>BRAND STRATEGY</Text>
        <Text style={s.sectionTitle}>品牌策略</Text>
        <View style={s.divider} />

        {/* Positioning */}
        {data.positioning && (
          <View style={{ marginBottom: 16 }}>
            <Text style={s.label}>定位宣言</Text>
            <View style={{ backgroundColor: "#F5F3FF", borderRadius: 8, padding: 14, borderLeftWidth: 3, borderLeftColor: C.purple }}>
              <Text style={[s.body, { color: "#4C1D95" }]}>{data.positioning}</Text>
            </View>
          </View>
        )}

        <View style={s.row}>
          {/* Target Audience */}
          {data.targetAudience && (
            <View style={s.col}>
              <Text style={[s.label, { marginBottom: 8 }]}>目標受眾</Text>
              {data.targetAudience.primary && (
                <View style={{ marginBottom: 8 }}>
                  <Text style={{ fontSize: 8, color: C.slate400, marginBottom: 3 }}>主要受眾</Text>
                  <Text style={s.bodySmall}>{data.targetAudience.primary}</Text>
                </View>
              )}
              {data.targetAudience.secondary && (
                <View style={{ marginBottom: 8 }}>
                  <Text style={{ fontSize: 8, color: C.slate400, marginBottom: 3 }}>次要受眾</Text>
                  <Text style={s.bodySmall}>{data.targetAudience.secondary}</Text>
                </View>
              )}
              {(data.targetAudience.keyInsights ?? []).slice(0, 4).map((ins, i) => (
                <View key={i} style={{ flexDirection: "row", marginBottom: 4 }}>
                  <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: C.purple, marginTop: 3, marginRight: 6, flexShrink: 0 }} />
                  <Text style={[s.bodySmall, { flex: 1 }]}>{ins}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Value Propositions */}
          {data.valuePropositions && data.valuePropositions.length > 0 && (
            <View style={s.col}>
              <Text style={[s.label, { marginBottom: 8 }]}>核心價值主張</Text>
              {data.valuePropositions.slice(0, 5).map((vp, i) => (
                <View key={i} style={{ flexDirection: "row", marginBottom: 7, alignItems: "flex-start" }}>
                  <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: C.indigo, alignItems: "center", justifyContent: "center", marginRight: 8, flexShrink: 0 }}>
                    <Text style={{ fontSize: 8, color: C.white, fontWeight: 700 }}>{i + 1}</Text>
                  </View>
                  <Text style={[s.bodySmall, { flex: 1, paddingTop: 2 }]}>{vp}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* KPIs */}
        {data.kpis && data.kpis.length > 0 && (
          <View style={{ marginTop: 16 }}>
            <Text style={[s.label, { marginBottom: 8 }]}>關鍵績效指標 (KPIs)</Text>
            <View style={[s.row, { flexWrap: "wrap" }]}>
              {data.kpis.map((kpi, i) => (
                <View key={i} style={{ width: "48%", flexDirection: "row", alignItems: "flex-start", marginBottom: 6, marginRight: "2%" }}>
                  <Text style={{ color: C.emerald, fontSize: 9, marginRight: 5 }}>✓</Text>
                  <Text style={[s.bodySmall, { flex: 1 }]}>{kpi}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ReportPage>

      {/* ── Page 5: Content Pillars + Budget + Channel Mix ─────────────────── */}
      <ReportPage pageNum={++pageNum} brandName={data.brandName}>
        <Text style={s.sectionTag}>CONTENT STRATEGY</Text>
        <Text style={s.sectionTitle}>內容策略與預算分配</Text>
        <View style={s.divider} />

        <View style={s.row}>
          {/* Content Pillars — bar chart */}
          {pillarData.length > 0 && (
            <View style={[s.col, { flex: 1.4 }]}>
              <Text style={[s.label, { marginBottom: 12 }]}>內容支柱分佈</Text>
              {pillarData.map((p, i) => (
                <View key={i} style={{ marginBottom: 10 }}>
                  <View style={[s.row, { marginBottom: 4, alignItems: "center" }]}>
                    <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: p.color, marginRight: 6 }} />
                    <Text style={{ fontSize: 9, color: C.slate800, flex: 1, fontWeight: 700 }}>{p.label}</Text>
                    <Text style={{ fontSize: 9, color: p.color, fontWeight: 700 }}>{p.value}%</Text>
                  </View>
                  <View style={{ height: 8, backgroundColor: C.slate200, borderRadius: 4 }}>
                    <View style={{ height: 8, borderRadius: 4, width: `${p.value}%`, backgroundColor: p.color }} />
                  </View>
                  {(data.contentPillars ?? [])[i]?.description && (
                    <Text style={{ fontSize: 7.5, color: C.slate400, marginTop: 2 }}>{(data.contentPillars ?? [])[i].description}</Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Budget donut */}
          {budgetData.length > 0 && (
            <View style={s.col}>
              <Text style={[s.label, { marginBottom: 12 }]}>預算分配</Text>
              <View style={{ alignItems: "center", marginBottom: 12 }}>
                <DonutChart data={budgetData} size={110} />
              </View>
              {budgetData.map((b, i) => (
                <View key={i} style={[s.row, { alignItems: "center", marginBottom: 6 }]}>
                  <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: b.color, marginRight: 6 }} />
                  <Text style={[s.bodySmall, { flex: 1 }]}>{b.label}</Text>
                  <Text style={{ fontSize: 9, color: b.color, fontWeight: 700 }}>{b.value}%</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Channel Mix */}
        {data.channelMix && Object.keys(data.channelMix).length > 0 && (
          <View style={{ marginTop: 20 }}>
            <Text style={[s.label, { marginBottom: 10 }]}>渠道策略</Text>
            <View style={s.row}>
              {Object.entries(data.channelMix).map(([channel, details], i) => {
                const label = channel === "googleAds" ? "Google Ads" : channel === "facebook" ? "Facebook" : channel === "instagram" ? "Instagram" : channel;
                return (
                  <View key={i} style={[s.card, s.col, { marginRight: i < Object.keys(data.channelMix ?? {}).length - 1 ? 8 : 0 }]}>
                    <View style={[s.row, { alignItems: "center", marginBottom: 6 }]}>
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.chartColors[i], marginRight: 6 }} />
                      <Text style={{ fontSize: 10, color: C.navy, fontWeight: 700 }}>{label}</Text>
                    </View>
                    {details.focus && <Text style={[s.bodySmall, { marginBottom: 3 }]}><Text style={{ fontWeight: 700 }}>重點：</Text>{details.focus}</Text>}
                    {details.contentType && <Text style={[s.bodySmall, { marginBottom: 3 }]}><Text style={{ fontWeight: 700 }}>內容：</Text>{details.contentType}</Text>}
                    {details.frequency && <Text style={s.bodySmall}><Text style={{ fontWeight: 700 }}>頻率：</Text>{details.frequency}</Text>}
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ReportPage>
    </Document>
  );
}

// ─── Helper: generate PDF buffer ─────────────────────────────────────────────

export async function generateStrategyPdf(data: StrategyPdfData): Promise<Buffer> {
  const doc = <StrategyPdfDocument data={data} />;
  const instance = pdf(doc);
  const blob = await instance.toBlob();
  const arrayBuffer = await blob.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
