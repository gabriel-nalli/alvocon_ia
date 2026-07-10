import { useEffect, useRef, useState } from 'react'

// Gráfico de linha (leads x qualificados por dia) com crosshair + tooltip
// e visão em tabela para acessibilidade.
const ALTURA = 220
const PAD = { esq: 34, dir: 14, topo: 14, baixo: 26 }

const SERIES = [
  { chave: 'leads', rotulo: 'Leads novos', cor: 'var(--s1)' },
  { chave: 'qualificados', rotulo: 'Qualificados', cor: 'var(--s2)' },
]

export default function GraficoLinha({ serie }) {
  const caixaRef = useRef(null)
  const [largura, setLargura] = useState(600)
  const [foco, setFoco] = useState(null) // índice do dia sob o mouse

  useEffect(() => {
    const el = caixaRef.current
    if (!el) return
    const ro = new ResizeObserver((entradas) => {
      setLargura(Math.max(280, entradas[0].contentRect.width))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const n = serie.length
  const maxValor = Math.max(3, ...serie.flatMap((d) => [d.leads, d.qualificados]))
  const areaL = largura - PAD.esq - PAD.dir
  const areaA = ALTURA - PAD.topo - PAD.baixo
  const x = (i) => PAD.esq + (n <= 1 ? areaL / 2 : (i / (n - 1)) * areaL)
  const y = (v) => PAD.topo + areaA - (v / maxValor) * areaA

  const caminho = (chave) => serie.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(d[chave]).toFixed(1)}`).join(' ')

  const ticksY = [0, Math.ceil(maxValor / 2), maxValor]

  function aoMover(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - rect.left
    const i = Math.round(((px - PAD.esq) / Math.max(1, areaL)) * (n - 1))
    setFoco(Math.max(0, Math.min(n - 1, i)))
  }

  return (
    <div className="grafico-linha" ref={caixaRef}>
      <svg
        viewBox={`0 0 ${largura} ${ALTURA}`}
        width={largura}
        height={ALTURA}
        onMouseMove={aoMover}
        onMouseLeave={() => setFoco(null)}
        role="img"
        aria-label="Leads novos e qualificados por dia"
      >
        {ticksY.map((t) => (
          <g key={t}>
            <line x1={PAD.esq} x2={largura - PAD.dir} y1={y(t)} y2={y(t)} stroke="var(--grade)" strokeWidth="1" />
            <text x={PAD.esq - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--ink-3)">
              {t}
            </text>
          </g>
        ))}
        <line x1={PAD.esq} x2={largura - PAD.dir} y1={y(0)} y2={y(0)} stroke="var(--eixo)" strokeWidth="1" />
        {serie.map((d, i) =>
          i % Math.ceil(n / 7) === 0 || i === n - 1 ? (
            <text key={i} x={x(i)} y={ALTURA - 8} textAnchor="middle" fontSize="11" fill="var(--ink-3)">
              {d.rotulo}
            </text>
          ) : null,
        )}
        {foco != null && (
          <line x1={x(foco)} x2={x(foco)} y1={PAD.topo} y2={PAD.topo + areaA} stroke="var(--eixo)" strokeWidth="1" />
        )}
        {SERIES.map((s) => (
          <path key={s.chave} d={caminho(s.chave)} fill="none" stroke={s.cor} strokeWidth="2" strokeLinejoin="round" />
        ))}
        {foco != null &&
          SERIES.map((s) => (
            <circle
              key={s.chave}
              cx={x(foco)}
              cy={y(serie[foco][s.chave])}
              r="4"
              fill={s.cor}
              stroke="var(--superficie)"
              strokeWidth="2"
            />
          ))}
      </svg>
      {foco != null && serie[foco] && (
        <div className="tooltip" style={{ left: x(foco), top: PAD.topo + 4 }}>
          <div className="titulo">{serie[foco].rotulo}</div>
          {SERIES.map((s) => (
            <div className="linha" key={s.chave}>
              <span className="chip" style={{ background: s.cor }} />
              {s.rotulo}: <strong>{serie[foco][s.chave]}</strong>
            </div>
          ))}
        </div>
      )}
      <div className="legenda">
        {SERIES.map((s) => (
          <span className="item" key={s.chave}>
            <span className="chip" style={{ background: s.cor }} />
            {s.rotulo}
          </span>
        ))}
      </div>
      <details className="tabela-dados">
        <summary>Ver dados em tabela</summary>
        <table>
          <thead>
            <tr>
              <th>Dia</th>
              <th>Leads novos</th>
              <th>Qualificados</th>
            </tr>
          </thead>
          <tbody>
            {serie.map((d) => (
              <tr key={d.rotulo}>
                <td>{d.rotulo}</td>
                <td>{d.leads}</td>
                <td>{d.qualificados}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}
