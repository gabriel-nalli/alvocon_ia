import Papa from 'papaparse'
import lerExcel from 'read-excel-file/browser'

// Leitura de listas de contatos vindas de CSV ou Excel.
//
// Número mal formatado é a causa mais comum de disparo que falha em massa: a
// planilha vem com "(19) 99999-9999", com o 55 faltando, ou com o nono dígito
// que a operadora não usa. Tudo isso é normalizado aqui, antes de gravar —
// e o que não dá pra salvar é devolvido como rejeitado, com o motivo, pra
// aparecer na tela em vez de virar erro no meio do envio.

const COLUNAS_NOME = ['nome', 'name', 'contato', 'cliente', 'razao social', 'razão social']
const COLUNAS_NUMERO = ['numero', 'número', 'telefone', 'celular', 'whatsapp', 'fone', 'phone']

function achaColuna(cabecalhos, candidatos) {
  const normalizado = (s) => String(s ?? '').trim().toLowerCase()
  const indice = cabecalhos.findIndex((c) => candidatos.includes(normalizado(c)))
  return indice === -1 ? null : indice
}

// Aceita o que vier e devolve só dígitos com DDI: 5519999999999.
// Retorna null quando não dá pra confiar no resultado.
export function normalizaNumero(bruto) {
  let d = String(bruto ?? '').replace(/\D/g, '')
  if (!d) return null

  // planilha do Excel às vezes entrega o número como notação científica
  if (/e\+/i.test(String(bruto))) return null

  // tira zeros de discagem nacional e o 0800 nunca é WhatsApp
  if (d.startsWith('0')) d = d.replace(/^0+/, '')

  // já veio com DDI do Brasil
  if (d.length === 12 || d.length === 13) {
    if (!d.startsWith('55')) return null
    return d
  }
  // veio só com DDD + número
  if (d.length === 10 || d.length === 11) return `55${d}`

  return null
}

function montaLinhas(cabecalhos, linhas) {
  const iNome = achaColuna(cabecalhos, COLUNAS_NOME)
  const iNumero = achaColuna(cabecalhos, COLUNAS_NUMERO)

  if (iNumero === null) {
    const achadas = cabecalhos.filter(Boolean).join(', ') || '(nenhuma)'
    throw new Error(
      `Não achei a coluna do telefone. Renomeie uma coluna para "NUMERO" ou "TELEFONE". Colunas encontradas: ${achadas}`,
    )
  }

  const aceitos = []
  const rejeitados = []
  const vistos = new Set()

  linhas.forEach((linha, i) => {
    const bruto = linha[iNumero]
    const nome = iNome === null ? '' : String(linha[iNome] ?? '').trim()
    if (bruto === undefined || bruto === null || String(bruto).trim() === '') return

    const numero = normalizaNumero(bruto)
    if (!numero) {
      rejeitados.push({ linha: i + 2, valor: String(bruto), motivo: 'número inválido' })
      return
    }
    if (vistos.has(numero)) {
      rejeitados.push({ linha: i + 2, valor: String(bruto), motivo: 'repetido na planilha' })
      return
    }
    vistos.add(numero)
    aceitos.push({ nome: nome || null, numero })
  })

  return { aceitos, rejeitados }
}

async function leCsv(arquivo) {
  const texto = await arquivo.text()
  const { data, errors } = Papa.parse(texto.trim(), { skipEmptyLines: true })
  if (errors.length && !data.length) throw new Error(`CSV inválido: ${errors[0].message}`)
  if (!data.length) throw new Error('A planilha está vazia.')
  const [cabecalhos, ...linhas] = data
  return montaLinhas(cabecalhos, linhas)
}

async function leXlsx(arquivo) {
  const data = await lerExcel(arquivo)
  if (!data.length) throw new Error('A planilha está vazia.')
  const [cabecalhos, ...linhas] = data
  return montaLinhas(cabecalhos, linhas)
}

export async function leContatos(arquivo) {
  const nome = arquivo.name.toLowerCase()
  if (nome.endsWith('.csv') || nome.endsWith('.txt')) return leCsv(arquivo)
  if (nome.endsWith('.xlsx') || nome.endsWith('.xls')) return leXlsx(arquivo)
  throw new Error('Formato não suportado. Use .csv ou .xlsx.')
}

// Lista colada direto no campo de texto: uma por linha, "nome, numero" ou só o
// número.
export function leContatosColados(texto) {
  const linhas = texto
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const partes = l.split(/[,;\t]/)
      return partes.length > 1 ? [partes[0], partes.slice(1).join('')] : ['', partes[0]]
    })
  return montaLinhas(['nome', 'numero'], linhas)
}
