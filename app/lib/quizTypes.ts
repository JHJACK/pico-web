// ─────────────────────────────────────────────────────────────────────────────
// PICO 투자 DNA — 공유 타입·데이터 (quiz page + mypage 공용)
// ─────────────────────────────────────────────────────────────────────────────

export type Axis = "R" | "I" | "T" | "Y";

export type TypeKey =
  | "tiger" | "wolf" | "eagle" | "fox"
  | "butterfly" | "hedgehog" | "elephant" | "turtle";

export type QuizOption = {
  text: string;
  sub?: string;
  score: number; // axis 점수 기여값
};

export type QuizQuestion = {
  num: number;
  axis: Axis;
  scenario?: string;
  text: string;
  options: QuizOption[];
};

export type InvestorType = {
  emoji: string;
  modifier: string;
  name: string;
  tagline: string;
  desc: string;
  axisR: "HIGH" | "LOW";
  axisT: "SHORT" | "LONG";
  axisY: "GROWTH" | "STABLE";
  color: string;
  stocks: string[];
  allocation: { label: string; pct: string }[];
  recommended: { label: string; value: string }[];
  guards: { title: string; desc: string }[];
  compatible: string; // 궁합 유형 이름
};

// ─────────────────────────────────────────────────────────────────────────────
// 8가지 투자 유형 데이터
// ─────────────────────────────────────────────────────────────────────────────
export const INVESTOR_TYPES: Record<TypeKey, InvestorType> = {
  tiger: {
    emoji: "🐯", modifier: "공격적 개척자", name: "호랑이",
    tagline: "변동성이 곧 기회 — 고위험·고수익을 즐겨",
    desc: "하락장을 두려워하지 않아. 남들이 팔 때 오히려 담고, 확신이 생기면 집중 투자해. 빠른 결단력이 강점이지만 충동적 손실 리스크도 있어.",
    axisR: "HIGH", axisT: "SHORT", axisY: "GROWTH", color: "#f07878",
    stocks: ["테슬라", "엔비디아", "반도체 ETF", "성장주"],
    allocation: [
      { label: "주식", pct: "70~80%" },
      { label: "현금·단기채", pct: "10~15%" },
      { label: "채권·안전자산", pct: "5~10%" },
    ],
    recommended: [
      { label: "핵심", value: "나스닥100 ETF, 반도체·AI ETF" },
      { label: "위성", value: "고성장 개별주 (TSLA, NVDA 등)" },
      { label: "피할 것", value: "배당주, 리츠, 채권형 ETF" },
    ],
    guards: [
      { title: "⚡ FOMO 충동 매수", desc: "분석 없이 화제 종목을 바로 사는 패턴. 매수 전 '이 종목을 3줄로 설명할 수 있나'를 자문해보세요." },
      { title: "🔥 과도한 확신", desc: "수익이 연속으로 나면 비중을 무리하게 늘리는 경향. 단일 종목 비중 25% 이내를 지켜요." },
    ],
    compatible: "복리의 설계자 코끼리",
  },
  wolf: {
    emoji: "🐺", modifier: "역발상의 철학자", name: "늑대",
    tagline: "공포 극점에서 기다리는 역발상 사냥꾼",
    desc: "군중이 패닉할 때 홀로 냉정하게 분석해. 저PER·낙폭 과대 종목을 찾아 저점 매수하는 걸 즐겨. 대신 너무 일찍 들어가 오래 기다리는 경우도 있어.",
    axisR: "HIGH", axisT: "SHORT", axisY: "STABLE", color: "#c4b0fc",
    stocks: ["저PER 가치주", "낙폭 과대주", "리오프닝주"],
    allocation: [
      { label: "주식", pct: "60~70%" },
      { label: "현금 (기회 포착)", pct: "15~20%" },
      { label: "채권·안전자산", pct: "10~15%" },
    ],
    recommended: [
      { label: "핵심", value: "저PER 가치주, 낙폭 과대 대형주" },
      { label: "위성", value: "경기 민감 섹터 ETF" },
      { label: "피할 것", value: "하이퍼 성장주, 레버리지 ETF" },
    ],
    guards: [
      { title: "⚡ 역발상 과신", desc: "바닥이라고 판단해 너무 일찍 진입하는 패턴. '더 떨어질 수 있다'를 항상 열어두세요." },
      { title: "🕳️ 가치 함정 (Value Trap)", desc: "싼 이유가 따로 있는 종목. PER 외에 매출 성장률·부채비율도 반드시 확인하세요." },
    ],
    compatible: "안전 제일 수호자 거북이",
  },
  eagle: {
    emoji: "🦅", modifier: "집중 돌파의", name: "독수리",
    tagline: "타이밍을 기다렸다 결정적 순간에 집중 투자",
    desc: "멀리서 지켜보다가 결정적 순간에 빠르게 진입·집중 매수해. 공격적이지만 장기 안목도 있어. 섹터 ETF와 모멘텀 성장주가 잘 맞아.",
    axisR: "HIGH", axisT: "LONG", axisY: "GROWTH", color: "#7eb8f7",
    stocks: ["섹터 ETF", "모멘텀 성장주", "테마 집중주"],
    allocation: [
      { label: "주식", pct: "65~75%" },
      { label: "현금 (타이밍 대기)", pct: "15~20%" },
      { label: "채권·안전자산", pct: "5~10%" },
    ],
    recommended: [
      { label: "핵심", value: "AI·반도체·헬스케어 섹터 ETF" },
      { label: "위성", value: "성장 테마 집중주 3~5개" },
      { label: "피할 것", value: "배당주, 안정형 가치주" },
    ],
    guards: [
      { title: "⚡ 타이밍 과신", desc: "바닥·고점을 정확히 맞출 수 있다는 생각은 통계적으로 틀릴 확률이 높아요." },
      { title: "🔥 집중 리스크", desc: "섹터 집중 투자 시 해당 섹터 동반 하락 때 타격이 크므로 섹터 간 분산도 고려하세요." },
    ],
    compatible: "방어의 전략가 고슴도치",
  },
  fox: {
    emoji: "🦊", modifier: "정보의 연금술사", name: "여우",
    tagline: "뉴스·트렌드를 가장 먼저 읽는 정보 전략가",
    desc: "뉴스와 트렌드를 빠르게 처리해 선제적으로 포지션을 잡아. 정보 처리 속도가 강점. 단, 소셜 의존이 높을수록 빈번한 매매로 수익이 갉아 먹힐 수 있어.",
    axisR: "HIGH", axisT: "LONG", axisY: "STABLE", color: "#f5a742",
    stocks: ["트렌드 테마주", "AI·바이오", "핫이슈 종목"],
    allocation: [
      { label: "주식", pct: "55~65%" },
      { label: "현금·단기 투자", pct: "15~20%" },
      { label: "채권·안전자산", pct: "15~20%" },
    ],
    recommended: [
      { label: "핵심", value: "트렌드 ETF, 이슈 모멘텀 종목" },
      { label: "위성", value: "직접 써본 서비스·브랜드 개별주" },
      { label: "피할 것", value: "뉴스 없는 장기 가치주" },
    ],
    guards: [
      { title: "⚡ 소셜 의존 과잉", desc: "커뮤니티 알림을 끄는 것도 방법. 정보를 다양한 채널로 교차 검증하는 습관을 만드세요." },
      { title: "💸 잦은 매매 비용", desc: "트렌드 체이싱이 수수료·세금을 갉아먹어요. 진입 이유를 메모해 두고 재진입 기준을 명확히 하세요." },
    ],
    compatible: "복리의 설계자 코끼리",
  },
  butterfly: {
    emoji: "🦋", modifier: "예술가적 직관가", name: "나비",
    tagline: "세상의 변화를 감각으로 읽는 미래 투자자",
    desc: "직접 경험하거나 느낀 트렌드에 투자해. 친환경·AI·미래 산업 등 세상을 바꿀 테마에 공감하고 들어가는 스타일. 데이터 검증이 약점.",
    axisR: "LOW", axisT: "SHORT", axisY: "GROWTH", color: "#FACA3E",
    stocks: ["친환경 ETF", "AI 인프라", "전기차", "미래 테마"],
    allocation: [
      { label: "테마·성장주", pct: "40~50%" },
      { label: "코어 ETF", pct: "30~35%" },
      { label: "현금", pct: "15~20%" },
    ],
    recommended: [
      { label: "핵심", value: "친환경·AI·전기차 테마 ETF" },
      { label: "위성", value: "직접 쓰는 서비스·브랜드 개별주" },
      { label: "피할 것", value: "모르는 영역의 단기 매매" },
    ],
    guards: [
      { title: "🎨 감각 과신", desc: "직관이 강점이지만 최소 1개 숫자(매출 성장률 등)로 검증하는 습관을 만드세요." },
      { title: "⚡ 트렌드 사이클 착각", desc: "테마주는 피크 때 진입하면 긴 하락을 버텨야 해요. 유행 초기에 들어갔는지 확인하세요." },
    ],
    compatible: "역발상의 철학자 늑대",
  },
  hedgehog: {
    emoji: "🦔", modifier: "방어의 전략가", name: "고슴도치",
    tagline: "분산으로 시장 변동을 부드럽게 흡수하는 수비 마스터",
    desc: "절대 한 곳에 몰지 않아. ETF 포트폴리오로 리스크를 낮추는 게 최우선. 꾸준히 쌓이는 걸 좋아하고 급등·급락 종목은 멀리해.",
    axisR: "LOW", axisT: "SHORT", axisY: "STABLE", color: "#7ed4a0",
    stocks: ["S&P500 ETF", "채권 혼합", "리츠", "금 ETF"],
    allocation: [
      { label: "주식·ETF", pct: "50~60%" },
      { label: "채권·안전자산", pct: "25~30%" },
      { label: "현금", pct: "10~15%" },
    ],
    recommended: [
      { label: "핵심", value: "S&P500 ETF, 배당성장 ETF" },
      { label: "위성", value: "리츠, 채권 ETF" },
      { label: "피할 것", value: "하이마 주, 레버리지 ETF, 코인" },
    ],
    guards: [
      { title: "💰 기회비용 손실", desc: "너무 안전만 추구하면 인플레이션에 실질 자산이 감소해요. 주식 ETF 비중 최소 40%는 유지하세요." },
      { title: "🚪 손실 회피 과잉", desc: "-5%만 되어도 팔고 싶어지는 심리. 분기 1회 포트폴리오 확인 규칙으로 잦은 개입을 차단하세요." },
    ],
    compatible: "집중 돌파의 독수리",
  },
  elephant: {
    emoji: "🐘", modifier: "복리의 설계자", name: "코끼리",
    tagline: "느리지만 흔들리지 않는 장기 복리 설계자",
    desc: "한번 들어가면 오래 가져가. 단기 변동에 흔들리지 않고 복리 효과를 극대화하는 게 목표. 나스닥·S&P500 ETF 정기 적립이 잘 맞아.",
    axisR: "LOW", axisT: "LONG", axisY: "GROWTH", color: "#7eb8f7",
    stocks: ["나스닥100 ETF", "S&P500 ETF", "애플", "마이크로소프트"],
    allocation: [
      { label: "주식·성장 ETF", pct: "60~70%" },
      { label: "배당주·채권", pct: "20~25%" },
      { label: "현금", pct: "10%" },
    ],
    recommended: [
      { label: "핵심", value: "나스닥100 ETF, S&P500 ETF" },
      { label: "위성", value: "애플·마이크로소프트 등 빅테크" },
      { label: "매매 방식", value: "정기 적립식 매수 (DCA)" },
    ],
    guards: [
      { title: "🔒 집중 투자 함정", desc: "장기 보유에 익숙해지면 '이건 확실해'라는 착각으로 한 종목에 과도하게 몰리는 경향. 단일 종목 30% 이내를 지켜요." },
      { title: "⏱️ 타이밍 무시 리스크", desc: "장기 투자여도 밸류에이션이 극단적으로 높을 때는 추가 매수 속도를 조절하는 게 좋아요." },
    ],
    compatible: "공격적 개척자 호랑이",
  },
  turtle: {
    emoji: "🐢", modifier: "안전 제일 수호자", name: "거북이",
    tagline: "원금 보존이 최우선, 배당 복리로 천천히 쌓아가는 스타일",
    desc: "느리지만 가장 오래 살아남는 투자자. 배당주·채권으로 꾸준한 현금 흐름을 만들고, 원금 손실을 가장 두려워해. 복리의 힘을 믿어.",
    axisR: "LOW", axisT: "LONG", axisY: "STABLE", color: "#7ed4a0",
    stocks: ["배당 ETF", "KT&G", "리츠", "국채·회사채"],
    allocation: [
      { label: "배당주·연금주", pct: "40~50%" },
      { label: "채권·안전자산", pct: "30~35%" },
      { label: "현금", pct: "15~20%" },
    ],
    recommended: [
      { label: "핵심", value: "S&P500 ETF, 배당성장 ETF" },
      { label: "위성", value: "국채·회사채 ETF, 리츠" },
      { label: "피할 것", value: "하이마 주, 레버리지·코인" },
    ],
    guards: [
      { title: "💰 기회비용 손실", desc: "너무 방어적이면 인플레이션에 실질 자산이 줄어요. 주식 비중 최소 40%는 확보하세요." },
      { title: "🚪 손실 회피 과잉", desc: "작은 손실에도 팔고 싶어지는 심리가 장기 수익을 갉아먹어요. 리밸런싱은 분기 1회로 제한하세요." },
    ],
    compatible: "복리의 설계자 코끼리",
  },
};

export const TYPE_KEYS: TypeKey[] = ["tiger", "wolf", "eagle", "fox", "butterfly", "hedgehog", "elephant", "turtle"];

// ─────────────────────────────────────────────────────────────────────────────
// 18문항 (R×5, I×4, T×5, Y×4)
// ─────────────────────────────────────────────────────────────────────────────
export const QUESTIONS: QuizQuestion[] = [
  // ── PART 1: R축 (변동성 회복력) ──────────────────────
  {
    num: 1, axis: "R",
    scenario: "자고 일어났더니 보유 종목이 -15% 하락해 있어. 관련 뉴스는 아직 없어.",
    text: "지금 가장 먼저 어떻게 하겠어?",
    options: [
      { text: "일단 창을 닫고 마음을 진정시키며 반등을 기다려.", sub: "아직 원인도 모르잖아", score: 10 },
      { text: "일단 절반 매도해. 손실을 막는 게 먼저야.", sub: "추가 하락이 더 두려워", score: 0 },
      { text: "뉴스와 커뮤니티를 검색해서 원인을 찾아볼게.", sub: "이유를 알아야 판단할 수 있어", score: 20 },
      { text: "미리 세워둔 계획대로 즉시 추가 매수해.", sub: "분할매수 계획이 있었잖아", score: 33 },
    ],
  },
  {
    num: 2, axis: "R",
    text: "솔직하게 답해줘. 보유 종목이 몇 % 하락하면 '이건 못 버티겠다'는 생각이 들 것 같아?",
    options: [
      { text: "-5% 이내", sub: "조금만 빠져도 너무 불안해", score: 0 },
      { text: "-10~15% 정도", sub: "이 정도면 버틸 수 있어", score: 17 },
      { text: "-30%", sub: "장기 투자라면 감수해야 한다고 생각해", score: 25 },
      { text: "-50% 이상도 버텨. 확신만 있으면.", sub: "기업이 안 망하면 괜찮아", score: 33 },
    ],
  },
  {
    num: 3, axis: "R",
    scenario: "한 달 만에 +30% 수익이 달성됐어.",
    text: "이 수익금을 어떻게 할 거야?",
    options: [
      { text: "전부 인출해. 원금만 남겨두고 싶어.", sub: "이미 목표 달성했잖아", score: 0 },
      { text: "일부는 챙기고, 나머지는 재투자해.", sub: "균형이 필요해", score: 17 },
      { text: "전부 재투자해. 복리 효과를 극대화해야지.", sub: "지금 팔면 기회 손실이야", score: 33 },
    ],
  },
  {
    num: 4, axis: "R",
    scenario: "시장이 갑자기 20% 폭락했어. 뉴스도 온통 '추가 하락 우려'야.",
    text: "이런 상황에서 본인의 실제 반응과 가장 가까운 건?",
    options: [
      { text: "패닉 매도하고 나중에 회복되면 다시 살 것 같아.", sub: "일단 피하고 봐야겠어", score: 0 },
      { text: "불안하지만 일단 버티며 상황을 지켜봐.", sub: "판단을 서두르지 않겠어", score: 17 },
      { text: "크게 동요하지 않고 계획대로 포지션을 유지해.", sub: "단기 뉴스에 흔들리지 않아", score: 25 },
      { text: "오히려 비중을 더 늘려. 하락장이 진짜 기회야.", sub: "공포에 사고 환희에 파는 거잖아", score: 33 },
    ],
  },
  {
    num: 5, axis: "R",
    text: "지금 투자하려는 자금의 성격은 어떤 거야?",
    options: [
      { text: "언제든 빼 와야 할 수도 있는 자금이야.", sub: "긴급하게 필요할 수 있어", score: 0 },
      { text: "1~2년은 묶여도 괜찮은 자금이야.", sub: "그 정도 여유는 있어", score: 17 },
      { text: "5년 이상 건드리지 않아도 되는 진짜 여유 자금이야.", sub: "없어도 생활에 지장 없어", score: 33 },
    ],
  },

  // ── PART 2: I축 (정보 필터링) ──────────────────────
  {
    num: 6, axis: "I",
    text: "주식 종목을 고를 때 가장 먼저 확인하는 건 뭐야?",
    options: [
      { text: "유튜브, SNS, 커뮤니티에서 화제인 종목", sub: "사람들이 많이 얘기하면 이유가 있겠지", score: 0 },
      { text: "차트 패턴과 최근 거래량의 변화", sub: "수급이 먼저야", score: 17 },
      { text: "기업의 재무제표, 실적, 성장률", sub: "숫자가 전부를 말해줘", score: 25 },
      { text: "내가 직접 써봤거나 주변에서 많이 쓰는 제품·서비스", sub: "내가 아는 것에 투자해야지", score: 33 },
    ],
  },
  {
    num: 7, axis: "I",
    scenario: "모두가 '이 주식 이제 끝났다'고 해. 커뮤니티 분위기도 공포 그 자체야.",
    text: "그 시각 본인의 마음에 가장 가까운 건?",
    options: [
      { text: "다들 그렇게 말하니 이유가 있겠지. 나도 정리하고 싶어.", sub: "대세를 거스르기가 쉽지 않아", score: 0 },
      { text: "원인을 먼저 분석하고 나서 판단해.", sub: "충분한 근거 없이 움직이지 않아", score: 17 },
      { text: "남들이 팔 때가 진짜 기회일 수도 있어. 오히려 흥미로워.", sub: "역발상이 통하는 구간이야", score: 33 },
    ],
  },
  {
    num: 8, axis: "I",
    text: "투자를 위한 공부·분석에 일주일에 얼마나 시간을 써?",
    options: [
      { text: "거의 없어. 추천받거나 느낌으로 해.", sub: "시간이 너무 많이 들어", score: 0 },
      { text: "1~2시간 정도. 간단히 체크하는 수준.", sub: "핵심만 파악하면 충분해", score: 17 },
      { text: "5시간 이상. 종목 하나를 제대로 이해하고 들어가고 싶어.", sub: "모르는 건 사지 않아", score: 33 },
    ],
  },
  {
    num: 9, axis: "I",
    scenario: "신뢰하는 지인에게서 '이 종목 진짜 좋아 보여'라는 정보를 들었어.",
    text: "실제로 매수 버튼을 누르기까지 얼마나 걸릴 것 같아?",
    options: [
      { text: "바로 사. 기회를 놓치면 안 되니까.", sub: "타이밍이 중요해", score: 0 },
      { text: "하루 이틀 더 찾아보고 결정해.", sub: "기본은 확인해야지", score: 17 },
      { text: "일주일 이상 직접 분석한 후 진입해.", sub: "충분히 납득이 돼야 들어가", score: 33 },
    ],
  },

  // ── PART 3: T축 (이용 호흡) ──────────────────────
  {
    num: 10, axis: "T",
    text: "주식 계좌를 하루에 몇 번이나 확인해?",
    options: [
      { text: "수시로 확인해. 거의 실시간 모니터링이야.", sub: "놓치면 안 되잖아", score: 0 },
      { text: "하루 1~2번 정도면 충분해.", sub: "그 정도면 변화는 다 체크돼", score: 17 },
      { text: "일주일에 1~2번이면 돼. 자주 볼 필요 없어.", sub: "자주 보면 오히려 손이 가", score: 33 },
    ],
  },
  {
    num: 11, axis: "T",
    text: "한 종목을 매수한다면 얼마 동안 보유하고 싶어?",
    options: [
      { text: "목표 수익률에 도달하면 바로 팔아. (1~3개월)", sub: "수익 실현이 목표야", score: 0 },
      { text: "6개월~1년 정도는 기다릴 수 있어.", sub: "어느 정도 시간은 줘야지", score: 17 },
      { text: "3년 이상 장기 보유가 기본이야.", sub: "시간이 내 편이야", score: 33 },
    ],
  },
  {
    num: 12, axis: "T",
    scenario: "시장이 몇 주째 오르지도 내리지도 않고 지루하게 횡보 중이야.",
    text: "이럴 때 본인의 반응에 가장 가까운 건?",
    options: [
      { text: "답답해서 다른 종목을 찾아보게 돼.", sub: "뭔가 움직이는 게 있어야지", score: 0 },
      { text: "그냥 기다려. 결국 오를 거라 생각해.", sub: "인내심이 수익이야", score: 17 },
      { text: "오히려 포트폴리오를 재정비하는 시간으로 써.", sub: "평온할 때 정리하는 거야", score: 33 },
    ],
  },
  {
    num: 13, axis: "T",
    text: "이 투자를 통해 언제까지 목표를 달성하고 싶어?",
    options: [
      { text: "1~2년 내에 목돈을 만들고 싶어.", sub: "빠른 결과가 필요해", score: 0 },
      { text: "5년 내 자산을 의미 있게 키우는 게 목표야.", sub: "중기 플랜이 있어", score: 17 },
      { text: "10년 이상, 노후 미래를 준비하는 게 목표야.", sub: "진짜 장기전이야", score: 33 },
    ],
  },
  {
    num: 14, axis: "T",
    scenario: "지금 보유 중인 종목이 3년 뒤에는 2배가 될 것 같아. 다만 내년까지는 -25%가 예상돼.",
    text: "어떻게 하겠어?",
    options: [
      { text: "일단 팔고 내년에 다시 살게. 타이밍을 잡고 싶어.", sub: "하락 구간은 피하고 싶어", score: 0 },
      { text: "그냥 들고 가. 3년 후 2배가 목표니까.", sub: "단기 고통은 감수해", score: 33 },
    ],
  },

  // ── PART 4: Y축 (수익 성향) ──────────────────────
  {
    num: 15, axis: "Y",
    text: "둘 중 하나만 골라야 한다면 어느 쪽이 더 끌려?",
    options: [
      { text: "매월 꼬박꼬박 배당금이 들어오는 안정적인 주식", sub: "꾸준함이 최고야", score: 0 },
      { text: "배당은 없지만 주가가 10배 오를 가능성이 있는 성장주", sub: "폭발적 수익이 목표야", score: 33 },
    ],
  },
  {
    num: 16, axis: "Y",
    text: "1,000만 원이 있다면 몇 종목에 나눠 투자하고 싶어?",
    options: [
      { text: "1~2개. 확신이 있는 곳에 집중하고 싶어.", sub: "분산하면 수익도 분산돼", score: 33 },
      { text: "5~7개. 어느 정도 분산은 필요해.", sub: "균형이 필요해", score: 17 },
      { text: "10개 이상. 최대한 분산해서 리스크를 낮추고 싶어.", sub: "한 개 망해도 버텨야지", score: 0 },
    ],
  },
  {
    num: 17, axis: "Y",
    text: "어떤 분야의 기업에 더 끌려?",
    options: [
      { text: "AI, 반도체, 바이오 등 아직 성장 중인 미래 산업", sub: "미래에 베팅하는 게 맞아", score: 33 },
      { text: "의약, 에너지, 소비재 등 검증된 전통 산업", sub: "오래된 데 이유가 있어", score: 0 },
      { text: "둘 다 균형 있게 담고 싶어.", sub: "안정성과 성장성 모두 챙겨야지", score: 17 },
    ],
  },
  {
    num: 18, axis: "Y",
    text: "수익을 극대화하기 위해 대출을 활용할 의향이 있어?",
    options: [
      { text: "절대 없어. 빌린 돈으로 투자는 원칙적으로 안 해.", sub: "내 돈으로만 해야지", score: 0 },
      { text: "소액이라면 기회에 따라 고려할 수 있어.", sub: "경우에 따라서는", score: 17 },
      { text: "좋은 기회라면 적극 활용해. 레버리지도 전략이야.", sub: "더 크게 베팅하는 거야", score: 33 },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 채점 함수
// ─────────────────────────────────────────────────────────────────────────────
export type AxisScores = { R: number; I: number; T: number; Y: number };

export function calcInvestorType(raw: AxisScores): TypeKey {
  const R = (raw.R / 165) * 100; // Q1-5 max 165
  const T = (raw.T / 165) * 100; // Q10-14 max 165
  const Y = (raw.Y / 132) * 100; // Q15-18 max 132
  const rHigh    = R >= 50;
  const tLong    = T >= 50;
  const yGrowth  = Y >= 60;
  if  (rHigh && !tLong &&  yGrowth) return "tiger";
  if  (rHigh && !tLong && !yGrowth) return "wolf";
  if  (rHigh &&  tLong &&  yGrowth) return "eagle";
  if  (rHigh &&  tLong && !yGrowth) return "fox";
  if (!rHigh && !tLong &&  yGrowth) return "butterfly";
  if (!rHigh && !tLong && !yGrowth) return "hedgehog";
  if (!rHigh &&  tLong &&  yGrowth) return "elephant";
  return "turtle";
}
