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
} from "lightweight-charts";

type Period = "1D" | "1W" | "1M" | "1Y";

type Props = {
  ticker: string;
  up: boolean;
};

const PERIODS: Period[] = ["1D", "1W", "1M", "1Y"];
const UP_COLOR   = "#7ed4a0";
const DOWN_COLOR = "#f07878";

export default function StockChart({ ticker, up }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef     = useRef<IChartApi | null>(null);
  const areaRef      = useRef<ISeriesApi<SeriesType> | null>(null);
  const volRef       = useRef<ISeriesApi<SeriesType> | null>(null);
  const roRef        = useRef<ResizeObserver | null>(null);

  const [period, setPeriod]   = useState<Period>("1M");
  const [loading, setLoading] = useState(true);
  const [empty, setEmpty]     = useState(false);

  const lineColor = up ? UP_COLOR : DOWN_COLOR;
  const fillTop   = up ? "rgba(126,212,160,0.18)" : "rgba(240,120,120,0.18)";

  // ── 차트 초기화 (마운트 1회) ─────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

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
          color: "rgba(255,255,255,0.2)",
          labelBackgroundColor: "#1e1e1e",
        },
        horzLine: {
          color: "rgba(255,255,255,0.2)",
          labelBackgroundColor: "#1e1e1e",
        },
      },
      rightPriceScale: {
        borderColor:  "rgba(255,255,255,0.06)",
        scaleMargins: { top: 0.08, bottom: 0.22 },
      },
      timeScale: {
        borderColor:    "rgba(255,255,255,0.06)",
        timeVisible:    true,
        secondsVisible: false,
        fixLeftEdge:    true,
        fixRightEdge:   true,
      },
      handleScroll: { mouseWheel: false, pressedMouseMove: true },
      handleScale:  { mouseWheel: false, pinch: true, axisPressedMouseMove: false },
      width:  containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    });

    // 에어리어 시리즈 (메인 라인)
    const area = chart.addSeries(AreaSeries, {
      lineColor,
      topColor:               fillTop,
      bottomColor:            "rgba(0,0,0,0)",
      lineWidth:              2,
      priceLineVisible:       false,
      lastValueVisible:       false,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius:  4,
      crosshairMarkerBackgroundColor: lineColor,
    });

    // 볼륨 히스토그램 (하단 보조)
    const vol = chart.addSeries(HistogramSeries, {
      color:            "rgba(255,255,255,0.12)",
      priceScaleId:     "vol",
      lastValueVisible: false,
      priceLineVisible: false,
    });
    chart.priceScale("vol").applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    });

    chartRef.current = chart;
    areaRef.current  = area;
    volRef.current   = vol;

    // 리사이즈 대응
    const ro = new ResizeObserver(() => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width:  containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
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

  // ── 색상 업데이트 (up 변경 시) ────────────────────────────────────────────
  useEffect(() => {
    areaRef.current?.applyOptions({
      lineColor,
      topColor:    fillTop,
      bottomColor: "rgba(0,0,0,0)",
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [up]);

  // ── 데이터 로드 ───────────────────────────────────────────────────────────
  const loadData = useCallback(async (p: Period) => {
    setLoading(true);
    setEmpty(false);
    try {
      const res = await fetch(`/api/stocks/history?ticker=${ticker}&period=${p}`);
      const candles: CandleData[] = await res.json();

      if (!candles.length || !areaRef.current || !volRef.current) {
        setEmpty(true);
        return;
      }

      areaRef.current.setData(
        candles.map((c) => ({ time: c.time as never, value: c.close }))
      );
      volRef.current.setData(
        candles.map((c) => ({
          time:  c.time as never,
          value: c.volume,
          color: c.close >= c.open
            ? "rgba(126,212,160,0.25)"
            : "rgba(240,120,120,0.25)",
        }))
      );
      chartRef.current?.timeScale().fitContent();
    } catch {
      setEmpty(true);
    } finally {
      setLoading(false);
    }
  }, [ticker]);

  // 기간 변경 또는 마운트 시 로드 (차트 init 대기 80ms)
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
              border: `0.5px solid ${period === p
                ? "rgba(250,202,62,0.4)"
                : "rgba(255,255,255,0.08)"}`,
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

        {/* 로딩 스피너 */}
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
