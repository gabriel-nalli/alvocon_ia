import { useEffect, useState } from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import { supabase } from './supabase'
import Login from './Login.jsx'
import VisaoGeral from './pages/VisaoGeral.jsx'
import Conversas from './pages/Conversas.jsx'

export default function App() {
  const [sessao, setSessao] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessao(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_evento, s) => setSessao(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  if (sessao === undefined) return <div className="tela-carregando">Carregando…</div>
  if (!sessao) return <Login />

  return (
    <>
      <header className="app-header">
        <div className="titulo">
          Painel Isabela <span>— Alvocon</span>
        </div>
        <nav className="app-nav">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'ativo' : '')}>
            Visão geral
          </NavLink>
          <NavLink to="/conversas" className={({ isActive }) => (isActive ? 'ativo' : '')}>
            Conversas
          </NavLink>
        </nav>
        <div className="direita">
          <span className="ponto-vivo">ao vivo</span>
          <button className="botao-sair" onClick={() => supabase.auth.signOut()}>
            Sair
          </button>
        </div>
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<VisaoGeral />} />
          <Route path="/conversas" element={<Conversas />} />
          <Route path="/conversas/:telefone" element={<Conversas />} />
          <Route path="*" element={<VisaoGeral />} />
        </Routes>
      </main>
    </>
  )
}
