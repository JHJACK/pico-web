import { NextRequest } from "next/server";

type InsightCache = { text: string; source: string; time: string; ts: number };

const cache = new Map<string, InsightCache>();
const TTL = 30 * 60 * 1000;

const TICKER_QUERIES: Record<string, string> = {
  NVDA: "NVIDIA AI GPU chip earnings revenue",
  AMD: "AMD semiconductor CPU GPU stock",
  MSFT: "Microsoft Azure AI cloud earnings",
  AVGO: "Broadcom semiconductor chip AI",
  ARM: "ARM Holdings chip architecture license",
  AAPL: "Apple iPhone Mac earnings revenue",
  GOOGL: "Google Alphabet AI search cloud",
  AMZN: "Amazon AWS cloud retail earnings",
  TSLA: "Tesla electric vehicle deliveries earnings",
  META: "Meta Facebook AI social media",
  NFLX: "Netflix streaming subscribers earnings",
  PLTR: "Palantir AI data analytics government",
  LLY: "Eli Lilly drug GLP-1 pharmaceutical",
  ABNB: "Airbnb travel booking earnings",
  UBER: "Uber ride sharing delivery earnings",
  SPOT: "Spotify music streaming earnings",
  SBUX: "Starbucks coffee earnings revenue",
  NKE: "Nike shoe apparel earnings",
  JPM: "JPMorgan bank financial earnings",
  V: "Visa payment transaction earnings",
  SPY: "S&P500 ETF market index",
  QQQ: "Nasdaq 100 technology stocks",
  ARKK: "ARK Innovation ETF Cathie Wood",
  SOXX: "semiconductor ETF iShares stocks",
  TSM: "TSMC Taiwan semiconductor foundry",
  "005930": "Samsung Electronics chip memory",
  "000660": "SK Hynix memory HBM chip",
  "042700": "Hanmi Semiconductor",
  "267260": "HD Hyundai Electric",
  "012450": "Hanwha Aerospace",
  "035720": "Kakao Korea internet",
  "035420": "NAVER Korea search AI",
  "373220": "LG Energy Solution battery EV",
  "006400": "Samsung SDI battery",
  "247540": "Ecopro BM battery material",
  "005380": "Hyundai Motor electric vehicle",
  "000270": "Kia Motors electric vehicle",
  "454910": "Doosan Robotics",
  "277810": "Rainbow Robotics Samsung",
  "079550": "LIG Nex1 defense",
  "298040": "Hyosung Heavy Industries",
  "352820": "HYBE BTS Kpop music",
  "035760": "CJ ENM entertainment",
  "041510": "SM Entertainment Kpop",
  "207940": "Samsung Biologics pharmaceutical",
  "068270": "Celltrion pharmaceutical biotech",
  "326030": "ABL Bio",
  "145020": "Hugel botulinum toxin",
  "105560": "KB Financial bank Korea",
  "055550": "Shinhan Financial bank",
  "086790": "Hana Financial bank",
  "006800": "Mirae Asset Securities",
};

function formatTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return "방금 전";
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ticker = (searchParams.get("ticker") ?? "").toUpperCase();
  const name = searchParams.get("name") ?? ticker;

  if (!ticker) return Response.json({ error: "ticker required" }, { status: 400 });

  const cached = cache.get(ticker);
  if (cached && Date.now() - cached.ts < TTL) {
    return Response.json({ text: cached.text, source: cached.source, time: cached.time });
  }

  const newsKey = process.env.NEXT_PUBLIC_NEWS_API_KEY ?? "";
  const openaiKey = process.env.OPENAI_API_KEY ?? "";

  if (!newsKey || newsKey === "여기에_키_입력") {
    return Response.json({ error: "뉴스 API 키 없음" }, { status: 500 });
  }

  const query = TICKER_QUERIES[ticker] ?? `${name} stock earnings`;

  try {
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&pageSize=3&sortBy=publishedAt&language=en&apiKey=${newsKey}`;
    const res = await fetch(url, { cache: "no-store" });
    const json = await res.json();

    if (json.status !== "ok" || !json.articles?.length) throw new Error("no articles");

    const article = json.articles[0];
    const title: string = article.title ?? "";
    const description: string = article.description ?? "";
    const source: string = article.source?.name ?? "NewsAPI";
    const time = formatTime(article.publishedAt ?? new Date().toISOString());

    if (!openaiKey || openaiKey === "sk-여기에키입력") {
      cache.set(ticker, { text: title, source, time, ts: Date.now() });
      return Response.json({ text: title, source, time });
    }

    const prompt = `다음 영어 뉴스를 바탕으로 ${name}(${ticker}) 종목에 대한 한국어 한 줄 투자 인사이트를 만들어줘.
제목: ${title}
본문: ${description.slice(0, 400)}

요구사항:
- 30자 이내의 핵심 인사이트 한 문장
- 해요체 존댓말 (예: "~이에요", "~해요")
- 수치나 키워드 포함 시 더 좋음
- JSON으로만 반환: {"insight": "..."}`;

    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 120,
      }),
      cache: "no-store",
    });

    if (!aiRes.ok) throw new Error("openai failed");

    const aiJson = await aiRes.json();
    const raw: string = aiJson.choices?.[0]?.message?.content ?? "";
    const cleaned = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    const insight: string = parsed.insight;
    if (!insight) throw new Error("no insight");

    cache.set(ticker, { text: insight, source, time, ts: Date.now() });
    return Response.json({ text: insight, source, time });
  } catch (e) {
    console.error("[/api/stocks/insight]", e);
    return Response.json({ error: "인사이트를 가져올 수 없어요" }, { status: 500 });
  }
}
