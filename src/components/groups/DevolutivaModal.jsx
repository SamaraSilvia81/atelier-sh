import { useState } from 'react'
import { X, FileText, Download, CheckCircle, AlertTriangle, GitBranch } from 'lucide-react'
import { DISCIPLINAS, NIVEIS_AVALIACAO, PENALIZACOES_ATRASO } from '../../data/criterios'
import { useAvaliacao } from '../../hooks/useAvaliacao'
import { useAvaliacaoCrud } from '../../hooks/useAvaliacaoCrud'
import { useNotes } from '../../hooks/useNotes'
import { useAvaliacaoConfig } from '../../hooks/useAvaliacaoConfig'
import { pushFileToRepo } from '../../lib/github'

const mono = { fontFamily: 'var(--ff-mono)' }

function esc(str = '') {
  return String(str)
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/&/g, '\\&').replace(/%/g, '\\%').replace(/\$/g, '\\$')
    .replace(/#/g, '\\#').replace(/_/g, '\\_').replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}').replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}')
    .replace(/</g, '\\textless{}').replace(/>/g, '\\textgreater{}')
}

function htmlToText(html = '') {
  return html
    .replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<\/li>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n').trim()
}

function coletarDados(group, notaGrupo, nivelGrupo, atrasoGrupo, totalDisciplina, crud, notes, etapas) {
  const disciplinas = DISCIPLINAS.map(disc => {
    const fases = crud.getFasesDisciplina(disc.id).map(fase => {
      const criterios = crud.getCriteriosFase(disc.id, fase.nome).map(cr => {
        const nivel      = nivelGrupo(disc.id, cr.id)
        const nivelInfo  = NIVEIS_AVALIACAO.find(n => n.id === nivel)
        const atraso     = atrasoGrupo(disc.id, cr.id)
        const atrasoInfo = PENALIZACOES_ATRASO.find(a => a.id === atraso)
        const nota       = notaGrupo(disc.id, cr.id) ?? 0

        // Anotação vinculada
        const notaVinc = notes.find(n => n.title === `Avaliação: ${cr.nome}`)
        const comentario = notaVinc?.content ? htmlToText(notaVinc.content) : ''

        // Checks marcados — etapas salvas no config
        const itensOverride = null // vem do crud se necessário
        const itens = cr.itens || []
        const checksFeitos = itens.map((item, i) => {
          const key = `${disc.id}-${cr.id}-item-${i}`
          return { texto: item, marcado: etapas?.[key] ?? false }
        })

        return {
          id: cr.id, nome: cr.nome, max: cr.max, nota,
          nivelLabel:  nivelInfo?.label  || '—',
          nivelId:     nivel,
          atrasoLabel: atrasoInfo?.id === 'sem_atraso' ? '' : (atrasoInfo?.label || ''),
          comentario,
          checksFeitos,
        }
      })
      return {
        nome: fase.nome,
        criterios,
        totalFase: criterios.reduce((a, c) => a + c.nota, 0),
        maxFase:   criterios.reduce((a, c) => a + c.max,  0),
      }
    })
    return { id: disc.id, nome: disc.nome, total: totalDisciplina(disc.id), max: disc.total, fases }
  })
  return { group, disciplinas, totalGeral: disciplinas.reduce((a, d) => a + d.total, 0) }
}

function montarTex(dados, turma, dataEntrega) {
  const { group, disciplinas, totalGeral } = dados
  const fmt  = n => String(n.toFixed(2)).replace('.', ',')

  const secoes = disciplinas.map(d => {
    const fasesLatex = d.fases.map(f => {
      const criteriosLatex = f.criterios.map(cr => {
        // Chips de nível
        const pct = cr.max > 0 ? cr.nota / cr.max : 0
        const chipCmd = pct >= 0.8 ? 'chipfull' : pct >= 0.5 ? 'chippartial' : 'chiplow'

        // Atraso
        const atrasoStr = cr.atrasoLabel
          ? `\n\\\\vspace{2pt}\\\\noindent{\\\\footnotesize\\\\color{crimson}\\\\textit{Atraso: ${esc(cr.atrasoLabel)}}}`
          : ''

        // Checklist
        const checksStr = cr.checksFeitos.length > 0
          ? `\n\\\\begin{itemize}[leftmargin=18pt,itemsep=2pt,topsep=4pt,parsep=0pt]\n` +
            cr.checksFeitos.map(ch =>
              `  \\\\item[${ch.marcado ? '$\\\\checkmark$' : '$\\\\square$'}] ` +
              `{\\\\small\\\\color{${ch.marcado ? 'sage' : 'muted'}}${esc(ch.texto)}}`
            ).join('\n') +
            `\n\\\\end{itemize}`
          : ''

        // Anotação da professora
        const comentStr = cr.comentario
          ? `\n\\\\begin{tcolorbox}[enhanced,colback=bg,colframe=bordercolor,` +
            `leftrule=2pt,rightrule=0.3pt,toprule=0.3pt,bottomrule=0.3pt,` +
            `arc=0pt,left=10pt,right=10pt,top=6pt,bottom=6pt,` +
            `borderline west={2pt}{0pt}{crimson}]\n` +
            `{\\\\footnotesize\\\\color{muted}\\\\semibold\\\\MakeUppercase{observação}}\\\\\\\\[4pt]\n` +
            `{\\\\small\\\\color{textmid}\\\\setstretch{1.4}${esc(cr.comentario)}}\n` +
            `\\\\end{tcolorbox}`
          : ''

        return `
\\\\subsubsection*{${esc(cr.nome)} \\\\hfill {\\\\${chipCmd} ${fmt(cr.nota)} / ${fmt(cr.max)} pts}}
${checksStr}${atrasoStr}${comentStr}`
      }).join('\n\\\\medskip\n')

      return `
\\\\subsection*{${esc(f.nome)} \\\\hfill {\\\\small\\\\color{muted}${fmt(f.totalFase)} / ${fmt(f.maxFase)} pts}}
\\\\noindent\\\\rule{\\\\linewidth}{0.3pt}\\\\vspace{-4pt}
${criteriosLatex}`
    }).join('\n')

    return `
\\\\newpage
\\\\section*{${esc(d.nome)} \\\\hfill {\\\\color{crimson}\\\\semibold ${fmt(d.total)} / ${fmt(d.max)} pts}}
\\\\noindent\\\\rule{\\\\linewidth}{1pt}\\\\vspace{2pt}
${fasesLatex}`
  }).join('\n')

  return `% Devolutiva — ${group.name}
% ETE Cicero Dias . Modulo 1 . ${new Date().getFullYear()}
% Compilar com XeLaTeX no Overleaf
% INSTRUCAO: faca upload da capa como "capa.png" no mesmo projeto

\\documentclass[11pt, a4paper]{article}
\\usepackage[a4paper, top=0cm, bottom=0cm, left=0cm, right=0cm]{geometry}
\\usepackage{fontspec}
\\usepackage{xcolor}
\\usepackage{graphicx}
\\usepackage{tcolorbox}
\\tcbuselibrary{skins}
\\usepackage{enumitem}
\\usepackage{setspace}
\\usepackage{parskip}
\\usepackage{microtype}
\\usepackage{amssymb}
\\usepackage{fancyhdr}
\\usepackage{hyperref}
\\hypersetup{hidelinks}

\\setmainfont{Source Sans Pro}[UprightFont={* Light},BoldFont={* Bold},ItalicFont={* Light Italic}]
\\newfontfamily\\semibold{Source Sans Pro}[UprightFont={* Regular},BoldFont={* SemiBold}]

\\definecolor{crimson}{HTML}{860120}
\\definecolor{blush}{HTML}{C4506A}
\\definecolor{sage}{HTML}{828f58}
\\definecolor{muted}{HTML}{8a7070}
\\definecolor{textmid}{HTML}{3d2020}
\\definecolor{bordercolor}{HTML}{e0cfc8}
\\definecolor{blushdim}{HTML}{fdeef2}
\\definecolor{sagedim}{HTML}{eef1e6}
\\definecolor{crimsondim}{HTML}{fae8ee}
\\definecolor{bg}{HTML}{fffbef}

\\newcommand{\\chipfull}[1]{\\colorbox{sagedim}{\\color{sage}\\semibold\\small\\strut\\ #1\\ }}
\\newcommand{\\chippartial}[1]{\\colorbox{blushdim}{\\color{blush}\\semibold\\small\\strut\\ #1\\ }}
\\newcommand{\\chiplow}[1]{\\colorbox{crimsondim}{\\color{crimson}\\semibold\\small\\strut\\ #1\\ }}

\\setlength{\\parskip}{6pt}
\\setlength{\\parindent}{0pt}

\\begin{document}

% ── PAGINA DE CAPA (imagem full-page) ─────────────────────────
\\thispagestyle{empty}
\\begin{figure}[h!]
  \\centering
  \\includegraphics[width=\\paperwidth,height=\\paperheight,keepaspectratio=false]{capa}
\\end{figure}
\\clearpage

% ── PAGINA DE IDENTIFICACAO DO GRUPO ──────────────────────────
\\newgeometry{top=3cm, bottom=3cm, left=3cm, right=3cm}
\\thispagestyle{empty}
\\begin{center}
  {\\footnotesize\\color{muted}\\MakeUppercase{ETE Cicero Dias · Modulo 1 · Projeto Integrador I}}\\\\[4pt]
  {\\footnotesize\\color{muted}\\MakeUppercase{Profa Samara Silvia Sabino · ${esc(turma)}}}\\\\[3cm]
  {\\color{crimson}\\semibold\\fontsize{9}{11}\\selectfont\\MakeUppercase{Devolutiva Oficial — Etapa 01 — Imersao}}\\\\[16pt]
  {\\semibold\\fontsize{28}{32}\\selectfont ${esc(group.name)}}\\\\[0.6cm]
  \\noindent\\rule{0.5\\linewidth}{0.4pt}\\\\[0.6cm]
  {\\small\\color{muted}Periodo: ${esc(dataEntrega)}}\\\\[2.5cm]
  \\begin{tcolorbox}[enhanced,colback=bg,colframe=crimson,arc=3pt,boxrule=0.8pt,
    left=24pt,right=24pt,top=14pt,bottom=14pt,width=0.45\\linewidth]
    \\centering
    {\\footnotesize\\color{muted}\\semibold\\MakeUppercase{Nota Final — Design Thinking}}\\\\[10pt]
    {\\semibold\\fontsize{44}{44}\\selectfont\\color{crimson} ${fmt(totalGeral)}}\\\\[4pt]
    {\\color{muted}\\small / 30,00 pts}
  \\end{tcolorbox}
\\end{center}
\\clearpage

% ── SUMARIO ───────────────────────────────────────────────────
\\pagestyle{fancy}
\\fancyhf{}
\\fancyhead[L]{\\footnotesize\\color{muted}\\MakeUppercase{Devolutiva · ${esc(group.name)}}}
\\fancyhead[R]{\\footnotesize\\color{muted}\\thepage}
\\renewcommand{\\headrulewidth}{0.3pt}

\\tableofcontents
\\clearpage

% ── CONTEUDO POR DISCIPLINA ───────────────────────────────────
${secoes}

\\end{document}
`
}

async function compilarPDF(tex) {
  const res = await fetch('https://latex.ytotech.com/builds/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ compiler: 'xelatex', resources: [{ main: true, content: tex }] }),
  })
  if (!res.ok) throw new Error('Compilação falhou')
  const data = await res.json()
  if (data.pdf) {
    const bin = atob(data.pdf)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return new Blob([bytes], { type: 'application/pdf' })
  }
  throw new Error(data.error || 'Sem PDF')
}

// ── Componente ────────────────────────────────────────────────
export default function DevolutivaModal({ group, orgId: orgIdProp, org, onClose }) {
  const resolvedOrgId = orgIdProp || group?.org_id
  const avaliacao = useAvaliacao(group?.id, resolvedOrgId)
  const crud      = useAvaliacaoCrud(group?.id, resolvedOrgId)
  const { notes } = useNotes(group?.id, resolvedOrgId)
  const config    = useAvaliacaoConfig(group?.id, resolvedOrgId)

  const [turma,       setTurma]       = useState('Turma A · 2026.1')
  const [dataEntrega, setDataEntrega] = useState('22 de maio de 2026')
  const [etapa,       setEtapa]       = useState('idle')
  const [erro,        setErro]        = useState('')
  const [texContent,  setTexContent]  = useState('')
  const [pushUrl,     setPushUrl]     = useState('')

  const { notaGrupo, nivelGrupo, atrasoGrupo, totalDisciplina, loading } = avaliacao
  const { etapas } = config

  // Monta path: TurmaA/Grupo01/devolutiva-imersao-YYYYMMDD.tex
  function montarPath() {
    const orgName = org?.name || ''
    const turmaLetra = orgName.endsWith('B') ? 'B' : 'A'
    const turmaDir = `Turma${turmaLetra}`

    // Extrai "Grupo 01" do nome → "Grupo01"
    const match = group.name.match(/grupo\s*(\d+)/i)
    const grupoDir = match ? `Grupo${match[1].padStart(2, '0')}` : group.name.replace(/[^a-zA-Z0-9]/g, '')

    const hoje = new Date()
    const data = `${hoje.getFullYear()}${String(hoje.getMonth()+1).padStart(2,'0')}${String(hoje.getDate()).padStart(2,'0')}`

    return `${turmaDir}/${grupoDir}/devolutiva-imersao-${data}.tex`
  }

  async function gerar() {
    try {
      setErro('')
      setEtapa('gerando')

      const dados = coletarDados(group, notaGrupo, nivelGrupo, atrasoGrupo, totalDisciplina, crud, notes, etapas)
      const tex   = montarTex(dados, turma, dataEntrega)
      setTexContent(tex)

      // Push pro GitHub ETE-CiceroDias/ete-docs-mod1
      const path = montarPath()
      const result = await pushFileToRepo({
        repo: 'ETE-CiceroDias/ete-docs-mod1',
        path,
        content: tex,
        message: `devolutiva: ${group.name} — imersão ${new Date().toLocaleDateString('pt-BR')}`,
        groupToken: group.github_token,
      })

      if (result.error) throw new Error(result.error)

      setPushUrl(result.url || '')
      setEtapa('pronto')
    } catch (e) {
      setErro(e.message || 'Erro')
      setEtapa('erro')
    }
  }

  function downloadTex() {
    const grupoSlug = group.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([texContent], { type: 'text/plain' }))
    a.download = `devolutiva-imersao-${grupoSlug}.tex`
    a.click()
  }

  const inp = { width: '100%', padding: '7px 10px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', ...mono, fontSize: 11, borderRadius: 'var(--radius)', outline: 'none', boxSizing: 'border-box' }
  const lbl = (t) => <div style={{ ...mono, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 4 }}>{t}</div>

  const path = texContent ? montarPath() : ''

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-red)', borderRadius: 'var(--radius-md)', width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        <div style={{ height: 3, background: 'linear-gradient(90deg, var(--red), var(--red-glow))', flexShrink: 0 }} />
        <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, borderBottom: '1px solid var(--border)' }}>
          <div>
            <div style={{ ...mono, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 3 }}>Gerar Devolutiva</div>
            <div style={{ fontFamily: 'var(--ff-disp)', fontSize: 18, color: 'var(--text)', letterSpacing: '0.04em' }}>{group.name}</div>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} /></button>
        </div>

        <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {etapa === 'idle' && (<>
            <div style={{ ...mono, fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.6, padding: '10px 12px', background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
              Monta o <strong style={{ color: 'var(--text-muted)' }}>.tex</strong> com notas, checks e anotações e faz push pra:<br />
              <span style={{ color: 'var(--text-sub)' }}>ETE-CiceroDias/ete-docs-mod1 → {montarPath()}</span>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>{lbl('Turma')}<input value={turma} onChange={e => setTurma(e.target.value)} style={inp} /></div>
              <div style={{ flex: 1 }}>{lbl('Período')}<input value={dataEntrega} onChange={e => setDataEntrega(e.target.value)} style={inp} /></div>
            </div>
            <button onClick={gerar} disabled={loading}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', background: 'var(--red)', border: 'none', borderRadius: 'var(--radius)', color: '#fff', ...mono, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', opacity: loading ? 0.5 : 1 }}>
              <GitBranch size={14} /> Gerar e publicar no GitHub
            </button>
          </>)}

          {etapa === 'gerando' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '24px 0' }}>
              <div style={{ width: 40, height: 40, border: '2px solid var(--border)', borderTopColor: 'var(--red)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <div style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>Montando .tex e publicando no GitHub...</div>
            </div>
          )}

          {etapa === 'pronto' && (<>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'rgba(90,171,110,0.08)', border: '1px solid rgba(90,171,110,0.3)', borderRadius: 'var(--radius)' }}>
              <CheckCircle size={15} style={{ color: '#5aab6e', flexShrink: 0 }} />
              <div style={{ ...mono, fontSize: 11, color: '#5aab6e', lineHeight: 1.5 }}>
                Publicado em<br />
                <span style={{ color: '#5aab6e', opacity: 0.8 }}>{path}</span>
              </div>
            </div>
            <div style={{ ...mono, fontSize: 10, color: 'var(--text-dim)', padding: '8px 12px', background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', lineHeight: 1.7 }}>
              No terminal da pasta do repo:<br />
              <span style={{ color: 'var(--text-sub)' }}>git pull</span><br />
              <span style={{ color: 'var(--text-sub)' }}>cd {path.split('/').slice(0, 2).join('/')}</span><br />
              <span style={{ color: 'var(--text-sub)' }}>xelatex {path.split('/').pop()}</span>
            </div>
            {pushUrl && (
              <a href={pushUrl} target="_blank" rel="noopener noreferrer"
                style={{ ...mono, fontSize: 11, color: 'var(--red)', textAlign: 'center' }}>
                ver no GitHub →
              </a>
            )}
            <button onClick={downloadTex}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-muted)', ...mono, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>
              <FileText size={13} /> Baixar .tex também
            </button>
            <button onClick={() => { setEtapa('idle'); setPushUrl('') }}
              style={{ ...mono, fontSize: 10, color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center' }}>
              gerar novamente
            </button>
          </>)}

          {etapa === 'erro' && (<>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', background: 'var(--red-dim)', border: '1px solid var(--border-red)', borderRadius: 'var(--radius)' }}>
              <AlertTriangle size={13} style={{ color: 'var(--red)', flexShrink: 0, marginTop: 1 }} />
              <div style={{ ...mono, fontSize: 11, color: 'var(--red)', lineHeight: 1.5 }}>{erro}</div>
            </div>
            {texContent && (
              <button onClick={downloadTex}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-muted)', ...mono, fontSize: 12, cursor: 'pointer' }}>
                <FileText size={13} /> Baixar .tex (fallback)
              </button>
            )}
            <button onClick={() => setEtapa('idle')}
              style={{ ...mono, fontSize: 10, color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center' }}>
              tentar novamente
            </button>
          </>)}
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}