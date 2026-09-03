import { useNavigate } from 'react-router-dom'
import { Plus, Play, Pause, Ban, Trash2 } from 'lucide-react'
import {
  useCampanhas,
  ROTULO_STATUS,
  iniciaCampanha,
  pausaCampanha,
  cancelaCampanha,
  apagaCampanha,
  tempoRestante,
} from '../lib/disparos'
import { useState } from 'react'

function Barra({ progresso }) {
  const total = progresso?.total ?? 0
  if (!total) return <div className="barra-progresso vazia" />
  const pct = (n) => `${(n / total) * 100}%`
  return (
    <div className="barra-progresso" title={`${progresso.enviados} de ${total} entregues`}>
      <span className="fatia enviado" style={{ width: pct(progresso.enviados) }} />
      <span className="fatia erro" style={{ width: pct(progresso.erros) }} />
      <span className="fatia enviando" style={{ width: pct(progresso.enviando) }} />
    </div>
  )
}

export default function Disparos() {
  const { campanhas, carregando, erro } = useCampanhas()
  const navigate = useNavigate()
  const [ocupado, setOcupado] = useState(null)
  const [falha, setFalha] = useState(null)

  async function acao(id, fn, confirmacao) {
    if (confirmacao && !window.confirm(confirmacao)) return
    setOcupado(id)
    setFalha(null)
    try {
      await fn(id)
    } catch (e) {
      setFalha(e.message)
    } finally {
      setOcupado(null)
    }
  }

  if (carregando) return <div className="tela-carregando">Carregando disparos…</div>

  return (
    <>
      <div className="filters">
        <div>
          <h1 className="titulo-pagina">Disparos</h1>
          <p className="subtitulo-pagina">
            Listas de prospecção enviadas pelo WhatsApp, com intervalo aleatório entre cada contato.
          </p>
        </div>
        <button className="botao-primario" onClick={() => navigate('/disparos/novo')}>
          <Plus size={17} /> Novo disparo
        </button>
      </div>

      {(erro || falha) && <div className="aviso-erro">{erro || falha}</div>}

      {campanhas.length === 0 ? (
        <div className="card vazio-grande">
          <p>Nenhum disparo ainda.</p>
          <p className="dica">
            Suba uma planilha com as colunas <strong>NOME</strong> e <strong>NUMERO</strong> para
            começar.
          </p>
        </div>
      ) : (
        <div className="lista-campanhas">
          {campanhas.map((c) => {
            const p = c.progresso
            const pendentes = p?.pendentes ?? 0
            const rodando = c.status === 'rodando'
            return (
              <div className="card campanha-item" key={c.id}>
                <button className="campanha-corpo" onClick={() => navigate(`/disparos/${c.id}`)}>
                  <div className="campanha-topo">
                    <span className="campanha-nome">{c.nome}</span>
                    <span className={`badge-status ${c.status}`}>{ROTULO_STATUS[c.status]}</span>
                  </div>
                  <Barra progresso={p} />
                  <div className="campanha-numeros">
                    <span>
                      <strong>{p?.enviados ?? 0}</strong> de {p?.total ?? 0} entregues
                    </span>
                    {(p?.erros ?? 0) > 0 && <span className="txt-erro">{p.erros} falharam</span>}
                    {rodando && pendentes > 0 && (
                      <span className="txt-muted">
                        faltam {pendentes} · {tempoRestante(c, pendentes)}
                      </span>
                    )}
                    <span className="txt-muted">
                      {new Date(c.criado_em).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </button>

                <div className="campanha-acoes">
                  {(c.status === 'rascunho' || c.status === 'pausado') && (
                    <button
                      disabled={ocupado === c.id}
                      onClick={() => acao(c.id, iniciaCampanha)}
                      title={c.status === 'pausado' ? 'Retomar' : 'Iniciar'}
                    >
                      <Play size={16} /> {c.status === 'pausado' ? 'Retomar' : 'Iniciar'}
                    </button>
                  )}
                  {rodando && (
                    <button disabled={ocupado === c.id} onClick={() => acao(c.id, pausaCampanha)}>
                      <Pause size={16} /> Pausar
                    </button>
                  )}
                  {['rascunho', 'rodando', 'pausado'].includes(c.status) && (
                    <button
                      className="perigo"
                      disabled={ocupado === c.id}
                      onClick={() =>
                        acao(
                          c.id,
                          cancelaCampanha,
                          `Cancelar "${c.nome}"? Os ${pendentes} contatos que ainda não receberam ficam de fora.`,
                        )
                      }
                    >
                      <Ban size={16} /> Cancelar
                    </button>
                  )}
                  {['concluido', 'cancelado'].includes(c.status) && (
                    <button
                      className="perigo"
                      disabled={ocupado === c.id}
                      onClick={() =>
                        acao(c.id, apagaCampanha, `Apagar "${c.nome}" e todo o histórico dela?`)
                      }
                    >
                      <Trash2 size={16} /> Apagar
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}
