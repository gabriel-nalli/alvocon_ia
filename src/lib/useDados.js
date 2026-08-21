import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../supabase'

// A API do Supabase devolve no máximo 1000 linhas por requisição (limite
// "Max rows" do projeto), independente do .limit() pedido. Por isso as
// consultas são feitas em páginas de 1000 até esgotar — senão os leads e
// mensagens mais recentes ficam de fora assim que a tabela passa de 1000.
const PAGINA = 1000

async function buscaTudo(montaQuery) {
  const linhas = []
  for (let de = 0; ; de += PAGINA) {
    const { data, error } = await montaQuery().range(de, de + PAGINA - 1)
    if (error) return { data: linhas, error }
    linhas.push(...(data ?? []))
    if (!data || data.length < PAGINA) break
  }
  return { data: linhas, error: null }
}

// Carrega leads e mensagens; assina o Realtime das tabelas e mantém um
// refresh de reserva a cada 30s caso o websocket caia.
export function useDados() {
  const [dados, setDados] = useState({
    leads: [],
    mensagens: [],
    carregando: true,
    erro: null,
  })
  const timer = useRef(null)

  const carrega = useCallback(async () => {
    // o segundo .order() desempata linhas com o mesmo criado_em, pra paginação ser estável
    const [leads, mensagens] = await Promise.all([
      buscaTudo(() =>
        supabase
          .from('isabela_leads')
          .select('*')
          .order('criado_em', { ascending: false })
          .order('telefone', { ascending: true }),
      ),
      buscaTudo(() =>
        supabase
          .from('isabela_mensagens')
          .select('*')
          .order('criado_em', { ascending: true })
          .order('id', { ascending: true }),
      ),
    ])
    const erro = leads.error || mensagens.error
    setDados({
      leads: leads.data ?? [],
      mensagens: mensagens.data ?? [],
      carregando: false,
      erro: erro ? erro.message : null,
    })
  }, [])

  useEffect(() => {
    carrega()
    // agrupa rajadas de eventos do Realtime num único refetch
    const agenda = () => {
      clearTimeout(timer.current)
      timer.current = setTimeout(carrega, 400)
    }
    const canal = supabase
      .channel('painel-isabela')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'isabela_leads' }, agenda)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'isabela_mensagens' }, agenda)
      .subscribe()
    const reserva = setInterval(carrega, 30000)
    return () => {
      supabase.removeChannel(canal)
      clearInterval(reserva)
      clearTimeout(timer.current)
    }
  }, [carrega])

  return dados
}
