import { useEffect, useMemo, useState } from 'react'
import { Search, UserPlus, Tag, X, Check, LayoutGrid, List, CalendarClock, Send } from 'lucide-react'
import {
  useCrmLeads,
  useHistorico,
  filtraLeads,
  salvaLead,
  anotaObservacao,
  criaLeadManual,
  formataDinheiro,
  formataTelefone,
  ETAPAS,
  ETAPA_POR_ID,
  MOTIVOS_PERDA,
} from '../lib/crm'
import { normalizaNumero } from '../lib/planilha'
import { Kanban } from '../components/Kanban.jsx'
import { DisparoDoPipeline } from '../components/DisparoDoPipeline.jsx'
import { ConfirmaEtapa, precisaConfirmar } from '../components/ConfirmaEtapa.jsx'

function Ficha({ lead, onFechar, onPedirEtapa }) {
  const eventos = useHistorico(lead?.id)
  const [rascunho, setRascunho] = useState(lead)
  const [nota, setNota] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    setRascunho(lead)
    setNota('')
    setErro(null)
  }, [lead])

  if (!lead) {
    return (
      <div className="card bloco ficha-vazia">
        <p>Selecione um lead para ver a ficha.</p>
        <p className="dica">
          Saiu uma venda? Cole o número na busca — ela encontra mesmo com máscara,
          tipo <code>(19) 99999-8888</code>.
        </p>
      </div>
    )
  }

  async function aplica(campos) {
    setSalvando(true)
    setErro(null)
    try {
      await salvaLead(lead.id, campos)
      setRascunho((r) => ({ ...r, ...campos }))
    } catch (e) {
      setErro(e.message)
    } finally {
      setSalvando(false)
    }
  }

  function mudaEtapa(etapa) {
    if (etapa === rascunho.etapa) return
    // orçamento, venda e perda não fazem sentido sem o número junto
    if (precisaConfirmar(etapa)) {
      onPedirEtapa(lead, etapa)
      return
    }
    aplica({ etapa })
  }

  async function enviaNota() {
    if (!nota.trim()) return
    try {
      await anotaObservacao(lead.id, nota.trim())
      setNota('')
    } catch (e) {
      setErro(e.message)
    }
  }

  const campoNumero = (chave, rotulo) => (
    <label>
      {rotulo}
      <input
        className="campo"
        type="number"
        min="0"
        step="0.01"
        placeholder="0,00"
        value={rascunho[chave] ?? ''}
        onChange={(e) => setRascunho({ ...rascunho, [chave]: e.target.value })}
        onBlur={(e) => {
          const v = e.target.value === '' ? null : Number(e.target.value)
          if (v !== lead[chave]) aplica({ [chave]: v })
        }}
      />
    </label>
  )

  return (
    <div className="card bloco ficha">
      <div className="ficha-topo">
        <div>
          <h2 className="ficha-nome">{lead.nome || lead.nome_perfil || 'Sem nome'}</h2>
          <div className="ficha-meta">
            <span>{formataTelefone(lead.telefone)}</span>
            {lead.cidade && <span>· {lead.cidade}</span>}
            <span>· entrou {new Date(lead.chegou_em).toLocaleDateString('pt-BR')}</span>
            {lead.origem !== 'ia' && <span className="badge-origem">{lead.origem}</span>}
          </div>
        </div>
        <button className="icone" onClick={onFechar} aria-label="Fechar ficha">
          <X size={18} />
        </button>
      </div>

      {erro && <div className="aviso-erro">{erro}</div>}

      <div className="etapas-trilha">
        {ETAPAS.map((e) => (
          <button
            key={e.id}
            className={`etapa-btn ${rascunho.etapa === e.id ? 'ativa' : ''}`}
            style={rascunho.etapa === e.id ? { borderColor: e.cor, color: e.cor } : undefined}
            disabled={salvando}
            title={e.ajuda}
            onClick={() => mudaEtapa(e.id)}
          >
            {rascunho.etapa === e.id && <Check size={13} />}
            {e.rotulo}
          </button>
        ))}
      </div>

      <div className="linha-campos dois">
        {campoNumero('valor_orcamento', 'Valor do orçamento (R$)')}
        {campoNumero('valor_venda', 'Valor da venda (R$)')}
      </div>

      <div className="linha-campos dois">
        <label>
          Próximo contato
          <input
            className="campo"
            type="date"
            value={rascunho.proximo_contato ?? ''}
            onChange={(e) => aplica({ proximo_contato: e.target.value || null })}
          />
        </label>
        {rascunho.etapa === 'perdido' && (
          <label>
            Motivo da perda
            <select
              className="campo"
              value={rascunho.motivo_perda ?? ''}
              onChange={(e) => aplica({ motivo_perda: e.target.value })}
            >
              {MOTIVOS_PERDA.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      <label className="campo-largo">
        Etiquetas
        <input
          className="campo"
          placeholder="instalador, obra grande, urgente"
          value={(rascunho.etiquetas ?? []).join(', ')}
          onChange={(e) =>
            setRascunho({
              ...rascunho,
              etiquetas: e.target.value.split(',').map((t) => t.trim()).filter(Boolean),
            })
          }
          onBlur={() => aplica({ etiquetas: rascunho.etiquetas ?? [] })}
        />
      </label>

      <div className="historico">
        <h3>O que aconteceu</h3>
        <div className="nova-nota">
          <input
            className="campo"
            placeholder="Anotar algo sobre este lead…"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && enviaNota()}
          />
          <button className="botao-secundario" onClick={enviaNota} disabled={!nota.trim()}>
            Anotar
          </button>
        </div>
        <ol className="linha-tempo">
          {eventos.length === 0 && <li className="vazio">Nada registrado ainda.</li>}
          {eventos.map((ev) => (
            <li key={ev.id}>
              <span className="quando">
                {new Date(ev.criado_em).toLocaleString('pt-BR', {
                  day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                })}
              </span>
              <span className="oque">
                {ev.tipo === 'etapa' && ev.para
                  ? `${ETAPA_POR_ID[ev.de]?.rotulo ?? ev.de} → ${ETAPA_POR_ID[ev.para]?.rotulo ?? ev.para}`
                  : ev.descricao}
                {ev.valor != null && ` · ${formataDinheiro(ev.valor)}`}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}

export default function Crm() {
  const { leads, carregando, erro } = useCrmLeads()
  const [busca, setBusca] = useState('')
  const [etapa, setEtapa] = useState('todos')
  const [selecionadoId, setSelecionadoId] = useState(null)
  const [criando, setCriando] = useState(false)
  const [erroCriar, setErroCriar] = useState(null)
  const [visao, setVisao] = useState('quadro')
  const [soChamarHoje, setSoChamarHoje] = useState(false)
  const [montandoDisparo, setMontandoDisparo] = useState(false)
  const [pedindoEtapa, setPedindoEtapa] = useState(null)

  const hoje = useMemo(() => new Date().toISOString().slice(0, 10), [])

  // leads com data de próximo contato vencida: é a lista que faz vender
  const chamarHoje = useMemo(
    () =>
      leads.filter(
        (l) =>
          l.proximo_contato &&
          l.proximo_contato <= hoje &&
          !['vendido', 'perdido'].includes(l.etapa),
      ),
    [leads, hoje],
  )

  const lista = useMemo(() => {
    const base = soChamarHoje ? chamarHoje : leads
    return filtraLeads(base, busca, etapa)
  }, [leads, chamarHoje, soChamarHoje, busca, etapa])
  const selecionado = useMemo(
    () => leads.find((l) => l.id === selecionadoId) ?? null,
    [leads, selecionadoId],
  )

  const contagem = useMemo(() => {
    const base = { todos: leads.length }
    for (const e of ETAPAS) base[e.id] = 0
    for (const l of leads) base[l.etapa] = (base[l.etapa] ?? 0) + 1
    return base
  }, [leads])

  // busca que parece número e não achou ninguém: oferece cadastrar
  const numeroNovo = useMemo(() => {
    if (lista.length > 0 || !busca.trim()) return null
    return normalizaNumero(busca)
  }, [lista, busca])

  async function mudaEtapaDoCard(lead, etapaNova) {
    // orçamento, venda e perda abrem o popup pedindo o valor / motivo
    if (precisaConfirmar(etapaNova)) {
      setPedindoEtapa({ lead, etapa: etapaNova })
      return
    }
    try {
      await salvaLead(lead.id, { etapa: etapaNova })
    } catch (e) {
      setErroCriar(e.message)
    }
  }

  async function confirmaEtapa(campos, nota) {
    const { lead } = pedindoEtapa
    setPedindoEtapa(null)
    try {
      await salvaLead(lead.id, campos)
      if (nota) await anotaObservacao(lead.id, nota)
    } catch (e) {
      setErroCriar(e.message)
    }
  }

  async function cadastra() {
    setCriando(true)
    setErroCriar(null)
    try {
      const novo = await criaLeadManual({ telefone: numeroNovo })
      setBusca('')
      setSelecionadoId(novo.id)
    } catch (e) {
      setErroCriar(e.message)
    } finally {
      setCriando(false)
    }
  }

  if (carregando) return <div className="tela-carregando">Carregando leads…</div>

  return (
    <>
      {pedindoEtapa && (
        <ConfirmaEtapa
          lead={pedindoEtapa.lead}
          etapa={pedindoEtapa.etapa}
          onConfirmar={confirmaEtapa}
          onCancelar={() => setPedindoEtapa(null)}
        />
      )}

      <div className="filters">
        <div>
          <h1 className="titulo-pagina">Leads</h1>
          <p className="subtitulo-pagina">
            Todo lead que a Isabela atende cai aqui sozinho. O que você marca aqui é o que
            responde se o Meta está dando retorno.
          </p>
        </div>
        <div className="acoes-cabecalho">
          <button className="botao-secundario" onClick={() => setMontandoDisparo((v) => !v)}>
            <Send size={16} /> Disparar para o funil
          </button>
          {chamarHoje.length > 0 && (
            <button
              className={`botao-secundario ${soChamarHoje ? 'aceso' : ''}`}
              onClick={() => setSoChamarHoje((v) => !v)}
            >
              <CalendarClock size={16} /> Chamar hoje ({chamarHoje.length})
            </button>
          )}
          <div className="alternador">
            <button
              className={visao === 'quadro' ? 'active' : ''}
              onClick={() => { setVisao('quadro'); setEtapa('todos') }}
              title="Quadro do funil"
            >
              <LayoutGrid size={16} /> Quadro
            </button>
            <button
              className={visao === 'lista' ? 'active' : ''}
              onClick={() => setVisao('lista')}
              title="Lista"
            >
              <List size={16} /> Lista
            </button>
          </div>
        </div>
      </div>

      {(erro || erroCriar) && <div className="aviso-erro">{erro || erroCriar}</div>}

      <div className="busca-crm">
        <Search size={18} />
        <input
          placeholder="Buscar por número, nome, cidade ou etiqueta…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          autoFocus
        />
        {busca && (
          <button className="icone" onClick={() => setBusca('')} aria-label="Limpar busca">
            <X size={16} />
          </button>
        )}
      </div>

      {visao === 'lista' && (
      <div className="range-tabs etapas-filtro">
        <button className={etapa === 'todos' ? 'active' : ''} onClick={() => setEtapa('todos')}>
          Todos ({contagem.todos})
        </button>
        {ETAPAS.map((e) => (
          <button
            key={e.id}
            className={etapa === e.id ? 'active' : ''}
            onClick={() => setEtapa(e.id)}
            title={e.ajuda}
          >
            {e.rotulo} ({contagem[e.id]})
          </button>
        ))}
      </div>
      )}

      {montandoDisparo && (
        <DisparoDoPipeline leads={leads} onFechar={() => setMontandoDisparo(false)} />
      )}

      {numeroNovo && (
        <div className="card sugestao-novo">
          <span>
            Ninguém no CRM com <strong>{formataTelefone(numeroNovo)}</strong>. Esse lead não veio
            da Isabela.
          </span>
          <button className="botao-primario" disabled={criando} onClick={cadastra}>
            <UserPlus size={16} /> Cadastrar como lead manual
          </button>
        </div>
      )}

      {visao === 'quadro' && (
        <Kanban
          leads={lista}
          selecionadoId={selecionadoId}
          onSelecionar={setSelecionadoId}
          onMoverEtapa={mudaEtapaDoCard}
        />
      )}

      <div className={`crm-layout ${visao === 'quadro' ? 'so-ficha' : ''}`}>
        {visao === 'lista' && (
        <div className="card lista-crm">
          {lista.length === 0 && !numeroNovo && <div className="vazio">Nenhum lead aqui.</div>}
          {lista.map((l) => {
            const e = ETAPA_POR_ID[l.etapa]
            return (
              <button
                key={l.id}
                className={`crm-item ${l.id === selecionadoId ? 'ativo' : ''}`}
                onClick={() => setSelecionadoId(l.id)}
              >
                <div className="crm-item-topo">
                  <span className="crm-nome">{l.nome || l.nome_perfil || formataTelefone(l.telefone)}</span>
                  <span className="pastilha" style={{ background: e?.cor }} title={e?.rotulo} />
                </div>
                <div className="crm-item-sub">
                  <span>{e?.rotulo}</span>
                  {l.cidade && <span>· {l.cidade}</span>}
                  {l.valor_venda != null && (
                    <span className="valor-venda">· {formataDinheiro(l.valor_venda)}</span>
                  )}
                  {l.valor_venda == null && l.valor_orcamento != null && (
                    <span>· orç. {formataDinheiro(l.valor_orcamento)}</span>
                  )}
                  {(l.etiquetas ?? []).length > 0 && (
                    <span className="etiquetas-mini">
                      <Tag size={11} /> {l.etiquetas.join(', ')}
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
        )}

        {(visao === 'lista' || selecionado) && (
          <Ficha
            lead={selecionado}
            onFechar={() => setSelecionadoId(null)}
            onPedirEtapa={(lead, etapa) => setPedindoEtapa({ lead, etapa })}
          />
        )}
      </div>
    </>
  )
}
