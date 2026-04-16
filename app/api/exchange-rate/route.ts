import { getCached, setCached } from "@/app/lib/cache";

const CACHE_KEY = "exchange:usd_krw";
const CACHE_TTL = 15 * 60; // 15분

export async function GET() {
  // 1. Redis 캐시 확인
  const cached = await getCached<number>(CACHE_KEY);
  if (cached) {
    return Response.json({ rate: cached, cached: true });
  }

  // 2. Twelve Data에서 USD/KRW 조회
  const apiKey = process.env.TWELVE_DATA_API_KEY ?? "";
  if (!apiKey) {
    return Response.json({ rate: 1470, cached: false });
  }

  try {
    const res = await fetch(
      `https://api.twelvedata.com/price?symbol=USD/KRW&apikey=${apiKey}`,
      { cache: "no-store" }
    );
    if (!res.ok) throw new Error(`Twelve Data ${res.status}`);

    const data = await res.json();
    const rate = Math.round(parseFloat(data?.price ?? "0"));

    if (!rate || isNaN(rate)) throw new Error("invalid rate");

    await setCached(CACHE_KEY, rate, CACHE_TTL);
    console.log(`[EXCHANGE] USD/KRW ${rate}원 (새로 조회)`);
    return Response.json({ rate, cached: false });
  } catch (e) {
    console.log("[EXCHANGE] 조회 실패, fallback 사용:", e);
    return Response.json({ rate: 1470, cached: false });
  }
}
