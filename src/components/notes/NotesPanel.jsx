import { useState, useEffect, useCallback, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { Image as TiptapImage } from '@tiptap/extension-image'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'

// Extensão de imagem com resize via width/height
const ResizableImage = TiptapImage.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width:  { default: null, renderHTML: a => a.width  ? { width:  a.width  } : {} },
      height: { default: null, renderHTML: a => a.height ? { height: a.height } : {} },
    }
  },
})
import { useNotes } from '../../hooks/useNotes'
import { useFolders } from '../../hooks/useFolders'
import { pushFileToRepo } from '../../lib/github'
import { createTrelloCard, fetchBoardLists } from '../../lib/trello'
import {
  X, Plus, Pin, PinOff, Trash2, Bold, Italic, List, ListOrdered,
  Heading2, Code, Download, Send, LayoutList, ImageIcon, CheckCircle2, AlertCircle,
  Globe, Lock, User, FolderPlus, Folder, FolderOpen, ChevronRight, ChevronDown,
  Pencil, Upload, Copy, LayoutTemplate, FileText, Table2
} from 'lucide-react'
import { useSounds } from '../../hooks/useSounds'
import { useNoteTemplates } from '../../hooks/useNoteTemplates'

function debounce(fn, ms) { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms) } }

// ── Toolbar button — declarado FORA do NoteEditor para não recriar a cada render ──
function ToolbarBtn({ action, active, title, icon }) {
  return (
    <button onClick={action} title={title} style={{
      padding: '4px 7px', borderRadius: 4, fontSize: 12,
      color: active ? 'var(--red)' : 'var(--text-muted)',
      background: active ? 'var(--red-dim)' : 'transparent',
      border: active ? '1px solid var(--border-red)' : '1px solid transparent',
      cursor: 'pointer', transition: 'all var(--fast)',
    }}>{icon}</button>
  )
}

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

// ── Image modal (URL ou upload) ───────────────────────────────────────
function ImageModal({ onInsert, onClose }) {
  const [tab, setTab] = useState('upload') // 'upload' | 'url'
  const [url, setUrl] = useState('')
  const [preview, setPreview] = useState(null)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef()

  const inp = { width: '100%', padding: '8px 10px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'var(--ff-mono)', fontSize: 11, borderRadius: 'var(--radius)', outline: 'none', boxSizing: 'border-box' }
  const lbl = { fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-dim)', display: 'block', marginBottom: 5 }

  function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = e => setPreview(e.target.result)
    reader.readAsDataURL(file)
  }

  function handleDrop(e) {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files?.[0]
    handleFile(file)
  }

  function insertUpload() {
    if (preview) { onInsert(preview); onClose() }
  }

  function insertUrl() {
    if (url.trim()) { onInsert(url.trim()); onClose() }
  }

  const tabStyle = (active) => ({
    flex: 1, padding: '6px 0', fontFamily: 'var(--ff-mono)', fontSize: 10,
    letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer',
    borderBottom: active ? '2px solid var(--red)' : '2px solid transparent',
    color: active ? 'var(--text)' : 'var(--text-dim)',
    background: 'transparent', transition: 'all var(--fast)',
  })

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', zIndex: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-red)', borderRadius: 'var(--radius-md)', width: '100%', maxWidth: 420, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontFamily: 'var(--ff-disp)', fontSize: 18, letterSpacing: '0.05em' }}>INSERIR IMAGEM</div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)', cursor: 'pointer' }}><X size={14} /></button>
        </div>

        {/* tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
          <button style={tabStyle(tab === 'upload')} onClick={() => setTab('upload')}>
            <Upload size={10} style={{ display: 'inline', marginRight: 4 }} />upload
          </button>
          <button style={tabStyle(tab === 'url')} onClick={() => setTab('url')}>
            url
          </button>
        </div>

        {tab === 'upload' ? (
          <>
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${dragging ? 'var(--red)' : 'var(--border)'}`,
                borderRadius: 'var(--radius)', padding: 20, textAlign: 'center',
                cursor: 'pointer', marginBottom: 12, transition: 'border-color var(--fast)',
                background: dragging ? 'var(--red-dim)' : 'transparent', minHeight: 100,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
              {preview
                ? <img src={preview} alt="" style={{ maxHeight: 120, maxWidth: '100%', borderRadius: 4, objectFit: 'contain' }} />
                : <>
                    <Upload size={22} style={{ color: 'var(--text-dim)' }} />
                    <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-dim)' }}>
                      clique ou arraste uma imagem aqui
                    </span>
                  </>
              }
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => handleFile(e.target.files?.[0])} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>cancelar</button>
              <button onClick={insertUpload} disabled={!preview} className="btn btn-primary"
                style={{ flex: 1, justifyContent: 'center', opacity: !preview ? 0.4 : 1 }}>
                inserir
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="field">
              <label style={lbl}>url da imagem</label>
              <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." style={inp} autoFocus />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>cancelar</button>
              <button onClick={insertUrl} disabled={!url.trim()} className="btn btn-primary"
                style={{ flex: 1, justifyContent: 'center', opacity: !url.trim() ? 0.4 : 1 }}>
                inserir
              </button>
            </div>
          </>
        )}
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


// ── Modal redimensionar imagem ─────────────────────────────────────────
function ResizeImageModal({ current, onApply, onClose }) {
  const [width,  setWidth]  = useState(current.width  || '')
  const [height, setHeight] = useState(current.height || '')
  const presets = [['original', '', ''], ['25%', '25%', ''], ['50%', '50%', ''], ['100%', '100%', ''], ['200px', '200', ''], ['400px', '400', ''], ['600px', '600', '']]
  const inp = { width: '100%', padding: '8px 10px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'var(--ff-mono)', fontSize: 11, borderRadius: 'var(--radius)', outline: 'none', boxSizing: 'border-box' }
  const lbl = { fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-dim)', display: 'block', marginBottom: 5 }
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', zIndex: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-red)', borderRadius: 'var(--radius-md)', width: '100%', maxWidth: 380, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontFamily: 'var(--ff-disp)', fontSize: 18, letterSpacing: '0.05em' }}>TAMANHO DA IMAGEM</div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)', cursor: 'pointer' }}><X size={14} /></button>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          {presets.map(([label, w, h]) => (
            <button key={label} onClick={() => { setWidth(w); setHeight(h) }}
              style={{ padding: '4px 10px', borderRadius: 'var(--radius)', fontFamily: 'var(--ff-mono)', fontSize: 10, border: '1px solid var(--border)', background: width === w ? 'var(--red-dim)' : 'var(--surface)', color: width === w ? '#F0EDE8' : 'var(--text-muted)', cursor: 'pointer' }}>
              {label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
          <div style={{ flex: 1 }}>
            <label style={lbl}>largura (px ou %)</label>
            <input value={width} onChange={e => setWidth(e.target.value)} placeholder="ex: 400 ou 50%" style={inp} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={lbl}>altura (px ou %)</label>
            <input value={height} onChange={e => setHeight(e.target.value)} placeholder="auto" style={inp} />
          </div>
        </div>
        <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, color: 'var(--text-dim)', marginBottom: 14 }}>
          altura vazia = proporcional · use % para responsivo
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>cancelar</button>
          <button onClick={() => onApply({ width: width || null, height: height || null })} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>aplicar</button>
        </div>
      </div>
    </div>
  )
}

// ── NoteEditor ────────────────────────────────────────────────────────
function NoteEditor({ note, onUpdate }) {
  const [showImgModal, setShowImgModal] = useState(false)
  const [showResizeModal, setShowResizeModal] = useState(false)
  const [selectedImg, setSelectedImg] = useState(null)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: '›_ escreva suas anotações aqui...' }),
      ResizableImage.configure({ inline: false, allowBase64: true }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
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
      handleClickOn(view, pos, node) {
        if (node.type && node.type.name === 'image') {
          setSelectedImg({ src: node.attrs.src, width: node.attrs.width || '', height: node.attrs.height || '' })
          setShowResizeModal(true)
          return true
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <div style={{ display: 'flex', gap: 2, padding: '7px 12px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', flexShrink: 0, background: 'var(--bg-alt)', alignItems: 'center' }}>
        <ToolbarBtn action={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="negrito" icon={<Bold size={12} />} />
        <ToolbarBtn action={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="itálico" icon={<Italic size={12} />} />
        <ToolbarBtn action={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="título" icon={<Heading2 size={12} />} />
        <ToolbarBtn action={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="lista" icon={<List size={12} />} />
        <ToolbarBtn action={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="numerada" icon={<ListOrdered size={12} />} />
        <ToolbarBtn action={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="código" icon={<Code size={12} />} />
        <div style={{ width: 1, height: 14, background: 'var(--border)', margin: '0 4px' }} />
        <ToolbarBtn action={() => setShowImgModal(true)} active={false} title="inserir imagem (ou ctrl+v)" icon={<ImageIcon size={12} />} />
        <ToolbarBtn
          action={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          active={false} title="inserir tabela" icon={<Table2 size={12} />} />
        <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.1em', opacity: 0.7 }}>ctrl+v · clique na imagem para redimensionar</span>
      </div>
      <EditorContent editor={editor} style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }} />
      {showImgModal && (
        <ImageModal
          onInsert={imgSrc => editor.chain().focus().setImage({ src: imgSrc }).run()}
          onClose={() => setShowImgModal(false)}
        />
      )}
      {showResizeModal && selectedImg && (
        <ResizeImageModal
          current={selectedImg}
          onApply={({ width, height }) => {
            editor.chain().focus().updateAttributes('image', { width: width || null, height: height || null }).run()
            setShowResizeModal(false)
          }}
          onClose={() => setShowResizeModal(false)}
        />
      )}
    </div>
  )
}

// ── Main NotesPanel ───────────────────────────────────────────────────
export default function NotesPanel({ group, orgId, onClose }) {
  const { notes, loading, createNote, updateNote, deleteNote, togglePin, duplicateNote } = useNotes(group?.id, orgId)
  const { folders, createFolder, renameFolder, deleteFolder } = useFolders(group?.id, orgId)
  const { templates, saveAsTemplate, deleteTemplate } = useNoteTemplates(orgId)
  const trelloToken = localStorage.getItem('atelier_trello_token') || ''
  const sounds = useSounds()
  const [activeNoteId, setActiveNoteId] = useState(null)
  const [editingTitle, setEditingTitle] = useState(null)
  const [showPush, setShowPush] = useState(false)
  const [showTrello, setShowTrello] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [templateFeedback, setTemplateFeedback] = useState(null)
  const [collapsedFolders, setCollapsedFolders] = useState({})
  const [addingFolder, setAddingFolder] = useState(false)
  const [folderDraft, setFolderDraft] = useState('')
  const [editingFolder, setEditingFolder] = useState(null)
  const [folderEditDraft, setFolderEditDraft] = useState('')

  const activeNote = notes.find(n => n.id === activeNoteId) || notes[0]

  useEffect(() => {
    if (notes.length > 0 && !activeNoteId) setActiveNoteId(notes[0].id)
  }, [notes])

  const handleUpdate = useCallback(
    debounce((id, payload) => updateNote(id, payload), 800),
    [updateNote]
  )

  async function handleCreate(folderId = null) {
    const { data } = await createNote(folderId ? { folder_id: folderId } : {})
    if (data) { setActiveNoteId(data.id); sounds.play('open') }
  }

  async function handleDuplicate(note) {
    const { data } = await duplicateNote(note.id)
    if (data) { setActiveNoteId(data.id); sounds.play('open') }
  }

  async function handleSaveAsTemplate(note) {
    setTemplateFeedback('saving')
    const { error } = await saveAsTemplate({ title: note.title, content: note.content })
    setTemplateFeedback(error ? 'error' : 'saved')
    setTimeout(() => setTemplateFeedback(null), 2500)
  }

  async function handleCreateFromTemplate(template) {
    const { data } = await createNote({ title: template.title, content: template.content })
    if (data) { setActiveNoteId(data.id); setShowTemplates(false); sounds.play('open') }
  }

  async function handleCreateFolder(name) {
    setAddingFolder(false); setFolderDraft('')
    await createFolder(name)
  }

  async function commitRenameFolder(id) {
    if (folderEditDraft.trim() && folderEditDraft.trim() !== folders.find(f => f.id === id)?.name) {
      await renameFolder(id, folderEditDraft.trim())
    }
    setEditingFolder(null); setFolderEditDraft('')
  }

  function toggleFolderCollapse(folderId) {
    setCollapsedFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }))
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

  const folderNotes = (folderId) => notes.filter(n => n.folder_id === folderId)
  const unfolderedNotes = notes.filter(n => !n.folder_id)

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
          <div style={{ width: 220, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', gap: 5 }}>
                <button onClick={() => setAddingFolder(true)} disabled={addingFolder} className="btn btn-ghost"
                  style={{ flex: 1, justifyContent: 'center', fontSize: 10, padding: '5px 8px', gap: 4 }}>
                  <FolderPlus size={11} /> pasta
                </button>
                <button onClick={() => handleCreate(null)} className="btn btn-primary"
                  style={{ flex: 1, justifyContent: 'center', fontSize: 11, padding: '5px 8px' }}>
                  <Plus size={12} /> nota
                </button>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
              {loading && <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: 8, fontFamily: 'var(--ff-mono)' }}>carregando_</div>}

              {/* Nova pasta inline */}
              {addingFolder && (
                <div style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '4px 4px', marginBottom: 2 }}>
                  <Folder size={11} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
                  <input
                    autoFocus
                    value={folderDraft}
                    onChange={e => setFolderDraft(e.target.value)}
                    placeholder="nome da pasta..."
                    onKeyDown={e => {
                      if (e.key === 'Enter' && folderDraft.trim()) handleCreateFolder(folderDraft.trim())
                      if (e.key === 'Escape') { setAddingFolder(false); setFolderDraft('') }
                    }}
                    onBlur={() => { if (folderDraft.trim()) handleCreateFolder(folderDraft.trim()); else { setAddingFolder(false); setFolderDraft('') } }}
                    style={{ flex: 1, minWidth: 0, background: 'var(--surface)', border: '1px solid var(--border-red)', borderRadius: 'var(--radius)', padding: '3px 7px', color: 'var(--text)', fontFamily: 'var(--ff-mono)', fontSize: 11, outline: 'none' }}
                  />
                </div>
              )}

              {/* Pastas com suas notas */}
              {folders.map(folder => {
                const fNotes = folderNotes(folder.id)
                const isOpen = !collapsedFolders[folder.id]
                return (
                  <div key={folder.id}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '5px 4px', borderRadius: 'var(--radius)', marginBottom: 1 }}
                      onMouseEnter={e => e.currentTarget.dataset.hover = '1'}
                      onMouseLeave={e => { delete e.currentTarget.dataset.hover; e.currentTarget.querySelector?.('.folder-actions')?.setAttribute('style', 'display:none') }}>
                      <button onClick={() => toggleFolderCollapse(folder.id)} style={{ color: 'var(--text-dim)', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                        {isOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                      </button>
                      <button onClick={() => toggleFolderCollapse(folder.id)} style={{ color: isOpen ? 'var(--red)' : 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                        {isOpen ? <FolderOpen size={12} /> : <Folder size={12} />}
                      </button>
                      {editingFolder === folder.id
                        ? <input autoFocus value={folderEditDraft} onChange={e => setFolderEditDraft(e.target.value)}
                            onBlur={() => commitRenameFolder(folder.id)}
                            onKeyDown={e => { if (e.key === 'Enter') commitRenameFolder(folder.id); if (e.key === 'Escape') { setEditingFolder(null) } }}
                            style={{ flex: 1, minWidth: 0, background: 'var(--surface)', border: '1px solid var(--border-red)', borderRadius: 'var(--radius)', padding: '2px 5px', color: 'var(--text)', fontFamily: 'var(--ff-mono)', fontSize: 11, outline: 'none' }} />
                        : <button onClick={() => toggleFolderCollapse(folder.id)} style={{ flex: 1, minWidth: 0, textAlign: 'left', fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text)', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '0.03em' }}>
                            {folder.name}
                          </button>
                      }
                      {editingFolder !== folder.id && (
                        <div style={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                          <button onClick={() => handleCreate(folder.id)} title="nova nota nesta pasta"
                            style={{ color: 'var(--text-dim)', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' }}
                            onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
                            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}>
                            <Plus size={10} />
                          </button>
                          <button onClick={() => { setFolderEditDraft(folder.name); setEditingFolder(folder.id) }} title="renomear"
                            style={{ color: 'var(--text-dim)', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' }}
                            onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
                            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}>
                            <Pencil size={9} />
                          </button>
                          <button onClick={() => deleteFolder(folder.id)} title="excluir pasta"
                            style={{ color: 'var(--text-dim)', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' }}
                            onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}>
                            <Trash2 size={9} />
                          </button>
                        </div>
                      )}
                    </div>
                    {isOpen && fNotes.map(note => (
                      <button key={note.id} onClick={() => setActiveNoteId(note.id)} style={{
                        width: '100%', textAlign: 'left', padding: '6px 9px 6px 24px', borderRadius: 'var(--radius)',
                        background: activeNote?.id === note.id ? 'var(--red-dim)' : 'transparent',
                        border: activeNote?.id === note.id ? '1px solid var(--border-red)' : '1px solid transparent',
                        display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2,
                        transition: 'all var(--fast)', cursor: 'pointer',
                      }}>
                        {note.pinned && <Pin size={8} style={{ color: activeNote?.id === note.id ? '#F0EDE8' : 'var(--red)', flexShrink: 0 }} />}
                        <span style={{ fontSize: 11, color: activeNote?.id === note.id ? '#F0EDE8' : 'var(--text-sub)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {note.title || 'sem título'}
                        </span>
                      </button>
                    ))}
                  </div>
                )
              })}

              {/* Notas sem pasta */}
              {(unfolderedNotes.length > 0 || folders.length > 0) && (
                <div style={{ marginTop: folders.length > 0 ? 4 : 0 }}>
                  {folders.length > 0 && unfolderedNotes.length > 0 && (
                    <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-dim)', padding: '4px 4px 2px', opacity: 0.55 }}>
                      sem pasta
                    </div>
                  )}
                  {unfolderedNotes.map(note => (
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
                </div>
              )}

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
                    {/* visibility toggle */}
                    <button
                      onClick={() => updateNote(activeNote.id, { visibility: activeNote.visibility === 'private' ? 'org' : 'private' })}
                      title={activeNote.visibility === 'private' ? 'privado — só você vê' : 'visível para a organização'}
                      style={{ padding: '4px 6px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: activeNote.visibility === 'private' ? 'var(--red-dim)' : 'var(--surface)', color: activeNote.visibility === 'private' ? 'var(--red)' : 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}
                    >
                      {activeNote.visibility === 'private' ? <Lock size={11} /> : <Globe size={11} />}
                    </button>
                    {toolBtn('duplicar', <Copy size={11} />, () => handleDuplicate(activeNote), { label: 'duplicar' })}
                    {toolBtn(
                      templateFeedback === 'saved' ? '✓ salvo!' : templateFeedback === 'saving' ? '...' : 'salvar como template',
                      <LayoutTemplate size={11} />,
                      () => handleSaveAsTemplate(activeNote),
                      { label: templateFeedback === 'saved' ? '✓ template' : templateFeedback === 'saving' ? '...' : 'template' }
                    )}
                    {toolBtn('usar template', <FileText size={11} />, () => setShowTemplates(true), { label: 'usar template' })}
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
                <div style={{ padding: '5px 16px', borderTop: '1px solid var(--border)', fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--ff-mono)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <span>›_ salvo automaticamente</span>
                    {/* quem editou por último */}
                    {activeNote.editor?.name && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--text-dim)', fontSize: 9 }}>
                        <User size={9} />
                        editado por <span style={{ color: 'var(--text-muted)' }}>{activeNote.editor.name}</span>
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    {/* badge visibilidade */}
                    <span style={{
                      display: 'flex', alignItems: 'center', gap: 3,
                      fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase',
                      color: activeNote.visibility === 'private' ? 'var(--red)' : 'var(--text-dim)',
                    }}>
                      {activeNote.visibility === 'private' ? <Lock size={8} /> : <Globe size={8} />}
                      {activeNote.visibility === 'private' ? 'privado' : 'organização'}
                    </span>
                    <span>{new Date(activeNote.updated_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
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
      {showTemplates && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={e => e.target === e.currentTarget && setShowTemplates(false)}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-red)', borderRadius: 'var(--radius-md)', width: '100%', maxWidth: 520, padding: 28, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, flexShrink: 0 }}>
              <div>
                <div style={{ fontFamily: 'var(--ff-disp)', fontSize: 20, letterSpacing: '0.05em' }}>TEMPLATES DA ORG</div>
                <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.25em', color: 'var(--text-dim)', textTransform: 'uppercase', marginTop: 2 }}>// modelos disponíveis para toda a organização</div>
              </div>
              <button onClick={() => setShowTemplates(false)} style={{ color: 'var(--text-muted)', cursor: 'pointer' }}><X size={16} /></button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {templates.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-dim)', fontFamily: 'var(--ff-mono)', fontSize: 12 }}>
                  <LayoutTemplate size={28} style={{ opacity: 0.3, marginBottom: 12, display: 'block', margin: '0 auto 12px' }} />
                  nenhum template ainda — salve uma nota como template para reutilizá-la aqui
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
                        {t.profiles?.name && <div style={{ fontSize: 10, color: 'var(--text-dim)', fontFamily: 'var(--ff-mono)', marginTop: 2 }}>por {t.profiles.name} · {new Date(t.created_at).toLocaleDateString('pt-BR')}</div>}
                      </div>
                      <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                        <button onClick={() => handleCreateFromTemplate(t)}
                          style={{ padding: '5px 10px', borderRadius: 'var(--radius)', border: '1px solid var(--border-red)', background: 'var(--red-dim)', color: '#F0EDE8', fontFamily: 'var(--ff-mono)', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Plus size={10} /> usar
                        </button>
                        <button onClick={() => deleteTemplate(t.id)} title="excluir template"
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
              <button onClick={() => setShowTemplates(false)} className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center' }}>fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}