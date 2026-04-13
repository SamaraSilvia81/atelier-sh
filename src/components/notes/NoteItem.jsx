import { Pin, Lock, EyeOff } from 'lucide-react'
import { stripHtml } from '../../utils/notes'

export default function NoteItem({ note, active, indent = false, onClick, isOwner, currentUserId }) {
  const isLocked = note.visibility === 'private'
    && note.author_id !== currentUserId
    && !isOwner

  return (
    <button
      onClick={isLocked ? undefined : onClick}
      style={{
        width: '100%', textAlign: 'left',
        padding: indent ? '7px 9px 7px 28px' : '8px 9px',
        borderRadius: 'var(--radius-md)', marginBottom: 2,
        background: active ? 'var(--red-dim)' : 'transparent',
        border: active ? '1px solid var(--border-red)' : '1px solid transparent',
        transition: 'all var(--fast)',
        cursor: isLocked ? 'not-allowed' : 'pointer',
        opacity: isLocked ? 0.55 : 1,
      }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
        {note.pinned && <Pin size={9} style={{ color: active ? '#F0EDE8' : 'var(--red)', flexShrink: 0 }} />}
        {isLocked
          ? <Lock size={9} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
          : note.visibility === 'private' && <EyeOff size={9} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
        }
        <span style={{ fontSize: 12, fontWeight: 500, color: active ? '#F0EDE8' : 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {note.title || 'sem título'}
        </span>
      </div>
      {isLocked ? (
        <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--text-dim)', marginTop: 2, opacity: 0.5 }}>
          conteúdo privado
        </div>
      ) : note.content && (
        <div style={{ fontFamily: 'var(--ff-body)', fontSize: 11, color: active ? 'rgba(240,237,232,0.45)' : 'var(--text-dim)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {stripHtml(note.content).substring(0, 55)}
        </div>
      )}
    </button>
  )
}
