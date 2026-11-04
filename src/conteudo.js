// Textos da página inicial. Edite aqui para mudar o que aparece nos cartões das partes.
export const PARTES = [
  {
    id: "parte-1",
    numero: "01",
    status: "Concluída",
    titulo: "Fluxo potencial nas rotas",
    resumo: "Estima quantas pessoas, em potencial, passam por cada trecho de rua a caminho do transporte coletivo.",
    feito: [
      "Associação de cada célula populada do GHSL ao nó mais próximo da rede de pedestres.",
      "Rota de menor custo de cada origem até uma parada GTFS.",
      "Soma da população nas arestas usadas, formando o fluxo de cada trecho."
    ]
  },
  {
    id: "parte-2",
    numero: "02",
    status: "Em andamento",
    titulo: "Onde plantar as árvores",
    resumo: "Distribui um número fixo de árvores pelos trechos de maior fluxo para reduzir a exposição ao sol.",
    feito: [
      "Cálculo do sol disponível em cada aresta às 7h.",
      "Ordenação das arestas pelo fluxo da Parte 1.",
      "Preenchimento guloso até acabarem as árvores, com a redução da exposição J."
    ]
  },
  {
    id: "parte-3",
    numero: "03",
    status: "Não iniciado",
    titulo: "Rotas pela sombra",
    resumo: "Incorpora a exposição solar ao cálculo de rotas",
    feito: [
    ]
  }
];

// Números exibidos no site (resultado da execução atual do projeto).

export const NUMEROS_GERAIS = [
  ["88.326", "nós na rede de pedestres"],
  ["384.500", "arestas analisadas na rede"],
  ["5.262", "paradas GTFS consideradas"],
  ["26.835", "células GHSL com população positiva"],
  ["44.834", "arestas que receberam fluxo potencial"],
  ["2,79 mi", "pessoas nas células positivas do recorte"]
];

export const NUMEROS_METODOLOGIA = [
  ["5.262", "paradas associadas a nós"],
  ["0", "paradas descartadas pelos filtros"],
  ["4.566", "nós únicos associados a paradas"],
  ["26.835", "células associadas a nós da rede"],
  ["0", "células positivas sem nó válido"],
  ["28.776", "células NoData no raster recortado"],
  ["4.617", "células com população igual a zero"],
  ["24.864", "rotas válidas com uma ou mais arestas"],
  ["1.971", "origens já localizadas em nó de parada"],
  ["0", "células sem caminho até uma parada"]
];
