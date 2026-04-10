import { useState, useCallback, useRef } from 'react'
import { useGroups } from '../hooks/useGroups'
import { useOrgNotes } from '../hooks/useNotes'
import { useFolders } from '../hooks/useFolders'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import { pushFileToRepo } from '../lib/github'
import { createTrelloCard, fetchBoardLists } from '../lib/trello'
import {
  Pin, PinOff, Plus, Trash2, Search, Bold, Italic,
  List, ListOrdered, Heading2, Code, FileText,
  Download, Send, LayoutList, X, ImageIcon, AlertCircle, CheckCircle2,
  FolderPlus, Folder, FolderOpen, ChevronRight, ChevronDown,
  Pencil, FolderInput,
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
        <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.1em', opacity: 0.7 }}>ctrl+v para colar imagem</span>
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

function PushModal({ note, group, onClose }) {
  const [repo, setRepo]     = useState('sua-org/repositorio')
  const [path, setPath]     = useState(`devolutivas/${group?.name?.toLowerCase().replace(/\s+/g,'-') || 'grupo'}/${note?.title?.toLowerCase().replace(/\s+/g,'-') || 'nota'}.md`)
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

function TrelloCardModal({ note, group, trelloToken, onClose }) {
  const [lists, setLists]       = useState([])
  const [listId, setListId]     = useState('')
  const [cardName, setCardName] = useState(note?.title || '')
  const [cardDesc, setCardDesc] = useState(toMarkdown(note?.content || '').substring(0, 300))
  const [status, setStatus]     = useState(null)
  const [loading, setLoading]   = useState(false)

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
          <button onClick={handleCreate} disabled={loading || !listId || !cardName} className="btn btn-primary"
            style={{ flex: 1, justifyContent: 'center', opacity: (!listId || !cardName) ? 0.4 : 1 }}>
            {loading ? 'criando...' : '+ criar card'}
          </button>
        </div>
      </div>
    </div>
  )
}

function NoteItem({ note, active, indent = false, onClick }) {
  function stripHtml(html) { return (html || '').replace(/<[^>]*>/g, '').trim() }
  return (
    <button onClick={onClick} style={{
      width: '100%', textAlign: 'left',
      padding: indent ? '7px 9px 7px 28px' : '8px 9px',
      borderRadius: 'var(--radius-md)', marginBottom: 2,
      background: active ? 'var(--red-dim)' : 'transparent',
      border: active ? '1px solid var(--border-red)' : '1px solid transparent',
      transition: 'all var(--fast)', cursor: 'pointer',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
        {note.pinned && <Pin size={9} style={{ color: active ? '#F0EDE8' : 'var(--red)', flexShrink: 0 }} />}
        <span style={{ fontSize: 12, fontWeight: 500, color: active ? '#F0EDE8' : 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {note.title || 'sem título'}
        </span>
      </div>
      {note.content && (
        <div style={{ fontFamily: 'var(--ff-body)', fontSize: 11, color: active ? 'rgba(240,237,232,0.45)' : 'var(--text-dim)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {stripHtml(note.content).substring(0, 55)}
        </div>
      )}
    </button>
  )
}

function FolderRow({ folder, open, onToggle, onRename, onDelete, onAddNote, noteCount }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState(folder.name)
  const [hover, setHover]     = useState(false)

  function commitRename() {
    if (draft.trim() && draft.trim() !== folder.name) onRename(folder.id, draft.trim())
    setEditing(false)
  }

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '5px 6px 5px 4px', borderRadius: 'var(--radius)', marginBottom: 1, userSelect: 'none' }}
    >
      <button onClick={onToggle} style={{ color: 'var(--text-dim)', cursor: 'pointer', padding: 2, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
        {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
      </button>
      <button onClick={onToggle} style={{ color: open ? 'var(--red)' : 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        {open ? <FolderOpen size={13} /> : <Folder size={13} />}
      </button>
      {editing
        ? <input
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditing(false) }}
            style={{ flex: 1, minWidth: 0, background: 'var(--surface)', border: '1px solid var(--border-red)', borderRadius: 'var(--radius)', padding: '2px 6px', color: 'var(--text)', fontFamily: 'var(--ff-mono)', fontSize: 11, outline: 'none' }}
          />
        : <button onClick={onToggle} style={{ flex: 1, minWidth: 0, textAlign: 'left', fontFamily: 'var(--ff-mono)', fontSize: 11, letterSpacing: '0.05em', color: 'var(--text)', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {folder.name}
          </button>
      }
      {!editing && (
        <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, color: 'var(--text-dim)', flexShrink: 0, opacity: hover ? 0 : 0.7 }}>
          {noteCount}
        </span>
      )}
      {hover && !editing && (
        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
          <button onClick={onAddNote} title="nova nota nesta pasta" style={{ color: 'var(--text-dim)', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}>
            <Plus size={11} />
          </button>
          <button onClick={() => { setDraft(folder.name); setEditing(true) }} title="renomear" style={{ color: 'var(--text-dim)', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}>
            <Pencil size={10} />
          </button>
          <button onClick={() => onDelete(folder.id)} title="excluir pasta" style={{ color: 'var(--text-dim)', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}>
            <Trash2 size={10} />
          </button>
        </div>
      )}
    </div>
  )
}

function NewFolderInput({ onConfirm, onCancel }) {
  const [name, setName] = useState('')
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '4px 6px', marginBottom: 2 }}>
      <Folder size={12} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
      <input
        autoFocus
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="nome da pasta..."
        onKeyDown={e => {
          if (e.key === 'Enter' && name.trim()) onConfirm(name.trim())
          if (e.key === 'Escape') onCancel()
        }}
        onBlur={() => { if (name.trim()) onConfirm(name.trim()); else onCancel() }}
        style={{ flex: 1, minWidth: 0, background: 'var(--surface)', border: '1px solid var(--border-red)', borderRadius: 'var(--radius)', padding: '3px 7px', color: 'var(--text)', fontFamily: 'var(--ff-mono)', fontSize: 11, outline: 'none' }}
      />
    </div>
  )
}

export default function Notes({ org }) {
  const { groups } = useGroups(org?.id)
  const { notes, loading, createNote, updateNote, deleteNote, togglePin } = useOrgNotes(org?.id)
  const trelloToken = localStorage.getItem('atelier_trello_token') || ''

  const [activeNoteId, setActiveNoteId]     = useState(null)
  const [search, setSearch]                 = useState('')
  const [groupFilter, setGroupFilter]       = useState('all')
  const [editingTitle, setEditingTitle]     = useState(null)
  const [creating, setCreating]             = useState(false)
  const [showPush, setShowPush]             = useState(false)
  const [showTrello, setShowTrello]         = useState(false)
  const [modal, setModal]                   = useState(null)
  const [collapsedFolders, setCollapsedFolders] = useState({})
  const [addingFolder, setAddingFolder]         = useState(false)
  const [showFolderPicker, setShowFolderPicker] = useState(false)

  const groupForFolders = groupFilter !== 'all' ? groupFilter : null
  const { folders, createFolder, renameFolder, deleteFolder } = useFolders(groupForFolders, org?.id)

  const activeNote  = notes.find(n => n.id === activeNoteId)
  const activeGroup = groups.find(g => g.id === activeNote?.group_id)

  const filtered = notes.filter(n => {
    const matchSearch = !search || n.title?.toLowerCase().includes(search.toLowerCase()) || n.content?.replace(/<[^>]*>/g,'').toLowerCase().includes(search.toLowerCase())
    const matchGroup  = groupFilter === 'all' || n.group_id === groupFilter
    return matchSearch && matchGroup
  })

  const handleUpdate = useCallback(debounce((id, payload) => updateNote(id, payload), 700), [updateNote])

  async function handleCreate(folderId = null) {
    const gId = groupFilter !== 'all' ? groupFilter : groups[0]?.id
    if (!gId) return
    setCreating(true)
    const { data } = await createNote(gId, 'Nova anotação', { folder_id: folderId || null })
    if (data) setActiveNoteId(data.id)
    setCreating(false)
  }

  async function handleCreateFolder(name) {
    setAddingFolder(false)
    await createFolder(name)
  }

  async function moveNoteToFolder(noteId, folderId) {
    await updateNote(noteId, { folder_id: folderId || null })
    setShowFolderPicker(false)
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

  function askDeleteFolder(folderId) {
    const f = folders.find(x => x.id === folderId)
    const count = filtered.filter(n => n.folder_id === folderId).length
    setModal({
      type: 'confirm',
      title: 'EXCLUIR PASTA',
      message: `Excluir a pasta "${f?.name}"? ${count > 0 ? `As ${count} anotação(ões) dentro dela ficam sem pasta — não serão apagadas.` : 'Ela está vazia.'}`,
      onConfirm: async () => {
        setModal(null)
        await deleteFolder(folderId)
      }
    })
  }

  function toggleFolderCollapse(folderId) {
    setCollapsedFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }))
  }

  function exportMd() {
    if (!activeNote) return
    const md = `# ${activeNote.title || 'Anotação'}\n\n> Grupo: ${activeGroup?.name || '—'} · ${new Date(activeNote.updated_at).toLocaleDateString('pt-BR')}\n\n---\n\n` + toMarkdown(activeNote.content || '')
    const blob = new Blob([md], { type: 'text/markdown' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `${(activeNote.title || 'nota').toLowerCase().replace(/\s+/g,'-')}.md`; a.click()
  }

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

  const activeNoteFolder = activeNote?.folder_id ? folders.find(f => f.id === activeNote.folder_id) : null
  const showFolderTree   = groupFilter !== 'all'
  const folderNotes      = (folderId) => filtered.filter(n => n.folder_id === folderId)
  const unfolderedNotes  = filtered.filter(n => !n.folder_id)

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

        {/* ── SIDEBAR ── */}
        <div style={{ width: 270, flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--bg-alt)' }}>
          <div style={{ padding: 10, borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 7 }}>
            <div style={{ position: 'relative' }}>
              <Search size={11} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="buscar..."
                style={{ width: '100%', padding: '7px 9px 7px 26px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text)', fontFamily: 'var(--ff-mono)', fontSize: 11, outline: 'none' }} />
            </div>
            <select value={groupFilter} onChange={e => { setGroupFilter(e.target.value); setAddingFolder(false) }}
              style={{ width: '100%', padding: '7px 9px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text)', fontFamily: 'var(--ff-mono)', fontSize: 11, outline: 'none' }}>
              <option value="all">// todos os grupos</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            {showFolderTree
              ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => setAddingFolder(true)} disabled={addingFolder} className="btn btn-ghost"
                    style={{ flex: 1, justifyContent: 'center', fontSize: 10, gap: 4 }}>
                    <FolderPlus size={11} /> nova pasta
                  </button>
                  <button onClick={() => handleCreate(null)} disabled={creating || groups.length === 0} className="btn btn-primary"
                    style={{ flex: 1, justifyContent: 'center', fontSize: 10, gap: 4 }}>
                    <Plus size={11} /> {creating ? '...' : 'nota'}
                  </button>
                </div>
              )
              : (
                <button onClick={() => handleCreate(null)} disabled={creating || groups.length === 0} className="btn btn-primary"
                  style={{ width: '100%', justifyContent: 'center', opacity: groups.length === 0 ? 0.4 : 1 }}>
                  <Plus size={12} /> {creating ? 'criando...' : 'nova anotação'}
                </button>
              )
            }
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 6 }}>
            {loading && <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-dim)', padding: 8 }}>carregando_</div>}

            {!loading && showFolderTree && (
              <>
                {addingFolder && (
                  <NewFolderInput onConfirm={handleCreateFolder} onCancel={() => setAddingFolder(false)} />
                )}
                {folders.map(folder => {
                  const fNotes = folderNotes(folder.id)
                  const isOpen = !collapsedFolders[folder.id]
                  return (
                    <div key={folder.id}>
                      <FolderRow
                        folder={folder}
                        open={isOpen}
                        noteCount={fNotes.length}
                        onToggle={() => toggleFolderCollapse(folder.id)}
                        onRename={renameFolder}
                        onDelete={askDeleteFolder}
                        onAddNote={() => handleCreate(folder.id)}
                      />
                      {isOpen && fNotes.map(note => (
                        <NoteItem key={note.id} note={note} active={activeNoteId === note.id} indent onClick={() => setActiveNoteId(note.id)} />
                      ))}
                    </div>
                  )
                })}
                {(unfolderedNotes.length > 0 || folders.length > 0) && (
                  <div style={{ marginTop: folders.length > 0 ? 6 : 0 }}>
                    {folders.length > 0 && (
                      <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-dim)', padding: '4px 6px 3px', opacity: 0.6 }}>
                        sem pasta
                      </div>
                    )}
                    {unfolderedNotes.map(note => (
                      <NoteItem key={note.id} note={note} active={activeNoteId === note.id} onClick={() => setActiveNoteId(note.id)} />
                    ))}
                    {unfolderedNotes.length === 0 && folders.length > 0 && (
                      <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--text-dim)', padding: '4px 8px', opacity: 0.5 }}>—</div>
                    )}
                  </div>
                )}
                {!loading && filtered.length === 0 && folders.length === 0 && !addingFolder && (
                  <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-dim)', padding: '12px 8px', textAlign: 'center', lineHeight: 1.7 }}>
                    nenhuma anotação ainda
                  </div>
                )}
              </>
            )}

            {!loading && !showFolderTree && (
              <>
                {filtered.length === 0 && (
                  <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-dim)', padding: '12px 8px', textAlign: 'center', lineHeight: 1.7 }}>
                    {notes.length === 0 ? 'nenhuma anotação ainda' : 'sem resultados'}
                  </div>
                )}
                {filtered.map(note => (
                  <NoteItem key={note.id} note={note} active={activeNoteId === note.id} onClick={() => setActiveNoteId(note.id)} />
                ))}
              </>
            )}
          </div>

          <div style={{ padding: '7px 10px', borderTop: '1px solid var(--border)', fontFamily: 'var(--ff-mono)', fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.12em' }}>
            {filtered.length} anotaç{filtered.length !== 1 ? 'ões' : 'ão'} · {notes.filter(n => n.pinned).length} fixada{notes.filter(n=>n.pinned).length!==1?'s':''}
            {showFolderTree && folders.length > 0 && ` · ${folders.length} pasta${folders.length !== 1 ? 's' : ''}`}
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
              <div style={{ display: 'flex', gap: 4, flexShrink: 0, flexWrap: 'wrap', alignItems: 'center' }}>
                {showFolderTree && folders.length > 0 && (
                  <div style={{ position: 'relative' }}>
                    <button onClick={() => setShowFolderPicker(v => !v)} title="mover para pasta"
                      style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--surface)', color: activeNoteFolder ? 'var(--text)' : 'var(--text-muted)', fontFamily: 'var(--ff-mono)', fontSize: 10, cursor: 'pointer', transition: 'all var(--fast)' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-red)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)' }}>
                      <FolderInput size={11} />
                      <span style={{ maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {activeNoteFolder ? activeNoteFolder.name : 'sem pasta'}
                      </span>
                    </button>
                    {showFolderPicker && (
                      <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, background: 'var(--bg-card)', border: '1px solid var(--border-red)', borderRadius: 'var(--radius-md)', padding: 4, zIndex: 200, minWidth: 150, boxShadow: '0 8px 24px rgba(0,0,0,0.35)' }}>
                        <button onClick={() => moveNoteToFolder(activeNote.id, null)}
                          style={{ width: '100%', textAlign: 'left', padding: '5px 9px', borderRadius: 'var(--radius)', fontFamily: 'var(--ff-mono)', fontSize: 11, color: !activeNote.folder_id ? 'var(--red)' : 'var(--text-muted)', cursor: 'pointer', background: 'transparent' }}>
                          sem pasta
                        </button>
                        {folders.map(f => (
                          <button key={f.id} onClick={() => moveNoteToFolder(activeNote.id, f.id)}
                            style={{ width: '100%', textAlign: 'left', padding: '5px 9px', borderRadius: 'var(--radius)', fontFamily: 'var(--ff-mono)', fontSize: 11, color: activeNote.folder_id === f.id ? 'var(--red)' : 'var(--text-muted)', cursor: 'pointer', background: 'transparent', display: 'flex', alignItems: 'center', gap: 6 }}
                            onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
                            onMouseLeave={e => e.currentTarget.style.color = activeNote.folder_id === f.id ? 'var(--red)' : 'var(--text-muted)'}>
                            <Folder size={10} /> {f.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <button onClick={() => togglePin(activeNote.id, activeNote.pinned)} title={activeNote.pinned ? 'desafixar' : 'fixar'}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: activeNote.pinned ? 'var(--red-dim)' : 'var(--surface)', color: activeNote.pinned ? '#F0EDE8' : 'var(--text-muted)', fontFamily: 'var(--ff-mono)', fontSize: 10, cursor: 'pointer', transition: 'all var(--fast)' }}>
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
              <span>
                ›_ salvo automaticamente
                {activeNoteFolder && (
                  <span style={{ marginLeft: 10, opacity: 0.6 }}>
                    <Folder size={9} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />
                    {activeNoteFolder.name}
                  </span>
                )}
              </span>
              <span>{new Date(activeNote.updated_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </>) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
              <FileText size={36} style={{ color: 'var(--text-dim)', opacity: 0.25 }} />
              <div style={{ fontFamily: 'var(--ff-disp)', fontSize: 22, letterSpacing: '0.08em', color: 'var(--text-dim)' }}>SELECIONE UMA NOTA</div>
              <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.15em' }}>ou crie uma nova ao lado</div>
              {groups.length > 0 && <button onClick={() => handleCreate(null)} className="btn btn-primary" style={{ marginTop: 8 }}><Plus size={12} /> nova anotação</button>}
            </div>
          )}
        </div>
      </div>

      {showFolderPicker && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setShowFolderPicker(false)} />
      )}

      {showPush   && <PushModal note={activeNote} group={activeGroup} onClose={() => setShowPush(false)} />}
      {showTrello && <TrelloCardModal note={activeNote} group={activeGroup} trelloToken={trelloToken} onClose={() => setShowTrello(false)} />}
      {modal && <CardModal {...modal} onClose={() => setModal(null)} confirmLabel="excluir" />}
    </div>
  )
}