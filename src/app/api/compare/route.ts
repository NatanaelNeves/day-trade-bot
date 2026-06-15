// Rota de API: compara todas as estratégias no mesmo ativo/período.

import { NextRequest, NextResponse } from "next/server";
import { fetchCandles } from "@/lib/data";
import { compareStrategies } from "@/lib/compare";
import { BacktestParams } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<BacktestParams>;

    const ticker = (body.ticker ?? "").trim();
    const interval = body.interval ?? "1d";
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
    if (!["1d", "1h", "15m"].includes(interval)) {
      return NextResponse.json({ error: "Intervalo inválido." }, { status: 400 });
    }

    const candles = await fetchCandles(ticker, interval);
    if (candles.length < 30) {
      return NextResponse.json(
        { error: "Dados insuficientes para esse ticker/intervalo." },
        { status: 422 }
      );
    }

    const results = compareStrategies(ticker, candles, {
      initialCapital,
      feePct,
      stopLossPct,
      takeProfitPct,
      allocationPct,
    });

    return NextResponse.json({ results });
  } catch (err) {
    console.error("Erro na comparação:", err);
    return NextResponse.json(
      { error: "Falha ao comparar estratégias. Tente novamente." },
      { status: 500 }
    );
  }
}
