// Motor de "paper trading" ao vivo — agora um PORTFÓLIO de vários ativos.
// Carteira FICTÍCIA que roda a mesma estratégia em cada ativo, em tempo real.
// O estado é guardado num arquivo JSON, sobrevivendo a recarregamentos.
//
// Tempo real: a página chama /api/paper (ação "tick") a cada poucos segundos.
// Cada tick busca os candles recentes de cada ativo, processa os candles que
// FECHARAM desde o último tick (gerando ordens) e marca a mercado o patrimônio.
//
// Tamanho de posição: cada compra usa uma fração do PATRIMÔNIO (allocationPct),
// limitada pelo caixa disponível. Ex.: 25% permite até ~4 posições simultâneas.

import fs from "fs/promises";
import path from "path";
import { Candle } from "./types";
import { fetchCandles } from "./data";
import { generateSignals } from "./strategies";

export interface PaperConfig {
  tickers: string[];
  interval: "1d" | "1h" | "15m";
  strategyId: string;
  params: Record<string, number>;
  stopLossPct: number;
  takeProfitPct: number;
  feePct: number;
  /** % do patrimônio por posição (100 = tudo num ativo só). */
  allocationPct: number;
}

export interface PaperOrder {
  time: number;
  ticker: string;
  side: "BUY" | "SELL";
  price: number;
  shares: number;
  reason: string;
}

export interface PaperPosition {
  ticker: string;
  shares: number;
  entryPrice: number;
  entryTime: number;
}

export interface PaperAccount {
  config: PaperConfig;
  initialCapital: number;
  cash: number;
  positions: Record<string, PaperPosition>;
  lastPrices: Record<string, number>;
  orders: PaperOrder[];
  equityCurve: { time: number; value: number }[];
  lastUpdate: number | null;
  lastProcessedCandleTime: Record<string, number>;
  running: boolean;
  marketNote: string | null;
  createdAt: number;
}

const FILE = path.join(process.cwd(), "paper-account.json");
const nowSec = () => Math.floor(Date.now() / 1000);

// --- Persistência -------------------------------------------------------

export async function loadAccount(): Promise<PaperAccount | null> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    return JSON.parse(raw) as PaperAccount;
  } catch {
    return null;
  }
}

export async function saveAccount(acc: PaperAccount): Promise<void> {
  await fs.writeFile(FILE, JSON.stringify(acc), "utf8");
}

export async function resetAccount(): Promise<void> {
  try {
    await fs.unlink(FILE);
  } catch {
    /* arquivo já não existe */
  }
}

// --- Cálculos -----------------------------------------------------------

/** Patrimônio = caixa + valor de todas as posições marcadas a mercado. */
function equityOf(acc: PaperAccount): number {
  let total = acc.cash;
  for (const pos of Object.values(acc.positions)) {
    const price = acc.lastPrices[pos.ticker] ?? pos.entryPrice;
    total += pos.shares * price;
  }
  return total;
}

function upsertEquity(acc: PaperAccount, time: number, value: number) {
  const last = acc.equityCurve[acc.equityCurve.length - 1];
  if (last && last.time === time) last.value = value;
  else if (!last || time > last.time) acc.equityCurve.push({ time, value });
}

function openPosition(
  acc: PaperAccount,
  ticker: string,
  price: number,
  time: number
) {
  if (acc.positions[ticker]) return; // já tem posição nesse ativo
  const target = equityOf(acc) * (acc.config.allocationPct / 100);
  const spend = Math.min(target, acc.cash);
  if (spend <= 0.01 || price <= 0) return; // sem caixa para alocar
  const fee = spend * acc.config.feePct;
  const shares = (spend - fee) / price;
  acc.positions[ticker] = { ticker, shares, entryPrice: price, entryTime: time };
  acc.cash -= spend;
  acc.orders.push({
    time,
    ticker,
    side: "BUY",
    price,
    shares,
    reason: "Sinal de compra",
  });
}

function closePosition(
  acc: PaperAccount,
  ticker: string,
  price: number,
  time: number,
  reason: string
) {
  const pos = acc.positions[ticker];
  if (!pos) return;
  const gross = pos.shares * price;
  const fee = gross * acc.config.feePct;
  acc.cash += gross - fee;
  acc.orders.push({
    time,
    ticker,
    side: "SELL",
    price,
    shares: pos.shares,
    reason,
  });
  delete acc.positions[ticker];
}

/** Stop-loss / take-profit para um ativo, usando mínima/máxima do candle. */
function applyRisk(acc: PaperAccount, ticker: string, candle: Candle): boolean {
  const pos = acc.positions[ticker];
  if (!pos) return false;
  const { stopLossPct, takeProfitPct } = acc.config;
  if (stopLossPct > 0) {
    const stop = pos.entryPrice * (1 - stopLossPct / 100);
    if (candle.low <= stop) {
      closePosition(acc, ticker, stop, candle.time, "Stop-loss");
      return true;
    }
  }
  if (takeProfitPct > 0) {
    const target = pos.entryPrice * (1 + takeProfitPct / 100);
    if (candle.high >= target) {
      closePosition(acc, ticker, target, candle.time, "Take-profit");
      return true;
    }
  }
  return false;
}

/** Aproximação do pregão da B3 (seg–sex, ~10h–17h BRT = 13h–20h UTC). */
function isMarketLikelyOpen(): boolean {
  const d = new Date();
  const day = d.getUTCDay();
  if (day === 0 || day === 6) return false;
  const h = d.getUTCHours() + d.getUTCMinutes() / 60;
  return h >= 13 && h <= 20.1;
}

// --- API do motor -------------------------------------------------------

export async function startAccount(
  config: PaperConfig,
  initialCapital: number
): Promise<PaperAccount> {
  const lastProcessedCandleTime: Record<string, number> = {};
  const lastPrices: Record<string, number> = {};
  let maxLiveTime = 0;

  const fetched = await Promise.all(
    config.tickers.map(async (t) => ({
      t,
      candles: await fetchCandles(t, config.interval),
    }))
  );

  for (const { t, candles } of fetched) {
    if (candles.length < 2) {
      throw new Error(`Dados insuficientes para ${t}.`);
    }
    const live = candles[candles.length - 1];
    const lastClosed = candles[candles.length - 2];
    lastProcessedCandleTime[t] = lastClosed.time;
    lastPrices[t] = live.close;
    if (live.time > maxLiveTime) maxLiveTime = live.time;
  }

  const acc: PaperAccount = {
    config,
    initialCapital,
    cash: initialCapital,
    positions: {},
    lastPrices,
    orders: [],
    equityCurve: [{ time: maxLiveTime, value: initialCapital }],
    lastUpdate: nowSec(),
    lastProcessedCandleTime,
    running: true,
    marketNote: isMarketLikelyOpen() ? null : "Mercado provavelmente fechado.",
    createdAt: nowSec(),
  };
  await saveAccount(acc);
  return acc;
}

export async function processTick(acc: PaperAccount): Promise<PaperAccount> {
  if (!acc.running) return acc;

  const fetched = await Promise.all(
    acc.config.tickers.map(async (t) => {
      try {
        return { t, candles: await fetchCandles(t, acc.config.interval) };
      } catch {
        return { t, candles: [] as Candle[] };
      }
    })
  );

  let maxLiveTime = 0;
  const failed: string[] = [];

  for (const { t, candles } of fetched) {
    if (candles.length < 2) {
      failed.push(t);
      continue;
    }
    const signals = generateSignals(
      acc.config.strategyId,
      candles,
      acc.config.params
    );
    const lastIndex = candles.length - 1;
    const live = candles[lastIndex];

    for (let i = 0; i < lastIndex; i++) {
      const c = candles[i];
      const processed = acc.lastProcessedCandleTime[t];
      if (processed != null && c.time <= processed) continue;
      applyRisk(acc, t, c);
      const sig = signals[i];
      if (sig === "BUY") openPosition(acc, t, c.close, c.time);
      else if (sig === "SELL") closePosition(acc, t, c.close, c.time, "Sinal de venda");
      acc.lastProcessedCandleTime[t] = c.time;
    }

    acc.lastPrices[t] = live.close;
    applyRisk(acc, t, live);
    if (live.time > maxLiveTime) maxLiveTime = live.time;
  }

  acc.lastUpdate = nowSec();
  if (maxLiveTime > 0) upsertEquity(acc, maxLiveTime, equityOf(acc));

  if (failed.length > 0) {
    acc.marketNote = `Sem dados para: ${failed.join(", ")}.`;
  } else {
    acc.marketNote = isMarketLikelyOpen()
      ? null
      : "Mercado provavelmente fechado — preços parados até o próximo pregão.";
  }

  await saveAccount(acc);
  return acc;
}
