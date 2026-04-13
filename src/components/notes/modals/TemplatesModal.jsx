import { X, FileText, Plus, Trash2, LayoutTemplate } from 'lucide-react'

export default function TemplatesModal({ templates, onUse, onDelete, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-red)', borderRadius: 'var(--radius-md)', width: '100%', maxWidth: 520, padding: 28, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: 'var(--ff-disp)', fontSize: 20, letterSpacing: '0.05em' }}>TEMPLATES DA ORG</div>
            <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.25em', color: 'var(--text-dim)', textTransform: 'uppercase', marginTop: 2 }}>// modelos disponíveis para toda a organização</div>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)', cursor: 'pointer' }}><X size={16} /></button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {templates.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-dim)', fontFamily: 'var(--ff-mono)', fontSize: 12 }}>
              <LayoutTemplate size={28} style={{ opacity: 0.3, marginBottom: 12, display: 'block', margin: '0 auto 12px' }} />
              nenhum template ainda — salve uma nota como template para reutilizá-la aqui
              <div style={{ marginTop: 12, fontSize: 10, opacity: 0.6 }}>
                se já salvou um e não aparece, rode a migration v12 no Supabase
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {templates.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--surface)', transition: 'border-color var(--fast)' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-red)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                  <FileText size={14} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                    {t.profiles?.name && (
                      <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--ff-mono)', marginTop: 2 }}>
                        por {t.profiles.name} · {new Date(t.created_at).toLocaleDateString('pt-BR')}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                    <button onClick={() => onUse(t)}
                      style={{ padding: '5px 10px', borderRadius: 'var(--radius)', border: '1px solid var(--border-red)', background: 'var(--red-dim)', color: '#F0EDE8', fontFamily: 'var(--ff-mono)', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Plus size={10} /> usar
                    </button>
                    <button onClick={() => onDelete(t.id)} title="excluir template"
                      style={{ padding: '5px 7px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                      onMouseEnter={e => { e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.borderColor = 'var(--border-red)' }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-dim)'; e.currentTarget.style.borderColor = 'var(--border)' }}>
                      <Trash2 size={10} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <button onClick={onClose} className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center' }}>fechar</button>
        </div>
      </div>
    </div>
  )
}
