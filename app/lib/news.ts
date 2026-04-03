export type NewsItem = {
  title: string;
  korTitle?: string;
  bullets?: string[];
  source: string;
  time: string;
  url: string;
  sentiment: "pos" | "neg" | "neu";
};

export type NewsCat = "전체" | "숙박" | "전기차" | "반도체" | "바이오";

export const NEWS_FALLBACK: Record<NewsCat, NewsItem[]> = {
  전체: [
    { title: "에어비앤비, 2분기 매출 예상치 상회…주가 시간외 +4.2%",           source: "Bloomberg",     time: "1시간 전",  url: "#", sentiment: "pos" },
    { title: "미 연준 의장 \"금리 동결 기조 유지\" 발언…나스닥 반응 엇갈려",   source: "Reuters",       time: "2시간 전",  url: "#", sentiment: "neu" },
    { title: "테슬라, 중국 시장 점유율 3개월 연속 하락",                         source: "CNBC",          time: "3시간 전",  url: "#", sentiment: "neg" },
    { title: "엔비디아 H200 칩, 데이터센터 수요 예상 대비 2배 초과 주문",       source: "WSJ",           time: "5시간 전",  url: "#", sentiment: "pos" },
  ],
  숙박: [
    { title: "에어비앤비, 2분기 매출 예상치 상회…주가 시간외 +4.2%",           source: "Bloomberg",     time: "1시간 전",  url: "#", sentiment: "pos" },
    { title: "힐튼 호텔, 아시아 태평양 신규 객실 2,000개 추가 계획 발표",       source: "Reuters",       time: "4시간 전",  url: "#", sentiment: "pos" },
    { title: "글로벌 호텔 예약률 팬데믹 전 대비 108% 회복…성수기 수요 견조",   source: "Travel Weekly", time: "6시간 전",  url: "#", sentiment: "pos" },
    { title: "단기 임대 규제 강화 움직임…에어비앤비 일부 도시 공급 감소 우려", source: "FT",            time: "8시간 전",  url: "#", sentiment: "neg" },
  ],
  전기차: [
    { title: "테슬라, 중국 시장 점유율 3개월 연속 하락",                         source: "CNBC",          time: "3시간 전",  url: "#", sentiment: "neg" },
    { title: "리비안, 아마존 배송 밴 납품 1만대 달성…주가 +6.1%",              source: "Bloomberg",     time: "5시간 전",  url: "#", sentiment: "pos" },
    { title: "BYD 3월 전 세계 판매량 테슬라 2배 달성…\"전기차 왕좌\" 교체 신호",source: "Reuters",      time: "7시간 전",  url: "#", sentiment: "neu" },
    { title: "미국 IRA 보조금 축소 논의…전기차 구매 수요에 영향 줄 듯",         source: "WSJ",           time: "9시간 전",  url: "#", sentiment: "neg" },
  ],
  반도체: [
    { title: "엔비디아 H200 칩, 데이터센터 수요 예상 대비 2배 초과 주문",       source: "WSJ",           time: "5시간 전",  url: "#", sentiment: "pos" },
    { title: "삼성전자, HBM4 양산 2024년 3분기 목표 공식 확인",                 source: "연합뉴스",      time: "6시간 전",  url: "#", sentiment: "pos" },
    { title: "TSMC, AI 칩 주문 폭증으로 선도 기술 공정 가동률 100% 육박",       source: "Nikkei",        time: "8시간 전",  url: "#", sentiment: "pos" },
    { title: "반도체 장비 수출 규제 추가 확대 우려…SK하이닉스 소폭 하락",       source: "Reuters",       time: "10시간 전", url: "#", sentiment: "neg" },
  ],
  바이오: [
    { title: "삼성바이오로직스, 글로벌 빅파마와 역대 최대 위탁생산 계약 체결", source: "한국경제",      time: "2시간 전",  url: "#", sentiment: "pos" },
    { title: "셀트리온 자가면역 바이오시밀러, FDA 허가 획득…미국 시장 진출",   source: "메디파나",      time: "4시간 전",  url: "#", sentiment: "pos" },
    { title: "한미약품, GLP-1 비만 치료제 임상 2상 중간 결과 실망…주가 -8.3%",source: "Bloomberg",     time: "6시간 전",  url: "#", sentiment: "neg" },
    { title: "글로벌 바이오 VC 투자 1분기 전년 동기 대비 34% 감소",             source: "FT",            time: "8시간 전",  url: "#", sentiment: "neu" },
  ],
};

export async function fetchNews(cat: NewsCat): Promise<NewsItem[]> {
  try {
    const res = await fetch(`/api/news?cat=${encodeURIComponent(cat)}`, { cache: "no-store" });
    if (!res.ok) throw new Error("fetch failed");
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) throw new Error("empty");
    return data as NewsItem[];
  } catch {
    return NEWS_FALLBACK[cat];
  }
}
