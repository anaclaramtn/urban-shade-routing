export const fmt = (v, d = 0) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });

export const plural = (k, um, varios) => `${fmt(k)} ${k === 1 ? um : varios}`;
