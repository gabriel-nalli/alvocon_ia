import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Upload,
  Plus,
  X,
  Image as IconeImagem,
  Loader2,
  Save,
  Trash2,
} from 'lucide-react'
import { leContatos, leContatosColados } from '../lib/planilha'
import {
  criaCampanha,
  enviaMidia,
  listaModelos,
  salvaModelo,
  apagaModelo,
  leRascunho,
  gravaRascunho,
  limpaRascunho,
} from '../lib/disparos'

const MENSAGENS_INICIAIS = [
  { tipo: 'texto', texto: '' },
  { tipo: 'texto', texto: '' },
]

// O editor guarda texto e imagem; a campanha e os modelos guardam a ordem junto.
function paraEditor(mensagens) {
  const lista = (mensagens ?? []).map((m) => ({
    tipo: m.midia_url ? 'imagem' : 'texto',
    texto: m.texto ?? '',
    midia_url: m.midia_url ?? null,
  }))
  return lista.length > 0 ? lista : MENSAGENS_INICIAIS
}

function paraSalvar(mensagens) {
  return mensagens.map((m, i) => ({
    ordem: i + 1,
    tipo: m.midia_url ? 'imagem' : 'texto',
    texto: m.texto.trim(),
    midia_url: m.midia_url ?? null,
  }))
}

export default function DisparoNovo() {
  const navigate = useNavigate()
  const arquivoRef = useRef(null)
  // pode chegar do funil (com contatos já validados) ou de uma duplicação
  // (só com as mensagens); nos dois casos o que a pessoa acabou de escolher
  // vale mais que o rascunho guardado
  const entrada = useLocation().state ?? null
  const doPipeline = entrada?.vindoDoPipeline ? entrada : null
  const rascunho = useMemo(() => (entrada ? null : leRascunho()), [entrada])

  const [nome, setNome] = useState(
    entrada?.nomeSugerido
      ? `${entrada.nomeSugerido} — ${new Date().toLocaleDateString('pt-BR')}`
      : rascunho?.nome ?? '',
  )
  const [mensagens, setMensagens] = useState(
    entrada?.mensagens
      ? paraEditor(entrada.mensagens)
      : rascunho?.mensagens
        ? paraEditor(rascunho.mensagens)
        : MENSAGENS_INICIAIS,
  )
  const [intervaloMin, setIntervaloMin] = useState(rascunho?.intervaloMin ?? 120)
  const [intervaloMax, setIntervaloMax] = useState(rascunho?.intervaloMax ?? 180)
  const [entreMensagens, setEntreMensagens] = useState(rascunho?.entreMensagens ?? 5)

  const [contatos, setContatos] = useState(doPipeline?.contatos ?? rascunho?.contatos ?? [])
  const [rejeitados, setRejeitados] = useState([])
  const [nomeArquivo, setNomeArquivo] = useState(rascunho?.nomeArquivo ?? '')
  const [colado, setColado] = useState(rascunho?.colado ?? '')
  const [restaurado, setRestaurado] = useState(Boolean(rascunho))

  const [modelos, setModelos] = useState([])
  const [modeloEscolhido, setModeloEscolhido] = useState('')

  const [erro, setErro] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [enviandoMidia, setEnviandoMidia] = useState(null)

  useEffect(() => {
    listaModelos()
      .then(setModelos)
      .catch((e) => setErro(`Não consegui carregar os modelos: ${e.message}`))
  }, [])

  // rascunho automático: só grava quando já existe algo pra perder
  useEffect(() => {
    const temConteudo =
      nome.trim() || contatos.length > 0 || mensagens.some((m) => m.texto.trim() || m.midia_url)
    const id = setTimeout(() => {
      if (!temConteudo) return limpaRascunho()
      gravaRascunho({
        nome,
        mensagens,
        contatos,
        nomeArquivo,
        colado,
        intervaloMin,
        intervaloMax,
        entreMensagens,
      })
    }, 400)
    return () => clearTimeout(id)
  }, [
    nome,
    mensagens,
    contatos,
    nomeArquivo,
    colado,
    intervaloMin,
    intervaloMax,
    entreMensagens,
  ])

  function descartaRascunho() {
    limpaRascunho()
    setNome('')
    setMensagens(MENSAGENS_INICIAIS)
    setContatos([])
    setRejeitados([])
    setNomeArquivo('')
    setColado('')
    setIntervaloMin(120)
    setIntervaloMax(180)
    setEntreMensagens(5)
    setRestaurado(false)
  }

  function atualizaMensagem(indice, campo, valor) {
    setMensagens((atual) =>
      atual.map((m, i) => (i === indice ? { ...m, [campo]: valor } : m)),
    )
  }

  function carregaModelo(id) {
    setModeloEscolhido(id)
    if (!id) return
    const modelo = modelos.find((m) => m.id === id)
    if (modelo) setMensagens(paraEditor(modelo.mensagens))
  }

  async function salvarComoModelo() {
    const sugestao = nome.trim() || 'Modelo de mensagem'
    const nomeModelo = window.prompt('Nome do modelo', sugestao)
    if (!nomeModelo?.trim()) return
    setErro(null)
    try {
      const novo = await salvaModelo({
        nome: nomeModelo.trim(),
        mensagens: paraSalvar(mensagensValidas),
      })
      setModelos((atual) => [novo, ...atual])
      setModeloEscolhido(novo.id)
    } catch (e) {
      setErro(`Não consegui salvar o modelo: ${e.message}`)
    }
  }

  async function apagarModelo() {
    const modelo = modelos.find((m) => m.id === modeloEscolhido)
    if (!modelo || !window.confirm(`Apagar o modelo "${modelo.nome}"?`)) return
    setErro(null)
    try {
      await apagaModelo(modelo.id)
      setModelos((atual) => atual.filter((m) => m.id !== modelo.id))
      setModeloEscolhido('')
    } catch (e) {
      setErro(`Não consegui apagar o modelo: ${e.message}`)
    }
  }

  async function escolheArquivo(evento) {
    const arquivo = evento.target.files?.[0]
    if (!arquivo) return
    setErro(null)
    try {
      const { aceitos, rejeitados: fora } = await leContatos(arquivo)
      setContatos(aceitos)
      setRejeitados(fora)
      setNomeArquivo(arquivo.name)
      setColado('')
      if (!nome) setNome(arquivo.name.replace(/\.[^.]+$/, ''))
    } catch (e) {
      setErro(e.message)
      setContatos([])
      setRejeitados([])
      setNomeArquivo('')
    }
  }

  function processaColado(texto) {
    setColado(texto)
    if (!texto.trim()) {
      setContatos([])
      setRejeitados([])
      return
    }
    try {
      const { aceitos, rejeitados: fora } = leContatosColados(texto)
      setContatos(aceitos)
      setRejeitados(fora)
      setNomeArquivo('')
      setErro(null)
    } catch (e) {
      setErro(e.message)
    }
  }

  async function escolheMidia(indice, evento) {
    const arquivo = evento.target.files?.[0]
    if (!arquivo) return
    setEnviandoMidia(indice)
    setErro(null)
    try {
      const url = await enviaMidia(arquivo)
      setMensagens((atual) =>
        atual.map((m, i) => (i === indice ? { ...m, tipo: 'imagem', midia_url: url } : m)),
      )
    } catch (e) {
      setErro(e.message)
    } finally {
      setEnviandoMidia(null)
    }
  }

  const mensagensValidas = mensagens.filter((m) => m.texto.trim() || m.midia_url)
  const podeSalvar = nome.trim() && contatos.length > 0 && mensagensValidas.length > 0 && !salvando

  async function salvar() {
    setSalvando(true)
    setErro(null)
    try {
      const campanha = await criaCampanha({
        nome: nome.trim(),
        mensagens: paraSalvar(mensagensValidas),
        contatos,
        travarIa: Boolean(doPipeline?.travarIa),
        intervalo: {
          min: Number(intervaloMin),
          max: Number(intervaloMax),
          entreMensagens: Number(entreMensagens),
        },
      })
      // a campanha existe: o rascunho cumpriu o papel dele
      limpaRascunho()
      navigate(`/disparos/${campanha.id}`)
    } catch (e) {
      setErro(e.message)
      setSalvando(false)
    }
  }

  return (
    <>
      <div className="filters">
        <div>
          <button className="voltar-lista" onClick={() => navigate('/disparos')}>
            <ArrowLeft size={15} /> Disparos
          </button>
          <h1 className="titulo-pagina">Novo disparo</h1>
        </div>
      </div>

      {erro && <div className="aviso-erro">{erro}</div>}

      {restaurado && (
        <div className="aviso-neutro">
          <span>
            <strong>Rascunho restaurado.</strong> É o que você tinha escrito da última vez nesta
            tela.
            {rascunho?.contatosOmitidos > 0 &&
              ` A lista de ${rascunho.contatosOmitidos} contatos era grande demais para guardar — escolha os contatos de novo.`}
          </span>
          <button className="botao-secundario" onClick={descartaRascunho}>
            Começar do zero
          </button>
        </div>
      )}

      <div className="grid-disparo">
        <div className="card bloco">
          <h2>1 · Nome</h2>
          <input
            className="campo"
            placeholder="Ex: Instaladores São Paulo — setembro"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
          <p className="dica">Só pra você identificar depois. O contato não vê isso.</p>
        </div>

        <div className="card bloco">
          <h2>2 · Mensagens</h2>
          <p className="dica">
            Enviadas nesta ordem, uma após a outra, com {entreMensagens}s entre elas. Use{' '}
            <code>{'{{nome}}'}</code> para chamar a pessoa pelo nome.
          </p>

          <div className="linha-modelos">
            <select
              className="campo"
              value={modeloEscolhido}
              onChange={(e) => carregaModelo(e.target.value)}
            >
              <option value="">
                {modelos.length ? 'Carregar modelo…' : 'Nenhum modelo salvo ainda'}
              </option>
              {modelos.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </select>
            {modeloEscolhido && (
              <button className="icone" title="Apagar este modelo" onClick={apagarModelo}>
                <Trash2 size={15} />
              </button>
            )}
            <button
              className="botao-secundario"
              disabled={mensagensValidas.length === 0}
              onClick={salvarComoModelo}
            >
              <Save size={15} /> Salvar como modelo
            </button>
          </div>

          {mensagens.map((m, i) => (
            <div className="mensagem-editor" key={i}>
              <div className="mensagem-cabecalho">
                <span>Mensagem {i + 1}</span>
                <div className="mensagem-ferramentas">
                  <label className="botao-arquivo">
                    {enviandoMidia === i ? (
                      <Loader2 size={14} className="girando" />
                    ) : (
                      <IconeImagem size={14} />
                    )}
                    {m.midia_url ? 'Trocar imagem' : 'Anexar imagem'}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      hidden
                      onChange={(e) => escolheMidia(i, e)}
                    />
                  </label>
                  {mensagens.length > 1 && (
                    <button
                      className="icone"
                      title="Remover"
                      onClick={() => setMensagens((a) => a.filter((_, j) => j !== i))}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
              {m.midia_url && (
                <div className="previa-midia">
                  <img src={m.midia_url} alt="" />
                  <button
                    className="icone"
                    onClick={() => atualizaMensagem(i, 'midia_url', null)}
                    title="Remover imagem"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
              <textarea
                className="campo"
                rows={m.midia_url ? 3 : 5}
                placeholder={m.midia_url ? 'Legenda da imagem…' : 'Escreva a mensagem…'}
                value={m.texto}
                onChange={(e) => atualizaMensagem(i, 'texto', e.target.value)}
              />
            </div>
          ))}

          <button
            className="botao-secundario"
            onClick={() => setMensagens((a) => [...a, { tipo: 'texto', texto: '' }])}
          >
            <Plus size={15} /> Adicionar mensagem
          </button>
        </div>

        <div className="card bloco">
          <h2>3 · Contatos</h2>
          {doPipeline?.vindoDoPipeline && (
            <div className="aviso-neutro" style={{ margin: 0 }}>
              <span>
                <strong>{doPipeline.contatos.length} contatos vieram do funil.</strong> A Isabela
                fica travada para eles por 48h depois do envio. Se subir uma planilha aqui, ela
                substitui essa lista.
              </span>
            </div>
          )}
          <div className="area-upload">
            <button className="botao-secundario" onClick={() => arquivoRef.current?.click()}>
              <Upload size={15} /> Escolher planilha (.csv ou .xlsx)
            </button>
            <input
              ref={arquivoRef}
              type="file"
              accept=".csv,.xlsx,.xls,.txt"
              hidden
              onChange={escolheArquivo}
            />
            {nomeArquivo && <span className="arquivo-nome">{nomeArquivo}</span>}
          </div>
          <p className="dica">
            A planilha precisa de uma coluna <strong>NUMERO</strong> (ou TELEFONE/CELULAR) e, de
            preferência, <strong>NOME</strong>. O DDI 55 é adicionado sozinho quando falta.
          </p>

          <details className="colar-lista">
            <summary>ou colar a lista à mão</summary>
            <textarea
              className="campo"
              rows={5}
              placeholder={'João, 19999998888\nMaria, 11988887777'}
              value={colado}
              onChange={(e) => processaColado(e.target.value)}
            />
          </details>

          {(contatos.length > 0 || rejeitados.length > 0) && (
            <div className="resumo-contatos">
              <div className="resumo-linha">
                <strong>{contatos.length}</strong> contatos válidos
                {rejeitados.length > 0 && (
                  <span className="txt-erro">· {rejeitados.length} descartados</span>
                )}
              </div>
              {contatos.length > 0 && (
                <div className="amostra">
                  {contatos.slice(0, 3).map((c) => (
                    <span key={c.numero}>
                      {c.nome ? `${c.nome} · ` : ''}
                      {c.numero}
                    </span>
                  ))}
                  {contatos.length > 3 && <span className="txt-muted">e mais {contatos.length - 3}…</span>}
                </div>
              )}
              {rejeitados.length > 0 && (
                <details className="descartados">
                  <summary>Ver os {rejeitados.length} descartados</summary>
                  <ul>
                    {rejeitados.slice(0, 50).map((r, i) => (
                      <li key={i}>
                        linha {r.linha}: <code>{r.valor}</code> — {r.motivo}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>

        <div className="card bloco">
          <h2>4 · Ritmo</h2>
          <p className="dica">
            Intervalo sorteado entre um contato e o próximo. Mexer nisso pra baixo aumenta o risco
            de bloqueio do número.
          </p>
          <div className="linha-campos">
            <label>
              Mínimo (s)
              <input
                className="campo"
                type="number"
                min="0"
                value={intervaloMin}
                onChange={(e) => setIntervaloMin(e.target.value)}
              />
            </label>
            <label>
              Máximo (s)
              <input
                className="campo"
                type="number"
                min={intervaloMin}
                value={intervaloMax}
                onChange={(e) => setIntervaloMax(e.target.value)}
              />
            </label>
            <label>
              Entre mensagens (s)
              <input
                className="campo"
                type="number"
                min="0"
                value={entreMensagens}
                onChange={(e) => setEntreMensagens(e.target.value)}
              />
            </label>
          </div>
        </div>
      </div>

      <div className="rodape-acoes">
        <button className="botao-secundario" onClick={() => navigate('/disparos')}>
          Cancelar
        </button>
        <button className="botao-primario" disabled={!podeSalvar} onClick={salvar}>
          {salvando ? 'Salvando…' : `Criar disparo com ${contatos.length} contatos`}
        </button>
      </div>
    </>
  )
}
