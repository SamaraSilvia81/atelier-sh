import { useState, useRef, useEffect, useCallback } from 'react'
import { X, MessageSquare, Calendar, Tag, Send, Pencil, Check, ExternalLink, ChevronRight, Loader } from 'lucide-react'
import { trelloTimeAgo } from '../../lib/trello'

const KEY  = import.meta.env.VITE_TRELLO_API_KEY
const BASE = 'https://api.trello.com/1'

function auth(token) { return `key=${KEY}&token=${token}` }

// ── API helpers ───────────────────────────────────────────────
async function fetchCardComments(token, cardId) {
  try {
    const res = await fetch(`${BASE}/cards/${cardId}/actions?filter=commentCard&${auth(token)}`)
    if (!res.ok) return []
    return await res.json()
  } catch { return [] }
}

async function fetchCardDetails(token, cardId) {
  try {
    const res = await fetch(`${BASE}/cards/${cardId}?${auth(token)}&fields=id,name,desc,due,dueComplete,labels,url,idMembers`)
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

async function postComment(token, cardId, text) {
  const res = await fetch(`${BASE}/cards/${cardId}/actions/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: KEY, token, text }),
  })
  if (!res.ok) throw new Error('Erro ao comentar')
  return await res.json()
}

async function updateCard(token, cardId, payload) {
  const params = new URLSearchParams({ key: KEY, token, ...payload })
  const res = await fetch(`${BASE}/cards/${cardId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  })
  if (!res.ok) throw new Error('Erro ao atualizar card')
  return await res.json()
}

// ── Painel lateral do card ────────────────────────────────────
function CardPanel({ card, token, onClose, onCardUpdated }) {
  const [comments, setComments]   = useState([])
  const [details, setDetails]     = useState(null)
  const [loadingComments, setLoadingComments] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [posting, setPosting]     = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [editingDesc, setEditingDesc] = useState(false)
  const [nameVal, setNameVal]     = useState(card.name)
  const [descVal, setDescVal]     = useState('')
  const [saving, setSaving]       = useState(false)
  const textareaRef = useRef()

  useEffect(() => {
    async function load() {
      setLoadingComments(true)
      const [comms, det] = await Promise.all([
        fetchCardComments(token, card.id),
        fetchCardDetails(token, card.id),
      ])
      setComments(comms)
      setDetails(det)
      setNameVal(det?.name || card.name)
      setDescVal(det?.desc || '')
      setLoadingComments(false)
    }
    load()
  }, [card.id, token])

  async function handleComment() {
    if (!newComment.trim()) return
    setPosting(true)
    try {
      const c = await postComment(token, card.id, newComment.trim())
      setComments(prev => [c, ...prev])
      setNewComment('')
    } catch { /* ignore */ }
    setPosting(false)
  }

  async function saveName() {
    if (!nameVal.trim() || nameVal === (details?.name || card.name)) { setEditingName(false); return }
    setSaving(true)
    try {
      const updated = await updateCard(token, card.id, { name: nameVal.trim() })
      setDetails(d => ({ ...d, name: updated.name }))
      onCardUpdated(card.id, { name: updated.name })
    } catch { /* ignore */ }
    setSaving(false)
    setEditingName(false)
  }

  async function saveDesc() {
    setSaving(true)
    try {
      await updateCard(token, card.id, { desc: descVal })
      setDetails(d => ({ ...d, desc: descVal }))
    } catch { /* ignore */ }
    setSaving(false)
    setEditingDesc(false)
  }

  async function toggleDue() {
    if (!details?.due) return
    setSaving(true)
    try {
      const updated = await updateCard(token, card.id, { dueComplete: !details.dueComplete })
      setDetails(d => ({ ...d, dueComplete: updated.dueComplete }))
    } catch { /* ignore */ }
    setSaving(false)
  }

  const mono = { fontFamily: 'var(--ff-mono)' }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end',
      background: 'var(--overlay)',
    }} onClick={e => e.target === e.currentTarget && onClose()}>

      <div style={{
        width: 420, height: '100%', background: 'var(--bg-card)',
        borderLeft: '1px solid var(--border-red)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        animation: 'slideInRight 0.2s ease',
      }}>
        {/* Header */}
        <div style={{ height: 3, background: 'linear-gradient(90deg, var(--red), var(--red-glow))', flexShrink: 0 }} />
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Nome do card — editável */}
            {editingName ? (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input autoFocus value={nameVal} onChange={e => setNameVal(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false) }}
                  style={{ flex: 1, ...mono, fontSize: 13, fontWeight: 600, padding: '4px 8px', background: 'var(--surface)', border: '1px solid var(--border-red)', borderRadius: 'var(--radius)', color: 'var(--text)', outline: 'none' }}
                />
                <button onClick={saveName} disabled={saving} style={{ color: '#5aab6e', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                  {saving ? <Loader size={13} /> : <Check size={13} />}
                </button>
                <button onClick={() => setEditingName(false)} style={{ color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}><X size={13} /></button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'text' }} onClick={() => setEditingName(true)}>
                <span style={{ ...mono, fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: 1.4, flex: 1 }}>
                  {details?.name || card.name}
                </span>
                <Pencil size={11} style={{ color: 'var(--text-dim)', opacity: 0.4, flexShrink: 0 }} />
              </div>
            )}

            {/* Labels */}
            {(details?.labels || card.labels || []).length > 0 && (
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
                {(details?.labels || card.labels).map(l => (
                  <span key={l.id} style={{
                    padding: '2px 8px', borderRadius: 2,
                    background: l.color ? `${l.color}33` : 'var(--surface)',
                    border: `1px solid ${l.color || 'var(--border)'}55`,
                    ...mono, fontSize: 9, letterSpacing: '0.1em',
                    color: l.color || 'var(--text-dim)', textTransform: 'uppercase',
                  }}>{l.name || l.color}</span>
                ))}
              </div>
            )}

            {/* Due date */}
            {details?.due && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
                <button onClick={toggleDue} style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '3px 8px',
                  borderRadius: 'var(--radius)', border: `1px solid ${details.dueComplete ? 'rgba(90,171,110,0.4)' : 'var(--border)'}`,
                  background: details.dueComplete ? 'rgba(90,171,110,0.1)' : 'var(--surface)',
                  color: details.dueComplete ? '#5aab6e' : 'var(--text-dim)',
                  ...mono, fontSize: 10, cursor: 'pointer',
                }}>
                  <Calendar size={10} />
                  {new Date(details.due).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  {details.dueComplete && ' ✓'}
                </button>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            <a href={details?.url || card.url} target="_blank" rel="noopener noreferrer"
              style={{ padding: '4px 6px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-dim)', display: 'flex', alignItems: 'center' }}>
              <ExternalLink size={12} />
            </a>
            <button onClick={onClose} style={{ padding: '4px 6px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <X size={12} />
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

          {/* Descrição */}
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ ...mono, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 8 }}>// descrição</div>
            {editingDesc ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <textarea
                  ref={textareaRef}
                  value={descVal}
                  onChange={e => setDescVal(e.target.value)}
                  rows={4}
                  style={{ width: '100%', ...mono, fontSize: 11, padding: '8px 10px', background: 'var(--surface)', border: '1px solid var(--border-red)', borderRadius: 'var(--radius)', color: 'var(--text)', outline: 'none', resize: 'vertical', lineHeight: 1.5, boxSizing: 'border-box' }}
                />
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={saveDesc} disabled={saving}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 'var(--radius)', background: 'var(--red-dim)', border: '1px solid var(--border-red)', color: 'var(--red)', ...mono, fontSize: 10, cursor: 'pointer' }}>
                    {saving ? <Loader size={11} /> : <Check size={11} />} salvar
                  </button>
                  <button onClick={() => { setEditingDesc(false); setDescVal(details?.desc || '') }}
                    style={{ padding: '5px 10px', borderRadius: 'var(--radius)', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-dim)', ...mono, fontSize: 10, cursor: 'pointer' }}>
                    cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div onClick={() => setEditingDesc(true)} style={{ cursor: 'text', minHeight: 36 }}>
                {details?.desc
                  ? <p style={{ ...mono, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>{details.desc}</p>
                  : <p style={{ ...mono, fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>clique para adicionar descrição...</p>
                }
              </div>
            )}
          </div>

          {/* Comentários */}
          <div style={{ padding: '14px 20px', flex: 1 }}>
            <div style={{ ...mono, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <MessageSquare size={10} /> // comentários {comments.length > 0 && `(${comments.length})`}
            </div>

            {loadingComments ? (
              <div style={{ ...mono, fontSize: 11, color: 'var(--text-dim)' }}>carregando_</div>
            ) : comments.length === 0 ? (
              <div style={{ ...mono, fontSize: 11, color: 'var(--text-dim)', fontStyle: 'italic' }}>nenhum comentário ainda</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                {comments.map(c => (
                  <div key={c.id} style={{ display: 'flex', gap: 8 }}>
                    <img
                      src={c.memberCreator?.avatarUrl ? `${c.memberCreator.avatarUrl}/30.png` : `https://ui-avatars.com/api/?name=${encodeURIComponent(c.memberCreator?.fullName || '?')}&size=30&background=860120&color=fff`}
                      alt="" style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, marginTop: 2 }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 4 }}>
                        <span style={{ ...mono, fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>{c.memberCreator?.fullName || '—'}</span>
                        <span style={{ ...mono, fontSize: 9, color: 'var(--text-dim)' }}>{trelloTimeAgo(c.date)}</span>
                      </div>
                      <div style={{ ...mono, fontSize: 11, color: 'var(--text-sub)', lineHeight: 1.6, background: 'var(--surface)', padding: '8px 10px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', whiteSpace: 'pre-wrap' }}>
                        {c.data?.text}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Input novo comentário */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <textarea
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleComment() }}
              placeholder="comentar... (ctrl+enter para enviar)"
              rows={2}
              style={{ flex: 1, ...mono, fontSize: 11, padding: '7px 10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text)', outline: 'none', resize: 'none', lineHeight: 1.5, boxSizing: 'border-box' }}
            />
            <button onClick={handleComment} disabled={posting || !newComment.trim()}
              style={{ padding: '8px 10px', borderRadius: 'var(--radius)', background: newComment.trim() ? 'var(--red)' : 'var(--surface)', border: `1px solid ${newComment.trim() ? 'var(--red)' : 'var(--border)'}`, color: newComment.trim() ? '#fff' : 'var(--text-dim)', cursor: newComment.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', flexShrink: 0, transition: 'all var(--fast)' }}>
              {posting ? <Loader size={14} /> : <Send size={14} />}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </div>
  )
}

// ── Kanban com drag-to-scroll ─────────────────────────────────
export default function TrelloKanban({ lists: initialLists, token, boardId, onOpenExternal }) {
  const [lists, setLists] = useState(initialLists)
  const [selectedCard, setSelectedCard] = useState(null)
  const containerRef = useRef()
  const dragging = useRef(false)
  const startX = useRef(0)
  const scrollLeft = useRef(0)

  useEffect(() => { setLists(initialLists) }, [initialLists])

  // ── Drag-to-scroll ──────────────────────────────────────────
  const onMouseDown = useCallback(e => {
    // Não inicia drag se clicou num card ou botão
    if (e.target.closest('[data-card]') || e.target.closest('button') || e.target.closest('a')) return
    dragging.current = true
    startX.current = e.pageX - containerRef.current.offsetLeft
    scrollLeft.current = containerRef.current.scrollLeft
    containerRef.current.style.cursor = 'grabbing'
    containerRef.current.style.userSelect = 'none'
  }, [])

  const onMouseMove = useCallback(e => {
    if (!dragging.current) return
    e.preventDefault()
    const x = e.pageX - containerRef.current.offsetLeft
    const walk = (x - startX.current) * 1.2
    containerRef.current.scrollLeft = scrollLeft.current - walk
  }, [])

  const onMouseUp = useCallback(() => {
    dragging.current = false
    if (containerRef.current) {
      containerRef.current.style.cursor = 'grab'
      containerRef.current.style.userSelect = ''
    }
  }, [])

  useEffect(() => {
    window.addEventListener('mouseup', onMouseUp)
    return () => window.removeEventListener('mouseup', onMouseUp)
  }, [onMouseUp])

  function handleCardUpdated(cardId, changes) {
    setLists(prev => prev.map(list => ({
      ...list,
      cards: list.cards?.map(c => c.id === cardId ? { ...c, ...changes } : c),
    })))
  }

  const mono = { fontFamily: 'var(--ff-mono)' }

  return (
    <>
      <div
        ref={containerRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        style={{
          display: 'flex', gap: 12,
          overflowX: 'auto', paddingBottom: 12, paddingTop: 4,
          cursor: 'grab',
          scrollbarWidth: 'thin',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {lists.map(list => (
          <div key={list.id} style={{
            minWidth: 230, maxWidth: 240, flexShrink: 0,
            background: 'var(--surface)', borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)', padding: '10px 10px 12px',
            display: 'flex', flexDirection: 'column',
          }}>
            {/* Header da lista */}
            <div style={{ ...mono, fontSize: 9, letterSpacing: '0.2em', color: 'var(--red)', textTransform: 'uppercase', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{list.name}</span>
              <span style={{ color: 'var(--text-dim)', background: 'var(--bg-card)', borderRadius: 10, padding: '1px 6px', border: '1px solid var(--border)', fontSize: 9 }}>{list.cards?.length || 0}</span>
            </div>

            {/* Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
              {list.cards?.map(card => (
                <div
                  key={card.id}
                  data-card="true"
                  onClick={() => setSelectedCard(card)}
                  style={{
                    padding: '8px 10px', background: 'var(--bg-card)',
                    borderRadius: 'var(--radius)', border: '1px solid var(--border)',
                    cursor: 'pointer', lineHeight: 1.4, transition: 'all var(--fast)',
                    position: 'relative',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-red)'; e.currentTarget.style.background = 'var(--red-dim)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-card)' }}
                >
                  {/* Labels */}
                  {card.labels?.length > 0 && (
                    <div style={{ display: 'flex', gap: 3, marginBottom: 5 }}>
                      {card.labels.map(l => (
                        <span key={l.id} style={{ height: 4, minWidth: 24, borderRadius: 2, background: l.color || '#888', display: 'block' }} title={l.name} />
                      ))}
                    </div>
                  )}

                  <span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>{card.name}</span>

                  {/* Footer do card */}
                  {(card.due || card.idMembers?.length > 0) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                      {card.due && (
                        <span style={{ ...mono, fontSize: 9, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Calendar size={9} />
                          {new Date(card.due).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        </span>
                      )}
                    </div>
                  )}

                  <ChevronRight size={10} style={{ position: 'absolute', right: 6, bottom: 8, color: 'var(--text-dim)', opacity: 0.4 }} />
                </div>
              ))}

              {(list.cards?.length || 0) === 0 && (
                <div style={{ ...mono, fontSize: 10, color: 'var(--text-dim)', padding: '6px 4px', textAlign: 'center' }}>— vazio —</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Painel lateral do card */}
      {selectedCard && (
        <CardPanel
          card={selectedCard}
          token={token}
          onClose={() => setSelectedCard(null)}
          onCardUpdated={handleCardUpdated}
        />
      )}
    </>
  )
}