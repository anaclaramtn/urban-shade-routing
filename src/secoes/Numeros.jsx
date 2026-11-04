import Metricas from "../componentes/Metricas.jsx";
import { NUMEROS_GERAIS } from "../conteudo.js";

export default function Numeros() {
  return (
    <section className="content-section" id="numeros" aria-labelledby="numeros-titulo">
      <div className="shell">
        <header className="section-heading section-heading--split">
          <div className="section-heading__body">
            <p className="eyebrow">Panorama do recorte</p>
            <h2 id="numeros-titulo">Análise em números</h2>
          </div>
          <p className="section-heading__intro">
            Os valores abaixo resumem a rede, os dados populacionais e o resultado da execução atual do projeto em Fortaleza.
          </p>
        </header>
        <Metricas itens={NUMEROS_GERAIS} className="metric-grid--large" />
      </div>
    </section>
  );
}
