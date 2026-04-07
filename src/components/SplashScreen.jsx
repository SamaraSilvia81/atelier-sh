import { useEffect, useState } from 'react'
import { useSounds } from '../hooks/useSounds'

const WORD    = 'ATELIER.SH'
const LINES   = ['> iniciando sistema...', '> carregando módulos...', '> autenticando...']
const DELAY   = 110  // ms por letra

export default function SplashScreen({ onDone }) {
  const sounds = useSounds()
  const [typed,   setTyped]   = useState('')
  const [lineIdx, setLineIdx] = useState(0)
  const [fadeOut, setFadeOut] = useState(false)

  // Digitar ATELIER.SH letra a letra
  useEffect(() => {
    if (typed.length >= WORD.length) return
    const t = setTimeout(() => {
      sounds.play('typing')
      setTyped(WORD.slice(0, typed.length + 1))
    }, DELAY)
    return () => clearTimeout(t)
  }, [typed])

  // Avançar as linhas de log após o título completo
  useEffect(() => {
    if (typed.length < WORD.length) return
    if (lineIdx >= LINES.length) {
      // todas as linhas mostradas → aguarda 500ms e faz fade-out
      const t = setTimeout(() => {
        setFadeOut(true)
        setTimeout(onDone, 500)
      }, 500)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setLineIdx(i => i + 1), 380)
    return () => clearTimeout(t)
  }, [typed, lineIdx])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 28,
      opacity: fadeOut ? 0 : 1,
      transition: 'opacity 0.5s ease',
      pointerEvents: 'none',
    }}>
      {/* glow de fundo */}
      <div style={{
        position: 'absolute', top: '35%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 500, height: 300,
        background: 'radial-gradient(ellipse, rgba(158,26,23,0.12), transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* título sendo digitado */}
      <div style={{
        fontFamily: 'var(--ff-disp)',
        fontSize: 'clamp(2.5rem, 8vw, 5rem)',
        letterSpacing: '0.12em',
        color: 'var(--text)',
        lineHeight: 1,
        position: 'relative',
      }}>
        {typed.split('').map((ch, i) => (
          <span key={i} style={{ color: ch === '.' ? 'var(--red)' : 'inherit' }}>{ch}</span>
        ))}
        {/* cursor piscando */}
        <span style={{
          display: 'inline-block',
          width: '0.06em', height: '0.85em',
          background: 'var(--red)',
          marginLeft: 4,
          verticalAlign: 'middle',
          animation: 'cursor-blink 0.75s step-end infinite',
        }} />
      </div>

      {/* linhas de log abaixo */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minHeight: 72 }}>
        {LINES.slice(0, lineIdx).map((line, i) => (
          <div key={i} style={{
            fontFamily: 'var(--ff-mono)',
            fontSize: 11,
            letterSpacing: '0.18em',
            color: i === lineIdx - 1 ? 'var(--text-muted)' : 'var(--text-dim)',
            animation: 'fade-in-line 0.25s ease',
          }}>
            {line}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes cursor-blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes fade-in-line { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  )
}
