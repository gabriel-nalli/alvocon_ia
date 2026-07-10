import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useDados } from '../lib/useDados'
import { normalizaTipo, ETAPA_PARADO } from '../lib/metricas'

function fmtHora(ts) {
  const d = new Date(ts)
  const hoje = new Date()
  const mesmoDia = d.toDateString() === hoje.toDateString()
  if (mesmoDia) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function fmtDataHora(ts) {
  return new Date(ts).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function Conversas() {
  const { leads, mensagens, carregando } = useDados()
  const { telefone } = useParams()
  const navigate = useNavigate()
  const [busca, setBusca] = useState('')

  const lista = useMemo(() => {
    const porTelefone = new Map()
    for (const lead of leads) porTelefone.set(lead.telefone, { ...lead })
    // telefones que só têm mensagem (lead ainda não registrado na tabela)
    for (const msg of mensagens) {
      if (!porTelefone.has(msg.telefone)) {
        porTelefone.set(msg.telefone, { telefone: msg.telefone, status: 'em_qualificacao', etapa_atual: 'conversando' })
      }
    }
    for (const msg of mensagens) {
      const item = porTelefone.get(msg.telefone)
      if (!item.ultimaMsg || msg.criado_em > item.ultimaMsg.criado_em) item.ultimaMsg = msg
    }
    let itens = [...porTelefone.values()].sort((a, b) => {
      const ta = a.ultimaMsg?.criado_em ?? a.criado_em ?? ''
      const tb = b.ultimaMsg?.criado_em ?? b.criado_em ?? ''
      return tb.localeCompare(ta)
    })
    const q = busca.trim().toLowerCase()
    if (q) {
      itens = itens.filter((l) =>
        [l.nome, l.nome_perfil, l.telefone, l.cidade]
          .filter(Boolean)
          .some((campo) => String(campo).toLowerCase().includes(q)),
      )
    }
    return itens
  }, [leads, mensagens, busca])

  const selecionado = useMemo(
    () => lista.find((l) => l.telefone === telefone) ?? null,
    [lista, telefone],
  )
  const msgsDoLead = useMemo(
    () => mensagens.filter((m) => m.telefone === telefone),
    [mensagens, telefone],
  )

  if (carregando) return <div className="tela-carregando">Carregando conversas…</div>

  return (
    <div className={`conversas ${telefone ? 'vendo-chat' : ''}`}>
      <div className="card lista-leads">
        <input
          className="busca"
          placeholder="Buscar por nome, telefone ou cidade…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        {lista.length === 0 && <div className="vazio">Nenhum lead ainda.</div>}
        {lista.map((lead) => (
          <button
            key={lead.telefone}
            className={`lead-item ${lead.telefone === telefone ? 'ativo' : ''}`}
            onClick={() => navigate(`/conversas/${lead.telefone}`)}
          >
            <div className="topo">
              <span className="nome">{lead.nome || lead.nome_perfil || lead.telefone}</span>
              {lead.ultimaMsg && <span className="hora">{fmtHora(lead.ultimaMsg.criado_em)}</span>}
            </div>
            <div className="sub">
              {lead.status === 'qualificado' ? (
                <span className="badge qualificado">✓ Qualificado</span>
              ) : (
                <span className="badge">{ETAPA_PARADO[lead.etapa_atual] ?? 'Em conversa'}</span>
              )}
              {lead.cidade && <span>{lead.cidade}</span>}
            </div>
          </button>
        ))}
      </div>

      <div className="card chat">
        {!selecionado ? (
          <div className="vazio" style={{ padding: 24 }}>
            Selecione um lead pra ver a conversa entre o cliente e a IA.
          </div>
        ) : (
          <>
            <div className="chat-cabecalho">
              <button className="voltar-lista" onClick={() => navigate('/conversas')}>
                ← Lista
              </button>
              <div className="nome">
                {selecionado.nome || selecionado.nome_perfil || selecionado.telefone}
              </div>
              <div className="ficha">
                <span>📱 {selecionado.telefone}</span>
                {selecionado.cidade && <span>📍 {selecionado.cidade}</span>}
                <span>👤 {normalizaTipo(selecionado.tipo)}</span>
                {selecionado.metragem && <span>📏 {selecionado.metragem}</span>}
                {selecionado.status === 'qualificado' ? (
                  <span className="badge qualificado">✓ Qualificado</span>
                ) : (
                  <span className="badge">{ETAPA_PARADO[selecionado.etapa_atual] ?? 'Em conversa'}</span>
                )}
              </div>
            </div>
            <div className="chat-msgs">
              {msgsDoLead.length === 0 && (
                <div className="vazio">Nenhuma mensagem registrada pra esse lead ainda.</div>
              )}
              {msgsDoLead.map((msg) => (
                <div key={msg.id} className={`bolha ${msg.direcao === 'ia' ? 'ia' : 'lead'}`}>
                  {msg.texto}
                  <span className="hora">
                    {msg.direcao === 'ia' ? 'Isabela · ' : 'Cliente · '}
                    {fmtDataHora(msg.criado_em)}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
