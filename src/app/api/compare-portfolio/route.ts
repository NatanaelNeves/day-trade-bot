// Rota de API: compara estratégias num portfólio (média entre vários ativos).
// Usada na aba de paper trading, antes de iniciar a carteira.

import { NextRequest, NextResponse } from "next/server";
import { fetchCandles } from "@/lib/data";
import { comparePortfolio } from "@/lib/compare";
import { Candle } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const rawTickers: string[] = Array.isArray(body.tickers) ? body.tickers : [];
    const tickers = Array.from(
      new Set(
        rawTickers.map((t: string) => String(t).trim().toUpperCase()).filter(Boolean)
      )
    );
    const interval = body.interval ?? "1d";
    const initialCapital = Number(body.initialCapital ?? 10000);
    const feePct = Number(body.feePct ?? 0.0003);
    const stopLossPct = Number(body.stopLossPct ?? 0);
    const takeProfitPct = Number(body.takeProfitPct ?? 0);
    const allocationPct = Number(body.allocationPct ?? 100);

    if (tickers.length === 0) {
      return NextResponse.json(
        { error: "Informe ao menos um ticker." },
        { status: 400 }
      );
    }
    if (!["1d", "1h", "15m"].includes(interval)) {
      return NextResponse.json({ error: "Intervalo inválido." }, { status: 400 });
    }

    const fetched = await Promise.all(
      tickers.map(async (t) => {
        try {
          return { ticker: t, candles: await fetchCandles(t, interval) };
        } catch {
          return { ticker: t, candles: [] as Candle[] };
        }
      })
    );
    const basket = fetched.filter((b) => b.candles.length >= 30);

    if (basket.length === 0) {
      return NextResponse.json(
        { error: "Dados insuficientes para os ativos informados." },
        { status: 422 }
      );
    }

    const results = comparePortfolio(basket, {
      initialCapital,
      feePct,
      stopLossPct,
      takeProfitPct,
      allocationPct,
    });

    return NextResponse.json({ results, evaluated: basket.map((b) => b.ticker) });
  } catch (err) {
    console.error("Erro na comparação de portfólio:", err);
    return NextResponse.json(
      { error: "Falha ao comparar estratégias." },
      { status: 500 }
    );
  }
}
