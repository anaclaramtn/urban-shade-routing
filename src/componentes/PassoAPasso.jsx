// Metodologia detalhada: cada passo tem número, título, texto e, se quiser,
// uma fórmula ou trecho de código em `extra`.
//   passos = [{ titulo, texto, extra }]
export default function PassoAPasso({ passos }) {
  return (
    <ol className="passos">
      {passos.map(({ titulo, texto, extra }) => (
        <li key={titulo} className="passo">
          <div className="passo__corpo">
            <h4>{titulo}</h4>
            <div className="passo__texto">{texto}</div>
          </div>
          {extra && <div className="passo__extra">{extra}</div>}
        </li>
      ))}
    </ol>
  );
}
