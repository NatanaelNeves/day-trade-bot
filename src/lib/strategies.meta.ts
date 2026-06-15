// Metadados das estratégias — dados puros (sem lógica pesada), seguros para
// usar tanto no servidor quanto no cliente (interface).

export interface ParamSpec {
  key: string;
  label: string;
  default: number;
  min: number;
  max: number;
  step?: number;
}

export interface StrategyMeta {
  id: string;
  name: string;
  description: string;
  params: ParamSpec[];
}

export const STRATEGY_META: StrategyMeta[] = [
  {
    id: "sma_cross",
    name: "Cruzamento de Médias (SMA)",
    description:
      "Compra quando a média curta cruza para cima da longa; vende quando cruza para baixo. Segue tendência.",
    params: [
      { key: "fast", label: "Média rápida", default: 9, min: 2, max: 100 },
      { key: "slow", label: "Média lenta", default: 21, min: 3, max: 300 },
    ],
  },
  {
    id: "ema_cross",
    name: "Cruzamento de Médias (EMA)",
    description:
      "Igual ao SMA, mas com médias exponenciais — reagem mais rápido às mudanças de preço.",
    params: [
      { key: "fast", label: "Média rápida", default: 9, min: 2, max: 100 },
      { key: "slow", label: "Média lenta", default: 21, min: 3, max: 300 },
    ],
  },
  {
    id: "rsi",
    name: "IFR / RSI (sobrecompra e sobrevenda)",
    description:
      "Compra ao sair da zona de sobrevenda; vende ao sair da zona de sobrecompra. Busca reversões.",
    params: [
      { key: "period", label: "Período", default: 14, min: 2, max: 50 },
      { key: "oversold", label: "Sobrevendido", default: 30, min: 5, max: 45 },
      {
        key: "overbought",
        label: "Sobrecomprado",
        default: 70,
        min: 55,
        max: 95,
      },
    ],
  },
  {
    id: "macd",
    name: "MACD (convergência/divergência)",
    description:
      "Compra quando a linha MACD cruza para cima da linha de sinal; vende quando cruza para baixo.",
    params: [
      { key: "fast", label: "EMA rápida", default: 12, min: 2, max: 50 },
      { key: "slow", label: "EMA lenta", default: 26, min: 3, max: 100 },
      { key: "signal", label: "Linha de sinal", default: 9, min: 2, max: 50 },
    ],
  },
  {
    id: "breakout",
    name: "Rompimento (Donchian)",
    description:
      "Compra quando o preço rompe a máxima dos últimos N períodos; vende ao romper a mínima. Segue tendência forte.",
    params: [
      { key: "period", label: "Período do canal", default: 20, min: 5, max: 120 },
    ],
  },
];

export function getStrategyMeta(id: string): StrategyMeta | undefined {
  return STRATEGY_META.find((s) => s.id === id);
}

/** Parâmetros padrão de uma estratégia, como objeto { chave: valor }. */
export function defaultParams(id: string): Record<string, number> {
  const meta = getStrategyMeta(id);
  if (!meta) return {};
  return Object.fromEntries(meta.params.map((p) => [p.key, p.default]));
}
