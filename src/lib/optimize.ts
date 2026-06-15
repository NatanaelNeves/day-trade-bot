// Otimização por busca em grade: roda o backtest para cada combinação de
// parâmetros da estratégia e devolve as melhores por retorno.
//
// ⚠️ Cuidado com "overfitting": a combinação que melhor se saiu no passado não
// necessariamente se sairá bem no futuro. Use como ponto de partida, não como
// garantia.

import { Candle, OptimizeResult } from "./types";
import { generateSignals, optimizeCombos } from "./strategies";
import { runBacktest, BacktestConfig } from "./backtest";

export function optimize(
  ticker: string,
  candles: Candle[],
  strategyId: string,
  config: BacktestConfig,
  topN = 8
): OptimizeResult[] {
  const combos = optimizeCombos(strategyId);
  const results: OptimizeResult[] = [];

  for (const params of combos) {
    const signals = generateSignals(strategyId, candles, params);
    const r = runBacktest(ticker, candles, signals, config);
    results.push({
      params,
      totalReturnPct: r.stats.totalReturnPct,
      buyHoldReturnPct: r.stats.buyHoldReturnPct,
      maxDrawdownPct: r.stats.maxDrawdownPct,
      totalTrades: r.stats.totalTrades,
      winRatePct: r.stats.winRatePct,
    });
  }

  results.sort((a, b) => b.totalReturnPct - a.totalReturnPct);
  return results.slice(0, topN);
}
