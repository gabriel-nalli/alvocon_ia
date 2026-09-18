import { useMemo, useState } from 'react'
import { Tag, CalendarClock } from 'lucide-react'
import { ETAPAS, formataDinheiro, formataTelefone } from '../lib/crm'

// Qual dinheiro o card representa depende da etapa. Em Vendido só vale a venda:
// cair no valor do orçamento ali fazia o quadro mostrar como faturado um
// dinheiro que nunca entrou, e a coluna não batia com o Retorno. Perdido não
// soma nada — orçamento de quem não comprou não é total de coisa nenhuma.
function valorDoCard(lead) {
  if (lead.etapa === 'vendido') return lead.valor_venda
  if (lead.etapa === 'perdido') return null
  return lead.valor_orcamento
}

// Quadro do funil. Arrastar é atalho, não o único caminho: a ficha do lead tem
// os mesmos botões de etapa, então quem usa teclado não fica de fora.
export function Kanban({ leads, selecionadoId, onSelecionar, onMoverEtapa }) {
  const [arrastando, setArrastando] = useState(null)
  const [colunaAlvo, setColunaAlvo] = useState(null)
  const hoje = useMemo(() => new Date().toISOString().slice(0, 10), [])

  const colunas = useMemo(
    () =>
      ETAPAS.map((etapa) => {
        const doGrupo = leads.filter((l) => l.etapa === etapa.id)
        const total = doGrupo.reduce((soma, l) => soma + Number(valorDoCard(l) ?? 0), 0)
        const semValor =
          etapa.id === 'vendido' ? doGrupo.filter((l) => l.valor_venda == null).length : 0
        return { ...etapa, leads: doGrupo, total, semValor }
      }),
    [leads],
  )

  function solta(etapaId) {
    setColunaAlvo(null)
    const lead = arrastando
    setArrastando(null)
    if (lead && lead.etapa !== etapaId) onMoverEtapa(lead, etapaId)
  }

  return (
    <div className="kanban">
      {colunas.map((coluna) => (
        <section
          key={coluna.id}
          className={`kanban-coluna ${colunaAlvo === coluna.id ? 'alvo' : ''}`}
          onDragOver={(e) => {
            e.preventDefault()
            setColunaAlvo(coluna.id)
          }}
          onDragLeave={() => setColunaAlvo((c) => (c === coluna.id ? null : c))}
          onDrop={() => solta(coluna.id)}
        >
          <header className="kanban-cabecalho">
            <span className="kanban-titulo">
              <span className="pastilha" style={{ background: coluna.cor }} />
              {coluna.rotulo}
            </span>
            <span className="kanban-contagem">{coluna.leads.length}</span>
          </header>
          {coluna.total > 0 && (
            <div className="kanban-total">{formataDinheiro(coluna.total)}</div>
          )}
          {coluna.semValor > 0 && (
            <div className="kanban-total alerta">
              {coluna.semValor} sem valor da venda
            </div>
          )}

          <div className="kanban-cards">
            {coluna.leads.length === 0 && <p className="kanban-vazio">—</p>}
            {coluna.leads.map((lead) => {
              const atrasado =
                lead.proximo_contato &&
                lead.proximo_contato <= hoje &&
                !['vendido', 'perdido'].includes(lead.etapa)
              return (
                <article
                  key={lead.id}
                  className={`kanban-card ${lead.id === selecionadoId ? 'ativo' : ''} ${
                    arrastando?.id === lead.id ? 'arrastando' : ''
                  }`}
                  draggable
                  onDragStart={() => setArrastando(lead)}
                  onDragEnd={() => {
                    setArrastando(null)
                    setColunaAlvo(null)
                  }}
                  onClick={() => onSelecionar(lead.id)}
                >
                  <span className="kanban-nome">
                    {lead.nome || lead.nome_perfil || formataTelefone(lead.telefone)}
                  </span>
                  <span className="kanban-sub">
                    {lead.cidade || formataTelefone(lead.telefone)}
                  </span>
                  {valorDoCard(lead) != null && (
                    <span className={`kanban-valor ${lead.etapa === 'vendido' ? 'fechado' : ''}`}>
                      {lead.etapa === 'vendido' ? '' : 'orç. '}
                      {formataDinheiro(valorDoCard(lead))}
                    </span>
                  )}
                  {lead.etapa === 'vendido' && lead.valor_venda == null && (
                    <span className="kanban-alerta">falta o valor da venda</span>
                  )}
                  {atrasado && (
                    <span className="kanban-alerta">
                      <CalendarClock size={12} /> chamar hoje
                    </span>
                  )}
                  {(lead.etiquetas ?? []).length > 0 && (
                    <span className="kanban-etiquetas">
                      <Tag size={11} /> {lead.etiquetas.join(', ')}
                    </span>
                  )}
                </article>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
