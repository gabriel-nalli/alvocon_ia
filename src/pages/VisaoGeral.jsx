import { useMemo, useState } from 'react'
import { useDados } from '../lib/useDados'
import { funil, paradosPorEtapa, porTipo, serieDeLeads, filtraPorIntervalo } from '../lib/metricas'
import { intervaloDoPreset } from '../lib/periodo'
import { MetricCard } from '../components/MetricCard.jsx'
import { Panel } from '../components/Panel.jsx'
import { FiltroPeriodo } from '../components/FiltroPeriodo.jsx'
import { Funnel, Dropoff, Profiles, LeadsLine } from '../components/Charts.jsx'

const CORES_TIPO = {
  'Cliente final': '#2f80ed',
  'Instalador': '#18b886',
  'Revendedor': '#e59b00',
  'Não informado': '#8a8a8a',
}

export default function VisaoGeral() {
  const { leads, mensagens, carregando, erro } = useDados()
  const [intervalo, setIntervalo] = useState(() => intervaloDoPreset(30))

  const m = useMemo(() => {
    const leadsPeriodo = filtraPorIntervalo(leads, 'criado_em', intervalo)
    const msgsLeadPeriodo = filtraPorIntervalo(
      mensagens.filter((mm) => mm.direcao === 'lead'),
      'criado_em',
      intervalo,
    )
    const totalLeads = leadsPeriodo.length
    const qualificadosEntreNovos = leadsPeriodo.filter((l) => l.status === 'qualificado').length

    const etapas = funil(leadsPeriodo)
    const base = etapas[0]?.total || 0

    return {
      totalLeads,
      totalQualificados: qualificadosEntreNovos,
      taxa: totalLeads ? Math.round((qualificadosEntreNovos / totalLeads) * 100) : 0,
      msgsRecebidas: msgsLeadPeriodo.length,
      funnel: etapas.map((e) => ({
        name: e.rotulo,
        value: e.total,
        pct: base ? `${Math.round((e.total / base) * 100)}%` : '0%',
      })),
      dropoff: paradosPorEtapa(leadsPeriodo).map((p) => ({ name: p.rotulo, value: p.total })),
      profiles: porTipo(leadsPeriodo).map((t) => ({
        name: t.rotulo,
        value: t.total,
        pct: totalLeads ? `${Math.round((t.total / totalLeads) * 100)}%` : '0%',
        color: CORES_TIPO[t.rotulo] ?? '#8a8a8a',
      })),
      leadsPerDay: serieDeLeads(leadsPeriodo, intervalo).pontos.map((d) => ({
        day: d.rotulo,
        value: d.leads,
      })),
    }
  }, [leads, mensagens, intervalo])

  if (carregando) return <div className="tela-carregando">Acessando banco de dados da IA…</div>

  const metricas = [
    { label: 'Leads novos', value: m.totalLeads, helper: 'clicaram no anúncio', icon: 'users' },
    { label: 'Qualificados', value: m.totalQualificados, helper: 'prontos pra Isa atender', icon: 'shield' },
    { label: 'Taxa de qualificação', value: `${m.taxa}%`, helper: 'dos leads novos do período', icon: 'target' },
    { label: 'Msgs de clientes', value: m.msgsRecebidas, helper: 'recebidas pela IA', icon: 'message' },
  ]

  return (
    <>
      {erro && <div className="vazio" style={{ color: '#ff6b6b' }}>Erro ao carregar dados: {erro}</div>}

      <FiltroPeriodo intervalo={intervalo} onChange={setIntervalo} />

      <section className="metrics-grid">
        {metricas.map((item) => <MetricCard key={item.label} {...item} />)}
      </section>

      <section className="grid-two">
        <Panel title="Funil de qualificação">
          {m.totalLeads === 0 ? <div className="vazio">Nenhum dado no período.</div> : <Funnel data={m.funnel} />}
        </Panel>
        <Panel title="Onde os leads pararam de responder">
          {m.dropoff.length === 0 ? <div className="vazio">Todos avançaram sem parar.</div> : <Dropoff data={m.dropoff} />}
        </Panel>
      </section>

      <section className="grid-bottom">
        <Panel title="Perfil dos leads">
          {m.totalLeads === 0 ? <div className="vazio">Nenhum dado.</div> : <Profiles data={m.profiles} />}
        </Panel>
        <Panel title="Leads por dia">
          <LeadsLine data={m.leadsPerDay} />
        </Panel>
      </section>
    </>
  )
}
