import { useEffect, useMemo, useRef, useState } from "react";
import { L, LIMITES_CIDADE, criarPanes } from "../../lib/leaflet.js";
import { mensagemErro } from "../../lib/dados.js";
import { corPorN } from "../../lib/cores.js";
import { fmt } from "../../lib/formato.js";
import {
  chaveSol, prepararGuloso, aplicarGuloso, prepararProporcional, aplicarProporcional
} from "../../lib/plantio.js";
import { camadaArestas } from "../../lib/camadaArestas.js";
import { useMapaLeaflet } from "../../hooks/useMapaLeaflet.js";
import { useArestasPlantio } from "../../hooks/useArestasPlantio.js";
import { useCamadaGeojson } from "../../hooks/useCamadaGeojson.js";
import { useParametrosPlantio } from "../../hooks/useParametrosPlantio.js";
import ControleLeaflet from "./ControleLeaflet.jsx";
import ControlesPlantio from "./ControlesPlantio.jsx";

// Mapa grande da Parte 2: um seletor escolhe o modelo (e, no Modelo 2, o horário).
//   Modelo 1: árvores proporcionais ao fluxo, ignorando o sol (não depende de horário).
//   Modelo 2: árvores só na parte ao sol, das arestas de maior fluxo para as de menor.

const CENARIOS = [
  { id: "m1", modelo: 1, hora: null, rotulo: "Modelo 1 · proporcional ao fluxo (ignora o sol)" },
  { id: "m2-7", modelo: 2, hora: 7, rotulo: "Modelo 2 · plantio na parte ao sol · 7h" },
  { id: "m2-11", modelo: 2, hora: 11, rotulo: "Modelo 2 · plantio na parte ao sol · 11h" }
];

const BALDES = 24;
const ESTILOS = Array.from({ length: BALDES }, (_, b) => {
  const t = (b + .5) / BALDES;
  return { color: corPorN(t), weight: 1.6 + 4.4 * t };
});
const balde = t => Math.min(BALDES - 1, Math.max(0, Math.floor(t * BALDES)));

const limite = geojson => L.geoJSON(geojson, { pane: "boundary", interactive: false, style: () => ({ color: "#111", fillOpacity: 0, opacity: .85, weight: 1.4 }) });

export default function MapaPlantio() {
  const ref = useRef(null);
  const map = useMapaLeaflet(ref, el => {
    const m = L.map(el);
    m.fitBounds(LIMITES_CIDADE);
    L.control.scale().addTo(m);
    criarPanes(m, [["flow", 450], ["boundary", 550]]);
    return m;
  });
  useCamadaGeojson(map, "limite_territorial.topojson", limite);

  const { dados: D, erro } = useArestasPlantio();
  const { la, setLa, N, setN, calculo } = useParametrosPlantio();
  const [cenarioId, setCenarioId] = useState("m2-7");
  const cenario = CENARIOS.find(c => c.id === cenarioId);

  // Parte que não depende de N: refeita só quando muda o modelo, o horário ou lₐ.
  const prop = useMemo(() => D && prepararProporcional(D.F, D.L, D.ordem), [D]);
  const guloso = useMemo(
    () => D && cenario.modelo === 2 && prepararGuloso(D.F, D.L, D.S[chaveSol(cenario.hora)], D.ordem, calculo.la),
    [D, cenario, calculo.la]
  );
  // Parte que depende de N: busca binária (Modelo 2) ou uma conta (Modelo 1).
  const r = useMemo(() => {
    if (!D) return null;
    return cenario.modelo === 1 ? aplicarProporcional(prop, calculo.la, calculo.N) : aplicarGuloso(guloso, calculo.N);
  }, [D, cenario, prop, guloso, calculo]);

  // Valores atuais lidos pelo rótulo e pelo popup.
  const atual = useRef({});
  atual.current = { r, la: calculo.la, cenario, D };

  // Camada de canvas (criada uma vez por conjunto de dados).
  const camada = useMemo(() => {
    if (!map || !D) return null;
    const tooltip = L.tooltip({ direction: "top", offset: [0, -8], opacity: .95 });
    return camadaArestas(D.geom, {
      pane: "flow",
      fundo: { color: "#7d8590", weight: 1, opacity: .55 },
      aoPassar: (i, latlng) => {
        if (i < 0) { tooltip.remove(); return; }
        const { r, D } = atual.current;
        const ni = r ? r.n(i) : 0;
        const d = cenario.modelo === 1 ? 2 : 0;
        const txt = ni > 0 ? `${fmt(ni, d)} ${ni === 1 ? "árvore" : "árvores"}` : "sem árvores";
        tooltip.setLatLng(latlng).setContent(`Fluxo ${fmt(D.F[i], 2)} · ${txt}`);
        if (!map.hasLayer(tooltip)) tooltip.addTo(map);
      },
      aoClicar: (i, latlng) => {
        const { r, la, cenario, D } = atual.current;
        const ni = r.n(i), comprimento = D.L[i];
        const linhas = [["Fluxo F", fmt(D.F[i], 2)], ["Comprimento L", `${fmt(comprimento, 1)} m`]];
        if (cenario.modelo === 1) {
          linhas.push(["N·F/ΣF (bruto)", fmt(r.bruto(i), 4)], ["<b>nᵢ = N·F/ΣF</b>", `<b>${fmt(ni, 2)}</b>`], ["Cobertura nᵢ·lₐ", `${fmt(ni * la, 2)} m`], ["Cabem na rua (L/lₐ)", fmt(comprimento / la, 1)]);
        } else {
          const S = D.S[chaveSol(cenario.hora)][i] / 100;
          linhas.push(
            [`Fração ao sol S (${cenario.hora}h)`, `${fmt(S * 100)}%`],
            ["Sol S·L", `${fmt(S * comprimento, 1)} m`],
            ["Capacidade ⌊S·L/lₐ⌋", fmt(Math.floor(S * comprimento / la + 1e-9))],
            ["<b>Árvores nᵢ</b>", `<b>${fmt(ni)}</b>`],
            ["Sol restante", `${fmt(Math.max(S * comprimento - ni * la, 0), 1)} m`]
          );
        }
        L.popup().setLatLng(latlng).setContent(
          `<strong>Aresta ${D.id[i]}</strong><table>${linhas.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join("")}</table>`
        ).openOn(map);
      }
    });
  }, [map, D]);

  useEffect(() => {
    if (!camada) return;
    camada.addTo(map);
    return () => { camada.remove(); };
  }, [map, camada]);

  // Redesenho: só os índices de destaque e os baldes mudam.
  useEffect(() => {
    if (!camada || !r) return;
    if (cenario.modelo === 1) {
      // Cor = fração da rua coberta pelas árvores, nᵢ·lₐ/L (escala de raiz quadrada).
      // Muda com N e com lₐ; a partir de 100 % a rua fica na cor mais escura.
      const lA = calculo.la;
      // Só as ruas com árvore (as r.arestas primeiras da ordem); menor fluxo primeiro, o maior fica por cima.
      const indices = [];
      for (let p = Math.min(r.arestas, D.ordem.length) - 1; p >= 0; p--) indices.push(D.ordem[p]);
      camada.definir({
        indices,
        balde: i => balde(Math.sqrt(Math.min(1, r.n(i) * lA / D.L[i]))),
        estilos: ESTILOS
      });
      return;
    }
    const indices = [];
    for (let p = Math.min(r.k, D.ordem.length - 1); p >= 0; p--) {
      const i = D.ordem[p];
      if (r.n(i) > 0) indices.push(i); // menor fluxo primeiro: o de maior fluxo fica por cima
    }
    const raiz = Math.sqrt(Math.max(r.nMax, 1));
    camada.definir({
      indices,
      balde: i => balde(r.nMax > 1 ? (Math.sqrt(r.n(i)) - 1) / (raiz - 1) : 1),
      estilos: ESTILOS
    });
  }, [camada, D, r, cenario, calculo.la]);

  function enquadrar() {
    if (!r) return;
    const pontos = [];
    const fim = cenario.modelo === 1 ? r.arestas - 1 : r.k;
    for (let p = 0; p <= Math.min(fim, D.ordem.length - 1); p++) {
      const i = D.ordem[p];
      if (r.n(i) > 0 && D.geom[i]) pontos.push(...D.geom[i]);
    }
    if (pontos.length) map.fitBounds(L.latLngBounds(pontos), { padding: [30, 30] });
  }

  const status = erro ? mensagemErro(erro)
    : D ? `${fmt(D.F.length)} arestas com fluxo > 0`
    : "Carregando arestas…";
  const reducao = r ? r.jOld - r.jNovo : 0;
  const m1 = cenario.modelo === 1;

  return (
    <div ref={ref} className="mapa mapa--plantio" aria-label="Mapa interativo da distribuição de árvores, com seletor de modelo e horário">
      <ControleLeaflet map={map} position="topleft" className="map-title">Plantio de árvores · comparação de modelos</ControleLeaflet>
      <ControleLeaflet map={map} position="bottomleft" className="load-status">{status}</ControleLeaflet>
      <ControleLeaflet map={map} position="topright" className="panel">
        <details open>
          <summary>Modelo, parâmetros e resultado</summary>
          <div className="ctrl">
            <label htmlFor="cenario-plantio">Modelo e horário</label>
            <select id="cenario-plantio" value={cenarioId} onChange={e => setCenarioId(e.target.value)} style={{ width: "100%" }}>
              {CENARIOS.map(c => <option key={c.id} value={c.id}>{c.rotulo}</option>)}
            </select>
          </div>
          <ControlesPlantio la={la} setLa={setLa} N={N} setN={setN}
            rotuloLa="lₐ (m de sol por árvore)" rotuloN="N (árvores)" escalaLog
            horario={<span>{m1 ? "não se aplica" : `${cenario.hora}h`}</span>} />
          <table>
            <tbody>
              <tr><td>{m1 ? "J₁ = Σ F·L" : "J_antes = Σ F·S·L"}</td><td>{r ? fmt(r.jOld) : "—"}</td></tr>
              <tr><td>{m1 ? "J₁ depois = J₁ − lₐ·ΣF·n" : "J_depois = J_antes − lₐ·ΣF·n"}</td><td>{r ? fmt(r.jNovo) : "—"}</td></tr>
              <tr><td>Redução de J (pessoas·m)</td><td>{r ? fmt(reducao) : "—"}</td></tr>
              <tr className="result"><td>Redução</td><td>{r && r.jOld > 0 ? `${fmt(100 * reducao / r.jOld, 4)}%` : "—"}</td></tr>
              {m1 ? (
                <>
                  <tr><td>Árvores plantadas</td><td>{r ? `${fmt(r.plantadas)} / ${fmt(calculo.N)}` : "—"}</td></tr>
                  <tr><td>Arestas com árvores</td><td>{r ? fmt(r.arestas) : "—"}</td></tr>
                  <tr><td>Máx. nᵢ em uma rua</td><td>{r ? fmt(r.nMax, m1 ? 2 : 0) : "—"}</td></tr>
                  <tr><td>Ruas com nᵢ·lₐ &gt; L</td><td>{r ? fmt(r.saturadas) : "—"}</td></tr>
                </>
              ) : (
                <>
                  <tr><td>Árvores plantadas</td><td>{r ? `${fmt(r.plantadas)} / ${fmt(calculo.N)}` : "—"}</td></tr>
                  <tr><td>Arestas com árvores</td><td>{r ? fmt(r.arestas) : "—"}</td></tr>
                  <tr><td>Capacidade Σ⌊S·L/lₐ⌋</td><td>{r ? fmt(r.capTotal) : "—"}</td></tr>
                </>
              )}
            </tbody>
          </table>
          <div className="warning">
            {r && !m1 && r.plantadas < calculo.N
              ? `A rede comporta só ${fmt(r.capTotal)} árvores com lₐ = ${fmt(calculo.la, 1)} m; ${fmt(calculo.N - r.plantadas)} ficaram sem lugar.`
              : ""}
            {m1 ? "Modelo 1: cada rua recebe nᵢ = N·F/ΣF (fracionário, sem arredondar), somando exatamente N. Cor = fração da rua coberta (nᵢ·lₐ/L). Ignora o sol; J₁ trata a rua toda como exposta e não é comparável diretamente com o J do Modelo 2." : ""}
          </div>
          <div className="legend-gradient legend-gradient--verde" />
          <div className="legend-range"><span>{m1 ? "0 % da rua coberta" : "nᵢ = 1"}</span><span>{m1 ? "100 % ou mais" : r && r.nMax ? `nᵢ = ${fmt(r.nMax, 0)}` : "—"}</span></div>
          <button type="button" onClick={enquadrar}>Enquadrar arestas com árvores</button>
        </details>
      </ControleLeaflet>
    </div>
  );
}
