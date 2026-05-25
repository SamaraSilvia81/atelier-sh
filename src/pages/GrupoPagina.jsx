import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { fetchRepoInfo, fetchAtas, fetchAllCommits, fetchIssues, timeAgo } from '../lib/github'
import { fetchBoardLists } from '../lib/trello'
import { fetchFigmaFile, getFigmaFileId } from '../lib/figma'
import {
  ChevronLeft, Pencil, FileText, Monitor, GitBranch, LayoutList,
  Lock, Users, ExternalLink, LayoutGrid, List, Frame
} from 'lucide-react'
import GroupModal    from '../components/groups/GroupModal'
import NotesPanel   from '../components/notes/NotesPanel'
import AvaliacaoTab from '../components/groups/AvaliacaoTab'

// ─── Página solo do grupo ──────────────────────────────────────────────────
export default function GrupoPagina({ org, trelloToken, isAdmin }) {
  const { id }     = useParams()
  const navigate   = useNavigate()
  const { user }   = useAuth()

  const [group,    setGroup]    = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [tab,      setTab]      = useState('github')
  const [editando, setEditando] = useState(false)

  // dados das tabs
  const [github,      setGithub]      = useState(null)
  const [atas,        setAtas]        = useState([])
  const [commits,     setCommits]     = useState([])
  const [issues,      setIssues]      = useState([])
  const [trelloLists, setTrelloLists] = useState([])
  const [trelloView,  setTrelloView]  = useState('kanban')
  const [figma,       setFigma]       = useState(null)
  const [loadingTab,  setLoadingTab]  = useState({})

  const parseMaybeJson = (val, fallback = []) => {
    if (Array.isArray(val)) return val
    try { return JSON.parse(val) } catch { return fallback }
  }

  // Buscar grupo pelo id
  useEffect(() => {
    if (!id) return
    setLoading(true)
    supabase.from('groups').select('*').eq('id', id).single()
      .then(({ data }) => { setGroup(data); setLoading(false) })
  }, [id])

  // Carregar github ao montar ou trocar grupo
  useEffect(() => {
    if (!group?.github_repo) return
    let cancelled = false
    setLoadingTab(l => ({ ...l, gh: true }))
    Promise.all([
      fetchRepoInfo(group.github_repo, group.github_token),
      fetchAtas(group.github_repo, group.github_token),
    ]).then(([info, a]) => {
      if (!cancelled) { setGithub(info); setAtas(a) }
    }).catch(() => {}).finally(() => {
      if (!cancelled) setLoadingTab(l => ({ ...l, gh: false }))
    })
    return () => { cancelled = true }
  }, [group?.github_repo])

  // Commits e issues ao entrar na tab github
  useEffect(() => {
    if (tab !== 'github' || !group?.github_repo || commits.length > 0) return
    let cancelled = false
    setLoadingTab(l => ({ ...l, commits: true }))
    Promise.all([
      fetchAllCommits(group.github_repo, 5, group.github_token),
      fetchIssues(group.github_repo, group.github_token),
    ]).then(([c, i]) => {
      if (!cancelled) { setCommits(c); setIssues(i) }
    }).catch(() => {}).finally(() => {
      if (!cancelled) setLoadingTab(l => ({ ...l, commits: false }))
    })
    return () => { cancelled = true }
  }, [tab, group?.github_repo])

  // Trello
  useEffect(() => {
    if (tab !== 'trello' || !group?.trello_board_id || !trelloToken || trelloLists.length > 0) return
    let cancelled = false
    setLoadingTab(l => ({ ...l, tr: true }))
    fetchBoardLists(trelloToken, group.trello_board_id)
      .then(data => { if (!cancelled) setTrelloLists(data) })
      .catch(() => {}).finally(() => {
        if (!cancelled) setLoadingTab(l => ({ ...l, tr: false }))
      })
    return () => { cancelled = true }
  }, [tab, group?.trello_board_id, trelloToken])

  // Figma
  useEffect(() => {
    if (tab !== 'figma' || !group?.figma_url) return
    const figmaToken = localStorage.getItem('atelier_figma_token')
    if (!figmaToken || figma) return
    let cancelled = false
    setLoadingTab(l => ({ ...l, fig: true }))
    fetchFigmaFile(group.figma_url, figmaToken)
      .then(data => { if (!cancelled) setFigma(data) })
      .catch(() => {}).finally(() => {
        if (!cancelled) setLoadingTab(l => ({ ...l, fig: false }))
      })
    return () => { cancelled = true }
  }, [tab, group?.figma_url])

  if (loading) return (
    <div style={{ padding: 48, fontFamily: 'var(--ff-mono)', fontSize: 12, color: 'var(--text-dim)', letterSpacing: '0.2em' }}>
      carregando_
    </div>
  )

  if (!group) return (
    <div style={{ padding: 48, fontFamily: 'var(--ff-mono)', fontSize: 12, color: 'var(--text-dim)' }}>
      grupo não encontrado
    </div>
  )

  const members     = parseMaybeJson(group.members)
  const tags        = parseMaybeJson(group.tags)
  const statusColor = group.status === 'active' ? '#5aab6e' : group.status === 'attention' ? '#c8922a' : 'var(--text-dim)'
  const statusLabel = group.status === 'active' ? 'ativo' : group.status === 'attention' ? 'atenção' : 'inativo'
  const isPrivate   = github?.error === 'unauthorized' || github?.private
  const barBg       = group.status === 'active'
    ? 'linear-gradient(90deg, var(--red), var(--red-glow))'
    : group.status === 'attention' ? 'linear-gradient(90deg, #c8922a, #7a5010)' : 'var(--border)'

  const tabs = [
    'github', 'trello', 'atas', 'integrantes', 'anotacoes', 'avaliacao',
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

      {/* Barra de cor do status no topo */}
      <div style={{ height: 3, background: barBg, flexShrink: 0 }} />

      {/* Header */}
      <div style={{ padding: '16px 32px 0', borderBottom: '1px solid var(--border)', flexShrink: 0, background: 'var(--bg-card)' }}>
        {/* Voltar */}
        <button onClick={() => navigate(-1)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '0.15em', color: 'var(--text-dim)', textTransform: 'uppercase', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 12 }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}>
          <ChevronLeft size={13} /> grupos
        </button>

        {/* Nome e status */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span style={{ fontFamily: 'var(--ff-disp)', fontSize: 28, letterSpacing: '0.04em', color: 'var(--text)' }}>
                {group.name}
              </span>
              {isPrivate && <Lock size={13} style={{ color: 'var(--amber)' }} />}
              {group.figma_url && <span style={{ color: '#a259ff', fontSize: 14 }}>◈</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor }} />
              <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: statusColor, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{statusLabel}</span>
              {group.description && <>
                <span style={{ color: 'var(--border-bright)' }}>·</span>
                <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>{group.description}</span>
              </>}
              {members.length > 0 && <>
                <span style={{ color: 'var(--border-bright)' }}>·</span>
                <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Users size={10} /> {members.length} integrante{members.length !== 1 ? 's' : ''}
                </span>
              </>}
            </div>
          </div>

          {/* Ações */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {isAdmin && (
              <button onClick={() => setEditando(true)} style={{ ...btnStyle, color: 'var(--red)', borderColor: 'var(--border-red)', background: 'var(--red-dim)' }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                <Pencil size={12} /> editar grupo
              </button>
            )}
            {group.github_repo && (
              <a href={`https://github.com/${group.github_repo}`} target="_blank" rel="noopener"
                style={{ ...btnStyle, textDecoration: 'none' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--border-red)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}>
                <GitBranch size={12} /> github <ExternalLink size={9} />
              </a>
            )}
          </div>
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
            {tags.map(tag => (
              <span key={tag} style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, padding: '2px 8px', border: '1px solid var(--border-red)', borderRadius: 'var(--radius)', color: 'var(--text-muted)', background: 'rgba(74,21,21,0.1)' }}>
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid transparent', overflowX: 'auto', marginBottom: -1 }}>
          {tabs.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, minWidth: 80, padding: '10px 0',
              fontFamily: 'var(--ff-mono)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase',
              color: tab === t ? 'var(--red)' : 'var(--text-dim)',
              borderBottom: tab === t ? '2px solid var(--red)' : '2px solid transparent',
              background: 'none', cursor: 'pointer',
            }}>{t}</button>
          ))}
        </div>
      </div>

      {/* Conteúdo da tab */}
      <div style={{ flex: 1, overflowY: (tab === 'avaliacao' || tab === 'anotacoes') ? 'hidden' : 'auto', padding: (tab === 'avaliacao' || tab === 'anotacoes') ? 0 : '24px 32px' }}>

        {/* ── GITHUB ── */}
        {tab === 'github' && (
          <div>
            {isPrivate && !github?.lastCommit && (
              <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: '#c8922a', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Lock size={11} /> repo privado — adicione seu GitHub token nas configurações
              </div>
            )}
            {!group.github_repo && (
              <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-dim)' }}>
                nenhum repositório vinculado — edite o grupo para adicionar
              </div>
            )}
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
                {github.languages?.length > 0 && (
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.25em', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 8 }}>// linguagens</div>
                    <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 8, gap: 1 }}>
                      {github.languages.map(l => {
                        const langColors = { JavaScript: '#f7df1e', TypeScript: '#3178c6', Python: '#3572a5', HTML: '#e34c26', CSS: '#563d7c', default: 'var(--red)' }
                        return <div key={l.name} style={{ width: `${l.pct}%`, background: langColors[l.name] || langColors.default, minWidth: l.pct > 0 ? 3 : 0 }} title={`${l.name}: ${l.pct}%`} />
                      })}
                    </div>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      {github.languages.map(l => {
                        const langColors = { JavaScript: '#f7df1e', TypeScript: '#3178c6', Python: '#3572a5', HTML: '#e34c26', CSS: '#563d7c', default: 'var(--red)' }
                        return (
                          <span key={l.name} style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--text-muted)' }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: langColors[l.name] || langColors.default }} />
                            {l.name} <span style={{ color: 'var(--text-dim)' }}>{l.pct}%</span>
                          </span>
                        )
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
            {(github?.recentCommits || commits).length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.25em', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 8 }}>// últimos commits</div>
                {(github?.recentCommits || commits).map(c => (
                  <a key={c.sha} href={c.url} target="_blank" rel="noopener"
                    style={{ display: 'block', padding: '8px 0', borderBottom: '1px solid var(--border)', textDecoration: 'none' }}>
                    <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 12, color: 'var(--text-sub)' }}>{c.message?.substring(0, 80)}</div>
                    <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--text-dim)', marginTop: 3 }}>
                      <span style={{ color: 'var(--red)' }}>{c.sha}</span> · {c.author} · {timeAgo(c.date)}
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TRELLO ── */}
        {tab === 'trello' && (
          <div>
            {!trelloToken && <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: '#c8922a' }}>configure o token trello nas configurações</div>}
            {trelloToken && !group.trello_board_id && <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-dim)' }}>nenhum board vinculado — edite o grupo para vincular</div>}
            {loadingTab.tr && <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-dim)' }}>carregando_</div>}
            {!loadingTab.tr && trelloLists.length > 0 && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[{ label: 'listas', val: trelloLists.length, color: '#0079bf' }, { label: 'cards', val: trelloLists.reduce((a, l) => a + (l.cards?.length || 0), 0), color: 'var(--red)' }].map(k => (
                      <div key={k.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '8px 12px', borderTop: `2px solid ${k.color}`, minWidth: 80 }}>
                        <div style={{ fontFamily: 'var(--ff-disp)', fontSize: 20, color: k.color, lineHeight: 1 }}>{k.val}</div>
                        <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.2em', color: 'var(--text-dim)', textTransform: 'uppercase', marginTop: 3 }}>{k.label}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 3 }}>
                    {[['lista', <List size={13} />], ['kanban', <LayoutGrid size={13} />]].map(([v, icon]) => (
                      <button key={v} onClick={() => setTrelloView(v)} style={{ padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 5, borderRadius: 'var(--radius)', fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '0.1em', background: trelloView === v ? 'var(--surface)' : 'transparent', color: trelloView === v ? 'var(--text)' : 'var(--text-dim)', border: `1px solid ${trelloView === v ? 'var(--border-red)' : 'var(--border)'}`, cursor: 'pointer' }}>
                        {icon} {v}
                      </button>
                    ))}
                    <a href={`https://trello.com/b/${group.trello_board_id}`} target="_blank" rel="noopener"
                      style={{ padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 5, borderRadius: 'var(--radius)', fontFamily: 'var(--ff-mono)', fontSize: 10, background: 'transparent', color: '#0079bf', border: '1px solid var(--border)', textDecoration: 'none' }}>
                      <ExternalLink size={11} /> abrir
                    </a>
                  </div>
                </div>
                {trelloView === 'lista' && trelloLists.map(list => (
                  <div key={list.id} style={{ marginBottom: 20 }}>
                    <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '0.18em', color: 'var(--red)', textTransform: 'uppercase', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>// {list.name}</span><span style={{ color: 'var(--text-dim)' }}>{list.cards?.length || 0}</span>
                    </div>
                    {list.cards?.map(card => (
                      <a key={card.id} href={card.url} target="_blank" rel="noopener"
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', marginBottom: 4, borderBottom: '1px solid var(--border)', fontFamily: 'var(--ff-mono)', fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none', borderRadius: 4 }}>
                        <span style={{ color: 'var(--text-dim)' }}>›</span>
                        <span style={{ flex: 1 }}>{card.name}</span>
                        {card.due && <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{new Date(card.due).toLocaleDateString('pt-BR')}</span>}
                      </a>
                    ))}
                    {(list.cards?.length || 0) === 0 && <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--text-dim)', padding: '4px 8px' }}>lista vazia</div>}
                  </div>
                ))}
                {trelloView === 'kanban' && (
                  <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
                    {trelloLists.map(list => (
                      <div key={list.id} style={{ minWidth: 220, flexShrink: 0, background: 'var(--surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', padding: '10px 10px 12px' }}>
                        <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.2em', color: 'var(--red)', textTransform: 'uppercase', marginBottom: 10, display: 'flex', justifyContent: 'space-between' }}>
                          <span>{list.name}</span>
                          <span style={{ color: 'var(--text-dim)', background: 'var(--bg-card)', borderRadius: 10, padding: '1px 6px', border: '1px solid var(--border)' }}>{list.cards?.length || 0}</span>
                        </div>
                        {list.cards?.map(card => (
                          <a key={card.id} href={card.url} target="_blank" rel="noopener"
                            style={{ display: 'block', padding: '8px 10px', marginBottom: 6, background: 'var(--bg-card)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-muted)', textDecoration: 'none', lineHeight: 1.4 }}>
                            {card.name}
                          </a>
                        ))}
                        {(list.cards?.length || 0) === 0 && <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--text-dim)', padding: '6px 4px', textAlign: 'center' }}>— vazio —</div>}
                      </div>
                    ))}
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
                  style={{ fontFamily: 'var(--ff-mono)', fontSize: 12, color: 'var(--text-muted)', padding: '8px 12px', background: 'var(--surface)', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', border: '1px solid var(--border)' }}>
                  <FileText size={12} /> {a.name}
                </a>
              ))
            }
          </div>
        )}

        {/* ── INTEGRANTES ── */}
        {tab === 'integrantes' && (
          <div>
            {members.length === 0
              ? <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-dim)', marginBottom: 16 }}>nenhum integrante cadastrado</div>
              : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                  {members.map(m => (
                    <div key={m.id} style={{ padding: '12px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--red-dim)', border: '1px solid var(--border-red)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--ff-disp)', fontSize: 14, color: 'var(--red)', flexShrink: 0 }}>
                        {m.name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 13, color: 'var(--text-sub)', marginBottom: 2 }}>{m.name}</div>
                        {m.role && <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--text-dim)' }}>{m.role}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )
            }
          </div>
        )}

        {/* ── ANOTAÇÕES (inline) ── */}
        {tab === 'anotacoes' && (
          <div style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <NotesPanel group={group} orgId={org?.id} onClose={() => setTab('github')} inline />
          </div>
        )}

        {/* ── AVALIAÇÃO ── */}
        {tab === 'avaliacao' && (
          <div style={{ height: '100%', overflow: 'hidden' }}>
            <AvaliacaoTab group={group} />
          </div>
        )}

        {/* ── FIGMA ── */}
        {tab === 'figma' && group.figma_url && (
          <div>
            <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-red)', background: '#1a1a1a' }}>
              <iframe src={`https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(group.figma_url)}`}
                style={{ width: '100%', height: 520, border: 'none', display: 'block' }} allowFullScreen title="Figma" />
            </div>
            <div style={{ marginTop: 8 }}>
              <a href={group.figma_url} target="_blank" rel="noopener"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 'var(--radius)', fontFamily: 'var(--ff-mono)', fontSize: 10, color: '#a259ff', border: '1px solid #a259ff40', textDecoration: 'none' }}>
                <ExternalLink size={11} /> abrir no figma
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Modal de edição */}
      {editando && (
        <GroupModal
          group={group}
          trelloToken={trelloToken}
          trelloWorkspaceId={org?.trello_workspace_id}
          onClose={() => setEditando(false)}
          onSave={async (payload) => {
            const { data } = await supabase.from('groups').update(payload).eq('id', group.id).select().single()
            if (data) setGroup(data)
            setEditando(false)
          }}
        />
      )}
    </div>
  )
}
