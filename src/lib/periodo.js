// Modelo de período do painel: um intervalo fechado [inicio, fim] em horário
// local, sempre alinhado às bordas do dia (00:00:00.000 e 23:59:59.999).
//
// Os presets são derivados desse mesmo modelo, então o texto que aparece no
// chip e o filtro que roda de fato nunca divergem — era o que acontecia antes,
// quando o chip anunciava "22/07" mas o corte era em 22/07 no horário atual.

const DIA_MS = 24 * 60 * 60 * 1000

export const PRESETS = [
  { id: 'hoje', rotulo: 'Hoje', dias: 1 },
  { id: '7d', rotulo: '7 dias', dias: 7 },
  { id: '30d', rotulo: '30 dias', dias: 30 },
  { id: 'tudo', rotulo: 'Tudo', dias: null },
]

export const INTERVALO_TUDO = { inicio: null, fim: null }

export function inicioDoDia(data) {
  const d = new Date(data)
  d.setHours(0, 0, 0, 0)
  return d
}

export function fimDoDia(data) {
  const d = new Date(data)
  d.setHours(23, 59, 59, 999)
  return d
}

export function somaDias(data, n) {
  const d = new Date(data)
  d.setDate(d.getDate() + n)
  return d
}

// Quantos dias de calendário o intervalo cobre, contando as duas pontas.
export function totalDeDias(inicio, fim) {
  return Math.round((inicioDoDia(fim) - inicioDoDia(inicio)) / DIA_MS) + 1
}

// "30 dias" = os últimos 30 dias de calendário, hoje incluído.
export function intervaloDoPreset(dias) {
  if (dias == null) return INTERVALO_TUDO
  const hoje = new Date()
  return { inicio: inicioDoDia(somaDias(hoje, -(dias - 1))), fim: fimDoDia(hoje) }
}

export function mesmoDia(a, b) {
  if (!a || !b) return a === b
  return inicioDoDia(a).getTime() === inicioDoDia(b).getTime()
}

function mesmoIntervalo(a, b) {
  return mesmoDia(a.inicio, b.inicio) && mesmoDia(a.fim, b.fim)
}

// Qual pílula deve aparecer ativa. 'personalizado' quando o intervalo veio do
// calendário e não bate com nenhum preset.
export function presetDoIntervalo(intervalo) {
  const achado = PRESETS.find((p) => mesmoIntervalo(intervaloDoPreset(p.dias), intervalo))
  return achado ? achado.id : 'personalizado'
}

export function formataDia(data) {
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function formataIntervalo({ inicio, fim }) {
  if (!inicio || !fim) return 'Todo o período'
  if (mesmoDia(inicio, fim)) return formataDia(inicio)
  return `${formataDia(inicio)} – ${formataDia(fim)}`
}

// Normaliza um par de datas clicadas no calendário (em qualquer ordem) num
// intervalo válido, já alinhado às bordas do dia.
export function montaIntervalo(a, b) {
  const [ini, f] = a <= b ? [a, b] : [b, a]
  return { inicio: inicioDoDia(ini), fim: fimDoDia(f) }
}
