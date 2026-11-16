import { useMemo } from "react";
import Tex from "../componentes/Tex.jsx";
import { TesteDeMesa, Etapa, Decisao, Verificacao, Tabela } from "../componentes/TesteDeMesa.jsx";
import {
  testeMesaPlantio, PLANTIO_DIDATICO,
  testeMesaProporcional, PROPORCIONAL_DIDATICO
} from "../lib/testeMesa.js";
import { fmt } from "../lib/formato.js";

const T = (v, extra = {}) => ({ v, texto: true, ...extra });

// Modelo 1: a rua inteira conta; árvores proporcionais ao fluxo.
function MesaProporcional({ dados }) {
  const t = useMemo(() => testeMesaProporcional(dados), [dados]);
  const ordenadas = [...t.linhas].sort((a, b) => a.ordem - b.ordem);
  return (
    <TesteDeMesa
      titulo="Modelo 1 · a rua inteira"
      enunciado={
        <>
          <p>Três ruas, <Tex>{`N = ${dados.N}`}</Tex> árvores e <Tex>{`l_a = ${dados.la}`}</Tex> m cobertos por árvore. O sol não entra na conta.</p>
          <Tabela
            cab={["rua", "fluxo F (pessoas)", "comprimento L (m)"]}
            linhas={dados.arestas.map(a => [a.nome, fmt(a.F, 0), fmt(a.L, 0)])}
          />
        </>
      }
    >
      <Etapa
        titulo="Quantas árvores cada rua recebe"
        regra={<><Tex>{String.raw`n_i = N \cdot F_i / \sum F`}</Tex>, sem arredondar. Aqui <Tex>{String.raw`\sum F`}</Tex> = {fmt(t.soma, 0)}.</>}
      >
        <Tabela
          cab={["ordem", "rua", "F", `${dados.N} × F ÷ ${fmt(t.soma, 0)}`, "recebe"]}
          linhas={ordenadas.map(x => [x.ordem, x.nome, fmt(x.F, 0), fmt(x.bruto, 2), { v: fmt(x.n, 2), forte: true }])}
        />
        <Decisao>
          Todas as ruas recebem árvore, em proporção ao fluxo. Total plantado: {fmt(t.somaN, 2)}.
        </Decisao>
      </Etapa>

      <Etapa
        titulo="Quanto a exposição diminui"
        regra={<>Exposição <Tex>{String.raw`J = \sum F\cdot L`}</Tex>. Cada árvore tira <Tex>l_a</Tex> metros: depois do plantio, <Tex>{String.raw`J = \sum F\,(L - l_a n)`}</Tex>.</>}
      >
        <Tabela
          cab={["rua", "F × L (antes)", `L − ${dados.la} × n`, "F × (L − l_a·n) (depois)"]}
          linhas={[
            ...t.linhas.map(x => [x.nome, fmt(x.termo, 0), fmt(x.solRestante, 1), fmt(x.F * x.solRestante, 0)]),
            [T("soma"), { v: fmt(t.j1, 0), forte: true }, "", { v: fmt(t.jNovoDireto, 0), forte: true }]
          ]}
        />
        <Verificacao>
          Redução de {fmt(t.j1 - t.jNovoDireto, 0)} pessoa·metro ({fmt((100 * t.ganho) / t.j1, 1)} %).
          {Math.abs(t.jNovo - t.jNovoDireto) < 1e-6 ? " Confere com J antes − ganho." : " ATENÇÃO: não confere com J antes − ganho."}
        </Verificacao>
      </Etapa>
    </TesteDeMesa>
  );
}

// Modelo 2: só o trecho ao sol conta; cada rua tem capacidade.
function MesaPlantio({ dados }) {
  const t = useMemo(() => testeMesaPlantio(dados), [dados]);
  return (
    <TesteDeMesa
      titulo="Modelo 2 · só o trecho ao sol"
      enunciado={
        <>
          <p>As mesmas três ruas, agora com a parte da rua que está ao sol (S). Mesmos <Tex>{`N = ${dados.N}`}</Tex> e <Tex>{`l_a = ${dados.la}`}</Tex> m.</p>
          <Tabela
            cab={["rua", "fluxo F", "comprimento L (m)", "ao sol S (%)"]}
            linhas={dados.arestas.map(a => [a.nome, fmt(a.F, 0), fmt(a.L, 0), a.S])}
          />
        </>
      }
    >
      <Etapa
        titulo="Metros de sol e capacidade de cada rua"
        regra={<>Metros ao sol = <Tex>{String.raw`(S/100)\cdot L`}</Tex>. Só cabe árvore inteira: capacidade = <Tex>{String.raw`\lfloor \text{metros ao sol} / l_a \rfloor`}</Tex>.</>}
      >
        <Tabela
          cab={["rua", "metros ao sol", `÷ ${dados.la}`, "capacidade (árvores)"]}
          linhas={t.caps.map(c => [c.nome, fmt(c.solM, 0), fmt(c.bruto, 1), { v: c.cap, forte: true }])}
        />
      </Etapa>

      <Etapa
        titulo="Plantar da rua de mais fluxo para a de menos"
        regra={<>Cada rua recebe o menor valor entre a sua capacidade e as árvores que restam. O que sobra passa para a rua seguinte.</>}
      >
        <Tabela
          cab={["ordem", "rua", "F", "capacidade", "restam antes", "plantadas", "restam depois"]}
          linhas={t.iteracoes.map(it => [it.pos, it.nome, fmt(it.F, 0), it.cap, it.antes, { v: it.k, forte: it.k > 0 }, it.depois])}
          esquerda={0}
          destacarLinha={i => t.iteracoes[i].k > 0}
        />
        <Decisao>Plantadas {t.plantadas} de {t.N} árvores: n = ({dados.arestas.map((_, i) => t.n[i]).join(", ")}).</Decisao>
      </Etapa>

      <Etapa
        titulo="Quanto a exposição diminui"
        regra={<>Exposição <Tex>{String.raw`J = \sum F\cdot(\text{metros ao sol})`}</Tex>. Cada árvore tira <Tex>l_a</Tex> metros de sol da sua rua.</>}
      >
        <Tabela
          cab={["rua", "F × sol (antes)", "sol restante (m)", "F × sol restante (depois)"]}
          linhas={[
            ...t.conferencia.map(c => [c.nome, fmt(c.termo, 0), fmt(c.solRestante, 0), fmt(c.termoNovo, 0)]),
            [T("soma"), { v: fmt(t.jOld, 0), forte: true }, "", { v: fmt(t.jNovoDireto, 0), forte: true }]
          ]}
        />
        <Verificacao>
          Redução de {fmt(t.jOld - t.jNovoDireto, 0)} pessoa·metro ({fmt((100 * t.ganho) / t.jOld, 1)} %).
          {Math.abs(t.jNovo - t.jNovoDireto) < 1e-6 ? " Confere com J antes − ganho." : " ATENÇÃO: não confere com J antes − ganho."}
        </Verificacao>
      </Etapa>
    </TesteDeMesa>
  );
}

export default function TesteMesaParte2() {
  return (
    <>
      <MesaProporcional dados={PROPORCIONAL_DIDATICO} />
      <MesaPlantio dados={PLANTIO_DIDATICO} />
    </>
  );
}
