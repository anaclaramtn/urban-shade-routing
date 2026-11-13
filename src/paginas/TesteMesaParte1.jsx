import { useMemo } from "react";
import Tex from "../componentes/Tex.jsx";
import { TesteDeMesa, Etapa, Decisao, Verificacao, Tabela } from "../componentes/TesteDeMesa.jsx";
import { testeMesaParte1, NOS, ARESTAS, PARADAS, RASTER, idAresta } from "../lib/testeMesa.js";
import { fmt } from "../lib/formato.js";

const n1 = v => fmt(v, 1);
const T = (v, extra = {}) => ({ v, texto: true, ...extra });

export default function TesteMesaParte1() {
  const t = useMemo(testeMesaParte1, []);
  const idsArestas = ARESTAS.map(idAresta);

  return (
    <TesteDeMesa
      titulo="Teste de mesa: o algoritmo executado à mão"
      enunciado={
        <>
          <p>
            Exemplo didático, pequeno o bastante para conferir cada número com lápis e papel. Os valores foram escolhidos
            para exercitar todos os casos que o código trata: células sem dado, células de população zero, duas células
            no mesmo nó, uma célula que já está no ponto de parada, uma célula em um trecho desconectado e uma aresta
            paralela. As regras e o peso do caminho (<code>distancia_metros</code>) são os do notebook.
          </p>
          <p>
            <strong>Dados de entrada.</strong> Raster GHSL 3×3 com células de 100 m, canto superior esquerdo em (0, 100) m;
            9 nós; 10 arestas; 3 pontos de parada GTFS. Coordenadas em metros no CRS projetado.
          </p>
          <Tabela
            legenda="Raster de população (linha 0 = norte). “—” = NoData."
            cab={["linha \\ coluna", "col 0", "col 1", "col 2"]}
            linhas={RASTER.valores.map((l, r) => [`linha ${r}`, ...l.map(v => (v === null ? "—" : fmt(v)))])}
          />
          <Tabela
            legenda="Nós da rede de pedestres."
            cab={["nó", "x (m)", "y (m)"]}
            linhas={NOS.map(n => [n.id, n.x, n.y])}
          />
          <Tabela
            legenda="Arestas (u, v, chave) e comprimento. A rota é calculada sem considerar a orientação (grafo não direcionado); a orientação só importa para identificar a aresta."
            cab={["aresta", "distancia_metros (m)"]}
            linhas={ARESTAS.map(a => [idAresta(a), a.L])}
          />
          <Tabela
            legenda="Pontos de parada GTFS."
            cab={["parada", "x (m)", "y (m)"]}
            linhas={PARADAS.map(p => [p.id, p.x, p.y])}
          />
        </>
      }
    >
      <Etapa
        titulo="Classificar as células do raster"
        regra={<>Cada célula é NoData, igual a zero ou positiva (<code>população &gt; 0</code>). Só as positivas seguem. Elas recebem <code>cell_id</code> numerado em ordem de leitura (linha por linha, da esquerda para a direita).</>}
      >
        <Tabela
          cab={["linha", "coluna", "valor", "classe", "cell_id"]}
          linhas={t.classificacao.map(c => [
            c.r, c.c, c.valor === null ? "—" : fmt(c.valor), T(c.classe), c.id === null ? "(descartada)" : { v: c.id, forte: true }
          ])}
          esquerda={0}
        />
        <Verificacao>
          NoData ({t.nNoData}) + zero ({t.nZero}) + negativas (0) + positivas ({t.nPos}) = {t.nNoData + t.nZero + t.nPos} = {t.total} células do raster.
          A soma da população das células positivas é {fmt(t.populacaoTotal)} pessoas.
        </Verificacao>
      </Etapa>

      <Etapa
        titulo="Calcular o centroide de cada célula positiva"
        regra={<>Para a célula na linha <Tex>r</Tex> e coluna <Tex>c</Tex>: <Tex>{String.raw`x = x_0 + (c + 0{,}5)\cdot 100`}</Tex> e <Tex>{String.raw`y = y_0 - (r + 0{,}5)\cdot 100`}</Tex>, com <Tex>x_0 = 0</Tex> e <Tex>y_0 = 100</Tex>.</>}
      >
        <Tabela
          cab={["cell_id", "linha r", "coluna c", "x (m)", "y (m)", "população"]}
          linhas={t.celulas.map(c => [c.id, c.r, c.c, c.x, c.y, c.pop])}
        />
        <Decisao>As {t.nPos} células viram as origens. A cada origem fica associada sua população, que não muda até o fim.</Decisao>
      </Etapa>

      <Etapa
        titulo="Associar cada centroide ao nó mais próximo"
        regra={<>Distância euclidiana <Tex>{String.raw`d = \sqrt{(x_c - x_n)^2 + (y_c - y_n)^2}`}</Tex>; vale o nó de menor <Tex>d</Tex> (em empate, o primeiro da lista; não há empate aqui).</>}
      >
        <Tabela
          legenda="Distância (m) de cada centroide a cada nó. Em amarelo, o menor valor da linha."
          cab={["cell_id", ...NOS.map(n => `nó ${n.id}`), "nó escolhido"]}
          linhas={t.celulas.map(c => [
            c.id,
            ...c.assoc.distancias.map((d, i) => (NOS[i].id === c.assoc.no ? { v: n1(d), forte: true } : n1(d))),
            c.assoc.no
          ])}
        />
        <Decisao>
          Origens: {t.celulas.map(c => `célula ${c.id} → nó ${c.assoc.no}`).join("; ")}. As células 0 e 1 caem no mesmo nó
          ({t.celulas[0].assoc.no}); a célula 4 cai no nó {t.celulas[4].assoc.no}, onde há paradas; a célula 5 cai no nó {t.celulas[5].assoc.no}, que pertence a um trecho isolado (nós 8 e 9).
        </Decisao>
      </Etapa>

      <Etapa
        titulo="Associar cada parada ao nó mais próximo e definir as fontes do Dijkstra"
        regra={<>Mesma regra do passo anterior. As fontes são os nós <strong>únicos</strong> associados a alguma parada, em ordem crescente (<code>bus_stop_nodes = sorted(set(...))</code>).</>}
      >
        <Tabela
          legenda="Distância (m) de cada parada a cada nó."
          cab={["parada", ...NOS.map(n => `nó ${n.id}`), "nó escolhido"]}
          linhas={t.paradas.map(p => [
            p.id,
            ...p.assoc.distancias.map((d, i) => (NOS[i].id === p.assoc.no ? { v: n1(d), forte: true } : n1(d))),
            p.assoc.no
          ])}
        />
        <Decisao>
          {t.paradas.length} paradas, {t.nosParada.length} nós distintos. Fontes = {"{"}{t.nosParada.join(", ")}{"}"}. As paradas P1 e P2 caem no mesmo nó e contam uma vez só.
        </Decisao>
      </Etapa>

      <Etapa
        titulo="Dijkstra com várias fontes (multi_source_dijkstra)"
        regra={
          <>
            Todas as fontes entram na fila com distância 0. A cada passo sai da fila o item de menor (distância, ordem de entrada).
            Se o nó já foi fechado, o item é ignorado. Senão, o nó é fechado com aquela distância e cada vizinho <Tex>v</Tex> recebe o
            candidato <Tex>{String.raw`d(u) + w(u,v)`}</Tex>, que só substitui o valor conhecido se for <strong>estritamente menor</strong>.
            Entre arestas paralelas vale a de menor peso. Os vizinhos são examinados em ordem crescente de id; nesta rede isso não
            influencia o resultado porque nenhum candidato empata.
          </>
        }
      >
        <Tabela
          legenda="Cada linha é uma retirada da fila. A coluna “fila depois” mostra o conteúdo da fila (nó e distância) ao fim do passo."
          cab={["passo", "sai da fila", "ação sobre os vizinhos", "fila depois"]}
          linhas={t.dj.passos.slice(1).map((p, i) => [
            i + 1,
            T(p.tipo === "ignorado" ? `nó ${p.no} (${p.d}) — ignorado: o nó ${p.no} já está fechado` : `nó ${p.no} (${p.d}) — fechado com dist = ${p.d}`),
            T(p.tipo === "ignorado" ? "nenhuma" : p.relax.map(r => `nó ${r.viz}: ${p.d} + ${r.peso} = ${r.cand}; ${r.acao}`).join(" | ")),
            T(p.fila)
          ])}
        />
        <p>Fila inicial: {t.dj.passos[0].fila}.</p>
        <Tabela
          legenda="Resultado: menor distância de cada nó até uma parada e o caminho, que começa no nó-parada de onde veio."
          cab={["nó", "dist. até a parada mais próxima (m)", "caminho parada → nó"]}
          linhas={[...t.dj.dist.keys()].sort((a, b) => a - b).map(no => [no, t.dj.dist.get(no), T(t.dj.caminho.get(no).join(" → "))])}
        />
        <Decisao>Os nós 8 e 9 não aparecem no resultado: não existe caminho entre eles e nenhuma parada.</Decisao>
      </Etapa>

      <Etapa
        titulo="Montar a rota de cada célula"
        regra={<>Se a origem não está no resultado do Dijkstra: <code>no_path_to_any_stop</code>. Se o caminho tem um só nó: <code>origin_equals_destination</code>. Caso contrário, a rota é o caminho invertido (origem → parada) e o status é <code>ok</code>. Para cada par de nós consecutivos a aresta usada é a de menor <code>distancia_metros</code> entre as paralelas.</>}
      >
        <Tabela
          cab={["cell_id", "população", "nó de origem", "status", "destino", "dist. (m)", "rota (nós)", "arestas escolhidas"]}
          linhas={t.rotas.map(r => [
            r.id, r.pop, r.origem, T(r.status), r.destino ?? "—", r.dist ?? "—",
            T(r.nos.length ? r.nos.join(" → ") : "—"),
            T(r.arestas.length ? r.arestas.map(a => idAresta(a.escolhida)).join(", ") : "nenhuma")
          ])}
        />
        {t.rotas.some(r => r.arestas.some(a => a.candidatas.length > 1)) && (
          <Decisao>
            Entre os nós 3 e 6 existem duas arestas: 3-6-0 (90 m) e 3-6-1 (95 m). Vale a de menor peso, 3-6-0, a mesma que o Dijkstra usou para calcular a distância. A aresta 3-6-1 nunca é escolhida e fica com fluxo zero.
          </Decisao>
        )}
        <Decisao>
          Rotas que contribuem: células {t.rotas.filter(r => r.status === "ok").map(r => r.id).join(", ")}.
          A célula {t.rotas.find(r => r.status === "origin_equals_destination").id} já está em um nó de parada (sem arestas) e a célula {t.rotas.find(r => r.status === "no_path_to_any_stop").id} não tem caminho; nenhuma das duas soma população em aresta.
        </Decisao>
      </Etapa>

      <Etapa
        titulo="Somar a população nas arestas de cada rota"
        regra={<>A população <strong>integral</strong> da célula é somada em cada aresta <strong>distinta</strong> da sua rota (não é dividida entre as arestas). Fluxo da aresta: <Tex>{String.raw`F_i = \sum_{c \,:\, i \in \text{rota}(c)} \text{pop}_c`}</Tex>.</>}
      >
        <Tabela
          legenda="Fluxo acumulado em cada aresta após processar cada célula (em amarelo, o que mudou naquele passo)."
          cab={["após a célula", "pop.", ...idsArestas]}
          linhas={t.alocacao.map(a => [
            `célula ${a.id}`,
            a.pop,
            ...idsArestas.map(e => (a.ids.includes(e) ? { v: a.estado.get(e), forte: true } : a.estado.get(e)))
          ])}
        />
        <Decisao>
          Aresta 3-6-0: célula 0 (25) + célula 1 (20) = 45. Aresta 6-7-0: também 45, pelo mesmo motivo.
          Arestas 2-5-0 e 1-2-0: 40 cada, da célula 2. Aresta 4-7-0: 10, da célula 3.
        </Decisao>
      </Etapa>

      <Etapa titulo="Resultado final e conferências">
        <Tabela
          cab={["aresta", "comprimento (m)", "fluxo potencial F"]}
          linhas={ARESTAS.map(a => [idAresta(a), a.L, { v: t.acumulado.get(idAresta(a)), forte: t.acumulado.get(idAresta(a)) > 0 }])}
        />
        <Verificacao>
          Soma dos fluxos das arestas = {fmt(t.somaF)}. Valor esperado: Σ (população da célula × nº de arestas distintas da rota) = {fmt(t.esperado)}.
          {t.somaF === t.esperado ? " Os dois valores coincidem." : " ATENÇÃO: os valores não coincidem."}
        </Verificacao>
        <Verificacao>
          População por destino das células: {fmt(t.popPorStatus.ok)} em rotas <code>ok</code>, {fmt(t.popPorStatus.origin_equals_destination)} em <code>origin_equals_destination</code>,
          {" "}{fmt(t.popPorStatus.no_path_to_any_stop)} em <code>no_path_to_any_stop</code>; total {fmt(t.popPorStatus.ok + t.popPorStatus.origin_equals_destination + t.popPorStatus.no_path_to_any_stop)} = {fmt(t.populacaoTotal)} (população das células positivas, etapa 1).
        </Verificacao>
      </Etapa>
    </TesteDeMesa>
  );
}
