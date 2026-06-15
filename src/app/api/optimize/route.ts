// Rota de API: otimização de parâmetros. Busca os dados uma vez e roda o
// backtest para todas as combinações da estratégia, devolvendo as melhores.

import { NextRequest, NextResponse } from "next/server";
import { fetchCandles } from "@/lib/data";
import { getStrategyMeta } from "@/lib/strategies.meta";
import { optimize } from "@/lib/optimize";
import { BacktestParams } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<BacktestParams>;

    const ticker = (body.ticker ?? "").trim();
    const interval = body.interval ?? "1d";
    const strategyId = body.strategyId ?? "sma_cross";
    const initialCapital = Number(body.initialCapital ?? 10000);
    const feePct = Number(body.feePct ?? 0.0003);
    const stopLossPct = Number(body.stopLossPct ?? 0);
    const takeProfitPct = Number(body.takeProfitPct ?? 0);
    const allocationPct = Number(body.allocationPct ?? 100);

    if (!ticker) {
      return NextResponse.json(
        { error: "Informe um ticker (ex.: PETR4)." },
        { status: 400 }
      );
    }
    if (!getStrategyMeta(strategyId)) {
      return NextResponse.json({ error: "Estratégia inválida." }, { status: 400 });
    }

    const candles = await fetchCandles(ticker, interval);
    if (candles.length < 30) {
      return NextResponse.json(
        { error: "Dados insuficientes para esse ticker/intervalo." },
        { status: 422 }
      );
    }

    const results = optimize(ticker, candles, strategyId, {
      initialCapital,
      feePct,
      stopLossPct,
      takeProfitPct,
      allocationPct,
    });

    return NextResponse.json({ results });
  } catch (err) {
    console.error("Erro na otimização:", err);
    return NextResponse.json(
      { error: "Falha ao otimizar. Tente novamente." },
      { status: 500 }
    );
  }
}
