import Link from "next/link";
import { BackIcon } from "@/app/components/BackIcon";

const C = {
  bg:     "#0d0d0d",
  card:   "#141414",
  text:   "#e8e0d0",
  text2:  "#c8bfb0",
  gold:   "#FACA3E",
  border: "rgba(255,255,255,0.07)",
} as const;

const EFFECTIVE_DATE = "2025년 1월 1일";

const SECTIONS = [
  {
    title: "제1조 (목적)",
    content: `본 약관은 PICO(이하 "서비스")가 제공하는 모의투자 학습 서비스의 이용 조건 및 절차, 이용자와 서비스 제공자 간의 권리·의무 및 책임 사항을 규정하는 것을 목적으로 합니다.`,
  },
  {
    title: "제2조 (정의)",
    content: `① "서비스"란 PICO가 제공하는 모의투자, 배틀, 퀘스트, 포인트 적립 및 교환 등의 기능 일체를 의미합니다.\n② "이용자"란 본 약관에 동의하고 서비스를 이용하는 자를 의미합니다.\n③ "포인트"란 서비스 내 미션 달성, 퀘스트 완료 등을 통해 적립되는 서비스 내 가상의 단위를 의미하며, 실제 화폐가 아닙니다.`,
  },
  {
    title: "제3조 (약관의 효력 및 변경)",
    content: `① 본 약관은 서비스 화면에 게시하거나 이용자에게 공지함으로써 효력이 발생합니다.\n② 서비스는 필요한 경우 약관을 변경할 수 있으며, 변경된 약관은 공지 후 7일 이후부터 효력이 발생합니다.`,
  },
  {
    title: "제4조 (서비스 이용)",
    content: `① 본 서비스는 실제 투자가 아닌 학습 목적의 모의투자 서비스입니다.\n② 서비스 내 모든 투자 수익·손실은 가상이며, 실제 금전적 손익이 발생하지 않습니다.\n③ 서비스는 투자 조언이나 금융 상품 권유를 제공하지 않습니다.`,
  },
  {
    title: "제5조 (포인트 정책)",
    content: `① 포인트는 서비스 내 지정된 활동(퀘스트 완료, 출석, 배틀 참여 등)을 통해 적립됩니다.\n② 포인트는 현금 또는 현금 등가물로 교환되거나 환불되지 않습니다.\n③ 포인트는 서비스가 지정한 리워드(기프티콘 등)와 교환할 수 있으며, 교환 후 취소는 불가합니다.\n④ 회원 탈퇴 시 보유 포인트는 즉시 소멸되며 복구되지 않습니다.\n⑤ 서비스 운영 정책에 따라 포인트 적립 기준 및 교환 가능 리워드는 변경될 수 있습니다.`,
  },
  {
    title: "제6조 (금지 행위)",
    content: `이용자는 다음 각 호의 행위를 하여서는 안 됩니다.\n① 부정한 방법으로 포인트를 취득하는 행위\n② 서비스의 정상적인 운영을 방해하는 행위\n③ 다른 이용자의 정보를 도용하는 행위\n④ 서비스를 통해 취득한 정보를 무단으로 복제·배포하는 행위`,
  },
  {
    title: "제7조 (서비스 중단 및 변경)",
    content: `① 서비스는 설비 점검, 운영상 이유 등으로 서비스 제공을 일시 중단할 수 있습니다.\n② 서비스는 운영 정책에 따라 서비스 내용을 변경할 수 있으며, 중요한 변경 사항은 사전에 공지합니다.`,
  },
  {
    title: "제8조 (면책 조항)",
    content: `① 서비스는 모의투자 학습 목적으로만 제공되며, 실제 투자 결과에 대한 책임을 지지 않습니다.\n② 서비스 내 제공되는 시세 정보는 학습 목적의 참고 자료로, 실제 시세와 차이가 있을 수 있습니다.\n③ 이용자의 귀책 사유로 인한 서비스 이용 장애에 대해서는 책임을 지지 않습니다.`,
  },
  {
    title: "제9조 (분쟁 해결)",
    content: `서비스 이용과 관련하여 분쟁이 발생한 경우, 서비스와 이용자는 분쟁 해결을 위해 성실히 협의합니다. 협의가 이루어지지 않을 경우 관련 법령에 따라 처리합니다.`,
  },
];

export default function TermsPage() {
  return (
    <main
      style={{
        minHeight:  "100vh",
        background: C.bg,
        color:      C.text,
        fontFamily: "var(--font-paperlogy), var(--font-noto), sans-serif",
      }}
    >
      <nav
        style={{
          position:       "sticky",
          top:            0,
          zIndex:         30,
          height:         56,
          background:     "rgba(13,13,13,0.96)",
          backdropFilter: "blur(20px)",
          borderBottom:   `0.5px solid ${C.border}`,
          display:        "flex",
          alignItems:     "center",
          padding:        "0 20px",
        }}
      >
        <Link href="/mypage" style={{ textDecoration: "none" }}>
          <BackIcon />
        </Link>
      </nav>

      <div
        style={{
          maxWidth: 700,
          margin:   "0 auto",
          padding:  "28px clamp(16px,4vw,24px) 60px",
        }}
      >
        <div style={{ marginBottom: 28 }}>
          <p
            style={{
              fontFamily:    "var(--font-mona12)",
              fontSize:      12,
              fontWeight:    700,
              color:         C.gold,
              marginBottom:  8,
              letterSpacing: "0.06em",
            }}
          >
            TERMS OF SERVICE
          </p>
          <h1
            style={{
              fontFamily:    "var(--font-paperlogy)",
              fontSize:      24,
              fontWeight:    700,
              color:         C.text,
              margin:        "0 0 8px",
              letterSpacing: "-0.02em",
            }}
          >
            이용약관
          </h1>
          <p style={{ fontSize: 13, fontWeight: 300, color: C.text2, margin: 0 }}>
            시행일: {EFFECTIVE_DATE}
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {SECTIONS.map((section, i) => (
            <div
              key={i}
              style={{
                background:    C.card,
                borderRadius:  16,
                padding:       "18px 20px",
                border:        `0.5px solid ${C.border}`,
                marginBottom:  8,
              }}
            >
              <p
                style={{
                  fontFamily:    "var(--font-mona12)",
                  fontSize:      13,
                  fontWeight:    700,
                  color:         C.text,
                  marginBottom:  10,
                }}
              >
                {section.title}
              </p>
              {section.content.split("\n").map((line, j) => (
                <p
                  key={j}
                  style={{
                    fontSize:     13,
                    fontWeight:   300,
                    color:        C.text2,
                    lineHeight:   1.75,
                    margin:       j < section.content.split("\n").length - 1 ? "0 0 4px" : 0,
                  }}
                >
                  {line}
                </p>
              ))}
            </div>
          ))}
        </div>

        <p
          style={{
            marginTop:    24,
            fontSize:     12,
            fontWeight:   300,
            color:        "rgba(200,191,176,0.4)",
            textAlign:    "center",
            lineHeight:   1.8,
          }}
        >
          문의사항은 support@pico.kr 로 연락해 주세요.
        </p>
      </div>
    </main>
  );
}
