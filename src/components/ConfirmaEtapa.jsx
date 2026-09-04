import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { ETAPA_POR_ID, MOTIVOS_PERDA, formataDinheiro } from '../lib/crm'

// Etapas que não fazem sentido sem o número junto. Marcar "vendido" sem valor
// deixa o lead no funil certo e o relatório de retorno mentindo — o card fica
// com R$ 0,00 e o ROI da semana não muda.
const EXIGEM_DADO = {
  orcamento: { campo: 'valor_orcamento', rotulo: 'Valor do orçamento', tipo: 'dinheiro' },
  vendido: { campo: 'valor_venda', rotulo: 'Valor da venda', tipo: 'dinheiro' },
  perdido: { campo: 'motivo_perda', rotulo: 'Por que perdeu?', tipo: 'motivo' },
}

export function precisaConfirmar(etapa) {
  return Boolean(EXIGEM_DADO[etapa])
}

export function ConfirmaEtapa({ lead, etapa, onConfirmar, onCancelar }) {
  const pedido = EXIGEM_DADO[etapa]
  const primeiro = useRef(null)

  // venda quase sempre sai pelo valor do orçamento: já vem preenchido
  const [valor, setValor] = useState(() => {
    if (etapa === 'vendido') return lead.valor_venda ?? lead.valor_orcamento ?? ''
    if (etapa === 'orcamento') return lead.valor_orcamento ?? ''
    return ''
  })
  const [motivo, setMotivo] = useState(lead.motivo_perda ?? MOTIVOS_PERDA[0])
  const [nota, setNota] = useState('')

  useEffect(() => {
    primeiro.current?.focus()
    const escape = (e) => e.key === 'Escape' && onCancelar()
    document.addEventListener('keydown', escape)
    return () => document.removeEventListener('keydown', escape)
  }, [onCancelar])

  if (!pedido) return null

  const ehDinheiro = pedido.tipo === 'dinheiro'
  const valorNumero = Number(String(valor).replace(',', '.'))
  const podeConfirmar = ehDinheiro ? valor !== '' && valorNumero >= 0 : Boolean(motivo)

  function confirma() {
    if (!podeConfirmar) return
    const campos = ehDinheiro ? { [pedido.campo]: valorNumero } : { motivo_perda: motivo }
    onConfirmar({ etapa, ...campos }, nota.trim() || null)
  }

  const nome = lead.nome || lead.nome_perfil || lead.telefone

  return (
    <div className="modal-fundo" onMouseDown={(e) => e.target === e.currentTarget && onCancelar()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={pedido.rotulo}>
        <div className="modal-topo">
          <div>
            <h2>{ETAPA_POR_ID[etapa]?.rotulo}</h2>
            <p className="dica">{nome}</p>
          </div>
          <button className="icone" onClick={onCancelar} aria-label="Cancelar">
            <X size={18} />
          </button>
        </div>

        <label className="campo-largo">
          {pedido.rotulo}
          {ehDinheiro ? (
            <input
              ref={primeiro}
              className="campo campo-grande"
              type="number"
              min="0"
              step="0.01"
              placeholder="0,00"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && confirma()}
            />
          ) : (
            <select
              ref={primeiro}
              className="campo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            >
              {MOTIVOS_PERDA.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          )}
        </label>

        {etapa === 'vendido' && lead.valor_orcamento != null && (
          <p className="dica">
            Orçamento enviado foi de {formataDinheiro(lead.valor_orcamento)}.
          </p>
        )}

        <label className="campo-largo">
          Observação (opcional)
          <input
            className="campo"
            placeholder={
              etapa === 'perdido' ? 'Ex: foi na concorrência por R$ 300 a menos' : 'Ex: pagou via PIX'
            }
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && confirma()}
          />
        </label>

        <div className="modal-acoes">
          <button className="botao-secundario" onClick={onCancelar}>
            Cancelar
          </button>
          <button className="botao-primario" disabled={!podeConfirmar} onClick={confirma}>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}
