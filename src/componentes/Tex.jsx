// Fórmula inline para o MathJax (carregado no index.html).
export default function Tex({ children }) {
  return <>{`\\(${children}\\)`}</>;
}
