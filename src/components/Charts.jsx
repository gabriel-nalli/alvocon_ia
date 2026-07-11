import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid
} from 'recharts'

// Mesmo visual do mock do GPT, mas com as larguras derivadas dos dados reais.
export function Funnel({ data }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <div className="funnel-list">
      {data.map((item, index) => {
        const largura = Math.max(10, (item.value / max) * 100)
        return (
          <div className="funnel-row" key={item.name}>
            <span className="funnel-name">{item.name}</span>
            <div className="funnel-track">
              <div className="funnel-bar" style={{ width: `${largura}%`, opacity: 1 - index * 0.08 }} />
            </div>
            <span className="funnel-value">{item.value} <i>• {item.pct}</i></span>
          </div>
        )
      })}
    </div>
  )
}

export function Dropoff({ data }) {
  return (
    <ResponsiveContainer width="100%" height={230}>
      <BarChart data={data} layout="vertical" margin={{ left: 42, right: 20, top: 0, bottom: 0 }}>
        <XAxis type="number" hide />
        <YAxis dataKey="name" type="category" tick={{ fill: '#c7c7c7', fontSize: 12 }} width={180} axisLine={false} tickLine={false} />
        <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ background: '#141414', border: '1px solid #333' }} />
        <Bar dataKey="value" fill="#2f80ed" radius={[0, 4, 4, 0]} barSize={20} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function Profiles({ data }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <div className="profiles-wrap">
      <ResponsiveContainer width="42%" height={190}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={48} outerRadius={76} stroke="#181818">
            {data.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      <div className="profile-legend">
        {data.map((item) => (
          <div className="profile-row" key={item.name}>
            <span className="dot" style={{ background: item.color }} />
            <span>{item.name}</span>
            <div className="legend-bar">
              <span style={{ width: `${Math.max(8, (item.value / max) * 100)}%`, background: item.color }} />
            </div>
            <strong>{item.value}</strong>
            <em>• {item.pct}</em>
          </div>
        ))}
      </div>
    </div>
  )
}

export function LeadsLine({ data }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ left: 0, right: 15, top: 10, bottom: 0 }}>
        <CartesianGrid stroke="#262626" vertical={false} />
        <XAxis dataKey="day" tick={{ fill: '#a0a0a0', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#a0a0a0', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip contentStyle={{ background: '#141414', border: '1px solid #333' }} />
        <Line type="monotone" dataKey="value" name="Leads" stroke="#2f80ed" strokeWidth={2.4} dot={{ r: 3, fill: '#9ec7ff' }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
