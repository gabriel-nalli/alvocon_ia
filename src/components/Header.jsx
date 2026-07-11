import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import { Icons } from '../Icons.jsx'

export function Header() {
  const location = useLocation()
  const navigate = useNavigate()
  const emConversas = location.pathname.startsWith('/conversas')

  return (
    <header className="top-header">
      <div className="header-left">
        <img className="logo-header" src="/alvocon-logo.png" alt="Alvocon" />
      </div>

      <nav className="nav-tabs">
        <button className={`nav-tab ${!emConversas ? 'ativo' : ''}`} onClick={() => navigate('/')}>
          <Icons.Speedometer /> Visão geral
        </button>
        <button className={`nav-tab ${emConversas ? 'ativo' : ''}`} onClick={() => navigate('/conversas')}>
          <Icons.Chat /> Conversas
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
