import { useEffect, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { supabase } from './supabase'
import Login from './Login.jsx'
import { Header } from './components/Header.jsx'
import { Sidebar } from './components/Sidebar.jsx'
import VisaoGeral from './pages/VisaoGeral.jsx'
import Conversas from './pages/Conversas.jsx'

export default function App() {
  const [sessao, setSessao] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessao(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_evento, s) => setSessao(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  if (sessao === undefined) return <div className="tela-carregando">Acessando banco de dados da IA…</div>
  if (!sessao) return <Login />

  return (
    <div className="app-shell">
      <Header />
      <Sidebar />

      <main className="dashboard">
        <Routes>
          <Route path="/" element={<VisaoGeral />} />
          <Route path="/conversas" element={<Conversas />} />
          <Route path="/conversas/:telefone" element={<Conversas />} />
          <Route path="*" element={<VisaoGeral />} />
        </Routes>
      </main>
    </div>
  )
}
