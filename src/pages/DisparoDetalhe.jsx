import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Play, Pause, Ban, RefreshCw } from 'lucide-react'
import {
  useCampanha,
  contaPorStatus,
  tempoRestante,
  iniciaCampanha,
  pausaCampanha,
  cancelaCampanha,
  ROTULO_STATUS,
  ROTULO_CONTATO,
} from '../lib/disparos'
import { supabase } from '../supabase'

const FILTROS = [
  { id: 'todos', rotulo: 'Todos' },
  { id: 'pendente', rotulo: 'Na fila' },
  { id: 'enviado', rotulo: 'Entregues' },
  { id: 'erro', rotulo: 'Falharam' },
]

export default function DisparoDetalhe() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { campanha, contatos, carregando, erro } = useCampanha(id)
  const [filtro, setFiltro] = useState('todos')
  const [ocupado, setOcupado] = useState(false)
  const [falha, setFalha] = useState(null)

  const contagem = useMemo(() => contaPorStatus(contatos), [contatos])
  const lista = useMemo(
    () => (filtro === 'todos' ? contatos : contatos.filter((c) => c.status === filtro)),
    [contatos, filtro],
  )

  async function acao(fn, confirmacao) {
    if (confirmacao && !window.confirm(confirmacao)) return
    setOcupado(true)
    setFalha(null)
    try {
      await fn(id)
    } catch (e) {
      setFalha(e.message)
    } finally {
      setOcupado(false)
    }
  }

  // Devolve os que falharam para a fila, pra tentar de novo sem recriar a
  // campanha inteira nem reenviar pra quem já recebeu.
  async function reenviaFalhas() {
    setOcupado(true)
    setFalha(null)
    try {
      const { error } = await supabase
        .from('disparo_contatos')
        .update({ status: 'pendente', erro: null })
        .eq('campanha_id', id)
        .eq('status', 'erro')
      if (error) throw new Error(error.message)
    } catch (e) {
      setFalha(e.message)
    } finally {
      setOcupado(false)
    }
  }

  if (carregando) return <div className="tela-carregando">Carregando disparo…</div>
  if (!campanha) return <div className="aviso-erro">Disparo não encontrado.</div>

  const rodando = campanha.status === 'rodando'
  const pct = contagem.total
    ? Math.round(((contagem.enviado + contagem.erro) / contagem.total) * 100)
    : 0

  return (
    <>
      <div className="filters">
        <div>
          <button className="voltar-lista" onClick={() => navigate('/disparos')}>
            <ArrowLeft size={15} /> Disparos
          </button>
          <h1 className="titulo-pagina">
            {campanha.nome} <span className={`badge-status ${campanha.status}`}>{ROTULO_STATUS[campanha.status]}</span>
          </h1>
        </div>
        <div className="campanha-acoes">
          {(campanha.status === 'rascunho' || campanha.status === 'pausado') && (
            <button disabled={ocupado} onClick={() => acao(iniciaCampanha)}>
              <Play size={16} /> {campanha.status === 'pausado' ? 'Retomar' : 'Iniciar'}
            </button>
          )}
          {rodando && (
            <button disabled={ocupado} onClick={() => acao(pausaCampanha)}>
              <Pause size={16} /> Pausar
            </button>
          )}
          {contagem.erro > 0 && !rodando && (
            <button disabled={ocupado} onClick={reenviaFalhas}>
              <RefreshCw size={16} /> Tentar de novo os {contagem.erro} que falharam
            </button>
          )}
          {['rascunho', 'rodando', 'pausado'].includes(campanha.status) && (
            <button
              className="perigo"
              disabled={ocupado}
              onClick={() =>
                acao(
                  cancelaCampanha,
                  `Cancelar? Os ${contagem.pendente} contatos da fila ficam de fora.`,
                )
              }
            >
              <Ban size={16} /> Cancelar
            </button>
          )}
        </div>
      </div>

      {(erro || falha || campanha.erro) && (
        <div className="aviso-erro">{erro || falha || campanha.erro}</div>
      )}

      <section className="metrics-grid">
        <div className="card kpi">
          <span className="kpi-rotulo">Progresso</span>
          <strong className="kpi-valor">{pct}%</strong>
          <span className="kpi-ajuda">
            {contagem.enviado + contagem.erro} de {contagem.total}
          </span>
        </div>
        <div className="card kpi">
          <span className="kpi-rotulo">Entregues</span>
          <strong className="kpi-valor">{contagem.enviado}</strong>
          <span className="kpi-ajuda">receberam todas as mensagens</span>
        </div>
        <div className="card kpi">
          <span className="kpi-rotulo">Falharam</span>
          <strong className={`kpi-valor ${contagem.erro ? 'ruim' : ''}`}>{contagem.erro}</strong>
          <span className="kpi-ajuda">número inválido ou fora do WhatsApp</span>
        </div>
        <div className="card kpi">
          <span className="kpi-rotulo">Na fila</span>
          <strong className="kpi-valor">{contagem.pendente}</strong>
          <span className="kpi-ajuda">
            {rodando && contagem.pendente
              ? `termina em ${tempoRestante(campanha, contagem.pendente)}`
              : 'aguardando início'}
          </span>
        </div>
      </section>

      <section className="grid-two">
        <div className="card bloco">
          <h2>Mensagens enviadas</h2>
          <div className="previa-conversa">
            {(campanha.mensagens ?? []).map((m, i) => (
              <div className="bolha ia" key={i}>
                {m.midia_url && <img className="bolha-midia" src={m.midia_url} alt="" />}
                {m.texto}
              </div>
            ))}
          </div>
          <p className="dica">
            Intervalo de {campanha.intervalo_min}–{campanha.intervalo_max}s entre contatos ·{' '}
            {campanha.intervalo_mensagens}s entre mensagens.
          </p>
        </div>

        <div className="card bloco">
          <h2>Contatos</h2>
          <div className="range-tabs">
            {FILTROS.map((f) => (
              <button
                key={f.id}
                className={filtro === f.id ? 'active' : ''}
                onClick={() => setFiltro(f.id)}
              >
                {f.rotulo}
                {f.id !== 'todos' && ` (${contagem[f.id] ?? 0})`}
              </button>
            ))}
          </div>
          <div className="tabela-contatos">
            {lista.length === 0 && <div className="vazio">Nenhum contato aqui.</div>}
            {lista.map((c) => (
              <div className="contato-linha" key={c.id}>
                <span className="contato-nome">{c.nome || '—'}</span>
                <span className="contato-numero">{c.numero}</span>
                <span className={`badge-contato ${c.status}`}>{ROTULO_CONTATO[c.status]}</span>
                <span className="contato-quando">
                  {c.enviado_em
                    ? new Date(c.enviado_em).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : ''}
                </span>
                {c.erro && <span className="contato-erro" title={c.erro}>{c.erro}</span>}
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
