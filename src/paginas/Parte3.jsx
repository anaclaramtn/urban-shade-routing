import PassoAPasso from "../componentes/PassoAPasso.jsx";
import { TopoParte, Metodologia, NavegacaoPartes } from "../componentes/ModeloPagina.jsx";

const PASSOS = [
  { titulo: "Passo 1", texto: <p></p> },
  { titulo: "Passo 2", texto: <p></p> },
  { titulo: "Passo 3", texto: <p></p> }
];

export default function Parte3() {
  return (
    <>
      <TopoParte numero="03" rotulo="" titulo="Rotas pela sombra">
        
      </TopoParte>

      <Metodologia id="metodologia" titulo="Passo a passo do algoritmo"
        intro="">
        <PassoAPasso passos={PASSOS} />
      </Metodologia>

      <Metodologia id="teste-de-mesa" rotulo="Teste de mesa" titulo="Execução registrada passo a passo"
        intro="A ser preenchido quando o algoritmo de rotas pela sombra estiver definido.">
        <p>
          Pendente: o algoritmo desta parte ainda não foi especificado. Quando for, seguir o mesmo padrão das
          Partes 1 e 2: dados de entrada em tabela, uma etapa por decisão do algoritmo (com a regra aplicada e os
          valores intermediários) e conferências numéricas no fim. Os números devem ser gerados pelo próprio código
          em <code>src/lib/testeMesa.js</code>, nunca digitados à mão.
        </p>
      </Metodologia>

      <NavegacaoPartes id="parte-3" />
    </>
  );
}
