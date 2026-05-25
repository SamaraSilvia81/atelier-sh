import { useState, useRef } from 'react'
import { ChevronDown, ChevronRight, PanelRightClose, PanelRightOpen, Save,
  AlertTriangle, User, Users, FileText, X, Bold, Italic, List, Image as ImageIcon } from 'lucide-react'
import { useAvaliacao } from '../../hooks/useAvaliacao'
import { useNotes } from '../../hooks/useNotes'
import { DISCIPLINAS, CRITERIOS_INDIVIDUAIS } from '../../data/criterios'
import NoteEditor from '../notes/NoteEditor'

// ─── Mini editor de anotação vinculada ───────────────────────────────────────
function NotaVinculada({ groupId, orgId, contexto, label, onClose }) {
  const { notes, createNote, updateNote } = useNotes(groupId, orgId)
  const [nota, setNota]       = useState(null)
  const [criando, setCriando] = useState(false)
  const [iniciado, setIniciado] = useState(false)

  // Busca nota vinculada por título/contexto ao montar
  useState(() => {
    if (!iniciado) {
      setIniciado(true)
      const existente = notes.find(n => n.title === label)
      if (existente) setNota(existente)
    }
  })

  async function handleAbrir() {
    const existente = notes.find(n => n.title === label)
    if (existente) { setNota(existente); return }
    setCriando(true)
    const { data } = await createNote({
      title:   label,
      content: `<p><strong>${label}</strong></p><p></p>`,
    })
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
    <div style={{ border: '1px solid var(--border-red)', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--bg-card)' }}>
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
      <div style={{ minHeight: 160, maxHeight: 320, overflowY: 'auto' }}>
        <NoteEditor note={nota} onUpdate={(id, payload) => updateNote(id, payload)} />
      </div>
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
    loading, saving, erro,
    notaGrupo, obsGrupo,
    notaIndividual, obsIndividual,
    totalDisciplina, mediaIndividual,
    salvarNotaGrupo, salvarNotaIndividual,
  } = useAvaliacao(group?.id, group?.org_id)

  const [modo,          setModo]          = useState('grupo')
  const [discAtiva,     setDiscAtiva]     = useState('dt')
  const [faseAberta,    setFaseAberta]    = useState({})
  const [detAbertos,    setDetAbertos]    = useState({})
  const [notasAbertas,  setNotasAbertas]  = useState({}) // { [key]: bool }
  const [membroAtivo,   setMembroAtivo]   = useState(members[0]?.id || null)
  const [pendentes,     setPendentes]     = useState({}) // { [key]: { nota, obs } }
  const [salvando,      setSalvandoKey]   = useState(null)

  const bufferG = useRef({})
  const bufferI = useRef({})
  const timers  = useRef({})

  const disc = DISCIPLINAS.find(d => d.id === discAtiva)
  const pct = (v, m) => m > 0 ? Math.min(100, (v / m) * 100) : 0
  const statusCor = (n, m) => {
    if (n === null) return 'var(--border)'
    const p = pct(n, m)
    return p >= 80 ? '#5aab6e' : p >= 50 ? '#c8922a' : 'var(--red)'
  }
  const toggleFase = (n) => setFaseAberta(p => ({ ...p, [n]: !p[n] }))
  const toggleDet  = (k) => setDetAbertos(p => ({ ...p, [k]: !p[k] }))
  const toggleNota = (k) => setNotasAbertas(p => ({ ...p, [k]: !p[k] }))

  function marcarPendente(key, campo, valor) {
    setPendentes(p => ({ ...p, [key]: { ...(p[key] || {}), [campo]: valor } }))
  }

  async function salvarFase(disciplina, fase, criterioId, notaMax) {
    const key = `${disciplina}-${criterioId}`
    setSalvandoKey(key)
    const b = pendentes[key] || {}
    await salvarNotaGrupo({
      disciplina, fase, criterioId,
      nota:       b.nota ?? notaGrupo(disciplina, criterioId) ?? 0,
      notaMax,
      observacao: b.obs  ?? obsGrupo(disciplina, criterioId),
    })
    setSalvandoKey(null)
    setPendentes(p => { const next = { ...p }; delete next[key]; return next })
  }

  async function salvarIndividual(memberId, criterio) {
    const key = `ind-${memberId}-${criterio}`
    setSalvandoKey(key)
    const b = pendentes[key] || {}
    await salvarNotaIndividual({
      memberId, criterio,
      nota:       b.nota ?? notaIndividual(memberId, criterio) ?? 0,
      observacao: b.obs  ?? obsIndividual(memberId, criterio),
    })
    setSalvandoKey(null)
    setPendentes(p => { const next = { ...p }; delete next[key]; return next })
  }

  const inputStyle = (cor) => ({
    width: 64, padding: '4px 6px', textAlign: 'center', fontSize: 13,
    fontFamily: 'var(--ff-mono)', border: `1px solid ${cor || 'var(--border)'}`,
    borderRadius: 'var(--radius)', background: 'var(--bg-card)', color: 'var(--text)',
  })

  const obsStyle = {
    width: '100%', padding: '6px 10px', fontSize: 11, fontFamily: 'var(--ff-mono)',
    color: 'var(--text-muted)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', background: 'var(--bg-card)', resize: 'none', lineHeight: 1.5,
  }

  if (loading) return (
    <div style={{ padding: 28, fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-dim)' }}>
      carregando avaliações_
    </div>
  )

  // ── Barra de totais no topo ───────────────────────────────────────────────
  const renderTotais = () => (
    <div style={{ display: 'flex', gap: 10, marginBottom: 4 }}>
      {DISCIPLINAS.map(d => {
        const total = totalDisciplina(d.id)
        const p = pct(total, d.total)
        return (
          <div key={d.id} style={{ flex: 1, padding: '10px 14px', borderRadius: 'var(--radius-md)', border: `1px solid ${d.cor}40`, background: `${d.cor}0d` }}>
            <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.18em', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 4 }}>
              {d.id.toUpperCase()} — {d.nome.split(' ')[0]}
            </div>
            <div style={{ fontFamily: 'var(--ff-disp)', fontSize: 22, color: d.cor, lineHeight: 1 }}>
              {total.toFixed(2).replace('.', ',')}
            </div>
            <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--text-dim)', marginTop: 2 }}>/ {d.total} pts</div>
            <div style={{ marginTop: 6, height: 3, borderRadius: 2, background: 'var(--border)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${p}%`, background: d.cor, borderRadius: 2, transition: 'width 0.3s ease' }} />
            </div>
          </div>
        )
      })}
    </div>
  )

  // ── Render modo GRUPO ─────────────────────────────────────────────────────
  const renderGrupo = () => {
    if (!disc) return null
    const total = totalDisciplina(discAtiva)
    const pctDisc = pct(total, disc.total)

    return (
      <>
        {/* Tabs de disciplina */}
        <div style={{ display: 'flex', gap: 6 }}>
          {DISCIPLINAS.map(d => (
            <button key={d.id} onClick={() => setDiscAtiva(d.id)} style={{
              padding: '5px 14px', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase',
              cursor: 'pointer', borderRadius: 'var(--radius)',
              background: d.id === discAtiva ? d.corBg : 'transparent',
              color: d.id === discAtiva ? d.cor : 'var(--text-dim)',
              border: `1px solid ${d.id === discAtiva ? d.corBorder : 'var(--border)'}`,
            }}>
              {d.id.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Barra total disciplina */}
        <div style={{ padding: '10px 14px', background: 'var(--surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
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
            const n = notaGrupo(disc.id, cr.id)
            return a + (n !== null ? n : 0)
          }, 0)
          const pctFase = pct(totalFase, fase.total)
          const notaFaseKey = `nota-fase-${discAtiva}-${fase.nome}`

          return (
            <div key={fase.nome} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              {/* Cabeçalho da fase */}
              <div onClick={() => toggleFase(fase.nome)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', background: 'var(--surface)', cursor: 'pointer', userSelect: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {aberta ? <ChevronDown size={13} style={{ color: 'var(--text-dim)' }} /> : <ChevronRight size={13} style={{ color: 'var(--text-dim)' }} />}
                  <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '0.18em', color: 'var(--text-dim)', textTransform: 'uppercase' }}>{fase.nome}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 80, height: 4, borderRadius: 2, background: 'var(--border)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pctFase}%`, background: disc.cor, borderRadius: 2 }} />
                  </div>
                  <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: disc.cor, fontWeight: 600 }}>
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
                const key = `${discAtiva}-${cr.id}`
                const notaAtual = notaGrupo(discAtiva, cr.id)
                const cor = statusCor(notaAtual, cr.max)
                const detAberto = detAbertos[cr.id]
                const temPendente = !!pendentes[key]
                const notaAberta = notasAbertas[`nota-${key}`]

                return (
                  <div key={cr.id} style={{ borderTop: '1px solid var(--border)', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {cr.zeraSem && (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, padding: '6px 10px', borderRadius: 'var(--radius)', background: 'rgba(200,50,50,0.08)', border: '1px solid rgba(200,50,50,0.2)', fontFamily: 'var(--ff-mono)', fontSize: 10, color: '#c83232', lineHeight: 1.4 }}>
                        <AlertTriangle size={11} style={{ flexShrink: 0, marginTop: 1 }} /> {cr.zeraSem}
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <button onClick={() => toggleDet(cr.id)} style={{ color: 'var(--text-dim)', flexShrink: 0, padding: 2, background: 'none', border: 'none', cursor: 'pointer' }}>
                        {detAberto ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      </button>
                      <span style={{ flex: 1, fontFamily: 'var(--ff-mono)', fontSize: 12, color: 'var(--text-sub)', lineHeight: 1.4 }}>{cr.nome}</span>
                      <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>máx {String(cr.max).replace('.', ',')} pts</span>
                      <input
                        type="number" min={0} max={cr.max} step={0.05}
                        defaultValue={notaAtual ?? ''}
                        placeholder="0"
                        style={inputStyle(temPendente ? disc.cor : cor)}
                        onChange={e => marcarPendente(key, 'nota', e.target.value)}
                      />
                      {/* Botão salvar por critério */}
                      <button
                        onClick={() => salvarFase(discAtiva, fase.nome, cr.id, cr.max)}
                        disabled={salvando === key}
                        title="salvar nota"
                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 'var(--radius)', border: `1px solid ${temPendente ? disc.cor : 'var(--border)'}`, background: temPendente ? `${disc.cor}18` : 'var(--surface)', color: temPendente ? disc.cor : 'var(--text-dim)', fontFamily: 'var(--ff-mono)', fontSize: 10, cursor: salvando === key ? 'wait' : 'pointer', transition: 'all 0.15s' }}>
                        <Save size={11} />
                        {salvando === key ? '...' : 'salvar'}
                      </button>
                    </div>

                    {/* Detalhes expandidos */}
                    {detAberto && (
                      <div style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {cr.itens && (
                          <ul style={{ paddingLeft: 14, display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {cr.itens.map((item, i) => (
                              <li key={i} style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--text-dim)', lineHeight: 1.5 }}>{item}</li>
                            ))}
                          </ul>
                        )}
                        {cr.arquivos && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {cr.arquivos.map(a => (
                              <span key={a} style={{ fontSize: 9, padding: '2px 7px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-dim)', fontFamily: 'var(--ff-mono)' }}>{a}</span>
                            ))}
                          </div>
                        )}

                        {/* Obs rápida */}
                        <textarea
                          rows={2}
                          placeholder="Observação rápida sobre este critério..."
                          defaultValue={obsGrupo(discAtiva, cr.id)}
                          style={obsStyle}
                          onChange={e => marcarPendente(key, 'obs', e.target.value)}
                        />

                        {/* Anotação vinculada */}
                        <NotaVinculada
                          groupId={group?.id}
                          orgId={group?.org_id}
                          label={`[Avaliação] ${discAtiva.toUpperCase()} · ${cr.nome}`}
                          onClose={() => toggleNota(`nota-${key}`)}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </>
    )
  }

  // ── Render modo INDIVIDUAL ────────────────────────────────────────────────
  const renderIndividual = () => {
    if (!members.length) return (
      <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-dim)', padding: 20 }}>
        nenhum integrante cadastrado
      </div>
    )
    const membro = members.find(m => m.id === membroAtivo) || members[0]

    return (
      <>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {members.map(m => (
            <button key={m.id} onClick={() => setMembroAtivo(m.id)} style={{ padding: '7px 12px', borderRadius: 'var(--radius-md)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, background: m.id === membroAtivo ? 'var(--red-dim)' : 'var(--surface)', border: `1px solid ${m.id === membroAtivo ? 'var(--border-red)' : 'var(--border)'}` }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--red-dim)', border: '1px solid var(--border-red)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--ff-disp)', fontSize: 11, color: 'var(--red)', flexShrink: 0 }}>
                {m.name?.[0]?.toUpperCase() || '?'}
              </div>
              <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 12, color: m.id === membroAtivo ? 'var(--red)' : 'var(--text-muted)' }}>{m.name}</span>
              {(() => { const med = mediaIndividual(m.id); return med !== null ? <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: statusCor(med, 10) }}>{med.toFixed(1)}</span> : null })()}
            </button>
          ))}
        </div>

        {membro && CRITERIOS_INDIVIDUAIS.map(cr => {
          const key = `ind-${membro.id}-${cr.id}`
          const notaAtual = notaIndividual(membro.id, cr.id)
          const cor = statusCor(notaAtual, cr.max)
          const detAberto = detAbertos[key]
          const temPendente = !!pendentes[key]

          return (
            <div key={cr.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button onClick={() => toggleDet(key)} style={{ color: 'var(--text-dim)', flexShrink: 0, padding: 2, background: 'none', border: 'none', cursor: 'pointer' }}>
                    {detAberto ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  </button>
                  <span style={{ flex: 1, fontFamily: 'var(--ff-mono)', fontSize: 12, color: 'var(--text-sub)' }}>{cr.nome}</span>
                  <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--text-dim)' }}>0 – 10</span>
                  <input
                    type="number" min={0} max={10} step={0.5}
                    defaultValue={notaAtual ?? ''}
                    placeholder="0"
                    style={inputStyle(temPendente ? '#7F77DD' : cor)}
                    onChange={e => marcarPendente(key, 'nota', e.target.value)}
                  />
                  <button
                    onClick={() => salvarIndividual(membro.id, cr.id)}
                    disabled={salvando === key}
                    title="salvar nota"
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 'var(--radius)', border: `1px solid ${temPendente ? '#7F77DD' : 'var(--border)'}`, background: temPendente ? 'rgba(127,119,221,0.1)' : 'var(--surface)', color: temPendente ? '#7F77DD' : 'var(--text-dim)', fontFamily: 'var(--ff-mono)', fontSize: 10, cursor: salvando === key ? 'wait' : 'pointer' }}>
                    <Save size={11} />
                    {salvando === key ? '...' : 'salvar'}
                  </button>
                </div>

                {detAberto && (
                  <div style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <p style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--text-dim)', lineHeight: 1.5 }}>{cr.descricao}</p>
                    {cr.escala && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {cr.escala.map(e => (
                          <div key={e.valor} style={{ display: 'flex', gap: 8, fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--text-dim)' }}>
                            <span style={{ color: 'var(--red)', minWidth: 18 }}>{e.valor}</span>
                            <span>{e.label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <textarea
                      rows={2}
                      placeholder="Observação..."
                      defaultValue={obsIndividual(membro.id, cr.id)}
                      style={obsStyle}
                      onChange={e => marcarPendente(key, 'obs', e.target.value)}
                    />
                    {/* Anotação vinculada ao integrante */}
                    <NotaVinculada
                      groupId={group?.id}
                      orgId={group?.org_id}
                      label={`[Avaliação] ${membro.name} · ${cr.nome}`}
                      onClose={() => {}}
                    />
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </>
    )
  }

  // ── Root render ───────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', fontFamily: 'var(--ff-mono)' }}>

      {/* Painel principal com scroll */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Totais no topo */}
        {renderTotais()}

        {/* Topbar modo + saving */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', gap: 0, border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
            {[['grupo', <Users size={12} />], ['individual', <User size={12} />]].map(([m, icon]) => (
              <button key={m} onClick={() => setModo(m)} style={{ padding: '6px 14px', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', background: modo === m ? 'var(--red-dim)' : 'transparent', color: modo === m ? 'var(--red)' : 'var(--text-dim)', borderRight: m === 'grupo' ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: 5 }}>
                {icon} {m}
              </button>
            ))}
          </div>
          {saving && (
            <span style={{ fontSize: 10, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Save size={11} /> salvando_
            </span>
          )}
          {erro && (
            <span style={{ fontSize: 10, color: 'var(--red)', fontFamily: 'var(--ff-mono)' }}>{erro}</span>
          )}
        </div>

        {/* Integrantes resumo (modo individual) */}
        {modo === 'individual' && members.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '8px 12px', background: 'var(--surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: 9, letterSpacing: '0.2em', color: 'var(--text-dim)', textTransform: 'uppercase', alignSelf: 'center' }}>médias:</span>
            {members.map(m => {
              const med = mediaIndividual(m.id)
              return (
                <span key={m.id} style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: med !== null ? statusCor(med, 10) : 'var(--text-dim)' }}>
                  {m.name?.split(' ')[0]} {med !== null ? med.toFixed(1) : '—'}
                </span>
              )
            })}
          </div>
        )}

        {modo === 'grupo' ? renderGrupo() : renderIndividual()}
      </div>
    </div>
  )
}
