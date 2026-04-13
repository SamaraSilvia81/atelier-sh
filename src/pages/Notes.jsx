import { useState, useMemo } from 'react'
import {
  Pin, PinOff, Plus, Trash2, Search, FileText,
  Download, Send, LayoutList, FolderPlus, Folder,
  FolderInput, Copy, LayoutTemplate, Lock, Eye, EyeOff,
} from 'lucide-react'
import { useGroups }        from '../hooks/useGroups'
import { useOrgNotes }      from '../hooks/useNotes'
import { useFolders }       from '../hooks/useFolders'
import { useNoteTemplates } from '../hooks/useNoteTemplates'
import { useAuth }          from '../hooks/useAuth'
import { toMarkdown, debounce } from '../utils/notes'

import NoteEditor    from '../components/notes/NoteEditor'
import NoteItem      from '../components/notes/NoteItem'
import FolderTree, { NewFolderInput } from '../components/notes/FolderTree'
import CardModal     from '../components/notes/modals/CardModal'
import TemplatesModal from '../components/notes/modals/TemplatesModal'
import { PushNoteModal, PushFolderModal } from '../components/notes/modals/PushModal'
import TrelloCardModal from '../components/notes/modals/TrelloCardModal'

// ── debounce estável ──────────────────────────────────────────────────────────
function useStableUpdate(updateNote) {
  return useMemo(() => debounce((id, payload) => updateNote(id, payload), 700), [updateNote])
}

// ── botão de ação reutilizável ────────────────────────────────────────────────
function ToolBtn({ title, icon, onClick, label, active, danger }) {
  return (
    <button onClick={onClick} title={title} style={{
      display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px',
      borderRadius: 'var(--radius)', border: `1px solid ${active ? 'var(--border-red)' : 'var(--border)'}`,
      background: active ? 'var(--red-dim)' : 'var(--surface)',
      color: danger ? 'var(--text-dim)' : active ? '#F0EDE8' : 'var(--text-muted)',
      fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '0.08em',
      cursor: 'pointer', transition: 'all var(--fast)',
    }}
      onMouseEnter={e => { e.currentTarget.style.color = danger ? 'var(--red)' : 'var(--text)'; e.currentTarget.style.borderColor = 'var(--border-red)' }}
      onMouseLeave={e => {
        e.currentTarget.style.color = danger ? 'var(--text-dim)' : active ? '#F0EDE8' : 'var(--text-muted)'
        e.currentTarget.style.borderColor = active ? 'var(--border-red)' : 'var(--border)'
      }}>
      {icon}{label && <span>{label}</span>}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
export default function Notes({ org }) {
  const { user }   = useAuth()
  const { groups } = useGroups(org?.id)
  const { notes, loading, createNote, updateNote, deleteNote, togglePin } = useOrgNotes(org?.id)
  const { templates, saveAsTemplate, deleteTemplate } = useNoteTemplates(org?.id)
  const trelloToken = localStorage.getItem('atelier_trello_token') || ''
  const isOwner     = org?.owner_id === user?.id

  // ── state da UI ──────────────────────────────────────────────────────────
  const [activeNoteId, setActiveNoteId]   = useState(null)
  const [search, setSearch]               = useState('')
  const [groupFilter, setGroupFilter]     = useState('all')
  const [editingTitle, setEditingTitle]   = useState(null)
  const [creating, setCreating]           = useState(false)
  const [addingFolder, setAddingFolder]   = useState(false)
  const [showFolderPicker, setShowFolderPicker] = useState(false)
  const [templateFeedback, setTemplateFeedback] = useState(null)

  // modais
  const [modal, setModal]               = useState(null)   // CardModal genérico
  const [showPushNote, setShowPushNote] = useState(false)
  const [showPushFolder, setShowPushFolder] = useState(false)
  const [showTrello, setShowTrello]     = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)

  // ── pastas ───────────────────────────────────────────────────────────────
  const groupForFolders = groupFilter !== 'all' ? groupFilter : null
  const { folders, buildTree, createFolder, renameFolder, deleteFolder } = useFolders(groupForFolders, org?.id)
  const showFolderTree = groupFilter !== 'all'

  // ── dados derivados ──────────────────────────────────────────────────────
  const activeNote  = notes.find(n => n.id === activeNoteId)
  const activeGroup = groups.find(g => g.id === activeNote?.group_id)
  const activeNoteFolder = activeNote?.folder_id ? folders.find(f => f.id === activeNote.folder_id) : null
  const canEditActiveNote = activeNote
    ? (isOwner || activeNote.author_id === user?.id || activeNote.visibility === 'org')
    : false

  const filtered = notes.filter(n => {
    const matchSearch = !search
      || n.title?.toLowerCase().includes(search.toLowerCase())
      || n.content?.replace(/<[^>]*>/g, '').toLowerCase().includes(search.toLowerCase())
    const matchGroup = groupFilter === 'all' || n.group_id === groupFilter
    return matchSearch && matchGroup
  })

  const unfolderedNotes = filtered.filter(n => !n.folder_id)
  const folderTree      = buildTree()

  const handleUpdate = useStableUpdate(updateNote)

  // ── ações ────────────────────────────────────────────────────────────────
  async function handleCreate(folderId = null) {
    const gId = groupFilter !== 'all' ? groupFilter : groups[0]?.id
    if (!gId) return
    setCreating(true)
    const { data } = await createNote(gId, 'Nova anotação', { folder_id: folderId || null })
    if (data) setActiveNoteId(data.id)
    setCreating(false)
  }

  async function handleDuplicate(note) {
    const gId = note.group_id || (groupFilter !== 'all' ? groupFilter : groups[0]?.id)
    if (!gId) return
    const { data } = await createNote(gId, `${note.title || 'sem título'} (cópia)`, { folder_id: note.folder_id || null })
    if (data) { await updateNote(data.id, { content: note.content || '' }); setActiveNoteId(data.id) }
  }

  async function handleSaveAsTemplate(note) {
    setTemplateFeedback('saving')
    const { error } = await saveAsTemplate({ title: note.title, content: note.content })
    setTemplateFeedback(error ? 'error' : 'saved')
    setTimeout(() => setTemplateFeedback(null), 3000)
  }

  async function handleCreateFromTemplate(template) {
    const gId = groupFilter !== 'all' ? groupFilter : groups[0]?.id
    if (!gId) return
    const { data } = await createNote(gId, template.title, {})
    if (data) { await updateNote(data.id, { content: template.content || '' }); setActiveNoteId(data.id); setShowTemplates(false) }
  }

  async function moveNoteToFolder(noteId, folderId) {
    await updateNote(noteId, { folder_id: folderId || null })
    setShowFolderPicker(false)
  }

  async function toggleVisibility(note) {
    await updateNote(note.id, { visibility: note.visibility === 'private' ? 'org' : 'private' })
  }

  function askDelete(id) {
    setModal({
      type: 'confirm', title: 'EXCLUIR ANOTAÇÃO',
      message: 'Tem certeza? Esta anotação será removida permanentemente.',
      onConfirm: async () => {
        setModal(null)
        if (activeNoteId === id) setActiveNoteId(null)
        await deleteNote(id)
      },
    })
  }

  function askDeleteFolder(folderId) {
    const f     = folders.find(x => x.id === folderId)
    const count = filtered.filter(n => n.folder_id === folderId).length
    setModal({
      type: 'confirm', title: 'EXCLUIR PASTA',
      message: `Excluir a pasta "${f?.name}"? ${count > 0 ? `As ${count} nota(s) ficam sem pasta — não serão apagadas.` : 'Ela está vazia.'}`,
      onConfirm: async () => { setModal(null); await deleteFolder(folderId) },
    })
  }

  function exportMd() {
    if (!activeNote) return
    const md = `# ${activeNote.title || 'Anotação'}\n\n> Grupo: ${activeGroup?.name || '—'} · ${new Date(activeNote.updated_at).toLocaleDateString('pt-BR')}\n\n---\n\n` + toMarkdown(activeNote.content || '')
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([md], { type: 'text/markdown' })),
      download: `${(activeNote.title || 'nota').toLowerCase().replace(/\s+/g, '-')}.md`,
    })
    a.click()
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="page-wrap" style={{ height: '100vh', overflow: 'hidden' }}>

      {/* ── Header ── */}
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
          {/* controles topo */}
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
            {showFolderTree ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setAddingFolder(true)} disabled={addingFolder} className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center', fontSize: 10, gap: 4 }}>
                  <FolderPlus size={11} /> nova pasta
                </button>
                <button onClick={() => handleCreate(null)} disabled={creating || groups.length === 0} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', fontSize: 10, gap: 4 }}>
                  <Plus size={11} /> {creating ? '...' : 'nota'}
                </button>
              </div>
            ) : (
              <button onClick={() => handleCreate(null)} disabled={creating || groups.length === 0} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', opacity: groups.length === 0 ? 0.4 : 1 }}>
                <Plus size={12} /> {creating ? 'criando...' : 'nova anotação'}
              </button>
            )}
          </div>

          {/* lista de notas / árvore de pastas */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 6 }}>
            {loading && <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-dim)', padding: 8 }}>carregando_</div>}

            {!loading && showFolderTree && (
              <>
                {addingFolder && (
                  <NewFolderInput
                    onConfirm={name => { setAddingFolder(false); createFolder(name) }}
                    onCancel={() => setAddingFolder(false)}
                  />
                )}
                <FolderTree
                  tree={folderTree}
                  notes={filtered}
                  activeNoteId={activeNoteId}
                  onNoteClick={setActiveNoteId}
                  onAddNote={handleCreate}
                  onAddSubfolder={(name, parentId) => createFolder(name, parentId)}
                  onRename={renameFolder}
                  onDelete={askDeleteFolder}
                  isOwner={isOwner}
                  currentUserId={user?.id}
                />
                {/* notas sem pasta */}
                {(unfolderedNotes.length > 0 || folderTree.length > 0) && (
                  <div style={{ marginTop: folderTree.length > 0 ? 8 : 0 }}>
                    {folderTree.length > 0 && (
                      <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-dim)', padding: '4px 6px 3px', opacity: 0.6 }}>
                        sem pasta
                      </div>
                    )}
                    {unfolderedNotes.map(note => (
                      <NoteItem key={note.id} note={note} active={activeNoteId === note.id}
                        onClick={() => setActiveNoteId(note.id)} isOwner={isOwner} currentUserId={user?.id} />
                    ))}
                  </div>
                )}
                {!loading && filtered.length === 0 && folderTree.length === 0 && !addingFolder && (
                  <Empty>nenhuma anotação ainda</Empty>
                )}
              </>
            )}

            {!loading && !showFolderTree && (
              <>
                {filtered.length === 0 && <Empty>{notes.length === 0 ? 'nenhuma anotação ainda' : 'sem resultados'}</Empty>}
                {filtered.map(note => (
                  <NoteItem key={note.id} note={note} active={activeNoteId === note.id}
                    onClick={() => setActiveNoteId(note.id)} isOwner={isOwner} currentUserId={user?.id} />
                ))}
              </>
            )}
          </div>

          {/* rodapé sidebar */}
          <div style={{ padding: '7px 10px', borderTop: '1px solid var(--border)', fontFamily: 'var(--ff-mono)', fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.12em' }}>
            {filtered.length} anotaç{filtered.length !== 1 ? 'ões' : 'ão'} · {notes.filter(n => n.pinned).length} fixada{notes.filter(n => n.pinned).length !== 1 ? 's' : ''}
            {showFolderTree && folders.length > 0 && ` · ${folders.length} pasta${folders.length !== 1 ? 's' : ''}`}
          </div>
        </div>

        {/* ── EDITOR ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          {activeNote ? (
            <>
              {/* barra de título + ações */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg-card)', flexShrink: 0, flexWrap: 'wrap' }}>
                {editingTitle === activeNote.id ? (
                  <input autoFocus defaultValue={activeNote.title}
                    onBlur={e => { updateNote(activeNote.id, { title: e.target.value }); setEditingTitle(null) }}
                    onKeyDown={e => { if (e.key === 'Enter') e.target.blur() }}
                    style={{ flex: 1, minWidth: 0, background: 'var(--surface)', border: '1px solid var(--border-red)', borderRadius: 'var(--radius)', padding: '4px 8px', color: 'var(--text)', fontSize: 14, fontWeight: 600, outline: 'none' }} />
                ) : (
                  <div onClick={() => canEditActiveNote && setEditingTitle(activeNote.id)}
                    style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, color: 'var(--text)', cursor: canEditActiveNote ? 'text' : 'default', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {activeNote.visibility === 'private' && <Lock size={12} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />}
                    {activeNote.title || 'sem título'}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 4, flexShrink: 0, flexWrap: 'wrap', alignItems: 'center' }}>
                  {/* mover para pasta */}
                  {showFolderTree && folders.length > 0 && (
                    <div style={{ position: 'relative' }}>
                      <button onClick={() => setShowFolderPicker(v => !v)} title="mover para pasta"
                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--surface)', color: activeNoteFolder ? 'var(--text)' : 'var(--text-muted)', fontFamily: 'var(--ff-mono)', fontSize: 10, cursor: 'pointer' }}>
                        <FolderInput size={11} />
                        <span style={{ maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {activeNoteFolder ? activeNoteFolder.name : 'sem pasta'}
                        </span>
                      </button>
                      {showFolderPicker && (
                        <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, background: 'var(--bg-card)', border: '1px solid var(--border-red)', borderRadius: 'var(--radius-md)', padding: 4, zIndex: 200, minWidth: 150, boxShadow: '0 8px 24px rgba(0,0,0,0.35)' }}>
                          <FolderOption label="sem pasta" active={!activeNote.folder_id} onClick={() => moveNoteToFolder(activeNote.id, null)} />
                          {folders.map(f => (
                            <FolderOption key={f.id} label={f.name} active={activeNote.folder_id === f.id} onClick={() => moveNoteToFolder(activeNote.id, f.id)} />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <button onClick={() => togglePin(activeNote.id, activeNote.pinned)} title={activeNote.pinned ? 'desafixar' : 'fixar'}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: activeNote.pinned ? 'var(--red-dim)' : 'var(--surface)', color: activeNote.pinned ? '#F0EDE8' : 'var(--text-muted)', fontFamily: 'var(--ff-mono)', fontSize: 10, cursor: 'pointer' }}>
                    {activeNote.pinned ? <PinOff size={11} /> : <Pin size={11} />}
                  </button>

                  <ToolBtn title={activeNote.visibility === 'private' ? 'tornar visível para a org' : 'tornar privado'} icon={activeNote.visibility === 'private' ? <Eye size={11} /> : <EyeOff size={11} />} onClick={() => toggleVisibility(activeNote)} label={activeNote.visibility === 'private' ? 'privado' : 'visível'} active={activeNote.visibility === 'private'} />
                  <ToolBtn title="duplicar" icon={<Copy size={11} />} onClick={() => handleDuplicate(activeNote)} label="duplicar" />

                  {/* salvar como template */}
                  <button onClick={() => templateFeedback !== 'saving' && handleSaveAsTemplate(activeNote)} disabled={templateFeedback === 'saving'}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 'var(--radius)', fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '0.08em', cursor: templateFeedback === 'saving' ? 'wait' : 'pointer',
                      border: templateFeedback === 'saved' ? '1px solid #2a6e3a' : templateFeedback === 'error' ? '1px solid var(--border-red)' : '1px solid var(--border)',
                      background: templateFeedback === 'saved' ? 'rgba(90,171,110,0.15)' : templateFeedback === 'error' ? 'var(--red-dim)' : 'var(--surface)',
                      color: templateFeedback === 'saved' ? '#5aab6e' : templateFeedback === 'error' ? 'var(--red)' : 'var(--text-muted)',
                    }}>
                    <LayoutTemplate size={11} />
                    <span>{templateFeedback === 'saved' ? '✓ salvo!' : templateFeedback === 'saving' ? '...' : templateFeedback === 'error' ? '✗ erro' : 'template'}</span>
                  </button>

                  <ToolBtn title="usar template" icon={<FileText size={11} />} onClick={() => setShowTemplates(true)} label="usar template" />
                  <ToolBtn title="exportar .md" icon={<Download size={11} />} onClick={exportMd} label=".md" />
                  <ToolBtn title="enviar nota ao GitHub" icon={<Send size={11} />} onClick={() => setShowPushNote(true)} label="github" />
                  {activeNoteFolder && (
                    <ToolBtn title="enviar pasta inteira ao GitHub" icon={<Folder size={11} />} onClick={() => setShowPushFolder(true)} label="pasta→git" />
                  )}
                  <ToolBtn title="criar card no Trello" icon={<LayoutList size={11} />} onClick={() => setShowTrello(true)} label="trello" />
                  <ToolBtn title="excluir nota" icon={<Trash2 size={11} />} onClick={() => askDelete(activeNote.id)} danger />
                </div>
              </div>

              {/* editor */}
              <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <NoteEditor note={activeNote} onUpdate={handleUpdate} />
              </div>

              {/* rodapé editor */}
              <div style={{ padding: '6px 16px', borderTop: '1px solid var(--border)', fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--text-dim)', display: 'flex', justifyContent: 'space-between', flexShrink: 0 }}>
                <span>
                  ›_ salvo automaticamente
                  {activeNoteFolder && (
                    <span style={{ marginLeft: 10, opacity: 0.6 }}>
                      <Folder size={9} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />
                      {activeNoteFolder.name}
                    </span>
                  )}
                  {activeNote.visibility === 'private' && (
                    <span style={{ marginLeft: 10, opacity: 0.7, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      <Lock size={9} /> privado
                    </span>
                  )}
                </span>
                <span>{new Date(activeNote.updated_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
              <FileText size={36} style={{ color: 'var(--text-dim)', opacity: 0.25 }} />
              <div style={{ fontFamily: 'var(--ff-disp)', fontSize: 22, letterSpacing: '0.08em', color: 'var(--text-dim)' }}>SELECIONE UMA NOTA</div>
              <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.15em' }}>ou crie uma nova ao lado</div>
              {groups.length > 0 && (
                <button onClick={() => handleCreate(null)} className="btn btn-primary" style={{ marginTop: 8 }}>
                  <Plus size={12} /> nova anotação
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── overlay folder picker ── */}
      {showFolderPicker && <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setShowFolderPicker(false)} />}

      {/* ── Modais ── */}
      {showPushNote  && <PushNoteModal note={activeNote} group={activeGroup} onClose={() => setShowPushNote(false)} />}
      {showPushFolder && <PushFolderModal folder={activeNoteFolder} notes={notes} group={activeGroup} onClose={() => setShowPushFolder(false)} />}
      {showTrello    && <TrelloCardModal note={activeNote} group={activeGroup} trelloToken={trelloToken} onClose={() => setShowTrello(false)} />}
      {showTemplates && <TemplatesModal templates={templates} onUse={handleCreateFromTemplate} onDelete={deleteTemplate} onClose={() => setShowTemplates(false)} />}
      {modal         && <CardModal {...modal} onClose={() => setModal(null)} confirmLabel="excluir" />}
    </div>
  )
}

// ── helpers inline ────────────────────────────────────────────────────────────
function Empty({ children }) {
  return (
    <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-dim)', padding: '12px 8px', textAlign: 'center', lineHeight: 1.7 }}>
      {children}
    </div>
  )
}

function FolderOption({ label, active, onClick }) {
  return (
    <button onClick={onClick}
      style={{ width: '100%', textAlign: 'left', padding: '5px 9px', borderRadius: 'var(--radius)', fontFamily: 'var(--ff-mono)', fontSize: 11, color: active ? 'var(--red)' : 'var(--text-muted)', cursor: 'pointer', background: 'transparent', display: 'flex', alignItems: 'center', gap: 6 }}
      onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
      onMouseLeave={e => e.currentTarget.style.color = active ? 'var(--red)' : 'var(--text-muted)'}>
      <Folder size={10} /> {label}
    </button>
  )
}
