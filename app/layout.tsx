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
    <html lang="ko" className={`${notoSansKR.variable} ${dmSerifDisplay.variable} ${instrumentSans.variable} ${inter.variable} ${paperlogy.variable} ${mona12.variable} ${mona12Emoji.variable}`}>
      <body className="min-h-screen" style={{ fontFamily: "var(--font-sans), var(--font-noto), sans-serif", fontWeight: 300, lineHeight: 1.65 }}>
        <AuthProvider>
          <StockCacheProvider>{children}</StockCacheProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
