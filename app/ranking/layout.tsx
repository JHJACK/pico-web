import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "수익률 랭킹",
  description:
    "실제 투자 수익률로 겨루는 PICO 랭킹. 브론즈부터 다이아까지 — 나의 투자 실력은 어느 티어일까요?",
  keywords: ["수익률 랭킹", "투자 순위", "주식 랭킹", "모의투자 랭킹", "투자 티어"],
  openGraph: {
    title: "수익률 랭킹 — PICO",
    description:
      "실제 투자 수익률로 겨루는 브론즈 → 다이아 티어 랭킹. 나의 투자 실력은?",
    url: "https://pico-web-one.vercel.app/ranking",
  },
};

export default function RankingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
