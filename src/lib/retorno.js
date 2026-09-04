import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../supabase'

// Retorno do Meta, semana a semana.
//
// A verba entra toda segunda e dura até sexta, então a semana é a unidade.
// E a atribuição é sempre pela semana em que o lead CHEGOU: um lead de julho
// que fecha em setembro conta para julho, porque foi o julho que pagou para
// trazê-lo. Medir pela data da venda faria a verba antiga parecer desperdício
// e a nova parecer milagre.

export function useRetorno() {
  const [estado, setEstado] = useState({ semanas: [], carregando: true, erro: null })
  const timer = useRef(null)

  const carrega = useCallback(async () => {
    const { data, error } = await supabase
      .from('crm_retorno_semanal')
      .select('*')
      .order('semana', { ascending: false })
    if (error) {
      setEstado((s) => ({ ...s, carregando: false, erro: error.message }))
      return
    }
    setEstado({ semanas: data ?? [], carregando: false, erro: null })
  }, [])

  useEffect(() => {
    carrega()
    const agenda = () => {
      clearTimeout(timer.current)
      timer.current = setTimeout(carrega, 500)
    }
    const canal = supabase
      .channel('painel-retorno')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_leads' }, agenda)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_investimentos' }, agenda)
      .subscribe()
    return () => {
      supabase.removeChannel(canal)
      clearTimeout(timer.current)
    }
  }, [carrega])

  return estado
}

export async function salvaInvestimento(semana, valor) {
  const { error } = await supabase
    .from('crm_investimentos')
    .upsert(
      { semana_inicio: semana, valor: Number(valor) || 0, atualizado_em: new Date().toISOString() },
      { onConflict: 'semana_inicio' },
    )
  if (error) throw new Error(error.message)
}

// Semana com R$250 e 2 leads não significa que o anúncio é ruim — significa
// que 2 leads é amostra pequena demais para concluir qualquer coisa. Somar
// 4 semanas tira o ruído sem esconder tendência.
export function agregaMes(semanas) {
  const meses = new Map()
  for (const s of semanas) {
    const d = new Date(`${s.semana}T12:00:00`)
    const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const atual = meses.get(chave) ?? {
      chave,
      rotulo: d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
      investimento: 0, leads: 0, qualificados: 0, orcamentos: 0,
      vendas: 0, perdidos: 0, faturamento: 0, em_aberto: 0, semanas: 0,
    }
    atual.investimento += Number(s.investimento || 0)
    atual.leads += s.leads
    atual.qualificados += s.qualificados
    atual.orcamentos += s.orcamentos
    atual.vendas += s.vendas
    atual.perdidos += s.perdidos
    atual.faturamento += Number(s.faturamento || 0)
    atual.em_aberto += Number(s.em_aberto || 0)
    atual.semanas += 1
    meses.set(chave, atual)
  }
  return [...meses.values()].map(derivados).sort((a, b) => b.chave.localeCompare(a.chave))
}

export function derivados(linha) {
  const inv = Number(linha.investimento || 0)
  const fat = Number(linha.faturamento || 0)
  return {
    ...linha,
    custo_por_lead: linha.leads ? inv / linha.leads : null,
    cac: linha.vendas ? inv / linha.vendas : null,
    ticket_medio: linha.vendas ? fat / linha.vendas : null,
    roi_pct: inv > 0 ? ((fat - inv) / inv) * 100 : null,
    conversao: linha.leads ? (linha.vendas / linha.leads) * 100 : null,
  }
}

export function totaliza(semanas) {
  const soma = semanas.reduce(
    (t, s) => ({
      investimento: t.investimento + Number(s.investimento || 0),
      leads: t.leads + s.leads,
      qualificados: t.qualificados + s.qualificados,
      orcamentos: t.orcamentos + s.orcamentos,
      vendas: t.vendas + s.vendas,
      perdidos: t.perdidos + s.perdidos,
      faturamento: t.faturamento + Number(s.faturamento || 0),
      em_aberto: t.em_aberto + Number(s.em_aberto || 0),
    }),
    { investimento: 0, leads: 0, qualificados: 0, orcamentos: 0, vendas: 0, perdidos: 0, faturamento: 0, em_aberto: 0 },
  )
  return derivados(soma)
}

export function rotuloSemana(semana) {
  const inicio = new Date(`${semana}T12:00:00`)
  const fim = new Date(inicio)
  fim.setDate(fim.getDate() + 6)
  const f = (d) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  return `${f(inicio)} a ${f(fim)}`
}

export function dinheiro(v) {
  if (v == null) return '—'
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function numero(v, casas = 2) {
  if (v == null) return '—'
  return Number(v).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })
}
