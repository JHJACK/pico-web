import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage() {
  const fontRegular = readFileSync(join(process.cwd(), "public/fonts/MonaS12.ttf"));
  const fontBold    = readFileSync(join(process.cwd(), "public/fonts/MonaS12-Bold.ttf"));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0d0d0d",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "0 120px",
        }}
      >
        {/* "금융은 어렵다" — strikethrough */}
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontSize: 86,
              color: "#a09688",
              fontFamily: "Mona12",
              fontWeight: 400,
              letterSpacing: "-1px",
            }}
          >
            금융은 어렵다
          </span>
          {/* 취소선 수동 구현 (Satori 호환) */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: 0,
              width: "100%",
              height: 5,
              background: "#a09688",
              borderRadius: 2,
            }}
          />
        </div>

        {/* "아니다. 재밌다" — yellow bold */}
        <div
          style={{
            fontSize: 112,
            color: "#FACA3E",
            fontFamily: "Mona12",
            fontWeight: 700,
            letterSpacing: "-1px",
            marginTop: 8,
            display: "flex",
          }}
        >
          아니다. 재밌다
        </div>

        {/* 이모지 열 */}
        <div
          style={{
            fontSize: 58,
            marginTop: 48,
            letterSpacing: "6px",
            display: "flex",
          }}
        >
          📊 😊 💡 😄 🤖 😍 ⚡ 😜
        </div>

        {/* PICO 로고 우하단 */}
        <div
          style={{
            position: "absolute",
            bottom: 64,
            right: 120,
            fontSize: 30,
            color: "#FACA3E",
            fontFamily: "Mona12",
            fontWeight: 700,
            letterSpacing: "8px",
            display: "flex",
          }}
        >
          PICO
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Mona12", data: fontRegular, weight: 400 },
        { name: "Mona12", data: fontBold,    weight: 700 },
      ],
    }
  );
}
