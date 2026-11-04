"""Converte a exportação do Colab em TopoJSON para o mapa de plantio.

Entradas:
  notebooks/arestas_arvores.geojson                    geometria, L e sol (exportação do Colab)
  public/topojson/arestas_fluxo_potencial_log10.topojson fluxo F do mapa da Etapa 1
Saída:    public/topojson/arestas_plantio.topojson

Uso:  python scripts/build_plantio_topojson.py
Só usa a biblioteca padrão do Python.

Propriedades de cada aresta na saída:
  id       edge_id (u-v-key do grafo)
  F        fluxo potencial de pessoas — o MESMO edge_population do mapa da
           Etapa 1 (6 algarismos significativos), para as escalas coincidirem
  L        comprimento (m)
  sH       fração ao sol às H horas, em % inteiro (de sun_m_H_pa: sombra de
           prédios + árvores existentes, a sombra considerada no projeto)
"""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENTRADA = ROOT / "notebooks" / "arestas_arvores.geojson"
FLUXO_ETAPA_1 = ROOT / "public" / "topojson" / "arestas_fluxo_potencial_log10.topojson"
SAIDA = ROOT / "public" / "topojson" / "arestas_plantio.topojson"
OBJETO = "arestas_plantio"
QUANTIZACAO = 1_000_000
PADRAO_SOL = re.compile(r"^sun_m_(\d+)_pa$")


def carregar_fluxo_etapa_1() -> dict[str, float]:
    topo = json.loads(FLUXO_ETAPA_1.read_text(encoding="utf-8"))
    objeto = next(iter(topo["objects"].values()))
    return {g["properties"]["edge_id"]: g["properties"]["edge_population"] for g in objeto["geometries"]}


def main() -> None:
    feats = json.loads(ENTRADA.read_text(encoding="utf-8"))["features"]
    fluxo = carregar_fluxo_etapa_1()
    ids = {f["properties"]["edge_id"] for f in feats}
    if ids != set(fluxo):
        raise ValueError(
            f"As arestas não batem com o mapa da Etapa 1: {len(ids - set(fluxo))} só na exportação, "
            f"{len(set(fluxo) - ids)} só na Etapa 1."
        )
    dif = max(abs(fluxo[f["properties"]["edge_id"]] - f["properties"]["edge_population"]) for f in feats)
    if dif > 0.01:
        raise ValueError(f"O fluxo da exportação difere do mapa da Etapa 1 em até {dif:.4f}.")
    chaves_sol = sorted(
        (k for k in feats[0]["properties"] if PADRAO_SOL.match(k)),
        key=lambda k: (int(PADRAO_SOL.match(k).group(1)), k),
    )

    pontos = [pt for f in feats for pt in f["geometry"]["coordinates"]]
    x0, y0 = min(x for x, _ in pontos), min(y for _, y in pontos)
    x1, y1 = max(x for x, _ in pontos), max(y for _, y in pontos)
    kx = (x1 - x0) / (QUANTIZACAO - 1)
    ky = (y1 - y0) / (QUANTIZACAO - 1)

    arcos, geometrias, sem_geometria = [], [], []
    for f in feats:
        if f["geometry"]["type"] != "LineString":
            raise ValueError(f"Geometria inesperada: {f['geometry']['type']}")
        p = f["properties"]
        F = float(f"{fluxo[p['edge_id']]:.6g}")
        props = {"id": p["edge_id"], "F": F, "L": round(p["distancia_metros"], 2)}
        for k in chaves_sol:
            m = PADRAO_SOL.match(k)
            frac = min(max(float(p[k]), 0.0), 1.0)
            props[f"s{m.group(1)}"] = round(frac * 100)

        if len(f["geometry"]["coordinates"]) < 2:
            # Aresta degenerada (ex.: poucos cm): entra no cálculo de J, mas não é desenhada.
            sem_geometria.append(p["edge_id"])
            geometrias.append({"type": None, "properties": props})
            continue

        arco, px, py = [], 0, 0
        for x, y in f["geometry"]["coordinates"]:
            qx, qy = round((x - x0) / kx), round((y - y0) / ky)
            arco.append([qx - px, qy - py])
            px, py = qx, qy
        geometrias.append({"type": "LineString", "arcs": [len(arcos)], "properties": props})
        arcos.append(arco)

    topologia = {
        "type": "Topology",
        "bbox": [x0, y0, x1, y1],
        "transform": {"scale": [kx, ky], "translate": [x0, y0]},
        "objects": {OBJETO: {"type": "GeometryCollection", "geometries": geometrias}},
        "arcs": arcos,
    }
    SAIDA.write_text(json.dumps(topologia, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")
    horas = sorted({int(PADRAO_SOL.match(k).group(1)) for k in chaves_sol})
    print(f"Arestas: {len(geometrias):,} | horários: {horas}")
    if sem_geometria:
        print(f"Sem geometria (não desenhadas, mas incluídas em J): {sem_geometria}")
    print(f"Salvo: {SAIDA.relative_to(ROOT)} ({SAIDA.stat().st_size / 1e6:.1f} MB)")


if __name__ == "__main__":
    main()
