import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Pen, MessageSquare, Check, Trash2, RotateCcw, Download, Hand, MousePointer, ClipboardList, Plus, Minus, Eraser, Highlighter, Camera, GitBranch } from 'lucide-react'
import html2canvas from 'html2canvas'
import { useSounds } from '../../hooks/useSounds'
import { useReview } from '../../hooks/useReview'

// URL do proxy — vem do Supabase via useSettings, espelhado no localStorage
function getProxyUrl() { return import.meta.env.VITE_PROXY_URL || localStorage.getItem('atelier_proxy_url') || 'http://localhost:3131' }

const TOOLS = [
  { id: 'select',  icon: <MousePointer size={14} />,  label: 'selecionar (v)' },
  { id: 'pan',     icon: <Hand size={14} />,          label: 'mover (h)' },
  { id: 'comment', icon: <MessageSquare size={14} />,  label: 'comentário (c)' },
  { id: 'check',   icon: <Check size={14} />,          label: 'ok (k)' },
  { id: 'cross',   icon: <X size={14} />,              label: 'corrigir (x)' },
  { id: 'draw',    icon: <Pen size={14} />,             label: 'desenhar (d)' },
  { id: 'highlight', icon: <Highlighter size={14} />,  label: 'marca-texto (m)' },
  { id: 'eraser',    icon: <Eraser size={14} />,          label: 'borracha (e)' },
]

const markerColor = { comment: '#4a90e2', check: '#5aab6e', cross: '#C0211C' }
const markerIcon  = { comment: '💬', check: '✓', cross: '✕' }

const cursorMap = {
  select:  'default',
  pan:     'grab',
  comment: 'crosshair',
  check:   'crosshair',
  cross:   'crosshair',
  draw:      'crosshair',
  highlight: 'text',
  eraser:    'cell',
}

export default function ReviewPanel({ group, orgId, onClose }) {
  const defaultUrl = group.github_repo
    ? `https://${group.github_repo.split('/')[0]}.github.io/${group.github_repo.split('/')[1]}`
    : ''

  const review = useReview(group.id, orgId)
  const sounds  = useSounds()

  const [customUrl,  setCustomUrl]  = useState(defaultUrl)
  const [loadedUrl,  setLoadedUrl]  = useState(defaultUrl)
  const [tool,       setTool]       = useState('select')
  const [drawing,    setDrawing]    = useState(false)
  const [currentPath,setCurrentPath]= useState([])
  const [editingId,  setEditingId]  = useState(null)
  const [newText,    setNewText]    = useState('')
  const [iframeBlocked, setIframeBlocked] = useState(false)
  const [iframeKey,  setIframeKey]  = useState(0)
  const [viewport,   setViewport]   = useState('desktop')
  const [isPanning,  setIsPanning]  = useState(false)
  const [panStart,   setPanStart]   = useState({ x: 0, y: 0 })
  const [showChecklist, setShowChecklist] = useState(false)
  const [penColor,  setPenColor]  = useState('#C0211C')
  const [penWidth,  setPenWidth]  = useState(2.5)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [proxyAvailable, setProxyAvailable] = useState(false)
  const [useProxy, setUseProxy] = useState(false)
  const [checklist, setChecklist]   = useState(() => {
    try { return JSON.parse(localStorage.getItem(`atelier_checklist_${group.id}`) || '[]') } catch { return [] }
  })
  const [newCheckItem, setNewCheckItem] = useState('')

  const overlayRef   = useRef()
  const containerRef = useRef()
  const svgRef       = useRef()
  const iframeRef    = useRef()
  const [capturing,  setCapturing]  = useState(false)

  // Suprimir scanline do Atelier enquanto Review Editor está aberto
  useEffect(() => {
    document.body.classList.add('review-open')
    return () => document.body.classList.remove('review-open')
  }, [])

  // Atalhos de teclado estilo Figma
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      const map = { v: 'select', h: 'pan', c: 'comment', k: 'check', x: 'cross', d: 'draw', m: 'highlight', e: 'eraser' }
      if (map[e.key.toLowerCase()]) setTool(map[e.key.toLowerCase()])
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Verificar se proxy local está disponível (sem sumir — polling suave)
  useEffect(() => {
    let mounted = true
    async function check() {
      try {
        const r = await fetch(`${getProxyUrl()}/health`, { signal: AbortSignal.timeout(1200) })
        if (mounted) setProxyAvailable(r.ok)
      } catch {
        if (mounted) setProxyAvailable(false)
      }
    }
    check()
    const interval = setInterval(check, 8000) // recheck a cada 8s
    return () => { mounted = false; clearInterval(interval) }
  }, [])

  // Carregar URL salva no Supabase
  useEffect(() => {
    if (!review.loading && review.url && !loadedUrl) {
      setCustomUrl(review.url)
      setLoadedUrl(review.url)
    }
  }, [review.loading])

  const save = useCallback((ann, pths, lu) => {
    review.save({ annotations: ann, paths: pths, url: lu ?? loadedUrl })
  }, [review.save, loadedUrl])

  // helpers
  function getPos(e) {
    const rect = overlayRef.current.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }
  function pathD(points) {
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  }

  // handlers
  function handleOverlayClick(e) {
    if (tool === 'draw' || tool === 'pan') return
    const pos = getPos(e)

    // Borracha — remove anotação mais próxima do clique (raio 30px)
    if (tool === 'eraser') {
      const RADIUS = 30
      const closest = review.annotations.reduce((best, ann) => {
        const dist = Math.sqrt(Math.pow(ann.x - pos.x, 2) + Math.pow(ann.y - pos.y, 2))
        return dist < RADIUS && dist < (best?.dist ?? Infinity) ? { ann, dist } : best
      }, null)
      if (closest) {
        removeAnnotation(closest.ann.id)
        sounds.play('delete')
      }
      return
    }

    const id  = Date.now()
    const next = [...review.annotations, { id, type: tool, x: pos.x, y: pos.y, text: '', resolved: false }]
    review.setAnnotations(next)
    save(next, review.paths)
    if (tool === 'comment') { setEditingId(id); setNewText('') }
    sounds.play('click')
  }

  function handleMouseDown(e) {
    if (tool === 'draw' || tool === 'highlight') {
      setDrawing(true)
      setCurrentPath([getPos(e)])
    } else if (tool === 'eraser') {
      // Borracha em traços — apaga o traço mais próximo do ponto de clique
      const pos = getPos(e)
      const RADIUS = 20
      const closest = review.paths.reduce((best, path) => {
        const minDist = path.points.reduce((m, pt) => {
          return Math.min(m, Math.sqrt(Math.pow(pt.x - pos.x, 2) + Math.pow(pt.y - pos.y, 2)))
        }, Infinity)
        return minDist < RADIUS && minDist < (best?.dist ?? Infinity) ? { path, dist: minDist } : best
      }, null)
      if (closest) removePath(closest.path.id)
    } else if (tool === 'pan') {
      setIsPanning(true)
      setPanStart({ x: e.clientX, y: e.clientY })
    }
  }

  function handleMouseMove(e) {
    if (drawing && (tool === 'draw' || tool === 'highlight')) {
      setCurrentPath(prev => [...prev, getPos(e)])
      // Som de lápis a cada ~60ms para não sobrecarregar
      if (!handleMouseMove._lastDraw || Date.now() - handleMouseMove._lastDraw > 60) {
        handleMouseMove._lastDraw = Date.now()
        sounds.play('drawing')
      }
    } else if (isPanning && containerRef.current) {
      const dx = e.clientX - panStart.x
      const dy = e.clientY - panStart.y
      containerRef.current.scrollLeft -= dx
      containerRef.current.scrollTop  -= dy
      setPanStart({ x: e.clientX, y: e.clientY })
    }
  }

  function handleMouseUp() {
    if (drawing) {
      setDrawing(false)
      if (currentPath.length > 1) {
        const next = [...review.paths, { id: Date.now(), points: currentPath, color: tool === 'highlight' ? penColor + '66' : penColor, width: tool === 'highlight' ? penWidth * 5 : penWidth, mode: tool }]
        review.setPaths(next)
        save(review.annotations, next)
      }
      setCurrentPath([])
    }
    if (isPanning) setIsPanning(false)
  }

  function saveComment(id) {
    const next = review.annotations.map(a => a.id === id ? { ...a, text: newText } : a)
    review.setAnnotations(next)
    save(next, review.paths)
    setEditingId(null)
    setNewText('')
    sounds.play('save')
  }

  function removeAnnotation(id) {
    const next = review.annotations.filter(a => a.id !== id)
    review.setAnnotations(next)
    save(next, review.paths)
  }

  function removePath(id) {
    const next = review.paths.filter(p => p.id !== id)
    review.setPaths(next)
    save(review.annotations, next)
  }

  function clearAll() {
    review.setAnnotations([])
    review.setPaths([])
    review.clear()
    sounds.play('delete')
  }

  // ── CHECKLIST ──────────────────────────────────────────
  function saveChecklist(list) {
    setChecklist(list)
    try { localStorage.setItem(`atelier_checklist_${group.id}`, JSON.stringify(list)) } catch {}
  }
  function addCheckItem() {
    if (!newCheckItem.trim()) return
    saveChecklist([...checklist, { id: Date.now(), text: newCheckItem.trim(), done: false }])
    setNewCheckItem('')
  }
  function toggleCheckItem(id) {
    saveChecklist(checklist.map(i => i.id === id ? { ...i, done: !i.done } : i))
  }
  function removeCheckItem(id) {
    saveChecklist(checklist.filter(i => i.id !== id))
  }

  function handleLoadUrl() {
    setIframeBlocked(false)
    setIframeKey(k => k + 1)
    const finalUrl = useProxy && proxyAvailable
      ? `${getProxyUrl()}/proxy?url=${encodeURIComponent(customUrl.startsWith('http') ? customUrl : 'https://' + customUrl)}`
      : customUrl
    setLoadedUrl(finalUrl)
    save(review.annotations, review.paths, customUrl)
  }

  // Gerar SVG como imagem base64
  function svgToDataUrl() {
    if (!svgRef.current) return null
    const svg = svgRef.current
    const { width, height } = svg.getBoundingClientRect()
    // Clonar e definir dimensões explícitas
    const clone = svg.cloneNode(true)
    clone.setAttribute('width', width)
    clone.setAttribute('height', height)
    const str = new XMLSerializer().serializeToString(clone)
    return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(str)))
  }

  // Exportar como relatório HTML (abre nova aba, usuário imprime ou salva)
  async function exportImage() {
    setCapturing(true)
    try {
      const svgData = svgToDataUrl()
      const date = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
      const comments = review.annotations.filter(a => a.type === 'comment' && a.text)
      const checks   = review.annotations.filter(a => a.type === 'check')
      const crosses  = review.annotations.filter(a => a.type === 'cross')

      const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>Review · ${group.name}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Courier New', monospace; background: #080606; color: #F0EDE8; padding: 40px; }
    h1 { font-size: 32px; letter-spacing: 0.06em; color: #F0EDE8; margin-bottom: 4px; }
    .sub { font-size: 10px; letter-spacing: 0.3em; color: #4e3e3e; text-transform: uppercase; margin-bottom: 32px; }
    .url { font-size: 11px; color: #8a7272; margin-bottom: 24px; padding: 8px 12px; border: 1px solid #251818; border-radius: 2px; word-break: break-all; }
    .section { margin-bottom: 28px; }
    .section-title { font-size: 9px; letter-spacing: 0.35em; text-transform: uppercase; color: #C0211C; margin-bottom: 12px; display: flex; align-items: center; gap: 10px; }
    .section-title::after { content: ''; flex: 1; height: 1px; background: #251818; }
    .annotation { padding: 10px 14px; border: 1px solid #251818; border-radius: 2px; margin-bottom: 8px; font-size: 12px; line-height: 1.6; }
    .annotation .pos { font-size: 9px; color: #4e3e3e; margin-bottom: 4px; }
    .annotation .text { color: #C4B8B0; }
    .check-item { color: #5aab6e; font-size: 12px; padding: 4px 0; }
    .cross-item { color: #C0211C; font-size: 12px; padding: 4px 0; }
    .stats { display: flex; gap: 20px; margin-bottom: 28px; }
    .stat { text-align: center; padding: 12px 20px; border: 1px solid #251818; border-radius: 2px; }
    .stat-n { font-size: 24px; color: #C0211C; }
    .stat-l { font-size: 9px; letter-spacing: 0.2em; color: #4e3e3e; text-transform: uppercase; margin-top: 4px; }
    .drawing { margin-bottom: 28px; border: 1px solid #251818; border-radius: 2px; overflow: hidden; position: relative; min-height: 200px; background: #0f0d0d; }
    .drawing img { width: 100%; display: block; }
    .drawing .no-site { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 10px; letter-spacing: 0.25em; color: #251818; text-transform: uppercase; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #251818; font-size: 9px; letter-spacing: 0.2em; color: #4e3e3e; text-transform: uppercase; display: flex; justify-content: space-between; }
    @media print { body { background: white; color: black; } }
  </style>
</head>
<body>
  <h1>REVIEW EDITOR</h1>
  <div class="sub">atelier.sh · ${group.name} · ${date}</div>
  <div class="url">› ${loadedUrl || 'sem url'}</div>

  <div class="stats">
    <div class="stat"><div class="stat-n">${review.annotations.length}</div><div class="stat-l">anotações</div></div>
    <div class="stat"><div class="stat-n">${review.paths.length}</div><div class="stat-l">traços</div></div>
    <div class="stat"><div class="stat-n">${checks.length}</div><div class="stat-l">ok</div></div>
    <div class="stat"><div class="stat-n">${crosses.length}</div><div class="stat-l">corrigir</div></div>
  </div>

  ${svgData ? `
  <div class="section-title">desenhos e marcações</div>
  <div class="drawing">
    <img src="${svgData}" alt="marcações" />
    <div class="no-site">site não capturável por segurança do browser — marcações preservadas</div>
  </div>` : ''}

  ${comments.length > 0 ? `
  <div class="section">
    <div class="section-title">comentários (${comments.length})</div>
    ${comments.map((a, i) => `
    <div class="annotation">
      <div class="pos">// comentário ${i + 1} · posição (${Math.round(a.x)}, ${Math.round(a.y)})</div>
      <div class="text">${a.text}</div>
    </div>`).join('')}
  </div>` : ''}

  ${checks.length > 0 ? `
  <div class="section">
    <div class="section-title">itens ok (${checks.length})</div>
    ${checks.map((_, i) => `<div class="check-item">✓ item ${i + 1}</div>`).join('')}
  </div>` : ''}

  ${crosses.length > 0 ? `
  <div class="section">
    <div class="section-title">itens para corrigir (${crosses.length})</div>
    ${crosses.map((_, i) => `<div class="cross-item">✗ item ${i + 1}</div>`).join('')}
  </div>` : ''}

  <div class="footer">
    <span>atelier.sh · review editor</span>
    <span>${new Date().toISOString()}</span>
  </div>
</body>
</html>`

      // Abrir relatório em nova aba (usuário pode imprimir/salvar como PDF)
      const blob = new Blob([html], { type: 'text/html' })
      const url  = URL.createObjectURL(blob)
      window.open(url, '_blank')

      // Também disponibilizar download do .md para GitHub
      const md = [
        '# Review · ' + group.name,
        '',
        '> **Grupo:** ' + group.name,
        '> **URL:** ' + (loadedUrl || '—'),
        '> **Data:** ' + date,
        '> **Anotações:** ' + review.annotations.length + ' · **Traços:** ' + review.paths.length,
        '',
        '---',
        '',
        '## Estatísticas',
        '',
        '| Métrica | Valor |',
        '|---------|-------|',
        '| Total de anotações | ' + review.annotations.length + ' |',
        '| Traços desenhados | ' + review.paths.length + ' |',
        '| Itens ok (✓) | ' + checks.length + ' |',
        '| Itens a corrigir (✗) | ' + crosses.length + ' |',
        '',
        comments.length > 0 ? '## Comentários\n\n' + comments.map(function(a, i) {
          return '### Comentário ' + (i+1) + '\n\n> pos: (' + Math.round(a.x) + ', ' + Math.round(a.y) + ')\n\n' + a.text
        }).join('\n\n') : '',
        '',
        '---',
        '',
        '*Gerado pelo atelier.sh · ' + new Date().toISOString() + '*',
      ].join('\n')

    } catch (e) {
      console.error('Erro ao exportar:', e)
    } finally {
      setCapturing(false)
    }
  }

  // Enviar relatório .md para GitHub
  async function pushToGitHub() {
    const githubToken = localStorage.getItem('atelier_github_token')
    if (!githubToken) { alert('Configure o GitHub token nas Configurações do Atelier.sh'); return }

    const repo = prompt('Repositório de destino:', 'ETE-CiceroDias/ete-docs-mod3')
    if (!repo) return
    const filePath = prompt('Caminho do arquivo:', 'reviews/' + group.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '/review-' + Date.now() + '.md')
    if (!filePath) return

    const date = new Date().toLocaleDateString('pt-BR')
    const comments = review.annotations.filter(function(a) { return a.type === 'comment' && a.text })
    const checks   = review.annotations.filter(function(a) { return a.type === 'check' })
    const crosses  = review.annotations.filter(function(a) { return a.type === 'cross' })

    const mdLines = [
      '# Review · ' + group.name,
      '',
      '> **Grupo:** ' + group.name,
      '> **URL:** ' + (loadedUrl || '—'),
      '> **Data:** ' + date,
      '',
      '## Resumo',
      '',
      '| Anotações | Traços | Ok | Corrigir |',
      '|-----------|--------|-----|---------|',
      '| ' + review.annotations.length + ' | ' + review.paths.length + ' | ' + checks.length + ' | ' + crosses.length + ' |',
      '',
    ]
    if (comments.length > 0) {
      mdLines.push('## Comentários', '')
      comments.forEach(function(a, i) {
        mdLines.push('### Comentário ' + (i+1), '', a.text, '')
      })
    }
    mdLines.push('---', '', '*atelier.sh · ' + new Date().toISOString() + '*')
    const md = mdLines.join('\n')

    try {
      let sha = null
      const GHBASE = 'https://api.github.com'
      const checkRes = await fetch(GHBASE + '/repos/' + repo + '/contents/' + filePath, {
        headers: { Authorization: 'Bearer ' + githubToken, Accept: 'application/vnd.github+json' }
      })
      if (checkRes.ok) { const d = await checkRes.json(); sha = d.sha }

      const res = await fetch(GHBASE + '/repos/' + repo + '/contents/' + filePath, {
        method: 'PUT',
        headers: { Authorization: 'Bearer ' + githubToken, 'Content-Type': 'application/json', Accept: 'application/vnd.github+json' },
        body: JSON.stringify({
          message: 'review: ' + group.name + ' · ' + date,
          content: btoa(unescape(encodeURIComponent(md))),
          ...(sha ? { sha } : {})
        })
      })
      if (res.ok) {
        const data = await res.json()
        alert('✓ Enviado! ' + (data.content?.html_url || ''))
      } else {
        const err = await res.json()
        alert('Erro: ' + err.message)
      }
    } catch (e) { alert('Erro: ' + e.message) }
  }

  const anns  = review.annotations
  const pths  = review.paths

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* ── TOOLBAR ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 16px', borderBottom: '1px solid var(--border)',
        background: 'var(--bg-alt)', flexShrink: 0, flexWrap: 'wrap',
      }}>
        {/* Fechar */}
        <button onClick={onClose} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontFamily: 'var(--ff-mono)', fontSize: 11, letterSpacing: '0.15em',
          color: 'var(--text-muted)', background: 'none',
          border: '1px solid var(--border)', borderRadius: 'var(--radius)',
          padding: '5px 10px', cursor: 'pointer',
        }}>
          <X size={12} /> fechar
        </button>

        <div style={{ width: 1, height: 20, background: 'var(--border)' }} />

        {/* URL input */}
        <div style={{ display: 'flex', gap: 6, flex: 1, minWidth: 200 }}>
          <input
            value={customUrl}
            onChange={e => setCustomUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLoadUrl()}
            placeholder="cole a URL do projeto..."
            style={{
              flex: 1, padding: '6px 10px',
              background: 'var(--surface)', border: '1px solid var(--border)',
              color: 'var(--text)', fontFamily: 'var(--ff-mono)', fontSize: 11,
              borderRadius: 'var(--radius)', outline: 'none',
            }}
          />
          <button onClick={handleLoadUrl} className="btn btn-primary" style={{ padding: '6px 12px' }}>›</button>
          {proxyAvailable && (
            <button onClick={() => setUseProxy(p => !p)} title="Usar proxy local (permite qualquer site)" style={{
              padding: '5px 10px', fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '0.08em',
              background: useProxy ? 'rgba(90,171,110,0.15)' : 'var(--surface)',
              border: `1px solid ${useProxy ? '#5aab6e' : 'var(--border)'}`,
              borderRadius: 'var(--radius)', color: useProxy ? '#5aab6e' : 'var(--text-dim)',
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}>
              {useProxy ? '⬡ proxy on' : '⬡ proxy off'}
            </button>
          )}
        </div>

        <div style={{ width: 1, height: 20, background: 'var(--border)' }} />

        {/* Ferramentas */}
        {TOOLS.map(t => (
          <button key={t.id} onClick={() => setTool(t.id)} title={t.label} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '5px 10px', borderRadius: 'var(--radius)',
            background: tool === t.id ? 'var(--red)' : 'var(--surface)',
            color: tool === t.id ? '#fff' : 'var(--text-muted)',
            border: `1px solid ${tool === t.id ? 'var(--red)' : 'var(--border)'}`,
            fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '0.1em',
            cursor: 'pointer', transition: 'all var(--fast)',
          }}>
            {t.icon}
          </button>
        ))}

        <div style={{ width: 1, height: 20, background: 'var(--border)' }} />

        {/* Viewport */}
        {['desktop','tablet','mobile'].map(v => (
          <button key={v} onClick={() => setViewport(v)} style={{
            fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '0.08em',
            padding: '4px 10px', borderRadius: 'var(--radius)',
            background: viewport === v ? 'var(--surface-2)' : 'transparent',
            color: viewport === v ? 'var(--red)' : 'var(--text-dim)',
            border: `1px solid ${viewport === v ? 'var(--border-red)' : 'var(--border)'}`,
            cursor: 'pointer',
          }}>
            {v === 'desktop' ? '⬜' : v === 'tablet' ? '▭' : '▯'} {v}
          </button>
        ))}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button onClick={() => setShowChecklist(s => !s)} title="checklist" style={{
            padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 5,
            background: showChecklist ? 'var(--red-dim)' : 'var(--surface)',
            border: `1px solid ${showChecklist ? 'var(--red)' : 'var(--border)'}`,
            borderRadius: 'var(--radius)', color: showChecklist ? 'var(--text)' : 'var(--text-muted)', cursor: 'pointer',
            fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '0.1em',
          }}>
            <ClipboardList size={13} />
          </button>
          {/* Separador */}
          <div style={{ width: 1, height: 24, background: 'var(--border)', margin: '0 2px' }} />

          {/* Cor da caneta */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowColorPicker(p => !p)}
              title="cor da caneta"
              style={{
                width: 20, height: 20, borderRadius: '50%',
                background: penColor, border: '2px solid var(--border)',
                cursor: 'pointer', flexShrink: 0,
                boxShadow: showColorPicker ? `0 0 0 2px ${penColor}66` : 'none',
                transition: 'all var(--fast)',
              }}
            />
            {showColorPicker && (
              <div style={{
                position: 'absolute', top: 32, left: -60, zIndex: 100,
                background: 'var(--bg-card)', border: '1px solid var(--border-red)',
                borderRadius: 'var(--radius-md)', padding: 12,
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                display: 'flex', flexDirection: 'column', gap: 10, minWidth: 180,
              }}>
                <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.25em', color: 'var(--text-dim)', textTransform: 'uppercase' }}>cor</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {['#C0211C','#F0EDE8','#5aab6e','#4a90e2','#c8922a','#a259ff','#EC4899','#000000'].map(col => (
                    <button key={col} onClick={() => { setPenColor(col); setShowColorPicker(false) }} style={{
                      width: 24, height: 24, borderRadius: '50%', background: col,
                      border: penColor === col ? '2px solid var(--text)' : '2px solid var(--border)',
                      cursor: 'pointer', transition: 'border var(--fast)',
                    }} />
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.2em', color: 'var(--text-dim)', textTransform: 'uppercase', flexShrink: 0 }}>custom</div>
                  <input type="color" value={penColor} onChange={e => setPenColor(e.target.value)}
                    style={{ width: 36, height: 24, border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', background: 'none', padding: 0 }} />
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.2em', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 6 }}>espessura</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[1, 2.5, 5, 10].map(w => (
                      <button key={w} onClick={() => setPenWidth(w)} style={{
                        width: 32, height: 32, borderRadius: 'var(--radius)',
                        background: penWidth === w ? 'var(--red-dim)' : 'var(--surface)',
                        border: penWidth === w ? '1px solid var(--border-red)' : '1px solid var(--border)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <div style={{ width: Math.min(w * 3, 20), height: w, background: penColor, borderRadius: 99 }} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={{ width: 1, height: 24, background: 'var(--border)', margin: '0 2px' }} />

          <button onClick={exportImage} disabled={capturing} title="exportar relatório (HTML + .md)" style={{ padding: 6, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: capturing ? 'var(--red)' : 'var(--text-muted)', cursor: 'pointer', opacity: capturing ? 0.7 : 1 }}>
            {capturing ? <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 9 }}>...</span> : <Camera size={13} />}
          </button>
          <button onClick={pushToGitHub} title="enviar ao GitHub" style={{ padding: 6, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <GitBranch size={13} />
          </button>
          <button onClick={clearAll} title="limpar tudo" style={{ padding: 6, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <RotateCcw size={13} />
          </button>
        </div>
      </div>

      {/* ── CORPO ── */}
      <div ref={containerRef} style={{ flex: 1, position: 'relative', overflow: 'auto', display: 'flex', justifyContent: 'center', background: 'var(--bg-alt)' }}>

        {/* Conteúdo (iframe ou mensagens) */}
        {!loadedUrl ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, flexDirection: 'column', gap: 16 }}>
            <div style={{ fontFamily: 'var(--ff-disp)', fontSize: 32, color: 'var(--text-dim)', letterSpacing: '0.1em' }}>SEM URL</div>
            <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-dim)' }}>cole a URL acima e pressione enter</div>
          </div>
        ) : iframeBlocked ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, flexDirection: 'column', gap: 16, padding: 32 }}>
            <div style={{ fontFamily: 'var(--ff-disp)', fontSize: 28, color: 'var(--red)', letterSpacing: '0.08em' }}>SITE BLOQUEADO</div>
            <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.9, maxWidth: 460 }}>
              Este site usa <code style={{ color: 'var(--red)', fontSize: 10 }}>X-Frame-Options: DENY</code> que impede embedding em iframes.<br /><br />
              {proxyAvailable ? (
                <><span style={{ color: '#5aab6e' }}>✓ Proxy disponível!</span> Ative <strong style={{ color: 'var(--text)' }}>proxy on</strong> na barra acima e clique em carregar.</>
              ) : (
                <>
                  <span style={{ color: 'var(--text-sub)', display: 'block', marginBottom: 8 }}>Sites que funcionam sem proxy:</span>
                  <span style={{ color: '#5aab6e' }}>✓ github.io &nbsp;·&nbsp; vercel.app &nbsp;·&nbsp; netlify.app &nbsp;·&nbsp; render.com</span>
                  <br /><br />
                  <span style={{ color: 'var(--text-dim)', display: 'block' }}>Para qualquer site rode o proxy local:</span>
                  <code style={{ color: 'var(--red)', fontSize: 10, display: 'block', marginTop: 4 }}>node proxy-server.js</code>
                </>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button onClick={() => { setIframeBlocked(false); setIframeKey(k => k + 1) }}
                style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '7px 16px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-muted)', cursor: 'pointer' }}>
                ↺ tentar novamente
              </button>
              <a href={loadedUrl.startsWith('http') ? loadedUrl : `https://${loadedUrl}`} target="_blank" rel="noreferrer"
                style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '7px 16px', borderRadius: 'var(--radius)', border: '1px solid var(--border-red)', background: 'var(--red-dim)', color: 'var(--red)', cursor: 'pointer', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                ↗ abrir em nova aba
              </a>
            </div>
          </div>
        ) : (
          <div style={{
            width: viewport === 'desktop' ? '100%' : viewport === 'tablet' ? '768px' : '375px',
            minHeight: '100%', flexShrink: 0, position: 'relative',
            boxShadow: viewport !== 'desktop' ? '0 0 0 1px var(--border-red)' : 'none',
            transition: 'width 0.3s var(--ease)',
          }}>
            <iframe
              ref={iframeRef}
              key={iframeKey}
              src={loadedUrl.startsWith('http') ? loadedUrl : `https://${loadedUrl}`}
              style={{ width: '100%', height: '100%', border: 'none', display: 'block', minHeight: 600 }}
              title={group.name}
              onError={() => setIframeBlocked(true)}
              onLoad={() => setIframeBlocked(false)}

            />
          </div>
        )}

        {/* Fechar color picker ao clicar fora */}
      {showColorPicker && <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={() => setShowColorPicker(false)} />}

      {/* Overlay de anotações — invisível quando select (deixa o iframe interativo) */}
        <div
          ref={overlayRef}
          onClick={handleOverlayClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            position: 'absolute', inset: 0,
            cursor: isPanning ? 'grabbing' : cursorMap[tool] || 'crosshair',
            zIndex: 10,
            // select = cursor livre, o iframe fica clicável normalmente
            pointerEvents: tool === 'select' ? 'none' : (tool === 'pan' && !isPanning ? 'none' : 'all'),
          }}
        >
          {/* SVG desenhos */}
          <svg ref={svgRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
            {pths.map(p => (
              <g key={p.id} style={{ pointerEvents: 'auto', cursor: 'pointer' }} onClick={() => removePath(p.id)}>
                <path d={pathD(p.points)} fill="none" stroke={p.color || "#C0211C"} strokeWidth={p.width || 2.5} strokeLinecap={p.mode === "highlight" ? "square" : "round"} strokeLinejoin={p.mode === "highlight" ? "miter" : "round"} opacity={p.mode === "highlight" ? 0.5 : 0.85} />
              </g>
            ))}
            {currentPath.length > 1 && (
              <path d={pathD(currentPath)} fill="none" stroke={tool === "highlight" ? penColor + "66" : penColor} strokeWidth={tool === "highlight" ? penWidth * 5 : penWidth} strokeLinecap={tool === "highlight" ? "square" : "round"} strokeLinejoin={tool === "highlight" ? "miter" : "round"} opacity={tool === "highlight" ? 0.5 : 0.85} />
            )}
          </svg>

          {/* Marcadores */}
          {anns.map(ann => (
            <div key={ann.id} style={{ position: 'absolute', left: ann.x, top: ann.y, zIndex: 20, pointerEvents: 'auto' }}>
              <div
                onClick={e => { e.stopPropagation(); if (ann.type === 'comment') { setEditingId(ann.id); setNewText(ann.text) } }}
                style={{
                  width: 24, height: 24, borderRadius: '50% 50% 50% 0',
                  transform: 'rotate(-45deg)',
                  background: markerColor[ann.type] || 'var(--red)',
                  border: '2px solid rgba(255,255,255,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                }}
              >
                <span style={{ transform: 'rotate(45deg)', fontSize: 10 }}>{markerIcon[ann.type]}</span>
              </div>

              {ann.type === 'comment' && (ann.text || editingId === ann.id) && (
                <div onClick={e => e.stopPropagation()} style={{
                  position: 'absolute', left: 28, top: -4,
                  background: 'var(--bg-card)', border: '1px solid var(--border-red)',
                  borderRadius: 'var(--radius-md)', padding: 10, minWidth: 200, maxWidth: 280,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                }}>
                  {editingId === ann.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <textarea
                        autoFocus
                        value={newText}
                        onChange={e => setNewText(e.target.value)}
                        placeholder="escreva a anotação..."
                        rows={3}
                        style={{
                          background: 'var(--surface)', border: '1px solid var(--border)',
                          color: 'var(--text)', fontFamily: 'var(--ff-body)', fontSize: 12,
                          padding: 8, borderRadius: 'var(--radius)', outline: 'none', resize: 'none',
                        }}
                      />
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => saveComment(ann.id)} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', padding: '5px 8px', fontSize: 10 }}>salvar</button>
                        <button onClick={() => removeAnnotation(ann.id)} style={{ padding: '5px 8px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', color: 'var(--text-dim)', background: 'transparent', fontSize: 10, fontFamily: 'var(--ff-mono)', cursor: 'pointer' }}>remover</button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontFamily: 'var(--ff-body)', fontSize: 12, color: 'var(--text-sub)', lineHeight: 1.5, marginBottom: 6 }}>{ann.text}</div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => { setEditingId(ann.id); setNewText(ann.text) }} style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--text-dim)', cursor: 'pointer', background: 'none', border: 'none' }}>editar</button>
                        <button onClick={() => removeAnnotation(ann.id)} style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, color: 'var(--red)', cursor: 'pointer', background: 'none', border: 'none' }}>remover</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {ann.type !== 'comment' && (
                <button
                  onClick={e => { e.stopPropagation(); removeAnnotation(ann.id) }}
                  style={{ position: 'absolute', left: 26, top: -4, width: 16, height: 16, borderRadius: '50%', background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, cursor: 'pointer' }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Pan overlay */}
        {tool === 'pan' && !isPanning && (
          <div onMouseDown={handleMouseDown} style={{ position: 'absolute', inset: 0, cursor: 'grab', zIndex: 11, background: 'transparent' }} />
        )}

        {/* Status hint */}
        <div style={{
          position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--bg-card)', border: '1px solid var(--border-red)',
          borderRadius: 'var(--radius-md)', padding: '5px 12px',
          fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '0.15em',
          color: 'var(--text-muted)', textTransform: 'uppercase', pointerEvents: 'none',
          zIndex: 20, whiteSpace: 'nowrap',
        }}>
          {TOOLS.find(t => t.id === tool)?.label} · {anns.length} anotações · {pths.length} traços
        </div>
      </div>

      {/* ── PAINEL LATERAL de anotações ── */}
      {anns.length > 0 && !showChecklist && (
        <div style={{
          position: 'absolute', right: 0, top: 57, bottom: 0, width: 260,
          background: 'var(--bg-alt)', borderLeft: '1px solid var(--border)',
          overflowY: 'auto', zIndex: 15, padding: 12,
        }}>
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.3em', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 10 }}>
            anotações ({anns.length})
          </div>
          {anns.map(ann => (
            <div key={ann.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '8px 10px', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: ann.text ? 5 : 0 }}>
                <span style={{ fontSize: 11 }}>{markerIcon[ann.type]}</span>
                <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '0.1em', color: markerColor[ann.type], textTransform: 'uppercase' }}>{ann.type}</span>
                <button onClick={() => removeAnnotation(ann.id)} style={{ color: 'var(--text-dim)', cursor: 'pointer', background: 'none', border: 'none', marginLeft: 'auto' }}>×</button>
              </div>
              {ann.text && <div style={{ fontFamily: 'var(--ff-body)', fontSize: 12, color: 'var(--text-sub)', lineHeight: 1.5 }}>{ann.text}</div>}
            </div>
          ))}
        </div>
      )}

      {/* ── PAINEL DE CHECKLIST ── */}
      {showChecklist && (
        <div style={{
          position: 'absolute', right: 0, top: 57, bottom: 0, width: 280,
          background: 'var(--bg-alt)', borderLeft: '1px solid var(--border)',
          overflowY: 'auto', zIndex: 15, padding: 12, display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.3em', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 4 }}>
            checklist · {checklist.filter(i => i.done).length}/{checklist.length}
          </div>

          {/* Input novo item */}
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              value={newCheckItem}
              onChange={e => setNewCheckItem(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCheckItem()}
              placeholder="adicionar item..."
              style={{
                flex: 1, padding: '6px 8px', background: 'var(--surface)',
                border: '1px solid var(--border)', color: 'var(--text)',
                fontFamily: 'var(--ff-mono)', fontSize: 11, borderRadius: 'var(--radius)', outline: 'none',
              }}
            />
            <button onClick={addCheckItem} style={{ padding: '6px 10px', background: 'var(--red)', border: 'none', borderRadius: 'var(--radius)', color: '#fff', cursor: 'pointer' }}>
              <Plus size={12} />
            </button>
          </div>

          {/* Lista */}
          {checklist.length === 0 && (
            <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-dim)', padding: '8px 0' }}>
              // nenhum item ainda
            </div>
          )}
          {checklist.map(item => (
            <div key={item.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              background: 'var(--bg-card)', border: `1px solid ${item.done ? 'var(--border)' : 'var(--border-red)'}`,
              borderRadius: 'var(--radius-md)', padding: '8px 10px',
              opacity: item.done ? 0.55 : 1, transition: 'opacity var(--fast)',
            }}>
              <button onClick={() => toggleCheckItem(item.id)} style={{
                width: 16, height: 16, borderRadius: 'var(--radius)', flexShrink: 0, marginTop: 1,
                background: item.done ? 'var(--red)' : 'var(--surface)',
                border: `1px solid ${item.done ? 'var(--red)' : 'var(--border-red)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}>
                {item.done && <Check size={10} color="#fff" />}
              </button>
              <span style={{
                flex: 1, fontFamily: 'var(--ff-body)', fontSize: 12, color: 'var(--text-sub)', lineHeight: 1.5,
                textDecoration: item.done ? 'line-through' : 'none',
              }}>{item.text}</span>
              <button onClick={() => removeCheckItem(item.id)} style={{ color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
                <Minus size={11} />
              </button>
            </div>
          ))}

          {checklist.length > 0 && (
            <div style={{ marginTop: 4 }}>
              <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', background: 'var(--red)',
                  width: `${Math.round((checklist.filter(i => i.done).length / checklist.length) * 100)}%`,
                  transition: 'width 0.3s var(--ease)',
                }} />
              </div>
              <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, color: 'var(--text-dim)', marginTop: 4, letterSpacing: '0.15em' }}>
                {Math.round((checklist.filter(i => i.done).length / checklist.length) * 100)}% concluído
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
