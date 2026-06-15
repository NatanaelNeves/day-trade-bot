// Rota de API do paper trading ao vivo.
//  - GET  -> estado atual da carteira (sem alterar nada)
//  - POST -> { action: "start" | "tick" | "stop" | "reset", ... }

import { NextRequest, NextResponse } from "next/server";
import {
  loadAccount,
  saveAccount,
  resetAccount,
  startAccount,
  processTick,
  PaperConfig,
} from "@/lib/paper";
import { getStrategyMeta, defaultParams } from "@/lib/strategies.meta";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const account = await loadAccount();
  return NextResponse.json({ account });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action as string;

    if (action === "start") {
      const strategyId = body.strategyId ?? "sma_cross";
      const meta = getStrategyMeta(strategyId);
      if (!meta) {
        return NextResponse.json({ error: "Estratégia inválida." }, { status: 400 });
      }

      // Aceita lista de tickers (ou um único, por compatibilidade).
      const rawTickers: string[] = Array.isArray(body.tickers)
        ? body.tickers
        : body.ticker
          ? [body.ticker]
          : [];
      const tickers = Array.from(
        new Set(
          rawTickers
            .map((t: string) => String(t).trim().toUpperCase())
            .filter(Boolean)
        )
      );
      if (tickers.length === 0) {
        return NextResponse.json(
          { error: "Informe ao menos um ticker." },
          { status: 400 }
        );
      }

      const interval = body.interval ?? "1d";
      if (!["1d", "1h", "15m"].includes(interval)) {
        return NextResponse.json({ error: "Intervalo inválido." }, { status: 400 });
      }

      const config: PaperConfig = {
        tickers,
        interval,
        strategyId,
        params: { ...defaultParams(strategyId), ...(body.params ?? {}) },
        stopLossPct: Number(body.stopLossPct ?? 0),
        takeProfitPct: Number(body.takeProfitPct ?? 0),
        feePct: 0.0003,
        allocationPct: Number(body.allocationPct ?? 100),
      };

      const account = await startAccount(
        config,
        Number(body.initialCapital ?? 10000)
      );
      return NextResponse.json({ account });
    }

    if (action === "tick") {
      const acc = await loadAccount();
      if (!acc) return NextResponse.json({ account: null });
      const account = await processTick(acc);
      return NextResponse.json({ account });
    }

    if (action === "stop") {
      const acc = await loadAccount();
      if (acc) {
        acc.running = false;
        await saveAccount(acc);
      }
      return NextResponse.json({ account: acc });
    }

    if (action === "reset") {
      await resetAccount();
      return NextResponse.json({ account: null });
    }

    return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
  } catch (err) {
    console.error("Erro no paper trading:", err);
    const message =
      err instanceof Error ? err.message : "Falha no paper trading.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
