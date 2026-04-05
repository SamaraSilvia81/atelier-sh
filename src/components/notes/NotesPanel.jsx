import { useState, useEffect, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import { useNotes } from '../../hooks/useNotes'
import { pushFileToRepo } from '../../lib/github'
import { createTrelloCard, fetchBoardLists } from '../../lib/trello'
import {
  X, Plus, Pin, PinOff, Trash2, Bold, Italic, List, ListOrdered,
  Heading2, Code, Download, Send, LayoutList, ImageIcon, CheckCircle2, AlertCircle
} from 'lucide-react'
import { useSounds } from '../../hooks/useSounds'

function debounce(fn, ms) { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms) } }

function toMarkdown(html) {
  if (!html) return ''
  return html
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
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

// ── Image URL modal ───────────────────────────────────────────────────
function ImageUrlModal({ onInsert, onClose }) {
  const [url, setUrl] = useState('')
  const inp = { width: '100%', padding: '8px 10px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'var(--ff-mono)', fontSize: 11, borderRadius: 'var(--radius)', outline: 'none', boxSizing: 'border-box' }
  const lbl = { fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-dim)', display: 'block', marginBottom: 5 }
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', zIndex: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-red)', borderRadius: 'var(--radius-md)', width: '100%', maxWidth: 400, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontFamily: 'var(--ff-disp)', fontSize: 18, letterSpacing: '0.05em' }}>INSERIR IMAGEM</div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)', cursor: 'pointer' }}><X size={14} /></button>
        </div>
        <div className="field"><label style={lbl}>url da imagem</label><input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." style={inp} autoFocus /></div>
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>cancelar</button>
          <button onClick={() => { if (url.trim()) { onInsert(url.trim()); onClose() } }}
            disabled={!url.trim()} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', opacity: !url.trim() ? 0.4 : 1 }}>
            inserir
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Push to GitHub modal ──────────────────────────────────────────────
function PushModal({ note, group, onClose }) {
  const [repo, setRepo] = useState('ETE-CiceroDias/ete-docs-mod3')
  const [path, setPath] = useState(`devolutivas/${group?.name?.toLowerCase().replace(/\s+/g, '-') || 'grupo'}/${note?.title?.toLowerCase().replace(/\s+/g, '-') || 'nota'}.md`)
  const [msg, setMsg] = useState(`docs: devolutiva ${group?.name || ''} — ${note?.title || ''}`)
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handlePush() {
    setLoading(true); setStatus(null)
    const header = `# ${note.title || 'Devolutiva'}\n\n> **Grupo:** ${group?.name || '—'}  \n> **Data:** ${new Date().toLocaleDateString('pt-BR')}\n\n---\n\n`
    const result = await pushFileToRepo({ repo, path, content: header + toMarkdown(note.content || ''), message: msg })
    setStatus(result.success ? { ok: true, msg: '✓ enviado com sucesso!' } : { ok: false, msg: '✗ ' + result.error })
    setLoading(false)
  }

  const inp = { width: '100%', padding: '8px 10px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'var(--ff-mono)', fontSize: 11, borderRadius: 'var(--radius)', outline: 'none', boxSizing: 'border-box' }
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

// ── Trello card modal ─────────────────────────────────────────────────
function TrelloCardModal({ note, group, trelloToken, onClose }) {
  const [lists, setLists] = useState([])
  const [listId, setListId] = useState('')
  const [cardName, setCardName] = useState(note?.title || '')
  const [cardDesc, setCardDesc] = useState(toMarkdown(note?.content || '').substring(0, 300))
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
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

  const inp = { width: '100%', padding: '8px 10px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'var(--ff-mono)', fontSize: 11, borderRadius: 'var(--radius)', outline: 'none', boxSizing: 'border-box' }
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

// ── NoteEditor ────────────────────────────────────────────────────────
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

  useEffect(() => {
    if (editor && note.content !== editor.getHTML()) {
      editor.commands.setContent(note.content || '')
    }
  }, [note.id])

  if (!editor) return null

  const T = ({ action, active, title, icon }) => (
    <button onClick={action} title={title} style={{
      padding: '4px 7px', borderRadius: 4, fontSize: 12,
      color: active ? 'var(--red)' : 'var(--text-muted)',
      background: active ? 'var(--red-dim)' : 'transparent',
      border: active ? '1px solid var(--border-red)' : '1px solid transparent',
      cursor: 'pointer', transition: 'all var(--fast)',
    }}>{icon}</button>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <div style={{ display: 'flex', gap: 2, padding: '7px 12px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', flexShrink: 0, background: 'var(--bg-alt)', alignItems: 'center' }}>
        <T action={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="negrito" icon={<Bold size={12} />} />
        <T action={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="itálico" icon={<Italic size={12} />} />
        <T action={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="título" icon={<Heading2 size={12} />} />
        <T action={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="lista" icon={<List size={12} />} />
        <T action={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="numerada" icon={<ListOrdered size={12} />} />
        <T action={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="código" icon={<Code size={12} />} />
        <div style={{ width: 1, height: 14, background: 'var(--border)', margin: '0 4px' }} />
        <T action={() => setShowImgModal(true)} active={false} title="inserir imagem (ou ctrl+v)" icon={<ImageIcon size={12} />} />
        <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.1em', opacity: 0.7 }}>ctrl+v para colar imagem</span>
      </div>
      <EditorContent editor={editor} style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }} />
      {showImgModal && (
        <ImageUrlModal
          onInsert={src => editor.chain().focus().setImage({ src }).run()}
          onClose={() => setShowImgModal(false)}
        />
      )}
    </div>
  )
}

// ── Main NotesPanel ───────────────────────────────────────────────────
export default function NotesPanel({ group, orgId, onClose }) {
  const { notes, loading, createNote, updateNote, deleteNote, togglePin } = useNotes(group?.id, orgId)
  const trelloToken = localStorage.getItem('atelier_trello_token') || ''
  const sounds = useSounds()
  const [activeNoteId, setActiveNoteId] = useState(null)
  const [editingTitle, setEditingTitle] = useState(null)
  const [showPush, setShowPush] = useState(false)
  const [showTrello, setShowTrello] = useState(false)

  const activeNote = notes.find(n => n.id === activeNoteId) || notes[0]

  useEffect(() => {
    if (notes.length > 0 && !activeNoteId) setActiveNoteId(notes[0].id)
  }, [notes])

  const handleUpdate = useCallback(
    debounce((id, payload) => updateNote(id, payload), 800),
    [updateNote]
  )

  async function handleCreate() {
    const { data } = await createNote()
    if (data) { setActiveNoteId(data.id); sounds.play('open') }
  }

  function exportMd() {
    if (!activeNote) return
    const md = `# ${activeNote.title || 'Anotação'}\n\n> Grupo: ${group?.name || '—'} · ${new Date(activeNote.updated_at).toLocaleDateString('pt-BR')}\n\n---\n\n` + toMarkdown(activeNote.content || '')
    const blob = new Blob([md], { type: 'text/markdown' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${(activeNote.title || 'nota').toLowerCase().replace(/\s+/g, '-')}.md`
    a.click()
  }

  const toolBtn = (title, icon, onClick, opts = {}) => (
    <button key={title} onClick={onClick} title={title} style={{
      display: 'flex', alignItems: 'center', gap: 4, padding: '4px 7px',
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
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        width: '100%', maxWidth: 860, height: '88vh', background: 'var(--bg-card)',
        border: '1px solid var(--border-2)', borderRadius: 'var(--radius-xl)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: group?.color || 'var(--red)', flexShrink: 0 }} />
          <span style={{ fontWeight: 600, fontSize: 14 }}>{group?.name}</span>
          <span style={{ color: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--ff-mono)' }}>/ anotações</span>
          <div style={{ flex: 1 }} />
          <button onClick={onClose} style={{ color: 'var(--text-muted)', padding: 4, cursor: 'pointer' }}><X size={16} /></button>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
          {/* Sidebar - nota list */}
          <div style={{ width: 200, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <button onClick={handleCreate} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', fontSize: 12, padding: '6px 12px' }}>
                <Plus size={12} /> nova nota
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
              {loading && <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: 8, fontFamily: 'var(--ff-mono)' }}>carregando_</div>}
              {notes.map(note => (
                <button key={note.id} onClick={() => setActiveNoteId(note.id)} style={{
                  width: '100%', textAlign: 'left', padding: '7px 9px', borderRadius: 'var(--radius)',
                  background: activeNote?.id === note.id ? 'var(--red-dim)' : 'transparent',
                  border: activeNote?.id === note.id ? '1px solid var(--border-red)' : '1px solid transparent',
                  display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2,
                  transition: 'all var(--fast)', cursor: 'pointer',
                }}>
                  {note.pinned && <Pin size={9} style={{ color: activeNote?.id === note.id ? '#F0EDE8' : 'var(--red)', flexShrink: 0 }} />}
                  <span style={{ fontSize: 12, color: activeNote?.id === note.id ? '#F0EDE8' : 'var(--text-sub)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {note.title || 'sem título'}
                  </span>
                </button>
              ))}
              {!loading && notes.length === 0 && (
                <div style={{ fontSize: 12, color: 'var(--text-dim)', padding: '12px 8px', textAlign: 'center', fontFamily: 'var(--ff-mono)' }}>
                  nenhuma nota ainda
                </div>
              )}
            </div>
          </div>

          {/* Editor */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
            {activeNote ? (
              <>
                {/* Note actions bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0, flexWrap: 'wrap' }}>
                  {editingTitle === activeNote.id ? (
                    <input
                      autoFocus
                      defaultValue={activeNote.title}
                      onBlur={e => { updateNote(activeNote.id, { title: e.target.value }); setEditingTitle(null) }}
                      onKeyDown={e => { if (e.key === 'Enter') e.target.blur() }}
                      style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border-red)', borderRadius: 'var(--radius)', padding: '4px 8px', color: 'var(--text)', fontSize: 14, fontWeight: 600, outline: 'none', minWidth: 0 }}
                    />
                  ) : (
                    <span onClick={() => setEditingTitle(activeNote.id)} style={{ flex: 1, fontWeight: 600, fontSize: 14, cursor: 'text', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                      {activeNote.title || 'sem título'}
                    </span>
                  )}
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button onClick={() => togglePin(activeNote.id, activeNote.pinned)} title={activeNote.pinned ? 'desafixar' : 'fixar'} style={{ padding: '4px 6px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: activeNote.pinned ? 'var(--red-dim)' : 'var(--surface)', color: activeNote.pinned ? '#F0EDE8' : 'var(--text-muted)', cursor: 'pointer' }}>
                      {activeNote.pinned ? <PinOff size={11} /> : <Pin size={11} />}
                    </button>
                    {toolBtn('.md', <Download size={11} />, exportMd, { label: '.md' })}
                    {toolBtn('github', <Send size={11} />, () => setShowPush(true), { label: 'github' })}
                    {toolBtn('trello', <LayoutList size={11} />, () => setShowTrello(true), { label: 'trello' })}
                    {toolBtn('excluir', <Trash2 size={11} />, () => { deleteNote(activeNote.id); setActiveNoteId(null) }, { danger: true })}
                  </div>
                </div>

                {/* TipTap editor with image support */}
                <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <NoteEditor note={activeNote} onUpdate={handleUpdate} />
                </div>

                {/* Footer */}
                <div style={{ padding: '5px 16px', borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--ff-mono)', display: 'flex', justifyContent: 'space-between', flexShrink: 0 }}>
                  <span>›_ salvo automaticamente</span>
                  <span>{new Date(activeNote.updated_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: 'var(--text-muted)' }}>
                <div style={{ fontSize: 13, fontFamily: 'var(--ff-mono)' }}>selecione ou crie uma nota</div>
                <button onClick={handleCreate} className="btn btn-primary" style={{ fontSize: 13 }}><Plus size={13} /> nova nota</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showPush && <PushModal note={activeNote} group={group} onClose={() => setShowPush(false)} />}
      {showTrello && <TrelloCardModal note={activeNote} group={group} trelloToken={trelloToken} onClose={() => setShowTrello(false)} />}
    </div>
  )
}
