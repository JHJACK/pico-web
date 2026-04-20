"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { CandleData } from "@/app/api/stocks/history/route";
import {
  createChart,
  CrosshairMode,
  AreaSeries,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
  type SeriesType,
  type TickMarkType,
  type Time,
} from "lightweight-charts";

type Period = "1D" | "1W" | "1M" | "1Y";

type Props = {
  ticker: string;
  up: boolean;
  isKr: boolean;
  exchangeRate?: number;
};

const PERIODS: Period[] = ["1D", "1W", "1M", "1Y"];
const UP_COLOR   = "#7ed4a0";
const DOWN_COLOR = "#f07878";

// 날짜 포맷 (한국식 YYYY-MM-DD, 장중은 HH:mm)
function formatTime(time: Time): string {
  if (typeof time === "object" && "year" in time) {
    const { year, month, day } = time as { year: number; month: number; day: number };
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  if (typeof time === "string") return time;
  // 숫자 타임스탬프 (KST 보정된 Unix초) → UTC 기준으로 HH:mm 또는 날짜 표시
  const d = new Date((time as number) * 1000);
  const h = d.getUTCHours(), m = d.getUTCMinutes();
  if (h !== 0 || m !== 0) return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  return d.toISOString().split("T")[0];
}

// x축 눈금 라벨 포맷
function tickFormatter(time: Time, _type: TickMarkType, _locale: string): string {
  if (typeof time === "object" && "year" in time) {
    const t = time as { year: number; month: number; day: number };
    return `${t.month < 10 ? "0" + t.month : t.month}-${t.day < 10 ? "0" + t.day : t.day}`;
  }
  if (typeof time === "string") {
    const parts = time.split("-");
    return `${parts[1]}-${parts[2]}`;
  }
  // 숫자 타임스탬프 (KST 보정된 Unix초)
  const d = new Date((time as number) * 1000);
  const h = d.getUTCHours(), m = d.getUTCMinutes();
  if (h !== 0 || m !== 0) return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  return `${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

export default function StockChart({ ticker, up, isKr, exchangeRate = 1370 }: Props) {
  const containerRef   = useRef<HTMLDivElement>(null);
  const tooltipRef     = useRef<HTMLDivElement>(null);
  const chartRef       = useRef<IChartApi | null>(null);
  const areaRef        = useRef<ISeriesApi<SeriesType> | null>(null);
  const volRef         = useRef<ISeriesApi<SeriesType> | null>(null);
  const roRef          = useRef<ResizeObserver | null>(null);
  const isKrRef        = useRef(isKr);
  const exchangeRateRef = useRef(exchangeRate);
  isKrRef.current        = isKr;
  exchangeRateRef.current = exchangeRate;

  // 최고/최저 레이블 DOM refs
  const maxLabelRef = useRef<HTMLDivElement>(null);
  const minLabelRef = useRef<HTMLDivElement>(null);
  // 최고/최저 데이터 (시간 + 가격)
  const maxDataRef  = useRef<{ time: CandleData["time"]; price: number } | null>(null);
  const minDataRef  = useRef<{ time: CandleData["time"]; price: number } | null>(null);

  const [period, setPeriod]   = useState<Period>("1M");
  const [loading, setLoading] = useState(true);
  const [empty, setEmpty]     = useState(false);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [minPrice, setMinPrice] = useState<number | null>(null);

  // ── 최고/최저 레이블 좌표 계산 ───────────────────────────────────────────────
  // priceToCoordinate가 firstValue=null 이면 null을 반환하므로, 성공할 때까지 재시도
  const positionLabels = useCallback((retriesLeft = 8) => {
    requestAnimationFrame(() => {
      const chart     = chartRef.current;
      const area      = areaRef.current;
      const container = containerRef.current;
      if (!chart || !area || !container || !maxDataRef.current || !minDataRef.current) return;

      const W       = container.clientWidth;
      const LABEL_W = 120;

      const maxX = chart.timeScale().timeToCoordinate(maxDataRef.current.time as Time);
      const maxY = area.priceToCoordinate(maxDataRef.current.price);
      const minX = chart.timeScale().timeToCoordinate(minDataRef.current.time as Time);
      const minY = area.priceToCoordinate(minDataRef.current.price);

      // 좌표가 아직 null이면 재시도 (최대 8회, 간격 100ms)
      if ((maxX == null || maxY == null || minX == null || minY == null)) {
        if (retriesLeft > 0) setTimeout(() => positionLabels(retriesLeft - 1), 100);
        return;
      }

      const clamp = (x: number) => Math.max(4, Math.min(x - LABEL_W / 2, W - LABEL_W - 4));

      if (maxLabelRef.current) {
        maxLabelRef.current.style.left    = `${clamp(maxX)}px`;
        maxLabelRef.current.style.top     = `${Math.max(4, maxY - 38)}px`;
        maxLabelRef.current.style.opacity = "1";
      }
      if (minLabelRef.current) {
        minLabelRef.current.style.left    = `${clamp(minX)}px`;
        minLabelRef.current.style.top     = `${minY + 8}px`;
        minLabelRef.current.style.opacity = "1";
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lineColor = up ? UP_COLOR : DOWN_COLOR;
  const fillTop   = up ? "rgba(126,212,160,0.18)" : "rgba(240,120,120,0.18)";

  // ── 차트 초기화 ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    // React style prop에 opacity가 없으므로 DOM으로 초기 숨김 처리
    if (maxLabelRef.current) maxLabelRef.current.style.opacity = "0";
    if (minLabelRef.current) minLabelRef.current.style.opacity = "0";

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: "#141414" },
        textColor:  "#c8bfb0",
        fontSize:   12,
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.04)" },
        horzLines: { color: "rgba(255,255,255,0.04)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: "rgba(255,255,255,0.25)",
          labelBackgroundColor: "#2a2a2a",
        },
        horzLine: {
          color: "rgba(255,255,255,0.25)",
          labelBackgroundColor: "#2a2a2a",
        },
      },
      rightPriceScale: {
        borderColor:  "rgba(255,255,255,0.06)",
        scaleMargins: { top: 0.08, bottom: 0.22 },
      },
      timeScale: {
        borderColor:       "rgba(255,255,255,0.06)",
        timeVisible:       true,
        secondsVisible:    false,
        fixLeftEdge:       true,
        fixRightEdge:      true,
        tickMarkFormatter: tickFormatter,
      },
      handleScroll: { mouseWheel: false, pressedMouseMove: true },
      handleScale:  { mouseWheel: false, pinch: true, axisPressedMouseMove: false },
      width:  containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    });

    // 에어리어 시리즈
    const area = chart.addSeries(AreaSeries, {
      lineColor,
      topColor:               fillTop,
      bottomColor:            "rgba(0,0,0,0)",
      lineWidth:              2,
      priceLineVisible:       false,
      lastValueVisible:       true,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius:  5,
      crosshairMarkerBackgroundColor: lineColor,
      crosshairMarkerBorderColor:     "#141414",
    });

    // 볼륨 히스토그램
    const vol = chart.addSeries(HistogramSeries, {
      color:            "rgba(255,255,255,0.1)",
      priceScaleId:     "vol",
      lastValueVisible: false,
      priceLineVisible: false,
    });
    chart.priceScale("vol").applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    });

    // ── 커스텀 툴팁 (크로스헤어 이동 시) ─────────────────────────────────
    chart.subscribeCrosshairMove((param) => {
      const tooltip = tooltipRef.current;
      if (!tooltip) return;

      if (!param.time || !param.point || !areaRef.current) {
        tooltip.style.opacity = "0";
        return;
      }
      const raw = param.seriesData.get(areaRef.current);
      if (!raw) { tooltip.style.opacity = "0"; return; }

      const price  = (raw as { value: number }).value;
      const dateEl = tooltip.querySelector<HTMLElement>(".tt-date");
      const priceEl = tooltip.querySelector<HTMLElement>(".tt-price");
      if (dateEl) dateEl.textContent = formatTime(param.time);
      if (priceEl) {
        if (isKrRef.current) {
          priceEl.textContent = Math.round(price).toLocaleString("ko-KR") + "원";
        } else {
          priceEl.textContent = Math.round(price * exchangeRateRef.current).toLocaleString("ko-KR") + "원";
        }
      }

      const w = containerRef.current?.clientWidth ?? 400;
      const tw = 130;
      let left = param.point.x + 14;
      if (left + tw > w - 8) left = param.point.x - tw - 14;
      const top = Math.max(param.point.y - 44, 8);

      tooltip.style.opacity = "1";
      tooltip.style.left    = `${left}px`;
      tooltip.style.top     = `${top}px`;
    });

    chartRef.current = chart;
    areaRef.current  = area;
    volRef.current   = vol;

    // 스케일 변경 시 레이블 재배치 (줌/스크롤 대응)
    chart.timeScale().subscribeVisibleLogicalRangeChange(() => positionLabels());

    // 리사이즈
    const ro = new ResizeObserver(() => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width:  containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
        positionLabels();
      }
    });
    ro.observe(containerRef.current);
    roRef.current = ro;

    return () => {
      roRef.current?.disconnect();
      chartRef.current?.remove();
      chartRef.current = null;
      areaRef.current  = null;
      volRef.current   = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 색상 업데이트 ─────────────────────────────────────────────────────────
  useEffect(() => {
    areaRef.current?.applyOptions({
      lineColor,
      topColor:    fillTop,
      bottomColor: "rgba(0,0,0,0)",
      crosshairMarkerBackgroundColor: lineColor,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [up]);

  // ── 데이터 로드 ───────────────────────────────────────────────────────────
  const loadData = useCallback(async (p: Period) => {
    setLoading(true);
    setEmpty(false);
    setMaxPrice(null);
    setMinPrice(null);
    if (maxLabelRef.current) maxLabelRef.current.style.opacity = "0";
    if (minLabelRef.current) minLabelRef.current.style.opacity = "0";
    try {
      const res = await fetch(`/api/stocks/history?ticker=${ticker}&period=${p}`);
      const candles: CandleData[] = await res.json();

      if (!candles.length || !areaRef.current || !volRef.current) {
        setEmpty(true);
        return;
      }

      // 최고/최저 candle 찾기 (area 차트가 close 기준이므로 close로 탐색)
      const maxCandle = candles.reduce((a, b) => b.close > a.close ? b : a);
      const minCandle = candles.reduce((a, b) => b.close < a.close ? b : a);
      maxDataRef.current = { time: maxCandle.time, price: maxCandle.close };
      minDataRef.current = { time: minCandle.time, price: minCandle.close };
      setMaxPrice(maxCandle.close);
      setMinPrice(minCandle.close);

      areaRef.current.setData(
        candles.map((c) => ({ time: c.time as never, value: c.close }))
      );
      volRef.current.setData(
        candles.map((c) => ({
          time:  c.time as never,
          value: c.volume,
          color: c.close >= c.open
            ? "rgba(126,212,160,0.22)"
            : "rgba(240,120,120,0.22)",
        }))
      );
      chartRef.current?.timeScale().fitContent();
      positionLabels();
    } catch {
      setEmpty(true);
    } finally {
      setLoading(false);
    }
  }, [ticker]);

  useEffect(() => {
    const t = setTimeout(() => loadData(period), 80);
    return () => clearTimeout(t);
  }, [period, loadData]);

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {/* 기간 탭 */}
      <div style={{
        display: "flex", gap: 4,
        padding: "12px 14px 10px",
        borderBottom: "0.5px solid rgba(255,255,255,0.05)",
      }}>
        {PERIODS.map((p) => (
          <button key={p} onClick={() => setPeriod(p)}
            className="period-btn"
            style={{
              fontSize: 12, fontWeight: 500,
              padding: "5px 14px", borderRadius: 20,
              border: `0.5px solid ${period === p ? "rgba(250,202,62,0.4)" : "rgba(255,255,255,0.08)"}`,
              background: period === p ? "rgba(250,202,62,0.12)" : "transparent",
              color:      period === p ? "#FACA3E" : "#c8bfb0",
              cursor: "pointer",
              transition: "background 0.15s, color 0.15s",
            }}
          >{p}</button>
        ))}
      </div>

      {/* 차트 영역 */}
      <div style={{ position: "relative", height: 380 }}>
        <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

        {/* 커스텀 가격 툴팁 */}
        <div ref={tooltipRef} style={{
          position: "absolute",
          pointerEvents: "none",
          opacity: 0,
          transition: "opacity 0.1s",
          background: "#1e1e1e",
          border: "0.5px solid rgba(255,255,255,0.12)",
          borderRadius: 8,
          padding: "7px 11px",
          zIndex: 10,
        }}>
          <div className="tt-date" style={{ fontSize: 11, color: "#c8bfb0", marginBottom: 3 }} />
          <div className="tt-price" style={{ fontSize: 14, fontWeight: 600, color: "#e8e0d0",
            fontFamily: "var(--font-inter), monospace" }} />
        </div>

        {/* 최고가 레이블 — opacity는 React style prop에서 제외, positionLabels()가 DOM 직접 제어 */}
        <div ref={maxLabelRef} style={{
          position: "absolute", pointerEvents: "none",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
          transition: "opacity 0.2s",
        }}>
          <span style={{
            fontSize: 11, color: "#7ed4a0", whiteSpace: "nowrap",
            background: "rgba(20,20,20,0.82)", padding: "2px 7px", borderRadius: 5,
            fontFamily: "var(--font-inter), monospace", letterSpacing: "-0.01em",
          }}>
            최고 {maxPrice != null
              ? (isKr
                  ? Math.round(maxPrice).toLocaleString("ko-KR") + "원"
                  : Math.round(maxPrice * exchangeRate).toLocaleString("ko-KR") + "원")
              : ""}
          </span>
          <span style={{ color: "#7ed4a0", fontSize: 7, lineHeight: 1 }}>●</span>
        </div>

        {/* 최저가 레이블 */}
        <div ref={minLabelRef} style={{
          position: "absolute", pointerEvents: "none",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
          transition: "opacity 0.2s",
        }}>
          <span style={{ color: "#f07878", fontSize: 7, lineHeight: 1 }}>●</span>
          <span style={{
            fontSize: 11, color: "#f07878", whiteSpace: "nowrap",
            background: "rgba(20,20,20,0.82)", padding: "2px 7px", borderRadius: 5,
            fontFamily: "var(--font-inter), monospace", letterSpacing: "-0.01em",
          }}>
            최저 {minPrice != null
              ? (isKr
                  ? Math.round(minPrice).toLocaleString("ko-KR") + "원"
                  : Math.round(minPrice * exchangeRate).toLocaleString("ko-KR") + "원")
              : ""}
          </span>
        </div>

        {/* 로딩 */}
        {loading && (
          <div style={{
            position: "absolute", inset: 0, background: "#141414",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              border: "2px solid rgba(255,255,255,0.08)",
              borderTopColor: lineColor,
              animation: "spin 0.7s linear infinite",
            }} />
          </div>
        )}

        {/* 데이터 없음 */}
        {!loading && empty && (
          <div style={{
            position: "absolute", inset: 0, background: "#141414",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 8,
          }}>
            <span style={{ fontSize: 22 }}>📉</span>
            <span className="lbl" style={{ color: "#c8bfb0" }}>
              차트 데이터를 불러올 수 없어요
            </span>
          </div>
        )}

      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
