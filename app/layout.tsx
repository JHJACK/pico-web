import type { Metadata, Viewport } from "next";
import { Noto_Sans_KR, DM_Serif_Display, Instrument_Sans, Inter } from "next/font/google";
import localFont from "next/font/local";
import { AuthProvider } from "@/app/lib/authContext";
import { StockCacheProvider } from "@/app/lib/stockCacheContext";
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

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400"],
  variable: "--font-inter",
});

const paperlogy = localFont({
  src: [
    { path: "../public/fonts/Paperlogy-3Light.ttf",    weight: "300" },
    { path: "../public/fonts/Paperlogy-4Regular.ttf",  weight: "400" },
    { path: "../public/fonts/Paperlogy-5Medium.ttf",   weight: "500" },
    { path: "../public/fonts/Paperlogy-6SemiBold.ttf", weight: "600" },
    { path: "../public/fonts/Paperlogy-7Bold.ttf",     weight: "700" },
    { path: "../public/fonts/Paperlogy-8ExtraBold.ttf",weight: "800" },
  ],
  variable: "--font-paperlogy",
  display: "swap",
});

const mona12 = localFont({
  src: [
    { path: "../public/fonts/MonaS12.ttf",      weight: "400" },
    { path: "../public/fonts/MonaS12-Bold.ttf", weight: "700" },
  ],
  variable: "--font-mona12",
  display: "swap",
});

const mona12Emoji = localFont({
  src: [{ path: "../public/fonts/Mona12ColorEmoji.ttf", weight: "400" }],
  variable: "--font-mona12-emoji",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

const BASE_URL = "https://pico-web-one.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "PICO — 금융은 어렵다? 아니다, 재밌다",
    template: "%s — PICO",
  },
  description:
    "피코플레이(모의투자)로 실전 투자 감각을 키우고, 수익률 랭킹에 도전하고, 포인트로 피코 전리품 창고에서 선물을 교환해보세요.",
  keywords: [
    "모의투자", "주식", "주린이", "해외 주식", "한국 주식",
    "투자 입문", "투자 공부", "투자 성향", "투자 DNA", "주식 게임",
    "수익률 랭킹", "투자 퀴즈", "주식 용어", "PICO", "피코",
  ],
  authors: [{ name: "PICO" }],
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: BASE_URL,
    siteName: "PICO",
    title: "PICO — 금융은 어렵다? 아니다, 재밌다",
    description:
      "피코플레이(모의투자)로 실전 투자 감각을 키우고, 수익률 랭킹에 도전하고, 포인트로 피코 전리품 창고에서 선물을 교환해보세요.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "PICO — 금융은 어렵다? 아니다, 재밌다",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PICO — 금융은 어렵다? 아니다, 재밌다",
    description:
      "피코플레이(모의투자)로 실전 투자 감각을 키우고, 수익률 랭킹에 도전하고, 포인트로 피코 전리품 창고에서 선물을 교환해보세요.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${notoSansKR.variable} ${dmSerifDisplay.variable} ${instrumentSans.variable} ${inter.variable} ${paperlogy.variable} ${mona12.variable} ${mona12Emoji.variable}`}>
      <body className="min-h-screen" style={{ fontFamily: "var(--font-sans), var(--font-noto), sans-serif", fontWeight: 300, lineHeight: 1.65 }}>
        <AuthProvider>
          <StockCacheProvider>{children}</StockCacheProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
