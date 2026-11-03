// Distribuição de árvores — usada pelos mapas da Etapa 2.
//
// J_old  = Σ F_i·S_i·L_i
// J_novo = J_old − l_a·Σ F_i·n_i
// max Σ F_i·n_i  sujeito a  Σ n_i = N,  0 ≤ n_i ≤ ⌊S_i·L_i / l_a⌋,  n_i inteiro.
//
// Toda árvore rende l_a·F_i, então encher primeiro as arestas de maior F
// (até zerar o sol de cada uma) é a solução ótima.

function prepararOrdem(F) {
  // Ordena uma única vez por F decrescente (empate: índice, para ser determinístico).
  const ordem = Array.from(F.keys());
  ordem.sort((a, b) => (F[b] - F[a]) || (a - b));
  return ordem;
}

function capacidade(Spct, L, la) {
  // Número máximo de árvores que cabem no sol da aresta: ⌊S·L / l_a⌋.
  return Math.floor((Spct / 100) * L / la + 1e-9);
}

function distribuir(F, L, Spct, ordem, la, N) {
  const n = new Int32Array(F.length);
  let restante = N, jOld = 0, ganho = 0, capTotal = 0, arestas = 0, nMax = 0;
  for (let i = 0; i < F.length; i++) jOld += F[i] * (Spct[i] / 100) * L[i];
  for (const i of ordem) {
    const cap = capacidade(Spct[i], L[i], la);
    capTotal += cap;
    if (restante > 0 && cap > 0) {
      const k = Math.min(cap, restante);
      n[i] = k; restante -= k; ganho += la * F[i] * k; arestas++;
      if (k > nMax) nMax = k;
    }
  }
  return { n, jOld, jNovo: jOld - ganho, plantadas: N - restante, capTotal, arestas, nMax };
}
