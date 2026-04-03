import type { Metadata } from "next";
import { Noto_Sans_KR, DM_Serif_Display, Instrument_Sans, DM_Mono } from "next/font/google";
import "./globals.css";

const notoSansKR = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-noto",
});

const dmSerifDisplay = DM_Serif_Display({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-serif",
});

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-sans",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["300", "400"],
  variable: "--font-dm-mono",
});

export const metadata: Metadata = {
  title: "PICO — 투자, 흐름을 읽어",
  description: "VS 배틀로 매일 예측하고, 투자 DNA 퀴즈로 나를 알아가는 투자 입문 서비스",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${notoSansKR.variable} ${dmSerifDisplay.variable} ${instrumentSans.variable} ${dmMono.variable}`}>
      <body className="min-h-screen" style={{ fontFamily: "var(--font-sans), var(--font-noto), sans-serif", fontWeight: 300, lineHeight: 1.65 }}>
        {children}
      </body>
    </html>
  );
}
