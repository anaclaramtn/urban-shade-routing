export const VIRIDIS = ["#440154", "#482878", "#3e4989", "#31688e", "#26828e", "#1f9e89", "#35b779", "#6ece58", "#b5de2b", "#fde725"];

// Escala do mapa da Etapa 1 ("Arestas — log10 do fluxo"): log10 de F na cidade inteira.
export const LOG10_FLUXO = { min: -2.5081, max: 3.6587 };
export const LOG10_POPULACAO = { min: -3.6547, max: 3.205 };

const rgb = hex => hex.slice(1).match(/.{2}/g).map(x => parseInt(x, 16));

export function corViridis(valor, min, max) {
  const t = Math.max(0, Math.min(1, (valor - min) / (max - min)));
  const pos = t * (VIRIDIS.length - 1);
  const i = Math.min(VIRIDIS.length - 2, Math.floor(pos));
  const u = pos - i;
  const a = rgb(VIRIDIS[i]), b = rgb(VIRIDIS[i + 1]);
  return "#" + a.map((x, k) => Math.round(x + (b[k] - x) * u).toString(16).padStart(2, "0")).join("");
}

// Verde claro → escuro para o número de árvores (t de 0 a 1).
export function corPorN(t) {
  const a = [199, 233, 180], b = [65, 171, 93], c = [0, 68, 27];
  const [p, q, u] = t < .5 ? [a, b, t / .5] : [b, c, (t - .5) / .5];
  return `rgb(${p.map((v, k) => Math.round(v + (q[k] - v) * u)).join(",")})`;
}
