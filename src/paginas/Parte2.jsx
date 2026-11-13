import FiguraMapa from "../componentes/FiguraMapa.jsx";
import PassoAPasso from "../componentes/PassoAPasso.jsx";
import Tex from "../componentes/Tex.jsx";
import TesteMesaParte2 from "./TesteMesaParte2.jsx";
import { TopoParte, Metodologia, NavegacaoPartes } from "../componentes/ModeloPagina.jsx";
import MapaPlantio from "../componentes/mapas/MapaPlantio.jsx";
import { MapaDetalheModelo1, MapaDetalheModelo2 } from "../componentes/mapas/MapaPlantioDetalhe.jsx";

const Eq = ({ children }) => <p className="equacao-destaque"><Tex>{children}</Tex></p>;

// A ideia, comum aos dois modelos (baseada em docs/Metodologia de plantio de árvores.pdf).
const PASSOS_IDEIA = [
  {
    titulo: "Medir o sol que as pessoas enfrentam",
    texto: <p>Em cada rua, o fluxo <Tex>F</Tex> (pessoas) vezes os metros de sol <Tex>S·L</Tex>. Cem pessoas atravessando 30 m de sol somam 3.000 pessoa·metro. A soma de todas as ruas é a exposição <Tex>J</Tex>.</p>,
    extra: <Eq>{String.raw`J=\sum_i F_i\,S_i\,L_i`}</Eq>
  },
  {
    titulo: "O que uma árvore muda",
    texto: <p>Cada árvore elimina <Tex>l_a</Tex> metros de sol. Com <Tex>n_i</Tex> árvores na rua <Tex>i</Tex>, sobram <Tex>{String.raw`S_iL_i-n_il_a`}</Tex> metros de sol, para as mesmas pessoas.</p>,
    extra: <Eq>{String.raw`J_{\text{depois}}=\sum_i F_i\,(S_iL_i-n_il_a)=J_{\text{antes}}-l_a\sum_i F_i\,n_i`}</Eq>
  },
  {
    titulo: "Onde plantar",
    texto: <p><Tex>{String.raw`J_{\text{antes}}`}</Tex> não depende de onde se planta; só o termo <Tex>{String.raw`\sum F_in_i`}</Tex> depende. Para <Tex>J</Tex> cair o máximo possível, esse termo tem de ser o maior possível: as árvores devem acompanhar o fluxo, mais árvores onde passa mais gente.</p>,
    extra: <Eq>{String.raw`\max \sum_i F_i\,n_i`}</Eq>
  }
];

const PASSOS_MODELOS = [
  {
    titulo: "Modelo 1 · a rua inteira",
    texto: <p>Ignora o sol: a rua toda conta (<Tex>S=1</Tex>). Cada rua recebe árvores na proporção do seu fluxo. Com ruas de 80, 10, 5 e 5 pessoas, as fatias são 0,8<Tex>N</Tex>, 0,1<Tex>N</Tex>, 0,05<Tex>N</Tex> e 0,05<Tex>N</Tex>. Frações de árvore arredondam para cima (0,4 vira 1). Das ruas de maior fluxo para as de menor, cada uma recebe esse valor até acabarem as <Tex>N</Tex> árvores; ruas de pouco fluxo podem ficar sem. Não há limite por rua.</p>,
    extra: <Eq>{String.raw`n_i=\min\left(\left\lceil N\,\frac{F_i}{\sum F}\right\rceil,\ \text{restante}\right) \qquad J_1=\sum_i F_i\,L_i`}</Eq>
  },
  {
    titulo: "Modelo 2 · só o trecho ao sol",
    texto: <p>Mesma ideia, mas no lugar da rua inteira <Tex>L</Tex> usa-se a distância ao sol <Tex>S·L</Tex>: não faz sentido plantar na sombra. Cada rua comporta tantas árvores quanto couberem nos seus metros de sol. As árvores enchem a rua de maior fluxo; se sobrarem, passam para a seguinte. No exemplo do PDF (<Tex>N=10</Tex>, <Tex>l_a=5</Tex>), a rua 1 comporta 6 e as 4 restantes vão para a rua 3: <Tex>n=(6,0,4)</Tex>.</p>,
    extra: <Eq>{String.raw`n_i\le\left\lfloor \frac{S_iL_i}{l_a}\right\rfloor \qquad J=\sum_i F_i\,S_i\,L_i`}</Eq>
  }
];

function Secao({ id, rotulo, titulo, intro, children }) {
  return (
    <section className="content-section content-section--divided" aria-labelledby={`${id}-titulo`}>
      <div className="shell">
        <header className="section-heading section-heading--split">
          <div className="section-heading__body">
            <p className="eyebrow">{rotulo}</p>
            <h2 id={`${id}-titulo`}>{titulo}</h2>
          </div>
          <p className="section-heading__intro">{intro}</p>
        </header>
        {children}
      </div>
    </section>
  );
}

export default function Parte2() {
  return (
    <>
      <TopoParte numero="02" rotulo="Modelo de otimização" titulo="Onde plantar as árvores?">
        Com N árvores, onde plantá-las para que as pessoas caminhem menos no sol? Elas devem acompanhar o fluxo de gente: o Modelo 1 faz isso na rua inteira; o Modelo 2, só no trecho que está ao sol.
      </TopoParte>

      <Metodologia id="metodologia" titulo="A ideia"
        intro="Da exposição ao sol até a regra de plantio, em três passos.">
        <PassoAPasso passos={PASSOS_IDEIA} />
      </Metodologia>

      <Metodologia id="modelo-2" titulo="Os dois modelos"
        intro="Mesma regra, com uma diferença: quanto da rua conta para plantar.">
        <PassoAPasso passos={PASSOS_MODELOS} />
      </Metodologia>

      <Metodologia id="teste-de-mesa" rotulo="Teste de mesa" titulo="Execução registrada passo a passo"
        intro="Cada decisão dos dois modelos, com os valores intermediários, para conferir à mão.">
        <details className="mesa-recolhivel">
          <summary>Abrir os 4 testes de mesa (exemplo do PDF e dados reais, para cada modelo)</summary>
          <div className="mesa-recolhivel__corpo"><TesteMesaParte2 /></div>
        </details>
      </Metodologia>

      <Secao id="detalhe-1" rotulo="Modelo 1" titulo="Rua a rua: a rua inteira"
        intro="Recorte da cidade. Cada rua recebe árvores em proporção ao fluxo; quanto mais escura, maior a parte da rua coberta.">
        <FiguraMapa id="detalhe-1" Mapa={MapaDetalheModelo1} />
      </Secao>

      <Secao id="detalhe" rotulo="Modelo 2" titulo="Rua a rua: só o trecho ao sol"
        intro="O mesmo recorte, agora com árvores inteiras só no sol das 7h.">
        <FiguraMapa id="detalhe" Mapa={MapaDetalheModelo2} />
      </Secao>

      <Secao id="comparacao" rotulo="Cidade inteira" titulo="Comparação dos modelos"
        intro="Escolha o modelo no painel do mapa. O horário (7h ou 11h) vale só para o Modelo 2.">
        <FiguraMapa id="plantio" Mapa={MapaPlantio} />
      </Secao>

      <NavegacaoPartes id="parte-2" />
    </>
  );
}
