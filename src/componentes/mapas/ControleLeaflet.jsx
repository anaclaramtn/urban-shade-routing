import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { L } from "../../lib/leaflet.js";

// Caixa posicionada pelo Leaflet (topleft, topright, ...) com conteúdo em React.
export default function ControleLeaflet({ map, position, className, children }) {
  const [elemento, setElemento] = useState(null);
  useEffect(() => {
    if (!map) return;
    const controle = L.control({ position });
    controle.onAdd = () => {
      const div = L.DomUtil.create("div", className);
      L.DomEvent.disableClickPropagation(div);
      L.DomEvent.disableScrollPropagation(div);
      return div;
    };
    controle.addTo(map);
    setElemento(controle.getContainer());
    return () => { controle.remove(); setElemento(null); };
  }, [map, position, className]);
  return elemento ? createPortal(children, elemento) : null;
}
