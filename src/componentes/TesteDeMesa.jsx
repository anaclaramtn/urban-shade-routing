import { Children, cloneElement, useState } from "react";

// Blocos de apresentação do teste de mesa.
//
//   <TesteDeMesa titulo enunciado>      envolve o teste inteiro
//     <Etapa n titulo regra>            uma etapa do algoritmo
//       <Tabela cab linhas />           estado dos dados naquela etapa
//       <Decisao>…</Decisao>            o que o algoritmo concluiu e por quê
//     </Etapa>
//   </TesteDeMesa>

export function TesteDeMesa({ titulo, enunciado, children }) {
  const etapas = Children.toArray(children);
  const [ativa, setAtiva] = useState(0);
  const total = etapas.length;
  const atual = etapas[ativa];

  return (
    <div className="mesa">
      <h3 className="mesa__titulo">{titulo}</h3>
      {enunciado && <div className="mesa__enunciado">{enunciado}</div>}

      <nav className="mesa__passos" aria-label="Etapas do teste de mesa">
        {etapas.map((e, i) => (
          <button
            key={i}
            type="button"
            className={"mesa__passo" + (i === ativa ? " mesa__passo--ativo" : i < ativa ? " mesa__passo--feito" : "")}
            aria-current={i === ativa ? "step" : undefined}
            aria-label={`Etapa ${i + 1}: ${e.props.titulo}`}
            onClick={() => setAtiva(i)}
          >
            <span className="mesa__passo-num">{i + 1}</span>
            <span className="mesa__passo-nome">{e.props.titulo}</span>
          </button>
        ))}
      </nav>

      <div className="mesa__palco" aria-live="polite">
        {cloneElement(atual, { numero: ativa + 1 })}
      </div>

      <div className="mesa__nav">
        <button type="button" className="button" disabled={ativa === 0} onClick={() => setAtiva(ativa - 1)}>← Anterior</button>
        <span>Etapa {ativa + 1} de {total}</span>
        <button type="button" className="button button--primary" disabled={ativa === total - 1} onClick={() => setAtiva(ativa + 1)}>Próxima →</button>
      </div>
    </div>
  );
}

export function Etapa({ titulo, regra, numero, children }) {
  return (
    <div className="mesa__etapa">
      <h4><span className="mesa__etapa-num">Etapa {numero}</span> {titulo}</h4>
      {regra && <p className="mesa__regra"><strong>Regra aplicada.</strong> {regra}</p>}
      {children}
    </div>
  );
}

export function Decisao({ children }) {
  return <p className="mesa__decisao"><strong>Decisão.</strong> {children}</p>;
}

export function Verificacao({ children }) {
  return <p className="mesa__verificacao"><strong>Conferência.</strong> {children}</p>;
}

// cab: cabeçalhos. linhas: matriz de células (texto/JSX). Uma célula pode ser
// { v: valor, forte: true } para destacar ou { v, texto: true } para texto corrido (quebra linha). `destacarLinha(i)` pinta a linha inteira.
export function Tabela({ cab, linhas, legenda, destacarLinha, esquerda = 1 }) {
  return (
    <div className="mesa__tabela-wrap">
      <table className="mesa__tabela">
        {legenda && <caption>{legenda}</caption>}
        <thead>
          <tr>{cab.map((c, j) => <th key={j} scope="col">{c}</th>)}</tr>
        </thead>
        <tbody>
          {linhas.map((linha, i) => (
            <tr key={i} className={destacarLinha && destacarLinha(i) ? "mesa__linha-destaque" : undefined}>
              {linha.map((cel, j) => {
                const objeto = cel !== null && typeof cel === "object" && "v" in cel;
                const valor = objeto ? cel.v : cel;
                const classes = [objeto && cel.forte && "mesa__forte", objeto && cel.texto && "mesa__texto"].filter(Boolean).join(" ");
                const Tag = j < esquerda ? "th" : "td";
                return <Tag key={j} scope={j < esquerda ? "row" : undefined} className={classes || undefined}>{valor}</Tag>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
