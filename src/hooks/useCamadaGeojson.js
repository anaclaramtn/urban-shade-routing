import { useEffect, useRef } from "react";
import { lerTopojson } from "../lib/dados.js";

// Carrega um TopoJSON e adiciona a camada criada por `criar(geojson)` ao destino
// (mapa ou grupo de camadas). Usado para o fundo e o limite territorial.
export function useCamadaGeojson(destino, arquivo, criar) {
  const criarRef = useRef(criar);
  useEffect(() => {
    if (!destino) return;
    let ativo = true, camada = null;
    lerTopojson(arquivo)
      .then(geojson => { if (ativo) camada = criarRef.current(geojson).addTo(destino); })
      .catch(console.error);
    return () => { ativo = false; camada?.remove(); };
  }, [destino, arquivo]);
}
