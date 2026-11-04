import { useEffect, useMemo, useRef, useState } from "react";
import { L, criarPanes } from "../../lib/leaflet.js";
import { mensagemErro } from "../../lib/dados.js";
import { corViridis, LOG10_FLUXO } from "../../lib/cores.js";
import { fmt, plural } from "../../lib/formato.js";
import { HORA, capacidade, chaveSol, distribuir } from "../../lib/plantio.js";
import { useMapaLeaflet } from "../../hooks/useMapaLeaflet.js";
import { useArestasPlantio } from "../../hooks/useArestasPlantio.js";
import { useCamadaGeojson } from "../../hooks/useCamadaGeojson.js";
import { useParametrosPlantio } from "../../hooks/useParametrosPlantio.js";
import ControleLeaflet from "./ControleLeaflet.jsx";
import ControlesPlantio from "./ControlesPlantio.jsx";
import LegendaGradiente from "./LegendaGradiente.jsx";

// Mapa 3 (Etapa 2, método): recorte de ~1,2 km a oeste do Centro. O cálculo é
// feito na cidade toda; só o recorte é desenhado.
const RECORTE = L.latLngBounds([[-3.7185, -38.5610], [-3.7065, -38.5490]]);

const fundo = geojson => L.geoJSON(geojson, { pane: "graph", interactive: false, style: () => ({ color: "#bdbdbd", opacity: .7, weight: .8 }) });

function InfoAresta({ D, r, la, i, arvore }) {
  const Spct = D.S[chaveSol()][i];
  const sol = (Spct / 100) * D.L[i], cap = capacidade(Spct, D.L[i], la), ni = r.n[i];
  const titulo = ni === 0 ? "Rua sem árvores"
    : arvore && arvore <= ni ? `Árvore ${arvore} de ${ni} nesta rua`
    : `Rua com ${plural(ni, "árvore", "árvores")}`;
  return (
    <>
      <h4>{titulo}</h4>
      <div className="numeros">
        <div><span>Fluxo</span><strong>{fmt(D.F[i], 2)}</strong><span>log10 {fmt(Math.log10(D.F[i]), 3)}</span></div>
        <div><span>Árvores plantadas</span><strong>{fmt(ni)}</strong></div>
        <div><span>Metros ao sol ({HORA}h)</span><strong>{fmt(sol, 1)} m</strong></div>
        <div><span>Árvores que cabem</span><strong>{fmt(cap)}</strong></div>
      </div>
      <div className="extra">Comprimento {fmt(D.L[i], 1)} m · {fmt(Spct)}% ao sol · aresta {D.id[i]}</div>
    </>
  );
}

export default function MapaPlantioDetalhe() {
  const ref = useRef(null);
  const map = useMapaLeaflet(ref, el => {
    const m = L.map(el, { preferCanvas: true, maxBounds: RECORTE.pad(.35), maxBoundsViscosity: 1 });
    m.fitBounds(RECORTE);
    m.setMinZoom(m.getZoom());
    L.control.scale().addTo(m);
    criarPanes(m, [["graph", 350], ["base", 420], ["flow", 450], ["planted", 480], ["trees", 500], ["boundary", 550]]);
    return m;
  });

  const render = useMemo(() => map && Object.fromEntries(
    ["base", "flow", "planted", "trees"].map(p => [p, L.canvas({ pane: p, padding: .5, tolerance: 5 })])
  ), [map]);

  const camadas = useMemo(() => map && {
    fundo: L.layerGroup(), base: L.layerGroup(), fluxo: L.layerGroup(),
    plantadas: L.layerGroup(), arvores: L.layerGroup()
  }, [map]);

  // Controle de camadas (abaixo do título, como antes). "log10 do fluxo" começa desligada.
  useEffect(() => {
    if (!camadas) return;
    for (const k of ["fundo", "base", "plantadas", "arvores"]) camadas[k].addTo(map);
    const controle = L.control.layers({}, {
      "Rede de pedestres (fundo)": camadas.fundo,
      "Arestas com fluxo (cinza)": camadas.base,
      "Arestas — log10 do fluxo": camadas.fluxo,
      "Arestas que recebem árvores": camadas.plantadas,
      "Árvores plantadas": camadas.arvores
    }, { collapsed: false, position: "topleft" }).addTo(map);
    return () => { controle.remove(); for (const c of Object.values(camadas)) c.remove(); };
  }, [map, camadas]);

  useCamadaGeojson(camadas?.fundo, "grafo_fundo.topojson", fundo);

  const { dados: D, erro } = useArestasPlantio();
  const { la, setLa, N, setN, calculo } = useParametrosPlantio();
  const r = useMemo(
    () => D && distribuir(D.F, D.L, D.S[chaveSol()], D.ordem, calculo.la, calculo.N),
    [D, calculo]
  );

  const noRecorte = useMemo(() => {
    if (!D) return [];
    const area = RECORTE.pad(.05);
    return D.geom.flatMap((g, i) => (g && g.some(p => area.contains(p)) ? [i] : []));
  }, [D]);

  // Aresta (e árvore) sob o mouse, mostrada no painel fixo de detalhes.
  const [selecionada, setSelecionada] = useState(null);

  const atual = useRef(null);
  useEffect(() => { atual.current = r; }, [r]);

  const ligarHover = useMemo(() => {
    if (!D) return null;
    const rotulo = i => {
      const ni = atual.current ? atual.current.n[i] : 0;
      return `Fluxo ${fmt(D.F[i], 0)} · ${ni ? plural(ni, "árvore", "árvores") : "sem árvores"}`;
    };
    return (camada, i, arvore) => {
      camada.bindTooltip(() => rotulo(i), { sticky: true, direction: "top", offset: [0, -6], className: "rotulo", opacity: .95 });
      const destacar = () => {
        setSelecionada({ i, arvore });
        if (!arvore) camada.setStyle({ weight: camada.options.pesoOriginal + 3 });
      };
      camada.on("mouseover", destacar);
      camada.on("click", destacar);
      if (!arvore) camada.on("mouseout", () => camada.setStyle({ weight: camada.options.pesoOriginal }));
      return camada;
    };
  }, [D]);

  const linha = (g, opcoes, i) => ligarHover(L.polyline(g, { ...opcoes, pesoOriginal: opcoes.weight }), i);

  // Arestas do recorte: cinza e colorida pelo log10 do fluxo (mesma escala do mapa 1).
  useEffect(() => {
    if (!camadas || !ligarHover) return;
    const feitas = [];
    for (const i of noRecorte) {
      const g = D.geom[i];
      feitas.push(linha(g, { renderer: render.base, color: "#7d8590", weight: 2, opacity: .75 }, i).addTo(camadas.base));
      const cor = corViridis(Math.log10(D.F[i]), LOG10_FLUXO.min, LOG10_FLUXO.max);
      feitas.push(linha(g, { renderer: render.flow, color: cor, weight: 3, opacity: .9 }, i).addTo(camadas.fluxo));
    }
    return () => feitas.forEach(c => c.remove());
  }, [camadas, render, D, noRecorte, ligarHover]);

  // Arestas com árvores e as árvores, espaçadas igualmente ao longo da aresta (ilustrativo).
  useEffect(() => {
    if (!camadas || !ligarHover || !r) return;
    for (const i of noRecorte) {
      const k = r.n[i];
      if (!k) continue;
      const g = D.geom[i];
      linha(g, { renderer: render.planted, color: "#1a9641", weight: 4, opacity: .55 }, i).addTo(camadas.plantadas);
      for (let j = 0; j < k; j++) {
        const t = (j + .5) / k;
        const p = [g[0][0] + (g[g.length - 1][0] - g[0][0]) * t, g[0][1] + (g[g.length - 1][1] - g[0][1]) * t];
        const marcador = L.circleMarker(p, { renderer: render.trees, radius: 4.5, color: "#00441b", weight: 1.2, fillColor: "#1a9641", fillOpacity: .95 });
        ligarHover(marcador, i, j + 1).addTo(camadas.arvores);
      }
    }
    return () => { camadas.plantadas.clearLayers(); camadas.arvores.clearLayers(); };
  }, [camadas, render, D, r, noRecorte, ligarHover]);

  const resumo = useMemo(() => {
    if (!r) return null;
    let arvores = 0, arestas = 0;
    for (const i of noRecorte) if (r.n[i]) { arvores += r.n[i]; arestas++; }
    return { arvores, arestas };
  }, [r, noRecorte]);

  let info;
  if (selecionada && D && r) info = <InfoAresta D={D} r={r} la={calculo.la} {...selecionada} />;
  else if (erro) info = mensagemErro(erro);
  else info = <span className="dica">{D ? `${fmt(noRecorte.length)} ruas com fluxo neste recorte.` : "Carregando arestas…"}</span>;

  return (
    <div ref={ref} className="mapa mapa--detalhe" aria-label="Recorte interativo mostrando onde as árvores são plantadas de acordo com o fluxo">
      <ControleLeaflet map={map} position="topleft" className="box map-title">Recorte: onde as árvores são plantadas</ControleLeaflet>
      <ControleLeaflet map={map} position="bottomleft" className="box info">{info}</ControleLeaflet>
      <ControleLeaflet map={map} position="topright" className="box panel">
        <details open>
          <summary>Parâmetros</summary>
          <ControlesPlantio la={la} setLa={setLa} N={N} setN={setN} rotuloLa="lₐ" rotuloN="N (cidade toda)" />
          <table>
            <tbody>
              <tr><td>Árvores neste recorte</td><td>{resumo ? `${fmt(resumo.arvores)} de ${fmt(r.plantadas)}` : "—"}</td></tr>
              <tr><td>Arestas com árvores no recorte</td><td>{resumo ? `${fmt(resumo.arestas)} de ${fmt(noRecorte.length)}` : "—"}</td></tr>
            </tbody>
          </table>
        </details>
      </ControleLeaflet>
      <ControleLeaflet map={map} position="bottomright" className="box legend">
        <LegendaGradiente titulo="Arestas — log10 do fluxo" min="−2,51" max="3,66" />
        <div className="legend-row"><span className="tree-dot" />Árvore plantada</div>
        <div className="legend-row"><span className="grey-line" />Aresta com fluxo</div>
      </ControleLeaflet>
    </div>
  );
}
