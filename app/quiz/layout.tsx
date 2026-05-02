import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "나의 투자 DNA는?",
  description:
    "행동 경제학 기반 18개 질문으로 알아보는 나만의 투자 성향. 호랑이·여우·거북이… 8가지 동물 투자자 유형 중 나는 어디에 속할까요?",
  keywords: ["투자 성향 테스트", "투자 DNA", "주식 성향", "투자 퀴즈", "모의투자"],
  openGraph: {
    title: "나의 투자 DNA는? — PICO",
    description:
      "행동 경제학 기반 18개 질문으로 알아보는 나만의 투자 성향. 호랑이·여우·거북이… 8가지 동물 투자자 유형",
    url: "https://pico-web-one.vercel.app/quiz",
  },
};

export default function QuizLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
