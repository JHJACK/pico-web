export type CardCategory = 'beginner' | 'intermediate' | 'advanced' | 'tax'
export type CardRarity = 'common' | 'rare' | 'epic'

export interface LearnCard {
  id: string
  term: string
  emoji: string
  category: CardCategory
  rarity: CardRarity
  summary: string
  description: string
  tip?: string
  quiz: {
    question: string
    options: string[]
    answer: number
    explanation: string
  }
}

export const CATEGORY_INFO: Record<CardCategory, {
  label: string; emoji: string; color: string; description: string
}> = {
  beginner:     { label: '입문',  emoji: '🟢', color: '#7ed4a0', description: '주식 첫 걸음' },
  intermediate: { label: '중급',  emoji: '🟡', color: '#FACA3E', description: '조금 더 알고 싶다면' },
  advanced:     { label: '고급',  emoji: '🔴', color: '#f07878', description: '진짜 투자자의 언어' },
  tax:          { label: '세금',  emoji: '🏦', color: '#a890f0', description: '세금도 전략이다' },
}

export const RARITY_INFO: Record<CardRarity, { label: string; color: string; points: number }> = {
  common: { label: '일반', color: '#c8bfb0', points: 30 },
  rare:   { label: '레어', color: '#7eb8f7', points: 50 },
  epic:   { label: '에픽', color: '#a890f0', points: 80 },
}

export const LEARN_CARDS: LearnCard[] = [
  // ── 입문 ────────────────────────────────────────────────────────────────
  {
    id: 'stock',
    term: '주식',
    emoji: '📄',
    category: 'beginner',
    rarity: 'common',
    summary: '회사의 소유권 조각',
    description: '회사를 피자 8조각으로 나눈다고 해봐요. 주식 1주 = 피자 한 조각. 삼성전자 주식을 1주 사면 삼성전자의 아주 작은 주인이 되는 거예요.',
    tip: '전 세계 수천 개 회사의 주식이 매일 거래되고 있어요.',
    quiz: {
      question: '주식 1주를 사면 어떻게 되나요?',
      options: ['그 회사에 돈을 빌려준 것이다', '그 회사의 아주 작은 주인이 된다', '그 회사에서 일하게 된다'],
      answer: 1,
      explanation: '주식은 회사 소유권의 일부예요. 주주(주식 보유자)는 회사의 이익을 나눠 받을 권리가 있어요.',
    },
  },
  {
    id: 'open_price',
    term: '시가',
    emoji: '🌅',
    category: 'beginner',
    rarity: 'common',
    summary: '오늘 장이 열렸을 때 첫 거래 가격',
    description: '학교 1교시 시작! 주식 시장이 문을 여는 순간, 가장 처음으로 체결된 거래 가격을 시가라고 해요. 한국 주식 시장은 오전 9시에 열려요.',
    quiz: {
      question: '시가는 언제의 가격인가요?',
      options: ['어제 마지막 거래 가격', '오늘 장이 열릴 때 첫 거래 가격', '오늘 가장 높았던 가격'],
      answer: 1,
      explanation: '시가(始價) = 시작 가격. 장이 열릴 때 첫 체결 가격이에요.',
    },
  },
  {
    id: 'close_price',
    term: '종가',
    emoji: '🔔',
    category: 'beginner',
    rarity: 'common',
    summary: '하교 종 소리! 오늘 마지막 거래 가격',
    description: '학교 끝날 때 땡~ 치는 종소리 들어봤죠? 주식 시장도 마감 직전 마지막으로 체결된 거래 가격이 종가예요. 한국 시장은 오후 3시 30분에 닫혀요.',
    tip: '뉴스에서 "오늘 코스피 ○○ 마감"이라고 할 때 그게 종가 기준이에요.',
    quiz: {
      question: '종가는 무엇인가요?',
      options: ['거래량이 가장 많은 시간의 가격', '장 마감 때 마지막 체결 가격', '오늘 가장 낮았던 가격'],
      answer: 1,
      explanation: '종가(終價) = 끝 가격. 오늘 장이 닫힐 때 마지막 체결 가격이에요.',
    },
  },
  {
    id: 'volume',
    term: '거래량',
    emoji: '📊',
    category: 'beginner',
    rarity: 'common',
    summary: '오늘 얼마나 많이 사고팔았는지',
    description: '어떤 종목이 오늘 몇 주가 거래됐는지 알려주는 숫자예요. 거래량이 많다 = 사람들의 관심이 높다는 신호일 수 있어요.',
    quiz: {
      question: '거래량이 갑자기 크게 늘어났다면 보통 무엇을 의미하나요?',
      options: ['주가가 반드시 오른다', '그 종목에 대한 관심이 높아졌다', '장이 곧 끝난다'],
      answer: 1,
      explanation: '거래량 급증은 매수나 매도 세력이 크게 움직였다는 신호예요. 이유는 뉴스나 공시를 확인해야 해요.',
    },
  },
  {
    id: 'dividend',
    term: '배당금',
    emoji: '💰',
    category: 'beginner',
    rarity: 'rare',
    summary: '회사가 주주에게 나눠주는 용돈',
    description: '회사가 돈을 잘 벌면 일부를 주주들에게 나눠줘요. 이게 배당금이에요. 동네 치킨집을 나눠 갖고 있을 때, 장사가 잘 되면 이익을 나눠 받는 것처럼요.',
    tip: '배당금을 많이 주는 회사를 "배당주"라고 해요. 안정적 수입을 원하는 투자자들이 선호해요.',
    quiz: {
      question: '배당금은 언제 받나요?',
      options: ['주식을 팔 때만 받는다', '회사가 이익을 낼 때 주주에게 지급한다', '매일 자동으로 들어온다'],
      answer: 1,
      explanation: '배당금은 회사가 이익의 일부를 주주에게 나눠주는 것이에요. 배당 기준일에 주식을 보유하고 있어야 받을 수 있어요.',
    },
  },
  {
    id: 'deposit',
    term: '예수금',
    emoji: '🏦',
    category: 'beginner',
    rarity: 'common',
    summary: '아직 투자 안 된 내 대기 자금',
    description: '증권 계좌에 입금했지만 아직 주식을 사지 않은 돈이에요. 은행 계좌에서 잠자고 있는 돈이라고 보면 돼요. 언제든지 주식을 살 수 있는 "총알"이에요.',
    quiz: {
      question: '예수금이란 무엇인가요?',
      options: ['이미 주식에 투자된 금액', '아직 투자하지 않은 증권 계좌 잔고', '예금 이자로 받은 돈'],
      answer: 1,
      explanation: '예수금 = 증권 계좌에 있지만 아직 주식을 사지 않은 현금이에요. 바로 투자 가능한 금액이에요.',
    },
  },
  {
    id: 'ask_bid',
    term: '호가',
    emoji: '🏷️',
    category: 'beginner',
    rarity: 'rare',
    summary: '사고 싶다/팔고 싶다 부른 가격',
    description: '시장에서 물건 값 흥정하는 것처럼, 주식에서도 "나는 이 가격에 팔겠다" "나는 이 가격에 사겠다"를 제시해요. 이 제시 가격을 호가라고 해요.',
    tip: '매수 호가(사겠다는 가격)와 매도 호가(팔겠다는 가격)의 차이를 스프레드라고 해요.',
    quiz: {
      question: '호가란 무엇인가요?',
      options: ['실제로 체결된 가격', '사거나 팔겠다고 제시한 가격', '회사가 정해주는 고정 가격'],
      answer: 1,
      explanation: '호가는 "이 가격에 팔겠다/사겠다"고 제시하는 것이에요. 매수자와 매도자의 호가가 만나면 거래가 체결돼요.',
    },
  },
  {
    id: 'buy',
    term: '매수',
    emoji: '🛒',
    category: 'beginner',
    rarity: 'common',
    summary: '주식을 사는 것',
    description: '주식을 구매하는 행위예요. "매수한다" = 주식을 산다는 뜻이에요. 특정 가격에 주식을 사달라고 주문을 넣는 걸 매수 주문이라고 해요.',
    quiz: {
      question: '"오늘 삼성전자를 매수했다"는 무슨 뜻인가요?',
      options: ['삼성전자 주식을 팔았다', '삼성전자 주식을 샀다', '삼성전자 주식을 빌렸다'],
      answer: 1,
      explanation: '매수(買受) = 구입. 주식을 사는 행위예요. 반대는 매도(파는 것)예요.',
    },
  },
  {
    id: 'sell',
    term: '매도',
    emoji: '💸',
    category: 'beginner',
    rarity: 'common',
    summary: '주식을 파는 것',
    description: '보유한 주식을 시장에 내놓는 행위예요. 주가가 올랐을 때 팔면 수익, 내렸을 때 팔면 손실이 돼요. 실제로 팔기 전까지는 "미실현 수익"이에요.',
    quiz: {
      question: '주식을 매도했다는 것은?',
      options: ['주식을 더 샀다', '주식을 팔았다', '주식을 빌려줬다'],
      answer: 1,
      explanation: '매도(賣渡) = 판매. 보유 중인 주식을 파는 것이에요. 매도 시점에 수익 또는 손실이 확정돼요.',
    },
  },
  {
    id: 'stop_loss',
    term: '손절',
    emoji: '✂️',
    category: 'beginner',
    rarity: 'rare',
    summary: '더 큰 손실을 막기 위해 파는 것',
    description: '주가가 내려갈 때 "에이, 더 기다리다가 더 잃겠다"라고 판단해 손해를 보면서도 파는 거예요. 아프지만 때로는 현명한 선택이에요. 손실을 "절단"한다는 뜻이에요.',
    tip: '미리 "○○% 내리면 판다"는 손절 기준을 세워두면 감정적 판단을 줄일 수 있어요.',
    quiz: {
      question: '손절을 하는 이유는 무엇인가요?',
      options: ['수익을 극대화하기 위해', '더 큰 손실을 막기 위해 일부 손해를 감수하고 파는 것', '세금을 아끼기 위해'],
      answer: 1,
      explanation: '손절(損切) = 손실 절단. 추가 하락을 막기 위해 손해 상태에서 팔아 손실을 확정 짓는 전략이에요.',
    },
  },
  {
    id: 'return_rate',
    term: '수익률',
    emoji: '📈',
    category: 'beginner',
    rarity: 'common',
    summary: '투자한 돈 대비 얼마나 벌었는지 %로',
    description: '100만원 투자해서 120만원 됐으면 수익률 +20%. 80만원 됐으면 -20%예요. 투자 성과를 비교할 때 수익금보다 수익률을 봐야 정확해요.',
    quiz: {
      question: '100만원을 투자해서 130만원이 됐을 때 수익률은?',
      options: ['+30%', '+130%', '+30만원'],
      answer: 0,
      explanation: '수익률 = (수익 ÷ 원금) × 100. (30만원 ÷ 100만원) × 100 = 30%예요.',
    },
  },
  {
    id: 'ipo',
    term: '상장',
    emoji: '🎓',
    category: 'beginner',
    rarity: 'rare',
    summary: '회사가 주식 시장에 입학하는 것',
    description: '회사가 일반 투자자들에게 주식을 팔 수 있도록 공식 주식 시장에 등록하는 거예요. 마치 학교에 입학하는 것처럼요. 상장 = IPO(기업공개)라고도 해요.',
    tip: '상장 초기에 주가가 크게 오르는 경우도 있지만, 내리는 경우도 많아요.',
    quiz: {
      question: '회사가 "상장"한다는 것은?',
      options: ['회사가 문을 닫는다', '공식 주식 시장에 등록하여 주식을 거래할 수 있게 된다', '회사가 새 제품을 출시한다'],
      answer: 1,
      explanation: '상장(上場) = 주식 시장에 올라가는 것. 상장 후에는 누구나 그 회사 주식을 사고팔 수 있어요.',
    },
  },
  {
    id: 'delist',
    term: '상장폐지',
    emoji: '🚫',
    category: 'beginner',
    rarity: 'epic',
    summary: '주식 시장에서 퇴학당한 회사',
    description: '주식 시장에서 등록이 취소되는 것이에요. 회사가 망하거나 상장 요건을 못 지키면 퇴학당해요. 상장폐지 되면 주식이 사실상 휴지조각이 될 수 있어 매우 위험해요.',
    tip: '"관리종목 지정" → 상장폐지 직전 경고 단계예요. 이 소식이 들리면 주의하세요.',
    quiz: {
      question: '상장폐지가 발생하면 어떻게 되나요?',
      options: ['주가가 일시적으로 내려갔다 다시 오른다', '주식이 시장에서 거래되지 않고 휴지조각이 될 수 있다', '회사가 새로운 주식을 더 발행한다'],
      answer: 1,
      explanation: '상장폐지 = 주식 시장 퇴출. 보유 주식 거래가 불가능해져 심각한 손실이 발생할 수 있어요.',
    },
  },

  // ── 중급 ────────────────────────────────────────────────────────────────
  {
    id: 'kospi',
    term: 'KOSPI',
    emoji: '🇰🇷',
    category: 'intermediate',
    rarity: 'rare',
    summary: '한국 주식 시장 전체의 성적표',
    description: '코스피(KOSPI) = 한국 종합 주가 지수. 한국 증권 거래소에 상장된 모든 회사들의 주가를 평균 낸 숫자예요. 뉴스에서 "오늘 코스피 2,500 마감"이라고 하면 한국 시장 전체가 그 수준이라는 뜻이에요.',
    tip: '코스피가 오르면 한국 경제 전반이 좋아지는 신호로 보기도 해요.',
    quiz: {
      question: 'KOSPI는 무엇을 나타내는 지표인가요?',
      options: ['특정 회사 하나의 주가', '한국 주식 시장 전체의 평균적인 주가 수준', '미국 주식 시장 지수'],
      answer: 1,
      explanation: 'KOSPI = Korea Composite Stock Price Index. 한국 시장 전체의 종합 지수예요.',
    },
  },
  {
    id: 'kosdaq',
    term: 'KOSDAQ',
    emoji: '🚀',
    category: 'intermediate',
    rarity: 'rare',
    summary: '한국 성장 기업들의 시장',
    description: '코스피보다 상장 요건이 낮아서 성장 중인 중소·벤처 기업들이 많이 있는 시장이에요. 바이오·IT 기업이 많고 변동성이 코스피보다 커요. 나스닥의 한국 버전이라고 볼 수 있어요.',
    quiz: {
      question: 'KOSDAQ 시장의 특징은?',
      options: ['삼성, 현대 같은 대기업만 있다', '성장 중인 중소·벤처 기업이 많고 변동성이 크다', '외국 회사들만 상장할 수 있다'],
      answer: 1,
      explanation: 'KOSDAQ는 성장 가능성이 있는 중소기업이 많아요. 변동성이 높아 더 큰 수익도, 더 큰 손실도 가능해요.',
    },
  },
  {
    id: 'etf',
    term: 'ETF',
    emoji: '🧺',
    category: 'intermediate',
    rarity: 'epic',
    summary: '여러 주식을 한 바구니에 담은 것',
    description: '여러 주식을 한꺼번에 담아 만든 펀드를 주식처럼 사고파는 상품이에요. 예를 들어 S&P 500 ETF를 사면 미국 500대 기업 전부에 한 번에 투자하는 효과가 있어요.',
    tip: 'ETF = Exchange Traded Fund. 분산투자 효과가 있어 초보자에게 친절한 상품이에요.',
    quiz: {
      question: 'ETF를 사는 것과 가장 비슷한 표현은?',
      options: ['특정 회사 1개에 올인하는 것', '여러 회사를 한 번에 담은 바구니를 사는 것', '주식을 빌려서 파는 것'],
      answer: 1,
      explanation: 'ETF는 여러 종목을 하나로 묶어 거래소에서 사고팔 수 있게 만든 상품이에요. 분산투자 효과가 있어요.',
    },
  },
  {
    id: 'sp500',
    term: 'S&P 500',
    emoji: '🇺🇸',
    category: 'intermediate',
    rarity: 'epic',
    summary: '미국 최강 500개 기업 모음집',
    description: '미국 주식 시장에서 가장 큰 500개 회사를 모은 지수예요. 애플, 구글, 마이크로소프트, 아마존이 다 여기 들어있어요. S&P 500 ETF를 사면 이 500개 회사 전부에 투자하는 효과가 있어요.',
    tip: '미국 S&P 500 ETF 배당금에는 15.4%가 원천징수돼요.',
    quiz: {
      question: 'S&P 500 지수는 무엇을 나타내나요?',
      options: ['미국 나스닥 상위 100개 기업', '미국 시장에서 선정된 500개 대형 기업의 주가 지수', '전 세계 500대 기업 지수'],
      answer: 1,
      explanation: "S&P 500 = Standard & Poor's 500. 미국 대형주 500개의 성과를 나타내는 대표적인 지수예요.",
    },
  },
  {
    id: 'per',
    term: 'PER',
    emoji: '🔢',
    category: 'intermediate',
    rarity: 'rare',
    summary: '주가가 이익의 몇 배인지',
    description: 'PER = Price-to-Earnings Ratio. 현재 주가가 1주당 이익의 몇 배인지 보는 지표예요. PER 50이면 지금 이익의 50년치 값을 내고 사는 것. 치킨집이 1년에 100만원 버는데 가게 값이 5,000만원이면 PER 50이에요.',
    tip: '업종마다 평균 PER이 달라요. 성장주는 PER이 높아도 괜찮을 수 있어요.',
    quiz: {
      question: 'PER이 낮다면 어떤 의미일 수 있나요?',
      options: ['주가가 매우 고평가되어 있다', '이익에 비해 주가가 저평가되어 있을 수 있다', '회사가 손실을 내고 있다'],
      answer: 1,
      explanation: 'PER이 낮을수록 이익 대비 주가가 낮아, 상대적으로 저평가일 가능성이 있어요. 단, 이유를 꼭 확인해야 해요.',
    },
  },
  {
    id: 'market_cap',
    term: '시가총액',
    emoji: '🏢',
    category: 'intermediate',
    rarity: 'rare',
    summary: '회사를 통째로 사려면 얼마?',
    description: '주가 × 발행 주식 수. 시장이 이 회사 전체에 매기는 가격이에요. 삼성전자 시가총액 300조 = 지금 당장 삼성전자를 통째로 사려면 300조가 필요하다는 뜻이에요.',
    quiz: {
      question: '시가총액은 어떻게 계산하나요?',
      options: ['매출 × 이익률', '주가 × 총 발행 주식 수', '자산 - 부채'],
      answer: 1,
      explanation: '시가총액 = 주가 × 발행 주식 수. 시장에서 평가하는 회사 전체의 가치예요.',
    },
  },
  {
    id: 'dca',
    term: '분할매수',
    emoji: '🗂️',
    category: 'intermediate',
    rarity: 'epic',
    summary: '한 번에 다 사지 않고 나눠 사는 전략',
    description: '100만원을 한 번에 다 사지 않고, 4번에 나눠서 25만원씩 사는 거예요. 고점에 올인하는 리스크를 줄이고, 평균 매입 단가를 낮출 수 있어요. DCA(Dollar Cost Averaging)라고도 해요.',
    tip: '정기 적립식 투자(매월 일정금액 자동 매수)가 대표적인 분할매수 방법이에요.',
    quiz: {
      question: '분할매수를 하는 가장 큰 이유는?',
      options: ['한 번에 많이 사서 수수료를 절약하려고', '고점에 올인하는 리스크를 줄이고 평균 매입 단가를 낮추려고', '세금을 아끼기 위해'],
      answer: 1,
      explanation: '분할매수는 한 번에 올인하는 타이밍 리스크를 줄이는 전략이에요. 장기적으로 평균 단가를 낮추는 효과가 있어요.',
    },
  },
  {
    id: 'rebalancing',
    term: '리밸런싱',
    emoji: '⚖️',
    category: 'intermediate',
    rarity: 'rare',
    summary: '포트폴리오 비중을 원래대로 맞추기',
    description: '주식 60% + 채권 40%로 투자했는데, 주식이 많이 올라서 주식 80% 채권 20%가 됐어요. 이때 원래 비율로 맞추기 위해 주식을 팔고 채권을 사는 게 리밸런싱이에요.',
    tip: '보통 분기(3개월)에 한 번 또는 비중이 일정 이상 벗어날 때 리밸런싱해요.',
    quiz: {
      question: '리밸런싱은 왜 하나요?',
      options: ['수익이 날 때마다 주식을 더 사기 위해', '목표 자산 비중을 유지해 리스크를 일정하게 관리하기 위해', '세금 신고를 위해'],
      answer: 1,
      explanation: '리밸런싱은 포트폴리오가 목표 비율에서 벗어났을 때 다시 맞추는 것이에요. 리스크를 일정하게 유지하는 데 도움돼요.',
    },
  },

  // ── 고급 ────────────────────────────────────────────────────────────────
  {
    id: 'short_selling',
    term: '공매도',
    emoji: '🔄',
    category: 'advanced',
    rarity: 'epic',
    summary: '없는 주식을 팔고, 나중에 싸게 사서 갚기',
    description: '지금 가지고 있지 않은 주식을 빌려서 팔고, 나중에 주가가 내리면 싸게 사서 갚는 전략이에요. 주가가 내릴 것이라 예상할 때 써요. 틀리면 손실이 무한대가 될 수도 있어요.',
    tip: '국내 개인 투자자의 공매도는 제한되어 있어요. 주로 기관·외국인 투자자들이 활용해요.',
    quiz: {
      question: '공매도는 언제 이익이 나나요?',
      options: ['주가가 오를 때', '주가가 내릴 때', '거래량이 많을 때'],
      answer: 1,
      explanation: '공매도는 주식을 빌려서 팔고, 나중에 싸게 사서 갚아 차익을 남기는 전략이에요. 주가가 내려야 이익이 돼요.',
    },
  },
  {
    id: 'preferred_stock',
    term: '우선주',
    emoji: '👑',
    category: 'advanced',
    rarity: 'rare',
    summary: '배당을 먼저 받는 VIP 주식',
    description: '보통주보다 배당을 먼저, 더 많이 받을 권리가 있는 주식이에요. 단, 의결권(회사 경영에 참여할 권리)이 없어요. 배당 수익이 목적인 투자자들이 선호해요.',
    tip: '삼성전자 우선주(005935)처럼 종목 코드 끝 숫자가 다른 경우가 많아요.',
    quiz: {
      question: '우선주의 특징은?',
      options: ['의결권이 있고 배당을 더 많이 받는다', '의결권은 없지만 배당을 보통주보다 먼저/많이 받는다', '주가가 보통주보다 항상 높다'],
      answer: 1,
      explanation: '우선주는 배당에서 우선권을 갖는 대신 경영 참여 의결권이 없어요.',
    },
  },
  {
    id: 'bond',
    term: '채권',
    emoji: '📜',
    category: 'advanced',
    rarity: 'rare',
    summary: '국가·회사에 빌려주는 돈 증서',
    description: '정부나 회사에 돈을 빌려주고 받는 차용증이에요. 만기가 되면 원금과 이자를 돌려받아요. 주식보다 안전하지만 수익률은 낮아요. 주식 시장이 불안할 때 채권이 주목받아요.',
    tip: '국채(정부가 발행) > 회사채(기업이 발행) 순으로 안전해요.',
    quiz: {
      question: '채권을 산다는 것은?',
      options: ['회사의 일부 주인이 된다', '국가나 회사에 돈을 빌려주고 이자와 원금을 받을 권리를 갖는다', '회사 경영에 참여할 수 있다'],
      answer: 1,
      explanation: '채권은 발행자(국가·회사)에게 돈을 빌려주는 것이에요. 만기에 원금과 약속된 이자를 받아요.',
    },
  },
  {
    id: 'leverage',
    term: '레버리지',
    emoji: '⚡',
    category: 'advanced',
    rarity: 'epic',
    summary: '차입으로 수익을 배로 키우는 전략',
    description: '내 돈 100만원에 빌린 돈 100만원을 더해 200만원으로 투자하는 것처럼, 작은 돈으로 더 큰 수익을 노리는 전략이에요. 단, 수익과 손실 모두 배로 커지니 매우 위험해요.',
    tip: '레버리지 2X ETF = 주가가 1% 오르면 2% 수익, 1% 내리면 2% 손실이에요.',
    quiz: {
      question: '레버리지 투자의 가장 큰 위험은?',
      options: ['수수료가 너무 많이 나온다', '수익뿐 아니라 손실도 배로 커진다', '세금이 더 많이 나온다'],
      answer: 1,
      explanation: '레버리지는 수익을 극대화하지만 손실도 배로 커져요. 잘못되면 원금 이상을 잃을 수 있어요.',
    },
  },
  {
    id: 'pbr',
    term: 'PBR',
    emoji: '📚',
    category: 'advanced',
    rarity: 'rare',
    summary: '주가가 순자산의 몇 배인지',
    description: 'PBR = Price-to-Book Ratio. 지금 주가가 회사의 순자산(자산 - 부채) 대비 몇 배인지 보는 지표예요. PBR 1 미만이면 장부 가치보다 싸게 팔리고 있다는 신호예요.',
    quiz: {
      question: 'PBR 1 미만이라는 것은?',
      options: ['회사가 매우 고평가되어 있다', '주가가 회사의 장부 가치(순자산)보다 낮다', '회사가 적자다'],
      answer: 1,
      explanation: 'PBR 1 미만 = 주가가 순자산보다 낮아 저평가 신호일 수 있어요. 하지만 이유를 반드시 확인해야 해요.',
    },
  },
  {
    id: 'futures',
    term: '선물',
    emoji: '📦',
    category: 'advanced',
    rarity: 'epic',
    summary: '미래 가격을 지금 계약하는 것',
    description: '3개월 뒤에 삼성전자를 7만원에 사겠다고 지금 계약하는 거예요. 실제 가격이 오르면 이익, 내리면 손실이에요. 리스크 헤지(위험 관리)나 투기 목적으로 사용돼요.',
    tip: '선물(先物)은 미래(先)의 물건(物). 현물(지금 거래)과 반대 개념이에요.',
    quiz: {
      question: '선물 거래란 무엇인가요?',
      options: ['지금 당장 주식을 사는 것', '미래의 특정 날짜에 정해진 가격으로 사고팔기로 지금 계약하는 것', '주식을 빌려주고 이자를 받는 것'],
      answer: 1,
      explanation: '선물 = 미래 가격을 현재에 확정짓는 계약이에요. 가격 변동 위험을 관리하거나 투기 목적으로 활용돼요.',
    },
  },

  // ── 세금 ────────────────────────────────────────────────────────────────
  {
    id: 'capital_gains_tax',
    term: '양도소득세',
    emoji: '📋',
    category: 'tax',
    rarity: 'rare',
    summary: '주식을 팔아 이익이 생기면 내는 세금',
    description: '주식을 팔아서 수익이 생길 때 내는 세금이에요. 국내 주식은 대주주가 아니라면 현재 양도소득세를 내지 않아요. 하지만 해외 주식 수익에는 22%(지방세 포함)가 부과돼요.',
    tip: '해외 주식은 연간 250만원까지는 세금이 없어요(기본공제).',
    quiz: {
      question: '해외 주식을 팔아 수익이 생기면 무슨 세금을 내야 하나요?',
      options: ['부가가치세', '양도소득세', '종합소득세'],
      answer: 1,
      explanation: '해외 주식 매도 수익에는 양도소득세가 부과돼요. 연간 250만원 공제 후 22%(지방세 포함) 세율이 적용돼요.',
    },
  },
  {
    id: 'dividend_tax',
    term: '배당소득세',
    emoji: '💵',
    category: 'tax',
    rarity: 'common',
    summary: '배당금에 붙는 세금',
    description: '배당금을 받을 때 자동으로 떼는 세금이에요. 국내 주식 배당금에는 15.4%(지방소득세 포함)가 원천징수로 자동 차감돼요. 받기 전에 이미 세금이 빠진 금액이 입금돼요.',
    quiz: {
      question: '국내 주식 배당금을 받을 때 자동으로 떼는 세율은?',
      options: ['5%', '15.4%', '22%'],
      answer: 1,
      explanation: '국내 주식 배당금에는 15.4%(소득세 14% + 지방소득세 1.4%)가 원천징수돼요.',
    },
  },
  {
    id: 'withholding_tax',
    term: '원천징수',
    emoji: '✂️',
    category: 'tax',
    rarity: 'rare',
    summary: '세금을 미리 떼고 주는 방식',
    description: '세금을 직접 내는 게 아니라, 돈을 주는 쪽(증권사, 회사 등)이 미리 세금을 떼고 남은 금액만 주는 방식이에요. 배당금이나 이자 소득에 많이 적용돼요.',
    quiz: {
      question: '원천징수 방식이란?',
      options: ['나중에 한 번에 세금을 내는 방식', '돈을 주는 쪽이 미리 세금을 떼고 나머지를 지급하는 방식', '세금을 안 내는 방식'],
      answer: 1,
      explanation: '원천징수 = 세금 미리 떼기. 소득을 지급하기 전에 세금을 공제하고 지급하는 방식이에요.',
    },
  },
  {
    id: 'overseas_tax',
    term: '해외주식 15.4%',
    emoji: '🌏',
    category: 'tax',
    rarity: 'epic',
    summary: '미국 주식 배당금에 붙는 원천징수',
    description: 'S&P500 같은 미국 주식 ETF에서 배당금을 받으면 15.4%가 원천징수돼요. 배당금 10만원이 생겼다면 실제 받는 금액은 84,600원이에요. 투자 전에 꼭 알아두세요!',
    tip: '한미 조세조약에 따라 미국에서 15%를 먼저 원천징수하고, 나머지는 국내에서 처리해요.',
    quiz: {
      question: '미국 주식 배당금 10만원, 15.4% 세금 제외 후 실제 받는 금액은?',
      options: ['85,000원', '84,600원', '90,000원'],
      answer: 1,
      explanation: '10만원 × (1 - 0.154) = 84,600원이에요. 미국 주식 배당에는 15.4% 원천징수가 적용돼요.',
    },
  },
  {
    id: 'financial_invest_tax',
    term: '금투세',
    emoji: '⚖️',
    category: 'tax',
    rarity: 'epic',
    summary: '금융투자소득세 — 2025년 폐지 결정',
    description: '주식·펀드 등 금융투자에서 연간 5,000만원 이상 수익이 생기면 최대 25% 세금을 내는 제도예요. 2025년 1월 시행 예정이었으나 국내 증시 영향 우려로 폐지가 결정됐어요.',
    tip: '금투세 논란은 "큰 수익을 낸 투자자에게 세금을 부과하는 게 맞나"는 주제를 건드려요.',
    quiz: {
      question: '금투세(금융투자소득세)의 원래 목적은?',
      options: ['외국인 투자자에게 세금을 부과하기 위해', '금융투자에서 일정 이상 수익이 발생하면 과세하기 위해', '증권사 수수료를 낮추기 위해'],
      answer: 1,
      explanation: '금투세는 연간 5,000만원 이상 금융투자 수익에 세금을 부과하는 제도였어요. 2025년 폐지가 결정됐어요.',
    },
  },
]

export const TOTAL_CARDS = LEARN_CARDS.length

export function getTodayCard(): LearnCard {
  const dayIndex = Math.floor(Date.now() / 86_400_000)
  return LEARN_CARDS[dayIndex % LEARN_CARDS.length]
}

export function getCardsByCategory(category: CardCategory): LearnCard[] {
  return LEARN_CARDS.filter(c => c.category === category)
}
