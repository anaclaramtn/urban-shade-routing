import CampoNumero from "./CampoNumero.jsx";
import { HORA } from "../../lib/plantio.js";

const lerReal = t => parseFloat(t);
const lerInteiro = t => parseInt(t, 10);
const laValido = v => v > 0;
const nValido = v => v >= 0;

// Controle deslizante de N em escala logarítmica (0 e 1 a N_MAX), para alcançar
// milhões de árvores sem perder a precisão nos valores pequenos.
const N_MAX = 1_000_000;
const PASSOS_LOG = 1000;
const posicaoDeN = n => n <= 0 ? 0 : Math.min(PASSOS_LOG, Math.round(Math.log10(n) / Math.log10(N_MAX) * PASSOS_LOG));
const nDePosicao = p => p <= 0 ? 0 : Math.round(N_MAX ** (p / PASSOS_LOG));

// Horário (fixo), lₐ e N. O controle deslizante de N usa passo 1 para não
// arredondar o valor digitado; digitar fora da faixa amplia a faixa.
export default function ControlesPlantio({ la, setLa, N, setN, rotuloLa, rotuloN, escalaLog = false }) {
  return (
    <>
      <div className="ctrl"><label>Horário <span>{HORA}h</span></label></div>
      <div className="ctrl">
        <label>
          {rotuloLa}{" "}
          <span>
            <CampoNumero valor={la} aoMudar={setLa} ler={lerReal} valido={laValido} min="0.5" step="0.5" /> m
          </span>
        </label>
        <input type="range" min={Math.min(1, la)} max="15" step="0.5" value={la}
          onChange={e => setLa(+e.target.value)} />
      </div>
      <div className="ctrl">
        <label>
          {rotuloN}{" "}
          <CampoNumero valor={N} aoMudar={setN} ler={lerInteiro} valido={nValido} min="0" step="1" />
        </label>
        {escalaLog
          ? <input type="range" min="0" max={PASSOS_LOG} step="1" value={posicaoDeN(N)}
              onChange={e => setN(nDePosicao(+e.target.value))} />
          : <input type="range" min="0" max={Math.max(10000, N)} step="1" value={N}
              onChange={e => setN(+e.target.value)} />}
      </div>
    </>
  );
}
