import { useMemo, useState } from 'react'
import { useDados } from '../lib/useDados'
import { funil, paradosPorEtapa, porTipo, porDia, filtraPorPeriodo } from '../lib/metricas'
import { Icons } from '../Icons.jsx'
import { CardSciFi, KpiTile } from '../components/SciFi.jsx'
import { FunilVis, BarrasHorizontaisBlue, GraficoDonut, GraficoLinhaNeon } from '../components/GraficosSciFi.jsx'

const PERIODOS = [
  { rotulo: '24h', dias: 1 },
  { rotulo: '7 dias', dias: 7 },
  { rotulo: '30 dias', dias: 30 },
  { rotulo: 'Tudo', dias: null },
]

function textoPeriodo(dias) {
  if (dias == null) return 'Todo o período'
  const f = (d) => d.toLocaleDateString('pt-BR')
  const fim = new Date()
  const inicio = new Date(Date.now() - dias * 24 * 60 * 60 * 1000)
  return `${f(inicio)} - ${f(fim)}`
}

export default function VisaoGeral() {
  const { leads, mensagens, carregando, erro } = useDados()
  const [dias, setDias] = useState(30)

  const m = useMemo(() => {
    const leadsPeriodo = filtraPorPeriodo(leads, 'criado_em', dias)
    const msgsLeadPeriodo = filtraPorPeriodo(
      mensagens.filter((mm) => mm.direcao === 'lead'),
      'criado_em',
      dias,
    )
    const qualificadosEntreNovos = leadsPeriodo.filter((l) => l.status === 'qualificado').length

    return {
      totalLeads: leadsPeriodo.length,
      totalQualificados: qualificadosEntreNovos,
      taxa: leadsPeriodo.length ? Math.round((qualificadosEntreNovos / leadsPeriodo.length) * 100) : 0,
      msgsRecebidas: msgsLeadPeriodo.length,
      funil: funil(leadsPeriodo),
      parados: paradosPorEtapa(leadsPeriodo),
      tipos: porTipo(leadsPeriodo),
      porDia: porDia(leads, dias == null ? 30 : Math.min(Math.max(dias, 7), 30)),
    }
  }, [leads, mensagens, dias])

  if (carregando) {
    return <div style={{ color: 'var(--texto-secundario)', padding: 40 }}>Acessando banco de dados da IA…</div>
  }

  return (
    <div className="dashboard-container">
      {erro && (
        <div className="vazio" style={{ color: '#ff6b6b' }}>Erro ao carregar dados: {erro}</div>
      )}

      {/* Filtros de tempo */}
      <div className="filters-row">
        <div className="time-filters">
          {PERIODOS.map((p) => (
            <button
              key={p.rotulo}
              className={dias === p.dias ? 'ativo' : ''}
              onClick={() => setDias(p.dias)}
            >
              {p.rotulo}
            </button>
          ))}
        </div>
        <div className="date-picker-mock">
          <Icons.Calendar /> {textoPeriodo(dias)}
        </div>
      </div>

      {/* Grid Superior - 4 KPIs */}
      <div className="grid-kpis">
        <KpiTile titulo="Leads novos" valor={m.totalLeads} subtitulo="entraram pela whitelist" IconeComponent={Icons.Users} />
        <KpiTile titulo="Qualificados" valor={m.totalQualificados} subtitulo="handoff completo pra Isa" IconeComponent={Icons.Shield} />
        <KpiTile titulo="Taxa de qualificação" valor={`${m.taxa}%`} subtitulo="dos leads novos do período" IconeComponent={Icons.Target} />
        <KpiTile titulo="Msgs de clientes" valor={m.msgsRecebidas} subtitulo="recebidas pela IA" IconeComponent={Icons.Chat} />
      </div>

      {/* Grid Meio - Funil e Barras */}
      <div className="grid-main">
        <CardSciFi titulo="Funil de qualificação">
          {m.totalLeads === 0 ? <div className="vazio">Nenhum dado no período.</div> : <FunilVis itens={m.funil} />}
        </CardSciFi>

        <CardSciFi titulo="Onde os leads pararam de responder">
          {m.parados.length === 0 ? <div className="vazio">Todos avançaram sem parar.</div> : <BarrasHorizontaisBlue itens={m.parados} />}
        </CardSciFi>
      </div>

      {/* Grid Inferior - Donut e Linha */}
      <div className="grid-main">
        <CardSciFi titulo="Perfil dos leads">
          {m.totalLeads === 0 ? <div className="vazio">Nenhum dado.</div> : <GraficoDonut itens={m.tipos} total={m.totalLeads} />}
        </CardSciFi>

        <CardSciFi titulo="Leads por dia">
          <GraficoLinhaNeon serie={m.porDia} />
        </CardSciFi>
      </div>
    </div>
  )
}
