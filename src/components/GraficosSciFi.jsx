import { useEffect, useRef, useState } from 'react'
import { Icons } from '../Icons.jsx'

// ---------- Funil (barras centralizadas azul neon) ----------
export function FunilVis({ itens }) {
  const max = Math.max(1, ...itens.map((i) => i.total))
  return (
    <div>
      {itens.map((item) => {
        const pctReal = item.total / max
        const larguraVisual = Math.max(10, pctReal * 100)
        return (
          <div className="funil-row" key={item.rotulo}>
            <div className="funil-label">{item.rotulo}</div>
            <div className="funil-center">
              <div className="funil-bar" style={{ width: `${larguraVisual}%` }} />
            </div>
            <div className="funil-value">
              {item.total} <span className="pct">• {Math.round(pctReal * 100)}%</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ---------- Barras horizontais azuis (onde pararam) ----------
export function BarrasHorizontaisBlue({ itens }) {
  const max = Math.max(1, ...itens.map((i) => i.total))
  return (
    <div>
      {itens.map((item) => {
        const larguraPct = (item.total / max) * 100
        return (
          <div className="hbar-row" key={item.rotulo}>
            <div className="hbar-label">{item.rotulo}</div>
            <div className="hbar-track">
              <div className="hbar-fill" style={{ width: `${larguraPct}%` }} />
            </div>
            <div className="hbar-value">{item.total}</div>
          </div>
        )
      })}
    </div>
  )
}

// ---------- Donut (perfil dos leads) ----------
export function GraficoDonut({ itens, total }) {
  const raio = 40
  const circunferencia = 2 * Math.PI * raio
  let offsetAcumulado = 0

  const mapCores = {
    'Cliente final': 'var(--grafico-azul-1)',
    'Instalador': 'var(--grafico-verde)',
    'Revendedor': 'var(--grafico-amarelo)',
    'Não informado': 'var(--grafico-cinza)',
  }

  const fatias = itens.map((item) => {
    const proporcao = total === 0 ? 0 : item.total / total
    const dashArray = `${proporcao * circunferencia} ${circunferencia}`
    const dashOffset = -offsetAcumulado
    offsetAcumulado += proporcao * circunferencia
    return { ...item, cor: mapCores[item.rotulo] || '#888', dashArray, dashOffset, pct: Math.round(proporcao * 100) }
  })

  return (
    <div className="donut-layout">
      <div className="donut-svg-container">
        <svg viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={raio} fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="16" />
          {total > 0 &&
            fatias.map((f, i) => (
              <circle
                key={i}
                cx="50"
                cy="50"
                r={raio}
                fill="transparent"
                stroke={f.cor}
                strokeWidth="16"
                strokeDasharray={f.dashArray}
                strokeDashoffset={f.dashOffset}
                style={{ transition: 'stroke-dasharray 0.5s' }}
              />
            ))}
        </svg>
        <div className="donut-center-icon">
          <Icons.Users />
        </div>
      </div>

      <div className="donut-legend">
        {fatias.map((f) => (
          <div className="legend-item" key={f.rotulo}>
            <div className="legend-color" style={{ background: f.cor }} />
            <div style={{ width: 100 }}>{f.rotulo}</div>
            <div className="legend-bar-track">
              <div className="legend-bar-fill" style={{ width: `${f.pct}%`, background: f.cor }} />
            </div>
            <div className="legend-val">
              {f.total} <span>• {f.pct}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------- Linha neon (leads por dia) ----------
export function GraficoLinhaNeon({ serie }) {
  const caixaRef = useRef(null)
  const [largura, setLargura] = useState(600)

  useEffect(() => {
    const el = caixaRef.current
    if (!el) return
    const ro = new ResizeObserver((entradas) => setLargura(Math.max(280, entradas[0].contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const ALTURA = 180
  const PAD = { esq: 20, dir: 20, topo: 10, baixo: 24 }
  const n = serie.length
  const maxValor = Math.max(3, ...serie.map((d) => d.leads))
  const areaL = largura - PAD.esq - PAD.dir
  const areaA = ALTURA - PAD.topo - PAD.baixo

  const x = (i) => PAD.esq + (n <= 1 ? areaL / 2 : (i / (n - 1)) * areaL)
  const y = (v) => PAD.topo + areaA - (v / maxValor) * areaA

  const caminhoLinha = serie.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(d.leads).toFixed(1)}`).join(' ')
  const caminhoArea = n > 0 ? `${caminhoLinha} L${x(n - 1)},${PAD.topo + areaA} L${x(0)},${PAD.topo + areaA} Z` : ''

  const ticksY = [0, Math.ceil(maxValor / 2), maxValor]

  return (
    <div className="line-chart-container" ref={caixaRef}>
      <svg className="line-chart-svg" viewBox={`0 0 ${largura} ${ALTURA}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="neon-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(42, 120, 214, 0.4)" />
            <stop offset="100%" stopColor="rgba(42, 120, 214, 0)" />
          </linearGradient>
        </defs>

        {ticksY.map((t) => (
          <g key={t}>
            <line className="line-grid" x1={PAD.esq} x2={largura - PAD.dir} y1={y(t)} y2={y(t)} />
            <text className="line-text" x={PAD.esq - 6} y={y(t) + 4} textAnchor="end">{t}</text>
          </g>
        ))}

        {serie.map((d, i) =>
          i % Math.ceil(n / 8) === 0 || i === n - 1 ? (
            <text className="line-text" key={i} x={x(i)} y={ALTURA - 4} textAnchor="middle">{d.rotulo}</text>
          ) : null,
        )}

        {serie.length > 0 && (
          <>
            <path d={caminhoArea} className="line-area" />
            <path d={caminhoLinha} className="line-path" />
            {serie.map((d, i) => (
              <circle key={i} cx={x(i)} cy={y(d.leads)} r="3" className="line-dot" />
            ))}
          </>
        )}
      </svg>
    </div>
  )
}
