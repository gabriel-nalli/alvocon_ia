// Cálculo das métricas do funil a partir das linhas do banco.
// A etapa_atual do lead é a pergunta do script que ele tem pendente:
// inicio -> aguardando_nome -> aguardando_cidade -> aguardando_tipo -> aguardando_metragem -> qualificado

import { inicioDoDia, fimDoDia, somaDias, totalDeDias } from './periodo'

const DIA_MS = 24 * 60 * 60 * 1000

const ORDEM = {
  inicio: 0,
  conversando: 1, // respondeu algo fora do padrão; já interagiu
  aguardando_nome: 1,
  aguardando_cidade: 2,
  aguardando_tipo: 3,
  aguardando_metragem: 4,
  qualificado: 5,
}

export const ETAPAS_FUNIL = [
  { nivel: 0, rotulo: 'Clicou no anúncio' },
  { nivel: 1, rotulo: 'Recebeu a 1ª resposta da IA' },
  { nivel: 2, rotulo: 'Informou o nome' },
  { nivel: 3, rotulo: 'Informou a cidade' },
  { nivel: 4, rotulo: 'Informou o perfil' },
  { nivel: 5, rotulo: 'Qualificado (pronto pra Isa)' },
]

export const ETAPA_PARADO = {
  inicio: 'Não respondeu nada',
  conversando: 'Em conversa',
  aguardando_nome: 'Parou na pergunta do nome',
  aguardando_cidade: 'Parou na pergunta da cidade',
  aguardando_tipo: 'Parou na pergunta do perfil',
  aguardando_metragem: 'Parou na pergunta da metragem',
}

export function nivelDoLead(lead) {
  if (lead.status === 'qualificado') return 5
  return ORDEM[lead.etapa_atual] ?? 0
}

// Mantém só as linhas cujo `campo` cai dentro do intervalo (bordas incluídas).
// Linhas sem data ficam de fora de qualquer recorte — não dá pra afirmar que
// pertencem ao período.
export function filtraPorIntervalo(linhas, campo, intervalo) {
  const { inicio, fim } = intervalo ?? {}
  if (!inicio && !fim) return linhas
  const de = inicio ? inicio.getTime() : -Infinity
  const ate = fim ? fim.getTime() : Infinity
  return linhas.filter((l) => {
    if (!l[campo]) return false
    const t = new Date(l[campo]).getTime()
    return t >= de && t <= ate
  })
}

export function funil(leads) {
  return ETAPAS_FUNIL.map((etapa) => ({
    ...etapa,
    total: leads.filter((l) => nivelDoLead(l) >= etapa.nivel).length,
  }))
}

export function paradosPorEtapa(leads) {
  const naoQualificados = leads.filter((l) => l.status !== 'qualificado')
  const grupos = {}
  for (const lead of naoQualificados) {
    const chave = ETAPA_PARADO[lead.etapa_atual] ?? 'Em conversa'
    grupos[chave] = (grupos[chave] ?? 0) + 1
  }
  return Object.entries(grupos)
    .map(([rotulo, total]) => ({ rotulo, total }))
    .sort((a, b) => b.total - a.total)
}

export function normalizaTipo(tipo) {
  const t = String(tipo ?? '').toUpperCase()
  if (t.includes('FINAL')) return 'Cliente final'
  if (t.includes('INSTALADOR')) return 'Instalador'
  if (t.includes('REVENDEDOR')) return 'Revendedor'
  return 'Não informado'
}

export function porTipo(leads) {
  const ordem = ['Cliente final', 'Instalador', 'Revendedor', 'Não informado']
  const grupos = { 'Cliente final': 0, Instalador: 0, Revendedor: 0, 'Não informado': 0 }
  for (const lead of leads) grupos[normalizaTipo(lead.tipo)] += 1
  return ordem.map((rotulo) => ({ rotulo, total: grupos[rotulo] }))
}

// "Tudo" não tem borda: o intervalo real vai do lead mais antigo até hoje.
function intervaloEfetivo(leads, intervalo) {
  const { inicio, fim } = intervalo ?? {}
  if (inicio && fim) return { inicio: inicioDoDia(inicio), fim: fimDoDia(fim) }
  const datas = leads.map((l) => l.criado_em).filter(Boolean).map((d) => new Date(d).getTime())
  const maisAntigo = datas.length ? new Date(Math.min(...datas)) : new Date()
  return { inicio: inicioDoDia(maisAntigo), fim: fimDoDia(new Date()) }
}

// Série do gráfico "Leads por dia", sempre cobrindo exatamente o intervalo
// selecionado. Acima de 62 dias os pontos passam a ser semanais, senão o eixo
// vira uma tarja ilegível em períodos longos.
export function serieDeLeads(leads, intervalo) {
  const { inicio, fim } = intervaloEfetivo(leads, intervalo)
  const passo = totalDeDias(inicio, fim) > 62 ? 7 : 1

  const pontos = []
  for (let dia = inicio; dia <= fim; dia = somaDias(dia, passo)) {
    pontos.push({
      inicio: dia,
      rotulo: dia.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      leads: 0,
    })
  }

  for (const lead of leads) {
    if (!lead.criado_em) continue
    const t = new Date(lead.criado_em)
    if (t < inicio || t > fim) continue
    // arredonda porque a diferença entre dois inícios de dia pode não ser um
    // múltiplo exato de 24h (horário de verão)
    const diaDoLead = Math.round((inicioDoDia(t) - inicio) / DIA_MS)
    const ponto = pontos[Math.floor(diaDoLead / passo)]
    if (ponto) ponto.leads += 1
  }

  return { pontos, passo }
}
