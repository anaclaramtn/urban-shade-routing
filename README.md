# Cidade à Sombra — população GHSL nas rotas até paradas de ônibus

## Visão geral

O **Cidade à Sombra** busca produzir evidências espaciais para apoiar o planejamento de deslocamentos urbanos a pé mais confortáveis e acessíveis, com atenção à conexão da população com o transporte coletivo e, nas etapas futuras do projeto, à qualificação desses percursos quanto ao sombreamento.

Este repositório contém, no estado atual, o notebook [`notebook_final_29-09.ipynb`](notebook_final_29-09.ipynb). Ele implementa a etapa de estimativa da **população potencial associada ao uso de cada trecho da rede**, encaminhando cada célula populada do GHSL pela rede de pedestres até o nó que contém a parada de ônibus mais próxima segundo o custo de rede.

> Escopo comprovado pelo notebook: população, rede de pedestres, rotas e paradas GTFS. O notebook ainda não carrega nem calcula dados de sombra; portanto, qualquer análise de sombreamento pertence às próximas etapas do projeto.

## Objetivo específico do notebook

O notebook:

1. recorta o raster populacional GHSL pelo limite territorial de Fortaleza;
2. mantém apenas células com população positiva;
3. representa cada célula pelo seu centroide;
4. associa o centroide ao nó mais próximo da rede de pedestres;
5. calcula, por Dijkstra multi-fonte, a rota de menor custo desse nó até um nó associado a parada GTFS;
6. atribui a população integral da célula a cada aresta distinta usada pela rota;
7. soma, em cada aresta, as contribuições das diferentes células;
8. audita a atribuição e produz visualizações gerais e de diagnóstico.

O resultado principal é `final_edges`, um GeoDataFrame de arestas que contém `edge_population`: um indicador de população potencial associada ao uso do trecho.

## Ambiente e dados utilizados

O notebook foi executado em Google Colab, com montagem do Google Drive em `/content/drive`. Os caminhos precisam ser ajustados em outro ambiente.

| Dado | Caminho/estrutura no notebook | Uso real |
|---|---|---|
| GHSL Population Grid | `CAMINHO_RASTER_GHSL = /content/drive/MyDrive/NCDIA/DATASETS/ghsl_pop.tif` | Raster de população, recortado pelo limite territorial. Na execução registrada: CRS `ESRI:54009`, resolução de 100 × 100 m e NoData `-200`. |
| Rede de pedestres OSM/OSMnx | `CAMINHO_GRAFO = /content/drive/MyDrive/NCDIA/_Datasets/Grafos Fortaleza/pkl.gz/grafo_7h.pkl.gz` | Grafo `MultiDiGraph` previamente serializado em `pickle` compactado. É carregado como `pedestrian_graph_wgs84`, projetado com `ox.project_graph` e usado no roteamento. |
| GTFS — paradas | `CAMINHO_STOPS_GTFS = /content/drive/MyDrive/NCDIA/_Datasets/GTFS/stops.txt` | Usa efetivamente `stop_id`, `stop_name`, `stop_lon`, `stop_lat` e, quando existente, `location_type`. Não usa `routes.txt`, `trips.txt`, `stop_times.txt` ou horários. |
| Limite territorial | `CAMINHO_LIMITE_TERRITORIAL = /content/drive/MyDrive/NCDIA/DATASETS/fortaleza_limite.gpkg` | Uma geometria usada para recortar o raster GHSL. |

Bibliotecas principais: `osmnx`, `networkx`, `geopandas`, `pandas`, `numpy`, `rasterio`, `shapely`, `matplotlib`, `folium`, `branca` e `tqdm`.

Parâmetros configurados no notebook:

- `ATRIBUTO_PESO_ROTA = "distancia_metros"`;
- `POPULACAO_MINIMA_CELULA = 0.0`;
- `RANDOM_SEED = 42`;
- `NUM_CELULAS_VISUALIZAR = 500` no diagnóstico interativo;
- `MARGEM_MAPA_METROS = 250.0`;
- `CELL_ID_CENTRAL = None`, o que seleciona automaticamente uma célula próxima à mediana espacial.

## Pipeline atual

### 1. Preparação da rede

O grafo é carregado em `pedestrian_graph_wgs84` e projetado por OSMnx. Na execução registrada, `GRAPH_CRS` é `EPSG:32724`. O atributo `distancia_metros` é convertido para numérico e regravado nas arestas. O roteamento usa `routing_graph = pedestrian_graph.to_undirected(as_view=True)`.

O notebook verifica explicitamente se `distancia_metros` existe. Portanto, ele não usa automaticamente o atributo OSMnx convencional `length`.

### 2. Recorte e seleção GHSL

O limite territorial é reprojetado para o CRS do raster antes de `rasterio.mask.mask`. As células são classificadas como NoData, zero, negativas ou positivas. Somente valores finitos maiores que `POPULACAO_MINIMA_CELULA` seguem para o processamento; os demais são convertidos em `NaN` na cópia de trabalho `population_raster`.

Para cada célula positiva são armazenados o polígono, a posição no raster, a população original e as coordenadas do centroide. Polígonos e centroides são reprojetados para `GRAPH_CRS` antes das operações de associação espacial.

### 3. Célula GHSL → centroide → nó OSM

O encadeamento implementado é:

`ghsl_population_cells` → `ghsl_cell_centroids` → `nearest_graph_node`

- `ghsl_population_cells` contém o polígono de cada célula e seu valor real em `population`;
- `ghsl_cell_centroids` contém o ponto central da célula no CRS projetado;
- `ox.distance.nearest_nodes` associa cada centroide ao nó mais próximo de `pedestrian_graph`;
- `distance_centroid_to_node_m` registra a distância euclidiana do encaixe, apenas para diagnóstico.

### 4. Parada GTFS → nó da rede

As paradas são filtradas por coordenadas válidas. Quando `location_type` existe, ficam registros vazios ou iguais a `"0"`. Os pontos são construídos em `EPSG:4326`, reprojetados para `GRAPH_CRS` e associados ao nó mais próximo. A distância euclidiana do encaixe é guardada em `distance_stop_to_node_m`.

`bus_stop_nodes` é o conjunto dos nós da rede associados a pelo menos uma parada. `stops_by_node` preserva as listas de IDs, nomes, latitudes e longitudes das paradas por nó.

### 5. Nó OSM de origem → rota → nó da parada → parada GTFS

`nx.multi_source_dijkstra` parte simultaneamente dos nós em `bus_stop_nodes`, usando `distancia_metros` como peso. Para cada nó de origem, o notebook inverte a sequência retornada e obtém uma rota da origem até um nó de parada.

Cada registro em `cell_routes` contém:

- `cell_id` e `population`;
- `origin_graph_node`;
- `destination_graph_node`;
- `network_distance_m`;
- `route_node_sequence`;
- `route_edge_count`;
- `route_status`: `ok`, `origin_equals_destination`, `no_path_to_any_stop` ou `zero_population`.

O destino calculado é **um nó da rede associado a parada**, não necessariamente uma parada GTFS única. Quando várias paradas compartilham esse nó, todas são destinos equivalentes no diagnóstico. A ligação final nó → parada é feita por `bus_stops.nearest_graph_node`.

As arestas de cada sequência de nós são resolvidas por `resolve_edge_on_graph`. Em caso de múltiplas arestas entre o mesmo par de nós, a função escolhe a `key` com menor `distancia_metros` e tolera a orientação invertida.

## Metodologia de atribuição da população às arestas

Para uma célula `c`, com população original `P(c)`, e o conjunto de arestas distintas `R(c)` de sua rota válida, a contribuição é:

```text
contribuição(c, e) = P(c), se e pertence a R(c)
edge_population(e) = soma de P(c) para todas as células c que usam e
```

Uma aresta repetida dentro da mesma rota é deduplicada antes da atribuição. Já as contribuições de células diferentes são acumuladas normalmente.

As estruturas que materializam esse cálculo são:

- `pair_population[(cell_id, edge_key)]`: população integral da célula naquela aresta;
- `pair_destination[(cell_id, edge_key)]`: nó de destino da rota correspondente;
- `cell_route_allocations[cell_id]`: soma atribuída ao longo da rota, igual a `population × número de arestas distintas`;
- `population_by_edge[(u, v, key)]`: soma das populações das células que usam a aresta;
- `contributing_cell_ids`, `contributing_cell_populations` e `contributing_destination_nodes`: rastreabilidade das contribuições;
- `edge_population`: valor agregado escrito na aresta;
- `contributing_cell_count`: quantidade de células contribuintes.

### Princípios metodológicos consolidados

1. A população de uma célula GHSL é atribuída **integralmente a cada aresta** utilizada por sua rota.
2. A população **não é dividida** pelo número de arestas.
3. Se várias células utilizam a mesma aresta, suas populações são somadas.
4. `edge_population` representa **população potencial associada ao uso do trecho**, e não população residente fisicamente naquela aresta.
5. A soma de `edge_population` das arestas não precisa — e em geral não irá — coincidir com a população total GHSL, pois uma mesma população aparece em todas as arestas distintas de sua rota.
6. Os valores originais de população são sempre preservados em `population` e nas estruturas canônicas; transformações de visualização não os substituem.
7. Quando necessária, a escala logarítmica de visualização usa base 10: `log10(x)`.
8. Não usar `log1p(x)`, `log(x + 1)`, `log10(x + 1)` nem qualquer transformação com `+1`.
9. Como `log10(0)` não existe, valores zero são tratados separadamente. O mapa deixa `edge_population_log10` como `NaN` nas arestas zeradas, e os histogramas logarítmicos selecionam somente valores positivos.
10. O logaritmo é usado apenas na visualização; nunca altera a população original nem `edge_population`.
11. Distâncias, centroides e associações à rede são processados no CRS projetado adequado (`GRAPH_CRS`, `EPSG:32724` na execução registrada). `EPSG:4326` é usado na entrada das paradas e na visualização Folium.
12. As visualizações de validação reutilizam `route_node_sequence`, `pair_population` e as arestas já calculadas; não recalculam caminhos alternativos apenas para exibição.

## Principais variáveis e estruturas

| Nome real | Tipo/papel |
|---|---|
| `pedestrian_graph_wgs84` | Grafo carregado do arquivo `grafo_7h.pkl.gz`. |
| `pedestrian_graph` | Grafo projetado, com atributos de população escritos nas arestas. |
| `routing_graph` | Visão não direcionada usada pelo Dijkstra multi-fonte. |
| `graph_nodes`, `graph_edges` | GeoDataFrames iniciais dos nós e arestas projetados. |
| `study_area_boundary` | Limite territorial lido do GeoPackage. |
| `population_raster_raw` | Banda do raster recortado, preservando os valores lidos. |
| `population_raster` | Cópia de trabalho com células não positivas convertidas em `NaN`. |
| `ghsl_population_cells` | GeoDataFrame de polígonos das células positivas; colunas `cell_id`, `raster_row`, `raster_col`, `population`, `centroid_x_raster`, `centroid_y_raster`, `geometry`. |
| `ghsl_cell_centroids` | GeoDataFrame dos centroides; inclui `cell_id`, `population`, `centroid_x`, `centroid_y`, `nearest_graph_node`, `nearest_node_x`, `nearest_node_y`, `distance_centroid_to_node_m`, `geometry`. |
| `bus_stops_raw` | DataFrame original de `stops.txt`. |
| `bus_stops` | GeoDataFrame tratado; inclui `bus_stop_id`, `bus_stop_name`, `bus_stop_longitude`, `bus_stop_latitude`, `nearest_graph_node`, `nearest_node_x`, `nearest_node_y`, `distance_stop_to_node_m`, `geometry`. |
| `bus_stop_nodes` | Nós únicos que possuem ao menos uma parada associada. |
| `stops_by_node` | Agregação das paradas por nó. |
| `distance_to_nearest_stop`, `path_from_stop` | Saídas do Dijkstra multi-fonte. |
| `cell_routes` | DataFrame canônico das rotas por célula. |
| `pair_population` | Dicionário canônico das contribuições por par célula–aresta. |
| `population_by_edge` | Dicionário da população potencial acumulada por `(u, v, key)`. |
| `result_nodes`, `result_edges` | GeoDataFrames extraídos do grafo após a atribuição. |
| `final_edges` | GeoDataFrame canônico para auditoria, estatísticas e mapa principal; contém `node_u`, `node_v`, `edge_key`, `edge_id`, `edge_population`, `contributing_cell_count` e `contributing_cell_ids`. |
| `map_edges` | Cópia usada no mapa estático; adiciona `edge_population_log10` sem alterar `final_edges`. |
| `mapa_diagnostico_rotas` | Mapa Folium que combina células, encaixes, rotas calculadas, nós e paradas reais. |

## Visualizações e validações existentes

### Validações numéricas

- classificação exaustiva das células do recorte em NoData, zero, negativas e positivas;
- contagem de células associadas à rede e distância centroide → nó;
- contagem de paradas, nós de parada e distância parada → nó;
- estados de rota e cobertura dos nós pelo Dijkstra;
- falhas de resolução das arestas do `MultiGraph`;
- garantia, por `assert`, de que cada par célula–aresta recebeu a população original integral;
- garantia de que `SUM edge_population` coincide com a soma esperada `population × arestas distintas da rota`;
- top 10 de arestas e tabela com IDs das células contribuintes;
- casos especiais: origem igual ao destino, rota de uma aresta, ausência de caminho, população zero e arestas compartilhadas;
- verificação explícita de que uma aresta compartilhada contém a soma das contribuições integrais.

### Visualizações

- mapa estático de todas as arestas, com rede zerada em cinza e arestas populadas coloridas por `log10(edge_population)`; salvo como `mapa_populacao_arestas_geral.png`;
- histograma linear dos valores reais positivos; a primeira versão é salva como `histograma_populacao_arestas.png`;
- segundo histograma linear, exibido no notebook;
- histograma com valores reais positivos, bins logarítmicos e eixo X em base 10;
- mapa Folium de diagnóstico para 500 células próximas, contendo polígonos GHSL, centroides, ligação centroide → nó, nós de origem e destino, segmentos das rotas já calculadas, paradas GTFS reais, ligação parada → nó e destaque opcional das arestas compartilhadas;
- salvamento do diagnóstico em HTML preparado, mas comentado na última célula.

## Resultado da execução registrada no notebook

Os números abaixo são resultados gravados nas saídas do notebook e podem mudar quando os dados ou parâmetros forem atualizados.

| Métrica | Valor registrado |
|---|---:|
| Nós / arestas da rede | 88.326 / 384.500 |
| Paradas GTFS / nós únicos com parada | 5.262 / 4.566 |
| Células positivas GHSL | 26.835 |
| População total nas células positivas | 2.789.896,5213 |
| Rotas `ok` | 24.864 |
| Origens já localizadas em nó de parada | 1.971 |
| Células sem caminho | 0 |
| População efetivamente atribuída a rotas com arestas | 2.601.216,8820 |
| Relações únicas célula–aresta | 93.196 |
| Arestas com `edge_population > 0` | 44.834 |
| Arestas usadas por múltiplas células | 17.712 |
| `SUM edge_population` | 8.889.639,5243 |
| Total esperado pelas rotas | 8.889.639,5243 |
| Máximo `edge_population` | 4.556,5612 |
| Falhas na resolução de arestas | 0 |

A diferença entre a população GHSL total e a população efetivamente atribuída às arestas é explicada, nesta execução, pelas 1.971 células cujo nó de origem já é um nó de parada: elas têm rota de zero arestas e somam 188.679,6394 pessoas. A diferença entre `SUM edge_population` e a população GHSL é esperada pela repetição integral da população ao longo de cada rota.

## Estado atual

### IMPLEMENTADO

- carga e conferência básica dos quatro conjuntos de dados usados;
- reprojeções e recorte espacial do GHSL;
- seleção e vetorização das células positivas;
- associações centroide → nó e parada → nó em CRS projetado;
- roteamento multi-fonte pela distância da rede;
- registro das sequências de rota e dos estados por célula;
- atribuição integral, deduplicada por célula–aresta, e agregação entre células;
- auditorias numéricas, tabelas e visualizações estáticas;
- mapa interativo que reutiliza as rotas realmente calculadas.

### EM VALIDAÇÃO

- interpretação de `edge_population` como proxy de uso potencial, inclusive frente a células distantes do nó de encaixe;
- qualidade espacial dos encaixes centroide → nó e parada → nó, especialmente os valores extremos;
- adequação de transformar o grafo em não direcionado para o cenário de deslocamento analisado;
- efeito de escolher a aresta paralela de menor `distancia_metros` em `resolve_edge_on_graph`;
- tratamento conceitual das células em que origem e destino coincidem e, por isso, nenhuma aresta recebe população;
- equivalência de múltiplas paradas GTFS associadas ao mesmo nó;
- inspeção visual das 500 células selecionadas e dos trechos compartilhados.

### PLANEJADO — próximas etapas

As ações abaixo são continuidade recomendada; **não estão implementadas no notebook atual**:

- concluir e registrar a validação espacial e conceitual dos pontos listados acima;
- definir critérios de aceitação para as distâncias de encaixe e investigar outliers;
- exportar de forma persistente `final_edges`, `cell_routes` e a rastreabilidade célula–aresta;
- habilitar, quando necessário, o salvamento do mapa Folium em HTML;
- documentar versão, data e proveniência dos arquivos GHSL, OSM e GTFS;
- integrar indicadores de sombra/conforto térmico às arestas sem sobrescrever `edge_population`;
- combinar demanda potencial e sombra em uma etapa analítica posterior, mantendo separadas as variáveis originais e as derivadas.

## Limitações atuais

- O grafo é carregado de um arquivo pronto; o notebook não contém sua rotina de extração do OSM.
- Apenas `stops.txt` é usado do GTFS; frequência, horários e oferta de transporte não entram no roteamento.
- Cada célula é representada pelo centroide e associada ao nó mais próximo, sem distância máxima de associação.
- O destino é um nó de parada de menor custo na rede, não uma parada individual selecionada por atributos de serviço.
- Células cuja origem já é um nó de parada têm rota de zero arestas.
- O processamento depende da execução sequencial das células e não constitui uma biblioteca ou pipeline de linha de comando.
