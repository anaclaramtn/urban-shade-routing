// Testes de mesa: cada função executa o algoritmo sobre um exemplo pequeno e
// registra TODAS as etapas intermediárias. As páginas só exibem o que está aqui,
// então nenhum número do texto é digitado à mão.
//
// O que está sendo reproduzido (ver notebooks/notebook_final_arvores.ipynb):
//   Parte 1: classificação do raster → centroides → nó mais próximo →
//            nx.multi_source_dijkstra (peso = distancia_metros) → soma nas arestas.
//   Parte 2: src/lib/plantio.js (a mesma função `capacidade` é usada aqui).

import { capacidade, prepararOrdem } from "./plantio.js";

/* ======================================================================== *
 *  PARTE 1: fluxo potencial
 * ======================================================================== */

export const NODATA = null;

// Exemplo mínimo: raster 2×2 (linha 0 = norte), células de 100 m, canto superior esquerdo (0, 100).
export const RASTER = {
  valores: [
    [30, 20],
    [NODATA, 10]
  ],
  resolucao: 100,
  x0: 0,
  y0: 100
};

// Rede em linha: 1 — 2 — 3 — 4 (coordenadas em metros, CRS projetado).
export const NOS = [
  { id: 1, x: 50, y: 50 },
  { id: 2, x: 150, y: 50 },
  { id: 3, x: 150, y: -50 },
  { id: 4, x: 250, y: -50 }
];

export const ARESTAS = [
  { u: 1, v: 2, k: 0, L: 100 },
  { u: 2, v: 3, k: 0, L: 100 },
  { u: 3, v: 4, k: 0, L: 100 }
];

export const PARADAS = [
  { id: "P1", x: 245, y: -45 }
];

export const idAresta = ({ u, v, k }) => `${u}-${v}-${k}`;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// Nó mais próximo (menor distância euclidiana; empate: o primeiro da lista).
function maisProximo(ponto) {
  const d = NOS.map(n => dist(ponto, n));
  let melhor = 0;
  d.forEach((x, i) => { if (x < d[melhor]) melhor = i; });
  return { distancias: d, no: NOS[melhor].id, distancia: d[melhor] };
}

// Dijkstra multifonte, passo a passo, com as mesmas regras do networkx:
//  - fila de prioridade ordenada por (distância, contador de inserção);
//  - ao retirar um nó já fechado, ignora;
//  - a distância de um vizinho só é trocada se o candidato for ESTRITAMENTE menor;
//  - entre arestas paralelas vale a de menor peso.
function dijkstraMultiFonte(fontes) {
  const vizinhos = new Map(NOS.map(n => [n.id, new Map()]));
  for (const a of ARESTAS) {
    for (const [x, y] of [[a.u, a.v], [a.v, a.u]]) {
      const atual = vizinhos.get(x).get(y);
      if (atual === undefined || a.L < atual) vizinhos.get(x).set(y, a.L);
    }
  }
  let contador = 0;
  const dist = new Map();   // nós fechados
  const visto = new Map();  // melhor candidato conhecido
  const caminho = new Map();
  const fila = [];
  const empurrar = (d, no) => { fila.push({ d, c: ++contador, no }); fila.sort((a, b) => a.d - b.d || a.c - b.c); };
  const filaTexto = () => fila.map(e => `nó ${e.no} (${e.d})`).join(" · ") || "vazia";

  for (const f of fontes) { visto.set(f, 0); caminho.set(f, [f]); empurrar(0, f); }
  const passos = [{ tipo: "inicio", fila: filaTexto() }];

  while (fila.length) {
    const { d, c, no } = fila.shift();
    if (dist.has(no)) {
      passos.push({ tipo: "ignorado", d, c, no, fila: filaTexto() });
      continue;
    }
    dist.set(no, d);
    const relax = [];
    const lista = [...vizinhos.get(no).keys()].sort((a, b) => a - b);
    for (const viz of lista) {
      const peso = vizinhos.get(no).get(viz);
      const cand = d + peso;
      let acao;
      if (dist.has(viz)) acao = `nó ${viz} já fechado (dist = ${dist.get(viz)}): nada a fazer`;
      else if (!visto.has(viz)) {
        visto.set(viz, cand); caminho.set(viz, [...caminho.get(no), viz]); empurrar(cand, viz);
        acao = `nó ${viz} ainda não visto: registra ${cand}`;
      } else if (cand < visto.get(viz)) {
        const antes = visto.get(viz);
        visto.set(viz, cand); caminho.set(viz, [...caminho.get(no), viz]); empurrar(cand, viz);
        acao = `${cand} < ${antes}: atualiza o nó ${viz} para ${cand}`;
      } else {
        acao = `${cand} ≥ ${visto.get(viz)}: mantém o nó ${viz} em ${visto.get(viz)}`;
      }
      relax.push({ viz, peso, cand, acao });
    }
    passos.push({ tipo: "fechado", d, c, no, relax, fila: filaTexto() });
  }
  return { passos, dist, caminho };
}

export function testeMesaParte1() {
  const { valores, resolucao, x0, y0 } = RASTER;

  // Etapa 1: classificação do raster e células positivas (ordem de np.where: linha, depois coluna).
  const classificacao = [];
  const celulas = [];
  let nNoData = 0, nZero = 0, nPos = 0;
  valores.forEach((linha, r) => linha.forEach((v, c) => {
    let classe;
    if (v === NODATA) { classe = "NoData"; nNoData++; }
    else if (v === 0) { classe = "população = 0"; nZero++; }
    else { classe = "população > 0"; nPos++; }
    const positiva = v !== NODATA && v > 0;
    const x = x0 + (c + 0.5) * resolucao;
    const y = y0 - (r + 0.5) * resolucao;
    let id = null;
    if (positiva) {
      id = celulas.length;
      celulas.push({ id, r, c, pop: v, x, y });
    }
    classificacao.push({ r, c, valor: v, classe, id });
  }));
  const populacaoTotal = celulas.reduce((s, c) => s + c.pop, 0);

  // Etapa 2: célula → nó mais próximo.
  for (const cel of celulas) Object.assign(cel, { assoc: maisProximo(cel) });

  // Etapa 3: parada → nó mais próximo; nós-fonte = nós únicos, ordenados.
  const paradas = PARADAS.map(p => ({ ...p, assoc: maisProximo(p) }));
  const nosParada = [...new Set(paradas.map(p => p.assoc.no))].sort((a, b) => a - b);

  // Etapa 4: Dijkstra multifonte.
  const dj = dijkstraMultiFonte(nosParada);

  // Etapa 5: rota de cada célula.
  const rotas = celulas.map(cel => {
    const origem = cel.assoc.no;
    if (!dj.dist.has(origem)) {
      return { ...cel, origem, status: "no_path_to_any_stop", destino: null, dist: null, nos: [], arestas: [] };
    }
    const doDestino = dj.caminho.get(origem);          // parada → origem
    const nos = [...doDestino].reverse();               // origem → parada
    const destino = doDestino[0];
    if (nos.length - 1 === 0) {
      return { ...cel, origem, status: "origin_equals_destination", destino, dist: dj.dist.get(origem), doDestino, nos, arestas: [] };
    }
    // resolve_edge_on_graph: para cada par, a aresta de menor peso (chave).
    const arestas = [];
    for (let i = 0; i < nos.length - 1; i++) {
      const [a, b] = [nos[i], nos[i + 1]];
      const candidatas = ARESTAS.filter(e => (e.u === a && e.v === b) || (e.u === b && e.v === a));
      const escolhida = candidatas.reduce((m, e) => (e.L < m.L ? e : m));
      arestas.push({ par: [a, b], candidatas, escolhida });
    }
    return { ...cel, origem, status: "ok", destino, dist: dj.dist.get(origem), doDestino, nos, arestas };
  });

  // Etapa 6: soma da população, célula por célula, com o acumulado de cada aresta.
  const acumulado = new Map(ARESTAS.map(a => [idAresta(a), 0]));
  const alocacao = [];
  for (const r of rotas) {
    if (r.status !== "ok") { alocacao.push({ id: r.id, status: r.status, pop: r.pop, ids: [], estado: new Map(acumulado) }); continue; }
    const ids = [...new Set(r.arestas.map(a => idAresta(a.escolhida)))];
    for (const e of ids) acumulado.set(e, acumulado.get(e) + r.pop);
    alocacao.push({ id: r.id, status: r.status, pop: r.pop, ids, estado: new Map(acumulado) });
  }

  // Etapa 7: verificações de conservação.
  const somaF = [...acumulado.values()].reduce((s, v) => s + v, 0);
  const esperado = alocacao.reduce((s, a) => s + a.pop * a.ids.length, 0);
  const popPorStatus = {};
  for (const r of rotas) popPorStatus[r.status] = (popPorStatus[r.status] || 0) + r.pop;

  return {
    classificacao, nNoData, nZero, nPos, total: valores.flat().length, celulas, populacaoTotal,
    paradas, nosParada, dj, rotas, alocacao, acumulado, somaF, esperado, popPorStatus
  };
}

/* ======================================================================== *
 *  PARTE 2: plantio guloso
 * ======================================================================== */

// Exemplo do PDF "Metodologia de plantio de árvores" (docs/): fluxos 100, 10 e 50 e sol de
// 30, 20 e 40 m. Os comprimentos e % ao sol abaixo foram escolhidos para dar exatamente esse sol.
export const PLANTIO_DIDATICO = {
  la: 5,
  N: 10,
  arestas: [
    { nome: "rua 1", F: 100, L: 100, S: 30 },
    { nome: "rua 2", F: 10, L: 50, S: 40 },
    { nome: "rua 3", F: 50, L: 80, S: 50 }
  ]
};

// As 10 arestas de maior fluxo da rede real (public/topojson/arestas_plantio.topojson),
// com os valores originais do arquivo (índice no arquivo, F, L e % ao sol às 7h).
export const PLANTIO_REAL = {
  la: 6,
  N: 3,
  arestas: [
    { nome: "12144-12150-0", idx: 6568, F: 4556.56, L: 20.72, S: 9 },
    { nome: "90928-90929-0", idx: 12841, F: 3806.75, L: 54.46, S: 6 },
    { nome: "75483-77043-0", idx: 41536, F: 3369.58, L: 7.61, S: 0 },
    { nome: "75484-75483-0", idx: 41541, F: 3369.58, L: 40.03, S: 38 },
    { nome: "12143-12144-0", idx: 6561, F: 3301.7, L: 28.92, S: 7 },
    { nome: "9808-9803-0", idx: 5460, F: 3077.34, L: 26.82, S: 24 },
    { nome: "16765-16764-0", idx: 9128, F: 2960.99, L: 33.71, S: 3 },
    { nome: "12142-12139-0", idx: 6544, F: 2924.58, L: 27.88, S: 26 },
    { nome: "12139-12143-0", idx: 6551, F: 2924.58, L: 7.91, S: 61 },
    { nome: "48660-48661-0", idx: 26554, F: 2847.92, L: 59.29, S: 2 }
  ]
};

export function testeMesaPlantio({ la, N, arestas }) {
  const F = arestas.map(a => a.F);
  const L = arestas.map(a => a.L);
  const S = arestas.map(a => a.S);

  // Etapa 2: J antes = Σ F·S·L, termo a termo.
  const termos = arestas.map((a, i) => {
    const solM = (a.S / 100) * a.L;
    return { ...a, i, solM, termo: a.F * solM };
  });
  const jOld = termos.reduce((s, t) => s + t.termo, 0);

  // Etapa 3: capacidade ⌊S·L/lₐ⌋.
  const caps = termos.map(t => {
    const bruto = t.solM / la;
    return { ...t, bruto, cap: capacidade(t.S, t.L, la) };
  });

  // Etapa 4: ordem por fluxo decrescente, empate pelo menor índice.
  const ordem = prepararOrdem(F);

  // Etapa 5: laço guloso (percorre todas as arestas, como `distribuir`).
  let restante = N, ganho = 0;
  const n = new Array(arestas.length).fill(0);
  const iteracoes = ordem.map((i, pos) => {
    const c = caps[i];
    const antes = restante;
    let k = 0, motivo;
    if (restante <= 0) motivo = "não há mais árvores: nada é plantado";
    else if (c.cap <= 0) motivo = "capacidade 0: a aresta não comporta nenhuma árvore, passa para a próxima";
    else {
      k = Math.min(c.cap, restante);
      motivo = k === c.cap ? `planta ${k} (= capacidade); restam ${restante - k}` : `planta ${k} (só restavam ${restante}); acabam as árvores`;
    }
    restante -= k;
    n[i] = k;
    const ganhoLinha = la * c.F * k;
    ganho += ganhoLinha;
    return { pos: pos + 1, i, nome: c.nome, F: c.F, cap: c.cap, antes, k, depois: restante, ganhoLinha, ganho, motivo };
  });

  // Etapa 6: J depois, de duas formas independentes.
  const jNovo = jOld - ganho;
  const conferencia = caps.map(c => {
    const solRestante = c.solM - la * n[c.i];
    return { ...c, n: n[c.i], solRestante, termoNovo: c.F * solRestante };
  });
  const jNovoDireto = conferencia.reduce((s, c) => s + c.termoNovo, 0);

  return { la, N, termos, jOld, caps, ordem, iteracoes, n, plantadas: N - restante, ganho, jNovo, conferencia, jNovoDireto };
}

/* ======================================================================== *
 *  PARTE 2, Modelo 1: árvores proporcionais ao fluxo (ignora o sol)
 * ======================================================================== */

// Mesmas três ruas do PDF, agora sem olhar o sol (usa o comprimento inteiro).
export const PROPORCIONAL_DIDATICO = {
  la: 5,
  N: 10,
  arestas: PLANTIO_DIDATICO.arestas.map(({ nome, F, L }) => ({ nome, F, L }))
};

// Mesmas 10 arestas reais do Modelo 2, com N = 1000 (padrão do mapa). `somaF` é a soma de F das
// 44.834 arestas do arquivo (conferida pelo script de verificação da Parte 2).
export const PROPORCIONAL_REAL = {
  la: 6,
  N: 1000,
  somaF: 8889638.987002112,
  arestas: PLANTIO_REAL.arestas.map(({ nome, F, L }) => ({ nome, F, L }))
};

export function testeMesaProporcional({ la, N, arestas, somaF }) {
  const soma = somaF ?? arestas.reduce((s, a) => s + a.F, 0);
  // Ordem de exibição: fluxo decrescente, empate pela ordem de entrada.
  const ordem = arestas.map((_, i) => i).sort((a, b) => (arestas[b].F - arestas[a].F) || (a - b));
  const n = arestas.map(a => N * (a.F / soma));
  const linhas = arestas.map((a, i) => {
    const fracao = a.F / soma;
    const bruto = N * fracao;
    const cobertura = n[i] * la;
    return {
      ...a, fracao, bruto, n: n[i], ordem: ordem.indexOf(i) + 1,
      cobertura, cabe: cobertura <= a.L, termo: a.F * a.L, ganho: la * a.F * n[i], solRestante: a.L - la * n[i]
    };
  });
  const j1 = linhas.reduce((s, x) => s + x.termo, 0);
  const ganho = linhas.reduce((s, x) => s + x.ganho, 0);
  const somaBruto = linhas.reduce((s, x) => s + x.bruto, 0);
  const somaN = linhas.reduce((s, x) => s + x.n, 0);
  const jNovoDireto = linhas.reduce((s, x) => s + x.F * x.solRestante, 0);
  return { la, N, soma, linhas, ordem, j1, ganho, jNovo: j1 - ganho, somaBruto, somaN, jNovoDireto };
}
