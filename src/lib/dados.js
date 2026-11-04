import { feature } from "topojson-client";
import { prepararOrdem } from "./plantio.js";

const BASE = import.meta.env.BASE_URL;

async function baixarTopojson(arquivo) {
  const resposta = await fetch(`${BASE}topojson/${arquivo}`);
  if (!resposta.ok) throw new Error(`${arquivo}: ${resposta.status} ${resposta.statusText}`);
  const topologia = await resposta.json();
  return feature(topologia, topologia.objects[Object.keys(topologia.objects)[0]]);
}

// Cada arquivo é baixado uma vez e compartilhado entre os mapas da página.
const cache = new Map();
export function lerTopojson(arquivo) {
  if (!cache.has(arquivo)) {
    const promessa = baixarTopojson(arquivo);
    promessa.catch(() => cache.delete(arquivo));
    cache.set(arquivo, promessa);
  }
  return cache.get(arquivo);
}

// Arestas do plantio em vetores (F, L, sol por horário, geometria em [lat, lng]).
let arestasPlantio = null;
export function carregarArestasPlantio() {
  if (!arestasPlantio) {
    arestasPlantio = baixarTopojson("arestas_plantio.topojson").then(({ features }) => {
      const chaves = Object.keys(features[0].properties).filter(k => /^s\d+$/.test(k));
      const D = {
        F: [], L: [], id: [], geom: [],
        S: Object.fromEntries(chaves.map(k => [k, []])),
        horas: chaves.map(k => +k.slice(1)).sort((a, b) => a - b)
      };
      for (const f of features) {
        const p = f.properties;
        D.F.push(p.F); D.L.push(p.L); D.id.push(p.id);
        for (const k of chaves) D.S[k].push(p[k]);
        // Uma aresta degenerada tem geometria nula: fica fora do desenho, mas entra no cálculo.
        const coords = f.geometry && f.geometry.coordinates;
        D.geom.push(coords && coords.length > 1 ? coords.map(([x, y]) => [y, x]) : null);
      }
      D.indice = new Map(D.id.map((id, i) => [id, i]));
      D.ordem = prepararOrdem(D.F);
      return D;
    });
    arestasPlantio.catch(() => { arestasPlantio = null; });
  }
  return arestasPlantio;
}

export function mensagemErro(erro, oque = "as arestas") {
  const download = location.protocol === "file:" || (erro instanceof TypeError && /fetch/i.test(erro.message));
  return download
    ? `Não foi possível baixar ${oque}: abra pelo site publicado ou por um servidor local.`
    : `Erro ao processar ${oque}: ${erro.message}`;
}
