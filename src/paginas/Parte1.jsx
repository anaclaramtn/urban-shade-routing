import FiguraMapa from "../componentes/FiguraMapa.jsx";
import Metricas from "../componentes/Metricas.jsx";
import PassoAPasso from "../componentes/PassoAPasso.jsx";
import { TopoParte, Metodologia, NavegacaoPartes } from "../componentes/ModeloPagina.jsx";
import MapaFluxo from "../componentes/mapas/MapaFluxo.jsx";
import { NUMEROS_METODOLOGIA } from "../conteudo.js";

// Para editar a metodologia, mude os textos abaixo (um objeto por passo).
const PASSOS = [
  {
    titulo: "Cada célula de população vira uma origem",
    texto: <p>O raster GHSL divide a cidade em células com uma população estimada. Cada célula com população positiva é representada pelo seu centroide, que é associado ao nó mais próximo da rede de pedestres. Esse nó é a origem das pessoas da célula.</p>
  },
  {
    titulo: "Cada parada vira um destino",
    texto: <p>As paradas do GTFS também são associadas ao nó mais próximo da rede. Vários pontos de parada podem cair no mesmo nó, e qualquer um desses nós é um destino válido.</p>
  },
  {
    titulo: "Rota de menor custo até o transporte",
    texto: <p>Para cada origem, o algoritmo de caminho mínimo percorre a rede e escolhe a rota de menor custo até um nó de parada. A rota é uma sequência de arestas (trechos de rua).</p>
  },
  {
    titulo: "A população é somada nas arestas da rota",
    texto: <p>A população da célula é atribuída integralmente a cada aresta distinta da sua rota. Quando rotas de células diferentes passam pelo mesmo trecho, os valores se somam. O resultado é o fluxo potencial de cada aresta.</p>
  },
  {
    titulo: "Como interpretar o resultado",
    texto: <p>O fluxo é um indicador de uso potencial do trecho, não a quantidade de moradores fisicamente localizada na rua. Ele aponta onde mais pessoas teriam motivo para caminhar, e é a base para decidir onde proteger do sol na Parte 2.</p>
  }
];

export default function Parte1() {
  return (
    <>
      <TopoParte numero="01" rotulo="Fluxo potencial" titulo="Fluxo potencial nas rotas até as paradas">
        A população de cada célula GHSL é encaminhada pela rede de pedestres até uma parada e somada nas arestas utilizadas. Esta parte ainda não usa dados de exposição solar.
      </TopoParte>

      <section className="content-section">
        <div className="shell">
          <FiguraMapa id="fluxo" Mapa={MapaFluxo} />
        </div>
      </section>

      <Metodologia id="metodologia" titulo="Passo a passo do algoritmo"
        intro="O problema: saber quais trechos de rua concentram mais pessoas a caminho do transporte coletivo. A solução é transformar a pergunta em rotas numa rede e contar quantas rotas passam por cada trecho.">
        <PassoAPasso passos={PASSOS} />
      </Metodologia>

      <section className="content-section content-section--divided" aria-labelledby="numeros-p1-titulo">
        <div className="shell">
          <header className="section-heading section-heading--split">
            <div className="section-heading__body">
              <p className="eyebrow">Verificação</p>
              <h2 id="numeros-p1-titulo">Números da metodologia</h2>
            </div>
            <p className="section-heading__intro">
              Estes indicadores ajudam a conferir a associação entre população, rede e transporte coletivo antes do cálculo do fluxo nas arestas.
            </p>
          </header>
          <Metricas itens={NUMEROS_METODOLOGIA} className="metric-grid--stackable" />
        </div>
      </section>

      <NavegacaoPartes id="parte-1" />
    </>
  );
}
