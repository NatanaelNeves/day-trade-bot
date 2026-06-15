// Lista curada das principais ações negociadas na B3 (e alguns ETFs/índice).
// Usada para autocomplete e botões de acesso rápido na interface.
// Você pode digitar QUALQUER ticker no campo — esta lista é só atalho.

export interface TickerInfo {
  symbol: string;
  name: string;
  sector: string;
}

export const B3_TICKERS: TickerInfo[] = [
  // Petróleo, gás e mineração
  { symbol: "PETR4", name: "Petrobras PN", sector: "Petróleo e Gás" },
  { symbol: "PETR3", name: "Petrobras ON", sector: "Petróleo e Gás" },
  { symbol: "PRIO3", name: "PRIO (PetroRio)", sector: "Petróleo e Gás" },
  { symbol: "VBBR3", name: "Vibra Energia", sector: "Petróleo e Gás" },
  { symbol: "UGPA3", name: "Ultrapar", sector: "Petróleo e Gás" },
  { symbol: "CSAN3", name: "Cosan", sector: "Petróleo e Gás" },
  { symbol: "RRRP3", name: "3R Petroleum", sector: "Petróleo e Gás" },
  { symbol: "VALE3", name: "Vale", sector: "Mineração e Siderurgia" },
  { symbol: "GGBR4", name: "Gerdau PN", sector: "Mineração e Siderurgia" },
  { symbol: "CSNA3", name: "CSN", sector: "Mineração e Siderurgia" },
  { symbol: "USIM5", name: "Usiminas", sector: "Mineração e Siderurgia" },
  { symbol: "GOAU4", name: "Metalúrgica Gerdau", sector: "Mineração e Siderurgia" },
  { symbol: "BRAP4", name: "Bradespar", sector: "Mineração e Siderurgia" },

  // Bancos e finanças
  { symbol: "ITUB4", name: "Itaú Unibanco", sector: "Bancos e Finanças" },
  { symbol: "BBDC4", name: "Bradesco PN", sector: "Bancos e Finanças" },
  { symbol: "BBDC3", name: "Bradesco ON", sector: "Bancos e Finanças" },
  { symbol: "BBAS3", name: "Banco do Brasil", sector: "Bancos e Finanças" },
  { symbol: "SANB11", name: "Santander Brasil", sector: "Bancos e Finanças" },
  { symbol: "BPAC11", name: "BTG Pactual", sector: "Bancos e Finanças" },
  { symbol: "ITSA4", name: "Itaúsa", sector: "Bancos e Finanças" },
  { symbol: "B3SA3", name: "B3 (bolsa)", sector: "Bancos e Finanças" },
  { symbol: "CXSE3", name: "Caixa Seguridade", sector: "Bancos e Finanças" },
  { symbol: "BBSE3", name: "BB Seguridade", sector: "Bancos e Finanças" },
  { symbol: "PSSA3", name: "Porto Seguro", sector: "Bancos e Finanças" },

  // Consumo, varejo e saúde
  { symbol: "ABEV3", name: "Ambev", sector: "Consumo e Varejo" },
  { symbol: "MGLU3", name: "Magazine Luiza", sector: "Consumo e Varejo" },
  { symbol: "LREN3", name: "Lojas Renner", sector: "Consumo e Varejo" },
  { symbol: "AMER3", name: "Americanas", sector: "Consumo e Varejo" },
  { symbol: "ASAI3", name: "Assaí", sector: "Consumo e Varejo" },
  { symbol: "CRFB3", name: "Carrefour Brasil", sector: "Consumo e Varejo" },
  { symbol: "PCAR3", name: "Grupo Pão de Açúcar", sector: "Consumo e Varejo" },
  { symbol: "NTCO3", name: "Natura &Co", sector: "Consumo e Varejo" },
  { symbol: "RADL3", name: "Raia Drogasil", sector: "Saúde" },
  { symbol: "HAPV3", name: "Hapvida", sector: "Saúde" },
  { symbol: "RDOR3", name: "Rede D'Or", sector: "Saúde" },
  { symbol: "FLRY3", name: "Fleury", sector: "Saúde" },
  { symbol: "HYPE3", name: "Hypera Pharma", sector: "Saúde" },

  // Alimentos e agro
  { symbol: "JBSS3", name: "JBS", sector: "Alimentos e Agro" },
  { symbol: "BRFS3", name: "BRF", sector: "Alimentos e Agro" },
  { symbol: "MRFG3", name: "Marfrig", sector: "Alimentos e Agro" },
  { symbol: "BEEF3", name: "Minerva", sector: "Alimentos e Agro" },
  { symbol: "SLCE3", name: "SLC Agrícola", sector: "Alimentos e Agro" },
  { symbol: "SMTO3", name: "São Martinho", sector: "Alimentos e Agro" },
  { symbol: "SUZB3", name: "Suzano", sector: "Papel e Celulose" },
  { symbol: "KLBN11", name: "Klabin", sector: "Papel e Celulose" },

  // Indústria e logística
  { symbol: "WEGE3", name: "WEG", sector: "Indústria" },
  { symbol: "EMBR3", name: "Embraer", sector: "Indústria" },
  { symbol: "RANI3", name: "Irani", sector: "Indústria" },
  { symbol: "RENT3", name: "Localiza", sector: "Transporte e Logística" },
  { symbol: "RAIL3", name: "Rumo", sector: "Transporte e Logística" },
  { symbol: "CCRO3", name: "CCR", sector: "Transporte e Logística" },
  { symbol: "AZUL4", name: "Azul", sector: "Transporte e Logística" },
  { symbol: "GOLL4", name: "Gol", sector: "Transporte e Logística" },

  // Energia e saneamento
  { symbol: "ELET3", name: "Eletrobras ON", sector: "Energia e Saneamento" },
  { symbol: "ELET6", name: "Eletrobras PNB", sector: "Energia e Saneamento" },
  { symbol: "EQTL3", name: "Equatorial", sector: "Energia e Saneamento" },
  { symbol: "CMIG4", name: "Cemig", sector: "Energia e Saneamento" },
  { symbol: "CPLE6", name: "Copel", sector: "Energia e Saneamento" },
  { symbol: "ENGI11", name: "Energisa", sector: "Energia e Saneamento" },
  { symbol: "ENEV3", name: "Eneva", sector: "Energia e Saneamento" },
  { symbol: "EGIE3", name: "Engie Brasil", sector: "Energia e Saneamento" },
  { symbol: "TAEE11", name: "Taesa", sector: "Energia e Saneamento" },
  { symbol: "SBSP3", name: "Sabesp", sector: "Energia e Saneamento" },

  // Tecnologia, telecom e educação
  { symbol: "TOTS3", name: "Totvs", sector: "Tecnologia e Telecom" },
  { symbol: "VIVT3", name: "Vivo (Telefônica)", sector: "Tecnologia e Telecom" },
  { symbol: "TIMS3", name: "TIM", sector: "Tecnologia e Telecom" },
  { symbol: "COGN3", name: "Cogna Educação", sector: "Educação" },
  { symbol: "YDUQ3", name: "Yduqs", sector: "Educação" },
  { symbol: "CVCB3", name: "CVC", sector: "Turismo" },

  // Construção e shoppings
  { symbol: "MRVE3", name: "MRV", sector: "Construção e Imóveis" },
  { symbol: "CYRE3", name: "Cyrela", sector: "Construção e Imóveis" },
  { symbol: "ALOS3", name: "Allos (shoppings)", sector: "Construção e Imóveis" },
  { symbol: "MULT3", name: "Multiplan", sector: "Construção e Imóveis" },

  // Índice e ETFs (carteiras prontas)
  { symbol: "BOVA11", name: "ETF Ibovespa", sector: "Índices e ETFs" },
  { symbol: "SMAL11", name: "ETF Small Caps", sector: "Índices e ETFs" },
  { symbol: "IVVB11", name: "ETF S&P 500", sector: "Índices e ETFs" },
  { symbol: "^BVSP", name: "Índice Ibovespa", sector: "Índices e ETFs" },
];

/** Os mais negociados — usados como botões de acesso rápido. */
export const POPULAR_TICKERS = [
  "PETR4",
  "VALE3",
  "ITUB4",
  "BBAS3",
  "BBDC4",
  "B3SA3",
  "ABEV3",
  "WEGE3",
  "MGLU3",
  "BOVA11",
];
