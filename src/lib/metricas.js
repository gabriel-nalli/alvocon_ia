// Cálculo das métricas do funil a partir das linhas do banco.
// A etapa_atual do lead é a pergunta do script que ele tem pendente:
// inicio -> aguardando_nome -> aguardando_cidade -> aguardando_tipo -> aguardando_metragem -> qualificado

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
  { nivel: 0, rotulo: 'Entrou pela whitelist' },
  { nivel: 1, rotulo: 'Recebeu a 1ª resposta da IA' },
  { nivel: 2, rotulo: 'Informou o nome' },
  { nivel: 3, rotulo: 'Informou a cidade' },
  { nivel: 4, rotulo: 'Informou o perfil' },
  { nivel: 5, rotulo: 'Qualificado (handoff)' },
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

export function filtraPorPeriodo(linhas, campo, dias) {
  if (dias == null) return linhas
  const corte = Date.now() - dias * 24 * 60 * 60 * 1000
  return linhas.filter((l) => l[campo] && new Date(l[campo]).getTime() >= corte)
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

export function porDia(leads, dias = 14) {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const serie = []
  for (let i = dias - 1; i >= 0; i--) {
    const dia = new Date(hoje.getTime() - i * 24 * 60 * 60 * 1000)
    const proximo = new Date(dia.getTime() + 24 * 60 * 60 * 1000)
    const doDia = (campo) => (l) => {
      if (!l[campo]) return false
      const t = new Date(l[campo]).getTime()
      return t >= dia.getTime() && t < proximo.getTime()
    }
    serie.push({
      dia,
      rotulo: dia.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      leads: leads.filter(doDia('criado_em')).length,
      qualificados: leads.filter(doDia('qualificado_em')).length,
    })
  }
  return serie
}

export function contaEventos(eventos, nome, dias) {
  const noPeriodo = filtraPorPeriodo(eventos, 'criado_em', dias)
  return noPeriodo.filter((e) => e.evento === nome).length
}
