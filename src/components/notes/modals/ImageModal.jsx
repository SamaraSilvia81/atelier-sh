import { useState, useRef } from 'react'
import { X, Upload } from 'lucide-react'

const inp = { width: '100%', padding: '8px 10px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'var(--ff-mono)', fontSize: 11, borderRadius: 'var(--radius)', outline: 'none' }
const lbl = { fontFamily: 'var(--ff-mono)', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-dim)', display: 'block', marginBottom: 5 }

export default function ImageModal({ onInsert, onClose }) {
  const [tab, setTab]         = useState('upload')
  const [url, setUrl]         = useState('')
  const [alt, setAlt]         = useState('')
  const [preview, setPreview] = useState(null)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef()

  function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = e => setPreview(e.target.result)
    reader.readAsDataURL(file)
  }

  const tabStyle = (active) => ({
    flex: 1, padding: '6px 0', fontFamily: 'var(--ff-mono)', fontSize: 10,
    letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer',
    borderBottom: active ? '2px solid var(--red)' : '2px solid transparent',
    color: active ? 'var(--text)' : 'var(--text-dim)',
    background: 'transparent', transition: 'all var(--fast)',
  })

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', zIndex: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-red)', borderRadius: 'var(--radius-md)', width: '100%', maxWidth: 420, padding: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: 'var(--ff-disp)', fontSize: 20, letterSpacing: '0.05em' }}>INSERIR IMAGEM</div>
            <div style={{ fontFamily: 'var(--ff-mono)', fontSize: 9, letterSpacing: '0.25em', color: 'var(--text-dim)', textTransform: 'uppercase', marginTop: 2 }}>// upload ou url</div>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)', cursor: 'pointer' }}><X size={16} /></button>
        </div>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
          <button style={tabStyle(tab === 'upload')} onClick={() => setTab('upload')}><Upload size={10} style={{ display: 'inline', marginRight: 4 }} />upload</button>
          <button style={tabStyle(tab === 'url')}    onClick={() => setTab('url')}>url</button>
        </div>
        {tab === 'upload' ? (
          <>
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files?.[0]) }}
              onClick={() => fileRef.current?.click()}
              style={{ border: `2px dashed ${dragging ? 'var(--red)' : 'var(--border)'}`, borderRadius: 'var(--radius)', padding: 20, textAlign: 'center', cursor: 'pointer', marginBottom: 12, minHeight: 110, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, background: dragging ? 'var(--red-dim)' : 'transparent' }}>
              {preview
                ? <img src={preview} alt="" style={{ maxHeight: 130, maxWidth: '100%', borderRadius: 4, objectFit: 'contain' }} />
                : <><Upload size={24} style={{ color: 'var(--text-dim)' }} /><span style={{ fontFamily: 'var(--ff-mono)', fontSize: 11, color: 'var(--text-dim)' }}>clique ou arraste uma imagem aqui</span></>
              }
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFile(e.target.files?.[0])} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>cancelar</button>
              <button onClick={() => { if (preview) { onInsert(preview, ''); onClose() } }} disabled={!preview} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', opacity: !preview ? 0.4 : 1 }}>inserir</button>
            </div>
          </>
        ) : (
          <>
            <div className="field"><label style={lbl}>url da imagem</label><input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." style={inp} autoFocus /></div>
            <div className="field"><label style={lbl}>descrição <span style={{ opacity: 0.4 }}>(opcional)</span></label><input value={alt} onChange={e => setAlt(e.target.value)} placeholder="captura de tela do projeto" style={inp} /></div>
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button onClick={onClose} className="btn btn-ghost" style={{ flex: 1 }}>cancelar</button>
              <button onClick={() => { if (url.trim()) { onInsert(url.trim(), alt.trim()); onClose() } }} disabled={!url.trim()} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', opacity: !url.trim() ? 0.4 : 1 }}>inserir</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
