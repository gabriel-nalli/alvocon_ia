import { useMemo, useState } from 'react'
import { useDados } from '../lib/useDados'
import {
  funil,
  paradosPorEtapa,
  porTipo,
  porDia,
  filtraPorPeriodo,
  contaEventos,
} from '../lib/metricas'
import BarrasHorizontais from '../components/BarrasHorizontais.jsx'
import GraficoLinha from '../components/GraficoLinha.jsx'

const PERIODOS = [
  { rotulo: '24h', dias: 1 },
  { rotulo: '7 dias', dias: 7 },
  { rotulo: '30 dias', dias: 30 },
  { rotulo: 'Tudo', dias: null },
]

const CORES_FUNIL = ['var(--f1)', 'var(--f2)', 'var(--f3)', 'var(--f4)', 'var(--f5)', 'var(--f6)']
const CORES_TIPO = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--ink-3)']

function Tile({ rotulo, valor, apoio }) {
  return (
    <div className="card tile">
      <div className="rotulo">{rotulo}</div>
      <div className="valor">{valor}</div>
      {apoio && <div className="apoio">{apoio}</div>}
    </div>
  )
}

export default function VisaoGeral() {
  const { leads, mensagens, eventos, carregando, erro } = useDados()
  const [dias, setDias] = useState(30)

  const m = useMemo(() => {
    const leadsPeriodo = filtraPorPeriodo(leads, 'criado_em', dias)
    const qualificadosPeriodo = filtraPorPeriodo(leads, 'qualificado_em', dias)
    const msgsLeadPeriodo = filtraPorPeriodo(
      mensagens.filter((mm) => mm.direcao === 'lead'),
      'criado_em',
      dias,
    )
    const qualificadosEntreNovos = leadsPeriodo.filter((l) => l.status === 'qualificado').length
    return {
      leadsPeriodo,
      totalLeads: leadsPeriodo.length,
      totalQualificados: qualificadosPeriodo.length,
      taxa: leadsPeriodo.length ? Math.round((qualificadosEntreNovos / leadsPeriodo.length) * 100) : 0,
      msgsRecebidas: msgsLeadPeriodo.length,
      funil: funil(leadsPeriodo),
      parados: paradosPorEtapa(leadsPeriodo),
      tipos: porTipo(leadsPeriodo),
      porDia: porDia(leads, dias == null ? 30 : Math.min(Math.max(dias, 7), 30)),
      foraWhitelist: contaEventos(eventos, 'fora_whitelist', dias),
      pausasHumanas: contaEventos(eventos, 'pausa_humana', dias),
      bloqueados: contaEventos(eventos, 'bloqueado_pos_handoff', dias),
    }
  }, [leads, mensagens, eventos, dias])

  if (carregando) return <div className="tela-carregando">Carregando dados…</div>

  return (
    <>
      {erro && (
        <div className="card" style={{ borderColor: 'var(--critico)', marginBottom: 16 }}>
          Erro ao carregar dados: {erro}
        </div>
      )}

      <div className="filtros" role="toolbar" aria-label="Período">
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

      <div className="grid-kpis">
        <Tile rotulo="Leads novos" valor={m.totalLeads} apoio="entraram pela whitelist" />
        <Tile rotulo="Qualificados" valor={m.totalQualificados} apoio="handoff completo pra Isa" />
        <Tile rotulo="Taxa de qualificação" valor={`${m.taxa}%`} apoio="dos leads novos do período" />
        <Tile rotulo="Msgs de clientes" valor={m.msgsRecebidas} apoio="recebidas pela IA" />
      </div>

      <div className="grid-2">
        <div className="card">
          <h2>Funil de qualificação</h2>
          {m.totalLeads === 0 ? (
            <div className="vazio">Nenhum lead no período ainda.</div>
          ) : (
            <BarrasHorizontais
              base={m.funil[0]?.total}
              itens={m.funil.map((f, i) => ({ rotulo: f.rotulo, total: f.total, cor: CORES_FUNIL[i] }))}
            />
          )}
        </div>
        <div className="card">
          <h2>Onde os leads pararam de responder</h2>
          {m.parados.length === 0 ? (
            <div className="vazio">Ninguém parado — todos qualificados ou sem leads no período.</div>
          ) : (
            <BarrasHorizontais
              itens={m.parados.map((p) => ({ rotulo: p.rotulo, total: p.total, cor: 'var(--f2)' }))}
            />
          )}
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h2>Perfil dos leads</h2>
          {m.totalLeads === 0 ? (
            <div className="vazio">Nenhum lead no período ainda.</div>
          ) : (
            <BarrasHorizontais
              base={m.totalLeads}
              itens={m.tipos.map((t, i) => ({ rotulo: t.rotulo, total: t.total, cor: CORES_TIPO[i] }))}
            />
          )}
        </div>
        <div className="card">
          <h2>Leads por dia</h2>
          <GraficoLinha serie={m.porDia} />
        </div>
      </div>

      <div className="grid-kpis">
        <Tile
          rotulo="Msgs fora da whitelist"
          valor={m.foraWhitelist}
          apoio="ignoradas pela IA (outros contatos)"
        />
        <Tile rotulo="Pausas por atendimento humano" valor={m.pausasHumanas} apoio="Isa respondeu manualmente" />
        <Tile rotulo="Bloqueadas pós-handoff" valor={m.bloqueados} apoio="msgs após a qualificação" />
      </div>
    </>
  )
}
