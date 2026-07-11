import { UsersRound } from 'lucide-react'
import { Icons } from '../Icons.jsx'

function AlvoFlecha() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 7a5 5 0 1 0 5 5" />
      <path d="M13 3.055a9 9 0 1 0 7.941 7.945" />
      <path d="M15 6v3h3l3 -3h-3v-3z" />
      <path d="M15 9l-3 3" />
    </svg>
  )
}

const ICONES = {
  users: () => <UsersRound strokeWidth={1.9} />,
  shield: Icons.Shield,
  target: AlvoFlecha,
  message: Icons.Chat,
}

function HexIcone({ children }) {
  return (
    <div className="hex-icon-wrapper">
      <svg className="hex-bg" viewBox="0 0 100 115">
        <defs>
          <linearGradient id="hex-borda" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff6157" />
            <stop offset="50%" stopColor="#e31b23" />
            <stop offset="100%" stopColor="#8a0d10" />
          </linearGradient>
          <radialGradient id="hex-fundo" cx="50%" cy="40%" r="72%">
            <stop offset="0%" stopColor="#471114" />
            <stop offset="65%" stopColor="#230809" />
            <stop offset="100%" stopColor="#160405" />
          </radialGradient>
        </defs>
        <polygon
          points="50,4 96,29 96,86 50,111 4,86 4,29"
          fill="url(#hex-fundo)"
          stroke="url(#hex-borda)"
          strokeWidth="6"
          strokeLinejoin="round"
        />
        <polygon
          points="50,15 87,35 87,80 50,100 13,80 13,35"
          fill="none"
          stroke="rgba(255,90,80,0.25)"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
      <div className="icon-inner">{children}</div>
    </div>
  )
}

export function MetricCard({ label, value, helper, icon }) {
  const Icone = ICONES[icon] ?? Icons.Chat
  return (
    <div className="sci-fi-card">
      <div className="sci-fi-card-content">
        <div className="kpi-content">
          <div className="kpi-left">
            <div className="kpi-title">{label}</div>
            <div className="kpi-value">{value}</div>
            <div className="kpi-sub">{helper}</div>
            <div className="kpi-red-line"></div>
          </div>
          <HexIcone><Icone /></HexIcone>
        </div>
      </div>
    </div>
  )
}
