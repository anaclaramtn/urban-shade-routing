export default function Abertura() {
  return (
    <section className="hero" id="inicio">
      <div className="shell hero__inner">
        <p className="eyebrow">Mobilidade em Fortaleza</p>
        <h1>Cidade à Sombra</h1>
        <p className="hero__copy">
          O projeto investiga como apoiar deslocamentos a pé mais confortáveis em Fortaleza, 
          buscando responder às perguntas: onde as pessoas caminham, onde o sol pesa mais e 
          como a sombra, entendida como infraestrutura urbana, pode ajudar.
        </p>
        <div className="hero__acoes">
          <a className="button button--sun" href="#/inicio/partes">Ver as partes do projeto</a>
          <a className="button button--ghost" href="#/inicio/tecnica">Como o site é feito</a>
        </div>
      </div>
    </section>
  );
}
