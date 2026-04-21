"use client";

/**
 * 전역 주가 캐시 카운트다운 Context
 *
 * 모든 종목의 Redis 캐시는 메인 페이지 로드 시 동시에 900초로 설정되므로
 * 만료 시각(expiresAt)을 하나의 전역 타임스탬프로 관리한다.
 *
 * - 페이지 이동과 무관하게 타이머가 계속 흐름
 * - 어떤 종목 상세 페이지에서 API 응답을 받아도 expiresAt이 갱신됨
 * - expiresAt 기반이므로 여러 번 setInterval이 달려도 값이 수렴함
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

interface StockCacheCtx {
  /** 남은 초 (0이면 만료) */
  cacheTimeLeft: number;
  /** API 응답의 __ttl을 받았을 때 호출 */
  updateFromTTL: (ttl: number) => void;
}

const StockCacheContext = createContext<StockCacheCtx>({
  cacheTimeLeft: 15 * 60,
  updateFromTTL: () => {},
});

export function StockCacheProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // 절대 만료 시각(ms). null이면 아직 초기화 전
  const expiresAtRef = useRef<number | null>(null);
  const [cacheTimeLeft, setCacheTimeLeft] = useState(15 * 60);

  const updateFromTTL = useCallback((ttl: number) => {
    const newExpiresAt = Date.now() + ttl * 1000;
    expiresAtRef.current = newExpiresAt;
    setCacheTimeLeft(Math.max(0, ttl));
  }, []);

  // 1초마다 남은 시간 갱신
  useEffect(() => {
    const id = setInterval(() => {
      const exp = expiresAtRef.current;
      if (exp === null) return;
      const remaining = Math.max(0, Math.round((exp - Date.now()) / 1000));
      setCacheTimeLeft(remaining);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <StockCacheContext.Provider value={{ cacheTimeLeft, updateFromTTL }}>
      {children}
    </StockCacheContext.Provider>
  );
}

export function useStockCache() {
  return useContext(StockCacheContext);
}
