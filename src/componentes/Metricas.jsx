export default function Metricas({ itens, className = "" }) {
  return (
    <div className={`metric-grid ${className}`.trim()}>
      {itens.map(([valor, rotulo]) => (
        <div className="metric" key={rotulo}>
          <strong className="metric__value">{valor}</strong>
          <span className="metric__label">{rotulo}</span>
        </div>
      ))}
    </div>
  );
}
