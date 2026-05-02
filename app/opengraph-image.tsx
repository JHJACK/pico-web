import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// twemoji CDN — 트위터 공개 픽셀 이모지 (Satori는 컬러 폰트 미지원 → img 태그 방식)
const TWEMOJI = "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72";
const EMOJI_CODES = ["1f4ca", "1f60a", "1f4a1", "1f604", "1f916", "1f60d", "26a1", "1f61c"];

async function emojiBase64(code: string): Promise<string | null> {
  try {
    const res = await fetch(`${TWEMOJI}/${code}.png`);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    return `data:image/png;base64,${Buffer.from(buf).toString("base64")}`;
  } catch {
    return null;
  }
}

export default async function OgImage() {
  const [fontRegular, fontBold, ...emojiUris] = await Promise.all([
    Promise.resolve(readFileSync(join(process.cwd(), "public/fonts/MonaS12.ttf"))),
    Promise.resolve(readFileSync(join(process.cwd(), "public/fonts/MonaS12-Bold.ttf"))),
    ...EMOJI_CODES.map(emojiBase64),
  ]);

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
          position: "relative",
        }}
      >
        {/* PICO 로고 — 상단 우측 크게 */}
        <div
          style={{
            position: "absolute",
            top: 56,
            right: 120,
            fontSize: 42,
            color: "#FACA3E",
            fontFamily: "Mona12",
            fontWeight: 700,
            letterSpacing: "10px",
            display: "flex",
          }}
        >
          PICO
        </div>

        {/* "금융은 어렵다" — 취소선 */}
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
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

        {/* "아니다. 재밌다" — 노란 굵은 텍스트 */}
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

        {/* 이모지 열 — twemoji PNG img */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 18,
            marginTop: 52,
          }}
        >
          {emojiUris.map((uri, i) =>
            uri ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={uri} width={58} height={58} alt="" />
            ) : null
          )}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Mona12", data: fontRegular as Buffer, weight: 400 },
        { name: "Mona12", data: fontBold as Buffer,    weight: 700 },
      ],
    }
  );
}
