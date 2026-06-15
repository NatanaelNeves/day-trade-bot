// Rota de API: recebe os parâmetros, busca os dados, roda a estratégia e o
// backtest, e devolve o resultado completo em JSON.

import { NextRequest, NextResponse } from "next/server";
import { fetchCandles } from "@/lib/data";
import { generateSignals } from "@/lib/strategies";
import { getStrategyMeta, defaultParams } from "@/lib/strategies.meta";
import { runBacktest } from "@/lib/backtest";
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

    const meta = getStrategyMeta(strategyId);
    if (!meta) {
      return NextResponse.json(
        { error: "Estratégia inválida." },
        { status: 400 }
      );
    }
    if (!["1d", "1h", "15m"].includes(interval)) {
      return NextResponse.json({ error: "Intervalo inválido." }, { status: 400 });
    }

    // Usa os defaults da estratégia para qualquer parâmetro faltante.
    const params = { ...defaultParams(strategyId), ...(body.params ?? {}) };

    // Valida estratégias de média (rápida < lenta).
    if (
      (strategyId === "sma_cross" ||
        strategyId === "ema_cross" ||
        strategyId === "macd") &&
      params.fast >= params.slow
    ) {
      return NextResponse.json(
        { error: "A média/EMA rápida deve ser menor que a lenta." },
        { status: 400 }
      );
    }

    const candles = await fetchCandles(ticker, interval);
    if (candles.length < 30) {
      return NextResponse.json(
        {
          error:
            "Dados insuficientes para esse ticker/intervalo. Confira o código (ex.: PETR4, VALE3, ITUB4).",
        },
        { status: 422 }
      );
    }

    const signals = generateSignals(strategyId, candles, params);
    const result = runBacktest(ticker, candles, signals, {
      initialCapital,
      feePct,
      stopLossPct,
      takeProfitPct,
      allocationPct,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("Erro no backtest:", err);
    return NextResponse.json(
      { error: "Falha ao buscar dados ou rodar o backtest. Tente novamente." },
      { status: 500 }
    );
  }
}
