// Camada Leaflet leve para desenhar dezenas de milhares de arestas.
//
// Por que é mais rápida que `L.polyline` por aresta:
//  - um único <canvas> para tudo (nenhum objeto Leaflet por aresta);
//  - coordenadas pré-projetadas (Web Mercator) em um vetor plano;
//  - o desenho agrupa as arestas por "balde" de cor/espessura: cada balde é
//    UM traçado, em vez de um traçado por aresta;
//  - arestas fora da tela são puladas (caixa envolvente pré-calculada);
//  - o mouse é resolvido por uma grade espacial, só quando o mouse para.
//
//   const camada = camadaArestas(geom, { aoPassar, aoClicar, fundo });
//   camada.addTo(map);
//   camada.definir({ indices, balde, estilos });   // redesenha
//
//   geom     [[lat, lng], …] por aresta (ou null)
//   indices  quais arestas desenhar em destaque (em ordem de empilhamento)
//   balde    i → número do balde (0 … estilos.length-1)
//   estilos  [{ color, weight }, …]
//   fundo    { color, weight, opacity }: todas as arestas, desenhadas antes

import { L } from "./leaflet.js";

const GRADE = 128;
const TOLERANCIA_PX = 7;
const PREENCHIMENTO = 0.25; // o canvas é maior que a tela, para o arrasto não mostrar bordas vazias

const mercX = lng => (lng + 180) / 360;
const mercY = lat => {
  const s = Math.sin(lat * Math.PI / 180);
  return 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI);
};

export function camadaArestas(geom, { aoPassar, aoClicar, fundo, pane = "overlayPane" } = {}) {
  // --- geometria plana ---
  const n = geom.length;
  const inicio = new Int32Array(n + 1);
  let total = 0;
  for (let i = 0; i < n; i++) { inicio[i] = total; total += geom[i] ? geom[i].length : 0; }
  inicio[n] = total;
  const xs = new Float64Array(total), ys = new Float64Array(total);
  const caixa = new Float64Array(n * 4); // minX, minY, maxX, maxY
  let gx0 = Infinity, gy0 = Infinity, gx1 = -Infinity, gy1 = -Infinity;
  for (let i = 0; i < n; i++) {
    const g = geom[i];
    let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
    if (g) {
      for (let j = 0; j < g.length; j++) {
        const x = mercX(g[j][1]), y = mercY(g[j][0]);
        xs[inicio[i] + j] = x; ys[inicio[i] + j] = y;
        if (x < a) a = x; if (x > c) c = x; if (y < b) b = y; if (y > d) d = y;
      }
    }
    caixa.set([a, b, c, d], i * 4);
    if (a < gx0) gx0 = a; if (b < gy0) gy0 = b; if (c > gx1) gx1 = c; if (d > gy1) gy1 = d;
  }

  // --- grade espacial para o mouse ---
  const larg = (gx1 - gx0) || 1, alt = (gy1 - gy0) || 1;
  const celulas = Array.from({ length: GRADE * GRADE }, () => []);
  const col = x => Math.min(GRADE - 1, Math.max(0, Math.floor((x - gx0) / larg * GRADE)));
  const lin = y => Math.min(GRADE - 1, Math.max(0, Math.floor((y - gy0) / alt * GRADE)));
  for (let i = 0; i < n; i++) {
    if (!geom[i]) continue;
    for (let r = lin(caixa[i * 4 + 1]); r <= lin(caixa[i * 4 + 3]); r++) {
      for (let c = col(caixa[i * 4]); c <= col(caixa[i * 4 + 2]); c++) celulas[r * GRADE + c].push(i);
    }
  }

  let estado = { indices: [], balde: () => 0, estilos: [{ color: "#000", weight: 1 }] };
  let map = null, canvas = null, ctx = null, topoEsq = null, escala = 1, quadro = 0, mouseQuadro = 0, ultimoHit = -1;

  const Camada = L.Layer.extend({
    onAdd(m) {
      map = m;
      canvas = L.DomUtil.create("canvas", "leaflet-zoom-animated");
      canvas.style.pointerEvents = "none";
      ctx = canvas.getContext("2d");
      map.getPane(pane).appendChild(canvas);
      this._ajustar();
      map.on("mousemove", this._mouse, this);
      map.on("mouseout", this._sair, this);
      map.on("click", this._clique, this);
    },
    onRemove(m) {
      cancelAnimationFrame(quadro); cancelAnimationFrame(mouseQuadro);
      m.off("mousemove", this._mouse, this);
      m.off("mouseout", this._sair, this);
      m.off("click", this._clique, this);
      L.DomUtil.remove(canvas);
      m.getContainer().style.cursor = "";
      map = canvas = ctx = null;
    },
    getEvents() {
      const e = { viewreset: this._ajustar, moveend: this._ajustar, zoomend: this._ajustar, resize: this._ajustar };
      if (map && map._zoomAnimated) e.zoomanim = this._animarZoom;
      return e;
    },
    // Mesmo truque do renderizador de canvas do Leaflet: durante o zoom, o canvas é só escalado.
    _animarZoom(ev) {
      const esc = map.getZoomScale(ev.zoom, map.getZoom());
      const origem = map._latLngBoundsToNewLayerBounds(map.getBounds(), ev.zoom, ev.center).min;
      L.DomUtil.setTransform(canvas, origem, esc);
    },
    _ajustar() {
      if (!map) return;
      const tam = map.getSize();
      const p = PREENCHIMENTO;
      const min = map.containerPointToLayerPoint(tam.multiplyBy(-p)).round();
      const max = map.containerPointToLayerPoint(tam.multiplyBy(1 + p)).round();
      const dim = max.subtract(min);
      const dpr = window.devicePixelRatio || 1;
      topoEsq = min;
      escala = dpr;
      canvas.width = Math.round(dim.x * dpr);
      canvas.height = Math.round(dim.y * dpr);
      canvas.style.width = `${dim.x}px`;
      canvas.style.height = `${dim.y}px`;
      L.DomUtil.setPosition(canvas, min);
      this._desenhar();
    },
    // Agenda o redesenho para o próximo quadro (várias mudanças seguidas viram um desenho só).
    redesenhar() {
      if (!map || quadro) return;
      quadro = requestAnimationFrame(() => { quadro = 0; this._desenhar(); });
    },
    _desenhar() {
      if (!map || !ctx) return;
      const z = map.getZoom();
      const S = 256 * 2 ** z;
      const origem = map.getPixelOrigin();
      const ox = origem.x + topoEsq.x, oy = origem.y + topoEsq.y; // pixel global do canto do canvas
      const W = canvas.width / escala, H = canvas.height / escala;
      ctx.setTransform(escala, 0, 0, escala, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.lineJoin = ctx.lineCap = "round";

      // Arestas visíveis no canvas (em coordenadas Mercator).
      const x0 = ox / S, x1 = (ox + W) / S, y0 = oy / S, y1 = (oy + H) / S;
      const visivel = i => {
        const b = i * 4;
        return caixa[b + 2] >= x0 && caixa[b] <= x1 && caixa[b + 3] >= y0 && caixa[b + 1] <= y1;
      };
      const traco = i => {
        const a = inicio[i], b = inicio[i + 1];
        ctx.moveTo(xs[a] * S - ox, ys[a] * S - oy);
        for (let j = a + 1; j < b; j++) ctx.lineTo(xs[j] * S - ox, ys[j] * S - oy);
      };

      if (fundo) {
        ctx.beginPath();
        for (let i = 0; i < n; i++) if (geom[i] && visivel(i)) traco(i);
        ctx.strokeStyle = fundo.color; ctx.lineWidth = fundo.weight; ctx.globalAlpha = fundo.opacity ?? 1;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      const baldes = estado.estilos.map(() => []);
      for (const i of estado.indices) if (geom[i] && visivel(i)) baldes[estado.balde(i)].push(i);
      baldes.forEach((lista, b) => {
        if (!lista.length) return;
        ctx.beginPath();
        for (const i of lista) traco(i);
        ctx.strokeStyle = estado.estilos[b].color; ctx.lineWidth = estado.estilos[b].weight;
        ctx.stroke();
      });
    },

    definir(novo) {
      estado = { ...estado, ...novo };
      this.redesenhar();
    },

    // --- mouse: aresta mais próxima do ponto, dentro de TOLERANCIA_PX ---
    _procurar(ponto) {
      const z = map.getZoom(), S = 256 * 2 ** z;
      const o = map.getPixelOrigin();
      const px = (ponto.x + o.x) / S, py = (ponto.y + o.y) / S; // Mercator
      const tol = TOLERANCIA_PX / S;
      let melhor = -1, menor = tol * tol;
      const c0 = col(px - tol), c1 = col(px + tol), r0 = lin(py - tol), r1 = lin(py + tol);
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
        for (const i of celulas[r * GRADE + c]) {
          for (let j = inicio[i]; j < inicio[i + 1] - 1; j++) {
            const ax = xs[j], ay = ys[j], bx = xs[j + 1], by = ys[j + 1];
            const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy;
            const t = len2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
            const ex = px - (ax + t * dx), ey = py - (ay + t * dy);
            const d2 = ex * ex + ey * ey;
            if (d2 <= menor) { menor = d2; melhor = i; }
          }
        }
      }
      return melhor;
    },
    _mouse(e) {
      if (mouseQuadro) return;
      mouseQuadro = requestAnimationFrame(() => {
        mouseQuadro = 0;
        if (!map) return;
        const i = this._procurar(map.latLngToLayerPoint(e.latlng));
        map.getContainer().style.cursor = i >= 0 ? "pointer" : "";
        if (i !== ultimoHit) { ultimoHit = i; aoPassar?.(i, e.latlng); } else if (i >= 0) aoPassar?.(i, e.latlng);
      });
    },
    _sair() { ultimoHit = -1; aoPassar?.(-1); },
    _clique(e) {
      const i = this._procurar(map.latLngToLayerPoint(e.latlng));
      if (i >= 0) aoClicar?.(i, e.latlng);
    }
  });

  return new Camada();
}
