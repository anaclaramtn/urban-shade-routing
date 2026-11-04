import { useEffect, useRef, useState } from "react";
import { L, LIMITES_CIDADE, criarPanes } from "../../lib/leaflet.js";
import { lerTopojson, carregarArestasPlantio } from "../../lib/dados.js";
import { corViridis, LOG10_FLUXO, LOG10_POPULACAO } from "../../lib/cores.js";
import { fmt } from "../../lib/formato.js";
import { useMapaLeaflet } from "../../hooks/useMapaLeaflet.js";
import ControleLeaflet from "./ControleLeaflet.jsx";
import LegendaGradiente from "./LegendaGradiente.jsx";

// Mapa 1 (Etapa 1): fluxo potencial nas arestas e camadas de diagnóstico.

const AGUARDANDO = "Camadas carregadas sob demanda";

// Tabela genérica de tooltip. Campos marcados com "log" ganham uma linha log10 logo abaixo.
function tabela(propriedades, campos) {
  const linhas = campos.map(([chave, rotulo, casas, log]) => {
    const bruto = propriedades[chave];
    let valor = bruto;
    if (typeof valor === "number" && casas !== undefined) valor = valor.toFixed(casas);
    let linha = `<tr><th>${rotulo}</th><td>${valor ?? "—"}</td></tr>`;
    if (log) linha += `<tr><th>log10</th><td>${typeof bruto === "number" && bruto > 0 ? Math.log10(bruto).toFixed(3) : "—"}</td></tr>`;
    return linha;
  }).join("");
  return `<table>${linhas}</table>`;
}

// Tooltip das arestas: fluxo (desta camada) + comprimento e sol (das arestas do
// plantio, carregadas na primeira passada do mouse).
function tooltipAresta(p, sol) {
  const linhas = [
    ["Aresta", p.edge_id],
    ["Fluxo", fmt(p.edge_population, 2)],
    ["log10", fmt(p.edge_population_log10, 3)]
  ];
  let blocoSol;
  if (sol === null) blocoSol = `<div class="nota">Carregando dados de sol…</div>`;
  else if (sol === false) blocoSol = `<div class="nota">Dados de sol indisponíveis.</div>`;
  else {
    const i = sol.indice.get(p.edge_id);
    if (i === undefined) blocoSol = `<div class="nota">Sem dados de sol para esta aresta.</div>`;
    else {
      const L_ = sol.L[i];
      linhas.push(["Comprimento", `${fmt(L_, 1)} m`]);
      const cab = sol.horas.map(h => `<th>${h}h</th>`).join("");
      const pct = sol.horas.map(h => `<td>${fmt(sol.S[`s${h}`][i])}%</td>`).join("");
      const met = sol.horas.map(h => `<td>${fmt(sol.S[`s${h}`][i] / 100 * L_, 1)}</td>`).join("");
      blocoSol = `<table class="sol"><thead><tr><th>Sol</th>${cab}</tr></thead>`
        + `<tr><th>Fração ao sol</th>${pct}</tr><tr><th>Metros ao sol</th>${met}</tr></table>`
        + `<div class="nota">Sombra de prédios + árvores existentes.</div>`;
    }
  }
  return `<table>${linhas.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join("")}</table>${blocoSol}`;
}

const raioOrigem = map => Math.min(8.5, 4.5 + Math.max(0, map.getZoom() - 11) * .4);

const CAMPOS_GHSL = [["population_raw", "População", 2, "log"], ["raster_row", "Linha"], ["raster_col", "Coluna"]];
const CAMPOS_CENTROIDE = [["cell_id", "Célula"], ["population", "População", 2, "log"], ["distance_centroid_to_node_m", "Distância (m)", 1]];
const CAMPOS_PARADA_NO = [["bus_stop_id", "Parada"], ["bus_stop_name", "Nome"], ["distance_stop_to_node_m", "Distância (m)", 1]];

function definirCamadas(map, rendererFluxo) {
  return [
    {
      id: "graph", label: "Grafo de fundo", file: "grafo_fundo.topojson", pane: "graph", padrao: true,
      style: () => ({ color: "#8f8f8f", opacity: .55, weight: .45 })
    },
    {
      id: "ghslRelevant", label: "GHSL população relevante", file: "ghsl_populacao_relevante.topojson", pane: "polygons",
      style: () => ({ color: "#2166ac", fillColor: "#2182c9", fillOpacity: .14, weight: .35 }),
      fields: CAMPOS_GHSL
    },
    {
      id: "ghslZero", label: "GHSL zero", file: "ghsl_zero.topojson", pane: "polygons",
      style: () => ({ color: "#b2182b", fillColor: "#d7191c", fillOpacity: .16, weight: .25 }),
      fields: CAMPOS_GHSL
    },
    {
      id: "flow", label: "Arestas — fluxo log10", file: "arestas_fluxo_potencial_log10.topojson", pane: "flow", padrao: true,
      style: f => ({ color: corViridis(f.properties.edge_population_log10, LOG10_FLUXO.min, LOG10_FLUXO.max), opacity: .88, weight: 1.15 }),
      renderer: rendererFluxo,
      aresta: true,
      highlight: { weight: 4, opacity: 1 }
    },
    {
      id: "centroidOrigin", label: "Associação centroide → origem", file: "associacao_centroide_origem.topojson", pane: "links",
      style: () => ({ color: "#000", dashArray: "6, 6", opacity: .82, weight: 1.25 }),
      fields: CAMPOS_CENTROIDE
    },
    {
      id: "centroids", label: "Centros geométricos das células GHSL", file: "centros_celulas_ghsl.topojson", pane: "points",
      point: (_, latlng) => L.circleMarker(latlng, { pane: "points", radius: 2.5, color: "#111", weight: .7, fillColor: "#fff", fillOpacity: .95 }),
      fields: CAMPOS_CENTROIDE
    },
    {
      id: "origins", label: "Pontos de origem — população log10", file: "pontos_origem_log10.topojson", pane: "points", padrao: true,
      point: (f, latlng) => L.circleMarker(latlng, {
        pane: "points", radius: raioOrigem(map), weight: 0, fillOpacity: 1,
        fillColor: corViridis(f.properties.population_log10, LOG10_POPULACAO.min, LOG10_POPULACAO.max)
      }),
      fields: [["cell_id", "Célula"], ["population", "População", 2], ["population_log10", "log10", 3]]
    },
    {
      id: "nodeStop", label: "Associação nó → parada GTFS", file: "associacao_no_parada_gtfs.topojson", pane: "links",
      style: () => ({ color: "#000", dashArray: "6, 6", opacity: .88, weight: 1.4 }),
      fields: CAMPOS_PARADA_NO
    },
    {
      id: "stops", label: "Paradas GTFS (vermelho)", file: "paradas_gtfs.topojson", pane: "points", padrao: true,
      point: (_, latlng) => L.circleMarker(latlng, { pane: "points", radius: 4, color: "#8b0000", weight: .45, fillColor: "#d7191c", fillOpacity: .95 }),
      fields: [["bus_stop_id", "Parada"], ["bus_stop_name", "Nome"]]
    },
    {
      id: "boundary", label: "Limite territorial", file: "limite_territorial.topojson", pane: "boundary",
      style: () => ({ color: "#111", fillOpacity: 0, opacity: .85, weight: 1.4 })
    }
  ];
}

export default function MapaFluxo() {
  const ref = useRef(null);
  const map = useMapaLeaflet(ref, el => {
    const m = L.map(el, { center: [-3.793314515, -38.519615315], zoom: 11, preferCanvas: true });
    m.fitBounds(LIMITES_CIDADE);
    L.control.scale().addTo(m);
    criarPanes(m, [["polygons", 300], ["graph", 350], ["links", 400], ["flow", 450], ["points", 500], ["boundary", 550]]);
    return m;
  });
  const [status, setStatus] = useState(AGUARDANDO);

  useEffect(() => {
    if (!map) return;
    let ativo = true;
    let sol = null, solPedido = false, arestaSobMouse = null;

    function carregarSol() {
      if (solPedido) return;
      solPedido = true;
      carregarArestasPlantio()
        .then(D => { sol = D; })
        .catch(erro => { sol = false; console.error(erro); })
        .finally(() => { if (ativo) arestaSobMouse?.getTooltip()?.update(); });
    }

    const camadas = definirCamadas(map, L.canvas({ pane: "flow", tolerance: 6 }));
    const grupos = {}, porGrupo = new Map();
    for (const c of camadas) {
      c.group = L.featureGroup();
      grupos[c.label] = c.group;
      porGrupo.set(c.group, c);
    }
    const controle = L.control.layers({}, grupos, { collapsed: false, position: "topright" }).addTo(map);

    function carregar(c) {
      if (c.carregando) return c.carregando;
      c.carregando = (async () => {
        setStatus(`Carregando: ${c.label}`);
        const geojson = await lerTopojson(c.file);
        if (!ativo) return;
        c.rendered = L.geoJSON(geojson, {
          pane: c.pane,
          style: c.style,
          pointToLayer: c.point,
          renderer: c.renderer,
          onEachFeature: (feature, layer) => {
            if (c.aresta) layer.bindTooltip(() => tooltipAresta(feature.properties, sol), { sticky: true });
            else if (c.fields) layer.bindTooltip(tabela(feature.properties, c.fields), { sticky: true });
            if (c.highlight) {
              layer.on("mouseover", () => { arestaSobMouse = layer; carregarSol(); layer.setStyle(c.highlight); });
              layer.on("mouseout", () => { arestaSobMouse = null; c.rendered.resetStyle(layer); });
            }
          }
        }).addTo(c.group);
        setStatus(AGUARDANDO);
      })().catch(erro => {
        c.carregando = null;
        if (ativo) setStatus(`Erro ao carregar: ${c.label}`);
        console.error(erro);
      });
      return c.carregando;
    }

    const aoAdicionar = e => { const c = porGrupo.get(e.layer); if (c) carregar(c); };
    const aoZoom = () => {
      camadas.find(c => c.id === "origins").rendered?.eachLayer(l => l.setRadius?.(raioOrigem(map)));
    };
    map.on("overlayadd", aoAdicionar);
    map.on("zoomend", aoZoom);
    for (const c of camadas.filter(c => c.padrao)) { c.group.addTo(map); carregar(c); }

    return () => {
      ativo = false;
      map.off("overlayadd", aoAdicionar);
      map.off("zoomend", aoZoom);
      controle.remove();
      for (const c of camadas) c.group.remove();
    };
  }, [map]);

  return (
    <div ref={ref} className="mapa mapa--fluxo" aria-label="Mapa interativo das rotas potenciais até as paradas">
      <ControleLeaflet map={map} position="topleft" className="map-title">Mapa geral interativo</ControleLeaflet>
      <ControleLeaflet map={map} position="bottomleft" className="load-status">{status}</ControleLeaflet>
      <ControleLeaflet map={map} position="bottomright" className="legend">
        <LegendaGradiente titulo="Arestas — log10 do fluxo" min="−2,51" max="3,66" />
      </ControleLeaflet>
      <ControleLeaflet map={map} position="bottomright" className="legend">
        <LegendaGradiente titulo="Origens — log10 da população GHSL" min="−3,65" max="3,20" />
      </ControleLeaflet>
    </div>
  );
}
