"use client";

// Gráfico de candles (velas) com marcadores de COMPRA/VENDA.
// Usa lightweight-charts v5 (API nova: addSeries + createSeriesMarkers).

import { useEffect, useRef } from "react";
import {
  createChart,
  CandlestickSeries,
  createSeriesMarkers,
  ColorType,
  UTCTimestamp,
  IChartApi,
  SeriesMarker,
  Time,
} from "lightweight-charts";
import { Candle, SignalMarker } from "@/lib/types";

interface Props {
  candles: Candle[];
  markers: SignalMarker[];
}

export default function PriceChart({ candles, markers }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart: IChartApi = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#a0a3ab",
        fontFamily:
          "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.04)" },
        horzLines: { color: "rgba(255,255,255,0.04)" },
      },
      timeScale: { timeVisible: true, borderColor: "#262931" },
      rightPriceScale: { borderColor: "#262931" },
      autoSize: true,
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#35d28a",
      downColor: "#fb7185",
      borderVisible: false,
      wickUpColor: "#35d28a",
      wickDownColor: "#fb7185",
    });

    series.setData(
      candles.map((c) => ({
        time: c.time as UTCTimestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))
    );

    const seriesMarkers: SeriesMarker<Time>[] = markers.map((m) => ({
      time: m.time as UTCTimestamp,
      position: m.type === "BUY" ? "belowBar" : "aboveBar",
      color: m.type === "BUY" ? "#35d28a" : "#fb7185",
      shape: m.type === "BUY" ? "arrowUp" : "arrowDown",
      text: m.type === "BUY" ? "Compra" : "Venda",
    }));
    createSeriesMarkers(series, seriesMarkers);

    chart.timeScale().fitContent();

    return () => chart.remove();
  }, [candles, markers]);

  return <div ref={containerRef} className="h-[360px] w-full" />;
}
