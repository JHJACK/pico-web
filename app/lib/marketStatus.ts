/**
 * 장 운영 상태 유틸리티 (클라이언트 · 서버 공용)
 *
 * 미국 서머타임(DST): 3월 둘째 일요일 02:00 ET ~ 11월 첫째 일요일 02:00 ET
 * DST 적용 시  NYSE/NASDAQ: 22:30 ~ 05:00 KST (익일)
 * DST 미적용 시 NYSE/NASDAQ: 23:30 ~ 06:00 KST (익일)
 */

// ─── KST 현재 시각 ────────────────────────────────────────────────────────────
function nowKST(): { day: number; totalMinutes: number } {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000); // UTC+9
  const day          = kst.getUTCDay();                    // 0=일, 6=토
  const totalMinutes = kst.getUTCHours() * 60 + kst.getUTCMinutes();
  return { day, totalMinutes };
}

// ─── 미국 서머타임 여부 ───────────────────────────────────────────────────────
export function isUSDST(now: Date = new Date()): boolean {
  const year = now.getUTCFullYear();

  // 3월 둘째 일요일 02:00 ET = 07:00 UTC (DST 시작)
  const mar1      = new Date(Date.UTC(year, 2, 1));
  const dstStart  = new Date(
    Date.UTC(year, 2, 1 + ((7 - mar1.getUTCDay()) % 7) + 7, 7)
  );

  // 11월 첫째 일요일 02:00 ET (DST 중이므로 = 06:00 UTC, DST 종료)
  const nov1    = new Date(Date.UTC(year, 10, 1));
  const dstEnd  = new Date(
    Date.UTC(year, 10, 1 + ((7 - nov1.getUTCDay()) % 7), 6)
  );

  return now >= dstStart && now < dstEnd;
}

// ─── 한국 장 운영 여부 ────────────────────────────────────────────────────────
// 평일 09:00 ~ 15:30 KST (공휴일 미처리 — API 레벨에서 처리)
export function isKrMarketOpen(): boolean {
  const { day, totalMinutes } = nowKST();
  if (day === 0 || day === 6) return false;             // 주말
  return totalMinutes >= 9 * 60 && totalMinutes < 15 * 60 + 30;
}

// ─── 미국 장 운영 여부 (DST 반영) ────────────────────────────────────────────
// DST 적용: 22:30 ~ 05:00 KST / DST 미적용: 23:30 ~ 06:00 KST
export function isUSMarketOpen(): boolean {
  const dst = isUSDST();
  const openMin  = dst ? 22 * 60 + 30 : 23 * 60 + 30;  // 1350 or 1410
  const closeMin = dst ? 5  * 60      : 6  * 60;        // 300  or 360

  const { day, totalMinutes } = nowKST();

  // 저녁 개장: 평일(월~금) totalMinutes >= openMin
  const eveningOpen   = day >= 1 && day <= 5 && totalMinutes >= openMin;
  // 자정 넘어 마감 전: 화~토 totalMinutes < closeMin
  // (금요일 장이 토요일 새벽까지 이어짐)
  const overnightOpen = day >= 2 && day <= 6 && totalMinutes < closeMin;

  return eveningOpen || overnightOpen;
}

// ─── 다음 개장 안내 텍스트 ────────────────────────────────────────────────────
export function getClosedText(isKr: boolean): { main: string; sub: string } {
  if (isKr) {
    return {
      main: "지금은 거래소 불이 꺼졌어요🌙",
      sub:  "평일 09:00 ~ 15:30에 다시 활성화됩니다.",
    };
  }
  const dst     = isUSDST();
  const openStr = dst ? "22:30" : "23:30";
  return {
    main: "지금은 거래소 불이 꺼졌어요🌙",
    sub:  `오늘 밤 ${openStr}에 거래가 시작됩니다.`,
  };
}

// ─── 버튼 비활성화 툴팁 텍스트 ───────────────────────────────────────────────
export function getMarketClosedTooltip(isKr: boolean): string {
  if (isKr) return "국내장은 지금 낮잠 시간! ☀️ 09:00에 다시 만나요.";
  const dst     = isUSDST();
  const openStr = dst ? "22:30" : "23:30";
  return `뉴욕은 지금 꿈나라예요! ✨ 밤 ${openStr}에 불이 켜집니다.`;
}
