import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  PRESETS,
  INTERVALO_TUDO,
  formataIntervalo,
  inicioDoDia,
  intervaloDoPreset,
  mesmoDia,
  montaIntervalo,
  presetDoIntervalo,
} from '../lib/periodo'

const DIAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

function primeiroDoMes(data) {
  return new Date(data.getFullYear(), data.getMonth(), 1)
}

function somaMeses(data, n) {
  return new Date(data.getFullYear(), data.getMonth() + n, 1)
}

// Grade de um mês: as casas antes do dia 1 entram como buracos pra alinhar a
// primeira semana na coluna certa.
function celulasDoMes(base) {
  const ano = base.getFullYear()
  const mes = base.getMonth()
  const diasNoMes = new Date(ano, mes + 1, 0).getDate()
  const buracos = new Array(new Date(ano, mes, 1).getDay()).fill(null)
  const dias = Array.from({ length: diasNoMes }, (_, i) => new Date(ano, mes, i + 1))
  return [...buracos, ...dias]
}

function Mes({ base, inicio, fim, hoje, onEscolhe, onPassaMouse }) {
  const noIntervalo = (dia) => inicio && fim && dia >= inicioDoDia(inicio) && dia <= fim

  return (
    <div className="cal-mes">
      <div className="cal-titulo">
        {base.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
      </div>
      <div className="cal-grade">
        {DIAS_SEMANA.map((d, i) => (
          <span key={`${d}${i}`} className="cal-semana">{d}</span>
        ))}
        {celulasDoMes(base).map((dia, i) =>
          dia === null ? (
            <span key={`vazio-${i}`} />
          ) : (
            <button
              key={dia.getTime()}
              type="button"
              className={[
                'cal-dia',
                noIntervalo(dia) ? 'no-intervalo' : '',
                mesmoDia(dia, inicio) || mesmoDia(dia, fim) ? 'ponta' : '',
                mesmoDia(dia, hoje) ? 'hoje' : '',
              ].join(' ').trim()}
              disabled={dia > hoje}
              onClick={() => onEscolhe(dia)}
              onMouseEnter={() => onPassaMouse(dia)}
            >
              {dia.getDate()}
            </button>
          ),
        )}
      </div>
    </div>
  )
}

export function FiltroPeriodo({ intervalo, onChange }) {
  const [aberto, setAberto] = useState(false)
  const [rascunho, setRascunho] = useState(null) // 1º clique, esperando o 2º
  const [hover, setHover] = useState(null)
  const [mesEsquerda, setMesEsquerda] = useState(() =>
    primeiroDoMes(intervalo.inicio ?? new Date()),
  )
  const caixa = useRef(null)
  const hoje = useMemo(() => new Date(), [])
  const ativo = presetDoIntervalo(intervalo)

  useEffect(() => {
    if (!aberto) return
    const foraDaCaixa = (e) => {
      if (caixa.current && !caixa.current.contains(e.target)) setAberto(false)
    }
    const escape = (e) => e.key === 'Escape' && setAberto(false)
    document.addEventListener('mousedown', foraDaCaixa)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('mousedown', foraDaCaixa)
      document.removeEventListener('keydown', escape)
    }
  }, [aberto])

  function abre() {
    setRascunho(null)
    setHover(null)
    setMesEsquerda(primeiroDoMes(intervalo.inicio ?? hoje))
    setAberto((v) => !v)
  }

  function escolhePreset(dias) {
    onChange(intervaloDoPreset(dias))
    setAberto(false)
  }

  // 1º clique fixa a ponta inicial; o 2º fecha o intervalo e aplica.
  function escolheDia(dia) {
    if (!rascunho) {
      setRascunho(dia)
      setHover(dia)
      return
    }
    onChange(montaIntervalo(rascunho, dia))
    setRascunho(null)
    setAberto(false)
  }

  // enquanto o 2º clique não vem, o intervalo mostrado acompanha o mouse
  const previa = rascunho ? montaIntervalo(rascunho, hover ?? rascunho) : intervalo

  return (
    <div className="filters">
      <div className="range-tabs">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            className={ativo === p.id ? 'active' : ''}
            onClick={() => escolhePreset(p.dias)}
          >
            {p.rotulo}
          </button>
        ))}
      </div>

      <div className="filtro-data" ref={caixa}>
        <button
          className={`date-filter ${aberto || ativo === 'personalizado' ? 'aceso' : ''}`}
          onClick={abre}
        >
          <CalendarDays size={17} />
          {formataIntervalo(intervalo)}
          <ChevronDown size={15} />
        </button>

        {aberto && (
          <div className="calendario">
            <div className="cal-navegacao">
              <button type="button" onClick={() => setMesEsquerda(somaMeses(mesEsquerda, -1))}>
                <ChevronLeft size={16} />
              </button>
              <span>
                {rascunho ? 'Escolha o dia final' : 'Escolha o dia inicial'}
              </span>
              <button
                type="button"
                disabled={somaMeses(mesEsquerda, 1) > primeiroDoMes(hoje)}
                onClick={() => setMesEsquerda(somaMeses(mesEsquerda, 1))}
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="cal-meses" onMouseLeave={() => setHover(rascunho)}>
              {[mesEsquerda, somaMeses(mesEsquerda, 1)].map((base) => (
                <Mes
                  key={base.getTime()}
                  base={base}
                  inicio={previa.inicio}
                  fim={previa.fim}
                  hoje={hoje}
                  onEscolhe={escolheDia}
                  onPassaMouse={setHover}
                />
              ))}
            </div>

            <div className="cal-rodape">
              <button type="button" onClick={() => { onChange(INTERVALO_TUDO); setAberto(false) }}>
                Todo o período
              </button>
              <button type="button" onClick={() => setAberto(false)}>Fechar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
