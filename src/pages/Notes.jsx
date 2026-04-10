import { useState, useCallback } from 'react'
import { useGroups } from '../hooks/useGroups'
import { useOrgNotes } from '../hooks/useNotes'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import { pushFileToRepo } from '../lib/github'
import { createTrelloCard, fetchBoardLists } from '../lib/trello'
import {
  Pin, PinOff, Plus, Trash2, Search, Bold, Italic,
  List, ListOrdered, Heading2, Code, FileText,
  Download, Send, LayoutList, X, ImageIcon, AlertCircle, CheckCircle2
} from 'lucide-react'

function debounce(fn, ms) { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms) } }

function toMarkdown(html) {
  if (!html) return ''
  return html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
    .replace(/<img[^>]+src="([^"]+)"[^>]*>/gi, '![]($1)')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
    .replace(/<ul[^>]*>|<\/ul>/gi, '')
    .replace(/<ol[^>]*>|<\/ol>/gi, '')
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n').trim()
}

// ── Card modal genérico para confirmações e feedback ──────────────────
function CardModal({ type = 'confirm', title, message, onConfirm, onClose, confirmLabel = 'confirmar' }) {
  const isConfirm = type === 'confirm'
  const accentColor = type === 'error' ? 'var(--red)' : type === 'success' ? '#5aab6e' : '#c8922a'
  const borderColor = type === 'error' ? 'var(--border-red)' : type === 'success' ? '#2a6e3a' : '#7a5a1a'
  const Icon = type === 'success' ? CheckCircle2 : AlertCircle

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', zIndex: 700,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-card)', border: `1px solid ${borderColor}`,
        borderRadius: 'var(--radius-md)', width: '100%', maxWidth: 380, padding: 28 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 22 }}>
          <Icon size={20} style={{ color: accentColor, flexShrink: 0, marginTop: 3 }} />
          <div>
            <div style={{ fontFamily: 'var(--ff-disp)', fontSize: 18, letterSpacing: '0.05em', color: 'var(--text)', marginBottom: 7 }}>
              {title}
            </div>
            <div style={{ fontFamily: 'var(--ff-body)', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.65 }}>
              {message}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          {isConfirm && (
            <button onClick={onClose} className="btn btn-ghost">cancelar</button>
          )}
          <button onClick={isConfirm ? onConfirm : onClose} className="btn btn-primary"
            style={{ background: accentColor }}>
            {isConfirm ? confirmLabel : 'ok'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal inserir imagem ──────────────────────────────────────────────
function ImageUrlModal({ onInsert, onClose }) {
  const [url, setUrl] = useState('')
  const [alt, setAlt] = useState('')
  const inp = { width: '100%', padding: '8px 10px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'var(--ff-mono)', fontSize: 11, borderRadius: 'var(--radius)', outline: 'none' }
  const lbl = { fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-dim)', display: 'block', marginBottom: 5 }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', zIndex: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-red)', borderRadius: 'var(--radius-md)', width: '100%', maxWidth: 420, padding: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontFamily: 'var(--ff-disp)', fontSize: 20, letterSpacing: '0.05em' }}>INSERIR IMAGEM</div>
            <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.25em', color: 'var(--text-dim)', textTransform: 'uppercase', marginTop: 2 }}>// url ou cole direto com ctrl+v</div>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)', cursor: 'pointer' }}><X size={16} /></button>
        </div>
        <div className="field">
          <label style={lbl}>url da imagem</label>
          <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." style={inp} autoFocus />
        </div>
        <div className="field">
          <label style={lbl}>descrição <span style={{ opacity: 0.4 }}>(opcional)</span></label>
          <input value={alt} onChange={e => setAlt(e.target.value)} placeholder="captura de tela do projeto" style={inp} />
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>cancelar</button>
          <button onClick={() => { if (url.trim()) { onInsert(url.trim(), alt.trim()); onClose() } }}
            disabled={!url.trim()} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', opacity: !url.trim() ? 0.4 : 1 }}>
            inserir
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Toolbar button — fora do NoteEditor para não recriar a cada render ───────
function ToolbarBtn({ action, active, title, icon }) {
  return (
    <button onClick={action} title={title} style={{
      padding: '4px 8px', borderRadius: 'var(--radius)',
      background: active ? 'var(--red-dim)' : 'transparent',
      color: active ? '#F0EDE8' : 'var(--text-muted)',
      border: active ? '1px solid var(--border-red)' : '1px solid transparent',
      transition: 'all var(--fast)', cursor: 'pointer',
    }}>{icon}</button>
  )
}

// ── Editor de notas ───────────────────────────────────────────────────
function NoteEditor({ note, onUpdate }) {
  const [showImgModal, setShowImgModal] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: '›_ escreva suas anotações aqui...' }),
      Image.configure({ inline: false, allowBase64: true }),
    ],
    content: note.content || '',
    onUpdate: ({ editor }) => onUpdate(note.id, { content: editor.getHTML() }),
    editorProps: {
      handlePaste(view, event) {
        const items = event.clipboardData?.items
        if (!items) return false
        for (const item of items) {
          if (item.type.startsWith('image/')) {
            const file = item.getAsFile()
            if (!file) continue
            const reader = new FileReader()
            reader.onload = e => {
              view.dispatch(view.state.tr.replaceSelectionWith(
                view.state.schema.nodes.image.create({ src: e.target.result })
              ))
            }
            reader.readAsDataURL(file)
            return true
          }
        }
        return false
      },
    },
  }, [note.id])

  if (!editor) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <div style={{ display: 'flex', gap: 2, padding: '8px 14px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', flexShrink: 0, background: 'var(--bg-alt)', alignItems: 'center' }}>
        <ToolbarBtn action={() => editor.chain().focus().toggleBold().run()}             active={editor.isActive('bold')}              title="negrito"   icon={<Bold size={12} />} />
        <ToolbarBtn action={() => editor.chain().focus().toggleItalic().run()}           active={editor.isActive('italic')}             title="itálico"   icon={<Italic size={12} />} />
        <ToolbarBtn action={() => editor.chain().focus().toggleHeading({level:2}).run()} active={editor.isActive('heading',{level:2})} title="título"    icon={<Heading2 size={12} />} />
        <ToolbarBtn action={() => editor.chain().focus().toggleBulletList().run()}       active={editor.isActive('bulletList')}         title="lista"     icon={<List size={12} />} />
        <ToolbarBtn action={() => editor.chain().focus().toggleOrderedList().run()}      active={editor.isActive('orderedList')}        title="numerada"  icon={<ListOrdered size={12} />} />
        <ToolbarBtn action={() => editor.chain().focus().toggleCode().run()}             active={editor.isActive('code')}               title="código"    icon={<Code size={12} />} />
        <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 4px' }} />
        <ToolbarBtn action={() => setShowImgModal(true)} active={false} title="inserir imagem (ou ctrl+v para colar)" icon={<ImageIcon size={12} />} />
        <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.1em', opacity: 0.7 }}>
          ctrl+v para colar imagem
        </span>
      </div>
      <EditorContent editor={editor} style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }} />
      {showImgModal && (
        <ImageUrlModal
          onInsert={(src, alt) => editor.chain().focus().setImage({ src, alt: alt || undefined }).run()}
          onClose={() => setShowImgModal(false)}
        />
      )}
    </div>
  )
}

// ── Modal: enviar ao GitHub ───────────────────────────────────────────
function PushModal({ note, group, onClose }) {
  const [repo, setRepo] = useState('sua-org/repositorio')
  const [path, setPath] = useState(`devolutivas/${group?.name?.toLowerCase().replace(/\s+/g,'-') || 'grupo'}/${note?.title?.toLowerCase().replace(/\s+/g,'-') || 'nota'}.md`)
  const [msg,  setMsg]  = useState(`docs: devolutiva ${group?.name || ''} — ${note?.title || ''}`)
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handlePush() {
    setLoading(true); setStatus(null)
    const header = `# ${note.title || 'Devolutiva'}\n\n> **Grupo:** ${group?.name || '—'}  \n> **Data:** ${new Date().toLocaleDateString('pt-BR')}\n\n---\n\n`
    const result = await pushFileToRepo({ repo, path, content: header + toMarkdown(note.content || ''), message: msg })
    setStatus(result.success ? { ok: true, msg: '✓ enviado com sucesso!' } : { ok: false, msg: '✗ ' + result.error })
    setLoading(false)
  }

  const inp = { width: '100%', padding: '8px 10px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'var(--ff-mono)', fontSize: 11, borderRadius: 'var(--radius)', outline: 'none' }
  const lbl = { fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-dim)', display: 'block', marginBottom: 5 }

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
        {status && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 'var(--radius)', marginBottom: 14,
            color: status.ok ? '#5aab6e' : 'var(--red)',
            background: status.ok ? 'rgba(90,171,110,0.08)' : 'rgba(192,33,28,0.08)',
            border: `1px solid ${status.ok ? '#2a6e3a' : 'var(--border-red)'}`,
            fontFamily: 'var(--ff-mono)', fontSize: 11 }}>
            {status.ok ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
            {status.msg}
          </div>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>fechar</button>
          <button onClick={handlePush} disabled={loading} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
            {loading ? 'enviando...' : '↑ push'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal: criar card no Trello ───────────────────────────────────────
function TrelloCardModal({ note, group, trelloToken, onClose }) {
  const [lists, setLists] = useState([])
  const [listId, setListId] = useState('')
  const [cardName, setCardName] = useState(note?.title || '')
  const [cardDesc, setCardDesc] = useState(toMarkdown(note?.content || '').substring(0, 300))
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)

  useState(() => {
    if (trelloToken && group?.trello_board_id) {
      fetchBoardLists(trelloToken, group.trello_board_id).then(ls => { setLists(ls); if (ls[0]) setListId(ls[0].id) })
    }
  }, [])

  async function handleCreate() {
    if (!listId || !cardName) return
    setLoading(true); setStatus(null)
    const { data, error } = await createTrelloCard(trelloToken, { listId, name: cardName, desc: cardDesc })
    setStatus(error ? { ok: false, msg: '✗ ' + error } : { ok: true, msg: '✓ card criado!', url: data?.url })
    setLoading(false)
  }

  const inp = { width: '100%', padding: '8px 10px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'var(--ff-mono)', fontSize: 11, borderRadius: 'var(--radius)', outline: 'none' }
  const lbl = { fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-dim)', display: 'block', marginBottom: 5 }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-red)', borderRadius: 'var(--radius-md)', width: '100%', maxWidth: 460, padding: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontFamily: 'var(--ff-disp)', fontSize: 20, letterSpacing: '0.05em' }}>CRIAR CARD TRELLO</div>
            <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.25em', color: 'var(--text-dim)', textTransform: 'uppercase', marginTop: 2 }}>// {group?.name}</div>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)', cursor: 'pointer' }}><X size={16} /></button>
        </div>
        {!trelloToken && <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: '#c8922a', marginBottom: 16 }}>configure o token Trello nas configurações</div>}
        {!group?.trello_board_id && <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: '#c8922a', marginBottom: 16 }}>vincule um board Trello a este grupo primeiro</div>}
        <div className="field">
          <label style={lbl}>lista do board</label>
          {lists.length > 0
            ? <select value={listId} onChange={e => setListId(e.target.value)} style={{ ...inp, appearance: 'none' }}>
                {lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            : <input value={listId} onChange={e => setListId(e.target.value)} placeholder="ID da lista Trello" style={inp} />
          }
        </div>
        <div className="field"><label style={lbl}>título do card</label><input value={cardName} onChange={e => setCardName(e.target.value)} style={inp} /></div>
        <div className="field">
          <label style={lbl}>descrição</label>
          <textarea value={cardDesc} onChange={e => setCardDesc(e.target.value)} rows={4} style={{ ...inp, resize: 'vertical', fontFamily: 'var(--ff-body)', fontSize: 12 }} />
        </div>
        {status && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 'var(--radius)', marginBottom: 14,
            color: status.ok ? '#5aab6e' : 'var(--red)',
            background: status.ok ? 'rgba(90,171,110,0.08)' : 'rgba(192,33,28,0.08)',
            border: `1px solid ${status.ok ? '#2a6e3a' : 'var(--border-red)'}`,
            fontFamily: 'var(--ff-mono)', fontSize: 11 }}>
            {status.ok ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
            <span>{status.msg}</span>
            {status.url && <a href={status.url} target="_blank" rel="noopener" style={{ color: '#5aab6e', marginLeft: 6 }}>abrir ↗</a>}
          </div>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>fechar</button>
          <button onClick={handleCreate} disabled={loading || !listId || !cardName} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', opacity: (!listId || !cardName) ? 0.4 : 1 }}>
            {loading ? 'criando...' : '+ criar card'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────
export default function Notes({ org }) {
  const { groups } = useGroups(org?.id)
  const { notes, loading, createNote, updateNote, deleteNote, togglePin } = useOrgNotes(org?.id)
  const trelloToken = localStorage.getItem('atelier_trello_token') || ''

  const [activeNoteId, setActiveNoteId] = useState(null)
  const [search, setSearch] = useState('')
  const [groupFilter, setGroupFilter] = useState('all')
  const [editingTitle, setEditingTitle] = useState(null)
  const [creating, setCreating] = useState(false)
  const [showPush, setShowPush] = useState(false)
  const [showTrello, setShowTrello] = useState(false)
  const [modal, setModal] = useState(null)

  const activeNote  = notes.find(n => n.id === activeNoteId)
  const activeGroup = groups.find(g => g.id === activeNote?.group_id)

  const filtered = notes.filter(n => {
    const matchSearch = !search || n.title?.toLowerCase().includes(search.toLowerCase()) || n.content?.replace(/<[^>]*>/g,'').toLowerCase().includes(search.toLowerCase())
    const matchGroup = groupFilter === 'all' || n.group_id === groupFilter
    return matchSearch && matchGroup
  })

  const handleUpdate = useCallback(debounce((id, payload) => updateNote(id, payload), 700), [updateNote])

  async function handleCreate() {
    const gId = groupFilter !== 'all' ? groupFilter : groups[0]?.id
    if (!gId) return
    setCreating(true)
    const { data } = await createNote(gId)
    if (data) setActiveNoteId(data.id)
    setCreating(false)
  }

  function askDelete(id) {
    setModal({
      type: 'confirm',
      title: 'EXCLUIR ANOTAÇÃO',
      message: 'Tem certeza? Esta anotação será removida permanentemente e não poderá ser recuperada.',
      onConfirm: async () => {
        setModal(null)
        if (activeNoteId === id) setActiveNoteId(null)
        await deleteNote(id)
      }
    })
  }

  function exportMd() {
    if (!activeNote) return
    const md = `# ${activeNote.title || 'Anotação'}\n\n> Grupo: ${activeGroup?.name || '—'} · ${new Date(activeNote.updated_at).toLocaleDateString('pt-BR')}\n\n---\n\n` + toMarkdown(activeNote.content || '')
    const blob = new Blob([md], { type: 'text/markdown' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `${(activeNote.title || 'nota').toLowerCase().replace(/\s+/g,'-')}.md`; a.click()
  }

  function stripHtml(html) { return (html || '').replace(/<[^>]*>/g, '').trim() }

  const toolBtn = (title, icon, onClick, opts = {}) => (
    <button key={title} onClick={onClick} title={title} style={{
      display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px',
      borderRadius: 'var(--radius)', border: '1px solid var(--border)',
      background: 'var(--surface)',
      color: opts.danger ? 'var(--text-dim)' : 'var(--text-muted)',
      fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '0.08em',
      cursor: 'pointer', transition: 'all var(--fast)',
    }}
      onMouseEnter={e => { e.currentTarget.style.color = opts.danger ? 'var(--red)' : 'var(--text)'; e.currentTarget.style.borderColor = 'var(--border-red)' }}
      onMouseLeave={e => { e.currentTarget.style.color = opts.danger ? 'var(--text-dim)' : 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}>
      {icon}{opts.label && <span>{opts.label}</span>}
    </button>
  )

  return (
    <div className="page-wrap" style={{ height: '100vh', overflow: 'hidden' }}>
      <header style={{ borderBottom: '1px solid var(--border)', padding: '14px 32px', background: 'var(--header-bg)', backdropFilter: 'blur(12px)', flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, letterSpacing: '0.2em', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'center' }}>
          atelier.sh
          <span style={{ color: 'var(--border-bright)', margin: '0 10px' }}>·</span>
          <span style={{ color: 'var(--text-sub)' }}>{org?.name || 'sem org'}</span>
          <span style={{ color: 'var(--border-bright)', margin: '0 10px' }}>·</span>
          <span>anotações</span>
        </div>
      </header>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* ── LISTA ── */}
        <div style={{ width: 270, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--bg-alt)' }}>
          <div style={{ padding: 10, borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 7 }}>
            <div style={{ position: 'relative' }}>
              <Search size={11} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="buscar..."
                style={{ width: '100%', padding: '7px 9px 7px 26px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text)', fontFamily: 'var(--ff-mono)', fontSize: 11, outline: 'none' }} />
            </div>
            <select value={groupFilter} onChange={e => setGroupFilter(e.target.value)} style={{ width: '100%', padding: '7px 9px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text)', fontFamily: 'var(--ff-mono)', fontSize: 11, outline: 'none' }}>
              <option value="all">// todos os grupos</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <button onClick={handleCreate} disabled={creating || groups.length === 0} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', opacity: groups.length === 0 ? 0.4 : 1 }}>
              <Plus size={12} /> {creating ? 'criando...' : 'nova anotação'}
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 6 }}>
            {loading && <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-dim)', padding: 8 }}>carregando_</div>}
            {!loading && filtered.length === 0 && (
              <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-dim)', padding: '12px 8px', textAlign: 'center', lineHeight: 1.7 }}>
                {notes.length === 0 ? 'nenhuma anotação ainda' : 'sem resultados'}
              </div>
            )}
            {filtered.map(note => (
              <button key={note.id} onClick={() => setActiveNoteId(note.id)} style={{
                width: '100%', textAlign: 'left', padding: '8px 9px', borderRadius: 'var(--radius-md)', marginBottom: 2,
                background: activeNoteId === note.id ? 'var(--red-dim)' : 'transparent',
                border: activeNoteId === note.id ? '1px solid var(--border-red)' : '1px solid transparent',
                transition: 'all var(--fast)', cursor: 'pointer',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                  {note.pinned && <Pin size={9} style={{ color: activeNoteId === note.id ? '#F0EDE8' : 'var(--red)', flexShrink: 0 }} />}
                  <span style={{ fontSize: 12, fontWeight: 500, color: activeNoteId === note.id ? '#F0EDE8' : 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {note.title || 'sem título'}
                  </span>
                </div>
                {note.content && (
                  <div style={{ fontFamily: 'var(--ff-body)', fontSize: 11, color: activeNoteId === note.id ? 'rgba(240,237,232,0.45)' : 'var(--text-dim)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {stripHtml(note.content).substring(0, 55)}
                  </div>
                )}
              </button>
            ))}
          </div>

          <div style={{ padding: '7px 10px', borderTop: '1px solid var(--border)', fontFamily: 'var(--ff-mono)', fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.12em' }}>
            {filtered.length} anotaç{filtered.length !== 1 ? 'ões' : 'ão'} · {notes.filter(n => n.pinned).length} fixada{notes.filter(n=>n.pinned).length!==1?'s':''}
          </div>
        </div>

        {/* ── EDITOR ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          {activeNote ? (<>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)', flexShrink: 0, flexWrap: 'wrap' }}>
              {editingTitle === activeNote.id
                ? <input autoFocus defaultValue={activeNote.title}
                    onBlur={e => { updateNote(activeNote.id, { title: e.target.value }); setEditingTitle(null) }}
                    onKeyDown={e => { if (e.key === 'Enter') e.target.blur() }}
                    style={{ flex: 1, minWidth: 0, background: 'var(--surface)', border: '1px solid var(--border-red)', borderRadius: 'var(--radius)', padding: '4px 8px', color: 'var(--text)', fontSize: 14, fontWeight: 600, outline: 'none' }} />
                : <div onClick={() => setEditingTitle(activeNote.id)} style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, color: 'var(--text)', cursor: 'text', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {activeNote.title || 'sem título'}
                  </div>
              }
              <div style={{ display: 'flex', gap: 4, flexShrink: 0, flexWrap: 'wrap' }}>
                <button onClick={() => togglePin(activeNote.id, activeNote.pinned)} title={activeNote.pinned ? 'desafixar' : 'fixar'} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: activeNote.pinned ? 'var(--red-dim)' : 'var(--surface)', color: activeNote.pinned ? '#F0EDE8' : 'var(--text-muted)', fontFamily: 'var(--ff-mono)', fontSize: 10, cursor: 'pointer', transition: 'all var(--fast)' }}>
                  {activeNote.pinned ? <PinOff size={11} /> : <Pin size={11} />}
                </button>
                {toolBtn('.md', <Download size={11} />, exportMd, { label: '.md' })}
                {toolBtn('github', <Send size={11} />, () => setShowPush(true), { label: 'github' })}
                {toolBtn('trello', <LayoutList size={11} />, () => setShowTrello(true), { label: 'trello' })}
                {toolBtn('excluir', <Trash2 size={11} />, () => askDelete(activeNote.id), { danger: true })}
              </div>
            </div>

            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <NoteEditor note={activeNote} onUpdate={handleUpdate} />
            </div>

            <div style={{ padding: '6px 16px', borderTop: '1px solid var(--border)', fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--text-dim)', display: 'flex', justifyContent: 'space-between', flexShrink: 0 }}>
              <span>›_ salvo automaticamente</span>
              <span>{new Date(activeNote.updated_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </>) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
              <FileText size={36} style={{ color: 'var(--text-dim)', opacity: 0.25 }} />
              <div style={{ fontFamily: 'var(--ff-disp)', fontSize: 22, letterSpacing: '0.08em', color: 'var(--text-dim)' }}>SELECIONE UMA NOTA</div>
              <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.15em' }}>ou crie uma nova ao lado</div>
              {groups.length > 0 && <button onClick={handleCreate} className="btn btn-primary" style={{ marginTop: 8 }}><Plus size={12} /> nova anotação</button>}
            </div>
          )}
        </div>
      </div>

      {showPush   && <PushModal note={activeNote} group={activeGroup} onClose={() => setShowPush(false)} />}
      {showTrello && <TrelloCardModal note={activeNote} group={activeGroup} trelloToken={trelloToken} onClose={() => setShowTrello(false)} />}
      {modal && <CardModal {...modal} onClose={() => setModal(null)} confirmLabel="excluir" />}
    </div>
  )
}
