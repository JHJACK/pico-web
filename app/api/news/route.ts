import { NEWS_FALLBACK, type NewsCat, type NewsItem } from "@/app/lib/news";

// 카테고리별 캐시 (1시간 TTL)
const cache = new Map<string, { data: NewsItem[]; ts: number }>();
const TTL = 60 * 60 * 1000;

// URL별 번역 캐시 (중복 요약 방지)
const translateCache = new Map<string, { korTitle: string; bullets: string[] }>();

const QUERIES: Record<string, string> = {
  전체:   "stock market Korea finance",
  숙박:   "Airbnb OR Hilton OR hotel stock",
  전기차: "Tesla OR Rivian electric vehicle stock",
  반도체: "NVIDIA OR Samsung semiconductor chip",
  바이오: "Samsung Biologics OR Celltrion biotech Korea",
};

function formatTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return "방금 전";
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

function randomSentiment(): "pos" | "neg" | "neu" {
  const r = Math.random();
  return r < 0.4 ? "pos" : r < 0.7 ? "neg" : "neu";
}

async function translateArticle(
  title: string,
  description: string,
  apiKey: string
): Promise<{ korTitle: string; bullets: string[] } | null> {
  const body = description?.slice(0, 600) ?? "";
  const prompt = `다음 영어 뉴스를 한국어로 처리해줘.
제목: ${title}
본문: ${body}

JSON으로만 반환해. 다른 말 금지.
{
  "title": "번역된 한국어 제목",
  "bullets": [
    "핵심 문장1 (25자 이내)",
    "핵심 문장2 (25자 이내)",
    "핵심 문장3 (25자 이내)"
  ]
}`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 400,
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      console.log("[OpenAI] 번역 실패 status:", res.status);
      return null;
    }

    const json = await res.json();
    const text: string = json.choices?.[0]?.message?.content ?? "";
    const cleaned = text.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    if (!parsed.title || !Array.isArray(parsed.bullets)) return null;
    return {
      korTitle: parsed.title as string,
      bullets: (parsed.bullets as string[]).slice(0, 5),
    };
  } catch (e) {
    console.log("[OpenAI] 번역 예외:", e);
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cat = (searchParams.get("cat") ?? "전체") as NewsCat;

  const openaiKey = process.env.OPENAI_API_KEY ?? "";
  console.log("[NEWS] 카테고리:", cat);
  console.log("[NEWS] OPENAI_API_KEY exists:", !!openaiKey && openaiKey !== "sk-여기에키입력");

  // 캐시 확인 — 번역이 없는 구버전 캐시는 무효화
  const cached = cache.get(cat);
  if (cached && Date.now() - cached.ts < TTL) {
    const hasTranslation = cached.data.some((item) => item.korTitle);
    if (hasTranslation || !openaiKey || openaiKey === "sk-여기에키입력") {
      console.log("[NEWS] 캐시 반환 (번역 포함:", hasTranslation, ")");
      return Response.json(cached.data);
    }
    console.log("[NEWS] 구버전 캐시 감지 — 재번역 시작");
    cache.delete(cat);
  }

  const newsApiKey = process.env.NEXT_PUBLIC_NEWS_API_KEY ?? "";
  if (!newsApiKey || newsApiKey === "여기에_키_입력") {
    console.log("[NEWS] NewsAPI 키 없음 → 폴백");
    return Response.json(NEWS_FALLBACK[cat] ?? NEWS_FALLBACK["전체"]);
  }

  const q = QUERIES[cat] ?? QUERIES["전체"];

  try {
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(q)}&pageSize=4&sortBy=publishedAt&language=en&apiKey=${newsApiKey}`;
    const res = await fetch(url, { cache: "no-store" });
    const json = await res.json();

    if (json.status !== "ok" || !json.articles?.length) {
      throw new Error(json.message ?? "no articles");
    }

    console.log("[NEWS] NewsAPI 기사", json.articles.length, "개 수신");

    type RawArticle = {
      title: string;
      description: string;
      source: Record<string, string>;
      publishedAt: string;
      url: string;
    };

    const rawArticles = (json.articles as RawArticle[]).map((a) => ({
      title:       a.title ?? "",
      description: a.description ?? "",
      source:      a.source?.name ?? "",
      time:        formatTime(a.publishedAt ?? ""),
      url:         a.url ?? "#",
      sentiment:   randomSentiment(),
    }));

    const useOpenAI = !!openaiKey && openaiKey !== "sk-여기에키입력";
    console.log("[NEWS] OpenAI 번역 사용:", useOpenAI);

    const articles: NewsItem[] = await Promise.all(
      rawArticles.map(async (a) => {
        const base: NewsItem = {
          title:     a.title,
          source:    a.source,
          time:      a.time,
          url:       a.url,
          sentiment: a.sentiment,
        };

        if (!useOpenAI) return base;

        // URL 기반 중복 번역 방지
        const cached = translateCache.get(a.url);
        if (cached) {
          console.log("[NEWS] 번역 캐시 히트:", a.url.slice(0, 50));
          return { ...base, korTitle: cached.korTitle, bullets: cached.bullets };
        }

        console.log("[NEWS] OpenAI 번역 중:", a.title.slice(0, 40));
        const result = await translateArticle(a.title, a.description, openaiKey);
        if (result) {
          translateCache.set(a.url, result);
          console.log("[NEWS] 번역 완료:", result.korTitle);
          return { ...base, korTitle: result.korTitle, bullets: result.bullets };
        }

        console.log("[NEWS] 번역 실패 — 원문 사용");
        return base;
      })
    );

    cache.set(cat, { data: articles, ts: Date.now() });
    return Response.json(articles);
  } catch (e) {
    console.log("[NEWS] 전체 오류:", e);
    return Response.json(NEWS_FALLBACK[cat] ?? NEWS_FALLBACK["전체"]);
  }
}
