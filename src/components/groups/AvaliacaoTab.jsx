import { useState, useRef, useEffect, useMemo } from 'react'
import {
  ChevronDown, ChevronRight, FileText, X,
  Plus, Pencil, Trash2, AlertTriangle, Check
} from 'lucide-react'
import { useAvaliacao } from '../../hooks/useAvaliacao'
import { useNotes }     from '../../hooks/useNotes'
import { DISCIPLINAS }  from '../../data/criterios'
import NoteEditor       from '../notes/NoteEditor'

// ─── Anotação vinculada ao critério ──────────────────────────────────────────
function NotaVinculada({ groupId, orgId, label, onClose }) {
  const { notes, createNote, updateNote } = useNotes(groupId, orgId)
  const [nota,    setNota]    = useState(null)
  const [criando, setCriando] = useState(false)

  useEffect(() => {
    const existente = notes.find(n => n.title === label)
    if (existente && !nota) setNota(existente)
  }, [notes, label, nota])

  async function handleAbrir() {
    const existente = notes.find(n => n.title === label)
    if (existente) { setNota(existente); return }
    setCriando(true)
    const { data } = await createNote(groupId, label, { content: `<p><strong>${label}</strong></p><p></p>` })
    if (data) setNota(data)
    setCriando(false)
  }

  if (!nota) return (
    <button onClick={handleAbrir} disabled={criando}
      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 'var(--radius)', border: '1px dashed var(--border)', background: 'transparent', color: 'var(--text-dim)', fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '0.08em', cursor: criando ? 'wait' : 'pointer' }}>
      <FileText size={11} />
      {criando ? 'criando nota...' : 'anotação vinculada'}
    </button>
  )

  return (
    <div style={{ border: '1px solid var(--border-red)', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--bg-card)', marginTop: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 12px', background: 'var(--red-dim)', borderBottom: '1px solid var(--border-red)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <FileText size={11} style={{ color: 'var(--red)' }} />
          <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--red)', letterSpacing: '0.08em' }}>{nota.title}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, color: 'var(--text-dim)' }}>›_ salvo automaticamente</span>
          <button onClick={onClose} style={{ color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
            <X size={13} />
          </button>
        </div>
      </div>
      <div style={{ minHeight: 120, maxHeight: 240, overflowY: 'auto' }}>
        <NoteEditor note={nota} onUpdate={(id, payload) => updateNote(id, payload)} />
      </div>
    </div>
  )
}

// ─── Seção customizada ────────────────────────────────────────────────────────
function SecaoCustom({ secao, groupId, orgId, modo, membroAtivo, notaGrupo, notaIndividual, salvarNotaGrupo, salvarNotaIndividual, onRemove, onRename }) {
  const notaAtual = modo === 'grupo'
    ? notaGrupo('custom', secao.id)
    : notaIndividual(membroAtivo, `custom-${secao.id}`)

  const [notaAberta, setNotaAberta] = useState(false)
  const [editando,   setEditando]   = useState(false)
  const [nomeEdit,   setNomeEdit]   = useState(secao.nome)
  const [pendente,   setPendente]   = useState(false)
  const timer = useRef(null)

  function handleNota(val) {
    setPendente(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      const nota = Math.min(Math.max(parseFloat(val) || 0, 0), 10)
      if (modo === 'grupo') {
        await salvarNotaGrupo({ disciplina: 'custom', fase: 'custom', criterioId: secao.id, nota, notaMax: 10, observacao: null })
      } else {
        await salvarNotaIndividual({ memberId: membroAtivo, criterio: `custom-${secao.id}`, nota, observacao: null })
      }
      setPendente(false)
    }, 1200)
  }

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--surface)' }}>
        {editando ? (
          <>
            <input
              autoFocus value={nomeEdit}
              onChange={e => setNomeEdit(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { onRename(secao.id, nomeEdit); setEditando(false) }
                if (e.key === 'Escape') setEditando(false)
              }}
              style={{ flex: 1, background: 'var(--bg-card)', border: '1px solid var(--border-red)', borderRadius: 'var(--radius)', padding: '4px 8px', color: 'var(--text)', fontFamily: 'var(--ff-mono)', fontSize: 12, outline: 'none' }}
            />
            <button onClick={() => { onRename(secao.id, nomeEdit); setEditando(false) }}
              style={{ color: '#5aab6e', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
              <Check size={14} />
            </button>
            <button onClick={() => setEditando(false)}
              style={{ color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
              <X size={13} />
            </button>
          </>
        ) : (
          <>
            <span style={{ flex: 1, fontFamily: 'var(--ff-mono)', fontSize: 12, color: 'var(--text-sub)', letterSpacing: '0.05em' }}>{secao.nome}</span>
            <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>/ 10 pts</span>
            <input
              type="number" min={0} max={10} step={0.1}
              defaultValue={notaAtual ?? ''}
              placeholder="0"
              onChange={e => handleNota(e.target.value)}
              style={{ width: 60, padding: '4px 6px', borderRadius: 'var(--radius)', border: `1px solid ${pendente ? 'var(--border-red)' : 'var(--border)'}`, background: 'var(--bg-card)', fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text)', outline: 'none' }}
            />
            {pendente && <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, color: 'var(--text-dim)' }}>_</span>}
            <button onClick={() => setNotaAberta(v => !v)} title="anotação vinculada"
              style={{ color: notaAberta ? 'var(--red)' : 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 2 }}>
              <FileText size={13} />
            </button>
            <button onClick={() => setEditando(true)} title="renomear"
              style={{ color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 2 }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}>
              <Pencil size={12} />
            </button>
            <button onClick={() => onRemove(secao.id)} title="remover seção"
              style={{ color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 2 }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}>
              <Trash2 size={12} />
            </button>
          </>
        )}
      </div>
      {notaAberta && (
        <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)' }}>
          <NotaVinculada
            groupId={groupId}
            orgId={orgId}
            label={`Extra: ${secao.nome}`}
            onClose={() => setNotaAberta(false)}
          />
        </div>
      )}
    </div>
  )
}

// ─── AvaliacaoTab principal ───────────────────────────────────────────────────
export default function AvaliacaoTab({ group }) {
  const parseMaybeJson = (val, fallback = []) => {
    if (Array.isArray(val)) return val
    try { return JSON.parse(val) } catch { return fallback }
  }
  const members = parseMaybeJson(group?.members)

  const {
    loading,
    notaGrupo, notaIndividual,
    salvarNotaGrupo, salvarNotaIndividual,
  } = useAvaliacao(group?.id, group?.org_id)

  const [modo,         setModo]         = useState('grupo')
  const [discAtiva,    setDiscAtiva]    = useState('dt')
  const [membroAtivo,  setMembroAtivo]  = useState(members[0]?.id || null)
  const [faseAberta,   setFaseAberta]   = useState({})
  const [detAbertos,   setDetAbertos]   = useState({})
  const [notasAbertas, setNotasAbertas] = useState({})
  const [pendentes,    setPendentes]    = useState({})

  // ── Seções customizadas (persistidas por grupo em localStorage) ──────────
  const storageKey = `atelier_secoes_${group?.id}`
  const [customSecoes,   setCustomSecoes]   = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey)) || [] } catch { return [] }
  })
  const [addingSecao,    setAddingSecao]    = useState(false)
  const [novaSecaoNome,  setNovaSecaoNome]  = useState('')

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(customSecoes)) } catch {}
  }, [customSecoes, storageKey])

  function adicionarSecao() {
    if (!novaSecaoNome.trim()) return
    setCustomSecoes(prev => [...prev, { id: crypto.randomUUID(), nome: novaSecaoNome.trim() }])
    setNovaSecaoNome('')
    setAddingSecao(false)
  }

  // ── Debounce de notas ─────────────────────────────────────────────────────
  const timers = useRef({})

  function handleNota(crKey, val, { disciplina, fase, criterioId, notaMax, memberId }) {
    setPendentes(prev => ({ ...prev, [crKey]: true }))
    clearTimeout(timers.current[crKey])
    timers.current[crKey] = setTimeout(async () => {
      const nota = Math.min(Math.max(parseFloat(val) || 0, 0), notaMax)
      if (modo === 'grupo') {
        await salvarNotaGrupo({ disciplina, fase, criterioId, nota, notaMax, observacao: null })
      } else {
        await salvarNotaIndividual({ memberId, criterio: `${disciplina}-${criterioId}`, nota, observacao: null })
      }
      setPendentes(prev => { const n = { ...prev }; delete n[crKey]; return n })
    }, 1200)
  }

  // ── Toggles ───────────────────────────────────────────────────────────────
  function toggleFase(nomeFase) {
    setFaseAberta(prev => ({ ...prev, [nomeFase]: !(prev[nomeFase] ?? true) }))
  }
  function toggleDet(crId) {
    setDetAbertos(prev => ({ ...prev, [crId]: !prev[crId] }))
  }
  function toggleNota(crKey) {
    setNotasAbertas(prev => ({ ...prev, [crKey]: !prev[crKey] }))
  }

  // ── Cálculos ──────────────────────────────────────────────────────────────
  const pct = (v, m) => m > 0 ? Math.min(100, (v / m) * 100) : 0
  const statusCor = (n, m) => {
    if (n === null) return 'var(--border)'
    const p = pct(n, m)
    return p >= 80 ? '#5aab6e' : p >= 50 ? '#c8922a' : 'var(--red)'
  }

  const totaisPorDisc = useMemo(() => {
    const result = {}
    DISCIPLINAS.forEach(d => {
      result[d.id] = d.fases.reduce((acc, fase) =>
        acc + fase.criterios.reduce((a, cr) => {
          const n = modo === 'grupo'
            ? notaGrupo(d.id, cr.id)
            : notaIndividual(membroAtivo, `${d.id}-${cr.id}`)
          return a + (n !== null ? n : 0)
        }, 0), 0)
    })
    return result
  }, [modo, membroAtivo, notaGrupo, notaIndividual])

  const disc    = DISCIPLINAS.find(d => d.id === discAtiva)
  const total   = totaisPorDisc[discAtiva] || 0
  const pctDisc = pct(total, disc?.total || 10)

  const inputStyle = (cor, pendente) => ({
    width: 60, padding: '4px 6px', borderRadius: 'var(--radius)',
    border: `1px solid ${pendente ? 'var(--border-red)' : cor}`,
    background: 'var(--bg-card)', fontFamily: 'var(--ff-mono)',
    fontSize: 11, color: 'var(--text)', outline: 'none', transition: 'border-color 0.15s',
  })

  // ── Loading / error guard ─────────────────────────────────────────────────
  if (loading) return (
    <div style={{ padding: 24, fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-dim)' }}>
      carregando avaliação_
    </div>
  )
  if (!disc) return (
    <div style={{ padding: 24, fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-dim)' }}>
      disciplina não encontrada
    </div>
  )

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* ── Header: modo + membro + abas de disciplinas ── */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--bg)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 5 }}>
            {[['grupo', '👥 GRUPO'], ['individual', '👤 INDIVIDUAL']].map(([v, label]) => (
              <button key={v} onClick={() => setModo(v)}
                style={{ padding: '6px 12px', borderRadius: 'var(--radius)', fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '0.08em', border: `1px solid ${modo === v ? 'var(--border-red)' : 'var(--border)'}`, background: modo === v ? 'var(--red-dim)' : 'var(--surface)', color: modo === v ? 'var(--text)' : 'var(--text-muted)', cursor: 'pointer' }}>
                {label}
              </button>
            ))}
          </div>
          {modo === 'individual' && members.length > 0 && (
            <select value={membroAtivo || ''} onChange={e => setMembroAtivo(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: 'var(--radius)', fontFamily: 'var(--ff-mono)', fontSize: 11, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', outline: 'none' }}>
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.name || 'sem nome'}</option>
              ))}
            </select>
          )}
        </div>

        {/* Tabs disciplinas */}
        <div style={{ display: 'flex', gap: 5, overflowX: 'auto', paddingBottom: 2 }}>
          {DISCIPLINAS.map(d => (
            <button key={d.id} onClick={() => setDiscAtiva(d.id)}
              style={{ padding: '5px 12px', borderRadius: 'var(--radius)', fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', border: `1px solid ${discAtiva === d.id ? d.cor : 'var(--border)'}`, background: discAtiva === d.id ? `${d.cor}18` : 'var(--surface)', color: discAtiva === d.id ? d.cor : 'var(--text-muted)', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {d.id} — {(totaisPorDisc[d.id] || 0).toFixed(2).replace('.', ',')}/{d.total}
            </button>
          ))}
        </div>
      </div>

      {/* ── Scroll principal ── */}
      <div key={modo === 'individual' ? membroAtivo : 'grupo'} style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Barra total da disciplina */}
        <div style={{ padding: '10px 14px', background: 'var(--surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--ff-mono)' }}>{disc.nome}</span>
            <span style={{ fontSize: 11, color: disc.cor, fontWeight: 600, fontFamily: 'var(--ff-mono)' }}>
              {total.toFixed(2).replace('.', ',')} / {disc.total} pts
            </span>
          </div>
          <div style={{ height: 4, borderRadius: 2, background: 'var(--border)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pctDisc}%`, background: disc.cor, borderRadius: 2, transition: 'width 0.3s ease' }} />
          </div>
        </div>

        {/* Fases */}
        {disc.fases.map(fase => {
          const aberta = faseAberta[fase.nome] !== false
          const totalFase = fase.criterios.reduce((a, cr) => {
            const n = modo === 'grupo' ? notaGrupo(disc.id, cr.id) : notaIndividual(membroAtivo, `${disc.id}-${cr.id}`)
            return a + (n !== null ? n : 0)
          }, 0)
          const pctFase = pct(totalFase, fase.total)

          return (
            <div key={fase.nome} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', flexShrink: 0 }}>
              {/* Header da fase — clicável para toggle */}
              <div
                onClick={() => toggleFase(fase.nome)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', background: 'var(--surface)', cursor: 'pointer', userSelect: 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {aberta
                    ? <ChevronDown  size={13} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
                    : <ChevronRight size={13} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />}
                  <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '0.18em', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                    {fase.nome}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 80, height: 4, borderRadius: 2, background: 'var(--border)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pctFase}%`, background: disc.cor, borderRadius: 2 }} />
                  </div>
                  <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: disc.cor, fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {totalFase.toFixed(2).replace('.', ',')} / {fase.total} pts
                  </span>
                </div>
              </div>

              {aberta && fase.obs && (
                <div style={{ padding: '6px 14px', background: `${disc.cor}0a`, borderTop: '1px solid var(--border)', fontFamily: 'var(--ff-mono)', fontSize: 10, color: disc.cor, lineHeight: 1.5 }}>
                  ◈ {fase.obs}
                </div>
              )}

              {/* Critérios */}
              {aberta && fase.criterios.map(cr => {
                const crKey = modo === 'grupo'
                  ? `g-${discAtiva}-${cr.id}`
                  : `i-${membroAtivo}-${discAtiva}-${cr.id}`
                const notaAtual  = modo === 'grupo'
                  ? notaGrupo(discAtiva, cr.id)
                  : notaIndividual(membroAtivo, `${discAtiva}-${cr.id}`)
                const cor        = statusCor(notaAtual, cr.max)
                const detAberto  = detAbertos[cr.id]
                const notaAberta = notasAbertas[crKey]
                const isPendente = !!pendentes[crKey]

                return (
                  <div key={cr.id} style={{ borderTop: '1px solid var(--border)', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {/* Alerta */}
                    {cr.zeraSem && (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, padding: '5px 10px', borderRadius: 'var(--radius)', background: 'rgba(200,50,50,0.08)', border: '1px solid rgba(200,50,50,0.2)', fontFamily: 'var(--ff-mono)', fontSize: 10, color: '#c83232', lineHeight: 1.4 }}>
                        <AlertTriangle size={11} style={{ flexShrink: 0, marginTop: 1 }} /> {cr.zeraSem}
                      </div>
                    )}

                    {/* Linha principal */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {/* Toggle detalhes */}
                      <button onClick={() => toggleDet(cr.id)}
                        style={{ color: 'var(--text-dim)', flexShrink: 0, padding: 2, background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                        {detAberto ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      </button>

                      <span style={{ flex: 1, fontFamily: 'var(--ff-mono)', fontSize: 12, color: 'var(--text-sub)', lineHeight: 1.4, minWidth: 160 }}>
                        {cr.nome}
                      </span>

                      <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                        / {String(cr.max).replace('.', ',')} pts
                      </span>

                      <input
                        type="number" min={0} max={cr.max} step={0.05}
                        defaultValue={notaAtual ?? ''}
                        placeholder="0"
                        style={inputStyle(cor, isPendente)}
                        onChange={e => handleNota(crKey, e.target.value, {
                          disciplina: discAtiva, fase: fase.nome,
                          criterioId: cr.id, notaMax: cr.max,
                          memberId: membroAtivo,
                        })}
                      />

                      {isPendente && (
                        <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, color: disc.cor }}>_</span>
                      )}

                      {/* Botão abrir/fechar anotação vinculada */}
                      <button onClick={() => toggleNota(crKey)} title="anotação vinculada"
                        style={{ color: notaAberta ? 'var(--red)' : 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 2, flexShrink: 0 }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                        onMouseLeave={e => e.currentTarget.style.color = notaAberta ? 'var(--red)' : 'var(--text-dim)'}>
                        <FileText size={13} />
                      </button>
                    </div>

                    {/* Detalhes expandidos */}
                    {detAberto && (
                      <div style={{ paddingLeft: 22, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {cr.itens && (
                          <ul style={{ paddingLeft: 14, margin: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {cr.itens.map((item, i) => (
                              <li key={i} style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--text-dim)', lineHeight: 1.5 }}>
                                {item}
                              </li>
                            ))}
                          </ul>
                        )}
                        {cr.arquivos && cr.arquivos.length > 0 && (
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {cr.arquivos.map((arq, i) => (
                              <span key={i} style={{ padding: '3px 8px', borderRadius: 'var(--radius)', background: 'var(--surface)', border: '1px solid var(--border)', fontFamily: 'var(--ff-mono)', fontSize: 9, color: 'var(--text-muted)' }}>
                                📎 {typeof arq === 'string' ? arq : arq.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Anotação vinculada */}
                    {notaAberta && (
                      <div style={{ paddingLeft: 22 }}>
                        <NotaVinculada
                          groupId={group?.id}
                          orgId={group?.org_id}
                          label={`Avaliação: ${cr.nome}`}
                          onClose={() => toggleNota(crKey)}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}

        {/* ── Seções extras customizadas ── */}
        <div style={{ flexShrink: 0, marginTop: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>
              // seções extras
            </span>
            <button
              onClick={() => setAddingSecao(true)}
              disabled={addingSecao}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 'var(--radius)', fontFamily: 'var(--ff-mono)', fontSize: 10, border: '1px dashed var(--border)', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', letterSpacing: '0.08em' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--border-red)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-dim)'; e.currentTarget.style.borderColor = 'var(--border)' }}
            >
              <Plus size={11} /> nova seção
            </button>
          </div>

          {addingSecao && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 8, alignItems: 'center' }}>
              <input
                autoFocus
                value={novaSecaoNome}
                onChange={e => setNovaSecaoNome(e.target.value)}
                placeholder="nome da seção..."
                onKeyDown={e => {
                  if (e.key === 'Enter') adicionarSecao()
                  if (e.key === 'Escape') { setAddingSecao(false); setNovaSecaoNome('') }
                }}
                style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border-red)', borderRadius: 'var(--radius)', padding: '6px 10px', color: 'var(--text)', fontFamily: 'var(--ff-mono)', fontSize: 11, outline: 'none' }}
              />
              <button
                onClick={adicionarSecao}
                disabled={!novaSecaoNome.trim()}
                style={{ padding: '6px 12px', borderRadius: 'var(--radius)', background: 'var(--red-dim)', border: '1px solid var(--border-red)', color: '#F0EDE8', fontFamily: 'var(--ff-mono)', fontSize: 10, cursor: 'pointer', opacity: !novaSecaoNome.trim() ? 0.4 : 1 }}
              >
                adicionar
              </button>
              <button
                onClick={() => { setAddingSecao(false); setNovaSecaoNome('') }}
                style={{ color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}
              >
                <X size={14} />
              </button>
            </div>
          )}

          {customSecoes.length === 0 && !addingSecao && (
            <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--text-dim)', padding: '6px 0', opacity: 0.6 }}>
              sem seções extras — clique em "nova seção" para criar
            </div>
          )}

          {customSecoes.map(secao => (
            <SecaoCustom
              key={secao.id}
              secao={secao}
              groupId={group?.id}
              orgId={group?.org_id}
              modo={modo}
              membroAtivo={membroAtivo}
              notaGrupo={notaGrupo}
              notaIndividual={notaIndividual}
              salvarNotaGrupo={salvarNotaGrupo}
              salvarNotaIndividual={salvarNotaIndividual}
              onRemove={id => setCustomSecoes(prev => prev.filter(s => s.id !== id))}
              onRename={(id, nome) => setCustomSecoes(prev => prev.map(s => s.id === id ? { ...s, nome } : s))}
            />
          ))}
        </div>

        {/* Respiro final */}
        <div style={{ height: 24, flexShrink: 0 }} />
      </div>
    </div>
  )
}
