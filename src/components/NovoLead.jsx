import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { criaLeadManual, formataTelefone } from '../lib/crm'
import { normalizaNumero } from '../lib/planilha'

// Lead que não veio da Isabela: indicação, ligação direta, feira. A origem
// entra separada de 'ia' porque o relatório de retorno só conta o que o Meta
// trouxe — misturar aqui inflaria o ROI do anúncio com venda que ele não fez.
const ORIGENS = [
  { id: 'indicacao', rotulo: 'Indicação' },
  { id: 'ligacao', rotulo: 'Ligou direto' },
  { id: 'manual', rotulo: 'Outro' },
]

export function NovoLead({ telefoneInicial = '', onCriado, onFechar }) {
  const primeiro = useRef(null)
  const [telefone, setTelefone] = useState(telefoneInicial)
  const [nome, setNome] = useState('')
  const [cidade, setCidade] = useState('')
  const [tipo, setTipo] = useState('')
  const [origem, setOrigem] = useState('indicacao')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    primeiro.current?.focus()
    const escape = (e) => e.key === 'Escape' && onFechar()
    document.addEventListener('keydown', escape)
    return () => document.removeEventListener('keydown', escape)
  }, [onFechar])

  const numero = normalizaNumero(telefone)

  async function salvar() {
    if (!numero || salvando) return
    setSalvando(true)
    setErro(null)
    try {
      const novo = await criaLeadManual({
        telefone: numero,
        nome: nome.trim() || null,
        cidade: cidade.trim() || null,
        tipo: tipo || null,
        origem,
      })
      onCriado(novo)
    } catch (e) {
      // criaLeadManual já traduz o número duplicado numa frase legível
      setErro(e.message)
      setSalvando(false)
    }
  }

  return (
    <div className="modal-fundo" onMouseDown={(e) => e.target === e.currentTarget && onFechar()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Cadastrar lead">
        <div className="modal-topo">
          <div>
            <h2>Cadastrar lead</h2>
            <p className="dica">Para quem não chegou pela Isabela.</p>
          </div>
          <button className="icone" onClick={onFechar} aria-label="Cancelar">
            <X size={18} />
          </button>
        </div>

        {erro && <div className="aviso-erro">{erro}</div>}

        <label className="campo-largo">
          Telefone
          <input
            ref={primeiro}
            className="campo"
            placeholder="(19) 99999-8888"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && salvar()}
          />
          {telefone.trim() !== '' && (
            <span className={`dica ${numero ? '' : 'txt-erro'}`}>
              {numero ? `Vai entrar como ${formataTelefone(numero)}` : 'Número incompleto'}
            </span>
          )}
        </label>

        <label className="campo-largo">
          Nome
          <input
            className="campo"
            placeholder="Opcional"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && salvar()}
          />
        </label>

        <div className="linha-campos dois">
          <label>
            Cidade
            <input
              className="campo"
              placeholder="Opcional"
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
            />
          </label>
          <label>
            Perfil
            <select className="campo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="">Não informado</option>
              <option value="CLIENTE FINAL">Cliente final</option>
              <option value="INSTALADOR">Instalador</option>
              <option value="REVENDEDOR">Revendedor</option>
            </select>
          </label>
        </div>

        <label className="campo-largo">
          De onde veio
          <select className="campo" value={origem} onChange={(e) => setOrigem(e.target.value)}>
            {ORIGENS.map((o) => (
              <option key={o.id} value={o.id}>{o.rotulo}</option>
            ))}
          </select>
          <span className="dica">
            Fica fora do relatório de retorno — lá só conta o que o Meta trouxe.
          </span>
        </label>

        <div className="modal-acoes">
          <button className="botao-secundario" onClick={onFechar}>
            Cancelar
          </button>
          <button className="botao-primario" disabled={!numero || salvando} onClick={salvar}>
            {salvando ? 'Salvando…' : 'Cadastrar'}
          </button>
        </div>
      </div>
    </div>
  )
}
