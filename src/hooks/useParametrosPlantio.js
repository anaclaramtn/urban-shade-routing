import { useMemo, useState } from "react";
import { useLimitado } from "./useLimitado.js";

// lₐ e N: os valores dos controles (imediatos) e os usados no cálculo (limitados).
export function useParametrosPlantio(inicial = { la: 6, N: 1000 }) {
  const [la, setLa] = useState(inicial.la);
  const [N, setN] = useState(inicial.N);
  const valores = useMemo(() => ({ la, N }), [la, N]);
  const calculo = useLimitado(valores, 30);
  return { la, setLa, N, setN, calculo };
}
