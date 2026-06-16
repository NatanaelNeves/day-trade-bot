// Rota de API do paper trading ao vivo (SEM ESTADO no servidor).
// O estado da carteira é mantido pelo cliente (localStorage) e enviado aqui.
//  - POST { action: "start", ...config } -> cria e devolve uma carteira nova
//  - POST { action: "tick", account }    -> processa e devolve a carteira
// Pausar/encerrar são feitos no cliente (não precisam do servidor).

import { NextRequest, NextResponse } from "next/server";
import { startAccount, processTick, PaperConfig, PaperAccount } from "@/lib/paper";
import { getStrategyMeta, defaultParams } from "@/lib/strategies.meta";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
      const account = body.account as PaperAccount | null;
      if (!account || !account.config) {
        return NextResponse.json({ account: null });
      }
      const updated = await processTick(account);
      return NextResponse.json({ account: updated });
    }

    return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
  } catch (err) {
    console.error("Erro no paper trading:", err);
    const message =
      err instanceof Error ? err.message : "Falha no paper trading.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
