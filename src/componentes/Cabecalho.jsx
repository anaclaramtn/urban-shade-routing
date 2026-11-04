import { useEffect, useRef } from "react";
import { PARTES } from "../conteudo.js";

export default function Cabecalho() {
  const menu = useRef(null);

  // Fecha o menu de etapas ao escolher um item ou clicar fora dele.
  useEffect(() => {
    const aoClicar = e => {
      const d = menu.current;
      if (d?.open && !d.contains(e.target)) d.removeAttribute("open");
    };
    document.addEventListener("click", aoClicar);
    return () => document.removeEventListener("click", aoClicar);
  }, []);
  const fechar = () => menu.current?.removeAttribute("open");

  return (
    <header className="site-header">
      <div className="shell site-nav">
        <a className="brand" href="#/" aria-label="Cidade à Sombra — início">
          <span className="brand__text">
            Cidade à Sombra
            <small>Roteamento urbano por sombra</small>
          </span>
        </a>
        <nav aria-label="Navegação principal">
          <ul className="nav-list">
            <li><a href="#/">Início</a></li>
            <li className="nav-dropdown">
              <details ref={menu}>
                <summary>Partes</summary>
                <ul className="nav-submenu">
                  {PARTES.map(p => (
                    <li key={p.id}><a href={`#/${p.id}`} onClick={fechar}><span>{p.numero}</span> {p.titulo}</a></li>
                  ))}
                </ul>
              </details>
            </li>
            <li><a href="#/inicio/tecnica">Como é feito</a></li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
