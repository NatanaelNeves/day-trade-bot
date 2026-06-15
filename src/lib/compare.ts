// Comparação lado a lado: roda TODAS as estratégias no mesmo ativo/período
// (cada uma com seus parâmetros padrão) e ranqueia por retorno.

import { Candle, CompareResult } from "./types";
import { STRATEGY_META, defaultParams } from "./strategies.meta";
import { generateSignals } from "./strategies";
import { runBacktest, BacktestConfig } from "./backtest";

const avg = (xs: number[]) =>
  xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0;

export function compareStrategies(
  ticker: string,
  candles: Candle[],
  config: BacktestConfig
): CompareResult[] {
  const results: CompareResult[] = [];

  for (const meta of STRATEGY_META) {
    const params = defaultParams(meta.id);
    const signals = generateSignals(meta.id, candles, params);
    const r = runBacktest(ticker, candles, signals, config);
    results.push({
      strategyId: meta.id,
      strategyName: meta.name,
      totalReturnPct: r.stats.totalReturnPct,
      buyHoldReturnPct: r.stats.buyHoldReturnPct,
      maxDrawdownPct: r.stats.maxDrawdownPct,
      totalTrades: r.stats.totalTrades,
      winRatePct: r.stats.winRatePct,
    });
  }

  results.sort((a, b) => b.totalReturnPct - a.totalReturnPct);
  return results;
}

/** Compara estratégias num PORTFÓLIO: para cada estratégia, roda o backtest em
 *  cada ativo e devolve a MÉDIA dos resultados. Útil antes do paper trading. */
export function comparePortfolio(
  basket: { ticker: string; candles: Candle[] }[],
  config: BacktestConfig
): CompareResult[] {
  const results: CompareResult[] = [];

  for (const meta of STRATEGY_META) {
    const params = defaultParams(meta.id);
    const returns: number[] = [];
    const buyHolds: number[] = [];
    const drawdowns: number[] = [];
    const winRates: number[] = [];
    let trades = 0;

    for (const { ticker, candles } of basket) {
      const signals = generateSignals(meta.id, candles, params);
      const r = runBacktest(ticker, candles, signals, config);
      returns.push(r.stats.totalReturnPct);
      buyHolds.push(r.stats.buyHoldReturnPct);
      drawdowns.push(r.stats.maxDrawdownPct);
      winRates.push(r.stats.winRatePct);
      trades += r.stats.totalTrades;
    }

    results.push({
      strategyId: meta.id,
      strategyName: meta.name,
      totalReturnPct: avg(returns),
      buyHoldReturnPct: avg(buyHolds),
      maxDrawdownPct: avg(drawdowns),
      totalTrades: trades,
      winRatePct: avg(winRates),
    });
  }

  results.sort((a, b) => b.totalReturnPct - a.totalReturnPct);
  return results;
}
