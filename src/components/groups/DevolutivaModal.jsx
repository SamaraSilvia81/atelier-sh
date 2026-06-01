import { useState } from 'react'
import { X, FileText, Download, CheckCircle, AlertTriangle, GitBranch } from 'lucide-react'
import { DISCIPLINAS, NIVEIS_AVALIACAO, PENALIZACOES_ATRASO } from '../../data/criterios'
import { useAvaliacao } from '../../hooks/useAvaliacao'
import { useAvaliacaoCrud } from '../../hooks/useAvaliacaoCrud'
import { useNotes } from '../../hooks/useNotes'
import { useAvaliacaoConfig } from '../../hooks/useAvaliacaoConfig'
import { pushFileToRepo } from '../../lib/github'
import { useSettings } from '../../hooks/useSettings'

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


function montarTex(dados, turma, dataEntrega, resumoIA = null) {
  const { group, disciplinas, totalGeral } = dados
  const fmt = n => String(n.toFixed(2)).replace('.', ',')
  const hoje = new Date()
  const dataHoje = hoje.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
  const ano = hoje.getFullYear()

  // ── helpers de status ──────────────────────────────────────
  function statusCmd(nota, max) {
    if (max === 0) return { cmd: 'statuswarn', label: '---' }
    const p = nota / max
    if (p >= 0.8) return { cmd: 'statusok',   label: 'Completo' }
    if (p >= 0.5) return { cmd: 'statuswarn', label: 'c/ ressalvas' }
    if (p >  0)   return { cmd: 'statuswarn', label: 'Incompleto' }
    return { cmd: 'statuswarn', label: 'Não entregue' }
  }

  // ── tabela resumo de uma fase ──────────────────────────────
  function tabelaResumo(criterios) {
    const linhas = criterios.map(cr => {
      const { cmd, label } = statusCmd(cr.nota, cr.max)
      return `${esc(cr.nome)} & \\${cmd}{${label}} & ${fmt(cr.max)} & \\textbf{${fmt(cr.nota)}} \\\\`
    }).join('\n')
    const totalFase = criterios.reduce((a, c) => a + c.nota, 0)
    const maxFase   = criterios.reduce((a, c) => a + c.max,  0)
    return (
      '\\rowcolors{2}{crow}{white}\n' +
      '\\begin{tabular}{@{} L{2.8cm} C{2.0cm} C{1.1cm} C{1.1cm} @{}}\n' +
      '\\toprule\n' +
      '\\textbf{Critério} & \\textbf{Status} & \\textbf{Máx.} & \\textbf{Nota} \\\\\n' +
      '\\midrule\n' +
      linhas + '\n' +
      '\\midrule\n' +
      `\\textbf{Total} & & \\textbf{${fmt(maxFase)}} & \\textbf{\\color{cred}${fmt(totalFase)}} \\\\\n` +
      '\\bottomrule\n' +
      '\\end{tabular}'
    )
  }

  // ── seção por critério (subsection + nota + checks + comentário) ──
  function secaoCriterio(cr) {
    const { cmd, label } = statusCmd(cr.nota, cr.max)

    // checks: ✓ marcados em verde, □ não marcados em cinza
    const checksStr = cr.checksFeitos && cr.checksFeitos.length > 0
      ? '\n\n' +
        '\\begin{itemize}[leftmargin=14pt,itemsep=1pt,topsep=3pt,parsep=0pt]\n' +
        cr.checksFeitos.map(c =>
          c.marcado
            ? `  \\item[\\textcolor{cgood}{$\\checkmark$}] {\\small\\textcolor{cgood}{${esc(c.texto)}}}`
            : `  \\item[$\\square$] {\\small\\textcolor{cmuted}{${esc(c.texto)}}}`
        ).join('\n') + '\n' +
        '\\end{itemize}'
      : ''

    const atrasoStr = cr.atrasoLabel
      ? `\n\n{\\small\\color{cred}\\textit{Penalização por atraso: ${esc(cr.atrasoLabel)}}}`
      : ''

    const comentStr = cr.comentario
      ? '\n\n' + esc(cr.comentario)
      : ''

    return (
      `\\subsection{${esc(cr.nome)}}\n\n` +
      `\\noindent\\${cmd}{${fmt(cr.nota)}\\,/\\,${fmt(cr.max)} pts · ${label}}` +
      checksStr +
      comentStr +
      atrasoStr
    )
  }

  // ── monta todas as sections (uma por disciplina) ───────────
  const secoes = disciplinas.map(d => {
    // coleta todos os critérios de todas as fases da disciplina
    const todosCriterios = d.fases.flatMap(f => f.criterios)

    const tabelaGeral = tabelaResumo(todosCriterios)

    const detalhesFases = d.fases.map(f => {
      const secoesDosCriterios = f.criterios.map(secaoCriterio).join('\n\n')
      return secoesDosCriterios
    }).join('\n\n')

    return (
      `\\section{Avaliação Geral}\n\n` +
      `\\notadestaque{${fmt(d.total)}}{${fmt(d.max)}}\n\n` +
      'A Fase~1 foi concluída. A seguir o resumo dos critérios e os comentários por critério.\n\n' +
      `\\subsection{Resumo dos Critérios}\n\n` +
      tabelaGeral + '\n\n' +
      `\\section{Comentários por Critério}\n\n` +
      detalhesFases
    )
  }).join('\n\n')

  // ── abstract (gerado pelo Groq ou vazio) ───────────────────
  const abstractStr = resumoIA
    ? '\\begin{abstract}\n' + esc(resumoIA) + '\n\\end{abstract}\n\n'
    : ''

  const periodoStr = dataEntrega || dataHoje

  // ── preâmbulo exatamente igual ao template de referência ───
  const preambulo = [
    `% % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % %`,
    `%  Devolutiva — Fase 1: Imersão`,
    `%  Disciplina: Design Thinking (DE_233) — ETE Cícero Dias`,
    `%  Profa. Samara Silva  ·  Recife, ${dataHoje}`,
    `% % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % %`,
    ``,
    `\\documentclass[`,
    `  sigconf,`,
    `  language=portuguese`,
    `]{acmart}`,
    ``,
    `% ── Desliga rodapé ACM ──────────────────────────────────────`,
    `\\settopmatter{printacmref=false}`,
    `\\setcopyright{none}`,
    `\\acmYear{${ano}}`,
    ``,
    `% ── Pacotes ─────────────────────────────────────────────────`,
    `\\usepackage[portuguese]{babel}`,
    `\\usepackage{microtype}`,
    `\\usepackage{booktabs}`,
    `\\usepackage{tabularx}`,
    `\\usepackage{array}`,
    `\\usepackage{colortbl}`,
    `\\usepackage[dvipsnames,table]{xcolor}`,
    `\\usepackage[inline]{enumitem}`,
    `\\usepackage{graphicx}`,
    ``,
    `% ── Cores ───────────────────────────────────────────────────`,
    `\\definecolor{cgood}{HTML}{1E6B3A}`,
    `\\definecolor{cwarn}{HTML}{8B4500}`,
    `\\definecolor{cred}{HTML}{C0392B}`,
    `\\definecolor{cmuted}{HTML}{666666}`,
    `\\definecolor{crow}{HTML}{F2EFEB}`,
    ``,
    `% ── Colunas customizadas para tabela ────────────────────────`,
    `\\newcolumntype{L}[1]{>{\\raggedright\\arraybackslash}p{#1}}`,
    `\\newcolumntype{C}[1]{>{\\centering\\arraybackslash}p{#1}}`,
    ``,
    `% ── Comando nota destacada ───────────────────────────────────`,
    `\\newcommand{\\notadestaque}[2]{%`,
    `  \\noindent\\textbf{Nota:}\\enspace%`,
    `  {\\large\\bfseries\\color{cred}#1\\,/\\,#2\\,pts}%`,
    `}`,
    ``,
    `% ── Comando label de status ──────────────────────────────────`,
    `\\newcommand{\\statusok}[1]{{\\small\\bfseries\\color{cgood}#1}}`,
    `\\newcommand{\\statuswarn}[1]{{\\small\\bfseries\\color{cwarn}#1}}`,
    ``,
    `% ── Renomeações PT-BR ────────────────────────────────────────`,
    `\\AtBeginDocument{%`,
    `  \\renewcommand{\\abstractname}{Resumo}`,
    `  \\renewcommand{\\figurename}{Figura}`,
    `  \\renewcommand{\\tablename}{Tabela}`,
    `}`,
    ``,
    `% ────────────────────────────────────────────────────────────`,
    `\\begin{document}`,
    ``,
    `% ── CAPA ────────────────────────────────────────────────────`,
    `\\thispagestyle{empty}`,
    `\\IfFileExists{capa.png}{%`,
    `  \\includegraphics[width=\\paperwidth,height=\\paperheight]{capa.png}%`,
    `}{%`,
    `  \\begin{center}\\small\\color{gray}[capa.png n\\~ao encontrada]\\end{center}%`,
    `}`,
    `\\newpage`,
    ``,
    `% ── METADADOS ────────────────────────────────────────────────`,
    `\\title{Devolutiva de Avaliação: Fase 1 --- Imersão}`,
    ``,
    `\\author{Profa. Samara Silva}`,
    `\\authornote{%`,
    `  Grupo avaliado: ${esc(group.name)}\\quad·\\quad`,
    `  Período: ${esc(periodoStr)}\\quad·\\quad`,
    `  Avaliado em: ${esc(dataHoje)}.%`,
    `}`,
    `\\email{samarasilvia.educa@gmail.com}`,
    `\\affiliation{%`,
    `  \\institution{ETE Cícero Dias}`,
    `  \\department{Design Thinking --- DE\\_233}`,
    `  \\city{Recife}`,
    `  \\state{Pernambuco}`,
    `  \\country{Brasil}`,
    `}`,
    ``,
  ].join('\n')

  // ── rodapé / assinatura ────────────────────────────────────
  const rodape = [
    `\\section{Considerações Finais}`,
    ``,
    `Os ajustes indicados são de natureza metodológica e devem ser`,
    `incorporados antes do avanço para a Fase~2 (Definição).`,
    `Continuem assim.`,
    ``,
    `% ── Assinatura ───────────────────────────────────────────────`,
    ``,
    `\\noindent\\rule{\\linewidth}{0.4pt}`,
    ``,
    `\\begin{flushright}`,
    `\\textbf{Profa.\\ Samara Silva}\\\\`,
    `{\\small\\color{cmuted} Design Thinking --- DE\\_233 · ETE Cícero Dias}\\\\`,
    `{\\small\\color{cmuted} Recife, ${esc(dataHoje)}}`,
    `\\end{flushright}`,
    ``,
    `% ── Sem referências bibliográficas ───────────────────────────`,
    ``,
    `\\end{document}`,
  ].join('\n')

  return (
    preambulo +
    abstractStr +
    '\\maketitle\n\n' +
    secoes + '\n\n' +
    rodape + '\n'
  )
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

  const { settings } = useSettings()
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


  // ── Gera resumo via Groq ────────────────────────────────────
  async function gerarResumoGroq(dados) {
    const token = settings?.groq_token || localStorage.getItem('atelier_groq_token')
    if (!token) return null

    const { disciplinas, totalGeral } = dados
    const linhas = disciplinas.flatMap(d =>
      d.fases.flatMap(f =>
        f.criterios.map(cr => {
          const pct = cr.max > 0 ? ((cr.nota / cr.max) * 100).toFixed(0) : 0
          return `- ${cr.nome}: ${cr.nota.toFixed(2)}/${cr.max.toFixed(2)} pts (${pct}%) — nível: ${cr.nivelLabel}${cr.comentario ? ` — obs: ${cr.comentario.slice(0, 120)}` : ''}`
        })
      )
    ).join('\n')

    const prompt = `Você é uma professora de Design Thinking do ensino técnico. 
Escreva um resumo acadêmico conciso (8 a 10 linhas) em português para a devolutiva do grupo "${dados.group.name}".
O resumo deve: mencionar a nota total (${totalGeral.toFixed(2)} pts), destacar os pontos fortes, indicar os pontos de atenção metodológicos e orientar sobre os próximos passos.
Use linguagem técnica e objetiva, sem floreios.

Dados da avaliação:
${linhas}

Responda apenas com o texto do resumo, sem títulos, sem markdown, sem aspas.`

    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          model: 'llama-3.1-70b-versatile',
          max_tokens: 400,
          temperature: 0.4,
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      if (!res.ok) return null
      const json = await res.json()
      return json.choices?.[0]?.message?.content?.trim() || null
    } catch {
      return null
    }
  }

  async function gerar() {
    try {
      setErro('')
      setEtapa('gerando')

      const dados    = coletarDados(group, notaGrupo, nivelGrupo, atrasoGrupo, totalDisciplina, crud, notes, etapas)
      const resumoIA = await gerarResumoGroq(dados)
      const tex      = montarTex(dados, turma, dataEntrega, resumoIA)
      setTexContent(tex)

      // Push pro GitHub ETE-CiceroDias/ete-docs-mod1
      const path = montarPath()
      const result = await pushFileToRepo({
        repo: 'ETE-CiceroDias/ete-docs-mod1',
        path,
        content: tex,
        message: `devolutiva: ${group.name} — imersão ${new Date().toLocaleDateString('pt-BR')}`,
        groupToken: undefined, // usa sempre o token global das configurações
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