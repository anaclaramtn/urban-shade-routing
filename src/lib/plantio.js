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
export const chaveSol = () => `s${HORA}`;

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
