// Algoritmo guloso do plantio, compartilhado pelos mapas 2 e 3.
//
//   J_old  = Σ Fᵢ·Sᵢ·Lᵢ
//   J_novo = J_old − lₐ·Σ Fᵢ·nᵢ
//   max Σ Fᵢ·nᵢ  s.a.  Σ nᵢ = N,  nᵢ inteiro ≥ 0,  nᵢ·lₐ ≤ Sᵢ·Lᵢ
//
// Cada árvore custa 1 e rende lₐ·Fᵢ, sem interação entre arestas: preencher
// as arestas de maior fluxo primeiro, até cobrir o sol de cada uma, é ótimo.

// Horário congelado em 7h. Os outros horários (9h a 15h) continuam no TopoJSON;
// para usá-los, troque esta constante.
export const HORA = 7;
export const HORAS = [7, 11];
export const chaveSol = (hora = HORA) => `s${hora}`;

// Índices das arestas em ordem decrescente de fluxo (empate: índice menor).
export function prepararOrdem(F) {
  const ordem = Array.from(F.keys());
  ordem.sort((a, b) => (F[b] - F[a]) || (a - b));
  return ordem;
}

// Quantas árvores cabem nos metros ao sol: ⌊S·L/lₐ⌋ (S em %).
export function capacidade(Spct, L, la) {
  return Math.floor((Spct / 100) * L / la + 1e-9);
}

export function distribuir(F, L, Spct, ordem, la, N) {
  const n = new Int32Array(F.length);
  let restante = N, jOld = 0, ganho = 0, capTotal = 0, arestas = 0, nMax = 0;
  for (let i = 0; i < F.length; i++) jOld += F[i] * (Spct[i] / 100) * L[i];
  for (const i of ordem) {
    const cap = capacidade(Spct[i], L[i], la);
    capTotal += cap;
    if (restante > 0 && cap > 0) {
      const k = Math.min(cap, restante);
      n[i] = k;
      restante -= k;
      ganho += la * F[i] * k;
      arestas++;
      if (k > nMax) nMax = k;
    }
  }
  return { n, jOld, jNovo: jOld - ganho, plantadas: N - restante, capTotal, arestas, nMax };
}

/* ------------------------------------------------------------------------ *
 *  Versão leve do Modelo 2: o que depende de lₐ e do horário é calculado uma
 *  vez (prepararGuloso); mudar N só faz uma busca binária (aplicarGuloso).
 *  O resultado é idêntico ao de `distribuir`.
 * ------------------------------------------------------------------------ */
export function prepararGuloso(F, L, Spct, ordem, la) {
  const m = ordem.length;
  const cap = new Int32Array(m);
  const pos = new Int32Array(m);              // posição de cada aresta na ordem
  const acumCap = new Float64Array(m + 1);    // Σ capacidades das k primeiras
  const acumGanho = new Float64Array(m + 1);  // Σ lₐ·F·cap das k primeiras
  const acumArestas = new Int32Array(m + 1);  // quantas dessas têm cap > 0
  const acumMax = new Int32Array(m + 1);      // maior cap entre elas
  let jOld = 0;
  for (let i = 0; i < m; i++) jOld += F[i] * (Spct[i] / 100) * L[i];
  for (let k = 0; k < m; k++) {
    const i = ordem[k];
    pos[i] = k;
    cap[i] = capacidade(Spct[i], L[i], la);
    acumCap[k + 1] = acumCap[k] + cap[i];
    acumGanho[k + 1] = acumGanho[k] + la * F[i] * cap[i];
    acumArestas[k + 1] = acumArestas[k] + (cap[i] > 0 ? 1 : 0);
    acumMax[k + 1] = Math.max(acumMax[k], cap[i]);
  }
  return { F, L, la, ordem, cap, pos, acumCap, acumGanho, acumArestas, acumMax, jOld, capTotal: acumCap[m] };
}

export function aplicarGuloso(p, N) {
  const m = p.ordem.length;
  // maior k com acumCap[k] ≤ N: as k primeiras arestas ficam cheias.
  let lo = 0, hi = m;
  while (lo < hi) {
    const meio = (lo + hi + 1) >> 1;
    if (p.acumCap[meio] <= N) lo = meio; else hi = meio - 1;
  }
  const k = lo;
  const resto = k < m ? N - p.acumCap[k] : 0;   // árvores na aresta parcial (ordem[k])
  const iParcial = k < m ? p.ordem[k] : -1;
  const ganho = p.acumGanho[k] + (iParcial >= 0 ? p.la * p.F[iParcial] * resto : 0);
  return {
    k, resto, iParcial,
    n: i => (p.pos[i] < k ? p.cap[i] : p.pos[i] === k ? resto : 0),
    jOld: p.jOld, jNovo: p.jOld - ganho, ganho,
    plantadas: p.acumCap[k] + resto, capTotal: p.capTotal,
    arestas: p.acumArestas[k] + (resto > 0 ? 1 : 0),
    nMax: Math.max(p.acumMax[k], resto)
  };
}

/* ------------------------------------------------------------------------ *
 *  Modelo 1 (ignora o sol): árvores proporcionais ao fluxo, sem arredondar.
 *
 *    nᵢ = N · Fᵢ / ΣF           (fracionário; Σnᵢ = N exato)
 *
 *    J₁      = Σ Fᵢ·Lᵢ            (a rua toda é tratada como exposta)
 *    J₁_novo = J₁ − lₐ · Σ Fᵢ·nᵢ
 * ------------------------------------------------------------------------ */

export function prepararProporcional(F, L, ordem = prepararOrdem(F)) {
  let somaF = 0, j1 = 0, comFluxo = 0;
  for (let i = 0; i < F.length; i++) { somaF += F[i]; j1 += F[i] * L[i]; if (F[i] > 0) comFluxo++; }
  return { F, L, ordem, somaF, j1, comFluxo };
}

export function aplicarProporcional(p, la, N) {
  const bruto = i => (N > 0 && p.somaF > 0 ? N * p.F[i] / p.somaF : 0);
  const v = new Float64Array(p.F.length);
  let ganho = 0, saturadas = 0, nMax = 0, arestas = 0;
  for (let j = 0; j < p.ordem.length; j++) {
    const i = p.ordem[j];
    if (!(p.F[i] > 0)) break;
    const k = bruto(i);
    v[i] = k;
    ganho += la * p.F[i] * k;
    arestas++;
    if (k > nMax) nMax = k;
    if (k * la > p.L[i]) saturadas++;   // mais árvores do que cabem na rua
  }
  const plantadas = N > 0 && arestas > 0 ? N : 0;
  return {
    n: i => v[i], bruto, nMax, jOld: p.j1, jNovo: p.j1 - ganho, ganho, plantadas, arestas, saturadas
  };
}
