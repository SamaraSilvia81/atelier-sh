import { useState } from 'react'
import { useActivityLog, actionLabel, entityLabel } from '../hooks/useActivityLog'
import {
  Activity, RefreshCw, ChevronDown,
  FolderKanban, FileText, Users, Building2,
  Layers, Key, Mail, Filter
} from 'lucide-react'

// ── utilitários ──────────────────────────────────────────────────────────────

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'agora'
  if (m < 60) return `${m}m atrás`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h atrás`
  const d = Math.floor(h / 24)
  if (d < 7)  return `${d}d atrás`
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function fullDate(dateStr) {
  return new Date(dateStr).toLocaleString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const ENTITY_ICONS = {
  organization: Building2,
  project:      FolderKanban,
  group:        Layers,
  note:         FileText,
  member:       Users,
  invite:       Mail,
  permission:   Key,
}

const ACTION_COLORS = {
  created:            'var(--green, #5aab6e)',
  updated:            'var(--text-muted)',
  deleted:            'var(--red)',
  invited:            'var(--amber)',
  role_changed:       'var(--amber)',
  note_edited:        'var(--text-muted)',
  permission_changed: 'var(--amber)',
  status_changed:     'var(--text-muted)',
  visibility_changed: 'var(--amber)',
}

const ENTITY_FILTER_OPTIONS = [
  { val: null,           label: 'tudo' },
  { val: 'organization', label: 'orgs' },
  { val: 'project',      label: 'projetos' },
  { val: 'group',        label: 'grupos' },
  { val: 'note',         label: 'notas' },
  { val: 'member',       label: 'membros' },
]

// ── componente de linha de log ───────────────────────────────────────────────

function LogRow({ log }) {
  const [expanded, setExpanded] = useState(false)
  const Icon = ENTITY_ICONS[log.entity_type] || Activity
  const actionColor = ACTION_COLORS[log.action] || 'var(--text-muted)'
  const hasMeta = log.meta && Object.keys(log.meta).length > 0
  const mono = { fontFamily: 'var(--ff-mono)' }

  return (
    <div style={{
      borderBottom: '1px solid var(--border)',
      padding: '12px 0',
      transition: 'background var(--fast)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>

        {/* ícone entidade */}
        <div style={{
          width: 28, height: 28, borderRadius: 'var(--radius)',
          background: 'var(--surface)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, marginTop: 1,
        }}>
          <Icon size={13} style={{ color: actionColor }} />
        </div>

        {/* conteúdo principal */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {/* quem fez */}
            <span style={{ ...mono, fontSize: 11, color: 'var(--text)', fontWeight: 500 }}>
              {log.profiles?.name || 'sistema'}
            </span>
            {/* ação */}
            <span style={{ ...mono, fontSize: 11, color: actionColor }}>
              {actionLabel(log.action)}
            </span>
            {/* tipo de entidade */}
            <span style={{ ...mono, fontSize: 10, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {entityLabel(log.entity_type)}
            </span>
            {/* nome do recurso */}
            {log.entity_name && (
              <span style={{ ...mono, fontSize: 11, color: 'var(--text-sub)',
                maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
              }}>
                "{log.entity_name}"
              </span>
            )}
          </div>

          {/* meta expandida */}
          {hasMeta && expanded && (
            <div style={{
              marginTop: 8, padding: '8px 10px',
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', fontSize: 10,
              ...mono, color: 'var(--text-dim)', lineHeight: 1.7,
            }}>
              {Object.entries(log.meta).map(([k, v]) => (
                <div key={k}>
                  <span style={{ color: 'var(--red)', marginRight: 6 }}>{k}:</span>
                  <span>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* direita: hora + toggle meta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <span
            title={fullDate(log.created_at)}
            style={{ ...mono, fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.1em', cursor: 'default' }}
          >
            {timeAgo(log.created_at)}
          </span>
          {hasMeta && (
            <button
              onClick={() => setExpanded(e => !e)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-dim)', display: 'flex', alignItems: 'center', padding: 2,
                transition: 'transform var(--fast)',
                transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              }}
              title="ver detalhes"
            >
              <ChevronDown size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── página principal ─────────────────────────────────────────────────────────

export default function ActivityLog({ org }) {
  const [entityFilter, setEntityFilter] = useState(null)

  const { logs, loading, hasMore, loadMore, unavailable, refresh } = useActivityLog(org?.id, {
    limit: 40,
    entityType: entityFilter,
  })

  const mono = { fontFamily: 'var(--ff-mono)' }

  if (!org) return (
    <div className="page-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ ...mono, fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.2em' }}>
        selecione uma organização
      </div>
    </div>
  )

  return (
    <div className="page-wrap">

      {/* header */}
      <header style={{
        borderBottom: '1px solid var(--border)', padding: '14px 32px 14px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 90,
        background: 'var(--header-bg, var(--bg))', backdropFilter: 'blur(12px)',
      }}>
        <div style={{ width: 44 }} className="mobile-placeholder" />
        <div style={{ ...mono, fontSize: 11, letterSpacing: '0.2em', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'center', flex: 1 }}>
          <span style={{ color: 'var(--text-sub)' }}>{org.name}</span>
          <span style={{ margin: '0 8px', color: 'var(--text-dim)' }}>/</span>
          <span>log de atividade</span>
        </div>
        <button
          onClick={refresh}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', padding: 4 }}
          title="Atualizar"
        >
          <RefreshCw size={14} />
        </button>
      </header>

      {/* hero */}
      <section style={{
        padding: '48px var(--content-pad, 32px) 32px',
        borderBottom: '1px solid var(--border)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: 0, right: 0, width: '35%', height: '100%', background: 'radial-gradient(ellipse at right, var(--glow-red, transparent), transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ ...mono, fontSize: 10, letterSpacing: '0.44em', color: 'var(--red)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <span style={{ display: 'inline-block', width: 18, height: 1, background: 'var(--red)' }} />
          auditoria
        </div>

        <h1 style={{ fontFamily: 'var(--ff-disp)', fontSize: 'clamp(2rem, 4vw, 3.4rem)', lineHeight: 0.92, letterSpacing: '0.02em', color: 'var(--text)', marginBottom: 24 }}>
          HISTÓRICO <span style={{ color: 'var(--red)' }}>DE</span><br />ATIVIDADES
        </h1>

        {/* filtros de entidade */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <Filter size={11} style={{ color: 'var(--text-dim)' }} />
          {ENTITY_FILTER_OPTIONS.map(opt => (
            <button
              key={String(opt.val)}
              onClick={() => setEntityFilter(opt.val)}
              data-sound-tab
              style={{
                ...mono, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase',
                padding: '4px 10px', borderRadius: 'var(--radius)',
                border: entityFilter === opt.val ? '1px solid var(--border-red)' : '1px solid var(--border)',
                background: entityFilter === opt.val ? 'var(--red-dim)' : 'transparent',
                color: entityFilter === opt.val ? 'var(--text)' : 'var(--text-dim)',
                cursor: 'pointer', transition: 'all var(--fast)',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      {/* log list */}
      <section style={{ padding: '24px var(--content-pad, 32px) 48px', flex: 1 }}>
        {loading && logs.length === 0 ? (
          <div style={{ ...mono, fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.2em' }}>carregando_</div>
        ) : unavailable ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '60px 0', textAlign: 'center' }}>
            <Activity size={32} style={{ color: 'var(--border-acc)' }} />
            <div style={{ ...mono, fontSize: 11, letterSpacing: '0.15em', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              log não disponível
            </div>
            <div style={{ ...mono, fontSize: 10, color: 'var(--text-dim)', maxWidth: 340, lineHeight: 1.7 }}>
              Execute a migration <span style={{ color: 'var(--red)' }}>supabase_migration_v10_fix.sql</span> no SQL Editor do Supabase para ativar o histórico de atividades.
            </div>
          </div>
        ) : logs.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '60px 0', textAlign: 'center' }}>
            <Activity size={32} style={{ color: 'var(--border-acc)' }} />
            <div style={{ ...mono, fontSize: 11, letterSpacing: '0.2em', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              nenhuma atividade registrada
            </div>
          </div>
        ) : (
          <>
            {/* agrupamento por data */}
            {groupByDate(logs).map(({ date, items }) => (
              <div key={date} style={{ marginBottom: 28 }}>
                <div style={{
                  ...mono, fontSize: 9, letterSpacing: '0.28em', textTransform: 'uppercase',
                  color: 'var(--text-dim)', marginBottom: 4, paddingBottom: 6,
                  borderBottom: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <span style={{ display: 'inline-block', width: 12, height: 1, background: 'var(--red)' }} />
                  {date}
                </div>
                {items.map(log => <LogRow key={log.id} log={log} />)}
              </div>
            ))}

            {/* load more */}
            {hasMore && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24 }}>
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="btn btn-ghost"
                  style={{ ...mono, fontSize: 10, opacity: loading ? 0.5 : 1 }}
                >
                  {loading ? 'carregando...' : 'carregar mais'}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}

// agrupa logs por data legível
function groupByDate(logs) {
  const groups = {}
  const today = new Date().toDateString()
  const yesterday = new Date(Date.now() - 86400000).toDateString()

  for (const log of logs) {
    const d = new Date(log.created_at)
    const key = d.toDateString() === today
      ? 'hoje'
      : d.toDateString() === yesterday
      ? 'ontem'
      : d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
    if (!groups[key]) groups[key] = []
    groups[key].push(log)
  }

  return Object.entries(groups).map(([date, items]) => ({ date, items }))
}
