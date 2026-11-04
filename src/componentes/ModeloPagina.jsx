import { PARTES } from "../conteudo.js";

// Cabeçalho comum das páginas de parte: voltar, número, título e resumo.
export function TopoParte({ numero, rotulo, titulo, children }) {
  return (
    <section className="topo-parte">
      <div className="shell">
        <a className="topo-parte__voltar" href="#/inicio/partes">← Todas as partes</a>
        <p className="eyebrow">Parte {numero} · {rotulo}</p>
        <h1>{titulo}</h1>
        <p className="topo-parte__resumo">{children}</p>
      </div>
    </section>
  );
}

// Bloco de metodologia: título da seção + conteúdo.
export function Metodologia({ id, titulo, intro, children }) {
  return (
    <section className="content-section content-section--divided" id={id} aria-labelledby={`${id}-titulo`}>
      <div className="shell">
        <header className="section-heading section-heading--split">
          <div className="section-heading__body">
            <p className="eyebrow">Metodologia</p>
            <h2 id={`${id}-titulo`}>{titulo}</h2>
          </div>
          {intro && <p className="section-heading__intro">{intro}</p>}
        </header>
        {children}
      </div>
    </section>
  );
}

// Anterior / próxima parte no fim da página.
export function NavegacaoPartes({ id }) {
  const i = PARTES.findIndex(p => p.id === id);
  const anterior = PARTES[i - 1];
  const proxima = PARTES[i + 1];
  return (
    <nav className="navegacao-partes" aria-label="Outras partes">
      <div className="shell navegacao-partes__linha">
        {anterior ? <a href={`#/${anterior.id}`}>← Parte {anterior.numero}: {anterior.titulo}</a> : <span />}
        {proxima ? <a href={`#/${proxima.id}`}>Parte {proxima.numero}: {proxima.titulo} →</a> : <span />}
      </div>
    </nav>
  );
}
