import { useState, useEffect } from 'react'
import { fetchRepoInfo, fetchAtas, fetchAllCommits, fetchIssues, timeAgo } from '../../lib/github'
import { fetchBoardLists } from '../../lib/trello'
import { fetchFigmaFile } from '../../lib/figma'
import { GitBranch, FileText, Pencil, Trash2, LayoutList, Monitor, Lock, Users, ChevronRight } from 'lucide-react'
import GroupDetailModal from './GroupDetailModal'

export default function GroupCard({ group, trelloToken, onEdit, onDelete, onOpenNotes, onOpenReview, view = 'grid' }) {
  const [github, setGithub] = useState(null)
  const [atas, setAtas] = useState([])
  const [loading, setLoading] = useState({ gh: false })
  const [showDetail, setShowDetail] = useState(false)

  const parseMaybeJson = (val, fallback = []) => {
    if (Array.isArray(val)) return val
    try { return JSON.parse(val) } catch { return fallback }
  }
  const members = parseMaybeJson(group?.members)
  const tags = parseMaybeJson(group?.tags)

  useEffect(() => {
    if (!group.github_repo) return
    setLoading(l => ({ ...l, gh: true }))
    Promise.all([fetchRepoInfo(group.github_repo, group.github_token), fetchAtas(group.github_repo, group.github_token)])
      .then(([info, a]) => { setGithub(info); setAtas(a) })
      .finally(() => setLoading(l => ({ ...l, gh: false })))
  }, [group.github_repo])

  const statusColor = group.status === 'active' ? '#5aab6e' : group.status === 'attention' ? '#c8922a' : 'var(--text-dim)'
  const statusLabel = group.status === 'active' ? 'ativo' : group.status === 'attention' ? 'atenção' : 'inativo'
  const barBg = group.status === 'active' ? 'linear-gradient(90deg, var(--red), var(--red-glow))' : group.status === 'attention' ? 'linear-gradient(90deg, #c8922a, #7a5010)' : 'var(--border)'
  const isPrivate = github?.error === 'unauthorized' || github?.private
  const notFound = github?.error === 'not_found'

  const actionBtn = (title, icon, onClick, danger = false) => (
    <button key={title} onClick={onClick} title={title} style={{
      padding: 5, borderRadius: 'var(--radius)',
      background: 'var(--surface)', border: '1px solid var(--border)',
      color: danger ? 'var(--text-dim)' : 'var(--text-muted)',
      transition: 'all var(--fast)', cursor: 'pointer', display: 'flex', alignItems: 'center',
    }}
      onMouseEnter={e => { e.currentTarget.style.color = danger ? 'var(--red)' : 'var(--text)'; e.currentTarget.style.borderColor = 'var(--border-red)' }}
      onMouseLeave={e => { e.currentTarget.style.color = danger ? 'var(--text-dim)' : 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}>
      {icon}
    </button>
  )

  // ── MODO LISTA ──────────────────────────────────────────
  if (view === 'list') return (
    <>
      <div className="card" style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 18px', borderLeft: `3px solid ${statusColor}`,
        borderTop: 'none', borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 160 }}>
            <span style={{ fontFamily: 'var(--ff-disp)', fontSize: '0.95rem', letterSpacing: '0.04em', color: 'var(--text)', lineHeight: 1.1 }}>
              {group.name}
            </span>
            {isPrivate && <Lock size={10} style={{ color: 'var(--amber)', flexShrink: 0 }} />}
            {group.figma_url && <span title="tem Figma" style={{ color: '#a259ff', fontSize: 10 }}>◈</span>}
          </div>
          {group.description && (
            <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {group.description}
            </span>
          )}
          {github?.lastCommit && (
            <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--text-dim)' }}>
              ›_ {github.lastCommit.message.substring(0, 52)}
            </span>
          )}
          {members.length > 0 && (
            <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 3 }}>
              <Users size={9} /> {members.length}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor }} />
            <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: statusColor, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {statusLabel}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 3 }}>
            {actionBtn('anotações', <FileText size={11} />, () => onOpenNotes(group))}
            {actionBtn('⬡ ativar extensão', <Monitor size={11} />, () => onOpenReview(group))}
            {actionBtn('editar', <Pencil size={11} />, () => onEdit(group))}
            {actionBtn('excluir', <Trash2 size={11} />, () => onDelete(group.id), true)}
          </div>
        </div>
      </div>
      {showDetail && <GroupDetailModal group={group} github={github} atas={atas} onClose={() => setShowDetail(false)} onOpenReview={() => { setShowDetail(false); onOpenReview(group) }} />}
    </>
  )

  return (
    <>
      <div className="card">
        <div style={{ height: 3, background: barBg }} />

        <div style={{ padding: '14px 18px 10px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--ff-disp)', fontSize: '1.05rem', letterSpacing: '0.04em', color: 'var(--text)', lineHeight: 1.1 }}>
                {group.name}
              </span>
              {isPrivate && <Lock size={10} style={{ color: 'var(--amber)', flexShrink: 0 }} />}
              {group.figma_url && <span title="tem Figma" style={{ color: '#a259ff', fontSize: 10 }}>◈</span>}
              {members.length > 0 && (
                <span title={`${members.length} integrante${members.length !== 1 ? 's' : ''}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 2, fontFamily: 'var(--ff-mono)', fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.1em' }}>
                  <Users size={9} /> {members.length}
                </span>
              )}
            </div>
            {group.description && (
              <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 3 }}>
                {group.description}
              </div>
            )}
            {(group.stage || tags.length > 0) && (
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                {group.stage && (
                  <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, padding: '2px 7px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-dim)', background: 'var(--surface)' }}>
                    {group.stage}
                  </span>
                )}
                {tags.slice(0, 3).map(tag => (
                  <span key={tag} style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, padding: '2px 7px', border: '1px solid var(--border-red)', borderRadius: 'var(--radius)', color: 'var(--text-muted)', background: 'rgba(74,21,21,0.1)' }}>
                    {tag}
                  </span>
                ))}
                {tags.length > 3 && <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--text-dim)', padding: '2px 4px' }}>+{tags.length - 3}</span>}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor }} />
              <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: statusColor, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{statusLabel}</span>
            </div>
            <div style={{ display: 'flex', gap: 3 }}>
              {actionBtn('anotações', <FileText size={11} />, () => onOpenNotes(group))}
              {actionBtn('⬡ ativar extensão', <Monitor size={11} />, () => onOpenReview(group))}
              {actionBtn('editar', <Pencil size={11} />, () => onEdit(group))}
              {actionBtn('excluir', <Trash2 size={11} />, () => onDelete(group.id), true)}
            </div>
          </div>
        </div>

        <div style={{ height: 1, background: 'var(--border)', margin: '0 18px' }} />

        <div style={{ padding: '10px 18px', fontFamily: 'var(--ff-mono)', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          {loading.gh
            ? <span style={{ color: 'var(--text-dim)' }}>carregando_</span>
            : notFound ? <span style={{ color: 'var(--text-dim)' }}>›_ repo não encontrado</span>
            : isPrivate && !github?.lastCommit ? <span style={{ color: '#c8922a' }}>›_ repo privado — configure o GitHub token</span>
            : github?.lastCommit ? <>
                <span style={{ color: 'var(--red)' }}>›_ </span>
                <span style={{ color: 'var(--text-sub)' }}>{github.lastCommit.message.substring(0, 62)}</span>
                <div style={{ color: 'var(--text-dim)', fontSize: 11, marginTop: 3 }}>
                  {github.lastCommit.author} · {timeAgo(github.lastCommit.date)} · {github.lastCommit.sha}
                </div>
              </>
            : <span style={{ color: 'var(--text-dim)' }}>›_ {group.github_repo ? 'sem commits' : 'sem repositório'}</span>
          }
        </div>

        {atas.length > 0 && (
          <div style={{ padding: '0 18px 10px' }}>
            <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.28em', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 5 }}>docs / atas</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {atas.slice(0, 4).map(a => (
                <a key={a.name} href={a.url} target="_blank" rel="noopener"
                  style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, padding: '3px 8px', border: '1px solid var(--border-red)', borderRadius: 'var(--radius)', color: 'var(--text-muted)', background: 'rgba(74,21,21,0.12)', textDecoration: 'none' }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)' }}>
                  {a.name.replace('.md', '')}
                </a>
              ))}
              {atas.length > 4 && <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--text-dim)', padding: '3px 5px' }}>+{atas.length - 4}</span>}
            </div>
          </div>
        )}

        {members.length > 0 && (
          <div style={{ padding: '0 18px 10px' }}>
            <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.28em', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 5 }}>integrantes</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {members.slice(0, 4).map(m => (
                <span key={m.id} style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, padding: '2px 7px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-muted)', background: 'var(--surface)' }}>
                  {m.name}
                </span>
              ))}
              {members.length > 4 && <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--text-dim)', padding: '2px 4px' }}>+{members.length - 4}</span>}
            </div>
          </div>
        )}

        <div style={{ height: 1, background: 'var(--border)' }} />

        <div style={{ padding: '9px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 12 }}>
            {group.github_repo && (
              <a href={`https://github.com/${group.github_repo}`} target="_blank" rel="noopener"
                style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
                <GitBranch size={10} /> {isPrivate ? 'privado' : 'github'}
              </a>
            )}
            {group.trello_board_id && <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 4 }}><LayoutList size={10} /> trello</span>}
            {group.figma_url && <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: '#a259ff', display: 'flex', alignItems: 'center', gap: 4, opacity: 0.7 }}>◈ figma</span>}
          </div>
          <button onClick={() => setShowDetail(true)}
            style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', background: 'none', border: 'none', padding: '4px 0' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}>
            detalhes <ChevronRight size={11} />
          </button>
        </div>
      </div>

      {showDetail && (
        <GroupDetailModal
          group={group}
          trelloToken={trelloToken}
          onClose={() => setShowDetail(false)}
          onEdit={() => { setShowDetail(false); onEdit(group) }}
          onOpenNotes={() => { setShowDetail(false); onOpenNotes(group) }}
          onOpenReview={() => { setShowDetail(false); onOpenReview(group) }}
        />
      )}
    </>
  )
}
