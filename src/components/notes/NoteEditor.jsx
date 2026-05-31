import { useState, useRef, useEffect, useMemo } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Link from '@tiptap/extension-link'
import {
  Bold, Italic, Heading1, Heading2, Heading3, List, ListOrdered,
  Code, Code2, ImageIcon, Table2, ChevronDown, CheckSquare,
  Strikethrough, Quote, Minus, Link as LinkIcon, Undo2, Redo2,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useNotePresence } from '../../hooks/useNotePresence'
import { debounce } from '../../utils/notes'
import PresenceBar from './PresenceBar'
import ImageModal from './modals/ImageModal'

// ── ToolbarBtn ────────────────────────────────────────────────────────────────
function ToolbarBtn({ action, active, title, icon }) {
  return (
    <button onClick={action} title={title} style={{
      padding: '4px 7px', borderRadius: 'var(--radius)',
      background: active ? 'var(--red-dim)' : 'transparent',
      color: active ? '#F0EDE8' : 'var(--text-muted)',
      border: active ? '1px solid var(--border-red)' : '1px solid transparent',
      transition: 'all var(--fast)', cursor: 'pointer',
    }}>{icon}</button>
  )
}

const Sep = () => <div style={{ width: 1, height: 14, background: 'var(--border)', margin: '0 3px', flexShrink: 0 }} />

// ── TableMenu ─────────────────────────────────────────────────────────────────
function TableMenu({ editor }) {
  if (!editor.isActive('table')) return null
  const btn = (label, action, title) => (
    <button key={label} onClick={action} title={title || label} style={{
      padding: '3px 8px', borderRadius: 'var(--radius)',
      fontFamily: 'var(--ff-mono)', fontSize: 10,
      border: '1px solid var(--border-red)', background: 'var(--red-dim)',
      color: '#F0EDE8', cursor: 'pointer', whiteSpace: 'nowrap',
    }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--red)'}
      onMouseLeave={e => e.currentTarget.style.background = 'var(--red-dim)'}
    >{label}</button>
  )
  return (
    <div style={{ display: 'flex', gap: 4, padding: '5px 14px', borderBottom: '1px solid var(--border)', background: 'rgba(192,33,28,0.06)', flexWrap: 'wrap', alignItems: 'center', flexShrink: 0 }}>
      <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--red)', opacity: 0.8, marginRight: 4 }}>tabela ›</span>
      {btn('+ linha acima',  () => editor.chain().focus().addRowBefore().run())}
      {btn('+ linha abaixo', () => editor.chain().focus().addRowAfter().run())}
      {btn('− linha',        () => editor.chain().focus().deleteRow().run())}
      <div style={{ width: 1, height: 14, background: 'var(--border-red)', opacity: 0.4 }} />
      {btn('+ col. antes',   () => editor.chain().focus().addColumnBefore().run())}
      {btn('+ col. depois',  () => editor.chain().focus().addColumnAfter().run())}
      {btn('− coluna',       () => editor.chain().focus().deleteColumn().run())}
      <div style={{ width: 1, height: 14, background: 'var(--border-red)', opacity: 0.4 }} />
      {btn('merge',          () => editor.chain().focus().mergeOrSplit().run(), 'unir/separar células')}
      {btn('× excluir tabela', () => editor.chain().focus().deleteTable().run())}
    </div>
  )
}

// ── NoteEditor ────────────────────────────────────────────────────────────────
export default function NoteEditor({ note, onUpdate }) {
  const { user }  = useAuth()
  const peers     = useNotePresence(note?.id, user)
  const [showImgModal, setShowImgModal] = useState(false)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [, forceUpdate] = useState(0)

  const handleUpdate = useMemo(
    () => debounce((id, payload) => onUpdate(id, payload), 700),
    [onUpdate]
  )

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: '›_ escreva suas anotações aqui...' }),
      Image.configure({ inline: false, allowBase64: true }),
      Table.configure({ resizable: false }),
      TableRow, TableHeader, TableCell,
      TaskList,
      TaskItem.configure({ nested: true }),
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' } }),
    ],
    content: note.content || '',
    onUpdate: ({ editor }) => { handleUpdate(note.id, { content: editor.getHTML() }); forceUpdate(n => n + 1) },
    onSelectionUpdate: () => forceUpdate(n => n + 1),
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

  function applyLink() {
    if (!editor) return
    if (!linkUrl.trim()) { editor.chain().focus().unsetLink().run(); setShowLinkModal(false); return }
    const url = linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`
    editor.chain().focus().setLink({ href: url }).run()
    setShowLinkModal(false)
    setLinkUrl('')
  }

  function insertDropdownBlock() {
    if (!editor) return
    editor.chain().focus().insertContent(
      '<details><summary>Clique para expandir</summary><p>Conteúdo do menu suspenso...</p></details><p></p>'
    ).run()
  }

  if (!editor) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <PresenceBar peers={peers} />

      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', gap: 1, padding: '5px 10px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', flexShrink: 0, background: 'var(--bg-alt)', alignItems: 'center' }}>

        {/* Undo / Redo */}
        <ToolbarBtn action={() => editor.chain().focus().undo().run()} active={false} title="desfazer (ctrl+z)" icon={<Undo2 size={12} />} />
        <ToolbarBtn action={() => editor.chain().focus().redo().run()} active={false} title="refazer (ctrl+y)" icon={<Redo2 size={12} />} />
        <Sep />

        {/* Títulos */}
        <ToolbarBtn action={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="título 1" icon={<Heading1 size={12} />} />
        <ToolbarBtn action={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="título 2" icon={<Heading2 size={12} />} />
        <ToolbarBtn action={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="título 3" icon={<Heading3 size={12} />} />
        <Sep />

        {/* Formatação inline */}
        <ToolbarBtn action={() => editor.chain().focus().toggleBold().run()}   active={editor.isActive('bold')}   title="negrito (ctrl+b)"  icon={<Bold size={12} />} />
        <ToolbarBtn action={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="itálico (ctrl+i)"  icon={<Italic size={12} />} />
        <ToolbarBtn action={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="riscado"           icon={<Strikethrough size={12} />} />
        <ToolbarBtn action={() => editor.chain().focus().toggleCode().run()}   active={editor.isActive('code')}   title="código inline"     icon={<Code size={12} />} />
        <Sep />

        {/* Listas */}
        <ToolbarBtn action={() => editor.chain().focus().toggleBulletList().run()}  active={editor.isActive('bulletList')}  title="lista"      icon={<List size={12} />} />
        <ToolbarBtn action={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="numerada"   icon={<ListOrdered size={12} />} />
        <ToolbarBtn action={() => editor.chain().focus().toggleTaskList().run()}    active={editor.isActive('taskList')}    title="checklist"  icon={<CheckSquare size={12} />} />
        <Sep />

        {/* Bloco */}
        <ToolbarBtn action={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="citação"         icon={<Quote size={12} />} />
        <ToolbarBtn action={() => editor.chain().focus().toggleCodeBlock().run()}  active={editor.isActive('codeBlock')}  title="bloco de código"  icon={<Code2 size={12} />} />
        <ToolbarBtn action={() => editor.chain().focus().setHorizontalRule().run()} active={false}                        title="linha divisória"  icon={<Minus size={12} />} />
        <ToolbarBtn action={insertDropdownBlock} active={false} title="bloco suspenso (details)" icon={<ChevronDown size={12} />} />
        <Sep />

        {/* Link / Imagem / Tabela */}
        <ToolbarBtn
          action={() => { setLinkUrl(editor.getAttributes('link').href || ''); setShowLinkModal(true) }}
          active={editor.isActive('link')} title="inserir link" icon={<LinkIcon size={12} />}
        />
        <ToolbarBtn action={() => setShowImgModal(true)} active={false} title="inserir imagem (ou ctrl+v)" icon={<ImageIcon size={12} />} />
        <ToolbarBtn action={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} active={editor.isActive('table')} title="inserir tabela" icon={<Table2 size={12} />} />

        <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.1em', opacity: 0.6, marginLeft: 4 }}>ctrl+v · clique na imagem para redimensionar</span>
      </div>

      <TableMenu editor={editor} />
      <EditorContent editor={editor} style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }} />

      {/* Modal de imagem */}
      {showImgModal && (
        <ImageModal
          onInsert={(src, alt) => editor.chain().focus().setImage({ src, alt: alt || undefined }).run()}
          onClose={() => setShowImgModal(false)}
        />
      )}

      {/* Modal de link */}
      {showLinkModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', zIndex: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => e.target === e.currentTarget && setShowLinkModal(false)}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-red)', borderRadius: 'var(--radius-md)', padding: 20, width: 340 }}>
            <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 10 }}>inserir link</div>
            <input
              autoFocus value={linkUrl} onChange={e => setLinkUrl(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') applyLink(); if (e.key === 'Escape') setShowLinkModal(false) }}
              placeholder="https://..."
              style={{ width: '100%', padding: '8px 10px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'var(--ff-mono)', fontSize: 12, borderRadius: 'var(--radius)', outline: 'none', boxSizing: 'border-box', marginBottom: 10 }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowLinkModal(false)} className="btn btn-ghost" style={{ flex: 1 }}>cancelar</button>
              {editor.isActive('link') && (
                <button onClick={() => { editor.chain().focus().unsetLink().run(); setShowLinkModal(false) }} className="btn btn-ghost" style={{ flex: 1, color: 'var(--red)' }}>remover</button>
              )}
              <button onClick={applyLink} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>aplicar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}