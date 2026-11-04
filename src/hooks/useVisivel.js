import { useEffect, useState } from "react";

// true a partir do momento em que o elemento chega perto da tela (e continua true).
export function useVisivel(ref, margem = "300px") {
  const [visivel, setVisivel] = useState(false);
  useEffect(() => {
    if (visivel || !ref.current) return;
    if (!("IntersectionObserver" in window)) { setVisivel(true); return; }
    const obs = new IntersectionObserver(entradas => {
      if (entradas.some(e => e.isIntersecting)) { setVisivel(true); obs.disconnect(); }
    }, { rootMargin: margem });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [ref, margem, visivel]);
  return visivel;
}
