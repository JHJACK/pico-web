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
    title: "1. 개인정보의 처리 목적",
    content: `PICO는 다음의 목적을 위해 개인정보를 처리합니다.\n\n· 회원 가입 및 관리: 소셜 로그인(카카오, 구글) 연동, 본인 확인, 서비스 이용 관리\n· 서비스 제공: 모의투자, 퀘스트, 포인트 적립, 리워드 교환\n· 포인트 리워드 발송: 포인트 교환 시 쿠폰(기프티콘)을 이메일로 발송\n· 서비스 개선: 이용 현황 분석 및 서비스 개선`,
  },
  {
    title: "2. 처리하는 개인정보 항목",
    content: `[필수 항목]\n· 이메일 주소 (소셜 로그인 시 자동 수집)\n· 닉네임\n· 프로필 이미지 (선택 업로드 시)\n· 서비스 이용 기록 (투자 이력, 퀘스트 달성 이력, 포인트 내역)\n\n[선택 항목]\n· 마케팅 정보 수신 동의 여부`,
  },
  {
    title: "3. 개인정보의 처리 및 보유 기간",
    content: `① 회원 정보: 회원 탈퇴 시까지\n② 포인트·리워드 교환 기록: 교환일로부터 5년 (전자상거래법 기준)\n③ 탈퇴 후 즉시 삭제 (단, 관련 법령에 따라 일정 기간 보관이 필요한 경우 해당 기간)`,
  },
  {
    title: "4. 개인정보의 제3자 제공",
    content: `PICO는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다. 단, 포인트 리워드 교환 시 쿠폰 발급 처리를 위해 아래와 같이 제공될 수 있습니다.\n\n· 제공받는 자: 쿠폰 발급 파트너사\n· 제공 항목: 이메일 주소\n· 제공 목적: 쿠폰(기프티콘) 발송\n· 보유 기간: 발송 완료 후 즉시 삭제\n\n이용자는 제3자 제공에 동의하지 않을 수 있으며, 이 경우 리워드 교환 서비스 이용이 제한될 수 있습니다.`,
  },
  {
    title: "5. 개인정보 처리 위탁",
    content: `PICO는 서비스 제공을 위해 아래와 같이 개인정보 처리 업무를 위탁하고 있습니다.\n\n· 수탁사: Supabase Inc. (클라우드 데이터 저장 및 인증)\n· 위탁 업무: 회원 인증, 데이터 저장 및 관리\n\n위탁 계약 시 개인정보 보호 관련 사항을 명시하고 관리·감독합니다.`,
  },
  {
    title: "6. 이용자의 권리와 행사 방법",
    content: `이용자는 다음의 권리를 행사할 수 있습니다.\n\n· 개인정보 열람, 수정, 삭제 요청\n· 처리 정지 요청\n· 마케팅 수신 동의 철회 (앱 내 설정 또는 이메일 수신거부)\n\n위 요청은 support@pico.kr 로 연락하시면 처리해 드립니다.`,
  },
  {
    title: "7. 개인정보 보호책임자",
    content: `개인정보 처리에 관한 업무를 총괄하고 관련 불만 및 피해 구제를 위한 담당자는 다음과 같습니다.\n\n· 담당 부서: 서비스 운영팀\n· 이메일: support@pico.kr`,
  },
  {
    title: "8. 개인정보처리방침의 변경",
    content: `본 개인정보처리방침은 법령 또는 서비스 변경에 따라 개정될 수 있습니다. 변경 시 앱 내 공지를 통해 사전에 안내드립니다.`,
  },
];

export default function PrivacyPage() {
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
            PRIVACY POLICY
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
            개인정보처리방침
          </h1>
          <p style={{ fontSize: 13, fontWeight: 300, color: C.text2, margin: 0 }}>
            시행일: {EFFECTIVE_DATE}
          </p>
        </div>

        {/* 강조 안내 */}
        <div
          style={{
            marginBottom: 20,
            padding:      "14px 18px",
            borderRadius: 14,
            background:   "rgba(250,202,62,0.05)",
            border:       "0.5px solid rgba(250,202,62,0.2)",
          }}
        >
          <p style={{ fontSize: 13, fontWeight: 300, color: C.text2, lineHeight: 1.7, margin: 0 }}>
            <span style={{ fontFamily: "var(--font-mona12)", fontWeight: 700, color: C.gold }}>
              개인정보처리방침
            </span>
            은 이용자의 개인정보를 어떻게 수집·이용·보호하는지 알려드리는 문서예요.
            PICO는 이용자의 개인정보를 소중히 여기며, 관련 법령을 준수합니다.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {SECTIONS.map((section, i) => (
            <div
              key={i}
              style={{
                background:   C.card,
                borderRadius: 16,
                padding:      "18px 20px",
                border:       `0.5px solid ${C.border}`,
              }}
            >
              <p
                style={{
                  fontFamily:   "var(--font-mona12)",
                  fontSize:     13,
                  fontWeight:   700,
                  color:        C.text,
                  marginBottom: 10,
                }}
              >
                {section.title}
              </p>
              {section.content.split("\n").map((line, j) => (
                <p
                  key={j}
                  style={{
                    fontSize:   13,
                    fontWeight: 300,
                    color:      line.startsWith("·") ? C.text2 : C.text2,
                    lineHeight: 1.75,
                    margin:     j < section.content.split("\n").length - 1 ? "0 0 3px" : 0,
                  }}
                >
                  {line || " "}
                </p>
              ))}
            </div>
          ))}
        </div>

        <p
          style={{
            marginTop:  24,
            fontSize:   12,
            fontWeight: 300,
            color:      "rgba(200,191,176,0.4)",
            textAlign:  "center",
            lineHeight: 1.8,
          }}
        >
          개인정보 관련 문의: support@pico.kr
        </p>
      </div>
    </main>
  );
}
