"use client";

import { useEffect, useState } from "react";
import PriceChart from "@/components/PriceChart";
import EquityChart from "@/components/EquityChart";
import { BacktestResult, OptimizeResult, CompareResult } from "@/lib/types";
import { B3_TICKERS, POPULAR_TICKERS } from "@/lib/tickers";
import {
  STRATEGY_META,
  getStrategyMeta,
  defaultParams,
} from "@/lib/strategies.meta";
import { toCsv, downloadCsv } from "@/lib/csv";
import {
  Badge,
  Banner,
  Button,
  Card,
  EmptyState,
  Field,
  SectionHeader,
  Skeleton,
  Stat,
  cn,
} from "@/components/ui";

interface Favorite {
  name: string;
  ticker: string;
  interval: "1d" | "1h" | "15m";
  strategyId: string;
  params: Record<string, number>;
  initialCapital: number;
  stopLoss: number;
  takeProfit: number;
  allocationPct: number;
}

const FAVORITES_KEY = "daytradebot:favorites";

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const pct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;

const fmtDate = (t: number) =>
  new Date(t * 1000).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });

const PlayIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M8 5v14l11-7z" />
  </svg>
);
const DownloadIcon = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" />
  </svg>
);

const GroupLabel = ({ children }: { children: React.ReactNode }) => (
  <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-faint">
    {children}
  </div>
);

export default function Home() {
  const [ticker, setTicker] = useState("PETR4");
  const [interval, setInterval] = useState<"1d" | "1h" | "15m">("1d");
  const [strategyId, setStrategyId] = useState("sma_cross");
  const [params, setParams] = useState<Record<string, number>>(
    defaultParams("sma_cross")
  );
  const [initialCapital, setInitialCapital] = useState(10000);
  const [stopLoss, setStopLoss] = useState(0);
  const [takeProfit, setTakeProfit] = useState(0);
  const [allocationPct, setAllocationPct] = useState(100);

  const [loading, setLoading] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [optimizeResults, setOptimizeResults] = useState<
    OptimizeResult[] | null
  >(null);
  const [compareResults, setCompareResults] = useState<CompareResult[] | null>(
    null
  );
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [favName, setFavName] = useState("");

  const meta = getStrategyMeta(strategyId)!;

  function changeStrategy(id: string) {
    setStrategyId(id);
    setParams(defaultParams(id));
    setOptimizeResults(null);
  }

  const fmtParams = (p: Record<string, number>) =>
    meta.params.map((spec) => `${spec.label}: ${p[spec.key]}`).join(" · ");

  // --- Favoritos (salvos no navegador) ---
  useEffect(() => {
    try {
      const raw = localStorage.getItem(FAVORITES_KEY);
      if (raw) setFavorites(JSON.parse(raw));
    } catch {
      /* ignora */
    }
  }, []);

  function persistFavorites(list: Favorite[]) {
    setFavorites(list);
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(list));
    } catch {
      /* ignora */
    }
  }

  function saveFavorite() {
    const name = favName.trim();
    if (!name) return;
    const fav: Favorite = {
      name,
      ticker,
      interval,
      strategyId,
      params,
      initialCapital,
      stopLoss,
      takeProfit,
      allocationPct,
    };
    persistFavorites([...favorites.filter((f) => f.name !== name), fav]);
    setFavName("");
  }

  function loadFavorite(f: Favorite) {
    setTicker(f.ticker);
    setInterval(f.interval);
    setStrategyId(f.strategyId);
    setParams(f.params);
    setInitialCapital(f.initialCapital);
    setStopLoss(f.stopLoss);
    setTakeProfit(f.takeProfit);
    setAllocationPct(f.allocationPct);
  }

  function deleteFavorite(name: string) {
    persistFavorites(favorites.filter((f) => f.name !== name));
  }

  // --- Exportações CSV ---
  function exportTrades() {
    if (!result) return;
    const headers = [
      "Entrada",
      "Saida",
      "Preco entrada",
      "Preco saida",
      "Acoes",
      "Motivo",
      "Resultado (R$)",
      "Resultado (%)",
    ];
    const rows = result.trades.map((t) => [
      fmtDate(t.entryTime),
      fmtDate(t.exitTime),
      t.entryPrice.toFixed(2),
      t.exitPrice.toFixed(2),
      t.shares.toFixed(2),
      t.reason,
      t.pnl.toFixed(2),
      t.pnlPct.toFixed(2),
    ]);
    downloadCsv(`${result.ticker}-operacoes.csv`, toCsv(headers, rows));
  }

  function exportCompare() {
    if (!compareResults) return;
    const headers = [
      "Estrategia",
      "Retorno (%)",
      "Comprar e segurar (%)",
      "Drawdown (%)",
      "Operacoes",
      "Acerto (%)",
    ];
    const rows = compareResults.map((r) => [
      r.strategyName,
      r.totalReturnPct.toFixed(2),
      r.buyHoldReturnPct.toFixed(2),
      r.maxDrawdownPct.toFixed(2),
      r.totalTrades,
      r.winRatePct.toFixed(1),
    ]);
    downloadCsv(`${ticker}-comparacao.csv`, toCsv(headers, rows));
  }

  function exportOptimize() {
    if (!optimizeResults) return;
    const headers = [
      "Parametros",
      "Retorno (%)",
      "Drawdown (%)",
      "Operacoes",
      "Acerto (%)",
    ];
    const rows = optimizeResults.map((r) => [
      fmtParams(r.params),
      r.totalReturnPct.toFixed(2),
      r.maxDrawdownPct.toFixed(2),
      r.totalTrades,
      r.winRatePct.toFixed(1),
    ]);
    downloadCsv(`${ticker}-otimizacao.csv`, toCsv(headers, rows));
  }

  async function runBacktest(opts?: {
    ticker?: string;
    strategyId?: string;
    params?: Record<string, number>;
  }) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/backtest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker: opts?.ticker ?? ticker,
          interval,
          strategyId: opts?.strategyId ?? strategyId,
          params: opts?.params ?? params,
          initialCapital,
          feePct: 0.0003,
          stopLossPct: stopLoss,
          takeProfitPct: takeProfit,
          allocationPct,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro desconhecido.");
      setResult(data as BacktestResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro inesperado.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  async function runOptimize() {
    setOptimizing(true);
    setError(null);
    try {
      const res = await fetch("/api/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker,
          interval,
          strategyId,
          initialCapital,
          feePct: 0.0003,
          stopLossPct: stopLoss,
          takeProfitPct: takeProfit,
          allocationPct,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro desconhecido.");
      setOptimizeResults(data.results as OptimizeResult[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setOptimizing(false);
    }
  }

  function applyParams(p: Record<string, number>) {
    setParams(p);
    runBacktest({ params: p });
  }

  async function runCompare() {
    setComparing(true);
    setError(null);
    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker,
          interval,
          initialCapital,
          feePct: 0.0003,
          stopLossPct: stopLoss,
          takeProfitPct: takeProfit,
          allocationPct,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro desconhecido.");
      setCompareResults(data.results as CompareResult[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setComparing(false);
    }
  }

  function useStrategy(id: string) {
    const p = defaultParams(id);
    setStrategyId(id);
    setParams(p);
    setOptimizeResults(null);
    runBacktest({ strategyId: id, params: p });
  }

  const s = result?.stats;
  const beatBuyHold = s && s.totalReturnPct > s.buyHoldReturnPct;
  const busy = loading || optimizing || comparing;
  const idle = !loading && !result && !compareResults && !optimizeResults;

  return (
    <main className="mx-auto max-w-6xl px-4 pb-20 pt-8">
      {/* Cabeçalho */}
      <header className="mb-6">
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-semibold tracking-tight">Backtest</h1>
          <Badge tone="accent">simulação</Badge>
        </div>
        <p className="mt-1.5 text-sm text-muted">
          Teste estratégias em ações da B3 com dados reais e dinheiro fictício.
        </p>
      </header>

      <div className="mb-6">
        <Banner tone="warn">
          <strong>Modo simulação.</strong> Resultados passados não garantem lucro
          futuro — day trade tem risco alto e a maioria perde dinheiro. Use para
          aprender e validar ideias.
        </Banner>
      </div>

      {/* Configuração */}
      <Card className="mb-4 p-5">
        <GroupLabel>Ativo e período</GroupLabel>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <Field label="Ticker">
            <input
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              placeholder="PETR4"
              list="b3-tickers"
              className="input"
            />
            <datalist id="b3-tickers">
              {B3_TICKERS.map((t) => (
                <option key={t.symbol} value={t.symbol}>
                  {t.name} · {t.sector}
                </option>
              ))}
            </datalist>
          </Field>
          <Field label="Intervalo">
            <select
              value={interval}
              onChange={(e) =>
                setInterval(e.target.value as "1d" | "1h" | "15m")
              }
              className="input"
            >
              <option value="1d">Diário</option>
              <option value="1h">1 hora</option>
              <option value="15m">15 min (intraday)</option>
            </select>
          </Field>
          <Field label="Capital (R$)">
            <input
              type="number"
              min={100}
              step={100}
              value={initialCapital}
              onChange={(e) => setInitialCapital(Number(e.target.value))}
              className="input tnum"
            />
          </Field>
        </div>

        <div className="mt-5 border-t border-line pt-5">
          <GroupLabel>Estratégia e parâmetros</GroupLabel>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Field label="Estratégia">
              <select
                value={strategyId}
                onChange={(e) => changeStrategy(e.target.value)}
                className="input"
              >
                {STRATEGY_META.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name}
                  </option>
                ))}
              </select>
            </Field>
            {meta.params.map((spec) => (
              <Field key={spec.key} label={spec.label}>
                <input
                  type="number"
                  min={spec.min}
                  max={spec.max}
                  step={spec.step ?? 1}
                  value={params[spec.key] ?? spec.default}
                  onChange={(e) =>
                    setParams((prev) => ({
                      ...prev,
                      [spec.key]: Number(e.target.value),
                    }))
                  }
                  className="input tnum"
                />
              </Field>
            ))}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted">
            {meta.description}
          </p>
        </div>

        <div className="mt-5 border-t border-line pt-5">
          <GroupLabel>Gestão de risco e posição</GroupLabel>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <Field label="Stop-loss (%)" hint="0 = desligado">
              <input
                type="number"
                min={0}
                step={0.5}
                value={stopLoss}
                onChange={(e) => setStopLoss(Number(e.target.value))}
                className="input tnum"
              />
            </Field>
            <Field label="Take-profit (%)" hint="0 = desligado">
              <input
                type="number"
                min={0}
                step={0.5}
                value={takeProfit}
                onChange={(e) => setTakeProfit(Number(e.target.value))}
                className="input tnum"
              />
            </Field>
            <Field label="Tamanho da posição (%)" hint="% do capital por operação">
              <input
                type="number"
                min={1}
                max={100}
                step={5}
                value={allocationPct}
                onChange={(e) => setAllocationPct(Number(e.target.value))}
                className="input tnum"
              />
            </Field>
          </div>
        </div>

        {/* Ações */}
        <div className="mt-5 flex flex-wrap gap-2.5 border-t border-line pt-5">
          <Button
            variant="primary"
            onClick={() => runBacktest()}
            loading={loading}
            disabled={busy}
            icon={<PlayIcon />}
          >
            Rodar backtest
          </Button>
          <Button
            variant="outline"
            onClick={runOptimize}
            loading={optimizing}
            disabled={busy}
          >
            🔎 Otimizar parâmetros
          </Button>
          <Button
            variant="outline"
            onClick={runCompare}
            loading={comparing}
            disabled={busy}
          >
            ⚖️ Comparar estratégias
          </Button>
        </div>
      </Card>

      {/* Atalhos + Favoritos */}
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <Card className="p-4">
          <div className="mb-2.5 text-xs font-medium text-muted">
            Atalhos populares
          </div>
          <div className="flex flex-wrap gap-2">
            {POPULAR_TICKERS.map((sym) => (
              <button
                key={sym}
                onClick={() => {
                  setTicker(sym);
                  runBacktest({ ticker: sym });
                }}
                disabled={busy}
                className={cn(
                  "chip disabled:opacity-50",
                  ticker === sym && "chip-active"
                )}
              >
                {sym}
              </button>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <div className="mb-2.5 text-xs font-medium text-muted">
            Configurações favoritas
          </div>
          <div className="flex gap-2">
            <input
              value={favName}
              onChange={(e) => setFavName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveFavorite();
              }}
              placeholder="Nome (ex.: PETR4 MACD 15m)"
              className="input"
            />
            <Button
              variant="secondary"
              onClick={saveFavorite}
              disabled={!favName.trim()}
            >
              Salvar
            </Button>
          </div>
          {favorites.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {favorites.map((f) => (
                <span key={f.name} className="chip group">
                  <button
                    onClick={() => loadFavorite(f)}
                    className="flex items-center gap-1"
                    title="Carregar esta configuração"
                  >
                    <span className="text-warn">★</span> {f.name}
                  </button>
                  <button
                    onClick={() => deleteFavorite(f.name)}
                    className="ml-0.5 text-faint transition-colors hover:text-neg"
                    aria-label={`Excluir ${f.name}`}
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-[11px] text-faint">
              Salve a configuração atual para reabrir depois com um clique.
            </p>
          )}
        </Card>
      </div>

      {/* Erro */}
      {error && (
        <div className="animate-in mb-6">
          <Banner tone="error">{error}</Banner>
        </div>
      )}

      {/* Comparação de estratégias */}
      {compareResults && (
        <Card className="animate-in mb-6 p-5">
          <SectionHeader
            title={<>⚖️ Comparação de estratégias · {ticker}</>}
            subtitle={
              <>
                Cada estratégia com parâmetros padrão, no mesmo período. Comprar e
                segurar:{" "}
                <strong className="text-fg">
                  {pct(compareResults[0]?.buyHoldReturnPct ?? 0)}
                </strong>
              </>
            }
            action={
              <Button variant="outline" size="sm" onClick={exportCompare} icon={<DownloadIcon />}>
                CSV
              </Button>
            }
          />
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Estratégia</th>
                  <th>Retorno</th>
                  <th>Drawdown</th>
                  <th>Operações</th>
                  <th>Acerto</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {compareResults.map((r, i) => {
                  const beat = r.totalReturnPct > r.buyHoldReturnPct;
                  return (
                    <tr key={r.strategyId}>
                      <td>
                        <div className="flex items-center gap-2">
                          {i === 0 && <span title="Melhor">🏆</span>}
                          <span className="font-medium text-fg">
                            {r.strategyName}
                          </span>
                          {beat && <Badge tone="pos">supera B&amp;H</Badge>}
                        </div>
                      </td>
                      <td
                        className={cn(
                          "tnum font-medium",
                          r.totalReturnPct >= 0 ? "text-pos" : "text-neg"
                        )}
                      >
                        {pct(r.totalReturnPct)}
                      </td>
                      <td className="tnum text-neg">{pct(r.maxDrawdownPct)}</td>
                      <td className="tnum">{r.totalTrades}</td>
                      <td className="tnum">{r.winRatePct.toFixed(0)}%</td>
                      <td>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => useStrategy(r.strategyId)}
                          disabled={busy}
                        >
                          Usar
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Resultados da otimização */}
      {optimizeResults && (
        <Card className="animate-in mb-6 p-5">
          <SectionHeader
            title={<>🔎 Melhores combinações · {ticker}</>}
            subtitle="Ordenado por retorno passado. ⚠️ O melhor do passado pode não repetir (overfitting)."
            action={
              <Button variant="outline" size="sm" onClick={exportOptimize} icon={<DownloadIcon />}>
                CSV
              </Button>
            }
          />
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Parâmetros</th>
                  <th>Retorno</th>
                  <th>Drawdown</th>
                  <th>Operações</th>
                  <th>Acerto</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {optimizeResults.map((r, i) => (
                  <tr key={i}>
                    <td className="text-muted">{fmtParams(r.params)}</td>
                    <td
                      className={cn(
                        "tnum font-medium",
                        r.totalReturnPct >= 0 ? "text-pos" : "text-neg"
                      )}
                    >
                      {pct(r.totalReturnPct)}
                    </td>
                    <td className="tnum text-neg">{pct(r.maxDrawdownPct)}</td>
                    <td className="tnum">{r.totalTrades}</td>
                    <td className="tnum">{r.winRatePct.toFixed(0)}%</td>
                    <td>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => applyParams(r.params)}
                        disabled={busy}
                      >
                        Aplicar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Estado vazio inicial */}
      {idle && (
        <Card className="animate-fade">
          <EmptyState
            icon="📈"
            title="Pronto para testar uma estratégia"
            description="Ajuste a configuração acima e rode o backtest — ou clique num atalho popular para ver o resultado na hora."
            action={
              <Button
                variant="primary"
                onClick={() => runBacktest()}
                icon={<PlayIcon />}
              >
                Rodar backtest
              </Button>
            }
          />
        </Card>
      )}

      {/* Skeleton de carregamento */}
      {loading && <ResultsSkeleton />}

      {/* Resultados */}
      {!loading && result && s && (
        <div className="animate-in space-y-6">
          <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat
              label="Retorno da estratégia"
              value={pct(s.totalReturnPct)}
              tone={s.totalReturnPct >= 0 ? "pos" : "neg"}
              size="lg"
            />
            <Stat
              label="Comprar e segurar"
              value={pct(s.buyHoldReturnPct)}
              tone={s.buyHoldReturnPct >= 0 ? "pos" : "neg"}
            />
            <Stat
              label="Patrimônio final"
              value={brl.format(s.finalEquity)}
              tone={s.finalEquity >= s.initialCapital ? "pos" : "neg"}
            />
            <Stat
              label="Drawdown máximo"
              value={pct(s.maxDrawdownPct)}
              tone="neg"
            />
            <Stat label="Operações" value={String(s.totalTrades)} />
            <Stat
              label="Taxa de acerto"
              value={`${s.winRatePct.toFixed(0)}%`}
              tone={s.winRatePct >= 50 ? "pos" : "neg"}
            />
            <Stat
              label="Ganhos / Perdas"
              value={`${s.winningTrades} / ${s.losingTrades}`}
            />
            <Stat
              label="Resultado médio"
              value={pct(s.avgPnlPct)}
              tone={s.avgPnlPct >= 0 ? "pos" : "neg"}
            />
          </section>

          <Banner tone={beatBuyHold ? "success" : "info"}>
            {beatBuyHold
              ? "✅ Nesta janela, a estratégia superou simplesmente comprar e segurar a ação."
              : "ℹ️ Nesta janela, a estratégia NÃO superou comprar e segurar. Ajuste os parâmetros, ative o stop-loss ou otimize."}
          </Banner>

          <Card className="p-5">
            <SectionHeader title={`${result.ticker} · preço e sinais`} />
            <PriceChart candles={result.candles} markers={result.markers} />
          </Card>

          <Card className="p-5">
            <SectionHeader title="Curva de capital (patrimônio simulado)" />
            <EquityChart data={result.equityCurve} />
          </Card>

          <Card className="p-5">
            <SectionHeader
              title={`Operações (${result.trades.length})`}
              action={
                result.trades.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportTrades}
                    icon={<DownloadIcon />}
                  >
                    CSV
                  </Button>
                )
              }
            />
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Entrada</th>
                    <th>Saída</th>
                    <th>Preço entr.</th>
                    <th>Preço saída</th>
                    <th>Motivo</th>
                    <th>Resultado</th>
                    <th>%</th>
                  </tr>
                </thead>
                <tbody>
                  {result.trades.map((t, i) => (
                    <tr key={i}>
                      <td className="tnum text-muted">{fmtDate(t.entryTime)}</td>
                      <td className="tnum text-muted">{fmtDate(t.exitTime)}</td>
                      <td className="tnum">{brl.format(t.entryPrice)}</td>
                      <td className="tnum">{brl.format(t.exitPrice)}</td>
                      <td>
                        {t.reason === "Stop-loss" ? (
                          <Badge tone="neg">Stop-loss</Badge>
                        ) : t.reason === "Take-profit" ? (
                          <Badge tone="pos">Take-profit</Badge>
                        ) : (
                          <span className="text-muted">{t.reason}</span>
                        )}
                      </td>
                      <td
                        className={cn(
                          "tnum font-medium",
                          t.pnl >= 0 ? "text-pos" : "text-neg"
                        )}
                      >
                        {brl.format(t.pnl)}
                      </td>
                      <td
                        className={cn(
                          "tnum",
                          t.pnlPct >= 0 ? "text-pos" : "text-neg"
                        )}
                      >
                        {pct(t.pnlPct)}
                      </td>
                    </tr>
                  ))}
                  {result.trades.length === 0 && (
                    <tr>
                      <td colSpan={7}>
                        <EmptyState
                          icon="🤷"
                          title="Nenhuma operação no período"
                          description="A estratégia não gerou sinais com esses parâmetros. Tente médias mais curtas ou outro intervalo."
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </main>
  );
}

function ResultsSkeleton() {
  return (
    <div className="animate-fade space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="card px-4 py-3.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-2 h-6 w-20" />
          </div>
        ))}
      </div>
      <Card className="p-5">
        <Skeleton className="mb-3 h-4 w-40" />
        <Skeleton className="h-[360px] w-full" />
      </Card>
      <Card className="p-5">
        <Skeleton className="mb-3 h-4 w-48" />
        <Skeleton className="h-[260px] w-full" />
      </Card>
    </div>
  );
}
