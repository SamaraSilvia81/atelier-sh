import { useState } from 'react'
import { X, AlertCircle, CheckCircle2 } from 'lucide-react'
import { pushFileToRepo } from '../../../lib/github'
import { toMarkdown } from '../../../utils/notes'

const inp = { width: '100%', padding: '8px 10px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'var(--ff-mono)', fontSize: 11, borderRadius: 'var(--radius)', outline: 'none' }
const lbl = { fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-dim)', display: 'block', marginBottom: 5 }

// ── PushModal — uma nota ──────────────────────────────────────────────────────
export function PushNoteModal({ note, group, onClose }) {
  const [repo, setRepo]     = useState('sua-org/repositorio')
  const [path, setPath]     = useState(`devolutivas/${group?.name?.toLowerCase().replace(/\s+/g, '-') || 'grupo'}/${note?.title?.toLowerCase().replace(/\s+/g, '-') || 'nota'}.md`)
  const [msg, setMsg]       = useState(`docs: devolutiva ${group?.name || ''} — ${note?.title || ''}`)
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handlePush() {
    setLoading(true); setStatus(null)
    const header = `# ${note.title || 'Devolutiva'}\n\n> **Grupo:** ${group?.name || '—'}  \n> **Data:** ${new Date().toLocaleDateString('pt-BR')}\n\n---\n\n`
    const result = await pushFileToRepo({ repo, path, content: header + toMarkdown(note.content || ''), message: msg })
    setStatus(result.success ? { ok: true, msg: '✓ enviado com sucesso!' } : { ok: false, msg: '✗ ' + result.error })
    setLoading(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-red)', borderRadius: 'var(--radius-md)', width: '100%', maxWidth: 480, padding: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontFamily: 'var(--ff-disp)', fontSize: 20, letterSpacing: '0.05em' }}>ENVIAR AO GITHUB</div>
            <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.25em', color: 'var(--text-dim)', textTransform: 'uppercase', marginTop: 2 }}>// push como arquivo .md</div>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)', cursor: 'pointer' }}><X size={16} /></button>
        </div>
        <div className="field"><label style={lbl}>repositório</label><input value={repo} onChange={e => setRepo(e.target.value)} style={inp} /></div>
        <div className="field"><label style={lbl}>caminho do arquivo</label><input value={path} onChange={e => setPath(e.target.value)} style={inp} /></div>
        <div className="field"><label style={lbl}>mensagem do commit</label><input value={msg} onChange={e => setMsg(e.target.value)} style={inp} /></div>
        {status && <StatusBanner ok={status.ok} msg={status.msg} />}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>fechar</button>
          <button onClick={handlePush} disabled={loading} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>{loading ? 'enviando...' : '↑ push'}</button>
        </div>
      </div>
    </div>
  )
}

// ── PushFolderModal — uma pasta inteira ──────────────────────────────────────
export function PushFolderModal({ folder, notes, group, onClose }) {
  const [repo, setRepo]     = useState('sua-org/repositorio')
  const [basePath, setBasePath] = useState(`devolutivas/${group?.name?.toLowerCase().replace(/\s+/g, '-') || 'grupo'}/${folder?.name?.toLowerCase().replace(/\s+/g, '-') || 'pasta'}`)
  const [msg, setMsg]       = useState(`docs: pasta ${folder?.name || ''} — ${group?.name || ''}`)
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)

  const folderNotes = notes.filter(n => n.folder_id === folder?.id)

  async function handlePushAll() {
    if (!folderNotes.length) return
    setLoading(true); setStatus(null); setProgress(0)

    let ok = 0; let fail = 0
    for (const note of folderNotes) {
      const filePath = `${basePath}/${note.title?.toLowerCase().replace(/\s+/g, '-') || `nota-${note.id.slice(0, 8)}`}.md`
      const header = `# ${note.title || 'Anotação'}\n\n> **Grupo:** ${group?.name || '—'}  \n> **Data:** ${new Date().toLocaleDateString('pt-BR')}\n\n---\n\n`
      const result = await pushFileToRepo({ repo, path: filePath, content: header + toMarkdown(note.content || ''), message: msg })
      result.success ? ok++ : fail++
      setProgress(Math.round(((ok + fail) / folderNotes.length) * 100))
    }

    setStatus(fail === 0
      ? { ok: true,  msg: `✓ ${ok} arquivo(s) enviado(s)!` }
      : { ok: false, msg: `✗ ${fail} falhou, ${ok} enviado(s)` }
    )
    setLoading(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-red)', borderRadius: 'var(--radius-md)', width: '100%', maxWidth: 500, padding: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontFamily: 'var(--ff-disp)', fontSize: 20, letterSpacing: '0.05em' }}>ENVIAR PASTA AO GITHUB</div>
            <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.25em', color: 'var(--text-dim)', textTransform: 'uppercase', marginTop: 2 }}>// {folderNotes.length} nota(s) em "{folder?.name}"</div>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)', cursor: 'pointer' }}><X size={16} /></button>
        </div>
        <div className="field"><label style={lbl}>repositório</label><input value={repo} onChange={e => setRepo(e.target.value)} style={inp} /></div>
        <div className="field"><label style={lbl}>pasta base no repo</label><input value={basePath} onChange={e => setBasePath(e.target.value)} style={inp} /></div>
        <div className="field"><label style={lbl}>mensagem do commit</label><input value={msg} onChange={e => setMsg(e.target.value)} style={inp} /></div>

        {loading && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: 'var(--red)', width: `${progress}%`, transition: 'width 0.3s' }} />
            </div>
            <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--text-dim)', marginTop: 5 }}>{progress}% concluído</div>
          </div>
        )}

        {status && <StatusBanner ok={status.ok} msg={status.msg} />}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>fechar</button>
          <button onClick={handlePushAll} disabled={loading || !folderNotes.length} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', opacity: !folderNotes.length ? 0.4 : 1 }}>
            {loading ? `enviando... ${progress}%` : `↑ push ${folderNotes.length} nota(s)`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── StatusBanner compartilhado ────────────────────────────────────────────────
function StatusBanner({ ok, msg }) {
  const Icon = ok ? CheckCircle2 : AlertCircle
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 'var(--radius)', marginBottom: 14,
      color: ok ? '#5aab6e' : 'var(--red)',
      background: ok ? 'rgba(90,171,110,0.08)' : 'rgba(192,33,28,0.08)',
      border: `1px solid ${ok ? '#2a6e3a' : 'var(--border-red)'}`,
      fontFamily: 'var(--ff-mono)', fontSize: 11 }}>
      <Icon size={13} />{msg}
    </div>
  )
}
