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
import {
  Bold, Italic, Heading2, List, ListOrdered,
  Code, ImageIcon, Table2, ChevronDown, CheckSquare,
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
      padding: '4px 8px', borderRadius: 'var(--radius)',
      background: active ? 'var(--red-dim)' : 'transparent',
      color: active ? '#F0EDE8' : 'var(--text-muted)',
      border: active ? '1px solid var(--border-red)' : '1px solid transparent',
      transition: 'all var(--fast)', cursor: 'pointer',
    }}>{icon}</button>
  )
}

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

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 2, padding: '8px 14px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', flexShrink: 0, background: 'var(--bg-alt)', alignItems: 'center' }}>
        <ToolbarBtn action={() => editor.chain().focus().toggleBold().run()}              active={editor.isActive('bold')}             title="negrito"   icon={<Bold size={12} />} />
        <ToolbarBtn action={() => editor.chain().focus().toggleItalic().run()}            active={editor.isActive('italic')}            title="itálico"   icon={<Italic size={12} />} />
        <ToolbarBtn action={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="título" icon={<Heading2 size={12} />} />
        <ToolbarBtn action={() => editor.chain().focus().toggleBulletList().run()}        active={editor.isActive('bulletList')}        title="lista"     icon={<List size={12} />} />
        <ToolbarBtn action={() => editor.chain().focus().toggleOrderedList().run()}       active={editor.isActive('orderedList')}       title="numerada"  icon={<ListOrdered size={12} />} />
        <ToolbarBtn action={() => editor.chain().focus().toggleTaskList().run()}          active={editor.isActive('taskList')}          title="checklist" icon={<CheckSquare size={12} />} />
        <ToolbarBtn action={() => editor.chain().focus().toggleCode().run()}              active={editor.isActive('code')}              title="código"    icon={<Code size={12} />} />
        <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 4px' }} />
        <ToolbarBtn action={() => setShowImgModal(true)} active={false} title="inserir imagem (ou ctrl+v para colar)" icon={<ImageIcon size={12} />} />
        <ToolbarBtn action={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} active={editor.isActive('table')} title="inserir tabela" icon={<Table2 size={12} />} />
        <ToolbarBtn action={insertDropdownBlock} active={false} title="inserir bloco suspenso" icon={<ChevronDown size={12} />} />
        <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.1em', opacity: 0.7 }}>ctrl+v · ☑ check · ▾ suspenso</span>
      </div>

      <TableMenu editor={editor} />
      <EditorContent editor={editor} style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }} />

      {showImgModal && (
        <ImageModal
          onInsert={(src, alt) => editor.chain().focus().setImage({ src, alt: alt || undefined }).run()}
          onClose={() => setShowImgModal(false)}
        />
      )}
    </div>
  )
}
