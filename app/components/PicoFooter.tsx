"use client";

import Link from "next/link";
import ShareButton from "@/app/components/ShareButton";

export default function PicoFooter() {
  return (
    <footer
      style={{
        marginTop:    40,
        paddingTop:   28,
        paddingBottom: 40,
        borderTop:    "0.5px solid rgba(255,255,255,0.06)",
        fontFamily:   "var(--font-paperlogy), var(--font-noto), sans-serif",
      }}
    >
      {/* 공유 버튼 */}
      <div style={{ marginBottom: 20 }}>
        <ShareButton />
      </div>

      {/* 법적 링크 */}
      <div
        style={{
          display:        "flex",
          alignItems:     "center",
          gap:            20,
          marginBottom:   16,
          flexWrap:       "wrap",
        }}
      >
        <Link
          href="/terms"
          style={{
            fontFamily:  "var(--font-paperlogy)",
            fontSize:    12,
            fontWeight:  700,
            color:       "#c8bfb0",
            textDecoration: "none",
          }}
        >
          이용약관
        </Link>
        <Link
          href="/privacy"
          style={{
            fontFamily:  "var(--font-paperlogy)",
            fontSize:    12,
            fontWeight:  700,
            color:       "#FACA3E",
            textDecoration: "none",
          }}
        >
          개인정보처리방침
        </Link>
      </div>

      {/* 사업자 정보 — 웹에서만 표시 */}
      <div
        className="hidden sm:block"
        style={{ marginBottom: 14 }}
      >
        <p
          style={{
            fontFamily:  "var(--font-paperlogy)",
            fontSize:    11,
            fontWeight:  400,
            color:       "rgba(200,191,176,0.45)",
            lineHeight:  1.9,
            margin:      0,
          }}
        >
          서비스명: PICO&ensp;|&ensp;문의: support@pico.kr
          <br />
          본 서비스는 실제 투자가 아닌 모의투자 학습 서비스예요. 투자 판단의 책임은 이용자 본인에게 있어요.
        </p>
      </div>

      {/* 카피라이트 */}
      <p
        style={{
          fontFamily:  "var(--font-paperlogy)",
          fontSize:    11,
          fontWeight:  400,
          color:       "rgba(200,191,176,0.3)",
          margin:      0,
        }}
      >
        © {new Date().getFullYear()} PICO. All rights reserved.
      </p>
    </footer>
  );
}
