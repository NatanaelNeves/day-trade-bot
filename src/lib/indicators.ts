// Indicadores técnicos.
// Todos retornam um array do mesmo tamanho da entrada; posições sem dados
// suficientes ficam como `null`.

/** Média Móvel Simples (SMA). */
export function sma(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    out.push(i >= period - 1 ? sum / period : null);
  }
  return out;
}

/** Média Móvel Exponencial (EMA). Reage mais rápido que a SMA. */
export function ema(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (values.length < period) return out;

  const k = 2 / (period + 1);
  // Semente: SMA dos primeiros `period` valores.
  let sum = 0;
  for (let i = 0; i < period; i++) sum += values[i];
  let prev = sum / period;
  out[period - 1] = prev;

  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

/** Índice de Força Relativa (RSI / IFR), método de Wilder. Varia de 0 a 100. */
export function rsi(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (values.length <= period) return out;

  let gainSum = 0;
  let lossSum = 0;
  for (let i = 1; i <= period; i++) {
    const ch = values[i] - values[i - 1];
    if (ch >= 0) gainSum += ch;
    else lossSum -= ch;
  }
  let avgGain = gainSum / period;
  let avgLoss = lossSum / period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < values.length; i++) {
    const ch = values[i] - values[i - 1];
    const gain = ch > 0 ? ch : 0;
    const loss = ch < 0 ? -ch : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

/** MACD: linha MACD (emaFast - emaSlow), linha de sinal e histograma. */
export function macd(
  values: number[],
  fastPeriod: number,
  slowPeriod: number,
  signalPeriod: number
): {
  macd: (number | null)[];
  signal: (number | null)[];
  hist: (number | null)[];
} {
  const emaFast = ema(values, fastPeriod);
  const emaSlow = ema(values, slowPeriod);
  const macdLine: (number | null)[] = values.map((_, i) =>
    emaFast[i] != null && emaSlow[i] != null ? emaFast[i]! - emaSlow[i]! : null
  );

  const signal: (number | null)[] = new Array(values.length).fill(null);
  const start = macdLine.findIndex((v) => v != null);
  if (start >= 0 && values.length - start >= signalPeriod) {
    const k = 2 / (signalPeriod + 1);
    let sum = 0;
    for (let i = start; i < start + signalPeriod; i++) sum += macdLine[i]!;
    let prev = sum / signalPeriod;
    signal[start + signalPeriod - 1] = prev;
    for (let i = start + signalPeriod; i < values.length; i++) {
      prev = macdLine[i]! * k + prev * (1 - k);
      signal[i] = prev;
    }
  }

  const hist: (number | null)[] = values.map((_, i) =>
    macdLine[i] != null && signal[i] != null ? macdLine[i]! - signal[i]! : null
  );

  return { macd: macdLine, signal, hist };
}
