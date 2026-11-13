import { useEffect } from "react";
import Cabecalho from "./componentes/Cabecalho.jsx";
import MapaFluxo from "./componentes/mapas/MapaFluxo.jsx";
import MapaPlantio from "./componentes/mapas/MapaPlantio.jsx";
import MapaPlantioDetalhe, { MapaDetalheModelo1, MapaDetalheModelo2 } from "./componentes/mapas/MapaPlantioDetalhe.jsx";
import Abertura from "./secoes/Abertura.jsx";
import Motivacao from "./secoes/Motivacao.jsx";
import Partes from "./secoes/Partes.jsx";
import Numeros from "./secoes/Numeros.jsx";
import Tecnica from "./secoes/Tecnica.jsx";
import Rodape from "./secoes/Rodape.jsx";
import Parte1 from "./paginas/Parte1.jsx";
import Parte2 from "./paginas/Parte2.jsx";
import Parte3 from "./paginas/Parte3.jsx";
import { useRota } from "./lib/rota.js";

// "Abrir em nova guia" leva a ?mapa=<id>, que mostra só o mapa na tela inteira.
const MAPAS = {
  fluxo: { Mapa: MapaFluxo, titulo: "Mapa geral interativo" },
  plantio: { Mapa: MapaPlantio, titulo: "Plantio de árvores — distribuição por fluxo" },
  detalhe: { Mapa: MapaDetalheModelo2, titulo: "Modelo 2 — recorte rua a rua" },
  "detalhe-1": { Mapa: MapaDetalheModelo1, titulo: "Modelo 1 — recorte rua a rua" }
};

function Inicio() {
  return (
    <>
      <Abertura />
      <Motivacao />
      <Partes />
      <Numeros />
      <Tecnica />
    </>
  );
}

const PAGINAS = { inicio: Inicio, "parte-1": Parte1, "parte-2": Parte2, "parte-3": Parte3 };

function Site() {
  const { pagina } = useRota();
  const Pagina = PAGINAS[pagina] ?? Inicio;

  // O MathJax processa a página sozinho quando termina de carregar; se ele
  // já tiver carregado antes do React, ou se a página mudou, pede uma nova passada.
  useEffect(() => {
    const mj = window.MathJax;
    mj?.startup?.promise?.then(() => mj.typesetPromise());
  }, [pagina]);

  return (
    <>
      <a className="skip-link" href="#conteudo">Ir para o conteúdo</a>
      <Cabecalho />
      <main id="conteudo">
        <Pagina />
      </main>
      <Rodape />
    </>
  );
}

export default function App() {
  const escolhido = MAPAS[new URLSearchParams(location.search).get("mapa")];
  useEffect(() => { if (escolhido) document.title = escolhido.titulo; }, [escolhido]);
  if (!escolhido) return <Site />;
  const { Mapa } = escolhido;
  return <div className="tela-cheia"><Mapa /></div>;
}
