// Cards do tema sci-fi: card com cantos chanfrados + KPI com ícone hexagonal

export function CardSciFi({ titulo, children }) {
  return (
    <div className="sci-fi-card">
      <div className="sci-fi-card-content">
        <div className="card-header">
          <h2>{titulo}</h2>
          <div className="card-header-red-line"></div>
        </div>
        <div style={{ position: 'relative', zIndex: 2, flex: 1, display: 'flex', flexDirection: 'column' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

export function KpiTile({ titulo, valor, subtitulo, IconeComponent }) {
  return (
    <div className="sci-fi-card">
      <div className="sci-fi-card-content">
        <div className="kpi-content">
          <div className="kpi-left">
            <div className="kpi-title">{titulo}</div>
            <div className="kpi-value">{valor}</div>
            <div className="kpi-sub">{subtitulo}</div>
            <div className="kpi-red-line"></div>
          </div>
          <div className="hex-icon-wrapper">
            <svg className="hex-bg" viewBox="0 0 100 115" preserveAspectRatio="none">
              <polygon points="50,2 98,28 98,87 50,113 2,87 2,28" />
            </svg>
            <div className="icon-inner">
              <IconeComponent />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
