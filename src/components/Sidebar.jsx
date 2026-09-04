import { Gauge, MessagesSquare, Send, UsersRound } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'

export function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const emConversas = location.pathname.startsWith('/conversas')
  const emDisparos = location.pathname.startsWith('/disparos')
  const emLeads = location.pathname.startsWith('/leads')

  const secoes = [
    { rotulo: 'Visão geral', Icone: Gauge, rota: '/', ativo: !emConversas && !emDisparos && !emLeads },
    { rotulo: 'Conversas', Icone: MessagesSquare, rota: '/conversas', ativo: emConversas },
    { rotulo: 'Leads', Icone: UsersRound, rota: '/leads', ativo: emLeads },
    { rotulo: 'Disparos', Icone: Send, rota: '/disparos', ativo: emDisparos },
  ]

  return (
    <aside className="sidebar">
      {secoes.map(({ rotulo, Icone, rota, ativo }) => (
        <button
          key={rota}
          className={`side-btn ${ativo ? 'active' : ''}`}
          title={rotulo}
          aria-label={rotulo}
          aria-current={ativo ? 'page' : undefined}
          onClick={() => navigate(rota)}
        >
          <Icone size={21} strokeWidth={1.8} />
        </button>
      ))}
    </aside>
  )
}
