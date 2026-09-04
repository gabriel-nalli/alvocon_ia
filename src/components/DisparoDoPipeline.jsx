import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Send, X, ShieldAlert } from 'lucide-react'
import { ETAPAS, ETAPA_POR_ID, formataTelefone } from '../lib/crm'

// Monta a lista de contatos a partir do funil: escolhe as etapas, filtra por
// etiqueta e limita a quantidade. Quem já está no fim (vendido/perdido) fica
// de fora por padrão — é o erro mais fácil de cometer aqui.
export function DisparoDoPipeline({ leads, onFechar }) {
  const navigate = useNavigate()
  const [etapasEscolhidas, setEtapasEscolhidas] = useState(['qualificado'])
  const [etiqueta, setEtiqueta] = useState('')
  const [limite, setLimite] = useState('')
  const [maisAntigosPrimeiro, setMaisAntigosPrimeiro] = useState(false)

  const etiquetasDisponiveis = useMemo(() => {
    const todas = new Set()
    for (const l of leads) for (const t of l.etiquetas ?? []) todas.add(t)
    return [...todas].sort()
  }, [leads])

  const selecionados = useMemo(() => {
    let lista = leads.filter((l) => etapasEscolhidas.includes(l.etapa))
    if (etiqueta) lista = lista.filter((l) => (l.etiquetas ?? []).includes(etiqueta))
    lista = [...lista].sort((a, b) =>
      maisAntigosPrimeiro
        ? a.chegou_em.localeCompare(b.chegou_em)
        : b.chegou_em.localeCompare(a.chegou_em),
    )
    const n = Number(limite)
    return n > 0 ? lista.slice(0, n) : lista
  }, [leads, etapasEscolhidas, etiqueta, limite, maisAntigosPrimeiro])

  const porEtapa = useMemo(() => {
    const contagem = {}
    for (const l of leads) contagem[l.etapa] = (contagem[l.etapa] ?? 0) + 1
    return contagem
  }, [leads])

  function alterna(id) {
    setEtapasEscolhidas((atual) =>
      atual.includes(id) ? atual.filter((e) => e !== id) : [...atual, id],
    )
  }

  function seguir() {
    navigate('/disparos/novo', {
      state: {
        contatos: selecionados.map((l) => ({
          nome: l.nome || l.nome_perfil || null,
          numero: l.telefone,
          crm_lead_id: l.id,
        })),
        nomeSugerido: etapasEscolhidas.map((e) => ETAPA_POR_ID[e]?.rotulo ?? e).join(' + '),
        travarIa: true,
        vindoDoPipeline: true,
      },
    })
  }

  return (
    <div className="card bloco painel-disparo-pipeline">
      <div className="ficha-topo">
        <div>
          <h2 className="ficha-nome">Disparar para o funil</h2>
          <p className="dica">
            Escolha de quais etapas puxar os contatos. A mensagem você escreve no próximo passo.
          </p>
        </div>
        <button className="icone" onClick={onFechar} aria-label="Fechar">
          <X size={18} />
        </button>
      </div>

      <div>
        <span className="rotulo-campo">Etapas</span>
        <div className="etapas-trilha">
          {ETAPAS.map((e) => {
            const marcada = etapasEscolhidas.includes(e.id)
            const fim = e.id === 'vendido' || e.id === 'perdido'
            return (
              <button
                key={e.id}
                className={`etapa-btn ${marcada ? 'ativa' : ''} ${fim ? 'fim-de-linha' : ''}`}
                style={marcada ? { borderColor: e.cor, color: e.cor } : undefined}
                onClick={() => alterna(e.id)}
                title={fim ? 'Cuidado: esse lead já foi encerrado' : e.ajuda}
              >
                {e.rotulo} ({porEtapa[e.id] ?? 0})
              </button>
            )
          })}
        </div>
      </div>

      <div className="linha-campos dois">
        <label>
          Etiqueta (opcional)
          <select className="campo" value={etiqueta} onChange={(e) => setEtiqueta(e.target.value)}>
            <option value="">Todas</option>
            {etiquetasDisponiveis.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
        <label>
          Quantos no máximo
          <input
            className="campo"
            type="number"
            min="1"
            placeholder={`Todos (${selecionados.length})`}
            value={limite}
            onChange={(e) => setLimite(e.target.value)}
          />
        </label>
      </div>

      <label className="marcador">
        <input
          type="checkbox"
          checked={maisAntigosPrimeiro}
          onChange={(e) => setMaisAntigosPrimeiro(e.target.checked)}
        />
        Começar pelos leads mais antigos
      </label>

      {(etapasEscolhidas.includes('vendido') || etapasEscolhidas.includes('perdido')) && (
        <div className="aviso-alerta">
          <ShieldAlert size={17} />
          <div>
            <strong>Você incluiu leads já encerrados</strong>
            <p>Quem comprou ou foi dado como perdido vai receber a mensagem também.</p>
          </div>
        </div>
      )}

      <div className="resumo-selecao">
        <div>
          <strong>{selecionados.length}</strong> contatos selecionados
        </div>
        <div className="amostra">
          {selecionados.slice(0, 4).map((l) => (
            <span key={l.id}>{l.nome || formataTelefone(l.telefone)}</span>
          ))}
          {selecionados.length > 4 && (
            <span className="txt-muted">e mais {selecionados.length - 4}…</span>
          )}
        </div>
      </div>

      <div className="aviso-neutro">
        <ShieldAlert size={17} />
        <span>
          A Isabela fica travada para esses números por 48h depois do envio — assim ela não entra
          no meio da sua negociação se o cliente responder.
        </span>
      </div>

      <button className="botao-primario" disabled={selecionados.length === 0} onClick={seguir}>
        <Send size={16} /> Escrever a mensagem para {selecionados.length} contatos
      </button>
    </div>
  )
}
