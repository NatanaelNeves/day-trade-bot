# 🤖 Bot de Trade — B3 (simulação)

Aplicação web para **testar estratégias de trade em ações da B3** com dados
reais e **dinheiro fictício** (backtesting). Construído em Next.js + TypeScript.

> ⚠️ **Isto é uma ferramenta de estudo.** Não é recomendação de investimento.
> Resultados passados não garantem lucro futuro. Day trade tem risco alto e a
> maioria dos operadores pessoa física perde dinheiro. Comece sempre simulando.

## O que já faz (Fase 1 — Backtesting)

- Busca histórico real de qualquer ação da B3 (ex.: `PETR4`, `VALE3`, `ITUB4`)
  com lista/autocomplete de ~75 ações e atalhos para as mais negociadas
- **5 estratégias**: Cruzamento de Médias (SMA e EMA), IFR/RSI, MACD e
  Rompimento (Donchian) — com parâmetros ajustáveis na tela
- **Gestão de risco**: stop-loss e take-profit (encerram a operação na perda
  ou no lucro definidos)
- **Otimização de parâmetros**: testa dezenas de combinações e mostra as
  melhores por retorno (com aviso de overfitting)
- **Comparação de estratégias**: roda todas as estratégias no mesmo ativo e
  ranqueia por retorno, com botão para usar a vencedora
- **Tamanho de posição** (% do capital por operação)
- **Favoritos**: salva configurações no navegador para recarregar depois
- **Exportar CSV** das operações, da comparação e da otimização
- Calcula lucro/prejuízo, taxa de acerto, drawdown máximo e compara com
  "comprar e segurar"
- Mostra gráfico de candles com os sinais de compra/venda, a curva de capital
  e a lista de operações (com o motivo de cada saída)

## Como rodar

```bash
npm install
npm run dev
```

Abra http://localhost:3000, digite um ticker (ex.: `PETR4`) e clique em
**Rodar backtest**.

## Como funciona (arquitetura)

```
src/
  app/
    page.tsx              Painel (formulário + resultados + gráficos)
    api/backtest/route.ts API: busca dados -> estratégia -> backtest
  lib/
    data.ts               Busca candles da B3 (Yahoo Finance)
    indicators.ts         Indicadores (média móvel)
    strategy.ts           Estratégia SMA crossover (gera sinais)
    backtest.ts           Motor de simulação (P&L, estatísticas)
    types.ts              Tipos compartilhados
  components/
    PriceChart.tsx        Gráfico de candles + marcadores
    EquityChart.tsx       Gráfico da curva de capital
```

A estratégia: duas médias móveis (uma rápida, uma lenta). Quando a rápida cruza
**para cima** da lenta -> sinal de **compra**; **para baixo** -> **venda**.

## Limitações desta versão (de propósito)

- Apenas operações compradas (long), sem venda a descoberto
- Investe todo o caixa a cada compra (sem gestão de risco por operação)
- Execução no fechamento do candle, sem slippage e sem fracionamento de lote
- Histórico intradiário (15m/1h) é limitado pelo provedor de dados gratuito

## Paper trading ao vivo (Fase 2 — aba "🟢 Paper ao vivo")

- **Portfólio de vários ativos** rodando a estratégia em tempo real, a cada 20s
- **Tamanho de posição**: cada compra usa uma % do patrimônio (ex.: 25% permite
  até ~4 posições simultâneas), limitada pelo caixa
- Começa "do zero": só executa ordens em sinais que acontecem a partir do início
- Mostra patrimônio, lucro/prejuízo, caixa, posições abertas (com resultado em
  aberto por ativo), curva de patrimônio e histórico de ordens — tudo ao vivo
- Stop-loss / take-profit também valem ao vivo, por ativo
- **Alertas** quando uma ordem é executada: toast na tela + notificação do
  navegador (opcional, basta ativar)
- **Comparar estratégias na carteira** antes de iniciar (retorno médio dos
  ativos) e exportar as ordens em CSV
- Estado persistido em `paper-account.json` (sobrevive a recarregamentos)

## Próximas fases (roteiro)

- [x] Mais estratégias (SMA, EMA, RSI, MACD, rompimento)
- [x] Gestão de risco: stop-loss e take-profit
- [x] Otimização de parâmetros (busca em grade)
- [x] Paper trading ao vivo (carteira fictícia em tempo real)
- [x] Tamanho de posição (% do capital por operação) no backtest e no paper
- [x] Paper trading com vários ativos ao mesmo tempo (portfólio)
- [x] Comparar várias estratégias lado a lado num só ranking
- [x] Alertas quando uma ordem é executada (toast + notificação do navegador)
- [x] Exportar resultados em CSV (operações, comparação, otimização, ordens)
- [x] Salvar configurações favoritas (no navegador)
- [x] Comparar estratégias no paper (média da carteira) antes de iniciar
- [ ] (Avançado, muito depois) integração com corretora real
