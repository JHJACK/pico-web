import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "내 투자 기록",
  description:
    "수익률·티어·보유 카드·AI 주간 리포트 등 나의 PICO 활동을 한눈에 확인하세요.",
  openGraph: {
    title: "내 투자 기록 — PICO",
    description:
      "수익률·티어·보유 카드·AI 주간 리포트 등 나의 PICO 활동을 한눈에.",
    url: "https://pico-web-one.vercel.app/mypage",
  },
  robots: { index: false, follow: false },
};

export default function MypageLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
