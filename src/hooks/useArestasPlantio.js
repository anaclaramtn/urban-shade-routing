import { useEffect, useState } from "react";
import { carregarArestasPlantio } from "../lib/dados.js";

export function useArestasPlantio() {
  const [estado, setEstado] = useState({ dados: null, erro: null });
  useEffect(() => {
    let ativo = true;
    carregarArestasPlantio().then(
      dados => ativo && setEstado({ dados, erro: null }),
      erro => { console.error(erro); if (ativo) setEstado({ dados: null, erro }); }
    );
    return () => { ativo = false; };
  }, []);
  return estado;
}
