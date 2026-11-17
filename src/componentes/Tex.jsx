import { useEffect, useRef } from "react";

// Fórmula inline para o MathJax (carregado no index.html).
// O React não gerencia o conteúdo do <span>: ele é escrito e composto aqui,
// então o MathJax pode trocá-lo à vontade, sem conflito com a renderização do React,
// e a fórmula é composta sempre que o componente monta ou o texto muda,
// mesmo que o MathJax ainda esteja carregando.
export default function Tex({ children }) {
  const ref = useRef(null);
  const tex = String(children);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.textContent = `\\(${tex}\\)`;

    let cancelado = false;
    let tentativas = 0;
    let timer;
    const compor = () => {
      if (cancelado) return;
      const mj = window.MathJax;
      if (mj?.typesetPromise) {
        mj.startup?.promise
          ?.then(() => (cancelado ? null : mj.typesetPromise([el])))
          .catch(() => {});
      } else if (tentativas++ < 100) {
        timer = setTimeout(compor, 100);
      }
    };
    compor();

    return () => {
      cancelado = true;
      clearTimeout(timer);
    };
  }, [tex]);

  return <span ref={ref} className="tex" />;
}
