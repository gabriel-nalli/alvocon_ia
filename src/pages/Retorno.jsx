import { useMemo, useState } from 'react'
import { TriangleAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  useRetorno,
  salvaInvestimento,
  agregaMes,
  derivados,
  totaliza,
  rotuloSemana,
  dinheiro,
  numero,
} from '../lib/retorno'

// Abaixo disso, uma venda a mais ou a menos vira "o Meta melhorou 300%".
// Semana magra é ruído, não tendência.
const AMOSTRA_MINIMA = 10

function Kpi({ rotulo, valor, ajuda, tom }) {
  return (
    <div className="card kpi">
      <span className="kpi-rotulo">{rotulo}</span>
      <strong className={`kpi-valor ${tom ?? ''}`}>{valor}</strong>
      <span className="kpi-ajuda">{ajuda}</span>
    </div>
  )
}

function CelulaRoi({ roi }) {
  if (roi == null) return <td className="num">—</td>
  const tom = roi >= 0 ? 'bom' : roi <= -80 ? 'ruim' : 'atencao'
  return <td className={`num roi ${tom}`}>{numero(roi, 0)}%</td>
}

export default function Retorno() {
  const { semanas, carregando, erro } = useRetorno()
  const [agrupamento, setAgrupamento] = useState('semana')
  const [salvando, setSalvando] = useState(null)
  const [falha, setFalha] = useState(null)

  const linhas = useMemo(
    () => (agrupamento === 'mes' ? agregaMes(semanas) : semanas.map(derivados)),
    [semanas, agrupamento],
  )
  const total = useMemo(() => totaliza(semanas), [semanas])

  // semanas que custaram dinheiro e trouxeram quase nada
  const desperdicio = useMemo(
    () => semanas.filter((s) => Number(s.investimento) > 0 && s.leads < 5),
    [semanas],
  )

  async function mudaInvestimento(semana, valor) {
    setSalvando(semana)
    setFalha(null)
    try {
      await salvaInvestimento(semana, valor)
    } catch (e) {
      setFalha(e.message)
    } finally {
      setSalvando(null)
    }
  }

  if (carregando) return <div className="tela-carregando">Calculando o retorno…</div>

  return (
    <>
      <div className="filters">
        <div>
          <h1 className="titulo-pagina">Retorno do Meta</h1>
          <p className="subtitulo-pagina">
            Cada semana conta os leads que <strong>chegaram</strong> nela, mesmo que a venda saia
            meses depois. É a verba daquela semana que pagou por esse lead.
          </p>
        </div>
        <div className="alternador">
          <button
            className={agrupamento === 'semana' ? 'active' : ''}
            onClick={() => setAgrupamento('semana')}
          >
            Semana
          </button>
          <button
            className={agrupamento === 'mes' ? 'active' : ''}
            onClick={() => setAgrupamento('mes')}
          >
            Mês
          </button>
        </div>
      </div>

      {(erro || falha) && <div className="aviso-erro">{erro || falha}</div>}

      <section className="metrics-grid">
        <Kpi
          rotulo="Investido"
          valor={dinheiro(total.investimento)}
          ajuda={`${semanas.length} semanas`}
        />
        <Kpi
          rotulo="Faturado"
          valor={dinheiro(total.faturamento)}
          ajuda={`${total.vendas} vendas fechadas`}
          tom={total.faturamento > 0 ? 'bom' : ''}
        />
        <Kpi
          rotulo="ROI"
          valor={total.roi_pct == null ? '—' : `${numero(total.roi_pct, 0)}%`}
          ajuda="faturado sobre investido"
          tom={total.roi_pct > 0 ? 'bom' : 'ruim'}
        />
        <Kpi
          rotulo="Em aberto"
          valor={dinheiro(total.em_aberto)}
          ajuda="orçamento que ainda pode fechar"
        />
      </section>

      {total.vendas === 0 && (
        <div className="card aviso-neutro">
          <TriangleAlert size={17} />
          <span>
            Nenhuma venda marcada ainda, então o ROI aparece como −100%. Vá em{' '}
            <Link to="/leads">Leads</Link>, ache o cliente pelo número e marque a venda com o
            valor — o número aqui se ajusta sozinho.
          </span>
        </div>
      )}

      {total.vendas > 0 && total.faturamento === 0 && (
        <div className="card aviso-alerta">
          <TriangleAlert size={17} />
          <div>
            <strong>
              {total.vendas} venda{total.vendas > 1 ? 's' : ''} marcada
              {total.vendas > 1 ? 's' : ''} sem valor
            </strong>
            <p>
              Por isso o ROI continua em −100%: o faturamento está zerado. Abra cada uma em{' '}
              <Link to="/leads">Leads</Link> e preencha o valor da venda — daqui pra frente o
              popup pede isso na hora de mover o card.
            </p>
          </div>
        </div>
      )}

      {desperdicio.length > 0 && (
        <div className="card aviso-alerta">
          <TriangleAlert size={17} />
          <div>
            <strong>
              {desperdicio.length} semana{desperdicio.length > 1 ? 's' : ''} com verba e quase
              nenhum lead
            </strong>
            <p>
              {desperdicio.map((s) => rotuloSemana(s.semana)).join(' · ')} — somam{' '}
              {dinheiro(desperdicio.reduce((t, s) => t + Number(s.investimento), 0))} para{' '}
              {desperdicio.reduce((t, s) => t + s.leads, 0)} leads. Se a verba realmente saiu
              nessas semanas, vale checar o que aconteceu com o anúncio. Se não saiu, zere o
              investimento na tabela abaixo.
            </p>
          </div>
        </div>
      )}

      <div className="card bloco">
        <h2>{agrupamento === 'semana' ? 'Semana a semana' : 'Mês a mês'}</h2>
        <div className="tabela-rolagem">
          <table className="tabela-retorno">
            <thead>
              <tr>
                <th>{agrupamento === 'semana' ? 'Semana' : 'Mês'}</th>
                <th className="num">Investido</th>
                <th className="num">Leads</th>
                <th className="num">Qualif.</th>
                <th className="num">Orç.</th>
                <th className="num">Vendas</th>
                <th className="num">Faturado</th>
                <th className="num">Custo/lead</th>
                <th className="num">CAC</th>
                <th className="num">Ticket</th>
                <th className="num">ROI</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => {
                const chave = l.semana ?? l.chave
                const magra = l.leads > 0 && l.leads < AMOSTRA_MINIMA
                return (
                  <tr key={chave} className={magra ? 'amostra-magra' : ''}>
                    <td className="periodo">
                      {l.semana ? rotuloSemana(l.semana) : l.rotulo}
                      {magra && (
                        <span className="tag-ruido" title="Poucos leads: número instável">
                          amostra pequena
                        </span>
                      )}
                    </td>
                    <td className="num">
                      {l.semana ? (
                        <input
                          className="campo-inline"
                          type="number"
                          min="0"
                          step="10"
                          defaultValue={l.investimento}
                          disabled={salvando === l.semana}
                          onBlur={(e) => {
                            if (Number(e.target.value) !== Number(l.investimento)) {
                              mudaInvestimento(l.semana, e.target.value)
                            }
                          }}
                        />
                      ) : (
                        dinheiro(l.investimento)
                      )}
                    </td>
                    <td className="num">{l.leads}</td>
                    <td className="num">{l.qualificados}</td>
                    <td className="num">{l.orcamentos}</td>
                    <td className="num forte">{l.vendas}</td>
                    <td className="num">{dinheiro(l.faturamento)}</td>
                    <td className="num">{dinheiro(l.custo_por_lead)}</td>
                    <td className="num">{dinheiro(l.cac)}</td>
                    <td className="num">{dinheiro(l.ticket_medio)}</td>
                    <CelulaRoi roi={l.roi_pct} />
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr>
                <td className="periodo">Total</td>
                <td className="num">{dinheiro(total.investimento)}</td>
                <td className="num">{total.leads}</td>
                <td className="num">{total.qualificados}</td>
                <td className="num">{total.orcamentos}</td>
                <td className="num forte">{total.vendas}</td>
                <td className="num">{dinheiro(total.faturamento)}</td>
                <td className="num">{dinheiro(total.custo_por_lead)}</td>
                <td className="num">{dinheiro(total.cac)}</td>
                <td className="num">{dinheiro(total.ticket_medio)}</td>
                <CelulaRoi roi={total.roi_pct} />
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="dica">
          O investimento é editável: clique no valor e corrija a semana em que a verba foi
          diferente de R$&nbsp;250 ou não saiu.
        </p>
      </div>
    </>
  )
}
