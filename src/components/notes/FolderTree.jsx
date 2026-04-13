import { useState } from 'react'
import {
  Folder, FolderOpen, ChevronRight, ChevronDown,
  Plus, Pencil, Trash2, FolderPlus,
} from 'lucide-react'
import NoteItem from './NoteItem'

// ── NewFolderInput ────────────────────────────────────────────────────────────
export function NewFolderInput({ onConfirm, onCancel, placeholder = 'nome da pasta...' }) {
  const [name, setName] = useState('')
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '4px 6px', marginBottom: 2 }}>
      <Folder size={12} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
      <input
        autoFocus
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder={placeholder}
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

// ── FolderNode — um nó recursivo da árvore ───────────────────────────────────
function FolderNode({
  node,           // { folder, children: [] }
  depth,
  notes,          // todas as notas filtradas
  activeNoteId,
  onNoteClick,
  onAddNote,
  onAddSubfolder,
  onRename,
  onDelete,
  isOwner,
  currentUserId,
}) {
  const [open, setOpen]       = useState(true)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState(node.folder.name)
  const [hover, setHover]     = useState(false)
  const [addingChild, setAddingChild] = useState(false)

  const folderNotes = notes.filter(n => n.folder_id === node.folder.id)
  const indent = depth * 14

  function commitRename() {
    if (draft.trim() && draft.trim() !== node.folder.name) onRename(node.folder.id, draft.trim())
    setEditing(false)
  }

  return (
    <div>
      {/* ── Cabeçalho da pasta ── */}
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{ display: 'flex', alignItems: 'center', gap: 3, padding: `5px 6px 5px ${4 + indent}px`, borderRadius: 'var(--radius)', marginBottom: 1, userSelect: 'none' }}
      >
        <button onClick={() => setOpen(v => !v)} style={{ color: 'var(--text-dim)', cursor: 'pointer', padding: 2, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
          {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        </button>
        <button onClick={() => setOpen(v => !v)} style={{ color: open ? 'var(--red)' : 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          {open ? <FolderOpen size={13} /> : <Folder size={13} />}
        </button>

        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditing(false) }}
            style={{ flex: 1, minWidth: 0, background: 'var(--surface)', border: '1px solid var(--border-red)', borderRadius: 'var(--radius)', padding: '2px 6px', color: 'var(--text)', fontFamily: 'var(--ff-mono)', fontSize: 11, outline: 'none' }}
          />
        ) : (
          <button onClick={() => setOpen(v => !v)} style={{ flex: 1, minWidth: 0, textAlign: 'left', fontFamily: 'var(--ff-mono)', fontSize: 11, letterSpacing: '0.05em', color: 'var(--text)', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {node.folder.name}
          </button>
        )}

        {!editing && (
          <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, color: 'var(--text-dim)', flexShrink: 0, opacity: hover ? 0 : 0.6 }}>
            {folderNotes.length + node.children.reduce((acc, c) => acc + notes.filter(n => n.folder_id === c.folder.id).length, 0)}
          </span>
        )}

        {hover && !editing && (
          <div style={{ display: 'flex', gap: 1, flexShrink: 0 }}>
            <button onClick={() => onAddNote(node.folder.id)} title="nova nota" style={{ color: 'var(--text-dim)', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}>
              <Plus size={10} />
            </button>
            <button onClick={() => setAddingChild(true)} title="nova subpasta" style={{ color: 'var(--text-dim)', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}>
              <FolderPlus size={10} />
            </button>
            <button onClick={() => { setDraft(node.folder.name); setEditing(true) }} title="renomear" style={{ color: 'var(--text-dim)', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}>
              <Pencil size={9} />
            </button>
            <button onClick={() => onDelete(node.folder.id)} title="excluir pasta" style={{ color: 'var(--text-dim)', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}>
              <Trash2 size={9} />
            </button>
          </div>
        )}
      </div>

      {/* ── Conteúdo aberto ── */}
      {open && (
        <div>
          {addingChild && (
            <div style={{ paddingLeft: indent + 18 }}>
              <NewFolderInput
                placeholder="nome da subpasta..."
                onConfirm={name => { onAddSubfolder(name, node.folder.id); setAddingChild(false) }}
                onCancel={() => setAddingChild(false)}
              />
            </div>
          )}

          {/* subpastas recursivas */}
          {node.children.map(child => (
            <FolderNode
              key={child.folder.id}
              node={child}
              depth={depth + 1}
              notes={notes}
              activeNoteId={activeNoteId}
              onNoteClick={onNoteClick}
              onAddNote={onAddNote}
              onAddSubfolder={onAddSubfolder}
              onRename={onRename}
              onDelete={onDelete}
              isOwner={isOwner}
              currentUserId={currentUserId}
            />
          ))}

          {/* notas desta pasta */}
          {folderNotes.map(note => (
            <div key={note.id} style={{ paddingLeft: indent + 14 }}>
              <NoteItem
                note={note}
                active={activeNoteId === note.id}
                onClick={() => onNoteClick(note.id)}
                isOwner={isOwner}
                currentUserId={currentUserId}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── FolderTree — raiz da árvore ───────────────────────────────────────────────
export default function FolderTree({
  tree,             // buildTree() result
  notes,
  activeNoteId,
  onNoteClick,
  onAddNote,
  onAddSubfolder,
  onRename,
  onDelete,
  isOwner,
  currentUserId,
}) {
  return (
    <>
      {tree.map(node => (
        <FolderNode
          key={node.folder.id}
          node={node}
          depth={0}
          notes={notes}
          activeNoteId={activeNoteId}
          onNoteClick={onNoteClick}
          onAddNote={onAddNote}
          onAddSubfolder={onAddSubfolder}
          onRename={onRename}
          onDelete={onDelete}
          isOwner={isOwner}
          currentUserId={currentUserId}
        />
      ))}
    </>
  )
}
