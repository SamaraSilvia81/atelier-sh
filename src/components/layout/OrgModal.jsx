import { useState } from 'react'
import { X, Trash2 } from 'lucide-react'

const COLORS = ['#C0211C','#8a7272','#C4B8B0','#4a7a5a','#4a5a8a','#8a4a7a']

export default function OrgModal({ onClose, onCreate, onEdit, onDelete, editOrg }) {
  const isEditing = !!editOrg
  const [name,        setName]        = useState(editOrg?.name || '')
  const [description, setDescription] = useState(editOrg?.description || '')
  const [color,       setColor]       = useState(editOrg?.color || COLORS[0])
  const [loading,     setLoading]     = useState(false)
  const [confirming,  setConfirming]  = useState(false)
  const [error,       setError]       = useState('')

  async function handleSubmit() {
    if (!name.trim()) return
    setLoading(true)
    if (isEditing) {
      const { error } = await onEdit(editOrg.id, { name: name.trim(), description, color })
      if (error) setError(error.message)
      else onClose()
    } else {
      const { data, error } = await onCreate({ name: name.trim(), description, color })
      if (error) setError(error.message)
      else onClose(data?.id)  // passa o id da nova org pro caller auto-selecionar
    }
    setLoading(false)
  }

  async function handleDelete() {
    if (!confirming) { setConfirming(true); return }
    setLoading(true)
    const { error } = await onDelete(editOrg.id)
    if (error) setError(error.message)
    else onClose()
    setLoading(false)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border-red)',
        borderRadius: 'var(--radius-md)', width: '100%', maxWidth: 460, padding: 36
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <div style={{ fontFamily: 'var(--ff-disp)', fontSize: 24, letterSpacing: '0.06em', marginBottom: 4 }}>
              {isEditing ? 'editar organização' : 'nova organização'}
            </div>
            <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '0.52rem', letterSpacing: '0.3em', color: 'var(--text-dim)', textTransform: 'uppercase' }}>atelier.sh</div>
          </div>
          <button onClick={() => onClose()} style={{ color: 'var(--text-dim)', padding: 4 }}><X size={16} /></button>
        </div>

        <div className="field">
          <label>nome</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="ex: Módulo 3 — 2026" />
        </div>
        <div className="field">
          <label>descrição <span style={{ opacity: 0.4 }}>(opcional)</span></label>
          <input value={description} onChange={e => setDescription(e.target.value)} placeholder="ex: Turma do Módulo 3, 2026" />
        </div>
        <div className="field">
          <label>cor de destaque</label>
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            {COLORS.map(c => (
              <button key={c} onClick={() => setColor(c)} style={{
                width: 24, height: 24, borderRadius: '50%', background: c,
                border: color === c ? '2px solid var(--white)' : '2px solid transparent',
                outline: color === c ? `2px solid ${c}` : 'none', outlineOffset: 2,
                transition: 'all var(--fast)'
              }} />
            ))}
          </div>
        </div>

        {error && <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '0.62rem', color: 'var(--red)', marginBottom: 16 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          {isEditing && (
            <button
              onClick={handleDelete}
              disabled={loading}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px',
                borderRadius: 'var(--radius)', fontFamily: 'var(--ff-mono)', fontSize: 11,
                letterSpacing: '0.1em', cursor: 'pointer',
                background: confirming ? 'rgba(192,33,28,0.15)' : 'transparent',
                border: `1px solid ${confirming ? 'var(--red)' : 'var(--border)'}`,
                color: confirming ? 'var(--red)' : 'var(--text-dim)',
                transition: 'all var(--fast)',
              }}
            >
              <Trash2 size={12} />
              {confirming ? 'confirmar exclusão' : 'excluir'}
            </button>
          )}
          <button onClick={() => onClose()} className="btn btn-ghost" style={{ flex: 1 }}>cancelar</button>
          <button onClick={handleSubmit} className="btn btn-primary" disabled={loading || !name.trim()}
            style={{ flex: 1, justifyContent: 'center', opacity: !name.trim() ? 0.4 : 1 }}>
            {loading ? '...' : isEditing ? 'salvar' : 'criar'}
          </button>
        </div>
      </div>
    </div>
  )
}
