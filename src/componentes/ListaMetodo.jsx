// Passos numerados do método (o número vem do CSS).
export default function ListaMetodo({ passos }) {
  return (
    <ol className="method-list">
      {passos.map(([titulo, texto]) => (
        <li key={titulo}>
          <h3>{titulo}</h3>
          <p>{texto}</p>
        </li>
      ))}
    </ol>
  );
}
