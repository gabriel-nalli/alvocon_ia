import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Play, Pause, Ban, RefreshCw, MessageSquare } from 'lucide-react'
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
  { id: 'responderam', rotulo: 'Responderam' },
]

export default function DisparoDetalhe() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { campanha, contatos, carregando, erro } = useCampanha(id)
  const [filtro, setFiltro] = useState('todos')
  const [ocupado, setOcupado] = useState(false)
  const [falha, setFalha] = useState(null)

  const contagem = useMemo(() => contaPorStatus(contatos), [contatos])
  const lista = useMemo(() => {
    if (filtro === 'todos') return contatos
    if (filtro === 'responderam')
      return contatos.filter((c) => c.respondeu_em && !c.resposta_automatica)
    return contatos.filter((c) => c.status === filtro)
  }, [contatos, filtro])

  // quem respondeu vem primeiro e com o texto à mostra: é o que alguém precisa
  // atender, não só medir
  // gente primeiro; a saudação automática fica no fim, marcada, para ninguém
  // achar que a mensagem sumiu
  const respostas = useMemo(
    () =>
      contatos
        .filter((c) => c.respondeu_em)
        .sort((a, b) => {
          if (a.resposta_automatica !== b.resposta_automatica)
            return a.resposta_automatica ? 1 : -1
          return b.respondeu_em.localeCompare(a.respondeu_em)
        }),
    [contatos],
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
          <span className="kpi-rotulo">Responderam</span>
          <strong className="kpi-valor bom">{contagem.responderam}</strong>
          <span className="kpi-ajuda">
            {contagem.enviado
              ? `${Math.round((contagem.responderam / contagem.enviado) * 100)}% de quem recebeu`
              : 'ninguém recebeu ainda'}
            {contagem.responderam_auto > 0 &&
              ` · ${contagem.responderam_auto} automáticas fora da conta`}
          </span>
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

      {respostas.length > 0 && (
        <section className="card bloco bloco-respostas">
          <h2>
            <MessageSquare size={16} /> Responderam ({contagem.responderam})
          </h2>
          <p className="dica">
            Chegou no número do disparo. A Isabela não responde estas conversas enquanto a trava de
            48h estiver de pé — quem responde é gente.
          </p>
          <div className="lista-respostas">
            {respostas.map((c) => (
              <div
                className={`resposta-linha ${c.resposta_automatica ? 'automatica' : ''}`}
                key={c.id}
              >
                <div className="resposta-quem">
                  <strong>{c.nome || c.numero}</strong>
                  <span className="txt-muted">
                    {c.resposta_automatica ? 'resposta automática' : c.numero}
                  </span>
                </div>
                <div className="resposta-texto">{c.resposta || '—'}</div>
                <a
                  className="botao-secundario"
                  href={`https://wa.me/${c.numero}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Abrir conversa
                </a>
                <span className="contato-quando">
                  {new Date(c.respondeu_em).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

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
                {c.respondeu_em && !c.resposta_automatica && (
                  <span className="badge-contato respondeu">Respondeu</span>
                )}
                {c.respondeu_em && c.resposta_automatica && (
                  <span className="badge-contato automatica">Automática</span>
                )}
                {!c.respondeu_em && c.visualizado_em && (
                  <span className="badge-contato visualizou">Visualizou</span>
                )}
                {c.erro && <span className="contato-erro" title={c.erro}>{c.erro}</span>}
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
