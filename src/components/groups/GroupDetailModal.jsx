import { useState, useEffect } from 'react'
import {
  X, Pencil, FileText, Monitor, GitBranch, LayoutList, Lock,
  Users, FileCode, ExternalLink, ChevronDown, LayoutGrid, List, Frame
} from 'lucide-react'
import { useSounds } from '../../hooks/useSounds'
import { fetchRepoInfo, fetchAtas, fetchAllCommits, fetchIssues, timeAgo } from '../../lib/github'
import { fetchBoardLists } from '../../lib/trello'
import { fetchFigmaFile, getFigmaFileId } from '../../lib/figma'

export default function GroupDetailModal({ group, trelloToken, onClose, onEdit, onOpenNotes, onOpenReview }) {
  const [tab, setTab] = useState('github')
  const [github, setGithub] = useState(null)
  const [atas, setAtas] = useState([])
  const [commits, setCommits] = useState([])
  const [issues, setIssues] = useState([])
  const [trelloLists, setTrelloLists] = useState([])
  const [trelloView, setTrelloView] = useState('kanban')
  const [figma, setFigma] = useState(null)
  const [loading, setLoading] = useState({ gh: false, tr: false, fig: false, commits: false })
  const sounds = useSounds()

  const parseMaybeJson = (val, fallback = []) => {
    if (Array.isArray(val)) return val
    try { return JSON.parse(val) } catch { return fallback }
  }
  const members = parseMaybeJson(group?.members)
  const tags = parseMaybeJson(group?.tags)

  const isPrivate = github?.error === 'unauthorized' || github?.private

  // Load github base info
  useEffect(() => {
    if (!group.github_repo) return
    let cancelled = false
    Promise.all([fetchRepoInfo(group.github_repo, group.github_token), fetchAtas(group.github_repo, group.github_token)])
      .then(([info, a]) => { if (!cancelled) { setGithub(info); setAtas(a) } })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(l => ({ ...l, gh: false })) })
    setLoading(l => ({ ...l, gh: true }))
    return () => { cancelled = true }
  }, [group.github_repo])

  // Load commits/issues when github tab active
  useEffect(() => {
    if (tab !== 'github' || !group.github_repo || commits.length > 0) return
    let cancelled = false
    Promise.all([fetchAllCommits(group.github_repo, 5, group.github_token), fetchIssues(group.github_repo, group.github_token)])
      .then(([c, i]) => { if (!cancelled) { setCommits(c); setIssues(i) } })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(l => ({ ...l, commits: false })) })
    setLoading(l => ({ ...l, commits: true }))
    return () => { cancelled = true }
  }, [tab, group.github_repo])

  // Load trello
  useEffect(() => {
    if (tab !== 'trello' || !group.trello_board_id || !trelloToken || trelloLists.length > 0) return
    let cancelled = false
    fetchBoardLists(trelloToken, group.trello_board_id)
      .then(data => { if (!cancelled) setTrelloLists(data) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(l => ({ ...l, tr: false })) })
    setLoading(l => ({ ...l, tr: true }))
    return () => { cancelled = true }
  }, [tab, group.trello_board_id, trelloToken])

  // Load figma
  useEffect(() => {
    if (tab !== 'figma' || !group.figma_url) return
    const figmaToken = localStorage.getItem('atelier_figma_token')
    if (!figmaToken || figma) return
    let cancelled = false
    fetchFigmaFile(group.figma_url, figmaToken)
      .then(data => { if (!cancelled) setFigma(data) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(l => ({ ...l, fig: false })) })
    setLoading(l => ({ ...l, fig: true }))
    return () => { cancelled = true }
  }, [tab, group.figma_url])

  const statusColor = group.status === 'active' ? '#5aab6e' : group.status === 'attention' ? '#c8922a' : 'var(--text-dim)'
  const statusLabel = group.status === 'active' ? 'ativo' : group.status === 'attention' ? 'atenção' : 'inativo'
  const barBg = group.status === 'active' ? 'linear-gradient(90deg, var(--red), var(--red-glow))' : group.status === 'attention' ? 'linear-gradient(90deg, #c8922a, #7a5010)' : 'var(--border)'

  const tabs = [
    'github',
    'trello',
    'atas',
    'integrantes',
    ...(group.figma_url ? ['figma'] : []),
  ]

  const btnStyle = {
    display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
    borderRadius: 'var(--radius)', fontFamily: 'var(--ff-mono)', fontSize: 11,
    letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer',
    background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)',
    transition: 'all var(--fast)',
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', zIndex: 300, display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end' }}
      onClick={e => e.target === e.currentTarget && onClose()}>

      {/* Slide-in panel, full height, wide */}
      <div style={{
        width: '100%', maxWidth: 780, height: '100%',
        background: 'var(--bg-card)', borderLeft: '1px solid var(--border-red)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        animation: 'slideInRight 0.22s ease',
      }}>

        {/* Top color bar */}
        <div style={{ height: 3, background: barBg, flexShrink: 0 }} />

        {/* Header */}
        <div style={{ padding: '20px 28px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <span style={{ fontFamily: 'var(--ff-disp)', fontSize: 26, letterSpacing: '0.04em', color: 'var(--text)' }}>{group.name}</span>
                {isPrivate && <Lock size={12} style={{ color: 'var(--amber)' }} />}
                {group.figma_url && <span style={{ color: '#a259ff', fontSize: 14 }}>◈</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor }} />
                <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: statusColor, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{statusLabel}</span>
                {group.description && <>
                  <span style={{ color: 'var(--border-bright)' }}>·</span>
                  <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{group.description}</span>
                </>}
                {group.stage && <>
                  <span style={{ color: 'var(--border-bright)' }}>·</span>
                  <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--text-dim)', padding: '1px 6px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--surface)' }}>{group.stage}</span>
                </>}
              </div>
            </div>
            <button onClick={onClose} style={{ color: 'var(--text-muted)', padding: 4, cursor: 'pointer', flexShrink: 0 }}><X size={16} /></button>
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 14 }}>
              {tags.map(tag => (
                <span key={tag} style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, padding: '2px 8px', border: '1px solid var(--border-red)', borderRadius: 'var(--radius)', color: 'var(--text-muted)', background: 'rgba(74,21,21,0.1)' }}>
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
            <button onClick={onOpenNotes} style={btnStyle}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--border-red)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}>
              <FileText size={12} /> anotações
            </button>
            <button onClick={onOpenReview} style={btnStyle}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--border-red)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}>
              <Monitor size={12} /> ⬡ ativar extensão
            </button>
            <button onClick={onEdit} style={{ ...btnStyle, color: 'var(--red)', borderColor: 'var(--border-red)', background: 'var(--red-dim)' }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.85' }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}>
              <Pencil size={12} /> editar grupo
            </button>
            {group.github_repo && (
              <a href={`https://github.com/${group.github_repo}`} target="_blank" rel="noopener"
                style={{ ...btnStyle, textDecoration: 'none' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--border-red)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}>
                <GitBranch size={12} /> github <ExternalLink size={9} />
              </a>
            )}
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
            {tabs.map(t => (
              <button key={t} onClick={() => { setTab(t); sounds.play('tab') }} style={{
                flex: 1, minWidth: 70, padding: '8px 0',
                fontFamily: 'var(--ff-mono)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase',
                color: tab === t ? 'var(--red)' : 'var(--text-dim)',
                borderBottom: tab === t ? '2px solid var(--red)' : '2px solid transparent',
                background: 'none', cursor: 'pointer',
              }}>{t}</button>
            ))}
          </div>
        </div>

        {/* Tab body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px' }}>

          {/* ── GITHUB ── */}
          {tab === 'github' && (
            <div>
              {isPrivate && !github?.lastCommit && (
                <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: '#c8922a', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Lock size={11} /> repo privado — adicione seu GitHub token nas configurações
                </div>
              )}
              {github?.language && (
                <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-muted)', marginBottom: 16 }}>
                  <span style={{ color: 'var(--text-dim)' }}>lang: </span>{github.language}
                  {github.stars > 0 && <span style={{ marginLeft: 14 }}>⭐ {github.stars}</span>}
                </div>
              )}

              {/* ── Stats cards ── */}
              {github && !github.error && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 18 }}>
                    {[
                      { label: 'stars',    val: github.stars    || 0, color: '#c8922a' },
                      { label: 'forks',    val: github.forks    || 0, color: 'var(--red)' },
                      { label: 'watchers', val: github.watchers || 0, color: '#5aab6e' },
                      { label: 'issues',   val: github.openIssues || 0, color: '#4a90e2' },
                    ].map(k => (
                      <div key={k.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '10px 12px', borderTop: `2px solid ${k.color}` }}>
                        <div style={{ fontFamily: 'var(--ff-disp)', fontSize: 20, color: k.color, lineHeight: 1 }}>{k.val}</div>
                        <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.18em', color: 'var(--text-dim)', textTransform: 'uppercase', marginTop: 3 }}>{k.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Metadados */}
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16, fontFamily: 'var(--ff-mono)', fontSize: 10 }}>
                    <span style={{ color: 'var(--text-dim)' }}>branch: <span style={{ color: 'var(--text-muted)' }}>{github.defaultBranch}</span></span>
                    <span style={{ color: 'var(--text-dim)' }}>criado: <span style={{ color: 'var(--text-muted)' }}>{timeAgo(github.createdAt)}</span></span>
                    <span style={{ color: 'var(--text-dim)' }}>push: <span style={{ color: 'var(--text-muted)' }}>{timeAgo(github.pushedAt)}</span></span>
                    <span style={{ color: 'var(--text-dim)' }}>tamanho: <span style={{ color: 'var(--text-muted)' }}>{github.size ? `${(github.size/1024).toFixed(1)}MB` : '—'}</span></span>
                  </div>

                  {/* Linguagens — barra horizontal */}
                  {github.languages?.length > 0 && (
                    <div style={{ marginBottom: 18 }}>
                      <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.25em', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 8 }}>// linguagens</div>
                      <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 8, gap: 1 }}>
                        {github.languages.map((l, i) => {
                          const langColors = { JavaScript: '#f7df1e', TypeScript: '#3178c6', Python: '#3572a5', HTML: '#e34c26', CSS: '#563d7c', Java: '#b07219', 'C#': '#178600', PHP: '#4f5d95', Go: '#00add8', Rust: '#dea584', default: 'var(--red)' }
                          const color = langColors[l.name] || langColors.default
                          return <div key={l.name} style={{ width: `${l.pct}%`, background: color, minWidth: l.pct > 0 ? 3 : 0 }} title={`${l.name}: ${l.pct}%`} />
                        })}
                      </div>
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        {github.languages.map((l, i) => {
                          const langColors = { JavaScript: '#f7df1e', TypeScript: '#3178c6', Python: '#3572a5', HTML: '#e34c26', CSS: '#563d7c', Java: '#b07219', 'C#': '#178600', PHP: '#4f5d95', Go: '#00add8', Rust: '#dea584', default: 'var(--red)' }
                          const color = langColors[l.name] || langColors.default
                          return (
                            <span key={l.name} style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
                              <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
                              {l.name} <span style={{ color: 'var(--text-dim)' }}>{l.pct}%</span>
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Contributors */}
                  {github.contributors?.length > 0 && (
                    <div style={{ marginBottom: 18 }}>
                      <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.25em', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 8 }}>// contributors</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {github.contributors.map(c => (
                          <a key={c.login} href={c.url} target="_blank" rel="noopener"
                            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', textDecoration: 'none' }}>
                            <img src={c.avatar} alt={c.login} style={{ width: 18, height: 18, borderRadius: '50%' }} />
                            <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--text-muted)' }}>{c.login}</span>
                            <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, color: 'var(--text-dim)' }}>{c.contributions}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Topics */}
                  {github.topics?.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 18 }}>
                      {github.topics.map(t => (
                        <span key={t} style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, padding: '2px 8px', background: 'rgba(74,144,226,0.1)', border: '1px solid rgba(74,144,226,0.3)', borderRadius: 'var(--radius)', color: '#4a90e2' }}>{t}</span>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Commits */}
              {loading.commits && <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-dim)', marginBottom: 10 }}>carregando commits_</div>}
              {(github?.recentCommits || commits).length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.25em', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 8 }}>// últimos commits</div>
                  {(github?.recentCommits || commits).map(c => (
                    <a key={c.sha} href={c.url} target="_blank" rel="noopener"
                      style={{ display: 'block', padding: '8px 0', borderBottom: '1px solid var(--border)', textDecoration: 'none' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 12, color: 'var(--text-sub)' }}>{c.message.substring(0, 70)}</div>
                      <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--text-dim)', marginTop: 3 }}>
                        <span style={{ color: 'var(--red)' }}>{c.sha}</span> · {c.author} · {timeAgo(c.date)}
                      </div>
                    </a>
                  ))}
                </div>
              )}

              {/* Issues */}
              {issues.length > 0 && (
                <div>
                  <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.25em', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 8 }}>// issues ({issues.length})</div>
                  {issues.map(i => (
                    <a key={i.id} href={i.html_url} target="_blank" rel="noopener"
                      style={{ display: 'block', padding: '6px 0', borderBottom: '1px solid var(--border)', fontFamily: 'var(--ff-mono)', fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none' }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
                      <span style={{ color: i.state === 'open' ? '#5aab6e' : 'var(--text-dim)' }}>#{i.number}</span> {i.title}
                    </a>
                  ))}
                </div>
              )}
              {!loading.commits && !loading.gh && !group.github_repo && (
                <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-dim)' }}>nenhum repositório vinculado — edite o grupo para adicionar</div>
              )}
            </div>
          )}

          {/* ── TRELLO ── */}
          {tab === 'trello' && (
            <div>
              {!trelloToken && <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: '#c8922a' }}>configure o token trello nas configurações</div>}
              {trelloToken && !group.trello_board_id && <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-dim)' }}>nenhum board vinculado — edite o grupo para vincular</div>}
              {loading.tr && <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-dim)' }}>carregando_</div>}

              {!loading.tr && trelloLists.length > 0 && (
                <>
                  {/* Header com stats + toggle de view */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {[
                        { label: 'listas', val: trelloLists.length, color: '#0079bf' },
                        { label: 'cards', val: trelloLists.reduce((a, l) => a + (l.cards?.length || 0), 0), color: 'var(--red)' },
                      ].map(k => (
                        <div key={k.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '8px 12px', borderTop: `2px solid ${k.color}`, minWidth: 80 }}>
                          <div style={{ fontFamily: 'var(--ff-disp)', fontSize: 20, color: k.color, lineHeight: 1 }}>{k.val}</div>
                          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.2em', color: 'var(--text-dim)', textTransform: 'uppercase', marginTop: 3 }}>{k.label}</div>
                        </div>
                      ))}
                    </div>
                    {/* Toggle lista / kanban */}
                    <div style={{ display: 'flex', gap: 3 }}>
                      {[['lista', <List size={13} />], ['kanban', <LayoutGrid size={13} />]].map(([v, icon]) => (
                        <button key={v} onClick={() => setTrelloView(v)} style={{
                          padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 5,
                          borderRadius: 'var(--radius)', fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '0.1em',
                          background: trelloView === v ? 'var(--surface)' : 'transparent',
                          color: trelloView === v ? 'var(--text)' : 'var(--text-dim)',
                          border: `1px solid ${trelloView === v ? 'var(--border-red)' : 'var(--border)'}`,
                          cursor: 'pointer',
                        }}>
                          {icon} {v}
                        </button>
                      ))}
                      <a href={`https://trello.com/b/${group.trello_board_id}`} target="_blank" rel="noopener"
                        style={{ padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 5, borderRadius: 'var(--radius)', fontFamily: 'var(--ff-mono)', fontSize: 10, background: 'transparent', color: '#0079bf', border: '1px solid var(--border)', textDecoration: 'none', letterSpacing: '0.08em' }}>
                        <ExternalLink size={11} /> abrir
                      </a>
                    </div>
                  </div>

                  {/* LISTA: vertical, cada lista empilhada */}
                  {trelloView === 'lista' && trelloLists.map(list => (
                    <div key={list.id} style={{ marginBottom: 20 }}>
                      <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '0.18em', color: 'var(--red)', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>// {list.name}</span>
                        <span style={{ color: 'var(--text-dim)' }}>{list.cards?.length || 0}</span>
                      </div>
                      {list.cards?.map(card => (
                        <a key={card.id} href={card.url} target="_blank" rel="noopener"
                          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', marginBottom: 4, borderBottom: '1px solid var(--border)', fontFamily: 'var(--ff-mono)', fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none', borderRadius: 4 }}
                          onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'var(--surface)' }}
                          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent' }}>
                          <span style={{ color: 'var(--text-dim)' }}>›</span>
                          <span style={{ flex: 1 }}>{card.name}</span>
                          {card.labels?.length > 0 && (
                            <div style={{ display: 'flex', gap: 3 }}>
                              {card.labels.slice(0, 2).map(l => (
                                <span key={l.id} style={{ width: 8, height: 8, borderRadius: '50%', background: l.color || '#888', flexShrink: 0 }} title={l.name} />
                              ))}
                            </div>
                          )}
                          {card.due && <span style={{ fontSize: 10, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{new Date(card.due).toLocaleDateString('pt-BR')}</span>}
                        </a>
                      ))}
                      {(list.cards?.length || 0) === 0 && <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--text-dim)', padding: '4px 8px' }}>lista vazia</div>}
                    </div>
                  ))}

                  {/* KANBAN: colunas horizontais com scroll no TOPO */}
                  {trelloView === 'kanban' && (
                    <div style={{ overflowX: 'auto', transform: 'rotateX(180deg)', paddingBottom: 4 }}>
                    <div style={{ display: 'flex', gap: 12, transform: 'rotateX(180deg)', paddingTop: 8 }}>
                      {trelloLists.map(list => (
                        <div key={list.id} style={{ minWidth: 200, maxWidth: 220, flexShrink: 0, background: 'var(--surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', padding: '10px 10px 12px' }}>
                          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.2em', color: 'var(--red)', textTransform: 'uppercase', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>{list.name}</span>
                            <span style={{ color: 'var(--text-dim)', background: 'var(--bg-card)', borderRadius: 10, padding: '1px 6px', border: '1px solid var(--border)', fontSize: 9 }}>{list.cards?.length || 0}</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {list.cards?.map(card => (
                              <a key={card.id} href={card.url} target="_blank" rel="noopener"
                                style={{ display: 'block', padding: '8px 10px', background: 'var(--bg-card)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-muted)', textDecoration: 'none', lineHeight: 1.4 }}
                                onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--border-red)' }}
                                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}>
                                {card.labels?.length > 0 && (
                                  <div style={{ display: 'flex', gap: 3, marginBottom: 5 }}>
                                    {card.labels.map(l => (
                                      <span key={l.id} style={{ height: 4, minWidth: 24, borderRadius: 2, background: l.color || '#888', display: 'block' }} title={l.name} />
                                    ))}
                                  </div>
                                )}
                                {card.name}
                                {card.due && (
                                  <div style={{ marginTop: 5, fontSize: 10, color: 'var(--text-dim)' }}>
                                    📅 {new Date(card.due).toLocaleDateString('pt-BR')}
                                  </div>
                                )}
                              </a>
                            ))}
                            {(list.cards?.length || 0) === 0 && (
                              <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--text-dim)', padding: '6px 4px', textAlign: 'center' }}>— vazio —</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── ATAS ── */}
          {tab === 'atas' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {atas.length === 0
                ? <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-dim)' }}>nenhuma ata em docs/atas/</div>
                : atas.map(a => (
                  <a key={a.name} href={a.url} target="_blank" rel="noopener"
                    style={{ fontFamily: 'var(--ff-mono)', fontSize: 12, color: 'var(--text-muted)', padding: '8px 12px', background: 'var(--surface)', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', border: '1px solid var(--border)' }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.borderColor = 'var(--border-red)' }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}>
                    <FileText size={12} /> {a.name}
                  </a>
                ))
              }
            </div>
          )}

          {/* ── INTEGRANTES ── */}
          {tab === 'integrantes' && (
            <div>
              {members.length === 0 ? (
                <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-dim)', marginBottom: 16 }}>
                  nenhum integrante cadastrado
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                  {members.map((m, idx) => (
                    <div key={m.id} style={{ padding: '12px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--red-dim)', border: '1px solid var(--border-red)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--ff-disp)', fontSize: 14, color: 'var(--red)', flexShrink: 0 }}>
                        {m.name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 13, color: 'var(--text-sub)', marginBottom: 2 }}>{m.name}</div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {m.role && <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.1em' }}>{m.role}</span>}
                          {m.contact && (
                            <a href={m.contact.includes('@') ? `mailto:${m.contact}` : m.contact} target="_blank" rel="noopener"
                              style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--red)', textDecoration: 'none' }}>{m.contact}</a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={onEdit} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
                borderRadius: 'var(--radius)', fontFamily: 'var(--ff-mono)', fontSize: 11,
                letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer',
                background: 'var(--red-dim)', border: '1px solid var(--border-red)', color: 'var(--red)',
              }}>
                <Pencil size={12} /> editar integrantes
              </button>
            </div>
          )}

          {tab === 'figma' && (() => {
            const embedUrl = group.figma_url
              ? `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(group.figma_url)}`
              : null
            const hasToken = !!localStorage.getItem('atelier_figma_token')
            return (
              <div>
                {/* Iframe embed — sempre disponível se tiver URL */}
                {embedUrl && (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.25em', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: '#a259ff' }}>◈</span> visualizar arquivo
                    </div>
                    <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-red)', background: '#1a1a1a' }}>
                      <iframe
                        src={embedUrl}
                        style={{ width: '100%', height: 480, border: 'none', display: 'block' }}
                        allowFullScreen
                        title="Figma Embed"
                      />
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <a href={group.figma_url} target="_blank" rel="noopener"
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 'var(--radius)', fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '0.08em', color: '#a259ff', border: '1px solid #a259ff40', textDecoration: 'none', background: 'rgba(162,89,255,0.06)' }}>
                        <ExternalLink size={11} /> abrir no figma
                      </a>
                    </div>
                  </div>
                )}

                {/* Dados da API (se tiver token) */}
                {!hasToken && !embedUrl && (
                  <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: '#c8922a' }}>configure o token do Figma nas configurações</div>
                )}
                {hasToken && loading.fig && <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-dim)' }}>carregando_</div>}
                {hasToken && figma && (
                  <div>
                    <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.25em', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 8 }}>// detalhes do arquivo</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 10 }}>
                      <div>
                        <div style={{ fontFamily: 'var(--ff-disp)', fontSize: 15, color: '#a259ff', marginBottom: 3 }}>◈ {figma.name}</div>
                        <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--text-dim)' }}>
                          modificado {timeAgo(figma.lastModified)} · v{figma.version}
                        </div>
                      </div>
                    </div>

                    {figma.pages?.length > 0 && (
                      <div>
                        <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.25em', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 8 }}>
                          páginas ({figma.pages.length})
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {figma.pages.map((p, i) => {
                            const fileId = getFigmaFileId(group.figma_url)
                            const nodeId = p.id.replace(':', '-')
                            const pageUrl = `https://www.figma.com/file/${fileId}?node-id=${nodeId}`
                            return (
                              <a key={p.id} href={pageUrl} target="_blank" rel="noopener"
                                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', textDecoration: 'none', transition: 'all 0.15s' }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = '#a259ff'; e.currentTarget.style.background = 'rgba(162,89,255,0.06)' }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface)' }}>
                                <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: '#a259ff80', minWidth: 16 }}>{i + 1}</span>
                                <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 12, color: 'var(--text-muted)', flex: 1 }}>{p.name}</span>
                                <ExternalLink size={11} style={{ color: '#a259ff60', flexShrink: 0 }} />
                              </a>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })()}
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
