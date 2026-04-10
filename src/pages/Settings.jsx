import { useState, useEffect } from 'react'
import { useOrgs } from '../hooks/useOrgs'
import { useSettings } from '../hooks/useSettings'
import { useRole } from '../hooks/useRole'
import { useAuth } from '../hooks/useAuth'
import { fetchWorkspaces, getTrelloAuthUrl } from '../lib/trello'
import { useTheme, THEMES } from '../hooks/useTheme.jsx'
import OrgMembersModal from '../components/layout/OrgMembersModal'
import { useSounds } from '../hooks/useSounds'
import { supabase } from '../lib/supabase'
import { Save, ExternalLink, RefreshCw, Eye, EyeOff, Volume2, VolumeX, Cloud, Check, Trash2, LogOut, AlertTriangle } from 'lucide-react'

// ── TokenRow declarado FORA do Settings para não recriar a cada render ────────
const TOKEN_ROW_LBL = { fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text-dim)', display: 'block', marginBottom: 5 }
const TOKEN_ROW_INP = { flex: 1, padding: '9px 11px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'var(--ff-mono)', fontSize: 12, borderRadius: 'var(--radius)', outline: 'none' }

function TokenRow({ label, settingsKey, value, onChange, show, setShow, hint, saved, savingSettings, onSave }) {
  return (
    <div className="field">
      <label style={TOKEN_ROW_LBL}>{label}</label>
      <div style={{ display: 'flex', gap: 6 }}>
        <input type={show ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)} placeholder={hint} style={TOKEN_ROW_INP} />
        {setShow && (
          <button onClick={() => setShow(s => !s)} style={{ padding: '0 10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-muted)', cursor: 'pointer' }}>
            {show ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        )}
        <button onClick={() => onSave(settingsKey, value)} className="btn btn-primary" style={{ flexShrink: 0, padding: '8px 14px', gap: 6 }}>
          {saved === settingsKey ? <><Check size={12} /> salvo</> : savingSettings ? '...' : <><Cloud size={12} /> salvar</>}
        </button>
      </div>
      <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, color: 'var(--text-dim)', marginTop: 4, letterSpacing: '0.1em' }}>
        // salvo no banco de dados · disponível em qualquer dispositivo
      </div>
    </div>
  )
}

export default function Settings({ currentOrgId }) {
  const { orgs, updateOrg } = useOrgs()
  const org = orgs.find(o => o.id === currentOrgId)
  const { isAdmin } = useRole(currentOrgId)
  const { user, signOut } = useAuth()
  const [showMembers, setShowMembers] = useState(false)
  const [inviteTab,   setInviteTab]   = useState('members')
  const { theme, setTheme } = useTheme()
  const sounds = useSounds()
  const { settings, loading: loadingSettings, saving: savingSettings, save: saveSettings } = useSettings()

  const [soundsOn, setSoundsOn] = useState(true)
  const [trelloToken,  setTrelloToken]  = useState('')
  const [githubToken,  setGithubToken]  = useState('')
  const [figmaToken,   setFigmaToken]   = useState('')
  const [showGH,       setShowGH]       = useState(false)
  const [showFG,       setShowFG]       = useState(false)
  const [workspaces,   setWorkspaces]   = useState([])
  const [loadingWS,    setLoadingWS]    = useState(false)
  const [wsStatus,     setWsStatus]     = useState(null)
  const [saved,        setSaved]        = useState('')
  const [orgForm,      setOrgForm]      = useState({ name: '', description: '', github_org: '', trello_workspace_id: '', trello_workspace_name: '' })

  // delete account state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteInput,       setDeleteInput]       = useState('')
  const [deleting,          setDeleting]          = useState(false)
  const [deleteError,       setDeleteError]       = useState('')

  useEffect(() => {
    if (!loadingSettings) {
      setGithubToken(settings.github_token || '')
      setTrelloToken(settings.trello_token || '')
      setFigmaToken(settings.figma_token  || '')
      setSoundsOn(settings.sounds_enabled !== false)
    }
  }, [loadingSettings])

  useEffect(() => {
    if (org) setOrgForm({ name: org.name||'', description: org.description||'', github_org: org.github_org||'', trello_workspace_id: org.trello_workspace_id||'', trello_workspace_name: org.trello_workspace_name||'' })
  }, [org])

  function flash(k) { setSaved(k); setTimeout(() => setSaved(''), 2500) }

  async function handleSaveToken(key, value) {
    await saveSettings({ [key]: value })
    flash(key)
  }

  async function loadWorkspaces() {
    setLoadingWS(true); setWsStatus(null)
    try {
      const ws = await fetchWorkspaces(trelloToken)
      setWorkspaces(ws)
      setWsStatus(ws.length > 0
        ? { ok: true, msg: `✓ ${ws.length} workspace${ws.length !== 1 ? 's' : ''} encontrado${ws.length !== 1 ? 's' : ''}` }
        : { ok: false, msg: '✗ nenhum workspace retornado — verifique se o token é válido' }
      )
    } catch { setWsStatus({ ok: false, msg: '✗ erro ao conectar com o Trello' }) }
    setLoadingWS(false)
  }

  async function saveOrg() {
    if (!org) return
    await updateOrg(org.id, orgForm); flash('org')
  }

  async function handleDeleteAccount() {
    if (deleteInput !== 'DELETAR') return
    setDeleting(true); setDeleteError('')
    try {
      // Chama a Edge Function que deleta a conta usando service role
      const { error } = await supabase.functions.invoke('delete-account', {
        body: { userId: user.id },
      })
      if (error) throw error
      // Faz logout e limpa localStorage
      localStorage.clear()
      await signOut()
    } catch (err) {
      setDeleteError(err.message || 'Erro ao deletar conta. Tente novamente.')
      setDeleting(false)
    }
  }

  const S   = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 24, marginBottom: 20 }
  const lbl = { fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text-dim)', display: 'block', marginBottom: 5 }
  const inp = { flex: 1, padding: '9px 11px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'var(--ff-mono)', fontSize: 12, borderRadius: 'var(--radius)', outline: 'none' }

  if (loadingSettings) return (
    <div className="page-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.2em' }}>carregando configurações...</div>
    </div>
  )

  return (
    <>
    <div className="page-wrap">
      <header style={{ borderBottom: '1px solid var(--border)', padding: '14px 32px', background: 'var(--header-bg)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 100, flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, letterSpacing: '0.2em', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'center' }}>
          atelier.sh <span style={{ color: 'var(--border-bright)', margin: '0 10px' }}>·</span>
          <span style={{ color: 'var(--text-sub)' }}>configurações</span>
        </div>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: '32px var(--content-pad)' }}>
        <h1 style={{ fontFamily: 'var(--ff-disp)', fontSize: 28, letterSpacing: '0.05em', marginBottom: 4 }}>CONFIGURAÇÕES</h1>
        <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '0.22em', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 28 }}>// atelier.sh · {org?.name || 'sem org selecionada'}</div>

        {org && <div style={S}>
          <div style={{ fontFamily: 'var(--ff-disp)', fontSize: 18, letterSpacing: '0.05em', marginBottom: 4 }}>{org.name}</div>
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.28em', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 18 }}>// organização atual</div>
          <div className="field"><label style={lbl}>nome</label><input value={orgForm.name} onChange={e => setOrgForm(p => ({...p, name: e.target.value}))} style={{ ...inp, flex: 'none', width: '100%' }} /></div>
          <div className="field"><label style={lbl}>descrição</label><input value={orgForm.description} onChange={e => setOrgForm(p => ({...p, description: e.target.value}))} placeholder="opcional" style={{ ...inp, flex: 'none', width: '100%' }} /></div>
          <div className="field"><label style={lbl}>org github</label><input value={orgForm.github_org} onChange={e => setOrgForm(p => ({...p, github_org: e.target.value}))} placeholder="ex: MinhaOrg, empresa-xyz..." style={{ ...inp, flex: 'none', width: '100%' }} /></div>
          <button onClick={saveOrg} className="btn btn-primary"><Save size={12} /> {saved === 'org' ? '✓ salvo' : 'salvar'}</button>
        </div>}

        <div style={S}>
          <div style={{ fontFamily: 'var(--ff-disp)', fontSize: 18, letterSpacing: '0.05em', marginBottom: 4 }}>GITHUB</div>
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.28em', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 18 }}>// repositórios privados + push de devolutivas</div>
          <TokenRow label="personal access token" settingsKey="github_token" value={githubToken} onChange={setGithubToken} show={showGH} setShow={setShowGH} hint="ghp_..." saved={saved} savingSettings={savingSettings} onSave={handleSaveToken} />
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <a href="https://github.com/settings/tokens/new?scopes=repo&description=Atelier.sh" target="_blank" rel="noopener" className="btn btn-ghost" style={{ fontSize: 10 }}>
              <ExternalLink size={11} /> gerar token clássico no GitHub
            </a>
          </div>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: 12, fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.8, borderLeft: '2px solid var(--border-red)', marginTop: 14 }}>
            <div style={{ color: 'var(--text-sub)', marginBottom: 4 }}>// uso do GitHub é opcional — cada organização decide:</div>
            <div>• configure o push de devolutivas se quiser usar integração com repos</div>
            <div>• sem token configurado, o Atelier funciona normalmente sem GitHub</div>
            <div style={{ marginTop: 8, color: 'var(--text-sub)' }}>// use token clássico (não fine-grained) com escopo:</div>
            <div>• <span style={{ color: 'var(--red)' }}>repo</span> — acesso completo + push</div>
          </div>
        </div>

        <div style={S}>
          <div style={{ fontFamily: 'var(--ff-disp)', fontSize: 18, letterSpacing: '0.05em', marginBottom: 4 }}>TRELLO</div>
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.28em', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 18 }}>// boards + criar cards a partir de anotações</div>
          <TokenRow label="token de acesso" settingsKey="trello_token" value={trelloToken} onChange={setTrelloToken} show={true} hint="cole o token gerado no trello" saved={saved} savingSettings={savingSettings} onSave={handleSaveToken} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            <a href={getTrelloAuthUrl()} target="_blank" rel="noopener" className="btn btn-ghost" style={{ fontSize: 10 }}><ExternalLink size={11} /> gerar token</a>
            <button onClick={loadWorkspaces} disabled={!trelloToken} className="btn btn-ghost" style={{ fontSize: 10, opacity: !trelloToken ? 0.5 : 1 }}>
              <RefreshCw size={11} /> {loadingWS ? 'carregando...' : 'carregar workspaces'}
            </button>
          </div>
          {wsStatus && (
            <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 'var(--radius)', fontFamily: 'var(--ff-mono)', fontSize: 11,
              color: wsStatus.ok ? '#5aab6e' : 'var(--red)',
              background: wsStatus.ok ? 'rgba(90,171,110,0.08)' : 'rgba(192,33,28,0.08)',
              border: `1px solid ${wsStatus.ok ? '#2a6e3a' : 'var(--border-red)'}` }}>
              {wsStatus.msg}
            </div>
          )}
          {workspaces.length > 0 && org && <div className="field" style={{ marginTop: 14 }}>
            <label style={lbl}>workspace para "{org.name}"</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <select value={orgForm.trello_workspace_id} onChange={e => { const ws = workspaces.find(w => w.id === e.target.value); setOrgForm(p => ({...p, trello_workspace_id: e.target.value, trello_workspace_name: ws?.displayName || ''})) }} style={{ ...inp, appearance: 'none', flex: 1 }}>
                <option value="">— selecionar —</option>
                {workspaces.map(ws => <option key={ws.id} value={ws.id}>{ws.displayName}</option>)}
              </select>
              <button onClick={saveOrg} className="btn btn-primary"><Save size={12} /></button>
            </div>
          </div>}
        </div>

        <div style={S}>
          <div style={{ fontFamily: 'var(--ff-disp)', fontSize: 18, letterSpacing: '0.05em', marginBottom: 4 }}>FIGMA <span style={{ color: '#a259ff', fontSize: 14 }}>◈</span></div>
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.28em', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 18 }}>// visualizar arquivos dos grupos</div>
          <TokenRow label="personal access token" settingsKey="figma_token" value={figmaToken} onChange={setFigmaToken} show={showFG} setShow={setShowFG} hint="figd_..." saved={saved} savingSettings={savingSettings} onSave={handleSaveToken} />
          <a href="https://www.figma.com/settings" target="_blank" rel="noopener" className="btn btn-ghost" style={{ fontSize: 10, marginTop: 4 }}>
            <ExternalLink size={11} /> gerar token no Figma
          </a>
        </div>

        <div style={S}>
          <div style={{ fontFamily: 'var(--ff-disp)', fontSize: 18, letterSpacing: '0.05em', marginBottom: 4 }}>TEMA</div>
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.28em', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 18 }}>// aparência da interface</div>
          {['crimson','forest','aurora'].map(group => {
            const groupThemes = THEMES.filter(t => t.group === group)
            const groupLabels = { crimson: 'Crimson Red', forest: 'Forest Green', aurora: 'Aurora Purple' }
            return (
              <div key={group} style={{ marginBottom: 18 }}>
                <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.28em', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 8 }}>// {groupLabels[group]}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {groupThemes.map(t => (
                    <button key={t.id} onClick={() => setTheme(t.id)} style={{
                      padding: '14px 16px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                      background: theme === t.id ? 'var(--acc-dim)' : 'var(--surface)',
                      border: theme === t.id ? `2px solid var(--acc)` : '2px solid var(--border)',
                      textAlign: 'left', transition: 'all var(--fast)',
                    }}>
                      <div style={{ display: 'flex', gap: 5, marginBottom: 8 }}>
                        {t.preview.map((c, i) => <div key={i} style={{ width: 18, height: 18, borderRadius: '50%', background: c, border: '1px solid rgba(128,128,128,0.2)' }} />)}
                      </div>
                      <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: theme === t.id ? 'var(--text)' : 'var(--text-sub)', marginBottom: 2 }}>{t.label}</div>
                      <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--text-dim)' }}>{t.desc}</div>
                      {theme === t.id && <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, color: 'var(--acc)', letterSpacing: '0.2em', marginTop: 5 }}>// ativo</div>}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <div style={S}>
          <div style={{ fontFamily: 'var(--ff-disp)', fontSize: 18, letterSpacing: '0.05em', marginBottom: 4 }}>SONS</div>
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.28em', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 18 }}>// feedback sonoro</div>
          <button onClick={() => { const next = sounds.toggle(); setSoundsOn(next); saveSettings({ sounds_enabled: next }) }} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px',
            borderRadius: 'var(--radius-md)', cursor: 'pointer',
            background: soundsOn ? 'var(--acc-dim)' : 'var(--surface)',
            border: soundsOn ? '1px solid var(--border-acc)' : '1px solid var(--border)',
            color: soundsOn ? 'var(--text)' : 'var(--text-muted)',
            fontFamily: 'var(--ff-mono)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase',
          }}>
            {soundsOn ? <Volume2 size={14} /> : <VolumeX size={14} />}
            {soundsOn ? 'sons ativos' : 'sons desativados'}
          </button>
        </div>

        {isAdmin && org && (
          <div style={S}>
            <div style={{ fontFamily: 'var(--ff-disp)', fontSize: 18, letterSpacing: '0.05em', marginBottom: 4 }}>MEMBROS</div>
            <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.28em', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 14 }}>// convidar e gerenciar colaboradores</div>
            <p style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 16 }}>
              Convide pessoas por e-mail. Membros com role <span style={{ color: 'var(--text-sub)' }}>admin</span> criam e editam grupos e projetos. <span style={{ color: 'var(--text-sub)' }}>Viewers</span> têm acesso somente leitura.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setInviteTab('members'); setShowMembers(true) }} className="btn btn-ghost" style={{ fontSize: 11 }}>
                ver membros
              </button>
              <button onClick={() => { setInviteTab('invite'); setShowMembers(true) }} className="btn btn-primary" style={{ fontSize: 11 }}>
                + convidar pessoa
              </button>
            </div>
          </div>
        )}

        <div style={S}>
          <div style={{ fontFamily: 'var(--ff-disp)', fontSize: 18, letterSpacing: '0.05em', marginBottom: 4 }}>MIGRAR DADOS</div>
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.28em', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 18 }}>// importar do dashboard mod1</div>
          <MigrateFromLocalStorage orgId={currentOrgId} />
        </div>

        {/* ── ZONA DE PERIGO ── */}
        <div style={{ ...S, border: '1px solid var(--border-red)' }}>
          <div style={{ fontFamily: 'var(--ff-disp)', fontSize: 18, letterSpacing: '0.05em', marginBottom: 4, color: 'var(--red)' }}>ZONA DE PERIGO</div>
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.28em', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 18 }}>// ações irreversíveis</div>

          {/* Sair da conta */}
          <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-sub)', marginBottom: 10 }}>
              Encerra a sessão atual em todos os dispositivos.
            </div>
            <button
              onClick={signOut}
              className="btn btn-ghost"
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}
            >
              <LogOut size={13} /> sair da conta
            </button>
          </div>

          {/* Deletar conta */}
          <div>
            <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-sub)', marginBottom: 10 }}>
              Deleta permanentemente sua conta e todos os seus dados. Esta ação não pode ser desfeita.
            </div>

            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 'var(--radius)',
                  border: '1px solid var(--border-red)',
                  background: 'transparent', color: 'var(--red)',
                  fontFamily: 'var(--ff-mono)', fontSize: 11, letterSpacing: '0.1em',
                  cursor: 'pointer', transition: 'all var(--fast)',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--red-dim)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              >
                <Trash2 size={13} /> deletar minha conta
              </button>
            ) : (
              <div style={{
                padding: 16, borderRadius: 'var(--radius-md)',
                background: 'var(--red-dim)', border: '1px solid var(--border-red)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <AlertTriangle size={14} color="var(--red)" />
                  <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--red)', letterSpacing: '0.12em' }}>
                    CONFIRMAR EXCLUSÃO
                  </span>
                </div>
                <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.7 }}>
                  Digite <strong style={{ color: 'var(--text)' }}>DELETAR</strong> para confirmar. Todos os seus dados, organizações e configurações serão removidos permanentemente.
                </div>
                <input
                  value={deleteInput}
                  onChange={e => setDeleteInput(e.target.value)}
                  placeholder="DELETAR"
                  style={{
                    width: '100%', padding: '9px 12px', marginBottom: 10,
                    background: 'var(--surface)', border: '1px solid var(--border-red)',
                    color: 'var(--text)', fontFamily: 'var(--ff-mono)', fontSize: 12,
                    borderRadius: 'var(--radius)', outline: 'none', boxSizing: 'border-box',
                  }}
                />
                {deleteError && (
                  <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--red)', marginBottom: 10 }}>
                    {deleteError}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => { setShowDeleteConfirm(false); setDeleteInput(''); setDeleteError('') }}
                    className="btn btn-ghost"
                    style={{ fontSize: 11 }}
                  >
                    cancelar
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleteInput !== 'DELETAR' || deleting}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 16px', borderRadius: 'var(--radius)',
                      border: 'none', background: deleteInput === 'DELETAR' ? 'var(--red)' : 'var(--border)',
                      color: '#fff', fontFamily: 'var(--ff-mono)', fontSize: 11,
                      cursor: deleteInput === 'DELETAR' ? 'pointer' : 'not-allowed',
                      opacity: deleting ? 0.7 : 1, transition: 'all var(--fast)',
                    }}
                  >
                    <Trash2 size={13} /> {deleting ? 'deletando...' : 'deletar conta'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>

      {showMembers && org && <OrgMembersModal key={inviteTab} org={org} initialTab={inviteTab} forceAdmin={isAdmin} onClose={() => { setShowMembers(false); setInviteTab('members') }} />}
    </>
  )
}

function MigrateFromLocalStorage({ orgId }) {
  const [found, setFound] = useState(null)
  const [done, setDone] = useState(false)
  function check() {
    const raw = localStorage.getItem('ods_dashboard_grupos_v2')
    if (!raw) { setFound([]); return }
    try { setFound(JSON.parse(raw)) } catch { setFound([]) }
  }
  async function migrate() {
    if (!found?.length || !orgId) return
    const { supabase } = await import('../lib/supabase')
    const { error } = await supabase.from('groups').insert(found.map(g => ({ org_id: orgId, name: g.repo?.split('/')[1] || g.repo || 'grupo', github_repo: g.repo, status: 'active' })))
    if (!error) setDone(true)
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {!found && <button onClick={check} className="btn btn-ghost" style={{ alignSelf: 'flex-start', fontSize: 10 }}>verificar localStorage</button>}
      {found && found.length === 0 && <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-muted)' }}>nenhum dado encontrado</div>}
      {found?.length > 0 && !done && <>
        <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: '#5aab6e' }}>{found.length} grupo(s) encontrado(s)</div>
        {found.map((g, i) => <div key={i} style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-muted)', padding: '3px 8px', background: 'var(--surface)', borderRadius: 2 }}>{g.repo}</div>)}
        <button onClick={migrate} className="btn btn-primary" style={{ alignSelf: 'flex-start', fontSize: 10 }}>importar para esta organização</button>
      </>}
      {done && <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: '#5aab6e' }}>✓ importado!</div>}
    </div>
  )
}