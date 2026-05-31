import { useState } from 'react'
import { X, FileText, Download, CheckCircle, AlertTriangle, Plus, Trash2, Loader, Sparkles } from 'lucide-react'
import { DISCIPLINAS, NIVEIS_AVALIACAO, PENALIZACOES_ATRASO } from '../../data/criterios'
import { useAvaliacao } from '../../hooks/useAvaliacao'
import { useAvaliacaoCrud } from '../../hooks/useAvaliacaoCrud'
import { useNotes } from '../../hooks/useNotes'

const mono = { fontFamily: 'var(--ff-mono)' }

// ── Coleta dados de avaliação ─────────────────────────────────
function coletarDados(group, notaGrupo, nivelGrupo, atrasoGrupo, totalDisciplina, crud, notes) {
  const parseMaybeJson = (val, fallback = []) => {
    if (Array.isArray(val)) return val
    try { return JSON.parse(val) } catch { return fallback }
  }
  const disciplinas = DISCIPLINAS.map(disc => {
    const fases = crud.getFasesDisciplina(disc.id).map(fase => {
      const criterios = crud.getCriteriosFase(disc.id, fase.nome).map(cr => {
        const nivel     = nivelGrupo(disc.id, cr.id)
        const nivelInfo = NIVEIS_AVALIACAO.find(n => n.id === nivel)
        const atraso    = atrasoGrupo(disc.id, cr.id)
        const atrasoInfo = PENALIZACOES_ATRASO.find(a => a.id === atraso)
        const nota = notaGrupo(disc.id, cr.id) ?? 0
        const notaVinculada = notes.find(n => n.title === `Avaliação: ${cr.nome}`)
        // Extrai texto da nota vinculada (editor rico → texto puro)
        let comentario = ''
        if (notaVinculada?.content) {
          const tmp = notaVinculada.content
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/p>/gi, '\n')
            .replace(/<\/li>/gi, '\n')
            .replace(/<[^>]*>/g, '')
            .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
            .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"')
            .replace(/\n{3,}/g, '\n\n').trim()
          comentario = tmp
        }
        return { id: cr.id, nome: cr.nome, max: cr.max, nota, nivelLabel: nivelInfo?.label || '—', atrasoLabel: atrasoInfo?.label || '—', comentario }
      })
      return {
        nome: fase.nome,
        criterios,
        totalFase: criterios.reduce((a, c) => a + c.nota, 0),
        maxFase:   criterios.reduce((a, c) => a + c.max, 0),
      }
    })
    return { id: disc.id, nome: disc.nome, total: totalDisciplina(disc.id), max: disc.total, fases }
  })
  return { group, disciplinas, totalGeral: disciplinas.reduce((a, d) => a + d.total, 0) }
}

// ── Escape LaTeX ──────────────────────────────────────────────
function esc(str = '') {
  return String(str)
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/&/g, '\\&').replace(/%/g, '\\%').replace(/\$/g, '\\$')
    .replace(/#/g, '\\#').replace(/_/g, '\\_').replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}').replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}')
    .replace(/</g, '\\textless{}').replace(/>/g, '\\textgreater{}')
}

// ── Monta o .tex ──────────────────────────────────────────────
function montarTex(dados, fb, turma, dataEntrega) {
  const { group, disciplinas, totalGeral } = dados
  const notaFmt = n => String(n.toFixed(2)).replace('.', ',')
  const chip = (nota, max) => {
    const p = max > 0 ? nota / max : 0
    return p >= 0.8 ? 'chipfull' : p >= 0.5 ? 'chippartial' : 'chiplow'
  }

  const rubricaRows = disciplinas.flatMap(d =>
    d.fases.flatMap(f =>
      f.criterios.map(c => {
        const comentarioCriterio = c.comentario
          ? `
  \\multicolumn{3}{p{\\linewidth}}{\\small\\color{textmid}\\setstretch{1.45}${esc(c.comentario)}} \\\\`
          : ''
        return `
  \\rowcolor{bg}
  {\\semibold\\small ${esc(c.nome)}} & \\small\\color{textmid}${esc(d.id.toUpperCase())} — ${esc(f.nome.split('—')[0].trim())} & {\\${chip(c.nota, c.max)} ${notaFmt(c.nota)} / ${notaFmt(c.max)}} \\\\${comentarioCriterio}
  \\arrayrulecolor{bordercolor}\\hline`
      })
    )
  ).join('')

  const pontosFortes = (fb.pontos_fortes || []).map(p => `    \\item ${esc(p)}`).join('\n')
  const aDesenvolver = (fb.a_desenvolver || []).map(p => `    \\item ${esc(p)}`).join('\n')

  const discComentarios = [
    { id: 'dt',  label: 'Design Thinking',            texto: fb.comentario_dt },
    { id: 'dcu', label: 'Design Centrado no Usuário', texto: fb.comentario_dcu },
    { id: 'pi',  label: 'Projeto Integrador',          texto: fb.comentario_pi },
  ].filter(d => d.texto).map(d => `
\\vspace{8pt}
\\begin{tcolorbox}[enhanced,colback=bg,colframe=bordercolor,leftrule=3pt,rightrule=0.4pt,toprule=0.4pt,bottomrule=0.4pt,arc=0pt,left=12pt,right=12pt,top=10pt,bottom=10pt,borderline west={3pt}{0pt}{crimson}]
{\\color{crimson}\\semibold\\tiny\\MakeUppercase{${esc(d.label)}}}\\\\[6pt]
{\\color{textmid}\\small\\setstretch{1.6}${esc(d.texto)}}
\\end{tcolorbox}`).join('\n')

  return `% Devolutiva Oficial — Projeto Integrador I
% ETE Cícero Dias · Módulo 1 · 2026
% Compilar com XeLaTeX no Overleaf

\\documentclass[12pt, a4paper]{article}
\\usepackage[a4paper, top=0cm, bottom=0cm, left=0cm, right=0cm]{geometry}
\\usepackage{fontspec}
\\usepackage{xcolor}
\\usepackage{tikz}
\\usetikzlibrary{calc}
\\usepackage{tcolorbox}
\\tcbuselibrary{skins}
\\usepackage{tabularx}
\\usepackage{colortbl}
\\usepackage{array}
\\usepackage{enumitem}
\\usepackage{setspace}
\\usepackage{parskip}
\\usepackage{microtype}
\\usepackage{hyperref}
\\hypersetup{hidelinks}

\\setmainfont{Source Sans Pro}[UprightFont={* Light},BoldFont={* Bold},ItalicFont={* Light Italic}]
\\newfontfamily\\semibold{Source Sans Pro}[UprightFont={* Regular},BoldFont={* SemiBold}]

\\definecolor{crimson}{HTML}{860120}
\\definecolor{blush}{HTML}{C4506A}
\\definecolor{blushdim}{HTML}{fdeef2}
\\definecolor{cream}{HTML}{fffbef}
\\definecolor{creamdark}{HTML}{f5edda}
\\definecolor{sage}{HTML}{828f58}
\\definecolor{sagedim}{HTML}{eef1e6}
\\definecolor{ink}{HTML}{1a1010}
\\definecolor{textmid}{HTML}{3d2020}
\\definecolor{muted}{HTML}{8a7070}
\\definecolor{bordercolor}{HTML}{e0cfc8}
\\definecolor{bg}{HTML}{fffbef}
\\definecolor{white}{HTML}{ffffff}

\\newcommand{\\chipfull}[1]{\\colorbox{sagedim}{\\color{sage}\\semibold\\small\\strut\\ #1\\ }}
\\newcommand{\\chippartial}[1]{\\colorbox{blushdim}{\\color{blush}\\semibold\\small\\strut\\ #1\\ }}
\\newcommand{\\chiplow}[1]{\\colorbox{blushdim}{\\color{crimson}\\semibold\\small\\strut\\ #1\\ }}

\\setlength{\\parskip}{6pt}
\\setlength{\\parindent}{0pt}
\\pagestyle{empty}

\\begin{document}

\\newgeometry{margin=0pt}
\\begin{tikzpicture}[remember picture,overlay]
  \\fill[crimson] (current page.south west) rectangle (current page.north east);
  \\fill[blush] (current page.south west) rectangle ([xshift=0.23cm]current page.north west);
  \\draw[white,opacity=0.08,line width=0.6pt] ([xshift=-2.2cm,yshift=-6cm]current page.north east) circle (6cm);
  \\draw[white,opacity=0.12,line width=0.6pt] ([xshift=-2.2cm,yshift=-6cm]current page.north east) circle (3.6cm);

  \\node[anchor=north west,xshift=1.6cm,yshift=-1.4cm] at (current page.north west){%
    \\begin{minipage}{14cm}
      {\\color{white}\\semibold\\fontsize{7.5}{10}\\selectfont\\MakeUppercase{ETE Cícero Dias · Módulo 1 · 2026}}\\\\[5pt]
      {\\color{white}\\small Projeto Integrador I — Imersão em Design Thinking\\\\Profª Samara Silvia Sabino}
    \\end{minipage}};

  \\node[anchor=north west,xshift=1.6cm,yshift=-7.5cm] at (current page.north west){%
    {\\color{blush}\\semibold\\fontsize{7.5}{10}\\selectfont\\MakeUppercase{Devolutiva Oficial · Etapa 01}}};

  \\node[anchor=north west,xshift=1.6cm,yshift=-8.4cm] at (current page.north west){%
    \\begin{minipage}{13cm}
      {\\color{white}\\semibold\\fontsize{46}{48}\\selectfont Feedback\\\\de Imersão}
    \\end{minipage}};

  \\node[anchor=north west,xshift=1.6cm,yshift=-14cm] at (current page.north west){%
    \\begin{minipage}{11cm}
      {\\color{white}\\small\\setstretch{1.55} ${esc(fb.encaminhamento || '')}}
    \\end{minipage}};

  \\draw[white,opacity=0.2,line width=0.6pt]
    ([xshift=1.6cm,yshift=-16.5cm]current page.north west) rectangle
    ([xshift=9cm,yshift=-18.5cm]current page.north west);
  \\draw[blush,line width=2pt]
    ([xshift=1.6cm,yshift=-16.5cm]current page.north west) --
    ([xshift=1.6cm,yshift=-18.5cm]current page.north west);
  \\node[anchor=north west,xshift=1.9cm,yshift=-16.9cm] at (current page.north west){%
    \\begin{minipage}{7cm}
      {\\color{white}\\semibold\\fontsize{7}{9}\\selectfont\\MakeUppercase{Grupo}}\\\\[4pt]
      {\\color{white}\\semibold\\large ${esc(group.name)}}
    \\end{minipage}};

  \\draw[white,opacity=0.12,line width=0.4pt]
    ([xshift=1.6cm,yshift=4.2cm]current page.south west) --
    ([xshift=-1.6cm,yshift=4.2cm]current page.south east);

  \\node[anchor=south west,xshift=1.6cm,yshift=1.0cm] at (current page.south west){%
    \\begin{minipage}{10cm}
      {\\color{white}\\semibold\\small ${esc(turma)}}\\\\[2pt]
      {\\color{white}\\fontsize{9}{12}\\selectfont\\opacity{0.45} Entrega: ${esc(dataEntrega)}}
    \\end{minipage}};

  \\node[anchor=south east,xshift=-1.6cm,yshift=0.8cm] at (current page.south east){%
    \\begin{minipage}[t]{4cm}\\raggedleft
      {\\color{white}\\semibold\\fontsize{7}{9}\\selectfont\\MakeUppercase{Nota Final}}\\\\[4pt]
      {\\color{white}\\semibold\\fontsize{40}{40}\\selectfont ${notaFmt(totalGeral)}}
      {\\color{white}\\fontsize{16}{16}\\selectfont / 30}
    \\end{minipage}};
\\end{tikzpicture}
\\newpage
\\restoregeometry

\\newgeometry{top=1cm,bottom=2cm,left=1.6cm,right=1.6cm}

\\vspace*{20pt}
\\noindent\\rule{\\linewidth}{0.4pt}\\\\[4pt]
{\\color{crimson}\\semibold\\small 01}\\hspace{10pt}{\\semibold\\large\\color{ink} Pontuação por Critério}\\hfill{\\color{muted}\\small ${notaFmt(totalGeral)} / 30,00 pts}\\\\[-2pt]
\\noindent\\rule{\\linewidth}{0.4pt}
\\vspace{10pt}

\\renewcommand{\\arraystretch}{1.5}
\\begin{tabularx}{\\linewidth}{>{\\semibold\\color{ink}}p{5cm} X >{\\centering\\arraybackslash}p{3cm}}
  \\rowcolor{ink}
  \\color{white}\\semibold\\tiny\\MakeUppercase{Critério} &
  \\color{white}\\semibold\\tiny\\MakeUppercase{Disciplina / Fase} &
  \\color{white}\\semibold\\tiny\\MakeUppercase{Nota} \\\\
  ${rubricaRows}
  \\rowcolor{creamdark}
  \\multicolumn{2}{l}{\\semibold\\small\\color{ink} Total Geral} &
  \\semibold\\small\\color{crimson} ${notaFmt(totalGeral)} / 30,00 \\\\
\\end{tabularx}

\\vspace{20pt}

\\noindent\\rule{\\linewidth}{0.4pt}\\\\[4pt]
{\\color{crimson}\\semibold\\small 02}\\hspace{10pt}{\\semibold\\large\\color{ink} Feedback por Disciplina}\\\\[-2pt]
\\noindent\\rule{\\linewidth}{0.4pt}

${discComentarios}

\\vspace{14pt}

\\begin{minipage}[t]{0.485\\linewidth}
\\begin{tcolorbox}[enhanced,colback=sagedim,colframe=bordercolor,leftrule=3pt,rightrule=0.4pt,toprule=0.4pt,bottomrule=0.4pt,arc=0pt,left=12pt,right=12pt,top=12pt,bottom=12pt,borderline west={3pt}{0pt}{sage}]
{\\color{sage}\\semibold\\tiny\\MakeUppercase{Pontos Fortes}}\\\\[8pt]
\\begin{itemize}[leftmargin=12pt,itemsep=4pt,parsep=0pt,topsep=0pt]
\\small\\color{textmid}
${pontosFortes}
\\end{itemize}
\\end{tcolorbox}
\\end{minipage}\\hfill
\\begin{minipage}[t]{0.485\\linewidth}
\\begin{tcolorbox}[enhanced,colback=blushdim,colframe=bordercolor,leftrule=3pt,rightrule=0.4pt,toprule=0.4pt,bottomrule=0.4pt,arc=0pt,left=12pt,right=12pt,top=12pt,bottom=12pt,borderline west={3pt}{0pt}{blush}]
{\\color{blush}\\semibold\\tiny\\MakeUppercase{A Desenvolver}}\\\\[8pt]
\\begin{itemize}[leftmargin=12pt,itemsep=4pt,parsep=0pt,topsep=0pt]
\\small\\color{textmid}
${aDesenvolver}
\\end{itemize}
\\end{tcolorbox}
\\end{minipage}

\\vspace{16pt}

\\begin{tcolorbox}[enhanced,colback=ink,colframe=ink,arc=0pt,boxrule=0pt,left=14pt,right=14pt,top=14pt,bottom=14pt]
\\begin{minipage}[c]{0.7\\linewidth}
  {\\color{white}\\semibold\\large ${esc(group.name)}}\\\\[2pt]
  {\\color{white}\\fontsize{9}{12}\\selectfont\\opacity{0.5} Projeto Integrador I · Etapa 01 — Imersão · ${esc(turma)}}
\\end{minipage}\\hfill
\\begin{minipage}[c]{0.25\\linewidth}\\raggedleft
  {\\color{white}\\semibold\\fontsize{40}{40}\\selectfont ${notaFmt(totalGeral)}}{\\color{white}\\fontsize{16}{16}\\selectfont / 30}
\\end{minipage}
\\end{tcolorbox}

\\end{document}
`
}

// ── Compila via latex.ytotech ─────────────────────────────────
async function compilarPDF(texContent) {
  const res = await fetch('https://latex.ytotech.com/builds/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ compiler: 'xelatex', resources: [{ main: true, content: texContent }] }),
  })
  if (!res.ok) throw new Error('Compilação falhou')
  const data = await res.json()
  if (data.pdf) {
    const binary = atob(data.pdf)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return new Blob([bytes], { type: 'application/pdf' })
  }
  throw new Error(data.error || 'Sem PDF na resposta')
}

// ════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════
export default function DevolutivaModal({ group, orgId: orgIdProp, onClose }) {
  const resolvedOrgId = orgIdProp || group?.org_id
  const avaliacao = useAvaliacao(group?.id, resolvedOrgId)
  const crud      = useAvaliacaoCrud(group?.id, resolvedOrgId)
  const { notes } = useNotes(group?.id, resolvedOrgId)

  const [turma,        setTurma]        = useState('Turma A · 2026.1')
  const [dataEntrega,  setDataEntrega]  = useState('22 de maio de 2026')
  const [etapa,        setEtapa]        = useState('idle') // idle | compilando | pronto | erro
  const [erro,         setErro]         = useState('')
  const [texContent,   setTexContent]   = useState('')
  const [pdfBlob,      setPdfBlob]      = useState(null)

  // Feedback manual — professor preenche
  const [fb, setFb] = useState({
    comentario_dt:  '',
    comentario_dcu: '',
    comentario_pi:  '',
    pontos_fortes:  ['', '', ''],
    a_desenvolver:  ['', '', ''],
    encaminhamento: '',
  })

  const [gerandoIA, setGerandoIA] = useState(false)

  async function gerarComClaude() {
    try {
      setGerandoIA(true)
      setErro('')
      const dados = coletarDados(group, notaGrupo, nivelGrupo, atrasoGrupo, totalDisciplina, crud, notes)

      const resumo = dados.disciplinas.map(d =>
        `## ${d.nome} (${d.total.toFixed(2)} / ${d.max} pts)\n` +
        d.fases.map(f =>
          `### ${f.nome} (${f.totalFase.toFixed(2)} / ${f.maxFase} pts)\n` +
          f.criterios.map(c =>
            `- ${c.nome}: ${c.nota.toFixed(2)}/${c.max} [${c.nivelLabel}]${c.comentario ? `\n  Anotação: "${c.comentario.substring(0, 150)}"` : ''}`
          ).join('\n')
        ).join('\n')
      ).join('\n\n')

      const prompt = `Você é professora de Design Thinking e Projeto Integrador do ensino técnico brasileiro (ETE Cícero Dias, Recife).
Redija feedback oficial para o grupo "${group.name}" com base nos dados:

${resumo}

NOTA FINAL: ${dados.totalGeral.toFixed(2)} / 30 pts

Responda APENAS em JSON válido sem markdown:
{
  "comentario_dt": "2-3 frases sobre Design Thinking",
  "comentario_dcu": "2-3 frases sobre DCU",
  "comentario_pi": "2-3 frases sobre Projeto Integrador",
  "pontos_fortes": ["frase curta", "frase curta", "frase curta"],
  "a_desenvolver": ["frase curta", "frase curta", "frase curta"],
  "encaminhamento": "2-3 frases sobre próximos passos"
}`

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

      const res = await fetch(`${supabaseUrl}/functions/v1/claude-proxy-atelier`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }],
        }),
      })

      if (!res.ok) throw new Error(`Erro ${res.status}`)
      const data = await res.json()
      const text = data?.content?.find(b => b.type === 'text')?.text || ''
      const generated = JSON.parse(text.replace(/```json|```/g, '').trim())
      setFb({
        comentario_dt:  generated.comentario_dt  || '',
        comentario_dcu: generated.comentario_dcu || '',
        comentario_pi:  generated.comentario_pi  || '',
        pontos_fortes:  generated.pontos_fortes  || ['', '', ''],
        a_desenvolver:  generated.a_desenvolver  || ['', '', ''],
        encaminhamento: generated.encaminhamento || '',
      })
    } catch (e) {
      setErro(`Erro ao gerar com Claude: ${e.message}`)
    } finally {
      setGerandoIA(false)
    }
  }

  const setLista = (campo, idx, val) =>
    setFb(prev => ({ ...prev, [campo]: prev[campo].map((v, i) => i === idx ? val : v) }))
  const addItem = campo =>
    setFb(prev => ({ ...prev, [campo]: [...prev[campo], ''] }))
  const removeItem = (campo, idx) =>
    setFb(prev => ({ ...prev, [campo]: prev[campo].filter((_, i) => i !== idx) }))

  async function gerar() {
    try {
      setErro('')
      setEtapa('compilando')
      const dados = coletarDados(group, notaGrupo, nivelGrupo, atrasoGrupo, totalDisciplina, crud, notes)
      const tex   = montarTex(dados, fb, turma, dataEntrega)
      setTexContent(tex)
      try {
        const blob = await compilarPDF(tex)
        setPdfBlob(blob)
      } catch {
        setPdfBlob(null)
      }
      setEtapa('pronto')
    } catch (e) {
      setErro(e.message || 'Erro desconhecido')
      setEtapa('erro')
    }
  }

  function downloadTex() {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([texContent], { type: 'text/plain' }))
    a.download = `devolutiva-${(group.name || 'grupo').toLowerCase().replace(/\s+/g, '-')}.tex`
    a.click()
  }

  function downloadPdf() {
    if (!pdfBlob) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(pdfBlob)
    a.download = `devolutiva-${(group.name || 'grupo').toLowerCase().replace(/\s+/g, '-')}.pdf`
    a.click()
  }

  const inp = {
    width: '100%', padding: '7px 10px',
    background: 'var(--surface)', border: '1px solid var(--border)',
    color: 'var(--text)', ...mono, fontSize: 11,
    borderRadius: 'var(--radius)', outline: 'none', boxSizing: 'border-box',
    resize: 'none',
  }
  const label = (txt) => (
    <div style={{ ...mono, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 4 }}>{txt}</div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-red)', borderRadius: 'var(--radius-md)', width: '100%', maxWidth: 580, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ height: 3, background: 'linear-gradient(90deg, var(--red), var(--red-glow))', flexShrink: 0 }} />
        <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, borderBottom: '1px solid var(--border)' }}>
          <div>
            <div style={{ ...mono, fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 2 }}>Devolutiva PDF</div>
            <div style={{ fontFamily: 'var(--ff-disp)', fontSize: 18, color: 'var(--text)' }}>{group.name}</div>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><X size={16} /></button>
        </div>

        {/* Scroll body */}
        <div style={{ overflowY: 'auto', padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {etapa === 'idle' && (
            <>
              {/* Botão gerar com Claude */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button onClick={gerarComClaude} disabled={gerandoIA || loading}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 16px', background: gerandoIA ? 'var(--surface)' : 'var(--red)', border: `1px solid ${gerandoIA ? 'var(--border)' : 'var(--red)'}`, borderRadius: 'var(--radius)', color: gerandoIA ? 'var(--text-dim)' : '#fff', ...mono, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: gerandoIA ? 'default' : 'pointer' }}>
                  {gerandoIA ? <><Loader size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> gerando com Claude...</> : <><Sparkles size={13} /> Preencher automaticamente com Claude</>}
                </button>
              </div>
              {erro && <div style={{ ...mono, fontSize: 11, color: 'var(--red)', padding: '8px 12px', background: 'var(--red-dim)', borderRadius: 'var(--radius)', border: '1px solid var(--border-red)' }}>⚠ {erro}</div>}
              <div style={{ ...mono, fontSize: 9, color: 'var(--text-dim)', textAlign: 'center', letterSpacing: '0.1em' }}>— ou preencha manualmente abaixo —</div>

              {/* Config básica */}
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  {label('Turma')}
                  <input value={turma} onChange={e => setTurma(e.target.value)} style={inp} />
                </div>
                <div style={{ flex: 1 }}>
                  {label('Data de Entrega')}
                  <input value={dataEntrega} onChange={e => setDataEntrega(e.target.value)} style={inp} />
                </div>
              </div>

              {/* Comentários por disciplina */}
              {[
                { key: 'comentario_dt',  label: 'Comentário — Design Thinking' },
                { key: 'comentario_dcu', label: 'Comentário — Design Centrado no Usuário' },
                { key: 'comentario_pi',  label: 'Comentário — Projeto Integrador' },
                { key: 'encaminhamento', label: 'Encaminhamento final (aparece na capa)' },
              ].map(({ key, label: lbl }) => (
                <div key={key}>
                  {label(lbl)}
                  <textarea rows={2} value={fb[key]} placeholder="opcional..."
                    onChange={e => setFb(prev => ({ ...prev, [key]: e.target.value }))}
                    style={inp} />
                </div>
              ))}

              {/* Pontos fortes */}
              <div>
                {label('Pontos Fortes')}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {fb.pontos_fortes.map((v, i) => (
                    <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input value={v} placeholder={`Ponto forte ${i + 1}...`}
                        onChange={e => setLista('pontos_fortes', i, e.target.value)}
                        style={{ ...inp, flex: 1 }} />
                      {fb.pontos_fortes.length > 1 && (
                        <button onClick={() => removeItem('pontos_fortes', i)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', display: 'flex', padding: 2 }}
                          onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}>
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => addItem('pontos_fortes')}
                    style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 'var(--radius)', border: '1px dashed var(--border)', background: 'transparent', color: 'var(--text-dim)', ...mono, fontSize: 9, cursor: 'pointer' }}>
                    <Plus size={10} /> adicionar
                  </button>
                </div>
              </div>

              {/* A desenvolver */}
              <div>
                {label('A Desenvolver')}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {fb.a_desenvolver.map((v, i) => (
                    <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input value={v} placeholder={`Ponto a desenvolver ${i + 1}...`}
                        onChange={e => setLista('a_desenvolver', i, e.target.value)}
                        style={{ ...inp, flex: 1 }} />
                      {fb.a_desenvolver.length > 1 && (
                        <button onClick={() => removeItem('a_desenvolver', i)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', display: 'flex', padding: 2 }}
                          onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}>
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => addItem('a_desenvolver')}
                    style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 'var(--radius)', border: '1px dashed var(--border)', background: 'transparent', color: 'var(--text-dim)', ...mono, fontSize: 9, cursor: 'pointer' }}>
                    <Plus size={10} /> adicionar
                  </button>
                </div>
              </div>

              {loading && <div style={{ ...mono, fontSize: 10, color: 'var(--text-dim)' }}>carregando avaliações_</div>}

              <button onClick={gerar} disabled={loading}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 20px', background: 'var(--red)', border: 'none', borderRadius: 'var(--radius)', color: '#fff', ...mono, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', opacity: loading ? 0.5 : 1 }}>
                <FileText size={14} /> Gerar Devolutiva
              </button>
            </>
          )}

          {/* Compilando */}
          {etapa === 'compilando' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '24px 0' }}>
              <div style={{ position: 'relative', width: 40, height: 40 }}>
                <div style={{ position: 'absolute', inset: 0, border: '2px solid var(--border)', borderRadius: '50%' }} />
                <div style={{ position: 'absolute', inset: 0, border: '2px solid var(--red)', borderRadius: '50%', borderRightColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
              </div>
              <div style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>Montando e compilando PDF...</div>
            </div>
          )}

          {/* Pronto */}
          {etapa === 'pronto' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(90,171,110,0.08)', border: '1px solid rgba(90,171,110,0.3)', borderRadius: 'var(--radius)' }}>
                <CheckCircle size={15} style={{ color: '#5aab6e', flexShrink: 0 }} />
                <div style={{ ...mono, fontSize: 11, color: '#5aab6e' }}>
                  {pdfBlob ? 'PDF gerado com sucesso!' : '.tex gerado — compile no Overleaf (overleaf.com)'}
                </div>
              </div>
              {pdfBlob && (
                <button onClick={downloadPdf}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 20px', background: 'var(--red)', border: 'none', borderRadius: 'var(--radius)', color: '#fff', ...mono, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>
                  <Download size={13} /> Baixar PDF
                </button>
              )}
              <button onClick={downloadTex}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 20px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-muted)', ...mono, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>
                <FileText size={13} /> Baixar .tex (Overleaf)
              </button>
              <button onClick={() => { setEtapa('idle'); setPdfBlob(null); setTexContent('') }}
                style={{ ...mono, fontSize: 10, color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center' }}>
                gerar novamente
              </button>
            </div>
          )}

          {/* Erro */}
          {etapa === 'erro' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', background: 'var(--red-dim)', border: '1px solid var(--border-red)', borderRadius: 'var(--radius)' }}>
                <AlertTriangle size={14} style={{ color: 'var(--red)', flexShrink: 0, marginTop: 1 }} />
                <div style={{ ...mono, fontSize: 11, color: 'var(--red)', lineHeight: 1.5 }}>{erro}</div>
              </div>
              <button onClick={() => setEtapa('idle')}
                style={{ ...mono, fontSize: 10, color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center' }}>
                tentar novamente
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}