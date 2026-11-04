import { useEffect, useMemo, useRef } from "react";
import { L, LIMITES_CIDADE, criarPanes } from "../../lib/leaflet.js";
import { mensagemErro } from "../../lib/dados.js";
import { corPorN } from "../../lib/cores.js";
import { fmt } from "../../lib/formato.js";
import { HORA, chaveSol, distribuir } from "../../lib/plantio.js";
import { useMapaLeaflet } from "../../hooks/useMapaLeaflet.js";
import { useArestasPlantio } from "../../hooks/useArestasPlantio.js";
import { useCamadaGeojson } from "../../hooks/useCamadaGeojson.js";
import { useParametrosPlantio } from "../../hooks/useParametrosPlantio.js";
import ControleLeaflet from "./ControleLeaflet.jsx";
import ControlesPlantio from "./ControlesPlantio.jsx";

// Mapa 2 (Etapa 2): distribuição das N árvores pelas arestas de maior fluxo na cidade toda.

const fundo = geojson => L.geoJSON(geojson, { pane: "graph", interactive: false, style: () => ({ color: "#bdbdbd", opacity: .6, weight: .45 }) });
const limite = geojson => L.geoJSON(geojson, { pane: "boundary", interactive: false, style: () => ({ color: "#111", fillOpacity: 0, opacity: .85, weight: 1.4 }) });

export default function MapaPlantio() {
  const ref = useRef(null);
  const map = useMapaLeaflet(ref, el => {
    const m = L.map(el, { preferCanvas: true });
    m.fitBounds(LIMITES_CIDADE);
    L.control.scale().addTo(m);
    criarPanes(m, [["graph", 350], ["flow", 450], ["boundary", 550]]);
    return m;
  });
  const renderer = useMemo(() => map && L.canvas({ pane: "flow", padding: .5, tolerance: 4 }), [map]);
  useCamadaGeojson(map, "grafo_fundo.topojson", fundo);
  useCamadaGeojson(map, "limite_territorial.topojson", limite);

  const { dados: D, erro } = useArestasPlantio();
  const { la, setLa, N, setN, calculo } = useParametrosPlantio();
  const r = useMemo(
    () => D && distribuir(D.F, D.L, D.S[chaveSol()], D.ordem, calculo.la, calculo.N),
    [D, calculo]
  );

  // Valores atuais lidos pelos rótulos e popups do Leaflet.
  const atual = useRef({ r: null, la: calculo.la });
  useEffect(() => { atual.current = { r, la: calculo.la }; }, [r, calculo.la]);

  // Rótulo ao passar o mouse (fluxo) e popup ao clicar (detalhes da aresta).
  const interagir = useMemo(() => {
    if (!map || !D) return null;
    const abrirPopup = (i, latlng) => {
      const { r, la } = atual.current;
      const S = D.S[chaveSol()][i] / 100;
      const sol = S * D.L[i], ni = r ? r.n[i] : 0;
      const linhas = [
        ["Fluxo F", fmt(D.F[i], 2)],
        ["log10", fmt(Math.log10(D.F[i]), 3)],
        ["Comprimento L", `${fmt(D.L[i], 1)} m`],
        [`Fração ao sol S (${HORA}h)`, `${fmt(S * 100)}%`],
        ["Sol S·L", `${fmt(sol, 1)} m`],
        ["Capacidade ⌊S·L/lₐ⌋", fmt(Math.floor(sol / la + 1e-9))],
        ["<b>Árvores nᵢ</b>", `<b>${ni}</b>`],
        ["Sol restante", `${fmt(Math.max(sol - ni * la, 0), 1)} m`]
      ];
      L.popup().setLatLng(latlng).setContent(
        `<strong>Aresta ${D.id[i]}</strong><table>${linhas.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join("")}</table>`
      ).openOn(map);
    };
    return (linha, i) => linha
      .bindTooltip(() => `Fluxo: ${fmt(D.F[i], 2)} pessoas`, { sticky: true, direction: "top", offset: [0, -6] })
      .on("click", e => abrirPopup(i, e.latlng));
  }, [map, D]);

  // Todas as arestas com fluxo, em cinza (desenhadas uma vez).
  useEffect(() => {
    if (!interagir) return;
    const base = L.layerGroup().addTo(map);
    D.geom.forEach((g, i) => {
      if (g) interagir(L.polyline(g, { renderer, color: "#7d8590", weight: 1, opacity: .6 }), i).addTo(base);
    });
    return () => base.remove();
  }, [map, D, renderer, interagir]);

  // Arestas que recebem árvores: cor e espessura por nᵢ (escala em raiz quadrada).
  useEffect(() => {
    if (!interagir || !r) return;
    const destaque = L.layerGroup().addTo(map);
    const raiz = Math.sqrt(Math.max(r.nMax, 1));
    for (const i of D.ordem) {
      const k = r.n[i];
      if (!k || !D.geom[i]) continue;
      const t = r.nMax > 1 ? (Math.sqrt(k) - 1) / (raiz - 1) : 1;
      interagir(L.polyline(D.geom[i], { renderer, color: corPorN(t), weight: 2.5 + 5.5 * t, opacity: .95 }), i).addTo(destaque);
    }
    return () => destaque.remove();
  }, [map, D, r, renderer, interagir]);

  function enquadrar() {
    if (!r) return;
    const pontos = [];
    r.n.forEach((k, i) => { if (k && D.geom[i]) pontos.push(...D.geom[i]); });
    if (pontos.length) map.fitBounds(L.latLngBounds(pontos), { padding: [30, 30] });
  }

  const status = erro ? mensagemErro(erro)
    : D ? `${fmt(D.F.length)} arestas com fluxo > 0`
    : "Carregando arestas…";
  const reducao = r ? r.jOld - r.jNovo : 0;

  return (
    <div ref={ref} className="mapa mapa--plantio" aria-label="Mapa interativo da distribuição de árvores pelas arestas de maior fluxo">
      <ControleLeaflet map={map} position="topleft" className="map-title">Plantio de árvores por fluxo</ControleLeaflet>
      <ControleLeaflet map={map} position="bottomleft" className="load-status">{status}</ControleLeaflet>
      <ControleLeaflet map={map} position="topright" className="panel">
        <details open>
          <summary>Parâmetros e resultado</summary>
          <ControlesPlantio la={la} setLa={setLa} N={N} setN={setN}
            rotuloLa="lₐ (m de sol por árvore)" rotuloN="N (árvores)" escalaLog />
          <table>
            <tbody>
              <tr><td>J_old = Σ F·S·L</td><td>{r ? fmt(r.jOld) : "—"}</td></tr>
              <tr><td>J_novo = J_old − lₐ·Σ F·n</td><td>{r ? fmt(r.jNovo) : "—"}</td></tr>
              <tr><td>Redução de J (pessoas·m)</td><td>{r ? fmt(reducao) : "—"}</td></tr>
              <tr className="result"><td>Redução</td><td>{r && r.jOld > 0 ? `${fmt(100 * reducao / r.jOld, 4)}%` : "—"}</td></tr>
              <tr><td>Árvores plantadas</td><td>{r ? `${fmt(r.plantadas)} / ${fmt(calculo.N)}` : "—"}</td></tr>
              <tr><td>Arestas com árvores</td><td>{r ? fmt(r.arestas) : "—"}</td></tr>
              <tr><td>Capacidade Σ⌊S·L/lₐ⌋</td><td>{r ? fmt(r.capTotal) : "—"}</td></tr>
            </tbody>
          </table>
          <div className="warning">
            {r && r.plantadas < calculo.N
              ? `A rede comporta só ${fmt(r.capTotal)} árvores com lₐ = ${fmt(calculo.la, 1)} m; ${fmt(calculo.N - r.plantadas)} ficaram sem lugar.`
              : ""}
          </div>
          <div className="legend-gradient legend-gradient--verde" />
          <div className="legend-range"><span>nᵢ = 1</span><span>{r && r.nMax ? `nᵢ = ${r.nMax}` : "—"}</span></div>
          <button type="button" onClick={enquadrar}>Enquadrar arestas com árvores</button>
        </details>
      </ControleLeaflet>
    </div>
  );
}
