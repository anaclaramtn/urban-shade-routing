# Células para colar no Colab, DEPOIS de rodar o notebook_final_28-09.ipynb
# até a célula 22 (a que cria `final_edges` com `edge_population`).
# Cada bloco "# %%" é uma célula.

# %% [1] Lista os grafos por horário disponíveis no Drive
import re
from pathlib import Path

PASTA_GRAFOS = Path(CAMINHO_GRAFO).parent
print(f"Pasta: {PASTA_GRAFOS}\n")
print("Todos os arquivos da pasta:")
for p in sorted(PASTA_GRAFOS.iterdir()):
    print(f"  {p.name:40s} {p.stat().st_size / 1e6:8.1f} MB")

PADRAO_HORA = re.compile(r"grafo_(\d+)h\.pkl\.gz$")
GRAFOS_POR_HORA = {
    int(m.group(1)): p
    for p in PASTA_GRAFOS.iterdir()
    if (m := PADRAO_HORA.search(p.name))
}
GRAFOS_POR_HORA = dict(sorted(GRAFOS_POR_HORA.items()))
print(f"\nHorários encontrados: {list(GRAFOS_POR_HORA)}")


# %% [2] Checagem do significado das colunas de sol/sombra (grafo já carregado)
PADRAO_COL_SOL = re.compile(r"^(sun_m|shaded_m|distancia_sol|distancia_sombra)_(\d+)(_pa)?$")

arestas_chk = final_edges.copy()
colunas_sol = [c for c in arestas_chk.columns if PADRAO_COL_SOL.match(c)]
print("Colunas de sol/sombra encontradas:", colunas_sol)
assert colunas_sol, f"Nenhuma coluna de sol no grafo. Colunas: {list(arestas_chk.columns)}"
for c in colunas_sol + ["distancia_metros"]:
    arestas_chk[c] = pd.to_numeric(arestas_chk[c], errors="coerce")

L = arestas_chk["distancia_metros"]
hora_chk = int(PADRAO_COL_SOL.match(colunas_sol[0]).group(2))


def resumo(nome, serie):
    s = serie.dropna()
    print(
        f"  {nome:45s} n={len(s):>7,}  min={s.min():10.3f}  mediana={s.median():10.3f}  "
        f"max={s.max():10.3f}  NaN={serie.isna().sum():,}"
    )


def checar(rotulo, df):
    L = df["distancia_metros"]
    print(f"\n===== {rotulo} ({len(df):,} arestas) =====")
    for suf in ("", "_pa"):
        sun = df.get(f"sun_m_{hora_chk}{suf}")
        sha = df.get(f"shaded_m_{hora_chk}{suf}")
        dsol = df.get(f"distancia_sol_{hora_chk}{suf}")
        dsom = df.get(f"distancia_sombra_{hora_chk}{suf}")
        print(f"\n-- sufixo '{suf or '(nenhum)'}' --")
        for nome, s in [("sun_m", sun), ("shaded_m", sha), ("distancia_sol", dsol), ("distancia_sombra", dsom)]:
            if s is not None:
                resumo(f"{nome}_{hora_chk}{suf}", s)
        if sun is not None and sha is not None:
            dif = (sun + sha) - L
            resumo("(sun + shaded) − distancia_metros", dif)
            print(f"  |sun+shaded − L| < 1% de L em {(dif.abs() <= 0.01 * L).mean():.1%} das arestas")
        if sun is not None:
            print(f"  sun_m < 0: {(sun < 0).sum():,} | sun_m > L(+1 cm): {(sun > L + 0.01).sum():,}")
            resumo("fração ao sol S = sun_m / L", sun / L)
        if sun is not None and dsol is not None:
            print(f"  sun_m == distancia_sol (±1 cm): {((sun - dsol).abs() <= 0.01).mean():.1%}")
            resumo("distancia_sol − sun_m", dsol - sun)
    a, b = df.get(f"sun_m_{hora_chk}"), df.get(f"sun_m_{hora_chk}_pa")
    if a is not None and b is not None:
        print("\n-- comparação sem sufixo × _pa --")
        resumo("sun_m_pa − sun_m", b - a)
        print(f"  iguais (±1 cm): {((a - b).abs() <= 0.01).mean():.1%} | correlação: {a.corr(b):.3f}")
        print(f"  soma sun_m = {a.sum():,.0f} m | soma sun_m_pa = {b.sum():,.0f} m | soma L = {L.sum():,.0f} m")


checar("TODAS as arestas", arestas_chk)
checar("Arestas com fluxo F > 0", arestas_chk[arestas_chk["edge_population"] > 0])

# Geometria: nº de vértices e coerência do comprimento (CRS projetado em metros)
com_fluxo = arestas_chk[arestas_chk["edge_population"] > 0]
n_vertices = com_fluxo.geometry.apply(lambda g: len(g.coords))
print("\n===== Geometria (arestas com F > 0) =====")
print(n_vertices.describe())
print(f"Total de vértices: {n_vertices.sum():,}")
resumo("comprimento_geometria − distancia_metros", com_fluxo.geometry.length - com_fluxo["distancia_metros"])
print("\nExemplos:")
display(com_fluxo[["edge_id", "edge_population", "distancia_metros"] + colunas_sol].head(10))


# %% [3] Exportação: geometria + F + L + metros ao sol em todos os horários
import gc
import gzip
import pickle

COLUNAS_EXPORTAR = ("sun_m", "shaded_m")  # metros ao sol / à sombra, com e sem _pa
ARQUIVO_SAIDA = PASTA_SAIDA / "arestas_arvores.geojson"

base = final_edges.loc[
    final_edges["edge_population"] > 0,
    ["edge_id", "node_u", "node_v", "edge_key", "edge_population", "distancia_metros", "geometry"],
].copy()
base["distancia_metros"] = pd.to_numeric(base["distancia_metros"], errors="coerce")
chaves = list(zip(base["node_u"].astype(int), base["node_v"].astype(int), base["edge_key"].astype(int)))
conjunto_chaves = set(chaves)
print(f"Arestas exportadas (F > 0): {len(base):,}")

for hora, caminho in GRAFOS_POR_HORA.items():
    t0 = time.time()
    if Path(caminho) == Path(CAMINHO_GRAFO):
        G = pedestrian_graph_wgs84
    else:
        with gzip.open(caminho, "rb") as f:
            G = pickle.load(f)
    nomes = [f"{c}_{hora}{suf}" for c in COLUNAS_EXPORTAR for suf in ("", "_pa")]
    valores = {n: {} for n in nomes}
    for u, v, k, d in G.edges(keys=True, data=True):
        chave = (int(u), int(v), int(k))
        if chave in conjunto_chaves:
            for n in nomes:
                if n in d:
                    valores[n][chave] = d[n]
    faltando = [k for k in chaves if k not in valores[nomes[0]]]
    for n in nomes:
        if valores[n]:
            base[n] = pd.to_numeric(pd.Series([valores[n].get(k) for k in chaves], index=base.index), errors="coerce")
    print(
        f"{hora:>2}h: {caminho.name} | colunas: {[n for n in nomes if valores[n]]} | "
        f"arestas sem correspondência: {len(faltando):,} | {time.time() - t0:.0f} s"
    )
    if G is not pedestrian_graph_wgs84:
        del G
    gc.collect()

colunas_num = base.select_dtypes("number").columns.difference(["node_u", "node_v", "edge_key"])
base[colunas_num] = base[colunas_num].round(2)

saida = gpd.GeoDataFrame(base, geometry="geometry", crs=GRAPH_CRS).to_crs("EPSG:4326")
saida.to_file(ARQUIVO_SAIDA, driver="GeoJSON", COORDINATE_PRECISION=7)  # 6 casas (~11 cm) apagava arestas muito curtas
print(f"\nSalvo: {ARQUIVO_SAIDA} ({ARQUIVO_SAIDA.stat().st_size / 1e6:.1f} MB)")
print("Colunas:", list(saida.columns))

# Baixa o arquivo para o seu computador:
from google.colab import files
files.download(str(ARQUIVO_SAIDA))
