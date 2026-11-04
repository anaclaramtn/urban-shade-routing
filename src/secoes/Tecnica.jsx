import PassoAPasso from "../componentes/PassoAPasso.jsx";

// Do Colab ao site. Edite os textos para detalhar o que você realmente faz em cada etapa.
const PASSOS = [
  {
    titulo: "Os dados pesados ficam no Google Drive",
    texto: <p>Os grafos de pedestres (um por horário, com sol e sombra em cada aresta) são grandes demais para o repositório. Ficam no Drive e são abertos pelo Colab.</p>
  },
  {
    titulo: "O Colab calcula e exporta",
    texto: <p>No notebook, rodo o fluxo, a sombra e a otimização. Células de exportação (<code>scripts/colab_exportar_arestas_arvores.py</code>) gravam as arestas com fluxo, comprimento e sol em um GeoJSON, que baixo para <code>notebooks/</code>.</p>
  },
  {
    titulo: "Scripts Python reduzem os arquivos",
    texto: <p>Os scripts <code>build_plantio_topojson.py</code> e <code>convert_map_to_topojson.py</code> convertem o GeoJSON e as camadas do mapa Folium em TopoJSON, que ocupa bem menos espaço, e gravam o resultado em <code>public/topojson/</code>.</p>
  },
  {
    titulo: "O navegador desenha os mapas",
    texto: <p>O site, feito em React com Vite, baixa o TopoJSON só quando o mapa chega perto da tela e o desenha com Leaflet.</p>
  }
];

export default function Tecnica() {
  return (
    <section className="content-section content-section--divided" id="tecnica" aria-labelledby="tecnica-titulo">
      <div className="shell">
        <header className="section-heading section-heading--split">
          <div className="section-heading__body">
            <p className="eyebrow">Bastidores</p>
            <h2 id="tecnica-titulo">Como o site é feito</h2>
          </div>
          <p className="section-heading__intro">
            A parte técnica: como os arquivos do Colab chegam ao repositório, como o site é organizado e como ele vai ao ar.
          </p>
        </header>

        <h3 className="tecnica__subtitulo">Do Colab ao site</h3>
        <PassoAPasso passos={PASSOS} />

        <h3 className="tecnica__subtitulo">Tecnologias</h3>
        <ul className="tecnologias">
          {["React", "Vite", "Leaflet", "TopoJSON", "Python", "Google Colab", "GitHub Actions", "GitHub Pages"].map(t => <li key={t}>{t}</li>)}
        </ul>
      </div>
    </section>
  );
}
