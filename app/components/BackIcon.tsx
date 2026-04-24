// 뒤로가기 아이콘 (Material Design ArrowBack)
// 모든 네비게이션 뒤로가기 버튼에 사용. 텍스트 레이블 없이 아이콘만 표시.
export function BackIcon({ size = 20, color = "#c8bfb0" }: { size?: number; color?: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 38,
        height: 38,
        borderRadius: "50%",
        background: "rgba(255,255,255,0.07)",
        flexShrink: 0,
      }}
    >
      <svg width={size} height={size} viewBox="0 0 24 24">
        <path
          d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"
          fill={color}
        />
      </svg>
    </span>
  );
}
