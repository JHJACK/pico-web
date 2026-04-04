"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/app/lib/authContext";
import { saveQuizResult } from "@/app/lib/supabase";

// ── 8가지 동물 유형 ──
const TYPES = {
  tiger: {
    emoji: "🐯",
    name: "호랑이",
    tagline: "공격적 성장 투자자",
    desc: "변동성을 두려워하지 않아. 고위험 고수익 종목에 집중하고, 손실도 과감하게 감수해. 빠른 결단력이 강점.",
    stocks: ["테슬라", "엔비디아", "리비안", "성장주"],
  },
  eagle: {
    emoji: "🦅",
    name: "독수리",
    tagline: "타이밍 포착형 투자자",
    desc: "멀리서 지켜보다 결정적 순간에 빠르게 진입·이탈. 정보 수집과 타이밍이 생명. 기다림의 미학을 알아.",
    stocks: ["섹터 ETF", "모멘텀 성장주", "테마주"],
  },
  wolf: {
    emoji: "🐺",
    name: "늑대",
    tagline: "집중 역발상 투자자",
    desc: "남들이 공포에 떨 때 과감하게 담아. 하락장을 기회로 보는 역발상 마인드. 확신이 생기면 집중 투자.",
    stocks: ["저PER주", "가치주", "낙폭과대주"],
  },
  fox: {
    emoji: "🦊",
    name: "여우",
    tagline: "정보 수집형 투자자",
    desc: "뉴스·커뮤니티·유튜브를 누구보다 빠르게 읽어. 트렌드를 빠르게 포착하고 소셜 신호에 민감하게 반응해.",
    stocks: ["테마주", "AI", "바이오", "핫이슈 종목"],
  },
  elephant: {
    emoji: "🐘",
    name: "코끼리",
    tagline: "장기 우직 투자자",
    desc: "느리지만 흔들리지 않아. 한번 들어가면 오래 가져가. 단기 변동에 휘둘리지 않고 펀더멘탈만 봐.",
    stocks: ["삼성전자", "대형 우량주", "배당주"],
  },
  hedgehog: {
    emoji: "🦔",
    name: "고슴도치",
    tagline: "분산 방어형 투자자",
    desc: "절대 한 곳에 몰지 않아. 리스크 관리가 최우선. 조금씩 여러 곳에 나눠 담아 시장 변동을 부드럽게 흡수.",
    stocks: ["S&P500 ETF", "채권 혼합", "리츠", "금 ETF"],
  },
  turtle: {
    emoji: "🐢",
    name: "거북이",
    tagline: "안정 배당 투자자",
    desc: "느리지만 확실하게. 배당금이 나오는 걸 좋아하고, 원금 손실이 가장 두려워. 복리의 힘을 믿어.",
    stocks: ["KT&G", "배당 ETF", "리츠", "국채"],
  },
  butterfly: {
    emoji: "🦋",
    name: "나비",
    tagline: "미래 가치 투자자",
    desc: "단순한 수익보다 의미 있는 곳에 투자해. 환경·AI·미래 산업 등 장기적으로 세상을 바꿀 테마를 좋아해.",
    stocks: ["친환경 ETF", "태양광", "전기차", "AI 인프라"],
  },
} as const;

type TypeKey = keyof typeof TYPES;

// ── 12문항 ──
// 점수 배열: [안정형, 공격형, 단기형, 장기형, 분석형, 소셜형, 집중형, 분산형]
// 인덱스:     0        1        2        3        4        5        6        7
const QUESTIONS = [
  {
    part: "01 / 12 — 리스크 성향",
    text: "지금 갖고 있는 투자금의 30%가 한 달 만에 사라질 수도 있어. 그래도 기대 수익이 200%라면?",
    a: { text: "못 한다. 30% 날리는 순간을 상상하면 잠이 안 와", sub: "손실이 수익보다 두 배 크게 느껴져", scores: [2, 0, 0, 0, 0, 0, 0, 0] },
    b: { text: "한다. 200%면 충분히 감수할 만한 리스크야", sub: "기회비용이 더 두렵다", scores: [0, 2, 0, 0, 0, 0, 0, 0] },
  },
  {
    part: "02 / 12 — 손실 대응",
    text: "3개월 전에 산 주식이 -25%야. 기업 펀더멘탈은 변한 게 없어. 넌 어떻게 해?",
    a: { text: "손절하고 다른 기회를 찾는다", sub: "시간이 곧 돈이야. 기회비용을 생각해야지", scores: [0, 0, 2, 0, 0, 0, 2, 0] },
    b: { text: "오히려 더 담는다. 같은 값에 더 많이 사는 거잖아", sub: "펀더멘탈이 괜찮으면 가격은 결국 돌아와", scores: [0, 1, 0, 2, 1, 0, 1, 0] },
  },
  {
    part: "03 / 12 — 투자 스타일",
    text: "주변 친구가 '이 종목 진짜 오를 것 같아, 나는 이미 샀어'라고 하면?",
    a: { text: "일단 내가 직접 찾아보고 판단한다", sub: "남의 말만 믿고 투자하는 건 도박이지", scores: [0, 0, 0, 0, 2, 0, 0, 0] },
    b: { text: "조금은 믿고 소액이라도 따라간다", sub: "이미 들어간 사람이 있다는 건 뭔가 있는 거야", scores: [0, 0, 0, 0, 0, 2, 0, 0] },
  },
  {
    part: "04 / 12 — 가치관",
    text: "두 가지 시나리오 중 하나를 골라야 해. 어느 쪽을 선택해?",
    a: { text: "확실하게 +20% 수익", sub: "안전하게 확보하는 게 낫지", scores: [2, 0, 0, 0, 0, 0, 0, 1] },
    b: { text: "50% 확률로 +60%, 50% 확률로 -10%", sub: "기댓값이 더 높잖아", scores: [0, 2, 0, 0, 0, 0, 1, 0] },
  },
  {
    part: "05 / 12 — 마인드셋",
    text: "주식 시장이 급락해서 전 세계 뉴스가 난리야. 솔직히 지금 기분이 어때?",
    a: { text: "불안하고 걱정돼. 지금 팔아야 하나 고민 중", sub: "나쁜 뉴스가 계속 나오면 더 내려갈 것 같아", scores: [2, 0, 0, 0, 0, 0, 0, 0] },
    b: { text: "드디어 살 타이밍이 왔다 싶어", sub: "공포에 사고 환희에 파는 게 맞지", scores: [0, 1, 0, 1, 0, 0, 1, 0] },
  },
  {
    part: "06 / 12 — 집중 vs 분산",
    text: "100만원을 투자할 때 어떻게 해?",
    a: { text: "확신 종목 1~2개에 집중한다", sub: "분산하면 수익도 분산돼", scores: [0, 1, 0, 0, 0, 0, 2, 0] },
    b: { text: "10개 이상 종목에 나눠 담는다", sub: "한 개 망해도 버틸 수 있어야지", scores: [1, 0, 0, 0, 0, 0, 0, 2] },
  },
  {
    part: "07 / 12 — 투자 기간",
    text: "나에게 가장 맞는 투자 기간은?",
    a: { text: "1년 안에 수익 실현하고 싶다", sub: "단기에 기회를 잡아야 해", scores: [0, 1, 2, 0, 0, 0, 0, 0] },
    b: { text: "5년 이상 묻어두면 된다", sub: "시간이 내 편이야", scores: [1, 0, 0, 2, 1, 0, 0, 0] },
  },
  {
    part: "08 / 12 — 분석 방법",
    text: "종목을 고를 때 주로 어떤 방법을 쓰고 싶어?",
    a: { text: "차트·기술적 분석으로 타이밍을 잡는다", sub: "패턴과 추세를 읽어야 해", scores: [0, 1, 1, 0, 1, 0, 0, 0] },
    b: { text: "재무제표·뉴스로 기업 가치를 본다", sub: "본질이 중요하지", scores: [1, 0, 0, 1, 2, 0, 0, 0] },
  },
  {
    part: "09 / 12 — 종목 선택",
    text: "어떤 종목에 더 끌려?",
    a: { text: "이미 오르고 있는 주도주", sub: "오르는 곳에 돈이 몰리는 법", scores: [0, 1, 1, 0, 0, 1, 0, 0] },
    b: { text: "아직 안 오른 저평가주", sub: "언젠간 가격이 오를 거야", scores: [0, 0, 0, 2, 1, 0, 1, 0] },
  },
  {
    part: "10 / 12 — 수익 실현",
    text: "목표가에 도달했어. 어떻게 해?",
    a: { text: "계획대로 즉시 매도한다", sub: "욕심 부리다 다 날려", scores: [1, 0, 1, 0, 1, 0, 0, 0] },
    b: { text: "더 오를 것 같으면 홀드한다", sub: "수익을 극대화해야지", scores: [0, 1, 0, 1, 0, 0, 1, 0] },
  },
  {
    part: "11 / 12 — 외부 요인",
    text: "환율, 금리, 뉴스를 얼마나 자주 확인해?",
    a: { text: "거의 매일 체크한다", sub: "시장 변화에 빠르게 대응해야지", scores: [0, 0, 0, 0, 1, 2, 0, 0] },
    b: { text: "분기에 한 번 정도 리뷰한다", sub: "단기 소음에 흔들리면 안 돼", scores: [0, 0, 0, 2, 1, 0, 0, 1] },
  },
  {
    part: "12 / 12 — 투자 목적",
    text: "나에게 투자란?",
    a: { text: "노후 대비, 안정적인 자산 축적", sub: "천천히 확실하게", scores: [2, 0, 0, 2, 0, 0, 0, 1] },
    b: { text: "최대한 빠른 자산 증식", sub: "지금이 기회야", scores: [0, 2, 1, 0, 0, 0, 0, 0] },
  },
];

// 점수 배열 → 유형 결정 함수
// 0:안정, 1:공격, 2:단기, 3:장기, 4:분석, 5:소셜, 6:집중, 7:분산
function calcType(scores: number[]): TypeKey {
  const [안정, 공격, 단기, 장기, 분석, 소셜, 집중, 분산] = scores;
  if (공격 >= 5 && 집중 >= 3) return "wolf";
  if (공격 >= 5 && 단기 >= 3) return "tiger";
  if (공격 >= 4 && 소셜 >= 3) return "fox";
  if (분석 >= 4 && 단기 >= 2) return "eagle";
  if (장기 >= 4 && 분산 >= 3) return "hedgehog";
  if (장기 >= 4 && 안정 >= 3) return "turtle";
  if (장기 >= 3 && 분석 >= 3) return "elephant";
  if (공격 >= 3) return "tiger";
  if (안정 >= 4) return "turtle";
  if (분산 >= 3) return "hedgehog";
  return "butterfly";
}

export default function QuizPage() {
  const { user, refreshUserRow } = useAuth();
  const [step, setStep] = useState<number>(0);
  const [scores, setScores] = useState<number[]>([0, 0, 0, 0, 0, 0, 0, 0]);
  const [animating, setAnimating] = useState(false);
  const [result, setResult] = useState<TypeKey | null>(null);
  const [quizBonus, setQuizBonus] = useState(0);

  const progress = step === 0 ? 0 : step <= 12 ? (step / 12) * 100 : 100;
  const currentQ = step >= 1 && step <= 12 ? QUESTIONS[step - 1] : null;

  function handleAnswer(option: "a" | "b") {
    if (animating || !currentQ) return;
    const chosen = option === "a" ? currentQ.a : currentQ.b;
    const newScores = scores.map((s, i) => s + chosen.scores[i]);

    setAnimating(true);
    setTimeout(() => {
      setScores(newScores);
      if (step === 12) {
        const typeKey = calcType(newScores);
        setResult(typeKey);
        setStep(13);
        localStorage.setItem("pico_quiz_done", JSON.stringify({ done: true, type: typeKey }));
        // Supabase 저장 (로그인 상태일 때만)
        if (user) {
          saveQuizResult(user.id, typeKey).then(({ pointsAdded }) => {
            if (pointsAdded > 0) {
              setQuizBonus(pointsAdded);
              refreshUserRow();
            }
          });
        }
      } else {
        setStep(step + 1);
      }
      setAnimating(false);
    }, 220);
  }

  function reset() {
    setStep(0);
    setScores([0, 0, 0, 0, 0, 0, 0, 0]);
    setResult(null);
    setAnimating(false);
  }

  const typeData = result ? TYPES[result] : null;

  return (
    <main className="min-h-screen" style={{ background: "#0d0d0d" }}>
      {/* 네비게이션 */}
      <nav
        className="sticky top-0 z-50 flex items-center px-5 border-b"
        style={{
          height: 50,
          background: "rgba(13,13,13,0.95)",
          backdropFilter: "blur(16px)",
          borderColor: "rgba(255,255,255,0.06)",
        }}
      >
        <Link
          href="/"
          className="mr-4"
          style={{ color: "#5c5448", fontSize: 13, fontFamily: "var(--font-mono)" }}
        >
          ← 홈
        </Link>
        <span
          style={{ fontFamily: "var(--font-serif)", fontSize: 16, color: "#FACA3E" }}
        >
          PICO
        </span>
      </nav>

      <div className="max-w-lg mx-auto px-5 pt-8 pb-16">
        {/* ── 시작 전 화면 ── */}
        {step === 0 && (
          <div className="fade-up text-center pt-8">
            <div className="text-5xl mb-5">🧬</div>
            <div
              className="text-xs font-semibold tracking-widest uppercase mb-3"
              style={{ fontFamily: "var(--font-mono)", color: "#FACA3E" }}
            >
              PICO — 투자 DNA 찾기
            </div>
            <h1
              className="mb-3"
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: "clamp(24px, 6vw, 32px)",
                color: "#e8e0d0",
                lineHeight: 1.15,
              }}
            >
              나는 어떤 투자자일까?
            </h1>
            <p
              className="mb-8"
              style={{ fontSize: 13, color: "#a09688", lineHeight: 1.8, maxWidth: 320, margin: "0 auto 2rem" }}
            >
              A 또는 B를 선택해. 12문항, 약 2분이면 돼.
              <br />
              8가지 동물 유형 중 나를 찾아줄게.
            </p>
            <button
              onClick={() => setStep(1)}
              className="rounded-xl px-8 py-3 font-semibold text-sm transition-opacity hover:opacity-85"
              style={{
                background: "#FACA3E",
                color: "#0d0d0d",
                fontFamily: "var(--font-noto), sans-serif",
              }}
            >
              시작하기 →
            </button>
          </div>
        )}

        {/* ── 문항 화면 ── */}
        {step >= 1 && step <= 12 && currentQ && (
          <div>
            {/* 헤더 */}
            <div className="text-center mb-6">
              <div
                className="text-xs font-semibold tracking-widest uppercase mb-3"
                style={{ fontFamily: "var(--font-mono)", color: "#FACA3E" }}
              >
                PICO — 투자 DNA 찾기
              </div>
              {/* 진행 바 */}
              <div
                className="rounded-full overflow-hidden mb-1"
                style={{ height: 2, background: "#242424" }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${progress}%`,
                    background: "#FACA3E",
                    transition: "width 0.4s cubic-bezier(.4,0,.2,1)",
                  }}
                />
              </div>
              <div
                style={{ fontSize: 10, color: "#5c5448", fontFamily: "var(--font-mono)" }}
              >
                {step} / 12
              </div>
            </div>

            {/* 문항 */}
            <div className={animating ? "slide-out" : "slide-in"}>
              <div
                className="text-xs font-semibold tracking-widest uppercase mb-3"
                style={{ fontFamily: "var(--font-mono)", color: "#5c5448" }}
              >
                {currentQ.part}
              </div>
              <p
                className="mb-5 font-medium"
                style={{
                  fontSize: "clamp(15px, 3.5vw, 18px)",
                  color: "#e8e0d0",
                  lineHeight: 1.45,
                }}
              >
                {currentQ.text}
              </p>

              {/* 선택지 */}
              <div className="flex flex-col gap-3">
                {(["a", "b"] as const).map((opt) => {
                  const item = currentQ[opt];
                  return (
                    <button
                      key={opt}
                      onClick={() => handleAnswer(opt)}
                      className="flex items-start gap-3 rounded-2xl p-4 border text-left transition-all duration-150 active:scale-[0.98]"
                      style={{
                        background: "#1c1c1c",
                        borderColor: "rgba(255,255,255,0.06)",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.borderColor =
                          "rgba(250,202,62,0.4)";
                        (e.currentTarget as HTMLButtonElement).style.background =
                          "rgba(250,202,62,0.04)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.borderColor =
                          "rgba(255,255,255,0.06)";
                        (e.currentTarget as HTMLButtonElement).style.background = "#1c1c1c";
                      }}
                    >
                      <div
                        className="flex-shrink-0 flex items-center justify-center rounded-md text-xs font-bold mt-0.5"
                        style={{
                          width: 26,
                          height: 26,
                          background: "#242424",
                          border: "0.5px solid rgba(255,255,255,0.12)",
                          color: "#a09688",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        {opt.toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, color: "#e8e0d0", fontWeight: 500, lineHeight: 1.4 }}>
                          {item.text}
                        </div>
                        <div style={{ fontSize: 11, color: "#5c5448", marginTop: 3 }}>
                          {item.sub}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── 결과 화면 ── */}
        {step === 13 && typeData && (
          <div className="fade-up text-center pt-6">
            {quizBonus > 0 && (
              <div className="inline-block mb-4 rounded-xl px-4 py-2" style={{ background: "rgba(250,202,62,0.1)", border: "0.5px solid rgba(250,202,62,0.3)" }}>
                <span style={{ fontSize: 13, color: "#FACA3E", fontWeight: 500 }}>🎉 첫 퀴즈 완료! +{quizBonus}P 지급</span>
              </div>
            )}
            {/* 결과 아이콘 */}
            <div
              className="flex items-center justify-center mx-auto mb-4 rounded-full text-4xl"
              style={{
                width: 80,
                height: 80,
                background: "rgba(250,202,62,0.12)",
                border: "0.5px solid rgba(250,202,62,0.25)",
              }}
            >
              {typeData.emoji}
            </div>

            <div
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 28,
                color: "#FACA3E",
                marginBottom: 4,
              }}
            >
              {typeData.name}
            </div>
            <div
              className="text-xs font-semibold tracking-widest uppercase mb-4"
              style={{ fontFamily: "var(--font-mono)", color: "#5c5448" }}
            >
              {typeData.tagline}
            </div>
            <p
              className="mb-5"
              style={{
                fontSize: 14,
                color: "#a09688",
                lineHeight: 1.8,
                maxWidth: 300,
                margin: "0 auto 1.25rem",
              }}
            >
              {typeData.desc}
            </p>

            {/* 잘 맞는 종목 */}
            <div className="flex flex-wrap gap-2 justify-center mb-6">
              {typeData.stocks.map((s) => (
                <span
                  key={s}
                  className="text-xs font-semibold px-3 py-1 rounded"
                  style={{
                    fontFamily: "var(--font-mono)",
                    background: "rgba(250,202,62,0.1)",
                    color: "#FACA3E",
                    border: "0.5px solid rgba(250,202,62,0.22)",
                  }}
                >
                  {s}
                </span>
              ))}
            </div>

            {/* 공유 + 다시하기 버튼 */}
            <div className="flex gap-3 justify-center flex-wrap">
              <button
                onClick={() => {
                  const text = `나의 투자 유형은 ${typeData.emoji} ${typeData.name}!\n${typeData.tagline}\n\nPICO에서 나도 해봐 →`;
                  if (navigator.share) {
                    navigator.share({ text });
                  } else {
                    navigator.clipboard.writeText(text);
                    alert("결과가 클립보드에 복사됐어!");
                  }
                }}
                className="rounded-xl px-6 py-3 font-semibold text-sm transition-opacity hover:opacity-85"
                style={{
                  background: "#FACA3E",
                  color: "#0d0d0d",
                  fontFamily: "var(--font-noto), sans-serif",
                }}
              >
                결과 공유하기 →
              </button>
              <button
                onClick={reset}
                className="rounded-xl px-6 py-3 text-sm border transition-all"
                style={{
                  background: "transparent",
                  color: "#a09688",
                  border: "0.5px solid rgba(255,255,255,0.12)",
                  fontFamily: "var(--font-noto), sans-serif",
                }}
              >
                다시 하기
              </button>
            </div>

            {/* VS 배틀 유도 */}
            <div
              className="mt-8 rounded-2xl p-5 border"
              style={{
                background: "#141414",
                borderColor: "rgba(250,202,62,0.15)",
              }}
            >
              <div style={{ fontSize: 13, color: "#a09688", marginBottom: 12 }}>
                이제 오늘의 VS 배틀도 해볼래?
              </div>
              <Link
                href="/battle"
                className="inline-block rounded-xl px-5 py-2.5 text-sm border transition-all hover:border-[rgba(250,202,62,0.4)]"
                style={{
                  color: "#FACA3E",
                  border: "0.5px solid rgba(250,202,62,0.25)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                ⚔️ VS 배틀 참여하기
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
