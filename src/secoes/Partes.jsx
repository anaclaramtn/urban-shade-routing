import { PARTES } from "../conteudo.js";

export default function Partes() {
  return (
    <section className="content-section content-section--divided" id="partes" aria-labelledby="partes-titulo">
      <div className="shell">
        <header className="section-heading section-heading--split">
          <div className="section-heading__body">
            <p className="eyebrow">O projeto em partes</p>
            <h2 id="partes-titulo">O que foi feito</h2>
          </div>
          <p className="section-heading__intro">
            Cada parte responde a uma pergunta e alimenta a seguinte. Entre na página de cada uma para ver os mapas e a metodologia passo a passo.
          </p>
        </header>

        <div className="cartoes">
          {PARTES.map(p => (
            <article className="cartao" key={p.id}>
              <div className="cartao__topo">
                <span className="cartao__numero">{p.numero}</span>
                <span className="cartao__status">{p.status}</span>
              </div>
              <h3>{p.titulo}</h3>
              <p className="cartao__resumo">{p.resumo}</p>
              <ul className="cartao__lista">
                {p.feito.map(item => <li key={item}>{item}</li>)}
              </ul>
              <a className="button button--primary" href={`#/${p.id}`}>Entrar na Parte {p.numero} →</a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
