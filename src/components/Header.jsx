import { useLocation, useNavigate } from 'react-router-dom'
import { Send, UsersRound } from 'lucide-react'
import { supabase } from '../supabase'
import { Icons } from '../Icons.jsx'

export function Header() {
  const location = useLocation()
  const navigate = useNavigate()
  const emConversas = location.pathname.startsWith('/conversas')
  const emDisparos = location.pathname.startsWith('/disparos')
  const emLeads = location.pathname.startsWith('/leads')
  const emVisaoGeral = !emConversas && !emDisparos && !emLeads

  return (
    <header className="top-header">
      <div className="header-left">
        <img className="logo-header" src="/alvocon-logo.png" alt="Alvocon" />
      </div>

      <nav className="nav-tabs">
        <button className={`nav-tab ${emVisaoGeral ? 'ativo' : ''}`} onClick={() => navigate('/')}>
          <Icons.Speedometer /> Visão geral
        </button>
        <button className={`nav-tab ${emConversas ? 'ativo' : ''}`} onClick={() => navigate('/conversas')}>
          <Icons.Chat /> Conversas
        </button>
        <button className={`nav-tab ${emLeads ? 'ativo' : ''}`} onClick={() => navigate('/leads')}>
          <UsersRound size={19} /> Leads
        </button>
        <button className={`nav-tab ${emDisparos ? 'ativo' : ''}`} onClick={() => navigate('/disparos')}>
          <Send size={19} /> Disparos
        </button>
      </nav>

      <div className="header-right">
        <div className="status-indicator">
          <div className="status-dot"></div> ao vivo
        </div>
        <div className="user-dropdown">
          <Icons.User /> Isabela <Icons.ChevronDown />
        </div>
        <button className="btn-sair" onClick={() => supabase.auth.signOut()}>
          <Icons.LogOut /> Sair
        </button>
      </div>
    </header>
  )
}
