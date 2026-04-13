import { useState, useEffect } from 'react'
import { X, AlertCircle, CheckCircle2 } from 'lucide-react'
import { createTrelloCard, fetchBoardLists } from '../../../lib/trello'
import { toMarkdown } from '../../../utils/notes'

const inp = { width: '100%', padding: '8px 10px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'var(--ff-mono)', fontSize: 11, borderRadius: 'var(--radius)', outline: 'none' }
const lbl = { fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-dim)', display: 'block', marginBottom: 5 }

export default function TrelloCardModal({ note, group, trelloToken, onClose }) {
  const [lists, setLists]       = useState([])
  const [listId, setListId]     = useState('')
  const [cardName, setCardName] = useState(note?.title || '')
  const [cardDesc, setCardDesc] = useState(toMarkdown(note?.content || '').substring(0, 300))
  const [status, setStatus]     = useState(null)
  const [loading, setLoading]   = useState(false)

  // ✅ useEffect (não useState) para buscar listas
  useEffect(() => {
    if (trelloToken && group?.trello_board_id) {
      fetchBoardLists(trelloToken, group.trello_board_id).then(ls => {
        setLists(ls)
        if (ls[0]) setListId(ls[0].id)
      })
    }
  }, [])

  async function handleCreate() {
    if (!listId || !cardName) return
    setLoading(true); setStatus(null)
    const { data, error } = await createTrelloCard(trelloToken, { listId, name: cardName, desc: cardDesc })
    setStatus(error ? { ok: false, msg: '✗ ' + error } : { ok: true, msg: '✓ card criado!', url: data?.url })
    setLoading(false)
  }

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
        {!trelloToken         && <Warn>configure o token Trello nas configurações</Warn>}
        {!group?.trello_board_id && <Warn>vincule um board Trello a este grupo primeiro</Warn>}
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

function Warn({ children }) {
  return <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: '#c8922a', marginBottom: 12 }}>{children}</div>
}
