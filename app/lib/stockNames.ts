export type StockCategory = "AI·반도체" | "빅테크" | "테마" | "브랜드" | "금융";

export type StockMeta = {
  name: string;
  category: StockCategory;
  logo: string;
};

export const STOCK_META: Record<string, StockMeta> = {
  // AI·반도체
  NVDA:    { name: "엔비디아",         category: "AI·반도체", logo: "nvidia.com" },
  TSM:     { name: "TSMC",             category: "AI·반도체", logo: "tsmc.com" },
  ARM:     { name: "ARM",              category: "AI·반도체", logo: "arm.com" },
  MSFT:    { name: "마이크로소프트",   category: "AI·반도체", logo: "microsoft.com" },
  AVGO:    { name: "브로드컴",         category: "AI·반도체", logo: "broadcom.com" },
  AMD:     { name: "AMD",              category: "AI·반도체", logo: "amd.com" },
  INTC:    { name: "인텔",             category: "AI·반도체", logo: "intel.com" },
  QCOM:    { name: "퀄컴",             category: "AI·반도체", logo: "qualcomm.com" },
  // 빅테크
  AAPL:    { name: "애플",             category: "빅테크", logo: "apple.com" },
  GOOGL:   { name: "구글",             category: "빅테크", logo: "google.com" },
  AMZN:    { name: "아마존",           category: "빅테크", logo: "amazon.com" },
  TSLA:    { name: "테슬라",           category: "빅테크", logo: "tesla.com" },
  META:    { name: "메타",             category: "빅테크", logo: "meta.com" },
  NFLX:    { name: "넷플릭스",         category: "빅테크", logo: "netflix.com" },
  UBER:    { name: "우버",             category: "빅테크", logo: "uber.com" },
  SPOT:    { name: "스포티파이",       category: "빅테크", logo: "spotify.com" },
  // 테마
  PLTR:    { name: "팔란티어",         category: "테마", logo: "palantir.com" },
  NEE:     { name: "넥스트에라에너지", category: "테마", logo: "nexteraenergy.com" },
  LUNR:    { name: "인튜이티브머신스", category: "테마", logo: "intuitivemachines.com" },
  LLY:     { name: "일라이릴리",       category: "테마", logo: "lilly.com" },
  CEG:     { name: "콘스텔레이션에너지", category: "테마", logo: "constellationenergy.com" },
  RKLB:    { name: "로켓랩",           category: "테마", logo: "rocketlabusa.com" },
  JOBY:    { name: "조비에비에이션",   category: "테마", logo: "jobyaviation.com" },
  RXRX:    { name: "리커전파마",       category: "테마", logo: "recursion.com" },
  // 브랜드
  SBUX:    { name: "스타벅스",         category: "브랜드", logo: "starbucks.com" },
  ABNB:    { name: "에어비앤비",       category: "브랜드", logo: "airbnb.com" },
  DIS:     { name: "디즈니",           category: "브랜드", logo: "disney.com" },
  NKE:     { name: "나이키",           category: "브랜드", logo: "nike.com" },
  MCD:     { name: "맥도날드",         category: "브랜드", logo: "mcdonalds.com" },
  TGT:     { name: "타겟",             category: "브랜드", logo: "target.com" },
  COST:    { name: "코스트코",         category: "브랜드", logo: "costco.com" },
  LULU:    { name: "룰루레몬",         category: "브랜드", logo: "lululemon.com" },
  // 금융
  JPM:     { name: "JP모건",           category: "금융", logo: "jpmorganchase.com" },
  V:       { name: "비자",             category: "금융", logo: "visa.com" },
  MA:      { name: "마스터카드",       category: "금융", logo: "mastercard.com" },
  "BRK-B": { name: "버크셔해서웨이",  category: "금융", logo: "berkshirehathaway.com" },
  GS:      { name: "골드만삭스",       category: "금융", logo: "goldmansachs.com" },
  BAC:     { name: "뱅크오브아메리카", category: "금융", logo: "bankofamerica.com" },
  WFC:     { name: "웰스파고",         category: "금융", logo: "wellsfargo.com" },
  BLK:     { name: "블랙록",           category: "금융", logo: "blackrock.com" },
};

export const ALL_TICKERS = Object.keys(STOCK_META);

export const TICKERS_BY_CATEGORY: Record<StockCategory, string[]> = {
  "AI·반도체": ["NVDA", "TSM", "ARM", "MSFT", "AVGO", "AMD", "INTC", "QCOM"],
  "빅테크":    ["AAPL", "GOOGL", "AMZN", "TSLA", "META", "NFLX", "UBER", "SPOT"],
  "테마":      ["PLTR", "NEE", "LUNR", "LLY", "CEG", "RKLB", "JOBY", "RXRX"],
  "브랜드":    ["SBUX", "ABNB", "DIS", "NKE", "MCD", "TGT", "COST", "LULU"],
  "금융":      ["JPM", "V", "MA", "BRK-B", "GS", "BAC", "WFC", "BLK"],
};

export const KOR_TO_TICKER: Record<string, string> = {
  "엔비디아": "NVDA",
  "애플": "AAPL",
  "테슬라": "TSLA",
  "구글": "GOOGL",
  "알파벳": "GOOGL",
  "아마존": "AMZN",
  "아마존닷컴": "AMZN",
  "마이크로소프트": "MSFT",
  "메타": "META",
  "넷플릭스": "NFLX",
  "에어비앤비": "ABNB",
  "스타벅스": "SBUX",
  "디즈니": "DIS",
  "나이키": "NKE",
  "맥도날드": "MCD",
  "팔란티어": "PLTR",
  "비자": "V",
  "마스터카드": "MA",
  "인텔": "INTC",
  "퀄컴": "QCOM",
  "TSMC": "TSM",
  "티에스엠씨": "TSM",
  "우버": "UBER",
  "스포티파이": "SPOT",
  "JP모건": "JPM",
  "제이피모건": "JPM",
  "골드만삭스": "GS",
  "뱅크오브아메리카": "BAC",
  "브로드컴": "AVGO",
  "버크셔해서웨이": "BRK-B",
  "버크셔": "BRK-B",
  "넥스트에라에너지": "NEE",
  "인튜이티브머신스": "LUNR",
  "일라이릴리": "LLY",
  "콘스텔레이션에너지": "CEG",
  "로켓랩": "RKLB",
  "조비에비에이션": "JOBY",
  "조비": "JOBY",
  "리커전파마": "RXRX",
  "타겟": "TGT",
  "코스트코": "COST",
  "룰루레몬": "LULU",
  "웰스파고": "WFC",
  "블랙록": "BLK",
};
