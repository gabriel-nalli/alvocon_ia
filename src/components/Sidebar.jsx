import { Gauge, MessagesSquare, UsersRound, ChartNoAxesCombined, Settings, ShieldCheck } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'

const EM_BREVE = [
  { Icone: UsersRound, title: 'Leads (em breve)' },
  { Icone: ChartNoAxesCombined, title: 'Relatórios (em breve)' },
  { Icone: Settings, title: 'Configurações (em breve)' },
  { Icone: ShieldCheck, title: 'Segurança (em breve)' },
]

export function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const emConversas = location.pathname.startsWith('/conversas')

  return (
    <aside className="sidebar">
      <button className={`side-btn ${!emConversas ? 'active' : ''}`} title="Visão geral" onClick={() => navigate('/')}>
        <Gauge size={21} strokeWidth={1.8} />
      </button>
      <button className={`side-btn ${emConversas ? 'active' : ''}`} title="Conversas" onClick={() => navigate('/conversas')}>
        <MessagesSquare size={21} strokeWidth={1.8} />
      </button>
      {EM_BREVE.map(({ Icone, title }) => (
        <button key={title} className="side-btn" title={title} disabled>
          <Icone size={21} strokeWidth={1.8} />
        </button>
      ))}
    </aside>
  )
}
