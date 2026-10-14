"""Extrai as camadas GeoJSON do mapa Folium e gera TopoJSON por camada."""

from __future__ import annotations

import json
import re
import shutil
import subprocess
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "maps" / "mapa_geral_interativo_ghsl_log10.html"
OUTPUT = ROOT / "maps" / "topojson"
QUANTIZATION = 1_000_000

LAYERS = {
    "grafo_fundo": "geo_json_376bc06356d5ebe4eab61c227baf37a5",
    "ghsl_populacao_relevante": "geo_json_9fc34c9a590b845e54413c39982cddf6",
    "ghsl_zero": "geo_json_1d03ea8724d2527c890993a912c78667",
    "arestas_fluxo_potencial_log10": "geo_json_75c4e71399a823dffe2f846a8476b431",
    "associacao_centroide_origem": "geo_json_67d9b802714d1e3da62d050a968e8907",
    "centros_celulas_ghsl": "geo_json_aee14040f0c2f2128660a398e92dc7d5",
    "pontos_origem_log10": "geo_json_9bc298f32bbdc5a2ef2b62d0300ff9a1",
    "associacao_no_parada_gtfs": "geo_json_3cc8ab908608d8b620c065edab005ec6",
    "paradas_gtfs": "geo_json_10376b06f296f5937cd53a676e2ac339",
    "limite_territorial": "geo_json_b046269907bb7bfd1e7d3e599c3ae617",
}


def extract_geojson(html: str, variable: str) -> str:
    pattern = rf"{re.escape(variable)}_add\((\{{.*?\}})\);"
    match = re.search(pattern, html, re.DOTALL)
    if not match:
        raise RuntimeError(f"Camada não encontrada: {variable}")
    return match.group(1)


def main() -> None:
    html = SOURCE.read_text(encoding="utf-8")
    npx = shutil.which("npx")
    if not npx:
        raise RuntimeError("npx não encontrado")

    OUTPUT.mkdir(parents=True, exist_ok=True)
    manifest = {
        "source": SOURCE.relative_to(ROOT).as_posix(),
        "quantization": QUANTIZATION,
        "layers": {},
    }

    with tempfile.TemporaryDirectory(prefix="urban_shade_geojson_") as temp:
        temp_dir = Path(temp)
        for name, variable in LAYERS.items():
            geojson_text = extract_geojson(html, variable)
            geojson = json.loads(geojson_text)
            source_path = temp_dir / f"{name}.geojson"
            output_path = OUTPUT / f"{name}.topojson"
            source_path.write_text(geojson_text, encoding="utf-8")

            subprocess.run(
                [
                    npx,
                    "--yes",
                    "--package",
                    "topojson-server@3.0.1",
                    "geo2topo",
                    "-q",
                    str(QUANTIZATION),
                    "-o",
                    str(output_path),
                    f"{name}={source_path}",
                ],
                check=True,
            )

            topojson = json.loads(output_path.read_text(encoding="utf-8"))
            if topojson.get("type") != "Topology" or name not in topojson.get("objects", {}):
                raise RuntimeError(f"TopoJSON inválido: {output_path}")

            source_bytes = len(geojson_text.encode("utf-8"))
            topojson_bytes = output_path.stat().st_size
            manifest["layers"][name] = {
                "features": len(geojson.get("features", [])),
                "geojson_bytes": source_bytes,
                "topojson_bytes": topojson_bytes,
                "reduction_percent": round(100 * (1 - topojson_bytes / source_bytes), 1),
                "file": output_path.relative_to(ROOT).as_posix(),
            }
            print(f"{name}: {source_bytes / 1_048_576:.1f} MB -> {topojson_bytes / 1_048_576:.1f} MB")

    (OUTPUT / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
