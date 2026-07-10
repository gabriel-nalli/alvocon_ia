import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../supabase'

// Carrega leads, mensagens e eventos; assina o Realtime das 3 tabelas e
// mantém um refresh de reserva a cada 30s caso o websocket caia.
export function useDados() {
  const [dados, setDados] = useState({
    leads: [],
    mensagens: [],
    eventos: [],
    carregando: true,
    erro: null,
  })
  const timer = useRef(null)

  const carrega = useCallback(async () => {
    const [leads, mensagens, eventos] = await Promise.all([
      supabase.from('isabela_leads').select('*').order('criado_em', { ascending: false }).limit(2000),
      supabase.from('isabela_mensagens').select('*').order('criado_em', { ascending: true }).limit(10000),
      supabase.from('isabela_eventos').select('id, telefone, evento, criado_em').order('criado_em', { ascending: false }).limit(10000),
    ])
    const erro = leads.error || mensagens.error || eventos.error
    setDados({
      leads: leads.data ?? [],
      mensagens: mensagens.data ?? [],
      eventos: eventos.data ?? [],
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'isabela_eventos' }, agenda)
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
