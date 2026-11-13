import { useMemo } from "react";
import Tex from "../componentes/Tex.jsx";
import { TesteDeMesa, Etapa, Decisao, Verificacao, Tabela } from "../componentes/TesteDeMesa.jsx";
import {
  testeMesaPlantio, PLANTIO_DIDATICO, PLANTIO_REAL,
  testeMesaProporcional, PROPORCIONAL_DIDATICO, PROPORCIONAL_REAL
} from "../lib/testeMesa.js";
import { fmt } from "../lib/formato.js";

const T = (v, extra = {}) => ({ v, texto: true, ...extra });

// `real`: usa os valores originais do arquivo (2 casas decimais).
function MesaPlantio({ dados, titulo, enunciado, real = false }) {
  const t = useMemo(() => testeMesaPlantio(dados), [dados]);
  const d = real ? 2 : 1; // casas decimais exibidas nos metros e nos termos
  const f = (v, c = d) => fmt(v, c);
  const nome = "aresta";
  const parcial = real ? " (parcial: só estas arestas)" : "";

  return (
    <TesteDeMesa titulo={titulo} enunciado={
      <>
        {enunciado}
        <Tabela
          legenda="Dados de entrada. F = fluxo (Parte 1); L = comprimento; S = % do comprimento ao sol às 7h."
          cab={[nome, "F (pessoas)", "L (m)", "S (%)"]}
          linhas={dados.arestas.map(a => [a.nome, f(a.F, real ? 2 : 0), f(a.L, real ? 2 : 0), a.S])}
        />
        <p>Parâmetros: <Tex>{`l_a = ${dados.la}`}</Tex> m de sol cobertos por árvore; <Tex>{`N = ${dados.N}`}</Tex> árvores disponíveis.</p>
      </>
    }>
      <Etapa
        titulo={`Exposição antes do plantio${parcial}`}
        regra={<>Metros ao sol <Tex>{String.raw`= (S/100)\cdot L`}</Tex>; contribuição da aresta <Tex>{String.raw`F\cdot(S/100)\cdot L`}</Tex>; <Tex>{String.raw`J_{\text{antes}} = \sum_i F_i S_i L_i`}</Tex>.</>}
      >
        <Tabela
          cab={[nome, "F", "metros ao sol", "F × metros ao sol"]}
          linhas={[
            ...t.termos.map(x => [x.nome, f(x.F, real ? 2 : 0), f(x.solM, 3), f(x.termo, 3)]),
            [T("soma = J antes"), "", "", { v: f(t.jOld, 3), forte: true }]
          ]}
        />
      </Etapa>

      <Etapa
        titulo="Capacidade de árvores de cada aresta"
        regra={<>Uma árvore cobre <Tex>l_a</Tex> metros de sol, e só se planta árvore inteira: <Tex>{String.raw`\text{cap}_i = \lfloor S_iL_i/l_a + 10^{-9} \rfloor`}</Tex>. O <Tex>10^{-9}</Tex> evita que um quociente que deveria ser inteiro (por exemplo 29 % de 100 m com <Tex>l_a=1</Tex> dá 28,999999999999996 em ponto flutuante) seja arredondado para baixo.</>}
      >
        <Tabela
          cab={[nome, "metros ao sol", `÷ l_a = ÷ ${dados.la}`, "capacidade (árvores)"]}
          linhas={t.caps.map(c => [c.nome, f(c.solM, 3), f(c.bruto, 3), { v: c.cap, forte: c.cap > 0 }])}
        />
        <Decisao>
          {t.caps.filter(c => c.cap === 0).length > 0
            ? `Arestas com capacidade 0 (${t.caps.filter(c => c.cap === 0).map(c => c.nome).join(", ")}) não podem receber árvores, qualquer que seja o fluxo.`
            : "Todas as arestas têm capacidade positiva."}
        </Decisao>
      </Etapa>

      <Etapa
        titulo="Ordenar as arestas por fluxo"
        regra="Ordem decrescente de F. Em empate de F, vem primeiro a aresta de menor índice (a ordem de entrada acima, começando em 0)."
      >
        <Tabela
          cab={["posição", nome, "índice", "F"]}
          linhas={t.ordem.map((i, p) => [p + 1, t.termos[i].nome, i, f(t.termos[i].F, real ? 2 : 0)])}
        />
        {(() => {
          const emp = t.ordem.slice(1).map((i, p) => [t.ordem[p], i]).filter(([a, b]) => t.termos[a].F === t.termos[b].F);
          return emp.length > 0 && (
            <Decisao>
              Empate de fluxo: {emp.map(([a, b]) => `${t.termos[a].nome} e ${t.termos[b].nome} (F = ${f(t.termos[a].F, real ? 2 : 0)})`).join("; ")}. Fica na frente a de menor índice ({emp.map(([a]) => `${t.termos[a].nome}, índice ${a}`).join("; ")}).
            </Decisao>
          );
        })()}
      </Etapa>

      <Etapa
        titulo="Preenchimento guloso"
        regra={<>Percorre a lista ordenada com <code>restante = N</code>. Se <code>restante &gt; 0</code> e <code>cap &gt; 0</code>, planta <Tex>{String.raw`k = \min(\text{cap}, \text{restante})`}</Tex> árvores na aresta e reduz <code>restante</code> em <Tex>k</Tex>. Ganho da linha: <Tex>{String.raw`l_a \cdot F \cdot k`}</Tex>. O ganho de cada árvore é o mesmo dentro de uma aresta e independe das outras arestas; por isso plantar primeiro onde <Tex>F</Tex> é maior é ótimo.</>}
      >
        <Tabela
          cab={["pos.", nome, "F", "cap", "restante antes", "k plantadas", "restante depois", `ganho = ${dados.la} × F × k`, "ganho acumulado", "o que acontece"]}
          linhas={t.iteracoes.map(it => [
            it.pos, it.nome, f(it.F, real ? 2 : 0), it.cap, it.antes,
            { v: it.k, forte: it.k > 0 }, it.depois, f(it.ganhoLinha, 3), f(it.ganho, 3), T(it.motivo)
          ])}
          esquerda={0}
          destacarLinha={i => t.iteracoes[i].k > 0}
        />
        <Decisao>
          Foram plantadas {t.plantadas} de {t.N} árvores
          {t.plantadas < t.N ? ` (sobraram ${t.N - t.plantadas}: toda a capacidade foi usada)` : ""}.
          Ganho total = {f(t.ganho, 3)}.
          {real ? " Na rede inteira o laço continua pelas demais 44.824 arestas, mas com restante = 0 nada mais é plantado." : ""}
        </Decisao>
      </Etapa>

      <Etapa
        titulo="Exposição depois do plantio e conferência"
        regra={<><Tex>{String.raw`J_{\text{depois}} = J_{\text{antes}} - l_a \sum_i F_i n_i`}</Tex>. Como prova, recalcula-se <Tex>J</Tex> do zero com o sol que restou em cada aresta: <Tex>{String.raw`\sum_i F_i\,(S_iL_i - l_a n_i)`}</Tex>.</>}
      >
        <Tabela
          cab={[nome, "n plantadas", "sol restante (m)", "F × sol restante"]}
          linhas={[
            ...t.conferencia.map(c => [c.nome, c.n, f(c.solRestante, 3), f(c.termoNovo, 3)]),
            [T("soma"), t.plantadas, "", { v: f(t.jNovoDireto, 3), forte: true }]
          ]}
        />
        <Verificacao>
          J antes = {f(t.jOld, 3)}; ganho = {f(t.ganho, 3)}; J depois = {f(t.jOld, 3)} − {f(t.ganho, 3)} = {f(t.jNovo, 3)}.
          Recalculado do zero: {f(t.jNovoDireto, 3)}.
          {Math.abs(t.jNovo - t.jNovoDireto) < 1e-6 ? " Os dois valores coincidem." : " ATENÇÃO: os valores não coincidem."}
          {" "}Redução: {f((100 * t.ganho) / t.jOld, 1)} %{real ? " (apenas sobre estas arestas)" : ""}.
        </Verificacao>
      </Etapa>
    </TesteDeMesa>
  );
}

// Modelo 1: n_i = N·F_i/ΣF. `real` usa os valores do arquivo (2 casas) e a soma de F da rede inteira.
function MesaProporcional({ dados, titulo, enunciado, real = false }) {
  const t = useMemo(() => testeMesaProporcional(dados), [dados]);
  const dF = real ? 2 : 0;
  return (
    <TesteDeMesa titulo={titulo} enunciado={
      <>
        {enunciado}
        <Tabela
          legenda="Dados de entrada. F = fluxo (Parte 1); L = comprimento. O sol não aparece: o Modelo 1 não usa S."
          cab={["aresta", "F (pessoas)", "L (m)"]}
          linhas={dados.arestas.map(a => [a.nome, fmt(a.F, dF), fmt(a.L, dF)])}
        />
        <p>
          Parâmetros: <Tex>{`l_a = ${dados.la}`}</Tex> m por árvore; <Tex>{`N = ${dados.N}`}</Tex> árvores.
          {real && <> Soma do fluxo da rede inteira (44.834 arestas): <Tex>{String.raw`\sum F = ${fmt(dados.somaF, 2)}`}</Tex>.</>}
        </p>
      </>
    }>
      <Etapa
        titulo="Soma do fluxo"
        regra={<><Tex>{String.raw`\sum F = \sum_i F_i`}</Tex>, sobre todas as arestas com fluxo.</>}
      >
        <Decisao>
          <Tex>{String.raw`\sum F`}</Tex> = {fmt(t.soma, real ? 2 : 0)}{real ? " (valor da rede inteira, não só das 10 arestas)" : ` = ${dados.arestas.map(a => fmt(a.F)).join(" + ")}`}.
        </Decisao>
      </Etapa>

      <Etapa
        titulo="Fração do fluxo e número de árvores de cada aresta"
        regra={<>Fração <Tex>{String.raw`p_i = F_i/\sum F`}</Tex>, valor bruto <Tex>{String.raw`N\cdot p_i`}</Tex>, pedido <Tex>{String.raw`\lceil N\cdot p_i \rceil`}</Tex> (<strong>arredonda sempre para cima</strong>: 0,4 ou 0,9 pedem 1 árvore). As ruas são atendidas por fluxo decrescente (empate: a primeira da lista) e cada uma recebe <Tex>{String.raw`n_i=\min(\text{pedido},\ \text{restante})`}</Tex>, até as N árvores acabarem.</>}
      >
        <Tabela
          cab={["ordem", "aresta", "F", "p = F ÷ ΣF", `bruto = ${dados.N} × p`, "pedido = ⌈bruto⌉", "restante antes", "n = mín(pedido, restante)", `cobertura = ${dados.la} × n (m)`, "L (m)", "cobertura ≤ L ?"]}
          linhas={t.linhas.map(x => [
            fmt(x.ordem), x.nome, fmt(x.F, dF), fmt(x.fracao, 6), fmt(x.bruto, 4), fmt(x.pedido), fmt(x.antes), { v: fmt(x.n), forte: true },
            fmt(x.cobertura, 2), fmt(x.L, dF), x.cabe ? "sim" : { v: "NÃO: planta mais do que cabe", forte: true }
          ])}
        />
        <Verificacao>
          {real
            ? "Nas 10 arestas mostradas, p soma menos que 1 porque o restante do fluxo está nas demais arestas."
            : <>Σ p = {fmt(t.linhas.reduce((s, x) => s + x.fracao, 0), 6)}; Σ bruto = {fmt(t.somaBruto, 4)} = N. Σ pedido = {fmt(t.linhas.reduce((s, x) => s + x.pedido, 0))}, que passa de N; por isso as ruas de menor fluxo são cortadas. Σ n = {fmt(t.somaN)} {t.somaN === t.N ? "= N: o total é exato." : "≠ N: ATENÇÃO."}</>}
        </Verificacao>
      </Etapa>

      <Etapa
        titulo="Exposição antes e depois"
        regra={<>Sem o sol, a rua inteira conta como exposta: <Tex>{String.raw`J_1 = \sum F_iL_i`}</Tex>. Cada árvore cobre <Tex>l_a</Tex> metros, então <Tex>{String.raw`J_{1,\text{depois}} = J_1 - l_a\sum F_in_i`}</Tex>, com <Tex>n_i</Tex> já limitado ao que restava.</>}
      >
        <Tabela
          cab={["aresta", "F × L", `ganho = ${dados.la} × F × n`, "metros sem árvore = L − l_a·n", "F × metros sem árvore"]}
          linhas={[
            ...t.linhas.map(x => [x.nome, fmt(x.termo, 3), fmt(x.ganho, 3), fmt(x.solRestante, 2), fmt(x.F * x.solRestante, 3)]),
            [T(real ? "soma (só estas arestas)" : "soma"), { v: fmt(t.j1, 3), forte: true }, { v: fmt(t.ganho, 3), forte: true }, "", { v: fmt(t.jNovoDireto, 3), forte: true }]
          ]}
        />
        <Verificacao>
          J₁ depois = {fmt(t.j1, 3)} − {fmt(t.ganho, 3)} = {fmt(t.jNovo, 3)}. Recalculado do zero, Σ F·(L − l_a·n) = {fmt(t.jNovoDireto, 3)}.
          {Math.abs(t.jNovo - t.jNovoDireto) < 1e-6 ? " Os dois valores coincidem." : " ATENÇÃO: os valores não coincidem."}
          {" "}Redução: {fmt((100 * t.ganho) / t.j1, 1)} %{real ? " (apenas sobre estas arestas; na rede inteira o ganho exige o F de todas as arestas e só é calculado pelo mapa)" : ""}.
        </Verificacao>
      </Etapa>

      <Etapa titulo="Limitações visíveis no resultado">
        <Decisao>
          {t.linhas.some(x => !x.cabe)
            ? `Em ${t.linhas.filter(x => !x.cabe).map(x => x.nome).join(", ")} a cobertura passa do comprimento da rua: o Modelo 1 não tem teto por rua, então planta mais árvores do que cabem. `
            : "Neste exemplo todas as ruas comportam o que o Modelo 1 manda plantar. "}
          O modelo também não distingue trecho ao sol de trecho já sombreado; é essa a falha que o Modelo 2 corrige.
        </Decisao>
      </Etapa>
    </TesteDeMesa>
  );
}

export default function TesteMesaParte2() {
  return (
    <>
      <MesaProporcional
        dados={PROPORCIONAL_DIDATICO}
        titulo="Teste 1 · Modelo 1, exemplo do PDF"
        enunciado={<p>As três ruas do exemplo do PDF (fluxos 100, 10 e 50), sem olhar o sol: o comprimento inteiro de cada rua é considerado. Cada pedido é arredondado para cima e as árvores são entregues por fluxo decrescente até somar N.</p>}
      />
      <MesaProporcional
        real
        dados={PROPORCIONAL_REAL}
        titulo="Teste 2 · Modelo 1, 10 arestas reais de maior fluxo"
        enunciado={<p>Mesmos dados reais do teste do Modelo 2, com <Tex>N = 1000</Tex>, o valor inicial do mapa.</p>}
      />
      <MesaPlantio
        dados={PLANTIO_DIDATICO}
        titulo="Teste 3 · Modelo 2, exemplo do PDF"
        enunciado={<p>Mesmo exemplo do PDF, agora só com o trecho ao sol (30, 20 e 40 m). A rua 1 comporta 30 ÷ 5 = 6 árvores; as outras 4 vão para a rua 3: n = (6, 0, 4).</p>}
      />
      <MesaPlantio
        real
        dados={PLANTIO_REAL}
        titulo="Teste 4 · Modelo 2, 10 arestas reais de maior fluxo"
        enunciado={
          <p>
            Valores copiados de <code>arestas_plantio.topojson</code> (identificador, F, L e % ao sol às 7h), com
            os parâmetros padrão do mapa para <Tex>l_a</Tex> e <Tex>N = 3</Tex> para que o laço pare dentro da tabela. Mostra algo que
            a intuição não prevê: as arestas de maior fluxo costumam ter pouco sol (ou ser curtas demais), então a capacidade
            é 0 e o algoritmo as pula.
          </p>
        }
      />
    </>
  );
}
