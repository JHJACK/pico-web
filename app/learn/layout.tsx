import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "투자 용어 도감",
  description:
    "입문부터 세금까지, 투자 필수 개념 카드를 하나씩 수집하며 배워요. 주린이도 쉽게 이해하는 주식·해외 투자 기초 용어 모음.",
  keywords: ["주식 용어", "투자 공부", "주린이", "주식 기초", "해외 주식 용어", "투자 도감"],
  openGraph: {
    title: "투자 용어 도감 — PICO",
    description:
      "입문부터 세금까지, 투자 필수 개념 카드를 하나씩 수집하며 배워요.",
    url: "https://pico-web-one.vercel.app/learn",
  },
};

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
