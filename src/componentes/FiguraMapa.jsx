import { useRef } from "react";
import { useVisivel } from "../hooks/useVisivel.js";

// Mapa dentro da página. Só é montado quando chega perto da tela, para não
// baixar os dados dos três mapas de uma vez.
export default function FiguraMapa({ id, Mapa }) {
  const ref = useRef(null);
  const visivel = useVisivel(ref);
  return (
    <figure className="map">
      <div className="map__viewport" ref={ref}>
        {visivel ? <Mapa /> : <div className="mapa-espera" />}
      </div>
      <figcaption className="map__caption">
        <a className="button button--primary" href={`?mapa=${id}`} target="_blank" rel="noopener">Abrir em nova guia</a>
      </figcaption>
    </figure>
  );
}
