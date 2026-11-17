// Por que o projeto começou e qual pergunta ele quer responder. Edite os textos aqui.
export default function Motivacao() {
  return (
    <section className="content-section" id="motivacao" aria-labelledby="motivacao-titulo">
      <div className="shell">
        <header className="section-heading section-heading--split">
          <div className="section-heading__body">
            <p className="eyebrow">Ponto de partida</p>
            <h2 id="motivacao-titulo">Por que o projeto começou</h2>
          </div>
          <p className="section-heading__intro">
            Em uma cidade quente como Fortaleza, andar a pé até, praticamente, qualquer POIs significa muito 
            tempo sob o sol.
          </p>
        </header>

        <blockquote className="pergunta">
          <p className="eyebrow">A pergunta que queremos responder</p>
          <p className="pergunta__texto">
            Se eu tivesse um X número de arvores, onde plantá-las com o objetivo de reduzir o sofrimento causado pela exposição ao sol de quem caminha em Fortaleza, e por onde começar?
          </p>
        </blockquote>
      </div>
    </section>
  );
}
