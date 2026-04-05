import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

export default function AcceptInvite() {
  const [params]   = useSearchParams()
  const { user }   = useAuth()
  const navigate   = useNavigate()
  const token      = params.get('token')
  const [status, setStatus] = useState('loading') // loading | success | error | needsLogin
  const [msg,    setMsg]    = useState('')

  useEffect(() => {
    if (!token) { setStatus('error'); setMsg('Token inválido ou ausente.'); return }
    if (!user)  { setStatus('needsLogin'); return }
    accept()
  }, [token, user])

  async function accept() {
    setStatus('loading')
    const { data, error } = await supabase.rpc('accept_invite', { invite_token: token })
    if (error || data?.error) {
      setStatus('error')
      setMsg(data?.error || error?.message || 'Erro ao aceitar convite.')
    } else {
      setStatus('success')
      setMsg(`Você entrou como ${data.role}!`)
      setTimeout(() => navigate('/'), 2500)
    }
  }

  const S = (s) => ({
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexDirection: 'column', gap: 16, background: 'var(--bg)', padding: 32,
    ...s
  })

  if (status === 'needsLogin') return (
    <div style={S()}>
      <div style={{ fontFamily: 'var(--ff-disp)', fontSize: 28, letterSpacing: '0.08em' }}>CONVITE RECEBIDO</div>
      <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.8 }}>
        Faça login ou crie uma conta para aceitar o convite.
      </div>
      <button onClick={() => navigate(`/login?redirect=/invite?token=${token}`)} className="btn btn-primary">
        entrar / cadastrar
      </button>
    </div>
  )

  return (
    <div style={S()}>
      <div style={{ fontFamily: 'var(--ff-disp)', fontSize: 28, letterSpacing: '0.08em', color: status === 'error' ? 'var(--red)' : 'var(--text)' }}>
        {status === 'loading' && 'VERIFICANDO...'}
        {status === 'success' && 'CONVITE ACEITO!'}
        {status === 'error'   && 'ERRO'}
      </div>
      {msg && <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 12, color: status === 'error' ? 'var(--red)' : '#5aab6e', textAlign: 'center' }}>{msg}</div>}
      {status === 'success' && <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-dim)' }}>redirecionando...</div>}
      {status === 'error'   && <button onClick={() => navigate('/')} className="btn btn-ghost">voltar ao início</button>}
    </div>
  )
}
