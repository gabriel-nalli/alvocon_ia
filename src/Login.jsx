import { useState } from 'react'
import { supabase } from './supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState(null)
  const [enviando, setEnviando] = useState(false)

  async function entrar(e) {
    e.preventDefault()
    setEnviando(true)
    setErro(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) {
      setErro(error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : error.message)
    }
    setEnviando(false)
  }

  return (
    <div className="login-tela">
      <form className="login-card" onSubmit={entrar}>
        <img
          className="logo-login"
          src="/alvocon-logo.png"
          alt="Alvocon"
          onError={(e) => { e.currentTarget.style.display = 'none' }}
        />
        <p>Acesso restrito. Entre com o usuário do painel.</p>
        <input
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          required
        />
        <input
          type="password"
          placeholder="Senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          autoComplete="current-password"
          required
        />
        {erro && <div className="login-erro">{erro}</div>}
        <button type="submit" disabled={enviando}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
