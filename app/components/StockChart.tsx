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

function formatTime(time: Time): string {
  if (typeof time === "object" && "year" in time) {
    const { year, month, day } = time as { year: number; month: number; day: number };
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  if (typeof time === "string") return time;
  const d = new Date((time as number) * 1000);
  const h = d.getUTCHours(), m = d.getUTCMinutes();
  if (h !== 0 || m !== 0) return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  return d.toISOString().split("T")[0];
}

function tickFormatter(time: Time, _type: TickMarkType, _locale: string): string {
  if (typeof time === "object" && "year" in time) {
    const t = time as { year: number; month: number; day: number };
    return `${t.month < 10 ? "0" + t.month : t.month}-${t.day < 10 ? "0" + t.day : t.day}`;
  }
  if (typeof time === "string") {
    const parts = time.split("-");
    return `${parts[1]}-${parts[2]}`;
  }
  const d = new Date((time as number) * 1000);
  const h = d.getUTCHours(), m = d.getUTCMinutes();
  if (h !== 0 || m !== 0) return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  return `${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

export default function StockChart({ ticker, up, isKr, exchangeRate = 1370 }: Props) {
  const containerRef    = useRef<HTMLDivElement>(null);
  const overlayRef      = useRef<HTMLDivElement>(null);
  const tooltipRef      = useRef<HTMLDivElement>(null);
  const chartRef        = useRef<IChartApi | null>(null);
  const areaRef         = useRef<ISeriesApi<SeriesType> | null>(null);
  const volRef          = useRef<ISeriesApi<SeriesType> | null>(null);
  const roRef           = useRef<ResizeObserver | null>(null);
  const candlesRef      = useRef<CandleData[]>([]);
  const isKrRef         = useRef(isKr);
  const exchangeRateRef = useRef(exchangeRate);
  isKrRef.current        = isKr;
  exchangeRateRef.current = exchangeRate;

  const maxLabelRef = useRef<HTMLDivElement>(null);
  const minLabelRef = useRef<HTMLDivElement>(null);
  const maxDataRef  = useRef<{ time: CandleData["time"]; price: number } | null>(null);
  const minDataRef  = useRef<{ time: CandleData["time"]; price: number } | null>(null);

  const [period,       setPeriod]       = useState<Period>("1M");
  const [loading,      setLoading]      = useState(true);
  const [empty,        setEmpty]        = useState(false);
  const [maxPrice,     setMaxPrice]     = useState<number | null>(null);
  const [minPrice,     setMinPrice]     = useState<number | null>(null);
  const [detailedMode, setDetailedMode] = useState(false);

  const lineColor = up ? UP_COLOR : DOWN_COLOR;
  const fillTop   = up ? "rgba(126,212,160,0.15)" : "rgba(240,120,120,0.15)";

  // ── 최고/최저 레이블 배치 ────────────────────────────────────────────────
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

  // ── 가격 포맷 헬퍼 ──────────────────────────────────────────────────────
  function fmtPrice(price: number): string {
    if (isKrRef.current) return Math.round(price).toLocaleString("ko-KR") + "원";
    return Math.round(price * exchangeRateRef.current).toLocaleString("ko-KR") + "원";
  }

  // ── 차트 초기화 ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    if (maxLabelRef.current) maxLabelRef.current.style.opacity = "0";
    if (minLabelRef.current) minLabelRef.current.style.opacity = "0";

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: "#141414" },
        textColor:  "#c8bfb0",
        fontSize:   12,
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.03)" },
        horzLines: { color: "rgba(255,255,255,0.03)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: "rgba(255,255,255,0.3)",
          labelBackgroundColor: "#2a2a2a",
          width: 1,
          style: 0,
        },
        horzLine: {
          color: "rgba(255,255,255,0.2)",
          labelBackgroundColor: "#2a2a2a",
          width: 1,
          style: 0,
        },
      },
      rightPriceScale: {
        borderColor:  "rgba(255,255,255,0.05)",
        scaleMargins: { top: 0.08, bottom: 0.22 },
      },
      timeScale: {
        borderColor:       "rgba(255,255,255,0.05)",
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

    // 에어리어 시리즈 (simple 모드에선 fill transparent, detailed에선 fill)
    const area = chart.addSeries(AreaSeries, {
      lineColor,
      topColor:               "rgba(0,0,0,0)",  // simple mode 기본: 투명
      bottomColor:            "rgba(0,0,0,0)",
      lineWidth:              2,
      priceLineVisible:       false,
      lastValueVisible:       true,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius:  5,
      crosshairMarkerBackgroundColor: lineColor,
      crosshairMarkerBorderColor:     "#141414",
      crosshairMarkerBorderWidth:     2,
    });

    // 볼륨 히스토그램 (detailed 모드에서만 데이터 주입)
    const vol = chart.addSeries(HistogramSeries, {
      color:            "rgba(255,255,255,0.1)",
      priceScaleId:     "vol",
      lastValueVisible: false,
      priceLineVisible: false,
    });
    chart.priceScale("vol").applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    });

    // ── 커스텀 툴팁 ─────────────────────────────────────────────────────
    chart.subscribeCrosshairMove((param) => {
      const tooltip = tooltipRef.current;
      if (!tooltip) return;
      if (!param.time || !param.point || !areaRef.current) {
        tooltip.style.opacity = "0";
        return;
      }
      const raw = param.seriesData.get(areaRef.current);
      if (!raw) { tooltip.style.opacity = "0"; return; }

      const price   = (raw as { value: number }).value;
      const dateEl  = tooltip.querySelector<HTMLElement>(".tt-date");
      const priceEl = tooltip.querySelector<HTMLElement>(".tt-price");
      if (dateEl)  dateEl.textContent  = formatTime(param.time);
      if (priceEl) priceEl.textContent = fmtPrice(price);

      const w  = containerRef.current?.clientWidth ?? 400;
      const tw = 140;
      let left = param.point.x + 14;
      if (left + tw > w - 8) left = param.point.x - tw - 14;
      const top = Math.max(param.point.y - 48, 8);

      tooltip.style.opacity = "1";
      tooltip.style.left    = `${left}px`;
      tooltip.style.top     = `${top}px`;
    });

    chartRef.current = chart;
    areaRef.current  = area;
    volRef.current   = vol;

    chart.timeScale().subscribeVisibleLogicalRangeChange(() => positionLabels());

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

  // ── 모바일 터치 크로스헤어 (overlay div에서 처리) ────────────────────────
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;

    let touching = false;

    const onTouchStart = (e: TouchEvent) => {
      touching = true;
      e.preventDefault();
      moveCrosshair(e.touches[0]);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!touching) return;
      e.preventDefault();
      moveCrosshair(e.touches[0]);
    };
    const onTouchEnd = () => {
      touching = false;
      if (tooltipRef.current) tooltipRef.current.style.opacity = "0";
      chartRef.current?.clearCrosshairPosition();
    };

    function moveCrosshair(touch: Touch) {
      const chart   = chartRef.current;
      const area    = areaRef.current;
      const candles = candlesRef.current;
      const container = containerRef.current;
      if (!chart || !area || !candles.length || !container) return;

      const rect    = container.getBoundingClientRect();
      const x       = touch.clientX - rect.left;
      const logical = chart.timeScale().coordinateToLogical(x);
      if (logical == null) return;

      const idx    = Math.max(0, Math.min(Math.round(logical), candles.length - 1));
      const candle = candles[idx];
      if (!candle) return;

      chart.setCrosshairPosition(candle.close, candle.time as Time, area);

      const tooltip = tooltipRef.current;
      if (!tooltip) return;

      const priceY = area.priceToCoordinate(candle.close);
      const w      = container.clientWidth;
      const tw     = 140;
      let left = x + 14;
      if (left + tw > w - 8) left = x - tw - 14;
      const top = priceY != null ? Math.max(priceY - 48, 8) : 30;

      const dateEl  = tooltip.querySelector<HTMLElement>(".tt-date");
      const priceEl = tooltip.querySelector<HTMLElement>(".tt-price");
      if (dateEl)  dateEl.textContent  = formatTime(candle.time as Time);
      if (priceEl) priceEl.textContent = fmtPrice(candle.close);

      tooltip.style.opacity = "1";
      tooltip.style.left    = `${left}px`;
      tooltip.style.top     = `${top}px`;
    }

    overlay.addEventListener("touchstart",  onTouchStart, { passive: false });
    overlay.addEventListener("touchmove",   onTouchMove,  { passive: false });
    overlay.addEventListener("touchend",    onTouchEnd);
    overlay.addEventListener("touchcancel", onTouchEnd);

    return () => {
      overlay.removeEventListener("touchstart",  onTouchStart);
      overlay.removeEventListener("touchmove",   onTouchMove);
      overlay.removeEventListener("touchend",    onTouchEnd);
      overlay.removeEventListener("touchcancel", onTouchEnd);
    };
  }, []);

  // ── 색상 업데이트 ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!areaRef.current) return;
    areaRef.current.applyOptions({
      lineColor,
      topColor:    detailedMode ? fillTop : "rgba(0,0,0,0)",
      bottomColor: "rgba(0,0,0,0)",
      crosshairMarkerBackgroundColor: lineColor,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [up, detailedMode]);

  // ── detailed 모드 전환 시 볼륨 업데이트 ────────────────────────────────
  useEffect(() => {
    if (!volRef.current) return;
    if (detailedMode && candlesRef.current.length > 0) {
      volRef.current.setData(
        candlesRef.current.map((c) => ({
          time:  c.time as never,
          value: c.volume,
          color: c.close >= c.open
            ? "rgba(126,212,160,0.2)"
            : "rgba(240,120,120,0.2)",
        }))
      );
    } else {
      volRef.current.setData([]);
    }
  }, [detailedMode]);

  // ── 데이터 로드 ──────────────────────────────────────────────────────────
  const loadData = useCallback(async (p: Period) => {
    setLoading(true);
    setEmpty(false);
    setMaxPrice(null);
    setMinPrice(null);
    if (maxLabelRef.current) maxLabelRef.current.style.opacity = "0";
    if (minLabelRef.current) minLabelRef.current.style.opacity = "0";
    try {
      const res     = await fetch(`/api/stocks/history?ticker=${ticker}&period=${p}`);
      const candles: CandleData[] = await res.json();

      if (!candles.length || !areaRef.current || !volRef.current) {
        setEmpty(true);
        return;
      }

      candlesRef.current = candles;

      const maxCandle = candles.reduce((a, b) => b.close > a.close ? b : a);
      const minCandle = candles.reduce((a, b) => b.close < a.close ? b : a);
      maxDataRef.current = { time: maxCandle.time, price: maxCandle.close };
      minDataRef.current = { time: minCandle.time, price: minCandle.close };
      setMaxPrice(maxCandle.close);
      setMinPrice(minCandle.close);

      areaRef.current.setData(
        candles.map((c) => ({ time: c.time as never, value: c.close }))
      );

      // detailed 모드일 때만 볼륨 표시
      if (detailedMode) {
        volRef.current.setData(
          candles.map((c) => ({
            time:  c.time as never,
            value: c.volume,
            color: c.close >= c.open
              ? "rgba(126,212,160,0.2)"
              : "rgba(240,120,120,0.2)",
          }))
        );
      } else {
        volRef.current.setData([]);
      }

      chartRef.current?.timeScale().fitContent();
      positionLabels();
    } catch {
      setEmpty(true);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticker, detailedMode]);

  useEffect(() => {
    const t = setTimeout(() => loadData(period), 80);
    return () => clearTimeout(t);
  }, [period, loadData]);

  // ── chart 높이: simple 280 / detailed 360 ──────────────────────────────
  const chartH = detailedMode ? 360 : 280;

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .period-btn { transition: background 0.15s, color 0.15s; }
      `}</style>

      {/* 기간 탭 + 자세한 차트 토글 */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 14px 10px",
        borderBottom: "0.5px solid rgba(255,255,255,0.05)",
      }}>
        <div style={{ display: "flex", gap: 4 }}>
          {PERIODS.map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              className="period-btn"
              style={{
                fontFamily: "var(--font-mona12), monospace",
                fontSize: 12, fontWeight: period === p ? 700 : 500,
                padding: "5px 13px", borderRadius: 20,
                border: `0.5px solid ${period === p ? "rgba(250,202,62,0.4)" : "rgba(255,255,255,0.08)"}`,
                background: period === p ? "rgba(250,202,62,0.12)" : "transparent",
                color:      period === p ? "#FACA3E" : "#c8bfb0",
                cursor: "pointer",
              }}
            >{p}</button>
          ))}
        </div>

        {/* 자세한 차트 토글 (토스 스타일 체크박스) */}
        <button
          onClick={() => setDetailedMode(v => !v)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "none", border: "none", cursor: "pointer", padding: "4px 2px",
          }}
        >
          <div style={{
            width: 16, height: 16, borderRadius: 4, flexShrink: 0,
            background: detailedMode ? lineColor : "transparent",
            border: `1.5px solid ${detailedMode ? lineColor : "rgba(255,255,255,0.25)"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background 0.15s, border-color 0.15s",
          }}>
            {detailedMode && (
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path d="M1 4L3.5 6.5L9 1" stroke="#141414" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
          <span style={{
            fontFamily: "var(--font-mona12)", fontSize: 12, fontWeight: 600,
            color: detailedMode ? "#e8e0d0" : "#c8bfb0",
          }}>자세한 차트</span>
        </button>
      </div>

      {/* 차트 영역 */}
      <div style={{ position: "relative", height: chartH, transition: "height 0.3s ease" }}>
        <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

        {/* 모바일 터치 오버레이 (터치 크로스헤어 처리) */}
        <div
          ref={overlayRef}
          style={{
            position: "absolute", inset: 0, zIndex: 5,
            touchAction: "none",
            cursor: "crosshair",
          }}
        />

        {/* 커스텀 가격 툴팁 */}
        <div ref={tooltipRef} style={{
          position: "absolute",
          pointerEvents: "none",
          opacity: 0,
          transition: "opacity 0.1s",
          background: "rgba(20,20,20,0.94)",
          border: `0.5px solid ${lineColor}44`,
          borderRadius: 10,
          padding: "8px 12px",
          zIndex: 10,
          backdropFilter: "blur(8px)",
        }}>
          <div className="tt-date" style={{
            fontFamily: "var(--font-mona12), monospace",
            fontSize: 11, color: "#c8bfb0", marginBottom: 3,
          }} />
          <div className="tt-price" style={{
            fontFamily: "var(--font-mona12), monospace",
            fontSize: 15, fontWeight: 700, color: lineColor,
          }} />
        </div>

        {/* 최고가 레이블 */}
        <div ref={maxLabelRef} style={{
          position: "absolute", pointerEvents: "none",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
          transition: "opacity 0.2s", zIndex: 4,
        }}>
          <span style={{
            fontFamily: "var(--font-mona12), monospace",
            fontSize: 11, color: "#7ed4a0", whiteSpace: "nowrap",
            background: "rgba(14,14,14,0.9)", padding: "2px 8px", borderRadius: 5,
            border: "0.5px solid rgba(126,212,160,0.2)",
          }}>
            최고 {maxPrice != null ? fmtPrice(maxPrice) : ""}
          </span>
          <span style={{ color: "#7ed4a0", fontSize: 7, lineHeight: 1 }}>●</span>
        </div>

        {/* 최저가 레이블 */}
        <div ref={minLabelRef} style={{
          position: "absolute", pointerEvents: "none",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
          transition: "opacity 0.2s", zIndex: 4,
        }}>
          <span style={{ color: "#f07878", fontSize: 7, lineHeight: 1 }}>●</span>
          <span style={{
            fontFamily: "var(--font-mona12), monospace",
            fontSize: 11, color: "#f07878", whiteSpace: "nowrap",
            background: "rgba(14,14,14,0.9)", padding: "2px 8px", borderRadius: 5,
            border: "0.5px solid rgba(240,120,120,0.2)",
          }}>
            최저 {minPrice != null ? fmtPrice(minPrice) : ""}
          </span>
        </div>

        {/* 로딩 */}
        {loading && (
          <div style={{
            position: "absolute", inset: 0, background: "#141414", zIndex: 6,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div style={{
              width: 26, height: 26, borderRadius: "50%",
              border: "2px solid rgba(255,255,255,0.08)",
              borderTopColor: lineColor,
              animation: "spin 0.7s linear infinite",
            }} />
          </div>
        )}

        {/* 데이터 없음 */}
        {!loading && empty && (
          <div style={{
            position: "absolute", inset: 0, background: "#141414", zIndex: 6,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 8,
          }}>
            <span style={{ fontSize: 22 }}>📉</span>
            <span style={{ fontFamily: "var(--font-mona12)", fontSize: 13, color: "#c8bfb0" }}>
              차트 데이터를 불러올 수 없어요
            </span>
          </div>
        )}
      </div>

      {/* simple 모드 안내 텍스트 */}
      {!detailedMode && !loading && !empty && (
        <div style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "8px 14px 10px",
          borderTop: "0.5px solid rgba(255,255,255,0.04)",
        }}>
          <span style={{ fontFamily: "var(--font-mona12)", fontSize: 11, color: "rgba(200,191,176,0.45)" }}>
            15분 지연 · 터치하고 드래그하면 날짜와 가격을 확인할 수 있어요
          </span>
        </div>
      )}
    </div>
  );
}
