import { useMemo } from "react";
import Tex from "../componentes/Tex.jsx";
import { TesteDeMesa, Etapa, Decisao, Verificacao, Tabela } from "../componentes/TesteDeMesa.jsx";
import { testeMesaParte1, NOS, ARESTAS, PARADAS, RASTER, idAresta } from "../lib/testeMesa.js";
import { fmt } from "../lib/formato.js";
import DiagramaMesaParte1 from "./DiagramaMesaParte1.jsx";

const n0 = v => fmt(v, 0);
const T = (v, extra = {}) => ({ v, texto: true, ...extra });

// Exemplo mínimo: 3 células com gente, 1 célula sem dado, 4 nós em linha e 1 parada.
export default function TesteMesaParte1() {
  const t = useMemo(testeMesaParte1, []);
  const idsArestas = ARESTAS.map(idAresta);

  return (
    <TesteDeMesa
      titulo="Teste de mesa: um exemplo pequeno"
      enunciado={
        <>
          <p>
            Uma cidade minúscula, para conferir tudo com lápis e papel: um raster 2×2 com células de 100 m, uma rua reta
            com 4 esquinas (nós) e uma parada de ônibus. A distância de cada trecho é o peso do caminho.
          </p>
          <DiagramaMesaParte1 />
          <Tabela
            legenda="População de cada célula (linha 0 = norte). “—” = sem dado."
            cab={["", "coluna 0", "coluna 1"]}
            linhas={RASTER.valores.map((l, r) => [`linha ${r}`, ...l.map(v => (v === null ? "—" : n0(v)))])}
          />
          <Tabela
            legenda="Rede de pedestres: 1 — 2 — 3 — 4. Coordenadas em metros."
            cab={["nó", "x", "y"]}
            linhas={NOS.map(n => [n.id, n.x, n.y])}
          />
          <Tabela
            legenda="Trechos (aresta = nó inicial-nó final-chave) e seus comprimentos."
            cab={["aresta", "comprimento (m)"]}
            linhas={ARESTAS.map(a => [idAresta(a), a.L])}
          />
          <p>Parada {PARADAS[0].id}: x = {PARADAS[0].x}, y = {PARADAS[0].y}.</p>
        </>
      }
    >
      <Etapa
        titulo="Escolher as origens"
        regra={<>Só células com população maior que zero viram origem. O ponto de cada origem é o centro da célula: <Tex>{String.raw`x = x_0 + (c + 0{,}5)\cdot 100`}</Tex> e <Tex>{String.raw`y = y_0 - (r + 0{,}5)\cdot 100`}</Tex>, com <Tex>x_0 = 0</Tex> e <Tex>y_0 = 100</Tex>.</>}
      >
        <Tabela
          cab={["origem", "linha", "coluna", "x (m)", "y (m)", "população"]}
          linhas={t.celulas.map(c => [c.id, c.r, c.c, c.x, c.y, c.pop])}
        />
        <Decisao>A célula sem dado é descartada. Ficam {t.nPos} origens, somando {n0(t.populacaoTotal)} pessoas.</Decisao>
      </Etapa>

      <Etapa
        titulo="Ligar origens e parada ao nó mais próximo"
        regra={<>Vale o nó com menor distância em linha reta: <Tex>{String.raw`d = \sqrt{(x_p - x_n)^2 + (y_p - y_n)^2}`}</Tex>.</>}
      >
        <Tabela
          legenda="Distância (m) até cada nó. Em destaque, o escolhido."
          cab={["ponto", ...NOS.map(n => `nó ${n.id}`), "nó escolhido"]}
          linhas={[
            ...t.celulas.map(c => [
              `origem ${c.id}`,
              ...c.assoc.distancias.map((d, i) => (NOS[i].id === c.assoc.no ? { v: n0(d), forte: true } : n0(d))),
              c.assoc.no
            ]),
            ...t.paradas.map(p => [
              p.id,
              ...p.assoc.distancias.map((d, i) => (NOS[i].id === p.assoc.no ? { v: n0(d), forte: true } : n0(d))),
              p.assoc.no
            ])
          ]}
        />
        <Decisao>
          {t.celulas.map(c => `Origem ${c.id} → nó ${c.assoc.no}`).join("; ")}. A parada fica no nó {t.nosParada.join(", ")}, que é o destino.
        </Decisao>
      </Etapa>

      <Etapa
        titulo="Achar o caminho mais curto até a parada"
        regra="O algoritmo de caminho mínimo (Dijkstra) parte do nó da parada com distância 0 e vai fechando o nó mais próximo ainda aberto, somando o comprimento do trecho a cada vizinho."
      >
        <Tabela
          legenda="Ordem em que os nós são fechados."
          cab={["passo", "nó fechado", "distância até a parada (m)", "vizinhos atualizados"]}
          linhas={t.dj.passos.slice(1).map((p, i) => [
            i + 1,
            p.no,
            p.d,
            T(p.relax.filter(r => r.acao.includes("registra") || r.acao.includes("atualiza")).map(r => `nó ${r.viz}: ${p.d} + ${r.peso} = ${r.cand}`).join("; ") || "nenhum")
          ])}
        />
        <Tabela
          cab={["nó", "distância até a parada (m)", "caminho da parada até o nó"]}
          linhas={[...t.dj.dist.keys()].sort((a, b) => a - b).map(no => [no, t.dj.dist.get(no), T(t.dj.caminho.get(no).join(" → "))])}
        />
      </Etapa>

      <Etapa
        titulo="Montar a rota de cada origem"
        regra="A rota é o caminho lido ao contrário: da origem até a parada. Cada par de nós seguidos é um trecho."
      >
        <Tabela
          cab={["origem", "população", "rota (nós)", "trechos usados"]}
          linhas={t.rotas.map(r => [
            r.id, r.pop,
            T(r.nos.join(" → ")),
            T(r.arestas.map(a => idAresta(a.escolhida)).join(", "))
          ])}
        />
      </Etapa>

      <Etapa
        titulo="Somar a população nos trechos"
        regra={<>Cada origem soma a sua população <strong>inteira</strong> em cada trecho da sua rota (sem dividir). Fluxo do trecho: <Tex>{String.raw`F_i = \sum_{c \,:\, i \in \text{rota}(c)} \text{pop}_c`}</Tex>.</>}
      >
        <Tabela
          legenda="Fluxo acumulado em cada trecho depois de processar cada origem (em destaque, o que mudou)."
          cab={["após a origem", "pop.", ...idsArestas]}
          linhas={t.alocacao.map(a => [
            `origem ${a.id}`,
            a.pop,
            ...idsArestas.map(e => (a.ids.includes(e) ? { v: a.estado.get(e), forte: true } : a.estado.get(e)))
          ])}
        />
      </Etapa>

      <Etapa titulo="Resultado e conferência">
        <DiagramaMesaParte1 fluxo={t.acumulado} />
        <Tabela
          cab={["trecho", "comprimento (m)", "fluxo potencial F"]}
          linhas={ARESTAS.map(a => [idAresta(a), a.L, { v: t.acumulado.get(idAresta(a)), forte: true }])}
        />
        <Verificacao>
          O trecho junto da parada concentra todos: {n0(t.populacaoTotal)} pessoas passam por ele, o total da população.
          Soma dos fluxos = {n0(t.somaF)}; esperado (população × trechos de cada rota) = {n0(t.esperado)}.
          {t.somaF === t.esperado ? " Coincidem." : " ATENÇÃO: não coincidem."}
        </Verificacao>
      </Etapa>
    </TesteDeMesa>
  );
}
