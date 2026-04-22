// ─── 해외주식 ────────────────────────────────────────────────────────────────

export type StockCategory =
  | "AI·반도체"
  | "빅테크"
  | "2026테마"
  | "소비재·금융"
  | "ETF";

export type StockMeta = {
  name: string;
  category: StockCategory;
  logo: string;
};

export const STOCK_META: Record<string, StockMeta> = {
  // AI·반도체 (6)
  NVDA:  { name: "엔비디아",       category: "AI·반도체",  logo: "nvidia.com" },
  TSM:   { name: "TSMC",           category: "AI·반도체",  logo: "tsmc.com" },
  AMD:   { name: "AMD",            category: "AI·반도체",  logo: "amd.com" },
  MSFT:  { name: "마이크로소프트", category: "AI·반도체",  logo: "microsoft.com" },
  AVGO:  { name: "브로드컴",       category: "AI·반도체",  logo: "broadcom.com" },
  ARM:   { name: "ARM",            category: "AI·반도체",  logo: "arm.com" },
  // 빅테크 (6)
  AAPL:  { name: "애플",           category: "빅테크",     logo: "apple.com" },
  GOOGL: { name: "구글",           category: "빅테크",     logo: "google.com" },
  AMZN:  { name: "아마존",         category: "빅테크",     logo: "amazon.com" },
  TSLA:  { name: "테슬라",         category: "빅테크",     logo: "tesla.com" },
  META:  { name: "메타",           category: "빅테크",     logo: "meta.com" },
  NFLX:  { name: "넷플릭스",       category: "빅테크",     logo: "netflix.com" },
  // 2026 테마 (5)
  PLTR:  { name: "팔란티어",       category: "2026테마",   logo: "palantir.com" },
  LLY:   { name: "일라이릴리",     category: "2026테마",   logo: "lilly.com" },
  ABNB:  { name: "에어비앤비",     category: "2026테마",   logo: "airbnb.com" },
  UBER:  { name: "우버",           category: "2026테마",   logo: "uber.com" },
  SPOT:  { name: "스포티파이",     category: "2026테마",   logo: "spotify.com" },
  // 소비재·금융 (4)
  SBUX:  { name: "스타벅스",       category: "소비재·금융", logo: "starbucks.com" },
  NKE:   { name: "나이키",         category: "소비재·금융", logo: "nike.com" },
  JPM:   { name: "JP모건",         category: "소비재·금융", logo: "jpmorganchase.com" },
  V:     { name: "비자",           category: "소비재·금융", logo: "visa.com" },
  // ETF (4)
  SPY:   { name: "S&P500 ETF",     category: "ETF",        logo: "ssga.com" },
  QQQ:   { name: "나스닥100 ETF",  category: "ETF",        logo: "invesco.com" },
  ARKK:  { name: "ARK 이노베이션", category: "ETF",        logo: "ark-invest.com" },
  SOXX:  { name: "반도체 ETF",     category: "ETF",        logo: "ishares.com" },
};

export const ALL_TICKERS = Object.keys(STOCK_META);

export const TICKERS_BY_CATEGORY: Record<StockCategory, string[]> = {
  "AI·반도체":  ["NVDA", "TSM", "AMD", "MSFT", "AVGO", "ARM"],
  "빅테크":     ["AAPL", "GOOGL", "AMZN", "TSLA", "META", "NFLX"],
  "2026테마":   ["PLTR", "LLY", "ABNB", "UBER", "SPOT"],
  "소비재·금융": ["SBUX", "NKE", "JPM", "V"],
  "ETF":        ["SPY", "QQQ", "ARKK", "SOXX"],
};

// ─── 국내주식 ────────────────────────────────────────────────────────────────

export type KrStockCategory =
  | "반도체·AI"
  | "플랫폼·IT"
  | "전기차·배터리"
  | "로봇·우주"
  | "바이오"
  | "엔터·소비"
  | "금융";

export type KrStockMeta = {
  name: string;
  category: KrStockCategory;
};

export const KR_STOCK_META: Record<string, KrStockMeta> = {
  // 반도체·AI (5)
  "005930": { name: "삼성전자",      category: "반도체·AI" },
  "000660": { name: "SK하이닉스",    category: "반도체·AI" },
  "042700": { name: "한미반도체",    category: "반도체·AI" },
  "267260": { name: "HD현대일렉트릭", category: "반도체·AI" },
  "012450": { name: "한화에어로스페이스", category: "반도체·AI" },
  // 플랫폼·IT (5)
  "035720": { name: "카카오",        category: "플랫폼·IT" },
  "035420": { name: "NAVER",         category: "플랫폼·IT" },
  "259960": { name: "크래프톤",      category: "플랫폼·IT" },
  "323410": { name: "카카오뱅크",    category: "플랫폼·IT" },
  "293490": { name: "카카오페이",    category: "플랫폼·IT" },
  // 전기차·배터리 (5)
  "373220": { name: "LG에너지솔루션", category: "전기차·배터리" },
  "006400": { name: "삼성SDI",       category: "전기차·배터리" },
  "247540": { name: "에코프로비엠",  category: "전기차·배터리" },
  "005380": { name: "현대차",        category: "전기차·배터리" },
  "000270": { name: "기아",          category: "전기차·배터리" },
  // 로봇·우주 (4)
  "454910": { name: "두산로보틱스",  category: "로봇·우주" },
  "277810": { name: "레인보우로보틱스", category: "로봇·우주" },
  "079550": { name: "LIG넥스원",     category: "로봇·우주" },
  "298040": { name: "효성중공업",    category: "로봇·우주" },
  // 바이오 (4)
  "068270": { name: "셀트리온",      category: "바이오" },
  "207940": { name: "삼성바이오로직스", category: "바이오" },
  "326030": { name: "에이비엘바이오", category: "바이오" },
  "145020": { name: "휴젤",          category: "바이오" },
  // 엔터·소비 (4)
  "352820": { name: "하이브",        category: "엔터·소비" },
  "035760": { name: "CJ ENM",        category: "엔터·소비" },
  "041510": { name: "SM엔터테인먼트", category: "엔터·소비" },
  "006800": { name: "미래에셋증권",  category: "엔터·소비" },
  // 금융 (3)
  "105560": { name: "KB금융",        category: "금융" },
  "055550": { name: "신한지주",      category: "금융" },
  "086790": { name: "하나금융지주",  category: "금융" },
};

export const ALL_KR_TICKERS = Object.keys(KR_STOCK_META);

export const KR_TICKERS_BY_CATEGORY: Record<KrStockCategory, string[]> = {
  "반도체·AI":   ["005930", "000660", "042700", "267260", "012450"],
  "플랫폼·IT":   ["035720", "035420", "259960", "323410", "293490"],
  "전기차·배터리": ["373220", "006400", "247540", "005380", "000270"],
  "로봇·우주":   ["454910", "277810", "079550", "298040"],
  "바이오":      ["068270", "207940", "326030", "145020"],
  "엔터·소비":   ["352820", "035760", "041510", "006800"],
  "금융":        ["105560", "055550", "086790"],
};

// ─── 검색용 한글→티커 매핑 ────────────────────────────────────────────────────

export const KOR_TO_TICKER: Record<string, string> = {
  // 해외
  엔비디아: "NVDA", TSMC: "TSM", AMD: "AMD",
  마이크로소프트: "MSFT", 브로드컴: "AVGO", ARM: "ARM",
  애플: "AAPL", 구글: "GOOGL", 알파벳: "GOOGL",
  아마존: "AMZN", 테슬라: "TSLA", 메타: "META", 넷플릭스: "NFLX",
  팔란티어: "PLTR", 일라이릴리: "LLY", 에어비앤비: "ABNB",
  우버: "UBER", 스포티파이: "SPOT",
  스타벅스: "SBUX", 나이키: "NKE", JP모건: "JPM", 비자: "V",
  // 국내
  삼성전자: "005930", SK하이닉스: "000660", 한미반도체: "042700",
  HD현대일렉트릭: "267260", 한화에어로스페이스: "012450",
  카카오: "035720", NAVER: "035420", 네이버: "035420",
  크래프톤: "259960", 카카오뱅크: "323410", 카카오페이: "293490",
  LG에너지솔루션: "373220", 삼성SDI: "006400", 에코프로비엠: "247540",
  현대차: "005380", 기아: "000270",
  두산로보틱스: "454910", 레인보우로보틱스: "277810",
  LIG넥스원: "079550", 효성중공업: "298040",
  셀트리온: "068270", 삼성바이오로직스: "207940",
  에이비엘바이오: "326030", 휴젤: "145020",
  하이브: "352820", CJENM: "035760", SM엔터테인먼트: "041510",
  미래에셋증권: "006800",
  KB금융: "105560", 신한지주: "055550", 하나금융지주: "086790",
};

// 티커가 국내주식인지 판별 (6자리 숫자)
export function isKrTicker(ticker: string): boolean {
  return /^\d{6}$/.test(ticker);
}

// 한글 자모 분해 — IME 조합 중간 상태("엔비ㄷ")도 정확히 매칭하기 위해 사용
// 예: "엔비디아" → "ㅇㅔㄴㅂㅣㄷㅣㅇㅏ"
export function decomposeHangul(str: string): string {
  const CHO  = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
  const JUNG = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
  const JONG = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
  let result = '';
  for (const char of str) {
    const code = char.charCodeAt(0);
    if (code >= 0xAC00 && code <= 0xD7A3) {
      const offset = code - 0xAC00;
      const cho  = Math.floor(offset / (21 * 28));
      const jung = Math.floor((offset % (21 * 28)) / 28);
      const jong = offset % 28;
      result += CHO[cho] + JUNG[jung] + (jong > 0 ? JONG[jong] : '');
    } else {
      result += char;
    }
  }
  return result;
}
