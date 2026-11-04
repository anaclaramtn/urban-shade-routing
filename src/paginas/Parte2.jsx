import FiguraMapa from "../componentes/FiguraMapa.jsx";
import PassoAPasso from "../componentes/PassoAPasso.jsx";
import Tex from "../componentes/Tex.jsx";
import { TopoParte, Metodologia, NavegacaoPartes } from "../componentes/ModeloPagina.jsx";
import MapaPlantio from "../componentes/mapas/MapaPlantio.jsx";
import MapaPlantioDetalhe from "../componentes/mapas/MapaPlantioDetalhe.jsx";

const PASSOS = [
  {
    titulo: "Prioridade por fluxo",
    texto: <p>As arestas são ordenadas pelo fluxo <Tex>F_i</Tex>, a soma da população das células GHSL cujas rotas até o transporte coletivo passam por elas (resultado da Parte 1). Quanto maior o fluxo, mais pessoas se beneficiam de uma árvore ali.</p>
  },
  {
    titulo: "Sol disponível em cada aresta",
    texto: <p>Cada aresta tem comprimento <Tex>L_i</Tex> e uma fração ao sol <Tex>S_i</Tex> às 7h. Se cada árvore cobre <Tex>l_a</Tex> metros de sol, a aresta comporta até <Tex>{String.raw`\lfloor S_iL_i/l_a \rfloor`}</Tex> árvores.</p>
  },
  {
    titulo: "Preenchimento guloso",
    texto: <p>As árvores vão primeiro para a aresta de maior fluxo, até cobrir todo o sol dela. Depois seguem para a de maior fluxo seguinte, até acabarem as <Tex>N</Tex> árvores disponíveis.</p>
  },
  {
    titulo: "Resultado: quanto a exposição diminui",
    texto: <p>A exposição <Tex>{String.raw`J=\sum_i F_iS_iL_i`}</Tex> é recalculada com o sol que restou em cada aresta. A diferença entre o valor antes e depois do plantio mostra o ganho obtido com as <Tex>N</Tex> árvores.</p>
  }
];

export default function Parte2() {
  return (
    <>
      <TopoParte numero="02" rotulo="Modelo de otimização" titulo="Onde plantar as árvores?">
        Com N árvores, cada uma cobrindo l_a metros de sol, o mapa distribui o plantio pelas arestas de maior fluxo até zerar o sol de cada uma e mostra quanto a exposição diminui.
      </TopoParte>

      <section className="content-section">
        <div className="shell">
          <FiguraMapa id="plantio" Mapa={MapaPlantio} />
        </div>
      </section>

      <Metodologia id="metodologia" titulo="Passo a passo do algoritmo"
        intro="O problema: com um número limitado de árvores, em quais trechos plantar para reduzir ao máximo a exposição ao sol de quem caminha. A solução prioriza os trechos com mais fluxo.">
        <PassoAPasso passos={PASSOS} />
      </Metodologia>

      <section className="content-section content-section--divided" aria-labelledby="detalhe-titulo">
        <div className="shell">
          <header className="section-heading section-heading--split">
            <div className="section-heading__body">
              <p className="eyebrow">Exemplo</p>
              <h2 id="detalhe-titulo">A decisão rua a rua</h2>
            </div>
            <p className="section-heading__intro">
              O recorte abaixo mostra um trecho da cidade: o fluxo de cada aresta, o sol disponível e quantas árvores ela recebe.
            </p>
          </header>
          <FiguraMapa id="detalhe" Mapa={MapaPlantioDetalhe} />
        </div>
      </section>

      <NavegacaoPartes id="parte-2" />
    </>
  );
}
