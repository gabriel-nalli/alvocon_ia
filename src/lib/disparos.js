import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../supabase'

const PAGINA = 1000

// URL do webhook do n8n que roda a fila. O painel só avisa "comecei"; toda a
// lógica de envio e o ritmo do anti-ban vivem no n8n.
const URL_N8N = import.meta.env.VITE_N8N_DISPARO_URL

export const ROTULO_STATUS = {
  rascunho: 'Rascunho',
  rodando: 'Enviando',
  pausado: 'Pausado',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
}

export const ROTULO_CONTATO = {
  pendente: 'Na fila',
  enviando: 'Enviando',
  enviado: 'Entregue',
  erro: 'Falhou',
}

async function buscaTudo(montaQuery) {
  const linhas = []
  for (let de = 0; ; de += PAGINA) {
    const { data, error } = await montaQuery().range(de, de + PAGINA - 1)
    if (error) throw new Error(error.message)
    linhas.push(...(data ?? []))
    if (!data || data.length < PAGINA) break
  }
  return linhas
}

// ---------- criação ----------

export async function enviaMidia(arquivo) {
  const extensao = arquivo.name.split('.').pop().toLowerCase()
  const caminho = `${crypto.randomUUID()}.${extensao}`
  const { error } = await supabase.storage
    .from('disparo-midia')
    .upload(caminho, arquivo, { cacheControl: '31536000', upsert: false })
  if (error) throw new Error(`Não consegui subir a imagem: ${error.message}`)
  const { data } = supabase.storage.from('disparo-midia').getPublicUrl(caminho)
  return data.publicUrl
}

export async function criaCampanha({ nome, mensagens, contatos, intervalo, travarIa = false }) {
  const { data: campanha, error } = await supabase
    .from('disparo_campanhas')
    .insert({
      nome,
      mensagens,
      status: 'rascunho',
      travar_ia: travarIa,
      intervalo_min: intervalo.min,
      intervalo_max: intervalo.max,
      intervalo_mensagens: intervalo.entreMensagens,
    })
    .select()
    .single()
  if (error) throw new Error(error.message)

  // o insert vai em blocos pra não estourar o limite de payload da API
  for (let i = 0; i < contatos.length; i += 500) {
    const bloco = contatos.slice(i, i + 500).map((c) => ({
      campanha_id: campanha.id,
      nome: c.nome,
      numero: c.numero,
      crm_lead_id: c.crm_lead_id ?? null,
    }))
    const { error: erroContatos } = await supabase.from('disparo_contatos').insert(bloco)
    if (erroContatos) {
      // sem contatos a campanha não serve pra nada; não deixa lixo pra trás
      await supabase.from('disparo_campanhas').delete().eq('id', campanha.id)
      throw new Error(`Falha ao gravar os contatos: ${erroContatos.message}`)
    }
  }

  return campanha
}

// ---------- controle ----------

async function acordaN8n(campanhaId) {
  if (!URL_N8N) {
    throw new Error(
      'Configure VITE_N8N_DISPARO_URL com o webhook do n8n para o disparo começar.',
    )
  }
  const resposta = await fetch(URL_N8N, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ campanha_id: campanhaId }),
  })
  if (!resposta.ok) {
    throw new Error(`O n8n respondeu ${resposta.status}. O disparo não começou.`)
  }
}

export async function iniciaCampanha(campanhaId) {
  const { error } = await supabase
    .from('disparo_campanhas')
    .update({ status: 'rodando', erro: null })
    .eq('id', campanhaId)
    .in('status', ['rascunho', 'pausado'])
  if (error) throw new Error(error.message)
  await acordaN8n(campanhaId)
}

// Pausar e cancelar são só uma troca de status: o n8n confere a cada contato e
// encerra o loop sozinho na volta seguinte, sem execução travada pela metade.
export async function pausaCampanha(campanhaId) {
  const { error } = await supabase
    .from('disparo_campanhas')
    .update({ status: 'pausado' })
    .eq('id', campanhaId)
    .eq('status', 'rodando')
  if (error) throw new Error(error.message)
}

export async function cancelaCampanha(campanhaId) {
  const { error } = await supabase
    .from('disparo_campanhas')
    .update({ status: 'cancelado', concluido_em: new Date().toISOString() })
    .eq('id', campanhaId)
    .in('status', ['rascunho', 'rodando', 'pausado'])
  if (error) throw new Error(error.message)
}

export async function apagaCampanha(campanhaId) {
  const { error } = await supabase.from('disparo_campanhas').delete().eq('id', campanhaId)
  if (error) throw new Error(error.message)
}

// ---------- leitura ----------

// Lista das campanhas com a contagem por status, ao vivo.
export function useCampanhas() {
  const [estado, setEstado] = useState({ campanhas: [], carregando: true, erro: null })
  const timer = useRef(null)

  const carrega = useCallback(async () => {
    try {
      const [campanhas, progresso] = await Promise.all([
        buscaTudo(() =>
          supabase.from('disparo_campanhas').select('*').order('criado_em', { ascending: false }),
        ),
        buscaTudo(() => supabase.from('disparo_progresso').select('*')),
      ])
      const porId = new Map(progresso.map((p) => [p.campanha_id, p]))
      setEstado({
        campanhas: campanhas.map((c) => ({ ...c, progresso: porId.get(c.id) ?? null })),
        carregando: false,
        erro: null,
      })
    } catch (e) {
      setEstado((s) => ({ ...s, carregando: false, erro: e.message }))
    }
  }, [])

  useEffect(() => {
    carrega()
    const agenda = () => {
      clearTimeout(timer.current)
      timer.current = setTimeout(carrega, 400)
    }
    const canal = supabase
      .channel('painel-disparos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'disparo_campanhas' }, agenda)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'disparo_contatos' }, agenda)
      .subscribe()
    const reserva = setInterval(carrega, 15000)
    return () => {
      supabase.removeChannel(canal)
      clearInterval(reserva)
      clearTimeout(timer.current)
    }
  }, [carrega])

  return { ...estado, recarrega: carrega }
}

// Uma campanha e seus contatos, ao vivo — é esta tela que fica aberta enquanto
// o disparo roda, então o refresh de reserva é mais curto.
export function useCampanha(campanhaId) {
  const [estado, setEstado] = useState({
    campanha: null,
    contatos: [],
    carregando: true,
    erro: null,
  })
  const timer = useRef(null)

  const carrega = useCallback(async () => {
    if (!campanhaId) return
    try {
      const [{ data: campanha, error }, contatos] = await Promise.all([
        supabase.from('disparo_campanhas').select('*').eq('id', campanhaId).maybeSingle(),
        buscaTudo(() =>
          supabase
            .from('disparo_contatos')
            .select('*')
            .eq('campanha_id', campanhaId)
            .order('id', { ascending: true }),
        ),
      ])
      if (error) throw new Error(error.message)
      setEstado({ campanha, contatos, carregando: false, erro: null })
    } catch (e) {
      setEstado((s) => ({ ...s, carregando: false, erro: e.message }))
    }
  }, [campanhaId])

  useEffect(() => {
    carrega()
    const agenda = () => {
      clearTimeout(timer.current)
      timer.current = setTimeout(carrega, 400)
    }
    const canal = supabase
      .channel(`painel-disparo-${campanhaId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'disparo_contatos', filter: `campanha_id=eq.${campanhaId}` },
        agenda,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'disparo_campanhas', filter: `id=eq.${campanhaId}` },
        agenda,
      )
      .subscribe()
    const reserva = setInterval(carrega, 10000)
    return () => {
      supabase.removeChannel(canal)
      clearInterval(reserva)
      clearTimeout(timer.current)
    }
  }, [carrega, campanhaId])

  return estado
}

export function contaPorStatus(contatos) {
  const base = { pendente: 0, enviando: 0, enviado: 0, erro: 0 }
  for (const c of contatos) base[c.status] = (base[c.status] ?? 0) + 1
  return { ...base, total: contatos.length }
}

// Estimativa de quanto falta, usando o mesmo intervalo que o n8n sorteia.
export function tempoRestante(campanha, pendentes) {
  if (!campanha || !pendentes) return null
  const porContato =
    (campanha.intervalo_min + campanha.intervalo_max) / 2 +
    campanha.intervalo_mensagens * Math.max(0, (campanha.mensagens?.length ?? 1) - 1)
  const segundos = pendentes * porContato
  const horas = Math.floor(segundos / 3600)
  const minutos = Math.round((segundos % 3600) / 60)
  if (horas === 0) return `~${minutos} min`
  return `~${horas}h${String(minutos).padStart(2, '0')}`
}
