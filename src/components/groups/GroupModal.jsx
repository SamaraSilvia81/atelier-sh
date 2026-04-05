import { useState, useEffect } from 'react'
import { X, Plus, Trash2, UserPlus, Pencil } from 'lucide-react'
import { useSounds } from '../../hooks/useSounds'
import { fetchBoards } from '../../lib/trello'

const COLORS = ['#C0211C','#8a7272','#C4B8B0','#4a7a5a','#4a5a8a','#8a4a7a','#a259ff','#c8922a']
const STATUS = [
  { value: 'active',    label: '// ativo',    color: '#5aab6e' },
  { value: 'attention', label: '// atenção',  color: '#c8922a' },
  { value: 'inactive',  label: '// inativo',  color: 'var(--text-dim)' },
]

export default function GroupModal({ group, trelloToken, trelloWorkspaceId, onClose, onSave }) {
  const editing = !!group
  const [name,            setName]           = useState(group?.name || '')
  const [description,     setDescription]    = useState(group?.description || '')
  const [githubRepo,      setGithubRepo]     = useState(group?.github_repo || '')
  const [figmaUrl,        setFigmaUrl]       = useState(group?.figma_url || '')
  const [status,          setStatus]         = useState(group?.status || 'active')
  const [color,           setColor]          = useState(group?.color || COLORS[0])
  const [trelloBoardId,   setTrelloBoardId]  = useState(group?.trello_board_id || '')
  const [trelloBoardName, setTrelloBoardName]= useState(group?.trello_board_name || '')
  const [githubToken,     setGithubToken]    = useState(group?.github_token || '')
  const [boards,          setBoards]         = useState([])
  const sounds = useSounds()
  const [loading,         setLoading]        = useState(false)
  const [saveError,       setSaveError]      = useState('')
  const [activeTab,       setActiveTab]      = useState('geral')

  const parseMaybeJson = (val, fallback = []) => {
    if (Array.isArray(val)) return val
    try { return JSON.parse(val) } catch { return fallback }
  }

  const [members,    setMembers]    = useState(() => parseMaybeJson(group?.members))
  const [memberForm, setMemberForm] = useState({ name: '', role: '', contact: '' })
  const [tags,       setTags]       = useState(() => parseMaybeJson(group?.tags))
  const [tagInput,   setTagInput]   = useState('')
  const [stage,      setStage]      = useState(group?.stage || '')

  useEffect(() => {
    if (trelloToken) fetchBoards(trelloToken, trelloWorkspaceId).then(setBoards)
  }, [trelloToken, trelloWorkspaceId])

  const [editingMemberId, setEditingMemberId] = useState(null)

  function addMember() {
    if (!memberForm.name.trim()) return
    if (editingMemberId) {
      setMembers(prev => prev.map(m => m.id === editingMemberId ? { ...m, ...memberForm } : m))
      setEditingMemberId(null)
    } else {
      setMembers(prev => [...prev, { id: Date.now(), ...memberForm }])
    }
    setMemberForm({ name: '', role: '', contact: '' })
  }

  function startEditMember(m) {
    setMemberForm({ name: m.name, role: m.role || '', contact: m.contact || '' })
    setEditingMemberId(m.id)
  }

  function cancelEditMember() {
    setMemberForm({ name: '', role: '', contact: '' })
    setEditingMemberId(null)
  }

  function addTag() {
    const t = tagInput.trim()
    if (!t || tags.includes(t)) return
    setTags(prev => [...prev, t])
    setTagInput('')
  }

  async function handleSave() {
    if (!name.trim()) return
    setLoading(true)
    setSaveError('')
    const result = await onSave({
      name: name.trim(), description,
      github_repo: githubRepo.trim(), figma_url: figmaUrl.trim(),
      github_token: githubToken.trim(),
      status, color,
      trello_board_id: trelloBoardId, trello_board_name: trelloBoardName,
      members, tags, stage: stage.trim(),
    })
    setLoading(false)
    if (result?.error) { setSaveError('Erro ao salvar: ' + (result.error.message || JSON.stringify(result.error))); sounds.play('error') }
    else { sounds.play('save'); onClose() }
  }

  const inp = { width: '100%', padding: '9px 12px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'var(--ff-mono)', fontSize: 12, borderRadius: 'var(--radius)', outline: 'none', boxSizing: 'border-box' }
  const lbl = { fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text-dim)', display: 'block', marginBottom: 5 }
  const tabList = ['geral', 'integrantes', 'tags & etapas']

  return (
    <div style={{ position:'fixed', inset:0, background:'var(--overlay)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-red)', borderRadius:'var(--radius-md)', width:'100%', maxWidth:520, maxHeight:'92vh', display:'flex', flexDirection:'column' }}>

        {/* Header */}
        <div style={{ padding:'24px 28px 0', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:18 }}>
            <div>
              <div style={{ fontFamily:'var(--ff-disp)', fontSize:22, letterSpacing:'0.05em' }}>{editing ? 'EDITAR GRUPO' : 'NOVO GRUPO'}</div>
              <div style={{ fontFamily:'var(--ff-mono)', fontSize:9, letterSpacing:'0.3em', color:'var(--text-dim)', textTransform:'uppercase', marginTop:3 }}>// atelier.sh</div>
            </div>
            <button onClick={onClose} style={{ color:'var(--text-muted)', padding:4, cursor:'pointer' }}><X size={16} /></button>
          </div>
          <div style={{ display:'flex', borderBottom:'1px solid var(--border)' }}>
            {tabList.map(t => (
              <button key={t} onClick={() => { setActiveTab(t); sounds.play('tab') }} style={{
                padding:'8px 14px', fontFamily:'var(--ff-mono)', fontSize:10,
                letterSpacing:'0.14em', textTransform:'uppercase',
                color: activeTab===t ? 'var(--red)' : 'var(--text-dim)',
                borderBottom: activeTab===t ? '2px solid var(--red)' : '2px solid transparent',
                background:'none', cursor:'pointer', marginBottom:-1,
              }}>{t}</button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:'auto', padding:'20px 28px' }}>

          {activeTab === 'geral' && <>
            <div className="field"><label style={lbl}>nome do grupo</label><input value={name} onChange={e => { setName(e.target.value); sounds.play('typing') }} placeholder="ex: BarberPro" style={inp} /></div>
            <div className="field"><label style={lbl}>descrição</label><input value={description} onChange={e => setDescription(e.target.value)} placeholder="ex: Sistema de agendamento" style={inp} /></div>
            <div className="field"><label style={lbl}>repositório github</label><input value={githubRepo} onChange={e => setGithubRepo(e.target.value)} placeholder="usuario/nome-do-repo" style={inp} /></div>
            <div className="field"><label style={lbl}>token github do grupo <span style={{ opacity:0.5, textTransform:'none', letterSpacing:0 }}>(opcional — repositórios privados)</span></label><input type="password" value={githubToken} onChange={e => setGithubToken(e.target.value)} placeholder="ghp_... (substitui o token global)" style={inp} /></div>
            <div className="field">
              <label style={lbl}>link do figma <span style={{ color:'#a259ff', opacity:0.7 }}>◈</span></label>
              <input value={figmaUrl} onChange={e => setFigmaUrl(e.target.value)} placeholder="https://figma.com/file/..." style={inp} />
            </div>
            <div className="field">
              <label style={lbl}>board do trello</label>
              {boards.length > 0 ? (
                <select value={trelloBoardId} onChange={e => { const b = boards.find(b=>b.id===e.target.value); setTrelloBoardId(e.target.value); setTrelloBoardName(b?.name||'') }} style={{ ...inp, appearance:'none' }}>
                  <option value="">— sem board —</option>
                  {boards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              ) : (
                <input value={trelloBoardId} onChange={e => setTrelloBoardId(e.target.value)} placeholder="configure o token Trello nas configurações" style={inp} />
              )}
            </div>
            <div className="field">
              <label style={lbl}>status</label>
              <div style={{ display:'flex', gap:6 }}>
                {STATUS.map(s => (
                  <button key={s.value} onClick={() => setStatus(s.value)} style={{
                    flex:1, padding:'7px 0', borderRadius:'var(--radius)', fontSize:11, fontFamily:'var(--ff-mono)', letterSpacing:'0.1em',
                    border: status===s.value ? `1px solid ${s.color}` : '1px solid var(--border)',
                    background: status===s.value ? `${s.color}20` : 'var(--surface)',
                    color: status===s.value ? s.color : 'var(--text-muted)', cursor:'pointer',
                  }}>{s.label}</button>
                ))}
              </div>
            </div>
            <div className="field">
              <label style={lbl}>cor</label>
              <div style={{ display:'flex', gap:8 }}>
                {COLORS.map(c => (
                  <button key={c} onClick={() => setColor(c)} style={{ width:24, height:24, borderRadius:'50%', background:c, border: color===c ? '2px solid var(--text)' : '2px solid transparent', outline: color===c ? `2px solid ${c}` : 'none', outlineOffset:2, cursor:'pointer' }} />
                ))}
              </div>
            </div>
          </>}

          {activeTab === 'integrantes' && <>
            <div style={{ fontFamily:'var(--ff-mono)', fontSize:10, letterSpacing:'0.2em', color:'var(--text-dim)', textTransform:'uppercase', marginBottom:14 }}>
              // {members.length} integrante{members.length!==1?'s':''} cadastrado{members.length!==1?'s':''}
            </div>
            {members.length > 0 && (
              <div style={{ marginBottom:16, display:'flex', flexDirection:'column', gap:6 }}>
                {members.map(m => (
                  <div key={m.id} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'10px 12px', display:'flex', alignItems:'flex-start', gap:8 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontFamily:'var(--ff-mono)', fontSize:12, color:'var(--text-sub)', marginBottom:2 }}>{m.name}</div>
                      {m.role && <div style={{ fontFamily:'var(--ff-mono)', fontSize:10, color:'var(--text-dim)', letterSpacing:'0.1em' }}>{m.role}</div>}
                      {m.contact && (
                        <div style={{ fontFamily:'var(--ff-mono)', fontSize:10, marginTop:2 }}>
                          <a href={m.contact.includes('@')?`mailto:${m.contact}`:m.contact} target="_blank" rel="noopener"
                            style={{ color:'var(--red)', textDecoration:'none' }}>{m.contact}</a>
                        </div>
                      )}
                    </div>
                    <div style={{ display:'flex', gap:4 }}>
                      <button onClick={() => startEditMember(m)} style={{ color:'var(--text-dim)', cursor:'pointer', padding:2 }} title="editar">
                        <Pencil size={11} />
                      </button>
                      <button onClick={() => setMembers(prev => prev.filter(x=>x.id!==m.id))} style={{ color:'var(--text-dim)', cursor:'pointer', padding:2 }} title="remover">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ background:'var(--bg)', border:'1px solid var(--border-red)', borderRadius:'var(--radius-md)', padding:14 }}>
              <div style={{ fontFamily:'var(--ff-mono)', fontSize:9, letterSpacing:'0.28em', color:'var(--red)', textTransform:'uppercase', marginBottom:12 }}>// adicionar integrante</div>
              <div className="field"><label style={lbl}>nome *</label><input value={memberForm.name} onChange={e => setMemberForm(p=>({...p,name:e.target.value}))} placeholder="Nome do aluno" style={inp} /></div>
              <div className="field"><label style={lbl}>função</label><input value={memberForm.role} onChange={e => setMemberForm(p=>({...p,role:e.target.value}))} placeholder="ex: Líder, Dev, Designer..." style={inp} /></div>
              <div className="field"><label style={lbl}>contato</label><input value={memberForm.contact} onChange={e => setMemberForm(p=>({...p,contact:e.target.value}))} placeholder="ex: aluno@gmail.com ou @github" style={inp} /></div>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={addMember} disabled={!memberForm.name.trim()} className="btn btn-primary" style={{ opacity:!memberForm.name.trim()?0.4:1, display:'flex', alignItems:'center', gap:6 }}>
                  <UserPlus size={12} /> {editingMemberId ? 'salvar edição' : 'adicionar'}
                </button>
                {editingMemberId && (
                  <button onClick={cancelEditMember} className="btn btn-ghost" style={{ fontSize:10 }}>cancelar</button>
                )}
              </div>
            </div>
          </>}

          {activeTab === 'tags & etapas' && <>
            <div className="field">
              <label style={lbl}>etapa atual</label>
              <input value={stage} onChange={e => setStage(e.target.value)} placeholder="ex: Prototipação, Desenvolvimento, Testes..." style={inp} />
              <div style={{ fontFamily:'var(--ff-mono)', fontSize:10, color:'var(--text-dim)', marginTop:5 }}>// campo livre — escreva o que fizer sentido</div>
            </div>
            <div className="field" style={{ marginTop:16 }}>
              <label style={lbl}>tags</label>
              <div style={{ display:'flex', gap:6, marginBottom:8 }}>
                <input value={tagInput} onChange={e=>setTagInput(e.target.value)}
                  onKeyDown={e=>{ if(e.key==='Enter'){e.preventDefault();addTag()} }}
                  placeholder="ex: React, Python, ODS 4..." style={{ ...inp, flex:1 }} />
                <button onClick={addTag} disabled={!tagInput.trim()} style={{
                  padding:'9px 12px', borderRadius:'var(--radius)',
                  background:'var(--red-dim)', border:'1px solid var(--border-red)',
                  color:'#F0EDE8', cursor:'pointer', opacity:!tagInput.trim()?0.4:1,
                }}><Plus size={13} /></button>
              </div>
              {tags.length > 0 ? (
                <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                  {tags.map(tag => (
                    <span key={tag} style={{ display:'inline-flex', alignItems:'center', gap:5, fontFamily:'var(--ff-mono)', fontSize:11, padding:'3px 8px', border:'1px solid var(--border-red)', borderRadius:'var(--radius)', color:'var(--text-muted)', background:'rgba(74,21,21,0.12)' }}>
                      {tag}
                      <button onClick={()=>setTags(prev=>prev.filter(t=>t!==tag))} style={{ color:'var(--red)', cursor:'pointer', lineHeight:1 }}>×</button>
                    </span>
                  ))}
                </div>
              ) : (
                <div style={{ fontFamily:'var(--ff-mono)', fontSize:11, color:'var(--text-dim)' }}>nenhuma tag — use Enter ou + para adicionar</div>
              )}
            </div>
          </>}
        </div>

        {/* Footer */}
        <div style={{ padding:'16px 28px', borderTop:'1px solid var(--border)', flexShrink:0 }}>
          {saveError && (
            <div style={{ padding:'10px 12px', borderRadius:'var(--radius)', marginBottom:12, background:'rgba(192,33,28,0.08)', border:'1px solid var(--border-red)', fontFamily:'var(--ff-mono)', fontSize:11, color:'var(--red)' }}>
              ✗ {saveError}
            </div>
          )}
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={onClose} className="btn btn-ghost" style={{ flex:1 }}>cancelar</button>
            <button onClick={handleSave} className="btn btn-primary" disabled={loading||!name.trim()} style={{ flex:1, justifyContent:'center', opacity:!name.trim()?0.4:1 }}>
              {loading ? '...' : editing ? 'salvar' : 'criar grupo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
