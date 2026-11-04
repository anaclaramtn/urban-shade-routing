import { useEffect, useRef, useState } from "react";

// Repassa `valor` no máximo uma vez a cada `ms`: agrupa as mudanças rápidas do
// controle deslizante sem esperar o usuário soltá-lo.
export function useLimitado(valor, ms = 30) {
  const [atual, setAtual] = useState(valor);
  const ultimo = useRef(valor);
  const pendente = useRef(null);
  useEffect(() => {
    ultimo.current = valor;
    if (pendente.current) return;
    pendente.current = setTimeout(() => { pendente.current = null; setAtual(ultimo.current); }, ms);
  }, [valor, ms]);
  useEffect(() => () => { clearTimeout(pendente.current); pendente.current = null; }, []);
  return atual;
}
