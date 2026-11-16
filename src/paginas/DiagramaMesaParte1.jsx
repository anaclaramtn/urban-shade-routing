import { NOS, ARESTAS, PARADAS, RASTER, idAresta } from "../lib/testeMesa.js";

// Desenho do exemplo: células do raster, rede e parada. Com `fluxo` (Map id → F),
// a espessura de cada trecho é proporcional ao fluxo.
export default function DiagramaMesaParte1({ fluxo }) {
  const { valores, resolucao: r, x0, y0 } = RASTER;
  const no = id => NOS.find(n => n.id === id);
  const maximo = fluxo ? Math.max(...fluxo.values()) : 1;
  return (
    <figure className="mesa__figura">
      <svg viewBox="-10 -110 300 220" role="img" aria-label="Raster 2×2, rede de 4 nós e uma parada">
        {valores.flatMap((linha, i) => linha.map((v, j) => (
          <g key={`${i}-${j}`}>
            <rect x={x0 + j * r} y={-(y0 - i * r)} width={r} height={r}
              fill={v === null ? "none" : "var(--green-light)"} stroke="var(--line)" strokeDasharray={v === null ? "4 3" : undefined} />
            <text x={x0 + (j + 0.5) * r} y={-(y0 - (i + 0.5) * r) - 28} textAnchor="middle" opacity=".7">
              {v === null ? "sem dado" : `${v} pessoas`}
            </text>
          </g>
        )))}
        {ARESTAS.map(a => {
          const p = no(a.u), q = no(a.v), f = fluxo?.get(idAresta(a));
          return (
            <g key={idAresta(a)}>
              <line x1={p.x} y1={-p.y} x2={q.x} y2={-q.y} stroke={fluxo ? "var(--sun)" : "var(--ink-soft)"}
                strokeWidth={fluxo ? 3 + 14 * (f / maximo) : 3} strokeLinecap="round" />
              <text x={(p.x + q.x) / 2 + (p.x === q.x ? 12 : 0)} y={-(p.y + q.y) / 2 + (p.x === q.x ? 4 : -10)}>
                {fluxo ? `F = ${f}` : `${a.L} m`}
              </text>
            </g>
          );
        })}
        {NOS.map(n => (
          <g key={n.id}>
            <circle cx={n.x} cy={-n.y} r="9" fill="var(--surface)" stroke="var(--ink)" strokeWidth="2" />
            <text x={n.x} y={-n.y + 4} textAnchor="middle" fontWeight="800">{n.id}</text>
          </g>
        ))}
        {PARADAS.map(p => (
          <g key={p.id}>
            <rect x={p.x - 6} y={-p.y - 6} width="12" height="12" fill="var(--green-mid)" />
            <text x={p.x + 10} y={-p.y + 22}>{p.id}</text>
          </g>
        ))}
      </svg>
    </figure>
  );
}
