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

      <NavegacaoPartes id="parte-3" />
    </>
  );
}
