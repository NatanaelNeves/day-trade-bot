// Motor de backtest (simulação com dinheiro fictício).
//
// Regras desta versão (mantidas simples de propósito):
//  - Apenas posições COMPRADAS (long). Não opera vendido.
//  - Ao receber BUY sem posição aberta: investe TODO o caixa disponível.
//  - Ao receber SELL com posição aberta: vende tudo.
//  - As ordens são executadas no FECHAMENTO do candle do sinal.
//  - Cada operação desconta uma taxa (corretagem/emolumentos) configurável.
//
// Isso é uma aproximação. No mundo real há slippage, fracionamento de lotes,
// horários de pregão etc. — mas para validar uma ideia já é muito útil.

import {
  Candle,
  SignalType,
  Trade,
  SignalMarker,
  BacktestResult,
  BacktestStats,
} from "./types";

export interface BacktestConfig {
  initialCapital: number;
  /** Custo por operação em fração (ex.: 0.0003 = 0,03%). */
  feePct: number;
  /** Stop-loss em % (0 = desativado). */
  stopLossPct?: number;
  /** Take-profit em % (0 = desativado). */
  takeProfitPct?: number;
  /** % do caixa usado por operação (100 = tudo). Padrão: 100. */
  allocationPct?: number;
}

export function runBacktest(
  ticker: string,
  candles: Candle[],
  signals: SignalType[],
  config: BacktestConfig
): BacktestResult {
  let cash = config.initialCapital;
  let shares = 0;
  let entryPrice = 0;
  let entryTime = 0;
  let entryIndex = -1;

  const stopLossPct = config.stopLossPct ?? 0;
  const takeProfitPct = config.takeProfitPct ?? 0;
  const allocationPct = config.allocationPct ?? 100;

  const trades: Trade[] = [];
  const markers: SignalMarker[] = [];
  const equityCurve: { time: number; value: number }[] = [];

  const closePosition = (time: number, price: number, reason: string) => {
    const gross = shares * price;
    const fee = gross * config.feePct;
    const proceeds = gross - fee;
    const cost = shares * entryPrice;
    const pnl = proceeds - cost;
    trades.push({
      entryTime,
      entryPrice,
      exitTime: time,
      exitPrice: price,
      shares,
      pnl,
      pnlPct: cost > 0 ? (pnl / cost) * 100 : 0,
      reason,
    });
    cash += proceeds; // soma ao caixa (pode haver caixa retido com alocação < 100%)
    shares = 0;
  };

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const sig = signals[i];

    // 1) Saídas por gestão de risco (só com posição aberta e após o candle de
    //    entrada). Usa a mínima/máxima do candle para simular o disparo.
    if (shares > 0 && i > entryIndex) {
      let exited = false;
      if (stopLossPct > 0) {
        const stopPrice = entryPrice * (1 - stopLossPct / 100);
        if (c.low <= stopPrice) {
          closePosition(c.time, stopPrice, "Stop-loss");
          markers.push({ time: c.time, type: "SELL", price: stopPrice });
          exited = true;
        }
      }
      if (!exited && takeProfitPct > 0) {
        const targetPrice = entryPrice * (1 + takeProfitPct / 100);
        if (c.high >= targetPrice) {
          closePosition(c.time, targetPrice, "Take-profit");
          markers.push({ time: c.time, type: "SELL", price: targetPrice });
          exited = true;
        }
      }
      if (exited) {
        equityCurve.push({ time: c.time, value: cash });
        continue; // não reentra no mesmo candle
      }
    }

    // 2) Entradas/saídas por sinal da estratégia, executadas no fechamento.
    if (sig === "BUY" && shares === 0) {
      const spend = cash * (allocationPct / 100);
      const fee = spend * config.feePct;
      shares = (spend - fee) / c.close;
      entryPrice = c.close;
      entryTime = c.time;
      entryIndex = i;
      cash -= spend;
      markers.push({ time: c.time, type: "BUY", price: c.close });
    } else if (sig === "SELL" && shares > 0) {
      closePosition(c.time, c.close, "Sinal de venda");
      markers.push({ time: c.time, type: "SELL", price: c.close });
    }

    const equity = cash + shares * c.close;
    equityCurve.push({ time: c.time, value: equity });
  }

  // Fecha posição aberta no último candle, para fechar a conta.
  if (shares > 0 && candles.length > 0) {
    const last = candles[candles.length - 1];
    closePosition(last.time, last.close, "Fim do período");
    markers.push({ time: last.time, type: "SELL", price: last.close });
  }

  const stats = computeStats(candles, trades, equityCurve, config.initialCapital);
  return { ticker, candles, trades, markers, equityCurve, stats };
}

function computeStats(
  candles: Candle[],
  trades: Trade[],
  equityCurve: { time: number; value: number }[],
  initialCapital: number
): BacktestStats {
  const finalEquity =
    equityCurve.length > 0
      ? equityCurve[equityCurve.length - 1].value
      : initialCapital;

  const totalReturnPct = ((finalEquity - initialCapital) / initialCapital) * 100;

  // Comprar e segurar: compra no primeiro candle, vende no último.
  const buyHoldReturnPct =
    candles.length > 1
      ? ((candles[candles.length - 1].close - candles[0].close) /
          candles[0].close) *
        100
      : 0;

  const winningTrades = trades.filter((t) => t.pnl > 0).length;
  const losingTrades = trades.filter((t) => t.pnl <= 0).length;
  const winRatePct =
    trades.length > 0 ? (winningTrades / trades.length) * 100 : 0;
  const avgPnlPct =
    trades.length > 0
      ? trades.reduce((s, t) => s + t.pnlPct, 0) / trades.length
      : 0;

  // Máximo drawdown: maior queda do pico ao vale na curva de capital.
  let peak = -Infinity;
  let maxDrawdownPct = 0;
  for (const point of equityCurve) {
    if (point.value > peak) peak = point.value;
    const dd = peak > 0 ? ((point.value - peak) / peak) * 100 : 0;
    if (dd < maxDrawdownPct) maxDrawdownPct = dd;
  }

  return {
    initialCapital,
    finalEquity,
    totalReturnPct,
    buyHoldReturnPct,
    totalTrades: trades.length,
    winningTrades,
    losingTrades,
    winRatePct,
    maxDrawdownPct,
    avgPnlPct,
  };
}
