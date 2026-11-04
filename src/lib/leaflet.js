import L from "leaflet";

// Extensão da cidade (mesma dos mapas anteriores).
export const LIMITES_CIDADE = [[-3.89460306, -38.63790294], [-3.69202597, -38.40132769]];

export function criarPanes(map, panes) {
  for (const [nome, z] of panes) {
    map.createPane(nome);
    map.getPane(nome).style.zIndex = z;
  }
}

export { L };
