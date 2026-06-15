// Implementação das estratégias (gera sinais BUY/SELL/HOLD) e os grids usados
// na otimização de parâmetros. Roda no servidor.

import { Candle, SignalType } from "./types";
import { sma, ema, rsi, macd } from "./indicators";

type Params = Record<string, number>;

/** Detecta cruzamento de duas séries e gera sinais de compra/venda. */
function crossSignals(
  candles: Candle[],
  fastLine: (number | null)[],
  slowLine: (number | null)[]
): SignalType[] {
  const signals: SignalType[] = [];
  for (let i = 0; i < candles.length; i++) {
    const f = fastLine[i];
    const s = slowLine[i];
    const fPrev = fastLine[i - 1];
    const sPrev = slowLine[i - 1];
    if (i === 0 || f == null || s == null || fPrev == null || sPrev == null) {
      signals.push("HOLD");
      continue;
    }
    const prevDiff = fPrev - sPrev;
    const diff = f - s;
    if (prevDiff <= 0 && diff > 0) signals.push("BUY");
    else if (prevDiff >= 0 && diff < 0) signals.push("SELL");
    else signals.push("HOLD");
  }
  return signals;
}

/** Gera os sinais da estratégia escolhida. */
export function generateSignals(
  strategyId: string,
  candles: Candle[],
  params: Params
): SignalType[] {
  const closes = candles.map((c) => c.close);

  switch (strategyId) {
    case "sma_cross":
      return crossSignals(
        candles,
        sma(closes, params.fast),
        sma(closes, params.slow)
      );

    case "ema_cross":
      return crossSignals(
        candles,
        ema(closes, params.fast),
        ema(closes, params.slow)
      );

    case "rsi": {
      const r = rsi(closes, params.period);
      const signals: SignalType[] = [];
      for (let i = 0; i < candles.length; i++) {
        const v = r[i];
        const prev = r[i - 1];
        if (i === 0 || v == null || prev == null) {
          signals.push("HOLD");
          continue;
        }
        // Compra ao SAIR da sobrevenda; vende ao SAIR da sobrecompra.
        if (prev <= params.oversold && v > params.oversold) signals.push("BUY");
        else if (prev >= params.overbought && v < params.overbought)
          signals.push("SELL");
        else signals.push("HOLD");
      }
      return signals;
    }

    case "macd": {
      const m = macd(closes, params.fast, params.slow, params.signal);
      return crossSignals(candles, m.macd, m.signal);
    }

    case "breakout": {
      const n = params.period;
      const signals: SignalType[] = [];
      for (let i = 0; i < candles.length; i++) {
        if (i < n) {
          signals.push("HOLD");
          continue;
        }
        let highestHigh = -Infinity;
        let lowestLow = Infinity;
        for (let j = i - n; j < i; j++) {
          if (candles[j].high > highestHigh) highestHigh = candles[j].high;
          if (candles[j].low < lowestLow) lowestLow = candles[j].low;
        }
        if (candles[i].close > highestHigh) signals.push("BUY");
        else if (candles[i].close < lowestLow) signals.push("SELL");
        else signals.push("HOLD");
      }
      return signals;
    }

    default:
      throw new Error(`Estratégia desconhecida: ${strategyId}`);
  }
}

// --- Otimização ---------------------------------------------------------

/** Valores candidatos por parâmetro, por estratégia, para a busca em grade. */
const OPTIMIZE_GRID: Record<string, Record<string, number[]>> = {
  sma_cross: {
    fast: [5, 7, 9, 12, 15, 20],
    slow: [20, 30, 50, 100, 200],
  },
  ema_cross: {
    fast: [5, 7, 9, 12, 15, 20],
    slow: [20, 30, 50, 100, 200],
  },
  rsi: {
    period: [7, 14, 21],
    oversold: [20, 25, 30],
    overbought: [70, 75, 80],
  },
  macd: {
    fast: [8, 12],
    slow: [21, 26],
    signal: [9],
  },
  breakout: {
    period: [10, 15, 20, 30, 40, 55],
  },
};

/** Produz todas as combinações válidas de parâmetros para a otimização. */
export function optimizeCombos(strategyId: string): Params[] {
  const grid = OPTIMIZE_GRID[strategyId];
  if (!grid) return [];

  const keys = Object.keys(grid);
  let combos: Params[] = [{}];
  for (const key of keys) {
    const next: Params[] = [];
    for (const combo of combos) {
      for (const value of grid[key]) {
        next.push({ ...combo, [key]: value });
      }
    }
    combos = next;
  }

  // Regra de sanidade: em estratégias de média, a rápida deve ser < lenta.
  if (strategyId === "sma_cross" || strategyId === "ema_cross") {
    return combos.filter((c) => c.fast < c.slow);
  }
  if (strategyId === "macd") {
    return combos.filter((c) => c.fast < c.slow);
  }
  return combos;
}
