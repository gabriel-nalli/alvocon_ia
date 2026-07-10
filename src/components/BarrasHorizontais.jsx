// Barras horizontais com rótulo direto (valor + % opcional).
// itens: [{ rotulo, total, cor, pct? }] — cor é uma var CSS tipo 'var(--f3)'.
export default function BarrasHorizontais({ itens, base }) {
  const max = Math.max(1, ...itens.map((i) => i.total))
  return (
    <div>
      {itens.map((item) => {
        const larguraPct = (item.total / max) * 74 // deixa espaço pro rótulo à direita
        return (
          <div className="linha-barra" key={item.rotulo}>
            <div className="nome">{item.rotulo}</div>
            <div className="trilho" title={`${item.rotulo}: ${item.total}`}>
              <div
                className="barra"
                style={{ width: `${larguraPct}%`, background: item.cor }}
              />
              <div className="barra-valor" style={{ left: `calc(${larguraPct}% + 8px)` }}>
                {item.total}
                {base != null && base > 0 && (
                  <span className="pct"> · {Math.round((item.total / base) * 100)}%</span>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
