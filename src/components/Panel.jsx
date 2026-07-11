export function Panel({ title, children, className = '' }) {
  return (
    <div className={`sci-fi-card ${className}`}>
      <div className="sci-fi-card-content">
        <div className="card-header">
          <h2>{title}</h2>
          <div className="card-header-red-line"></div>
        </div>
        <div style={{ position: 'relative', zIndex: 2, flex: 1, display: 'flex', flexDirection: 'column' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
