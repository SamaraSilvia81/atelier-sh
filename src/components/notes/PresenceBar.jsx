export default function PresenceBar({ peers }) {
  if (!peers.length) return null
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '4px 14px', background: 'rgba(90,171,110,0.08)',
      borderBottom: '1px solid rgba(90,171,110,0.2)', flexShrink: 0,
    }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#5aab6e', flexShrink: 0, animation: 'pulse 2s infinite' }} />
      <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: '#5aab6e', letterSpacing: '0.08em' }}>
        {peers.length === 1
          ? `${peers[0].name} também está editando`
          : `${peers.map(p => p.name).join(', ')} também estão editando`}
      </span>
      <div style={{ display: 'flex' }}>
        {peers.slice(0, 3).map((p, i) => (
          <div key={i} title={p.name} style={{
            width: 20, height: 20, borderRadius: '50%',
            background: 'var(--surface)', border: '2px solid rgba(90,171,110,0.4)',
            overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, fontFamily: 'var(--ff-mono)', color: '#5aab6e',
            marginLeft: i > 0 ? -6 : 0,
          }}>
            {p.avatar
              ? <img src={p.avatar} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : (p.name?.[0] || '?').toUpperCase()
            }
          </div>
        ))}
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  )
}
