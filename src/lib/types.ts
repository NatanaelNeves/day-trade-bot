// Tipos compartilhados por todo o bot.

/** Um candle (vela) de preço: abertura, máxima, mínima, fechamento e volume. */
export interface Candle {
  /** Timestamp UNIX em segundos (UTC) — formato que o gráfico espera. */
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/** Sinal gerado pela estratégia em cada candle. */
export type SignalType = "BUY" | "SELL" | "HOLD";

/** Uma operação completa (entrada + saída). */
export interface Trade {
  entryTime: number;
  entryPrice: number;
  exitTime: number;
  exitPrice: number;
  /** Quantidade de ações compradas. */
  shares: number;
  /** Lucro/prejuízo em R$. */
  pnl: number;
  /** Lucro/prejuízo em %. */
  pnlPct: number;
  /** Motivo da saída (ex.: "Sinal de venda", "Fim do período"). */
  reason: string;
}

/** Marcador de compra/venda para desenhar no gráfico. */
export interface SignalMarker {
  time: number;
  type: "BUY" | "SELL";
  price: number;
}

/** Estatísticas resumidas do backtest. */
export interface BacktestStats {
  initialCapital: number;
  finalEquity: number;
  totalReturnPct: number;
  /** Retorno de "comprar e segurar" no mesmo período, para comparação. */
  buyHoldReturnPct: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRatePct: number;
  /** Maior queda do pico ao vale na curva de capital, em %. */
  maxDrawdownPct: number;
  avgPnlPct: number;
}

/** Resultado completo de um backtest. */
export interface BacktestResult {
  ticker: string;
  candles: Candle[];
  trades: Trade[];
  markers: SignalMarker[];
  equityCurve: { time: number; value: number }[];
  stats: BacktestStats;
}

/** Parâmetros que o usuário escolhe na interface. */
export interface BacktestParams {
  ticker: string;
  interval: "1d" | "1h" | "15m";
  /** Id da estratégia (ver strategies.meta.ts). */
  strategyId: string;
  /** Parâmetros específicos da estratégia, ex.: { fast: 9, slow: 21 }. */
  params: Record<string, number>;
  initialCapital: number;
  /** Custo por operação em fração (ex.: 0.0003 = 0,03%). */
  feePct: number;
  /** Stop-loss em % (0 = desativado). Encerra a operação na perda. */
  stopLossPct: number;
  /** Take-profit em % (0 = desativado). Encerra a operação no lucro. */
  takeProfitPct: number;
  /** % do capital alocado por operação (100 = tudo). */
  allocationPct: number;
}

/** Resultado de uma combinação de parâmetros na otimização. */
export interface OptimizeResult {
  params: Record<string, number>;
  totalReturnPct: number;
  buyHoldReturnPct: number;
  maxDrawdownPct: number;
  totalTrades: number;
  winRatePct: number;
}

/** Resultado de uma estratégia na comparação lado a lado. */
export interface CompareResult {
  strategyId: string;
  strategyName: string;
  totalReturnPct: number;
  buyHoldReturnPct: number;
  maxDrawdownPct: number;
  totalTrades: number;
  winRatePct: number;
}
