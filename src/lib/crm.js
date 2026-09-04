import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../supabase'
import { normalizaNumero } from './planilha'

const PAGINA = 1000

// O funil continua de onde a Isabela para. 'novo' e 'qualificado' são dela;
// daí pra frente é gente marcando.
export const ETAPAS = [
  { id: 'novo', rotulo: 'Novo', cor: '#8a8a98', ajuda: 'chegou pelo anúncio, ainda não qualificou' },
  { id: 'qualificado', rotulo: 'Qualificado', cor: '#2f80ed', ajuda: 'a IA terminou o script' },
  { id: 'orcamento', rotulo: 'Orçamento enviado', cor: '#9b6dff', ajuda: 'já recebeu preço' },
  { id: 'negociando', rotulo: 'Negociando', cor: '#e59b00', ajuda: 'conversa em andamento' },
  { id: 'aguardando_pagamento', rotulo: 'Aguardando pagamento', cor: '#00b3c7', ajuda: 'fechou, falta pagar' },
  { id: 'vendido', rotulo: 'Vendido', cor: '#18b886', ajuda: 'dinheiro na conta' },
  { id: 'perdido', rotulo: 'Perdido', cor: '#e3452f', ajuda: 'não vai fechar' },
]

export const ETAPA_POR_ID = Object.fromEntries(ETAPAS.map((e) => [e.id, e]))

export const MOTIVOS_PERDA = [
  'Achou caro',
  'Comprou de outro',
  'Não respondeu mais',
  'Fora da área de entrega',
  'Só pesquisando preço',
  'Número errado / não é WhatsApp',
  'Outro',
]

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

export function useCrmLeads() {
  const [estado, setEstado] = useState({ leads: [], carregando: true, erro: null })
  const timer = useRef(null)

  const carrega = useCallback(async () => {
    try {
      const leads = await buscaTudo(() =>
        supabase.from('crm_leads').select('*').order('chegou_em', { ascending: false }),
      )
      setEstado({ leads, carregando: false, erro: null })
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
      .channel('painel-crm')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_leads' }, agenda)
      .subscribe()
    const reserva = setInterval(carrega, 30000)
    return () => {
      supabase.removeChannel(canal)
      clearInterval(reserva)
      clearTimeout(timer.current)
    }
  }, [carrega])

  return { ...estado, recarrega: carrega }
}

export function useHistorico(leadId) {
  const [eventos, setEventos] = useState([])

  useEffect(() => {
    if (!leadId) {
      setEventos([])
      return
    }
    let vivo = true
    const carrega = async () => {
      const { data } = await supabase
        .from('crm_eventos')
        .select('*')
        .eq('lead_id', leadId)
        .order('criado_em', { ascending: false })
      if (vivo) setEventos(data ?? [])
    }
    carrega()
    const canal = supabase
      .channel(`crm-eventos-${leadId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'crm_eventos', filter: `lead_id=eq.${leadId}` },
        carrega,
      )
      .subscribe()
    return () => {
      vivo = false
      supabase.removeChannel(canal)
    }
  }, [leadId])

  return eventos
}

export async function salvaLead(id, campos) {
  const { error } = await supabase.from('crm_leads').update(campos).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function anotaObservacao(leadId, texto) {
  const { error } = await supabase
    .from('crm_eventos')
    .insert({ lead_id: leadId, tipo: 'nota', descricao: texto })
  if (error) throw new Error(error.message)
}

// Lead que não veio da IA (ligou direto, indicação). Origem separada pra não
// entrar na conta do Meta.
export async function criaLeadManual({ telefone, nome, origem = 'manual' }) {
  const numero = normalizaNumero(telefone)
  if (!numero) throw new Error('Número inválido. Use DDD + número, ex: 19 99999-8888.')

  const { data, error } = await supabase
    .from('crm_leads')
    .insert({ telefone: numero, nome: nome || null, origem, chegou_em: new Date().toISOString() })
    .select()
    .single()
  if (error) {
    if (error.code === '23505') throw new Error('Esse número já está no CRM.')
    throw new Error(error.message)
  }
  await supabase
    .from('crm_eventos')
    .insert({ lead_id: data.id, tipo: 'entrada', descricao: 'Cadastrado à mão no painel' })
  return data
}

// Busca que entende número solto: colar "(19) 99999-8888" acha 5519999998888.
// É o fluxo "saiu venda no Meta, pego o número e marco".
export function filtraLeads(leads, busca, etapa) {
  let lista = leads
  if (etapa && etapa !== 'todos') lista = lista.filter((l) => l.etapa === etapa)

  const q = busca.trim().toLowerCase()
  if (!q) return lista

  const comoNumero = normalizaNumero(q)
  if (comoNumero) {
    const exatos = lista.filter((l) => l.telefone === comoNumero)
    if (exatos.length) return exatos
  }

  const soDigitos = q.replace(/\D/g, '')
  return lista.filter((l) => {
    if (soDigitos.length >= 4 && l.telefone.includes(soDigitos)) return true
    return [l.nome, l.nome_perfil, l.cidade, l.observacoes, ...(l.etiquetas ?? [])]
      .filter(Boolean)
      .some((campo) => String(campo).toLowerCase().includes(q))
  })
}

export function formataDinheiro(valor) {
  if (valor == null || valor === '') return '—'
  return Number(valor).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 2,
  })
}

export function formataTelefone(numero) {
  const d = String(numero ?? '')
  if (d.length === 13) return `(${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`
  if (d.length === 12) return `(${d.slice(2, 4)}) ${d.slice(4, 8)}-${d.slice(8)}`
  return numero
}
