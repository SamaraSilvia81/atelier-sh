import { useState, useRef } from 'react'
import { ChevronDown, ChevronRight, AlertTriangle, FileText, X,
  Plus, Trash2, Pencil, Check, User, Users, Info } from 'lucide-react'
import { useAvaliacao }            from '../../hooks/useAvaliacao'
import { useAvaliacaoIndividual,
         FATORES, CRITERIOS_COMPORTAMENTAIS } from '../../hooks/useAvaliacaoIndividual'
import { useAvaliacaoCrud }        from '../../hooks/useAvaliacaoCrud'
import { useNotes }                from '../../hooks/useNotes'
import { DISCIPLINAS, NIVEIS_AVALIACAO, PENALIZACOES_ATRASO } from '../../data/criterios'
import NoteEditor                  from '../notes/NoteEditor'

// ─── Helpers ─────────────────────────────────────────────────
const pct = (v, m) => m > 0 ? Math.min(100, (v / m) * 100) : 0
const statusCor = (n, m) => {
  if (n === null || n === undefined) return 'var(--border)'
  const p = pct(n, m)
  return p >= 80 ? '#5aab6e' : p >= 50 ? '#c8922a' : 'var(--red)'
}
const mono = { fontFamily: 'var(--ff-mono)' }

function calcNota(notaMax, nivelId, atrasoId) {
  const nivel  = NIVEIS_AVALIACAO.find(n => n.id === nivelId)
  const atraso = PENALIZACOES_ATRASO.find(a => a.id === atrasoId)
  if (!nivel) return null
  if (atraso?.id === 'nao_entregou') return 0
  const base = notaMax * nivel.pct
  const pena = notaMax * (atraso?.desconto || 0)
  return Math.max(0, parseFloat((base - pena).toFixed(2)))
}

// ─── Barra de progresso ───────────────────────────────────────
function Barra({ valor, max, cor, height = 4 }) {
  return (
    <div style={{ height, borderRadius: 2, background: 'var(--border)', overflow: 'hidden', flex: 1, minWidth: 60 }}>
      <div style={{ height: '100%', width: `${pct(valor, max)}%`, background: cor, borderRadius: 2, transition: 'width 0.3s ease' }} />
    </div>
  )
}

// ─── Painel de Regras ─────────────────────────────────────────
function PainelRegras({ aberto, onToggle }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
      <button type="button" onClick={onToggle} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', background: 'var(--surface)', cursor: 'pointer', border: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Info size={13} style={{ color: 'var(--text-dim)' }} />
          <span style={{ ...mono, fontSize: 10, letterSpacing: '0.18em', color: 'var(--text-dim)', textTransform: 'uppercase' }}>regras de avaliação</span>
        </div>
        {aberto ? <ChevronDown size={12} style={{ color: 'var(--text-dim)' }} /> : <ChevronRight size={12} style={{ color: 'var(--text-dim)' }} />}
      </button>

      {aberto && (
        <div style={{ padding: '14px 16px', display: 'flex', gap: 20, flexWrap: 'wrap', borderTop: '1px solid var(--border)' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ ...mono, fontSize: 9, letterSpacing: '0.25em', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 8 }}>// níveis de avaliação</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {NIVEIS_AVALIACAO.map(n => (
                <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: n.cor, display: 'inline-block', flexShrink: 0 }} />
                  <span style={{ flex: 1, ...mono, fontSize: 11, color: 'var(--text-muted)' }}>{n.label}</span>
                  <span style={{ ...mono, fontSize: 11, color: n.cor, fontWeight: 600 }}>{(n.pct * 100).toFixed(0)}%</span>
                  <span style={{ ...mono, fontSize: 10, color: 'var(--text-dim)' }}>da nota máx.</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ ...mono, fontSize: 9, letterSpacing: '0.25em', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 8 }}>// penalização por atraso</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {PENALIZACOES_ATRASO.map(a => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ flex: 1, ...mono, fontSize: 11, color: 'var(--text-muted)' }}>{a.label}</span>
                  <span style={{ ...mono, fontSize: 11, color: a.desconto > 0 ? '#c83232' : '#5aab6e', fontWeight: 600 }}>
                    {a.id === 'nao_entregou' ? 'zera' : a.desconto === 0 ? 'sem penalização' : `−${(a.desconto * 100).toFixed(0)}% da nota máx.`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Anotação vinculada ───────────────────────────────────────
function NotaVinculada({ groupId, orgId, label, onFechar }) {
  const { notes, createNote, updateNote, loading } = useNotes(groupId, orgId)
  const [nota, setNota]       = useState(null)
  const [criando, setCriando] = useState(false)
  const [iniciado, setIniciado] = useState(false)

  if (!iniciado && !loading) {
    setIniciado(true)
    const ex = notes.find(n => n.title === label)
    if (ex) setNota(ex)
  }

  async function abrir() {
    const ex = notes.find(n => n.title === label)
    if (ex) { setNota(ex); return }
    setCriando(true)
    const { data } = await createNote({ title: label, content: '' })
    if (data) setNota(data)
    setCriando(false)
  }

  if (!nota) return (
    <button type="button" onClick={abrir} disabled={criando || loading}
      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 'var(--radius)', border: '1px dashed var(--border)', background: 'transparent', color: 'var(--text-dim)', ...mono, fontSize: 10, cursor: 'pointer' }}>
      <FileText size={11} /> {criando ? 'criando...' : 'anotação vinculada'}
    </button>
  )

  return (
    <div style={{ border: '1px solid var(--border-red)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', background: 'var(--red-dim)', borderBottom: '1px solid var(--border-red)' }}>
        <span style={{ ...mono, fontSize: 10, color: 'var(--red)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <FileText size={11} /> {nota.title}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ ...mono, fontSize: 9, color: 'var(--text-dim)' }}>›_ salvo automaticamente</span>
          <button type="button" onClick={onFechar} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', display: 'flex' }}><X size={13} /></button>
        </div>
      </div>
      <div style={{ minHeight: 140, maxHeight: 300, overflowY: 'auto' }}>
        <NoteEditor note={nota} onUpdate={(id, payload) => updateNote(id, payload)} />
      </div>
    </div>
  )
}

// ─── Critério Row — editável por completo ─────────────────────
function CriterioRow({
  cr, discId, faseNome, notaGrupo, nivelGrupo, atrasoGrupo, onSave,
  editMode, onRemoveCustom, onEditCustom, onEditBase,
  groupId, orgId,
  itensOverride, onSetItens,
  etapas, setEtapas,
  niveisCustom: niveis,   // lista customizável de níveis
}) {
  const niveisAtivos = niveis || NIVEIS_AVALIACAO
  const [detAberto,  setDetAberto]  = useState(false)
  const [notaAberta, setNotaAberta] = useState(false)
  const [editNome,   setEditNome]   = useState(false)
  const [editMax,    setEditMax]    = useState(false)
  const [nomeVal,    setNomeVal]    = useState(cr.nome)
  const [maxVal,     setMaxVal]     = useState(cr.max)
  const [nivelLocal, setNivelLocal] = useState(nivelGrupo(discId, cr.id))
  const [atrasoLocal,setAtrasoLocal]= useState(atrasoGrupo(discId, cr.id) || 'sem_atraso')
  // item editing
  const [editandoItem, setEditandoItem] = useState(null) // index sendo editado
  const [editItemVal,  setEditItemVal]  = useState('')
  const [novoItem,     setNovoItem]     = useState('')
  const [addingItem,   setAddingItem]   = useState(false)

  const itensAtivos = itensOverride ?? cr.itens ?? []

  const notaCalculada = calcNota(cr.max, nivelLocal, atrasoLocal)
  const notaAtual = notaGrupo(discId, cr.id)
  const nivelInfo  = niveisAtivos.find(n => n.id === nivelLocal)
  const atrasoInfo = PENALIZACOES_ATRASO.find(a => a.id === atrasoLocal)

  function salvarNivel(novoNivel, novoAtraso) {
    const n = calcNota(cr.max, novoNivel, novoAtraso)
    onSave(discId, faseNome, cr.id, cr.max, n, undefined, novoNivel, novoAtraso)
  }

  function confirmarEdicao() {
    setEditNome(false); setEditMax(false)
    if (cr.isCustom && onEditCustom) {
      onEditCustom(cr.dbId, { criterio_nome: nomeVal, nota_max: Number(maxVal) })
    } else if (!cr.isCustom && onEditBase) {
      onEditBase(discId, cr.id, nomeVal, Number(maxVal))
    }
  }

  // ── Funções de edição de itens ──
  function confirmarEditItem(idx) {
    const novos = itensAtivos.map((it, i) => i === idx ? editItemVal : it)
    onSetItens(cr.id, novos)
    setEditandoItem(null)
  }

  function removerItem(idx) {
    const novos = itensAtivos.filter((_, i) => i !== idx)
    onSetItens(cr.id, novos)
  }

  function adicionarItem() {
    if (!novoItem.trim()) return
    const novos = [...itensAtivos, novoItem.trim()]
    onSetItens(cr.id, novos)
    setNovoItem('')
    setAddingItem(false)
  }

  const cor = statusCor(notaCalculada ?? notaAtual, cr.max)

  return (
    <div style={{ borderTop: '1px solid var(--border)', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {cr.zeraSem && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, padding: '5px 10px', borderRadius: 'var(--radius)', background: 'rgba(200,50,50,0.08)', border: '1px solid rgba(200,50,50,0.2)', ...mono, fontSize: 10, color: '#c83232', lineHeight: 1.4 }}>
          <AlertTriangle size={11} style={{ flexShrink: 0, marginTop: 1 }} /> {cr.zeraSem}
        </div>
      )}

      {/* Linha principal */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" onClick={() => setDetAberto(v => !v)} style={{ color: 'var(--text-dim)', flexShrink: 0, padding: 2, background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
          {detAberto ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>

        {editMode && editNome ? (
          <input autoFocus value={nomeVal} onChange={e => setNomeVal(e.target.value)}
            onBlur={confirmarEdicao} onKeyDown={e => e.key === 'Enter' && confirmarEdicao()}
            style={{ flex: 1, ...mono, fontSize: 12, background: 'var(--surface)', border: '1px solid var(--border-red)', borderRadius: 'var(--radius)', padding: '3px 8px', color: 'var(--text)', outline: 'none' }} />
        ) : (
          <span
            onClick={() => editMode && setEditNome(true)}
            style={{ flex: 1, ...mono, fontSize: 12, color: 'var(--text-sub)', lineHeight: 1.4, cursor: editMode ? 'text' : 'default', minWidth: 120 }}>
            {nomeVal} {editMode && <Pencil size={9} style={{ color: 'var(--text-dim)', opacity: 0.4 }} />}
          </span>
        )}

        {editMode && editMax ? (
          <input autoFocus type="number" min={0} step={0.05} value={maxVal}
            onChange={e => setMaxVal(e.target.value)}
            onBlur={confirmarEdicao} onKeyDown={e => e.key === 'Enter' && confirmarEdicao()}
            style={{ width: 56, ...mono, fontSize: 11, background: 'var(--surface)', border: '1px solid var(--border-red)', borderRadius: 'var(--radius)', padding: '3px 6px', color: 'var(--text)', textAlign: 'center', outline: 'none' }} />
        ) : (
          <span onClick={() => editMode && setEditMax(true)}
            style={{ ...mono, fontSize: 10, color: editMode ? 'var(--red)' : 'var(--text-dim)', whiteSpace: 'nowrap', cursor: editMode ? 'pointer' : 'default', textDecoration: editMode ? 'underline dotted' : 'none' }}>
            / {String(maxVal).replace('.', ',')} pts
          </span>
        )}

        {/* Nota calculada ou manual */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {notaCalculada !== null ? (
            <span style={{ ...mono, fontSize: 14, color: cor, fontWeight: 700, minWidth: 36, textAlign: 'right' }}>
              {notaCalculada.toFixed(2).replace('.', ',')}
            </span>
          ) : (
            <input type="number" min={0} max={cr.max} step={0.05}
              defaultValue={notaAtual ?? ''}
              placeholder="0"
              style={{ width: 52, padding: '3px 5px', textAlign: 'center', fontSize: 12, ...mono, border: `1px solid ${cor}`, borderRadius: 'var(--radius)', background: 'var(--bg-card)', color: 'var(--text)' }}
              onChange={e => onSave(discId, faseNome, cr.id, cr.max, Number(e.target.value), undefined, null, atrasoLocal)}
            />
          )}
        </div>

        <button type="button" onClick={() => setNotaAberta(v => !v)} title="anotação vinculada"
          style={{ color: notaAberta ? 'var(--red)' : 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 2, flexShrink: 0 }}>
          <FileText size={13} />
        </button>

        {editMode && cr.isCustom && (
          <button type="button" onClick={() => onRemoveCustom(cr.dbId)}
            style={{ color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 2 }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}>
            <Trash2 size={12} />
          </button>
        )}
      </div>

      {/* Seletor de nível */}
      <div style={{ paddingLeft: 22, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {niveisAtivos.map(n => (
          <button key={n.id} type="button" onClick={() => { setNivelLocal(n.id); salvarNivel(n.id, atrasoLocal) }}
            title={n.label}
            style={{ padding: '3px 8px', borderRadius: 'var(--radius)', ...mono, fontSize: 10, cursor: 'pointer', background: nivelLocal === n.id ? `${n.cor}22` : 'var(--surface)', color: nivelLocal === n.id ? n.cor : 'var(--text-dim)', border: `1px solid ${nivelLocal === n.id ? n.cor : 'var(--border)'}`, transition: 'all 0.12s' }}>
            {n.display || n.label}
          </button>
        ))}

        <select value={atrasoLocal}
          onChange={e => { setAtrasoLocal(e.target.value); salvarNivel(nivelLocal, e.target.value) }}
          style={{ marginLeft: 8, padding: '3px 8px', borderRadius: 'var(--radius)', ...mono, fontSize: 10, background: atrasoLocal !== 'sem_atraso' ? 'rgba(200,50,50,0.08)' : 'var(--surface)', color: atrasoLocal !== 'sem_atraso' ? '#c83232' : 'var(--text-dim)', border: `1px solid ${atrasoLocal !== 'sem_atraso' ? 'rgba(200,50,50,0.3)' : 'var(--border)'}`, cursor: 'pointer', outline: 'none' }}>
          {PENALIZACOES_ATRASO.map(a => (
            <option key={a.id} value={a.id}>{a.id === 'sem_atraso' ? '⏱ atraso' : `⚠ ${a.label}`}</option>
          ))}
        </select>
      </div>

      {/* Preview da nota */}
      {nivelLocal && nivelLocal !== null && (
        <div style={{ paddingLeft: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, ...mono, fontSize: 10, color: 'var(--text-dim)' }}>
            <span style={{ color: nivelInfo?.cor }}>{nivelInfo?.emoji} {(nivelInfo?.pct * 100).toFixed(0)}%</span>
            <span>×</span>
            <span>{String(cr.max).replace('.', ',')} pts máx</span>
            {atrasoLocal !== 'sem_atraso' && atrasoInfo && (
              <>
                <span>−</span>
                <span style={{ color: '#c83232' }}>{(atrasoInfo.desconto * cr.max).toFixed(2).replace('.', ',')} pts atraso</span>
              </>
            )}
            <span>=</span>
            <span style={{ color: cor, fontWeight: 700 }}>{(notaCalculada ?? 0).toFixed(2).replace('.', ',')} pts</span>
          </div>
        </div>
      )}

      {/* Detalhes expandidos */}
      {detAberto && (
        <div style={{ paddingLeft: 22, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {/* Itens / checklist */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {itensAtivos.map((item, i) => {
              const itemKey = `${discId}-${cr.id}-item-${i}`
              const feito = etapas[itemKey] ?? false

              if (editMode && editandoItem === i) {
                return (
                  <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input autoFocus value={editItemVal} onChange={e => setEditItemVal(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') confirmarEditItem(i); if (e.key === 'Escape') setEditandoItem(null) }}
                      style={{ flex: 1, ...mono, fontSize: 10, padding: '4px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--border-red)', background: 'var(--surface)', color: 'var(--text)', outline: 'none' }} />
                    <button type="button" onClick={() => confirmarEditItem(i)} style={{ color: '#5aab6e', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}><Check size={12} /></button>
                    <button type="button" onClick={() => setEditandoItem(null)} style={{ color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}><X size={12} /></button>
                  </div>
                )
              }

              return (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                  <button type="button" onClick={() => setEtapas(p => ({ ...p, [itemKey]: !feito }))}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '5px 8px', borderRadius: 'var(--radius)', background: feito ? 'rgba(90,171,110,0.08)' : 'var(--surface)', border: `1px solid ${feito ? 'rgba(90,171,110,0.3)' : 'var(--border)'}`, cursor: 'pointer', textAlign: 'left', flex: 1 }}>
                    <div style={{ width: 16, height: 16, borderRadius: 3, border: `1.5px solid ${feito ? '#5aab6e' : 'var(--border)'}`, background: feito ? '#5aab6e' : 'transparent', flexShrink: 0, marginTop: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {feito && <Check size={10} style={{ color: '#fff' }} />}
                    </div>
                    <span style={{ ...mono, fontSize: 10, color: feito ? 'var(--text-sub)' : 'var(--text-dim)', lineHeight: 1.5 }}>{item}</span>
                  </button>
                  {editMode && (
                    <div style={{ display: 'flex', gap: 2, flexShrink: 0, paddingTop: 4 }}>
                      <button type="button" onClick={() => { setEditandoItem(i); setEditItemVal(item) }}
                        style={{ color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 2 }}
                        onMouseEnter={e => e.currentTarget.style.color = '#7F77DD'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}>
                        <Pencil size={10} />
                      </button>
                      <button type="button" onClick={() => removerItem(i)}
                        style={{ color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 2 }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}>
                        <Trash2 size={10} />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}

            {itensAtivos.length > 0 && (
              <div style={{ ...mono, fontSize: 9, color: 'var(--text-dim)', padding: '2px 4px' }}>
                {itensAtivos.filter((_, i) => etapas[`${discId}-${cr.id}-item-${i}`]).length} / {itensAtivos.length} etapas concluídas
              </div>
            )}

            {/* Adicionar item em editMode */}
            {editMode && (
              addingItem ? (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', paddingTop: 2 }}>
                  <input autoFocus value={novoItem} onChange={e => setNovoItem(e.target.value)}
                    placeholder="texto do item..."
                    onKeyDown={e => { if (e.key === 'Enter') adicionarItem(); if (e.key === 'Escape') { setAddingItem(false); setNovoItem('') } }}
                    style={{ flex: 1, ...mono, fontSize: 10, padding: '4px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--border-red)', background: 'var(--surface)', color: 'var(--text)', outline: 'none' }} />
                  <button type="button" onClick={adicionarItem} style={{ color: '#5aab6e', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}><Check size={12} /></button>
                  <button type="button" onClick={() => { setAddingItem(false); setNovoItem('') }} style={{ color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}><X size={12} /></button>
                </div>
              ) : (
                <button type="button" onClick={() => setAddingItem(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 6px', borderRadius: 'var(--radius)', border: '1px dashed var(--border)', background: 'transparent', color: 'var(--text-dim)', ...mono, fontSize: 9, cursor: 'pointer', alignSelf: 'flex-start' }}>
                  <Plus size={10} /> item
                </button>
              )
            )}
          </div>

          {/* Arquivos */}
          {cr.arquivos && cr.arquivos.length > 0 && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {cr.arquivos.map((a, i) => (
                <span key={i} style={{ padding: '2px 7px', borderRadius: 'var(--radius)', background: 'var(--surface)', border: '1px solid var(--border)', ...mono, fontSize: 9, color: 'var(--text-muted)' }}>
                  📎 {typeof a === 'string' ? a : a.name}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {notaAberta && (
        <div style={{ paddingLeft: 22 }}>
          <NotaVinculada
            groupId={groupId} orgId={orgId}
            label={`Avaliação: ${cr.nome}`}
            onFechar={() => setNotaAberta(false)}
          />
        </div>
      )}
    </div>
  )
}

// ─── Modo Individual ──────────────────────────────────────────
function IndividualPanel({ members, notaGrupo, hooks, editMode, fatoresCustom, setFatoresCustom, editandoFator, setEditandoFator }) {
  const fatoresAtivos = fatoresCustom
    ? Object.fromEntries(fatoresCustom.map(f => [f.id, { label: f.label, mult: f.mult, cor: f.cor }]))
    : FATORES

  const { getFator, getNotaIndividual, getComportamental, getExtras,
          salvarFator, salvarComportamental, adicionarExtra, removerExtra, erro } = hooks

  const [membroAtivo,   setMembroAtivo]   = useState(members[0]?.id || null)
  const [novaExtraDesc, setNovaExtraDesc] = useState('')
  const [novaExtraVal,  setNovaExtraVal]  = useState('')
  const [addingExtra,   setAddingExtra]   = useState(false)
  const timers = useRef({})

  function debounceComport(mid, cid, val) {
    const k = `${mid}-${cid}`
    if (timers.current[k]) clearTimeout(timers.current[k])
    timers.current[k] = setTimeout(() => salvarComportamental(mid, cid, val), 1200)
  }

  if (!members.length) return (
    <div style={{ padding: 24, ...mono, fontSize: 11, color: 'var(--text-dim)' }}>nenhum integrante cadastrado</div>
  )

  const membro = members.find(m => m.id === membroAtivo) || members[0]

  let totalInd = 0
  for (const disc of DISCIPLINAS) {
    for (const fase of disc.fases) {
      const nf = fase.criterios.reduce((a, cr) => a + (notaGrupo(disc.id, cr.id) ?? 0), 0)
      totalInd += getNotaIndividual(membroAtivo, disc.id, fase.nome, nf) || 0
    }
  }
  const extrasDoMembro = getExtras(membroAtivo)
  const totalExtras = extrasDoMembro.reduce((a, e) => a + Number(e.valor), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Erro de salvamento — visível para debug */}
      {erro && (
        <div style={{ padding: '8px 12px', borderRadius: 'var(--radius)', background: 'rgba(200,50,50,0.08)', border: '1px solid rgba(200,50,50,0.3)', ...mono, fontSize: 10, color: '#c83232' }}>
          ⚠ erro ao salvar: {erro}
        </div>
      )}

      {/* Seletor de membro */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {members.map(m => {
          let tot = 0
          for (const disc of DISCIPLINAS) {
            for (const fase of disc.fases) {
              const nf = fase.criterios.reduce((a, cr) => a + (notaGrupo(disc.id, cr.id) ?? 0), 0)
              tot += getNotaIndividual(m.id, disc.id, fase.nome, nf) || 0
            }
          }
          tot += getExtras(m.id).reduce((a, e) => a + Number(e.valor), 0)
          return (
            <button key={m.id} type="button" onClick={() => setMembroAtivo(m.id)}
              style={{ padding: '7px 12px', borderRadius: 'var(--radius-md)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, background: m.id === membroAtivo ? 'var(--red-dim)' : 'var(--surface)', border: `1px solid ${m.id === membroAtivo ? 'var(--border-red)' : 'var(--border)'}` }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--red-dim)', border: '1px solid var(--border-red)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--ff-disp)', fontSize: 12, color: 'var(--red)', flexShrink: 0 }}>
                {m.name?.[0]?.toUpperCase() || '?'}
              </div>
              <div>
                <div style={{ ...mono, fontSize: 12, color: m.id === membroAtivo ? 'var(--red)' : 'var(--text-muted)' }}>{m.name}</div>
                {tot > 0 && <div style={{ ...mono, fontSize: 10, color: statusCor(tot, 26) }}>{tot.toFixed(2).replace('.', ',')} pts</div>}
              </div>
            </button>
          )
        })}
      </div>

      {membro && (
        <div key={membroAtivo} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Total individual */}
          <div style={{ padding: '10px 14px', background: 'var(--surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>total — {membro.name}</span>
            <span style={{ ...mono, fontSize: 16, color: statusCor(totalInd + totalExtras, 26), fontWeight: 600 }}>
              {(totalInd + totalExtras).toFixed(2).replace('.', ',')} pts
            </span>
          </div>

          {/* Fator por fase */}
          <div style={{ ...mono, fontSize: 9, letterSpacing: '0.25em', color: 'var(--text-dim)', textTransform: 'uppercase' }}>// contribuição por fase</div>
          {DISCIPLINAS.map(disc => (
            <div key={disc.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              <div style={{ padding: '8px 14px', background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                <span style={{ ...mono, fontSize: 10, color: disc.cor, letterSpacing: '0.15em', textTransform: 'uppercase' }}>{disc.id} — {disc.nome}</span>
              </div>
              {disc.fases.map(fase => {
                const notaFase = fase.criterios.reduce((a, cr) => a + (notaGrupo(disc.id, cr.id) ?? 0), 0)
                const fatorAtual = getFator(membroAtivo, disc.id, fase.nome)
                const notaInd = getNotaIndividual(membroAtivo, disc.id, fase.nome, notaFase)

                return (
                  <div key={fase.nome} style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                      <div>
                        <div style={{ ...mono, fontSize: 11, color: 'var(--text-sub)' }}>{fase.nome}</div>
                        <div style={{ ...mono, fontSize: 10, color: 'var(--text-dim)' }}>
                          nota do grupo: {notaFase.toFixed(2).replace('.', ',')} / {fase.total} pts
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {Object.entries(fatoresAtivos).map(([key, f]) => {
                          const ativo = fatorAtual === key
                          return (
                            <button key={key} type="button"
                              onClick={() => {
                                const notaCalculada = Math.min(notaFase * f.mult, notaFase * 1.10)
                                salvarFator(membroAtivo, disc.id, fase.nome, key, notaCalculada)
                              }}
                              style={{
                                padding: '4px 10px', borderRadius: 'var(--radius)', ...mono, fontSize: 10,
                                cursor: 'pointer',
                                background: ativo ? `${f.cor}22` : 'var(--surface)',
                                color: ativo ? f.cor : 'var(--text-dim)',
                                border: `1px solid ${ativo ? f.cor : 'var(--border)'}`,
                                transition: 'all 0.12s',
                                fontWeight: ativo ? 600 : 400,
                              }}>
                              {f.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    {fatorAtual && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Barra valor={notaInd || 0} max={fase.total} cor={fatoresAtivos[fatorAtual]?.cor || 'var(--red)'} />
                        <span style={{ ...mono, fontSize: 11, color: fatoresAtivos[fatorAtual]?.cor, fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {(notaInd || 0).toFixed(2).replace('.', ',')} / {fase.total} pts
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}

          {/* Editor de fatores — só em editMode */}
          {editMode && fatoresCustom && (
            <div style={{ border: '1px solid var(--border-red)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              <div style={{ padding: '8px 14px', background: 'var(--red-dim)', borderBottom: '1px solid var(--border-red)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Pencil size={11} style={{ color: 'var(--red)' }} />
                <span style={{ ...mono, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--red)' }}>editar fatores de contribuição</span>
              </div>
              <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {fatoresCustom.map((f, idx) => (
                  <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: f.cor, flexShrink: 0 }} />
                    {editandoFator === `${f.id}-label` ? (
                      <input autoFocus value={f.label}
                        onChange={e => setFatoresCustom(prev => prev.map((x, i) => i === idx ? { ...x, label: e.target.value } : x))}
                        onBlur={() => setEditandoFator(null)}
                        onKeyDown={e => (e.key === 'Enter' || e.key === 'Escape') && setEditandoFator(null)}
                        style={{ flex: 1, ...mono, fontSize: 11, padding: '2px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--border-red)', background: 'var(--surface)', color: 'var(--text)', outline: 'none' }}
                      />
                    ) : (
                      <span onClick={() => setEditandoFator(`${f.id}-label`)}
                        style={{ flex: 1, ...mono, fontSize: 11, color: 'var(--text-sub)', cursor: 'text' }}>
                        {f.label} <Pencil size={9} style={{ color: 'var(--text-dim)', opacity: 0.4 }} />
                      </span>
                    )}
                    {editandoFator === `${f.id}-mult` ? (
                      <input autoFocus type="number" min={0} max={150} value={Math.round(f.mult * 100)}
                        onChange={e => setFatoresCustom(prev => prev.map((x, i) => i === idx ? { ...x, mult: Number(e.target.value) / 100 } : x))}
                        onBlur={() => setEditandoFator(null)}
                        onKeyDown={e => (e.key === 'Enter' || e.key === 'Escape') && setEditandoFator(null)}
                        style={{ width: 56, ...mono, fontSize: 11, padding: '2px 6px', borderRadius: 'var(--radius)', border: '1px solid var(--border-red)', background: 'var(--surface)', color: 'var(--text)', textAlign: 'center', outline: 'none' }}
                      />
                    ) : (
                      <span onClick={() => setEditandoFator(`${f.id}-mult`)}
                        style={{ ...mono, fontSize: 11, color: f.cor, fontWeight: 600, minWidth: 40, textAlign: 'right', cursor: 'pointer' }}>
                        {Math.round(f.mult * 100)}%
                      </span>
                    )}
                    <span style={{ ...mono, fontSize: 9, color: 'var(--text-dim)', width: 40 }}>mult.</span>
                  </div>
                ))}
                <button type="button" onClick={() => setFatoresCustom(Object.entries(FATORES).map(([id, f]) => ({ id, ...f })))}
                  style={{ alignSelf: 'flex-start', marginTop: 4, padding: '3px 10px', borderRadius: 'var(--radius)', ...mono, fontSize: 9, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer' }}>
                  restaurar padrão
                </button>
              </div>
            </div>
          )}

          {/* Comportamentais */}
          <div style={{ ...mono, fontSize: 9, letterSpacing: '0.25em', color: 'var(--text-dim)', textTransform: 'uppercase' }}>// registro comportamental (opcional)</div>
          {CRITERIOS_COMPORTAMENTAIS.map(cr => (
            <div key={cr.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ ...mono, fontSize: 12, color: 'var(--text-sub)' }}>{cr.nome}</div>
              <div style={{ ...mono, fontSize: 10, color: 'var(--text-dim)' }}>{cr.desc}</div>
              <textarea key={`${membroAtivo}-${cr.id}`} rows={2} placeholder="registro opcional..."
                defaultValue={getComportamental(membroAtivo, cr.id)}
                style={{ width: '100%', padding: '6px 10px', fontSize: 11, ...mono, color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--bg-card)', resize: 'none', lineHeight: 1.5 }}
                onChange={e => debounceComport(membroAtivo, cr.id, e.target.value)}
              />
            </div>
          ))}

          {/* Notas extras */}
          <div style={{ ...mono, fontSize: 9, letterSpacing: '0.25em', color: 'var(--text-dim)', textTransform: 'uppercase' }}>// nota extra</div>
          {extrasDoMembro.map(e => (
            <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--surface)' }}>
              <span style={{ flex: 1, ...mono, fontSize: 12, color: 'var(--text-sub)' }}>{e.descricao}</span>
              <span style={{ ...mono, fontSize: 13, color: '#5aab6e', fontWeight: 600 }}>+{Number(e.valor).toFixed(2).replace('.', ',')}</span>
              <button type="button" onClick={() => removerExtra(e.id)} style={{ color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}
                onMouseEnter={ev => ev.currentTarget.style.color = 'var(--red)'}
                onMouseLeave={ev => ev.currentTarget.style.color = 'var(--text-dim)'}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}

          {addingExtra ? (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input autoFocus value={novaExtraDesc} onChange={e => setNovaExtraDesc(e.target.value)}
                placeholder="descrição..."
                style={{ flex: 1, ...mono, fontSize: 11, padding: '6px 10px', borderRadius: 'var(--radius)', border: '1px solid var(--border-red)', background: 'var(--surface)', color: 'var(--text)', outline: 'none' }} />
              <input type="number" step={0.1} value={novaExtraVal} onChange={e => setNovaExtraVal(e.target.value)}
                placeholder="pts"
                style={{ width: 64, ...mono, fontSize: 11, padding: '6px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', textAlign: 'center', outline: 'none' }} />
              <button type="button" onClick={() => { if (novaExtraDesc && novaExtraVal) { adicionarExtra(membroAtivo, novaExtraDesc, Number(novaExtraVal)); setNovaExtraDesc(''); setNovaExtraVal(''); setAddingExtra(false) } }}
                style={{ padding: '6px 12px', borderRadius: 'var(--radius)', ...mono, fontSize: 10, background: 'var(--red-dim)', border: '1px solid var(--border-red)', color: 'var(--red)', cursor: 'pointer' }}>
                <Check size={13} />
              </button>
              <button type="button" onClick={() => { setAddingExtra(false); setNovaExtraDesc(''); setNovaExtraVal('') }}
                style={{ color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                <X size={14} />
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setAddingExtra(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 'var(--radius)', border: '1px dashed var(--border)', background: 'transparent', color: 'var(--text-dim)', ...mono, fontSize: 10, cursor: 'pointer', alignSelf: 'flex-start' }}>
              <Plus size={11} /> adicionar nota extra
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── AvaliacaoTab principal ───────────────────────────────────
export default function AvaliacaoTab({ group }) {
  const parseMaybeJson = (val, fallback = []) => {
    if (Array.isArray(val)) return val
    try { return JSON.parse(val) } catch { return fallback }
  }
  const members = parseMaybeJson(group?.members)

  const avGrupo = useAvaliacao(group?.id, group?.org_id)
  const avInd   = useAvaliacaoIndividual(group?.id, group?.org_id)
  const crud    = useAvaliacaoCrud(group?.id, group?.org_id)

  const { notaGrupo, nivelGrupo, atrasoGrupo, totalDisciplina, loading, saving, salvarNotaGrupo } = avGrupo

  const [modo,          setModo]          = useState('grupo')
  const [discAtiva,     setDiscAtiva]     = useState('dt')
  const [fasesAbertas,  setFasesAbertas]  = useState({})
  const [editMode,      setEditMode]      = useState(false)
  const [regrasAbertas, setRegrasAbertas] = useState(false)
  const [etapas,        setEtapas]        = useState({})
  const [addingFase,    setAddingFase]    = useState(false)
  const [novaFaseNome,  setNovaFaseNome]  = useState('')
  const [addingCrit,    setAddingCrit]    = useState(null)
  const [novaCrNome,    setNovaCrNome]    = useState('')
  const [novaCrMax,     setNovaCrMax]     = useState('1')

  // Overrides locais (sessão) para critérios base e itens
  const [baseOverrides, setBaseOverrides] = useState({}) // { [discId-criterioId]: { nome, max } }
  const [itemOverrides, setItemOverrides] = useState({}) // { [discId-criterioId]: string[] }
  // Edição de nome de fase (local)
  const [faseNomeEdit, setFaseNomeEdit] = useState({}) // { [faseNome]: string }
  const [editandoFase, setEditandoFase] = useState(null)
  // Níveis e fatores editáveis por sessão
  const [niveisCustom,  setNiveisCustom]  = useState(() => NIVEIS_AVALIACAO.map(n => ({
    ...n,
    // display = label curto para os botões; label = descrição completa para edição
    display: { completo: 'Completo', faltou_pouco: 'Faltou pouco', faltou_muito: 'Faltou muito', errado: 'Errado', nao_fez: 'Não fez' }[n.id] || n.label,
  })))
  const [fatoresCustom, setFatoresCustom] = useState(() =>
    Object.entries(FATORES).map(([id, f]) => ({ id, ...f }))
  )
  const [editandoNivel,  setEditandoNivel]  = useState(null) // id do nivel sendo editado
  const [editandoFator,  setEditandoFator]  = useState(null) // id do fator sendo editado

  const timers = useRef({})

  function autoSave(disciplina, fase, criterioId, notaMax, nota, obs, nivel, atraso) {
    // Para clicks de nível (nota calculada): salva IMEDIATAMENTE
    // Para inputs de texto: usa debounce de 600ms
    const isTextInput = nota === undefined || nota === null || nota === ''
    const delay = isTextInput ? 0 : 600

    const k = `${disciplina}-${criterioId}`
    if (timers.current[k]) clearTimeout(timers.current[k])

    const doSave = () => {
      const notaFinal = nota !== undefined && nota !== null && nota !== ''
        ? Math.min(Math.max(parseFloat(nota) || 0, 0), notaMax)
        : (notaGrupo(disciplina, criterioId) ?? 0)
      salvarNotaGrupo({
        disciplina, fase, criterioId,
        nota:       notaFinal,
        notaMax,
        observacao: obs !== undefined ? obs : avGrupo.obsGrupo?.(disciplina, criterioId),
        nivel:      nivel !== undefined ? nivel : nivelGrupo(disciplina, criterioId),
        atraso:     atraso !== undefined ? atraso : atrasoGrupo(disciplina, criterioId),
      })
    }

    if (delay === 0) {
      doSave()
    } else {
      timers.current[k] = setTimeout(doSave, delay)
    }
  }

  function handleEditBase(discId, criterioId, nome, max) {
    setBaseOverrides(prev => ({
      ...prev,
      [`${discId}-${criterioId}`]: { nome, max }
    }))
  }

  function handleSetItens(criterioId, novosItens) {
    setItemOverrides(prev => ({
      ...prev,
      [`${discAtiva}-${criterioId}`]: novosItens
    }))
  }

  // Aplica overrides de nome/max sobre um critério base
  function aplicarOverride(cr) {
    if (cr.isCustom) return cr
    const ov = baseOverrides[`${discAtiva}-${cr.id}`]
    if (!ov) return cr
    return { ...cr, nome: ov.nome ?? cr.nome, max: ov.max ?? cr.max }
  }

  const disc = DISCIPLINAS.find(d => d.id === discAtiva)
  const total = totalDisciplina(discAtiva)

  if (loading) return <div style={{ padding: 28, ...mono, fontSize: 11, color: 'var(--text-dim)' }}>carregando avaliações_</div>

  const fasesAtivas = crud.getFasesDisciplina(discAtiva)

  return (
    <div style={{ ...mono }}>
      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* ── Totais — scroll horizontal em telas pequenas */}
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
          {DISCIPLINAS.map(d => {
            const t = totalDisciplina(d.id)
            return (
             <div key={d.id} style={{ width: 155, flexShrink: 0, padding: '10px 14px', borderRadius: 'var(--radius-md)', border: `1px solid ${d.cor}40`, background: `${d.cor}0d` }}>
                <div style={{ fontSize: 9, letterSpacing: '0.18em', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 4 }}>{d.id.toUpperCase()} — {d.nome.split(' ')[0]}</div>
                <div style={{ fontFamily: 'var(--ff-disp)', fontSize: 22, color: d.cor, lineHeight: 1 }}>{t.toFixed(2).replace('.', ',')}</div>
                <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>/ {d.total} pts</div>
                <div style={{ marginTop: 6 }}><Barra valor={t} max={d.total} cor={d.cor} /></div>
              </div>
            )
          })}
        </div>

        {/* ── Banner de erro — vermelho forte, sempre visível */}
        {avGrupo.erro && (
          <div style={{ padding: '14px 18px', borderRadius: 'var(--radius-md)', background: '#c83232', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }}>⚠</span>
              <div>
                <div style={{ ...mono, fontSize: 12, color: '#fff', fontWeight: 700, marginBottom: 4 }}>ERRO — avaliações não estão salvando</div>
                <div style={{ ...mono, fontSize: 11, color: 'rgba(255,255,255,0.9)', lineHeight: 1.6 }}>{avGrupo.erro}</div>
                <div style={{ ...mono, fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 6 }}>
                  → Abra o console do navegador (F12 → Console) para ver o erro exato.
                </div>
              </div>
            </div>
            <button type="button" onClick={avGrupo.recarregar}
              style={{ padding: '6px 14px', borderRadius: 'var(--radius)', ...mono, fontSize: 11, border: '1px solid rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.15)', color: '#fff', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, fontWeight: 600 }}>
              recarregar
            </button>
          </div>
        )}

        {/* Painel de regras */}
        <PainelRegras aberto={regrasAbertas} onToggle={() => setRegrasAbertas(v => !v)} />

        {/* ── Topbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', gap: 0, border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
            {[['grupo', <Users size={12} />], ['individual', <User size={12} />]].map(([m, icon]) => (
              <button key={m} type="button" onClick={() => setModo(m)} style={{ padding: '6px 14px', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', background: modo === m ? 'var(--red-dim)' : 'transparent', color: modo === m ? 'var(--red)' : 'var(--text-dim)', borderRight: m === 'grupo' ? '1px solid var(--border)' : 'none', border: m === 'grupo' ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: 5 }}>
                {icon} {m}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {saving && <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>›_ salvando...</span>}
            <button type="button" onClick={() => setEditMode(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 'var(--radius)', border: `1px solid ${editMode ? 'var(--border-red)' : 'var(--border)'}`, background: editMode ? 'var(--red-dim)' : 'var(--surface)', color: editMode ? 'var(--red)' : 'var(--text-dim)', fontSize: 10, cursor: 'pointer' }}>
              <Pencil size={11} /> {editMode ? 'sair da edição' : 'editar critérios'}
            </button>
          </div>
        </div>

        {/* ── GRUPO */}
        {modo === 'grupo' && disc && (
          <>
            {/* Painel de edição de níveis — só em editMode */}
            {editMode && (
              <div style={{ border: '1px solid var(--border-red)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <div style={{ padding: '8px 14px', background: 'var(--red-dim)', borderBottom: '1px solid var(--border-red)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Pencil size={11} style={{ color: 'var(--red)' }} />
                  <span style={{ ...mono, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--red)' }}>
                    editar níveis de avaliação
                  </span>
                  <span style={{ ...mono, fontSize: 9, color: 'var(--text-dim)', marginLeft: 4 }}>(clique no nome ou % para editar)</span>
                </div>
                <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {niveisCustom.map((n, idx) => (
                    <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: n.cor, flexShrink: 0 }} />
                      {editandoNivel === `${n.id}-label` ? (
                        <input autoFocus value={n.display || n.label}
                          onChange={e => setNiveisCustom(prev => prev.map((x, i) => i === idx ? { ...x, display: e.target.value } : x))}
                          onBlur={() => setEditandoNivel(null)}
                          onKeyDown={e => (e.key === 'Enter' || e.key === 'Escape') && setEditandoNivel(null)}
                          style={{ flex: 1, ...mono, fontSize: 11, padding: '2px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--border-red)', background: 'var(--surface)', color: 'var(--text)', outline: 'none' }}
                        />
                      ) : (
                        <span onClick={() => setEditandoNivel(`${n.id}-label`)}
                          style={{ flex: 1, ...mono, fontSize: 11, color: 'var(--text-sub)', cursor: 'text' }}>
                          {n.display || n.label} <Pencil size={9} style={{ color: 'var(--text-dim)', opacity: 0.4 }} />
                        </span>
                      )}
                      {editandoNivel === `${n.id}-pct` ? (
                        <input autoFocus type="number" min={0} max={100} value={Math.round(n.pct * 100)}
                          onChange={e => setNiveisCustom(prev => prev.map((x, i) => i === idx ? { ...x, pct: Number(e.target.value) / 100 } : x))}
                          onBlur={() => setEditandoNivel(null)}
                          onKeyDown={e => (e.key === 'Enter' || e.key === 'Escape') && setEditandoNivel(null)}
                          style={{ width: 56, ...mono, fontSize: 11, padding: '2px 6px', borderRadius: 'var(--radius)', border: '1px solid var(--border-red)', background: 'var(--surface)', color: 'var(--text)', textAlign: 'center', outline: 'none' }}
                        />
                      ) : (
                        <span onClick={() => setEditandoNivel(`${n.id}-pct`)}
                          style={{ ...mono, fontSize: 11, color: n.cor, fontWeight: 600, minWidth: 36, textAlign: 'right', cursor: 'pointer' }}>
                          {Math.round(n.pct * 100)}%
                        </span>
                      )}
                      <span style={{ ...mono, fontSize: 9, color: 'var(--text-dim)', width: 60 }}>da nota máx.</span>
                    </div>
                  ))}
                  <button type="button" onClick={() => setNiveisCustom(NIVEIS_AVALIACAO.map(n => ({ ...n })))}
                    style={{ alignSelf: 'flex-start', marginTop: 4, padding: '3px 10px', borderRadius: 'var(--radius)', ...mono, fontSize: 9, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer' }}>
                    restaurar padrão
                  </button>
                </div>
              </div>
            )}
            {/* Tabs de disciplina — scroll horizontal */}
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
              {DISCIPLINAS.map(d => (
               <button key={d.id} type="button" onClick={() => setDiscAtiva(d.id)} style={{ flexShrink: 0, padding: '5px 14px', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer', borderRadius: 'var(--radius)', background: d.id === discAtiva ? d.corBg : 'transparent', color: d.id === discAtiva ? d.cor : 'var(--text-dim)', border: `1px solid ${d.id === discAtiva ? d.corBorder : 'var(--border)'}`, whiteSpace: 'nowrap' }}>
                  {d.id.toUpperCase()}
                </button>
              ))}
            </div>

            <div style={{ padding: '10px 14px', background: 'var(--surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{disc.nome}</span>
                <span style={{ fontSize: 11, color: disc.cor, fontWeight: 600 }}>{total.toFixed(2).replace('.', ',')} / {disc.total} pts</span>
              </div>
              <Barra valor={total} max={disc.total} cor={disc.cor} height={4} />
            </div>

            {fasesAtivas.map(fase => {
              const aberta = fasesAbertas[fase.nome] !== false
              const criteriosFase = crud.getCriteriosFase(discAtiva, fase.nome).map(aplicarOverride)
              const totalFase = criteriosFase.reduce((a, cr) => a + (notaGrupo(discAtiva, cr.id) ?? 0), 0)
              const maxFase = criteriosFase.reduce((a, cr) => a + cr.max, 0) || fase.total || 1
              const nomeExibido = faseNomeEdit[fase.nome] ?? fase.nome

              return (
                <div key={fase.nome} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                  {/* Header da fase */}
                  <div
                    onClick={() => editandoFase !== fase.nome && setFasesAbertas(p => ({ ...p, [fase.nome]: !aberta }))}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', background: 'var(--surface)', cursor: editandoFase === fase.nome ? 'default' : 'pointer', userSelect: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                      {aberta ? <ChevronDown size={13} style={{ color: 'var(--text-dim)', flexShrink: 0 }} /> : <ChevronRight size={13} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />}

                      {editMode && editandoFase === fase.nome ? (
                        <input autoFocus
                          value={faseNomeEdit[fase.nome] ?? fase.nome}
                          onChange={e => setFaseNomeEdit(p => ({ ...p, [fase.nome]: e.target.value }))}
                          onBlur={() => setEditandoFase(null)}
                          onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setEditandoFase(null) }}
                          onClick={e => e.stopPropagation()}
                          style={{ flex: 1, ...mono, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', background: 'var(--surface)', border: '1px solid var(--border-red)', borderRadius: 'var(--radius)', padding: '2px 8px', color: 'var(--text)', outline: 'none' }}
                        />
                      ) : (
                        <span style={{ fontSize: 10, letterSpacing: '0.18em', color: 'var(--text-dim)', textTransform: 'uppercase', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {nomeExibido}
                        </span>
                      )}

                      {editMode && editandoFase !== fase.nome && (
                        <button type="button"
                          onClick={e => { e.stopPropagation(); setEditandoFase(fase.nome) }}
                          style={{ color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 2, flexShrink: 0 }}
                          onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}>
                          <Pencil size={10} />
                        </button>
                      )}

                      {fase.isCustom && editMode && (
                        <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 'var(--radius)', border: '1px solid var(--border-red)', color: 'var(--red)', background: 'var(--red-dim)', flexShrink: 0 }}>custom</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, paddingLeft: 10 }}>
                      <Barra valor={totalFase} max={maxFase} cor={disc.cor} height={4} />
                      <span style={{ fontSize: 11, color: disc.cor, fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {totalFase.toFixed(2).replace('.', ',')} / {maxFase.toFixed(2).replace('.', ',')} pts
                      </span>
                    </div>
                  </div>

                  {aberta && fase.obs && (
                    <div style={{ padding: '6px 14px', background: `${disc.cor}0a`, borderTop: '1px solid var(--border)', fontSize: 10, color: disc.cor, lineHeight: 1.5 }}>◈ {fase.obs}</div>
                  )}

                  {aberta && criteriosFase.map(cr => (
                    <CriterioRow key={cr.id}
                      cr={cr} discId={discAtiva} faseNome={fase.nome}
                      notaGrupo={notaGrupo} nivelGrupo={nivelGrupo} atrasoGrupo={atrasoGrupo}
                      onSave={autoSave} editMode={editMode}
                      onRemoveCustom={crud.removerCriterio}
                      onEditCustom={(dbId, changes) => crud.editarCriterio(dbId, changes)}
                      onEditBase={handleEditBase}
                      groupId={group?.id} orgId={group?.org_id}
                      itensOverride={itemOverrides[`${discAtiva}-${cr.id}`] ?? null}
                      onSetItens={handleSetItens}
                      etapas={etapas} setEtapas={setEtapas}
                      niveisCustom={niveisCustom}
                    />
                  ))}

                  {aberta && editMode && (
                    <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border)' }}>
                      {addingCrit === fase.nome ? (
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <input autoFocus value={novaCrNome} onChange={e => setNovaCrNome(e.target.value)}
                            placeholder="nome do critério..."
                            style={{ flex: 1, ...mono, fontSize: 11, padding: '5px 9px', borderRadius: 'var(--radius)', border: '1px solid var(--border-red)', background: 'var(--surface)', color: 'var(--text)', outline: 'none' }} />
                          <input type="number" min={0} step={0.05} value={novaCrMax} onChange={e => setNovaCrMax(e.target.value)}
                            placeholder="pts"
                            style={{ width: 64, ...mono, fontSize: 11, padding: '5px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', textAlign: 'center', outline: 'none' }} />
                          <button type="button" onClick={() => { crud.adicionarCriterio(discAtiva, fase.nome, novaCrNome, Number(novaCrMax)); setAddingCrit(null); setNovaCrNome(''); setNovaCrMax('1') }}
                            disabled={!novaCrNome.trim()}
                            style={{ padding: '5px 10px', borderRadius: 'var(--radius)', ...mono, fontSize: 10, background: 'var(--red-dim)', border: '1px solid var(--border-red)', color: 'var(--red)', cursor: 'pointer' }}>
                            <Check size={12} />
                          </button>
                          <button type="button" onClick={() => { setAddingCrit(null); setNovaCrNome(''); setNovaCrMax('1') }}
                            style={{ color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                            <X size={13} />
                          </button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => setAddingCrit(fase.nome)}
                          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 8px', borderRadius: 'var(--radius)', border: '1px dashed var(--border)', background: 'transparent', color: 'var(--text-dim)', ...mono, fontSize: 10, cursor: 'pointer' }}>
                          <Plus size={11} /> adicionar critério
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            {editMode && (
              <div>
                {addingFase ? (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input autoFocus value={novaFaseNome} onChange={e => setNovaFaseNome(e.target.value)}
                      placeholder="nome da nova fase..."
                      style={{ flex: 1, ...mono, fontSize: 11, padding: '7px 10px', borderRadius: 'var(--radius)', border: '1px solid var(--border-red)', background: 'var(--surface)', color: 'var(--text)', outline: 'none' }} />
                    <button type="button" onClick={() => { crud.adicionarFase(discAtiva, novaFaseNome); setAddingFase(false); setNovaFaseNome('') }}
                      disabled={!novaFaseNome.trim()}
                      style={{ padding: '7px 14px', borderRadius: 'var(--radius)', ...mono, fontSize: 10, background: 'var(--red-dim)', border: '1px solid var(--border-red)', color: 'var(--red)', cursor: 'pointer' }}>
                      adicionar fase
                    </button>
                    <button type="button" onClick={() => { setAddingFase(false); setNovaFaseNome('') }}
                      style={{ color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setAddingFase(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border)', background: 'transparent', color: 'var(--text-dim)', ...mono, fontSize: 10, cursor: 'pointer', width: '100%', justifyContent: 'center' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-red)'; e.currentTarget.style.color = 'var(--red)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-dim)' }}>
                    <Plus size={12} /> nova fase em {discAtiva.toUpperCase()}
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {/* ── INDIVIDUAL */}
        {modo === 'individual' && (
          <IndividualPanel
            members={members} notaGrupo={notaGrupo}
            hooks={avInd} editMode={editMode}
            fatoresCustom={fatoresCustom} setFatoresCustom={setFatoresCustom}
            editandoFator={editandoFator} setEditandoFator={setEditandoFator}
          />
        )}

        <div style={{ height: 20 }} />
      </div>
    </div>
  )
}