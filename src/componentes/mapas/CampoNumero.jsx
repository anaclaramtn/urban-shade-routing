import { useEffect, useState } from "react";

// Caixa numérica que aceita digitação parcial ("", "0,") sem perder o texto,
// e atualiza o valor assim que o texto vira um número válido.
export default function CampoNumero({ valor, aoMudar, ler, valido, ...props }) {
  const [texto, setTexto] = useState(String(valor));
  useEffect(() => {
    setTexto(t => (ler(t) === valor ? t : String(valor)));
  }, [valor, ler]);
  return (
    <input
      className="num"
      type="number"
      value={texto}
      onChange={e => {
        setTexto(e.target.value);
        const v = ler(e.target.value);
        if (valido(v)) aoMudar(v);
      }}
      {...props}
    />
  );
}
