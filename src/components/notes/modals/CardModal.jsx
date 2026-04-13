import { AlertCircle, CheckCircle2 } from 'lucide-react'

export default function CardModal({ type = 'confirm', title, message, onConfirm, onClose, confirmLabel = 'confirmar' }) {
  const isConfirm   = type === 'confirm'
  const accentColor = type === 'error' ? 'var(--red)' : type === 'success' ? '#5aab6e' : '#c8922a'
  const borderColor = type === 'error' ? 'var(--border-red)' : type === 'success' ? '#2a6e3a' : '#7a5a1a'
  const Icon        = type === 'success' ? CheckCircle2 : AlertCircle

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', zIndex: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-card)', border: `1px solid ${borderColor}`, borderRadius: 'var(--radius-md)', width: '100%', maxWidth: 380, padding: 28 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 22 }}>
          <Icon size={20} style={{ color: accentColor, flexShrink: 0, marginTop: 3 }} />
          <div>
            <div style={{ fontFamily: 'var(--ff-disp)', fontSize: 18, letterSpacing: '0.05em', color: 'var(--text)', marginBottom: 7 }}>{title}</div>
            <div style={{ fontFamily: 'var(--ff-body)', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.65 }}>{message}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          {isConfirm && <button onClick={onClose} className="btn btn-ghost">cancelar</button>}
          <button onClick={isConfirm ? onConfirm : onClose} className="btn btn-primary" style={{ background: accentColor }}>
            {isConfirm ? confirmLabel : 'ok'}
          </button>
        </div>
      </div>
    </div>
  )
}
