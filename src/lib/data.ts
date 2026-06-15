// Busca de dados históricos de ações da B3 via Yahoo Finance (gratuito).
//
// Tickers da B3 no Yahoo terminam em ".SA" (ex.: PETR4 -> PETR4.SA).
// Esta busca roda no SERVIDOR (rota de API) para evitar problemas de CORS.

import YahooFinance from "yahoo-finance2";
import { Candle } from "./types";

// A v3 da biblioteca é uma classe: instanciamos uma vez e reaproveitamos.
// `suppressNotices` evita mensagens promocionais no console.
const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

type Interval = "1d" | "1h" | "15m";

/**
 * Quanto histórico buscar para cada intervalo. O Yahoo limita o histórico
 * intradiário, então pedimos janelas compatíveis.
 */
const LOOKBACK_DAYS: Record<Interval, number> = {
  "1d": 365 * 2, // 2 anos de candles diários
  "1h": 180, // ~6 meses de candles de 1 hora
  "15m": 55, // ~55 dias de candles de 15 min (limite do Yahoo é ~60)
};

/** Normaliza "petr4" -> "PETR4.SA". Mantém ticker que já tem ponto/sufixo
 * (ex.: AAPL para EUA) e índices iniciados por "^" (ex.: ^BVSP). */
export function normalizeTicker(input: string): string {
  const t = input.trim().toUpperCase();
  if (!t) return t;
  if (t.startsWith("^") || t.includes(".")) return t;
  return `${t}.SA`;
}

/** Busca candles e devolve no formato interno (time em segundos UTC). */
export async function fetchCandles(
  ticker: string,
  interval: Interval
): Promise<Candle[]> {
  const symbol = normalizeTicker(ticker);
  const days = LOOKBACK_DAYS[interval];
  const period1 = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const result = await yahooFinance.chart(symbol, {
    period1,
    interval,
  });

  const quotes = result?.quotes ?? [];
  const candles: Candle[] = [];
  for (const q of quotes) {
    // Pula candles incompletos (acontece no candle em formação).
    if (
      q.date == null ||
      q.open == null ||
      q.high == null ||
      q.low == null ||
      q.close == null
    ) {
      continue;
    }
    candles.push({
      time: Math.floor(new Date(q.date).getTime() / 1000),
      open: q.open,
      high: q.high,
      low: q.low,
      close: q.close,
      volume: q.volume ?? 0,
    });
  }

  return candles;
}
