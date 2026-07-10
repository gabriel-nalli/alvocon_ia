import { useEffect, useState } from 'react'
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from './supabase'
import { Icons } from './Icons.jsx'
import Login from './Login.jsx'
import VisaoGeral from './pages/VisaoGeral.jsx'
import Conversas from './pages/Conversas.jsx'

function BotaoSidebar({ ativo, desabilitado, title, onClick, children }) {
  return (
    <button
      className={`sidebar-btn ${ativo ? 'ativo' : ''} ${desabilitado ? 'desabilitado' : ''}`}
      title={title}
      onClick={desabilitado ? undefined : onClick}
    >
      <svg className="hex-bg" viewBox="0 0 100 110" preserveAspectRatio="none">
        <polygon points="50,2 95,27 95,83 50,108 5,83 5,27" />
      </svg>
      <div className="icon-inner">{children}</div>
    </button>
  )
}

export default function App() {
  const [sessao, setSessao] = useState(undefined)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessao(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_evento, s) => setSessao(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  if (sessao === undefined) return <div className="tela-carregando">Acessando banco de dados da IA…</div>
  if (!sessao) return <Login />

  const emConversas = location.pathname.startsWith('/conversas')

  return (
    <div className="app-layout">
      {/* Barra Lateral Esquerda */}
      <aside className="sidebar">
        <div className="sidebar-hamburger"><Icons.Menu /></div>

        <BotaoSidebar ativo={!emConversas} title="Visão geral" onClick={() => navigate('/')}>
          <Icons.Speedometer />
        </BotaoSidebar>
        <BotaoSidebar ativo={emConversas} title="Conversas" onClick={() => navigate('/conversas')}>
          <Icons.Chat />
        </BotaoSidebar>
        <BotaoSidebar desabilitado title="Leads (em breve)"><Icons.Users /></BotaoSidebar>
        <BotaoSidebar desabilitado title="Relatórios (em breve)"><Icons.Chart /></BotaoSidebar>
        <BotaoSidebar desabilitado title="Configurações (em breve)"><Icons.Gear /></BotaoSidebar>
        <BotaoSidebar desabilitado title="Segurança (em breve)"><Icons.Shield /></BotaoSidebar>
      </aside>

      {/* Área Principal (Direita) */}
      <div className="main-area">
        <header className="top-header">
          <div className="header-left">
            <div className="app-title">Painel Isabela <span>— Alvocon</span></div>
            <div className="nav-tabs">
              <button
                className={`nav-tab ${!emConversas ? 'ativo' : ''}`}
                onClick={() => navigate('/')}
              >
                <Icons.Speedometer /> Visão geral
              </button>
              <button
                className={`nav-tab ${emConversas ? 'ativo' : ''}`}
                onClick={() => navigate('/conversas')}
              >
                <Icons.Chat /> Conversas
              </button>
            </div>
          </div>

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
            {/* Logo: coloque o arquivo logo.png na pasta /public do projeto */}
            <div className="logo-container" style={{ marginLeft: 16 }}>
              <img
                src="/logo.png"
                alt="Alvocon"
                onError={(e) => { e.currentTarget.parentElement.style.display = 'none' }}
              />
            </div>
          </div>
        </header>

        <main className="content-scroll">
          <Routes>
            <Route path="/" element={<VisaoGeral />} />
            <Route path="/conversas" element={<Conversas />} />
            <Route path="/conversas/:telefone" element={<Conversas />} />
            <Route path="*" element={<VisaoGeral />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
