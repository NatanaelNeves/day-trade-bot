"use client";

// Gráfico de área da "curva de capital": como o patrimônio (caixa + posição)
// evoluiu ao longo do tempo durante a simulação.

import { useEffect, useRef } from "react";
import {
  createChart,
  AreaSeries,
  ColorType,
  UTCTimestamp,
  IChartApi,
} from "lightweight-charts";

interface Props {
  data: { time: number; value: number }[];
}

export default function EquityChart({ data }: Props) {
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

    const series = chart.addSeries(AreaSeries, {
      lineColor: "#8d7fff",
      topColor: "rgba(124,108,255,0.35)",
      bottomColor: "rgba(124,108,255,0.02)",
      lineWidth: 2,
    });

    series.setData(
      data.map((d) => ({ time: d.time as UTCTimestamp, value: d.value }))
    );

    chart.timeScale().fitContent();

    return () => chart.remove();
  }, [data]);

  return <div ref={containerRef} className="h-[260px] w-full" />;
}
