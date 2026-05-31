import { useState, useEffect } from 'react'
import { X, FileText, Loader, Download, CheckCircle, AlertTriangle, Sparkles } from 'lucide-react'
import { DISCIPLINAS, NIVEIS_AVALIACAO, PENALIZACOES_ATRASO } from '../../data/criterios'
import { useAvaliacao } from '../../hooks/useAvaliacao'
import { useAvaliacaoCrud } from '../../hooks/useAvaliacaoCrud'
import { useNotes } from '../../hooks/useNotes'

const mono = { fontFamily: 'var(--ff-mono)' }

// ── Monta os dados de avaliação consolidados ──────────────────
function coletarDadosAvaliacao(group, notaGrupo, nivelGrupo, atrasoGrupo, totalDisciplina, crud, notes) {
  const parseMaybeJson = (val, fallback = []) => {
    if (Array.isArray(val)) return val
    try { return JSON.parse(val) } catch { return fallback }
  }
  const members = parseMaybeJson(group?.members)

  const disciplinas = DISCIPLINAS.map(disc => {
    const fases = crud.getFasesDisciplina(disc.id).map(fase => {
      const criterios = crud.getCriteriosFase(disc.id, fase.nome).map(cr => {
        const nivel = nivelGrupo(disc.id, cr.id)
        const nivelInfo = NIVEIS_AVALIACAO.find(n => n.id === nivel)
        const atraso = atrasoGrupo(disc.id, cr.id)
        const atrasoInfo = PENALIZACOES_ATRASO.find(a => a.id === atraso)
        const nota = notaGrupo(disc.id, cr.id) ?? 0
        // Busca anotação vinculada
        const notaVinculada = notes.find(n => n.title === `Avaliação: ${cr.nome}`)
        const comentario = notaVinculada?.content
          ? notaVinculada.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
          : ''
        return { id: cr.id, nome: cr.nome, max: cr.max, nota, nivel, nivelLabel: nivelInfo?.label || '—', atraso, atrasoLabel: atrasoInfo?.label || '—', comentario }
      })
      const totalFase = criterios.reduce((a, c) => a + c.nota, 0)
      const maxFase = criterios.reduce((a, c) => a + c.max, 0)
      return { nome: fase.nome, criterios, totalFase, maxFase }
    })
    const total = totalDisciplina(disc.id)
    return { id: disc.id, nome: disc.nome, total, max: disc.total, fases }
  })

  return { group, members, disciplinas, totalGeral: disciplinas.reduce((a, d) => a + d.total, 0) }
}

// ── Gera o .tex via Claude API ────────────────────────────────
async function gerarTexComClaude(dados, turma, dataEntrega) {
  const { group, members, disciplinas, totalGeral } = dados

  // Resumo estruturado para o Claude
  const resumo = disciplinas.map(d => {
    return `## ${d.nome} (${d.total.toFixed(2)} / ${d.max} pts)\n` +
      d.fases.map(f =>
        `### ${f.nome} (${f.totalFase.toFixed(2)} / ${f.maxFase} pts)\n` +
        f.criterios.map(c =>
          `- ${c.nome}: ${c.nota.toFixed(2)}/${c.max} [${c.nivelLabel}]${c.atraso !== 'sem_atraso' ? ` ⚠ ${c.atrasoLabel}` : ''}${c.comentario ? `\n  Anotação: "${c.comentario.substring(0, 200)}"` : ''}`
        ).join('\n')
      ).join('\n')
  }).join('\n\n')

  const prompt = `Você é uma professora de Design Thinking e Projeto Integrador do ensino técnico brasileiro (ETE Cícero Dias, Recife). 
Redija um feedback oficial de avaliação para o grupo "${group.name}" com base nos dados abaixo.

DADOS DA AVALIAÇÃO:
${resumo}

NOTA FINAL: ${totalGeral.toFixed(2)} / 30 pts

INSTRUÇÕES:
- Escreva em português brasileiro, tom profissional mas acessível a alunos do ensino médio técnico
- Para cada disciplina (DT, DCU, PI), escreva 2-3 frases de comentário geral
- Destaque 3 pontos fortes do grupo (frases curtas, diretas)
- Destaque 3 pontos a desenvolver (frases curtas, construtivas)
- Escreva um encaminhamento final de 2-3 frases sobre os próximos passos
- NÃO repita os números da avaliação — foque na qualidade do trabalho
- Responda APENAS em JSON válido, sem markdown, sem explicações extras

Formato exato:
{
  "comentario_dt": "...",
  "comentario_dcu": "...",
  "comentario_pi": "...",
  "pontos_fortes": ["...", "...", "..."],
  "a_desenvolver": ["...", "...", "..."],
  "encaminhamento": "..."
}`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) throw new Error(`API error: ${res.status}`)
  const data = await res.json()
  const text = data.content?.find(b => b.type === 'text')?.text || ''
  const clean = text.replace(/```json|```/g, '').trim()
  return JSON.parse(clean)
}

// ── Escapa texto para LaTeX ───────────────────────────────────
function esc(str = '') {
  return String(str)
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/\$/g, '\\$')
    .replace(/#/g, '\\#')
    .replace(/_/g, '\\_')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}')
    .replace(/</g, '\\textless{}')
    .replace(/>/g, '\\textgreater{}')
}

// ── Monta o .tex completo ─────────────────────────────────────
function montarTex(dados, feedback, turma, dataEntrega) {
  const { group, disciplinas, totalGeral } = dados
  const notaFmt = n => String(n.toFixed(2)).replace('.', ',')

  const chipColor = (nota, max) => {
    const pct = max > 0 ? nota / max : 0
    if (pct >= 0.8) return 'chipfull'
    if (pct >= 0.5) return 'chippartial'
    return 'chiplow'
  }

  const rubricaRows = disciplinas.flatMap(d =>
    d.fases.flatMap(f =>
      f.criterios.map(c => `
  \\rowcolor{bg}
  {\\semibold\\small ${esc(c.nome)}} & \\small\\color{textmid}${esc(d.id.toUpperCase())} — ${esc(f.nome.split('—')[0].trim())} & {\\${chipColor(c.nota, c.max)} ${notaFmt(c.nota)} / ${notaFmt(c.max)}} \\\\
  \\arrayrulecolor{bordercolor}\\hline`)
    )
  ).join('')

  const pontosFortes = (feedback.pontos_fortes || []).map(p => `    \\item ${esc(p)}`).join('\n')
  const aDesenvolver = (feedback.a_desenvolver || []).map(p => `    \\item ${esc(p)}`).join('\n')

  const discComentarios = [
    { id: 'dt',  label: 'Design Thinking',            texto: feedback.comentario_dt },
    { id: 'dcu', label: 'Design Centrado no Usuário', texto: feedback.comentario_dcu },
    { id: 'pi',  label: 'Projeto Integrador',          texto: feedback.comentario_pi },
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

% ── Pacotes ──────────────────────────────────────────────
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
\\usepackage{fancyhdr}
\\usepackage{hyperref}
\\hypersetup{hidelinks}

% ── Fontes ───────────────────────────────────────────────
\\setmainfont{Source Sans Pro}[UprightFont={* Light},BoldFont={* Bold},ItalicFont={* Light Italic}]
\\newfontfamily\\semibold{Source Sans Pro}[UprightFont={* Regular},BoldFont={* SemiBold}]

% ── Paleta Delicatte ─────────────────────────────────────
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

% ── Chips de pontuação ───────────────────────────────────
\\newcommand{\\chipfull}[1]{\\colorbox{sagedim}{\\color{sage}\\semibold\\small\\strut\\ #1\\ }}
\\newcommand{\\chippartial}[1]{\\colorbox{blushdim}{\\color{blush}\\semibold\\small\\strut\\ #1\\ }}
\\newcommand{\\chiplow}[1]{\\colorbox{blushdim}{\\color{crimson}\\semibold\\small\\strut\\ #1\\ }}

\\setlength{\\parskip}{6pt}
\\setlength{\\parindent}{0pt}
\\pagestyle{empty}

\\begin{document}

% ════════════════════════════════
% CAPA
% ════════════════════════════════
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
      {\\color{white}\\small\\setstretch{1.55} ${esc(feedback.encaminhamento || 'Avaliação gerada automaticamente pelo sistema Atelier.sh.')}}
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

% ════════════════════════════════
% PÁGINA 2 — RUBRICA
% ════════════════════════════════
\\newgeometry{top=1cm,bottom=2cm,left=1.6cm,right=1.6cm}

\\vspace*{20pt}
\\noindent\\rule{\\linewidth}{0.4pt}\\\\[4pt]
{\\color{crimson}\\semibold\\small 01}\\hspace{10pt}{\\semibold\\large\\color{ink} Pontuação por Critério}\\hfill{\\color{muted}\\small ${notaFmt(totalGeral)} / 30,00 pts}\\\\[-2pt]
\\noindent\\rule{\\linewidth}{0.4pt}
\\vspace{10pt}

\\renewcommand{\\arraystretch}{1.5}
\\begin{tabularx}{\\linewidth}{>{{\\semibold\\color{ink}}}p{5cm} X >{\\centering\\arraybackslash}p{3cm}}
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

// ── Compila via latex.online ──────────────────────────────────
async function compilarPDF(texContent) {
  const formData = new FormData()
  const texBlob = new Blob([texContent], { type: 'text/plain' })
  formData.append('file', texBlob, 'devolutiva.tex')

  const res = await fetch('https://latex.ytotech.com/builds/sync', {
    method: 'POST',
    headers: { 'Accept': 'application/json' },
    body: JSON.stringify({
      compiler: 'xelatex',
      resources: [{ main: true, content: texContent }],
    }),
  })

  // Tenta latex.ytotech primeiro, fallback para latexonline.cc
  if (!res.ok) {
    const encodedTex = encodeURIComponent(texContent)
    const url = `https://latexonline.cc/compile?text=${encodedTex}&command=xelatex`
    const res2 = await fetch(url)
    if (!res2.ok) throw new Error('Falha na compilação LaTeX')
    return await res2.blob()
  }

  const data = await res.json()
  if (data.pdf) {
    const binary = atob(data.pdf)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return new Blob([bytes], { type: 'application/pdf' })
  }
  throw new Error(data.error || 'Compilação falhou')
}

// ════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════
export default function DevolutivaModal({ group, onClose }) {
  const avaliacao = useAvaliacao(group?.id, group?.org_id)
  const crud = useAvaliacaoCrud(group?.id, group?.org_id)
  const { notes } = useNotes(group?.id, group?.org_id)

  const [turma, setTurma] = useState('Turma A · 2026.1')
  const [dataEntrega, setDataEntrega] = useState('22 de maio de 2026')
  const [etapa, setEtapa] = useState('idle') // idle | coletando | gerando | compilando | pronto | erro
  const [erro, setErro] = useState('')
  const [texContent, setTexContent] = useState('')
  const [pdfBlob, setPdfBlob] = useState(null)

  const { notaGrupo, nivelGrupo, atrasoGrupo, totalDisciplina, loading } = avaliacao

  async function gerarDevolutiva() {
    try {
      setErro('')
      setEtapa('coletando')

      const dados = coletarDadosAvaliacao(group, notaGrupo, nivelGrupo, atrasoGrupo, totalDisciplina, crud, notes)

      setEtapa('gerando')
      const feedback = await gerarTexComClaude(dados, turma, dataEntrega)

      setEtapa('compilando')
      const tex = montarTex(dados, feedback, turma, dataEntrega)
      setTexContent(tex)

      try {
        const blob = await compilarPDF(tex)
        setPdfBlob(blob)
        setEtapa('pronto')
      } catch {
        // Compilação online falhou — oferece download do .tex
        setPdfBlob(null)
        setEtapa('pronto')
      }
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

  const etapaLabel = {
    coletando:  'Coletando dados de avaliação...',
    gerando:    'Claude está redigindo o feedback...',
    compilando: 'Compilando o PDF via LaTeX...',
  }

  const inp = {
    width: '100%', padding: '8px 10px',
    background: 'var(--surface)', border: '1px solid var(--border)',
    color: 'var(--text)', ...mono, fontSize: 12,
    borderRadius: 'var(--radius)', outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-red)', borderRadius: 'var(--radius-md)', width: '100%', maxWidth: 520, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ height: 3, background: 'linear-gradient(90deg, var(--red), var(--red-glow))' }} />
        <div style={{ padding: '18px 24px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ ...mono, fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 4 }}>Gerar Devolutiva PDF</div>
            <div style={{ fontFamily: 'var(--ff-disp)', fontSize: 20, color: 'var(--text)', letterSpacing: '0.04em' }}>{group.name}</div>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><X size={16} /></button>
        </div>

        <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Config */}
          {etapa === 'idle' && (
            <>
              <div style={{ ...mono, fontSize: 10, color: 'var(--text-dim)', lineHeight: 1.6, padding: '10px 12px', background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                O sistema vai coletar todas as notas e anotações preenchidas, pedir ao Claude para redigir o feedback, montar o <strong style={{ color: 'var(--text-muted)' }}>.tex</strong> e compilar o PDF automaticamente.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <label style={{ ...mono, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-dim)', display: 'block', marginBottom: 5 }}>Turma</label>
                  <input value={turma} onChange={e => setTurma(e.target.value)} style={inp} />
                </div>
                <div>
                  <label style={{ ...mono, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-dim)', display: 'block', marginBottom: 5 }}>Data de Entrega</label>
                  <input value={dataEntrega} onChange={e => setDataEntrega(e.target.value)} style={inp} />
                </div>
              </div>

              {loading && (
                <div style={{ ...mono, fontSize: 11, color: 'var(--text-dim)' }}>carregando avaliações_</div>
              )}

              <button onClick={gerarDevolutiva} disabled={loading}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 20px', background: 'var(--red)', border: 'none', borderRadius: 'var(--radius)', color: '#fff', ...mono, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', opacity: loading ? 0.5 : 1 }}>
                <Sparkles size={14} /> Gerar Devolutiva
              </button>
            </>
          )}

          {/* Loading */}
          {['coletando', 'gerando', 'compilando'].includes(etapa) && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: '24px 0' }}>
              <div style={{ position: 'relative', width: 48, height: 48 }}>
                <div style={{ position: 'absolute', inset: 0, border: '2px solid var(--border)', borderRadius: '50%' }} />
                <div style={{ position: 'absolute', inset: 0, border: '2px solid var(--red)', borderRadius: '50%', borderRightColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ ...mono, fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{etapaLabel[etapa]}</div>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                  {['coletando', 'gerando', 'compilando'].map((e, i) => (
                    <div key={e} style={{ width: 6, height: 6, borderRadius: '50%', background: ['coletando', 'gerando', 'compilando'].indexOf(etapa) >= i ? 'var(--red)' : 'var(--border)' }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Pronto */}
          {etapa === 'pronto' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'rgba(90,171,110,0.08)', border: '1px solid rgba(90,171,110,0.3)', borderRadius: 'var(--radius)' }}>
                <CheckCircle size={16} style={{ color: '#5aab6e', flexShrink: 0 }} />
                <div style={{ ...mono, fontSize: 11, color: '#5aab6e' }}>
                  {pdfBlob ? 'PDF gerado com sucesso!' : 'Feedback gerado! Compile o .tex no Overleaf.'}
                </div>
              </div>

              {pdfBlob && (
                <button onClick={downloadPdf}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 20px', background: 'var(--red)', border: 'none', borderRadius: 'var(--radius)', color: '#fff', ...mono, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>
                  <Download size={14} /> Baixar PDF
                </button>
              )}

              <button onClick={downloadTex}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 20px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-muted)', ...mono, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>
                <FileText size={14} /> Baixar .tex (Overleaf)
              </button>

              <button onClick={() => { setEtapa('idle'); setPdfBlob(null); setTexContent('') }}
                style={{ ...mono, fontSize: 10, color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center', letterSpacing: '0.1em' }}>
                gerar novamente
              </button>
            </div>
          )}

          {/* Erro */}
          {etapa === 'erro' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', background: 'var(--red-dim)', border: '1px solid var(--border-red)', borderRadius: 'var(--radius)' }}>
                <AlertTriangle size={15} style={{ color: 'var(--red)', flexShrink: 0, marginTop: 1 }} />
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