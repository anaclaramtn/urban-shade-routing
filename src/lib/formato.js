export const fmt = (v, d = 0) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });

export const plural = (k, um, varios, d = 0) => `${fmt(k, d)} ${k === 1 ? um : varios}`;
