import { GoogleGenerativeAI } from "@google/generative-ai";
import { INVESTOR_TYPES, type TypeKey } from "./quizTypes";
import type { Market, TradeData, WeeklyStats, BehaviorData } from "./reportUtils";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// ── 리포트 최종 콘텐츠 타입 ───────────────────────────────────
export type ReportContent = {
  weekLabel:  string;
  market:     Market;
  summary: {
    tradeCount:     number;
    soldCount:      number;
    holdingCount:   number;
    returnRate:     number;
    profitPoints:   number;
    investedPoints: number;
    winRate:        number;
    grade:          string;
  };
  bestTrade:  { ticker: string; name: string; returnPct: number } | null;
  worstTrade: { ticker: string; name: string; returnPct: number } | null;
  trades: Array<{
    ticker:         string;
    name:           string;
    status:         "sold" | "holding";
    buyAt:          string;
    sellAt:         string | null;
    buyPrice:       number;
    sellPrice:      number | null;
    returnPct:      number | null;
    investedPoints: number;
    finalPoints:    number | null;
    newsContext:    string;
  }>;
  holdings: Array<{
    ticker:         string;
    name:           string;
    buyAt:          string;
    buyPrice:       number;
    currentPrice:   number;
    returnPct:      number;
    investedPoints: number;
  }>;
  behavior: {
    avgHoldingDays: number;
    topSector:      string;
    activeDays:     string[];
    tags:           string[];
  };
  dna: {
    type:        string;
    emoji:       string;
    commentary:  string;
  };
  aiNarrative: string;
};

// ── Gemini 응답 타입 ─────────────────────────────────────────
type GeminiOutput = {
  trades:      { ticker: string; newsContext: string }[];
  dna:         { commentary: string };
  aiNarrative: string;
};

// ── 프롬프트 빌더 ────────────────────────────────────────────
function buildPrompt(p: {
  nickname:    string;
  dnaType:     string | null;
  market:      Market;
  weekLabel:   string;
  trades:      TradeData[];
  holdings:    TradeData[];
  stats:       WeeklyStats;
  behavior:    BehaviorData;
}): string {
  const dnaInfo     = p.dnaType ? INVESTOR_TYPES[p.dnaType as TypeKey] : null;
  const marketLabel = p.market === "kr" ? "한국 주식" : "해외 주식";

  const tradeList = p.trades.length > 0
    ? p.trades.map((t, i) => `
  [거래 ${i + 1}] ${t.name} (${t.ticker})
  - 매수일: ${t.buyAt} | 매수가: ${t.buyPrice.toLocaleString()}
  - 매도일: ${t.sellAt} | 매도가: ${t.sellPrice?.toLocaleString() ?? "N/A"}
  - 수익률: ${t.returnPct !== null ? (t.returnPct >= 0 ? "+" : "") + t.returnPct.toFixed(2) + "%" : "N/A"}
  - 투자 ${t.investedPoints.toLocaleString()}P → 최종 ${t.finalPoints?.toLocaleString() ?? "N/A"}P`).join("\n")
    : "  (매도 완료 거래 없음)";

  const holdingList = p.holdings.length > 0
    ? p.holdings.map((h, i) => `
  [보유 ${i + 1}] ${h.name} (${h.ticker})
  - 매수일: ${h.buyAt} | 매수가: ${h.buyPrice.toLocaleString()}
  - 현재가: ${h.currentPrice?.toLocaleString() ?? "N/A"}
  - 평가 수익률: ${h.returnPct !== null ? (h.returnPct >= 0 ? "+" : "") + h.returnPct.toFixed(2) + "%" : "N/A"}
  - 투자 ${h.investedPoints.toLocaleString()}P`).join("\n")
    : "  (현재 보유 종목 없음)";

  return `
당신은 PICO 모의투자 서비스의 주간 AI 리포트 생성기입니다.
PICO는 실제 돈이 아닌 포인트(P)로 모의투자를 경험하는 투자 학습 플랫폼입니다.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚫  절대 금지 규칙  (법적 리스크 방지)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. "사세요 / 파세요 / 매수하세요 / 매도하세요" — 투자 권유 절대 금지
2. "이때 팔았어야 했는데", "더 기다렸다면 수익이 났을 텐데" — 후회 유발 절대 금지
3. 특정 종목의 미래 주가 방향 예측 또는 암시 — 절대 금지
4. "지금이 기회", "지금 팔면 손해" 등 행동 유발 문구 — 절대 금지
5. 손실을 유저의 잘못으로 귀인하는 표현 — 절대 금지

✅  허용 기준
- 공개된 뉴스 헤드라인을 날짜·출처와 함께 사실로만 언급
- 유저의 실제 거래 데이터를 기반으로 한 객관적 수치 및 통계
- 업종·매매 스타일 패턴 관찰 (판단·평가 없이 팩트만)
- DNA 타입과 행동 패턴의 비교 (관찰만, 잘함·못함 평가 금지)
- 불확실한 뉴스는 newsContext를 빈 문자열("")로 두기

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✍️  출력 형식 규칙
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- **볼드** 사용 대상: 종목명, 핵심 수치(%), 중요 단어
  예) **엔비디아**, **+5.3%**, **3건**
- ==형광펜== 사용 대상: aiNarrative 전체에서 최대 2개, 가장 핵심 문장에만
  예) ==이번 주 가장 눈에 띈 거래는 엔비디아였어요==
- 1문장 = 1팩트 원칙. 문장은 짧고 임팩트 있게.
- 모든 문장은 해요체 존댓말 사용. 반말 금지.
- aiNarrative: 반드시 150자 이내 (한국어 기준)
- dna.commentary: 반드시 80자 이내, 관찰 문장으로만

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤  유저 정보
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
닉네임: ${p.nickname}
투자 DNA: ${dnaInfo ? `${dnaInfo.emoji} ${dnaInfo.modifier} ${dnaInfo.name}` : "미설정"}
DNA 특성 요약: ${dnaInfo ? dnaInfo.desc.slice(0, 120) : "N/A"}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊  이번 주 거래 데이터  (${marketLabel} / ${p.weekLabel})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

▶ 매도 완료 거래 (${p.trades.length}건)
${tradeList}

▶ 현재 보유 종목 (${p.holdings.length}건)
${holdingList}

▶ 주간 통계
- 총 거래: ${p.stats.tradeCount}건 (매도 ${p.stats.soldCount}건 / 보유 중 ${p.stats.holdingCount}건)
- 종합 수익률: ${p.stats.returnRate >= 0 ? "+" : ""}${p.stats.returnRate}%  /  등급: ${p.stats.grade}
- 승률: ${p.stats.winRate}%  (매도 완료 ${p.stats.soldCount}건 기준)
- 총 투자: ${p.stats.investedPoints.toLocaleString()}P  /  수익·손실: ${p.stats.profitPoints >= 0 ? "+" : ""}${p.stats.profitPoints.toLocaleString()}P
- 평균 보유 기간: ${p.behavior.avgHoldingDays}일
- 주력 업종: ${p.behavior.topSector || "N/A"}
- 주요 거래 요일: ${p.behavior.activeDays.join(", ") || "N/A"}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📤  출력 요구사항
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
아래 JSON 구조를 정확히 따르세요.
마크다운 코드블록(\`\`\`json) 없이 JSON 텍스트만 반환하세요.

{
  "trades": [
    {
      "ticker": "종목 티커 (위 데이터와 동일한 순서)",
      "newsContext": "해당 종목의 매수~매도 기간에 있었던 공개된 뉴스 팩트 (확실하지 않으면 빈 문자열). 형식: 날짜 + 핵심 헤드라인 + (출처). 예: 4/22 블랙웰 GPU 출하량 예상치 상회 (Reuters)"
    }
  ],
  "dna": {
    "commentary": "이번 주 행동 패턴을 DNA 타입과 비교하는 관찰 문장. 80자 이내. 판단 없이 팩트만. 예: 타이거 유형답게 변동성 높은 종목 위주로 적극적인 매매를 하셨어요."
  },
  "aiNarrative": "이번 주 전체 요약 1~3문장. 150자 이내. **볼드**와 ==형광펜== 적극 활용. 핵심 수치와 종목명 포함."
}
`.trim();
}

// ── Gemini 호출 ───────────────────────────────────────────────
export async function generateReportNarrative(p: {
  nickname:  string;
  dnaType:   string | null;
  market:    Market;
  weekLabel: string;
  trades:    TradeData[];
  holdings:  TradeData[];
  stats:     WeeklyStats;
  behavior:  BehaviorData;
}): Promise<GeminiOutput | null> {
  try {
    const model  = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(buildPrompt(p));
    const text   = result.response.text().trim();
    const clean  = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    return JSON.parse(clean) as GeminiOutput;
  } catch (e) {
    console.error("[generateReportNarrative]", e);
    return null;
  }
}

// ── 리포트 콘텐츠 조합 ───────────────────────────────────────
export function assembleReportContent(p: {
  weekLabel:     string;
  market:        Market;
  trades:        TradeData[];
  holdings:      TradeData[];
  stats:         WeeklyStats;
  behavior:      BehaviorData;
  dnaType:       string | null;
  geminiOutput:  GeminiOutput | null;
}): ReportContent {
  const dnaInfo  = p.dnaType ? INVESTOR_TYPES[p.dnaType as TypeKey] : null;
  const newsMap  = new Map(
    (p.geminiOutput?.trades ?? []).map((t) => [t.ticker, t.newsContext])
  );

  return {
    weekLabel: p.weekLabel,
    market:    p.market,
    summary: {
      tradeCount:     p.stats.tradeCount,
      soldCount:      p.stats.soldCount,
      holdingCount:   p.stats.holdingCount,
      returnRate:     p.stats.returnRate,
      profitPoints:   p.stats.profitPoints,
      investedPoints: p.stats.investedPoints,
      winRate:        p.stats.winRate,
      grade:          p.stats.grade,
    },
    bestTrade:  p.stats.bestTrade,
    worstTrade: p.stats.worstTrade,
    trades: p.trades.map((t) => ({
      ticker:         t.ticker,
      name:           t.name,
      status:         t.status,
      buyAt:          t.buyAt,
      sellAt:         t.sellAt,
      buyPrice:       t.buyPrice,
      sellPrice:      t.sellPrice,
      returnPct:      t.returnPct,
      investedPoints: t.investedPoints,
      finalPoints:    t.finalPoints,
      newsContext:    newsMap.get(t.ticker) ?? "",
    })),
    holdings: p.holdings.map((h) => ({
      ticker:         h.ticker,
      name:           h.name,
      buyAt:          h.buyAt,
      buyPrice:       h.buyPrice,
      currentPrice:   h.currentPrice ?? h.buyPrice,
      returnPct:      h.returnPct ?? 0,
      investedPoints: h.investedPoints,
    })),
    behavior: {
      avgHoldingDays: p.behavior.avgHoldingDays,
      topSector:      p.behavior.topSector,
      activeDays:     p.behavior.activeDays,
      tags:           p.behavior.tags,
    },
    dna: {
      type:       p.dnaType ?? "",
      emoji:      dnaInfo?.emoji ?? "",
      commentary: p.geminiOutput?.dna.commentary ?? "",
    },
    aiNarrative: p.geminiOutput?.aiNarrative ?? "",
  };
}
