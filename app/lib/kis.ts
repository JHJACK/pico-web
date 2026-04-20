import { getCached, setCached } from "@/app/lib/cache";

// 실전투자 서버 (실전 APP KEY 기준)
// 모의투자 키를 쓴다면 openapivts.koreainvestment.com 으로 변경
const KIS_BASE = "https://openapi.koreainvestment.com";
const TOKEN_CACHE_KEY = "kis:access_token";

async function getToken(): Promise<string> {
  const cached = await getCached<string>(TOKEN_CACHE_KEY);
  if (cached) return cached;

  const res = await fetch(`${KIS_BASE}/oauth2/tokenP`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=UTF-8" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      appkey: process.env.KIS_APP_KEY,
      appsecret: process.env.KIS_APP_SECRET,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`KIS 토큰 발급 실패 (${res.status}): ${text}`);
  }

  const data = await res.json();
  const token: string = data.access_token;
  if (!token) throw new Error("KIS 토큰 응답에 access_token 없음");

  // 토큰 유효기간 24h → 23h 캐싱 (여유분 1h)
  await setCached(TOKEN_CACHE_KEY, token, 23 * 60 * 60);
  console.log("[KIS] 신규 액세스 토큰 발급 완료");
  return token;
}

export type KisStockData = {
  price: number;
  change: number;
  changePercent: number;
};

export async function fetchKisStock(
  ticker: string
): Promise<KisStockData | null> {
  try {
    const token = await getToken();
    const url = `${KIS_BASE}/uapi/domestic-stock/v1/quotations/inquire-price?fid_cond_mrkt_div_code=J&fid_input_iscd=${ticker}`;
    const res = await fetch(url, {
      headers: {
        authorization: `Bearer ${token}`,
        appkey: process.env.KIS_APP_KEY!,
        appsecret: process.env.KIS_APP_SECRET!,
        tr_id: "FHKST01010100",
        "Content-Type": "application/json; charset=UTF-8",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      console.log(`[KIS] ${ticker} 조회 실패: ${res.status}`);
      return null;
    }

    const data = await res.json();
    const out = data?.output;
    if (!out) return null;

    const price = parseInt(out.stck_prpr, 10);
    if (!price || isNaN(price)) return null;

    const rawChange = parseInt(out.prdy_vrss, 10) || 0;
    const rawPct = parseFloat(out.prdy_ctrt) || 0;
    // 대비부호: 1=상한 2=상승 3=보합 4=하한 5=하락
    const sign = out.prdy_vrss_sign;
    const isNeg = sign === "4" || sign === "5";

    return {
      price,
      change: isNeg ? -Math.abs(rawChange) : Math.abs(rawChange),
      changePercent: isNeg ? -Math.abs(rawPct) : Math.abs(rawPct),
    };
  } catch (e) {
    console.log(`[KIS] ${ticker} 예외:`, e);
    return null;
  }
}

// ─── 한국 주식 히스토리컬 (일봉/주봉) ────────────────────────────────────────

export type KisCandleData = {
  time: string;   // "YYYY-MM-DD"
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

// 기간 → KIS 요청 파라미터 매핑
// KIS는 한 번에 최대 100개 반환, 날짜 범위로 필터
const HISTORY_CONFIG: Record<string, { periodCode: "D" | "W"; calendarDays: number }> = {
  "1D": { periodCode: "D", calendarDays: 14  }, // ~10 거래일
  "1W": { periodCode: "D", calendarDays: 45  }, // ~30 거래일
  "1M": { periodCode: "D", calendarDays: 90  }, // ~60 거래일
  "1Y": { periodCode: "W", calendarDays: 400 }, // ~52 주봉
};

function toKisDate(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

export async function fetchKisHistory(
  ticker: string,
  period: string
): Promise<KisCandleData[]> {
  const token = await getToken();
  const cfg = HISTORY_CONFIG[period] ?? HISTORY_CONFIG["1M"];

  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - cfg.calendarDays);

  const url =
    `${KIS_BASE}/uapi/domestic-stock/v1/quotations/inquire-daily-price` +
    `?fid_cond_mrkt_div_code=J` +
    `&fid_input_iscd=${ticker}` +
    `&fid_period_div_code=${cfg.periodCode}` +
    `&fid_org_adj_prc=0` +
    `&fid_input_date_1=${toKisDate(start)}` +
    `&fid_input_date_2=${toKisDate(end)}`;

  const res = await fetch(url, {
    headers: {
      authorization: `Bearer ${token}`,
      appkey: process.env.KIS_APP_KEY!,
      appsecret: process.env.KIS_APP_SECRET!,
      tr_id: "FHKST01010400",
      "Content-Type": "application/json; charset=UTF-8",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    console.log(`[KIS] ${ticker} 히스토리 조회 실패: ${res.status}`);
    return [];
  }

  const data = await res.json();
  // KIS는 output2 배열로 반환 (output인 경우도 처리)
  const rows: Record<string, string>[] = data?.output2 ?? data?.output ?? [];

  return rows
    .filter((r) => r.stck_bsop_date && r.stck_clpr && r.stck_clpr !== "0")
    .map((r) => ({
      time: `${r.stck_bsop_date.slice(0, 4)}-${r.stck_bsop_date.slice(4, 6)}-${r.stck_bsop_date.slice(6, 8)}`,
      open:   parseInt(r.stck_oprc, 10),
      high:   parseInt(r.stck_hgpr, 10),
      low:    parseInt(r.stck_lwpr, 10),
      close:  parseInt(r.stck_clpr, 10),
      volume: parseInt(r.acml_vol,  10),
    }))
    .reverse(); // KIS는 최신순 → 차트용 오름차순으로 뒤집기
}

// ─── 여러 종목 병렬 조회 (5개씩 배치) ───────────────────────────────────────
export async function fetchKisStocks(
  tickers: string[]
): Promise<Record<string, KisStockData>> {
  const results: Record<string, KisStockData> = {};
  const BATCH = 5;

  for (let i = 0; i < tickers.length; i += BATCH) {
    const batch = tickers.slice(i, i + BATCH);
    const batchResults = await Promise.all(
      batch.map(async (t) => ({ ticker: t, data: await fetchKisStock(t) }))
    );
    for (const { ticker, data } of batchResults) {
      if (data) results[ticker] = data;
    }
    // 배치 사이 200ms 간격 (KIS rate limit 여유)
    if (i + BATCH < tickers.length) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  return results;
}
