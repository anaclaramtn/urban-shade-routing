import { useEffect, useState } from "react";

// Rotas por hash, que funcionam no GitHub Pages sem configurar servidor:
//   #/                      página inicial
//   #/inicio/<ancora>       página inicial, rolando até a seção <ancora>
//   #/parte-1, #/parte-2…   página de cada parte
// (os mapas em tela cheia continuam em ?mapa=<id>)
function ler() {
  const [pagina = "", ancora = ""] = location.hash.replace(/^#\/?/, "").split("/");
  return { pagina: pagina || "inicio", ancora };
}

export function useRota() {
  const [rota, setRota] = useState(ler);
  useEffect(() => {
    const aoMudar = () => setRota(ler());
    window.addEventListener("hashchange", aoMudar);
    return () => window.removeEventListener("hashchange", aoMudar);
  }, []);

  // Página nova começa no topo; com âncora, rola até a seção (depois de montar).
  useEffect(() => {
    if (!rota.ancora) { window.scrollTo(0, 0); return; }
    const id = requestAnimationFrame(() => {
      const el = document.getElementById(rota.ancora);
      if (el) el.scrollIntoView(); else window.scrollTo(0, 0);
    });
    return () => cancelAnimationFrame(id);
  }, [rota.pagina, rota.ancora]);

  return rota;
}
