import { useEffect, useRef, useState } from "react";

// Cria o mapa Leaflet dentro de `ref` e o remove ao desmontar.
export function useMapaLeaflet(ref, criar) {
  const [map, setMap] = useState(null);
  const criarRef = useRef(criar);
  useEffect(() => {
    const m = criarRef.current(ref.current);
    setMap(m);
    return () => { m.remove(); setMap(null); };
  }, [ref]);
  return map;
}
