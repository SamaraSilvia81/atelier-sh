import { useState } from 'react'
import { X, FolderKanban, User, Trash2, Globe, Lock } from 'lucide-react'

export default function ProjectModal({ project, onClose, onSave, onDelete }) {
  const editing = !!project
  const [name,        setName]        = useState(project?.name || '')
  const [description, setDescription] = useState(project?.description || '')
  const [type,        setType]        = useState(project?.type || 'group')
  const [visibility,  setVisibility]  = useState(project?.visibility || 'org')
  const [loading,     setLoading]     = useState(false)
  const [deleting,    setDeleting]    = useState(false)
  const [confirmDel,  setConfirmDel]  = useState(false)
  const [error,       setError]       = useState('')

  async function handleSave() {
    if (!name.trim()) { setError('Nome obrigatório'); return }
    setLoading(true); setError('')
    const result = await onSave({ name: name.trim(), description, type, visibility, status: project?.status || 'active' })
    if (result?.error) setError(result.error.message || 'Erro ao salvar')
    else onClose()
    setLoading(false)
  }

  async function handleDelete() {
    if (!confirmDel) { setConfirmDel(true); return }
    setDeleting(true)
    const result = await onDelete(project.id)
    if (result?.error) { setError(result.error.message || 'Erro ao deletar'); setDeleting(false); setConfirmDel(false) }
    else onClose()
  }

  const inp = { width: '100%', padding: '8px 10px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'var(--ff-mono)', fontSize: 11, borderRadius: 'var(--radius)', outline: 'none', boxSizing: 'border-box' }
  const lbl = { display: 'block', fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.28em', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 5 }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-red)', borderRadius: 'var(--radius-md)', width: '100%', maxWidth: 460, padding: 28 }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <div style={{ fontFamily: 'var(--ff-disp)', fontSize: 20, letterSpacing: '0.05em' }}>
              {editing ? 'EDITAR PROJETO' : 'NOVO PROJETO'}
            </div>
            <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.28em', color: 'var(--text-dim)', textTransform: 'uppercase', marginTop: 2 }}>
              // organiza grupos dentro da org
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={16} /></button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>nome do projeto *</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Relatório de Marca, Projeto ODS..." style={inp} autoFocus />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>descrição</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descreva o objetivo do projeto..." rows={2}
            style={{ ...inp, resize: 'vertical', fontFamily: 'var(--ff-body)', fontSize: 12, lineHeight: 1.5 }} />
        </div>

        {/* tipo */}
        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>tipo de entrega</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { val: 'group',      Icon: FolderKanban, label: 'grupos',     sub: 'equipes de alunos' },
              { val: 'individual', Icon: User,          label: 'individual', sub: 'um aluno por entrada' },
            ].map(({ val, Icon, label, sub }) => (
              <button key={val} onClick={() => setType(val)} style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4,
                padding: '10px 12px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                border: type === val ? '1px solid var(--border-red)' : '1px solid var(--border)',
                background: type === val ? 'var(--red-dim)' : 'var(--surface)',
                transition: 'all var(--fast)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon size={13} style={{ color: type === val ? 'var(--red)' : 'var(--text-muted)' }} />
                  <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: type === val ? 'var(--text)' : 'var(--text-muted)' }}>{label}</span>
                </div>
                <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.05em' }}>{sub}</span>
              </button>
            ))}
          </div>
        </div>

        {/* visibility */}
        <div style={{ marginBottom: 20 }}>
          <label style={lbl}>visibilidade</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { val: 'org',     Icon: Globe, label: 'organização', sub: 'todos os membros veem' },
              { val: 'private', Icon: Lock,  label: 'privado',     sub: 'só você e admins' },
            ].map(({ val, Icon, label, sub }) => (
              <button key={val} onClick={() => setVisibility(val)} style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4,
                padding: '10px 12px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                border: visibility === val ? '1px solid var(--border-red)' : '1px solid var(--border)',
                background: visibility === val ? 'var(--red-dim)' : 'var(--surface)',
                transition: 'all var(--fast)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon size={13} style={{ color: visibility === val ? 'var(--red)' : 'var(--text-muted)' }} />
                  <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: visibility === val ? 'var(--text)' : 'var(--text-muted)' }}>{label}</span>
                </div>
                <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.05em' }}>{sub}</span>
              </button>
            ))}
          </div>
        </div>

        {error && <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--red)', padding: '7px 10px', background: 'var(--red-dim)', border: '1px solid var(--border-red)', borderRadius: 'var(--radius)', marginBottom: 14 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center' }}>
          {/* delete — só ao editar */}
          {editing && onDelete ? (
            <button
              onClick={handleDelete}
              disabled={deleting}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: confirmDel ? 'var(--red)' : 'var(--red-dim)',
                border: '1px solid var(--border-red)',
                color: confirmDel ? '#fff' : 'var(--red)',
                fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '0.1em',
                padding: '7px 12px', borderRadius: 'var(--radius)', cursor: 'pointer',
                transition: 'all var(--fast)',
              }}
              title={confirmDel ? 'Clique para confirmar' : 'Deletar projeto'}
            >
              <Trash2 size={12} />
              {deleting ? '...' : confirmDel ? 'confirmar?' : 'deletar'}
            </button>
          ) : <div />}

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} className="btn btn-ghost">cancelar</button>
            <button onClick={handleSave} disabled={loading} className="btn btn-primary" style={{ opacity: loading ? 0.7 : 1 }}>
              {loading ? '...' : editing ? 'salvar' : 'criar projeto'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
