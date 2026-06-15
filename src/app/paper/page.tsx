"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import EquityChart from "@/components/EquityChart";
import { B3_TICKERS, POPULAR_TICKERS } from "@/lib/tickers";
import {
  STRATEGY_META,
  getStrategyMeta,
  defaultParams,
} from "@/lib/strategies.meta";
import type { PaperAccount } from "@/lib/paper";
import type { CompareResult } from "@/lib/types";
import { toCsv, downloadCsv } from "@/lib/csv";
import {
  Badge,
  Banner,
  Button,
  Card,
  EmptyState,
  Field,
  SectionHeader,
  Stat,
  cn,
} from "@/components/ui";

const POLL_MS = 20000;

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const pct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
const fmtDateTime = (t: number) =>
  new Date(t * 1000).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
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

function exportOrders(account: PaperAccount) {
  const headers = ["Quando", "Ativo", "Lado", "Preco", "Acoes", "Motivo"];
  const rows = account.orders.map((o) => [
    fmtDateTime(o.time),
    o.ticker,
    o.side === "BUY" ? "Compra" : "Venda",
    o.price.toFixed(2),
    o.shares.toFixed(2),
    o.reason,
  ]);
  downloadCsv("paper-ordens.csv", toCsv(headers, rows));
}

export default function PaperPage() {
  const [tickers, setTickers] = useState<string[]>(["PETR4", "VALE3", "ITUB4"]);
  const [newTicker, setNewTicker] = useState("");
  const [interval, setInterval] = useState<"1d" | "1h" | "15m">("15m");
  const [strategyId, setStrategyId] = useState("sma_cross");
  const [params, setParams] = useState<Record<string, number>>(
    defaultParams("sma_cross")
  );
  const [initialCapital, setInitialCapital] = useState(10000);
  const [stopLoss, setStopLoss] = useState(0);
  const [takeProfit, setTakeProfit] = useState(0);
  const [allocationPct, setAllocationPct] = useState(25);

  const [account, setAccount] = useState<PaperAccount | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [compareResults, setCompareResults] = useState<CompareResult[] | null>(
    null
  );

  const meta = getStrategyMeta(strategyId)!;
  const tickingRef = useRef(false);
  const prevOrderCountRef = useRef<number | null>(null);
  const [toasts, setToasts] = useState<
    { id: number; text: string; side: "BUY" | "SELL" }[]
  >([]);
  const [notifOn, setNotifOn] = useState(false);

  const addToast = useCallback((text: string, side: "BUY" | "SELL") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, text, side }]);
    window.setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      9000
    );
  }, []);

  const notifyOrder = useCallback(
    (o: {
      side: "BUY" | "SELL";
      ticker: string;
      price: number;
      reason: string;
    }) => {
      const text = `${o.side === "BUY" ? "Compra" : "Venda"} ${o.ticker} a ${brl.format(o.price)} — ${o.reason}`;
      addToast(text, o.side);
      if (
        typeof Notification !== "undefined" &&
        Notification.permission === "granted"
      ) {
        try {
          new Notification(
            o.side === "BUY" ? "🟢 Ordem de compra" : "🔴 Ordem de venda",
            { body: text }
          );
        } catch {
          /* ignora */
        }
      }
    },
    [addToast]
  );

  async function enableNotifications() {
    if (typeof Notification === "undefined") {
      addToast("Seu navegador não suporta notificações.", "SELL");
      return;
    }
    const perm = await Notification.requestPermission();
    setNotifOn(perm === "granted");
    if (perm === "granted") addToast("Notificações ativadas!", "BUY");
  }

  useEffect(() => {
    if (typeof Notification !== "undefined") {
      setNotifOn(Notification.permission === "granted");
    }
  }, []);

  function changeStrategy(id: string) {
    setStrategyId(id);
    setParams(defaultParams(id));
  }

  async function runComparePortfolio() {
    if (tickers.length === 0) return;
    setComparing(true);
    setError(null);
    try {
      const res = await fetch("/api/compare-portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tickers,
          interval,
          initialCapital,
          feePct: 0.0003,
          stopLossPct: stopLoss,
          takeProfitPct: takeProfit,
          allocationPct,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao comparar.");
      setCompareResults(data.results as CompareResult[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setComparing(false);
    }
  }

  function addTicker(sym: string) {
    const t = sym.trim().toUpperCase();
    if (!t) return;
    setTickers((prev) => (prev.includes(t) ? prev : [...prev, t]));
    setNewTicker("");
  }
  function removeTicker(t: string) {
    setTickers((prev) => prev.filter((x) => x !== t));
  }
  function toggleTicker(t: string) {
    setTickers((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  }

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/paper");
        const data = await res.json();
        const acc = data.account ?? null;
        prevOrderCountRef.current = acc ? acc.orders.length : null;
        setAccount(acc);
      } catch {
        /* ignora */
      }
    })();
  }, []);

  const tick = useCallback(async () => {
    if (tickingRef.current) return;
    tickingRef.current = true;
    try {
      const res = await fetch("/api/paper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "tick" }),
      });
      const data = await res.json();
      if (res.ok) {
        const acc = data.account ?? null;
        if (acc) {
          const prev = prevOrderCountRef.current;
          if (prev != null && acc.orders.length > prev) {
            acc.orders.slice(prev).forEach(notifyOrder);
          }
          prevOrderCountRef.current = acc.orders.length;
        }
        setAccount(acc);
      }
    } catch {
      /* ignora falha isolada */
    } finally {
      tickingRef.current = false;
    }
  }, [notifyOrder]);

  useEffect(() => {
    if (!account?.running) return;
    tick();
    const id = window.setInterval(tick, POLL_MS);
    return () => window.clearInterval(id);
  }, [account?.running, tick]);

  async function start() {
    setStarting(true);
    setError(null);
    try {
      const res = await fetch("/api/paper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          tickers,
          interval,
          strategyId,
          params,
          initialCapital,
          stopLossPct: stopLoss,
          takeProfitPct: takeProfit,
          allocationPct,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao iniciar.");
      prevOrderCountRef.current = data.account?.orders.length ?? 0;
      setAccount(data.account);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setStarting(false);
    }
  }

  async function stop() {
    const res = await fetch("/api/paper", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "stop" }),
    });
    const data = await res.json();
    const acc = data.account ?? null;
    prevOrderCountRef.current = acc ? acc.orders.length : null;
    setAccount(acc);
  }

  async function reset() {
    await fetch("/api/paper", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset" }),
    });
    prevOrderCountRef.current = null;
    setAccount(null);
  }

  const suggested = tickers.length > 0 ? Math.floor(100 / tickers.length) : 100;

  return (
    <main className="mx-auto max-w-6xl px-4 pb-20 pt-8">
      <header className="mb-6">
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-semibold tracking-tight">
            Paper trading ao vivo
          </h1>
          <Badge tone="accent">carteira fictícia</Badge>
        </div>
        <p className="mt-1.5 text-sm text-muted">
          Um portfólio rodando a estratégia em tempo real, atualizando a cada{" "}
          {POLL_MS / 1000}s. Nenhuma ordem real é enviada.
        </p>
      </header>

      {error && (
        <div className="animate-in mb-6">
          <Banner tone="error">{error}</Banner>
        </div>
      )}

      {!account ? (
        <div className="space-y-4">
          {/* Carteira de ativos */}
          <Card className="p-5">
            <SectionHeader
              title={`Ativos da carteira (${tickers.length})`}
              subtitle="Adicione vários ativos — a estratégia roda em cada um."
            />
            <div className="mb-3 flex flex-wrap gap-2">
              {tickers.length > 0 ? (
                tickers.map((t) => (
                  <span key={t} className="chip chip-active">
                    {t}
                    <button
                      onClick={() => removeTicker(t)}
                      className="ml-0.5 text-accent-strong/70 transition-colors hover:text-neg"
                      aria-label={`Remover ${t}`}
                    >
                      ✕
                    </button>
                  </span>
                ))
              ) : (
                <span className="text-sm text-faint">
                  Adicione ao menos um ativo.
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <input
                value={newTicker}
                onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addTicker(newTicker);
                }}
                placeholder="Adicionar ticker (ex.: ITUB4)"
                list="b3-tickers"
                className="input flex-1"
              />
              <datalist id="b3-tickers">
                {B3_TICKERS.map((t) => (
                  <option key={t.symbol} value={t.symbol}>
                    {t.name} · {t.sector}
                  </option>
                ))}
              </datalist>
              <Button variant="secondary" onClick={() => addTicker(newTicker)}>
                Adicionar
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {POPULAR_TICKERS.map((sym) => (
                <button
                  key={sym}
                  onClick={() => toggleTicker(sym)}
                  className={cn(
                    "chip text-xs",
                    tickers.includes(sym) && "chip-active"
                  )}
                >
                  {tickers.includes(sym) ? "✓ " : "+ "}
                  {sym}
                </button>
              ))}
            </div>
          </Card>

          {/* Configuração */}
          <Card className="p-5">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Field label="Intervalo">
                <select
                  value={interval}
                  onChange={(e) =>
                    setInterval(e.target.value as "1d" | "1h" | "15m")
                  }
                  className="input"
                >
                  <option value="15m">15 min (recomendado)</option>
                  <option value="1h">1 hora</option>
                  <option value="1d">Diário</option>
                </select>
              </Field>
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
              <Field label="Capital total (R$)">
                <input
                  type="number"
                  min={100}
                  step={100}
                  value={initialCapital}
                  onChange={(e) => setInitialCapital(Number(e.target.value))}
                  className="input tnum"
                />
              </Field>
              <Field
                label="Tamanho da posição (%)"
                hint={`~${suggested}% cabe em todos os ${tickers.length} ativos`}
              >
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

            <p className="mt-3 text-xs leading-relaxed text-muted">
              {meta.description}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-4 border-t border-line pt-4 md:grid-cols-4">
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
            </div>
          </Card>

          <Banner tone="info">
            ℹ️ A carteira começa “do zero” e só executa ordens em sinais que
            acontecerem <strong className="text-fg">a partir de agora</strong>.
            Para ver movimento mais rápido, use 15 min com o mercado aberto.
          </Banner>

          <div className="flex flex-wrap gap-2.5">
            <Button
              variant="primary"
              onClick={start}
              loading={starting}
              disabled={tickers.length === 0}
              icon={<PlayIcon />}
            >
              Iniciar paper trading
            </Button>
            <Button
              variant="outline"
              onClick={runComparePortfolio}
              loading={comparing}
              disabled={tickers.length === 0}
            >
              ⚖️ Comparar estratégias na carteira
            </Button>
          </div>

          {compareResults && (
            <Card className="animate-in p-5">
              <SectionHeader
                title={`⚖️ Média da carteira · ${tickers.join(", ")}`}
                subtitle={
                  <>
                    Retorno médio de cada estratégia em cada ativo. Comprar e
                    segurar (média):{" "}
                    <strong className="text-fg">
                      {pct(compareResults[0]?.buyHoldReturnPct ?? 0)}
                    </strong>
                  </>
                }
              />
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Estratégia</th>
                      <th>Retorno médio</th>
                      <th>Drawdown médio</th>
                      <th>Operações</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {compareResults.map((r, i) => {
                      const beat = r.totalReturnPct > r.buyHoldReturnPct;
                      const chosen = r.strategyId === strategyId;
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
                          <td className="tnum text-neg">
                            {pct(r.maxDrawdownPct)}
                          </td>
                          <td className="tnum">{r.totalTrades}</td>
                          <td>
                            {chosen ? (
                              <Badge tone="pos">✓ Em uso</Badge>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => changeStrategy(r.strategyId)}
                              >
                                Usar
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      ) : (
        <Dashboard
          account={account}
          onStop={stop}
          onReset={reset}
          notifOn={notifOn}
          onEnableNotifications={enableNotifications}
        />
      )}

      {/* Alertas de ordem (toasts) */}
      {toasts.length > 0 && (
        <div className="fixed right-4 top-20 z-50 flex w-80 flex-col gap-2">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={cn(
                "animate-toast card flex items-start gap-2.5 px-4 py-3 text-sm shadow-xl",
                t.side === "BUY" ? "border-pos/40" : "border-neg/40"
              )}
            >
              <span
                className={cn(
                  "mt-0.5 text-base leading-none",
                  t.side === "BUY" ? "text-pos" : "text-neg"
                )}
              >
                {t.side === "BUY" ? "▲" : "▼"}
              </span>
              <span className="text-fg">{t.text}</span>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

// --- Painel ao vivo -----------------------------------------------------

function Dashboard({
  account,
  onStop,
  onReset,
  notifOn,
  onEnableNotifications,
}: {
  account: PaperAccount;
  onStop: () => void;
  onReset: () => void;
  notifOn: boolean;
  onEnableNotifications: () => void;
}) {
  const c = account.config;
  const positions = Object.values(account.positions);

  const priceOf = (t: string) =>
    account.lastPrices[t] ?? account.positions[t]?.entryPrice ?? 0;

  let positionsValue = 0;
  for (const p of positions) positionsValue += p.shares * priceOf(p.ticker);
  const equity = account.cash + positionsValue;
  const pnl = equity - account.initialCapital;
  const pnlPct = (pnl / account.initialCapital) * 100;

  return (
    <div className="animate-in space-y-6">
      {/* Status */}
      <Card className="flex flex-wrap items-center justify-between gap-4 p-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {account.running ? (
              <span className="badge bg-pos/12 text-pos">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pos opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-pos" />
                </span>
                AO VIVO
              </span>
            ) : (
              <Badge tone="neutral">⏸ Pausado</Badge>
            )}
            <span className="text-sm font-medium text-fg">
              {c.tickers.join(", ")}
            </span>
            <span className="text-xs text-muted">
              {c.interval} · {getStrategyMeta(c.strategyId)?.name ?? c.strategyId}
            </span>
          </div>
          <div className="mt-1.5 text-xs text-faint">
            {Object.entries(c.params)
              .map(([k, v]) => `${k}: ${v}`)
              .join(" · ")}
            {` · ${c.allocationPct}% por posição`}
            {c.stopLossPct > 0 && ` · stop ${c.stopLossPct}%`}
            {c.takeProfitPct > 0 && ` · alvo ${c.takeProfitPct}%`}
            {account.lastUpdate &&
              ` · atualizado ${fmtDateTime(account.lastUpdate)}`}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={onEnableNotifications}
            disabled={notifOn}
          >
            {notifOn ? "🔔 Alertas ativos" : "🔕 Ativar alertas"}
          </Button>
          {account.running && (
            <Button variant="secondary" size="sm" onClick={onStop}>
              ⏸ Pausar
            </Button>
          )}
          <Button variant="danger" size="sm" onClick={onReset}>
            Encerrar
          </Button>
        </div>
      </Card>

      {account.marketNote && <Banner tone="warn">⚠️ {account.marketNote}</Banner>}

      {/* Cartões */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Patrimônio" value={brl.format(equity)} size="lg" />
        <Stat
          label="Lucro / Prejuízo"
          value={`${brl.format(pnl)}`}
          sub={pct(pnlPct)}
          tone={pnl >= 0 ? "pos" : "neg"}
          size="lg"
        />
        <Stat label="Caixa livre" value={brl.format(account.cash)} />
        <Stat
          label="Posições abertas"
          value={`${positions.length} / ${c.tickers.length}`}
        />
      </section>

      {/* Posições */}
      <Card className="p-5">
        <SectionHeader title="Posições abertas" />
        {positions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Ativo</th>
                  <th>Qtd.</th>
                  <th>Entrada</th>
                  <th>Preço atual</th>
                  <th>Valor</th>
                  <th>Resultado aberto</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((p) => {
                  const price = priceOf(p.ticker);
                  const value = p.shares * price;
                  const upnl = (price - p.entryPrice) * p.shares;
                  const upnlPct = (price / p.entryPrice - 1) * 100;
                  return (
                    <tr key={p.ticker}>
                      <td className="font-medium text-fg">{p.ticker}</td>
                      <td className="tnum">{p.shares.toFixed(2)}</td>
                      <td className="tnum">{brl.format(p.entryPrice)}</td>
                      <td className="tnum">{brl.format(price)}</td>
                      <td className="tnum">{brl.format(value)}</td>
                      <td
                        className={cn(
                          "tnum font-medium",
                          upnl >= 0 ? "text-pos" : "text-neg"
                        )}
                      >
                        {brl.format(upnl)} ({pct(upnlPct)})
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon="💤"
            title="Sem posição aberta"
            description="A carteira está aguardando um sinal de compra da estratégia."
          />
        )}
      </Card>

      {/* Curva de capital */}
      <Card className="p-5">
        <SectionHeader title="Patrimônio ao longo do tempo" />
        {account.equityCurve.length > 1 ? (
          <EquityChart data={account.equityCurve} />
        ) : (
          <EmptyState
            icon="📊"
            title="Coletando dados..."
            description="O gráfico aparece conforme os candles forem fechando."
          />
        )}
      </Card>

      {/* Ordens */}
      <Card className="p-5">
        <SectionHeader
          title={`Ordens executadas (${account.orders.length})`}
          action={
            account.orders.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportOrders(account)}
                icon={<DownloadIcon />}
              >
                CSV
              </Button>
            )
          }
        />
        {account.orders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Quando</th>
                  <th>Ativo</th>
                  <th>Lado</th>
                  <th>Preço</th>
                  <th>Qtd.</th>
                  <th>Motivo</th>
                </tr>
              </thead>
              <tbody>
                {[...account.orders].reverse().map((o, i) => (
                  <tr key={i}>
                    <td className="tnum text-muted">{fmtDateTime(o.time)}</td>
                    <td className="font-medium text-fg">{o.ticker}</td>
                    <td>
                      <Badge tone={o.side === "BUY" ? "pos" : "neg"}>
                        {o.side === "BUY" ? "Compra" : "Venda"}
                      </Badge>
                    </td>
                    <td className="tnum">{brl.format(o.price)}</td>
                    <td className="tnum">{o.shares.toFixed(2)}</td>
                    <td className="text-muted">{o.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon="🕒"
            title="Nenhuma ordem ainda"
            description="A carteira está esperando o primeiro sinal da estratégia."
          />
        )}
      </Card>
    </div>
  );
}
