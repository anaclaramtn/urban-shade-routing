export default function LegendaGradiente({ titulo, min, max }) {
  return (
    <>
      <strong>{titulo}</strong>
      <div className="legend-gradient" />
      <div className="legend-range"><span>{min}</span><span>{max}</span></div>
    </>
  );
}
