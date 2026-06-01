import { useState } from 'react'
import { X, FileText, Download, CheckCircle, AlertTriangle, GitBranch } from 'lucide-react'
import { DISCIPLINAS, NIVEIS_AVALIACAO, PENALIZACOES_ATRASO } from '../../data/criterios'
import { FATORES } from '../../hooks/useAvaliacaoIndividual'
import { useAvaliacao } from '../../hooks/useAvaliacao'
import { useAvaliacaoCrud } from '../../hooks/useAvaliacaoCrud'
import { useNotes } from '../../hooks/useNotes'
import { useAvaliacaoConfig } from '../../hooks/useAvaliacaoConfig'
import { useAvaliacaoIndividual } from '../../hooks/useAvaliacaoIndividual'
import { pushFileToRepo } from '../../lib/github'
import { useSettings } from '../../hooks/useSettings'

const mono = { fontFamily: 'var(--ff-mono)' }

// ── Escaping LaTeX ────────────────────────────────────────────
function esc(str = '') {
  return String(str)
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/&/g, '\\&').replace(/%/g, '\\%').replace(/\$/g, '\\$')
    .replace(/#/g, '\\#').replace(/_/g, '\\_').replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}').replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}')
    .replace(/</g, '\\textless{}').replace(/>/g, '\\textgreater{}')
}

function escInline(str = '') {
  return esc(
    str.replace(/<[^>]*>/g, '')
       .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
       .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"')
  )
}

function htmlToLatex(html = '') {
  if (!html) return ''
  return html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gis,  (_, t) => `\n\n\\textbf{\\large ${escInline(t)}}\n\n`)
    .replace(/<h2[^>]*>(.*?)<\/h2>/gis,  (_, t) => `\n\n\\textbf{${escInline(t)}}\n\n`)
    .replace(/<h3[^>]*>(.*?)<\/h3>/gis,  (_, t) => `\n\n\\textit{\\textbf{${escInline(t)}}}\n\n`)
    .replace(/<strong[^>]*>(.*?)<\/strong>/gis, (_, t) => `\\textbf{${escInline(t)}}`)
    .replace(/<em[^>]*>(.*?)<\/em>/gis,         (_, t) => `\\textit{${escInline(t)}}`)
    .replace(/<code[^>]*>(.*?)<\/code>/gis,      (_, t) => `\\texttt{${escInline(t)}}`)
    .replace(/<ul[^>]*>(.*?)<\/ul>/gis, (_, body) => {
      const items = [...body.matchAll(/<li[^>]*>(.*?)<\/li>/gis)]
        .map(m => `  \\item ${escInline(m[1].replace(/<[^>]*>/g, '').trim())}`).join('\n')
      return `\n\\begin{itemize}[leftmargin=14pt,itemsep=1pt,topsep=3pt]\n${items}\n\\end{itemize}\n`
    })
    .replace(/<ol[^>]*>(.*?)<\/ol>/gis, (_, body) => {
      const items = [...body.matchAll(/<li[^>]*>(.*?)<\/li>/gis)]
        .map(m => `  \\item ${escInline(m[1].replace(/<[^>]*>/g, '').trim())}`).join('\n')
      return `\n\\begin{enumerate}[leftmargin=14pt,itemsep=1pt,topsep=3pt]\n${items}\n\\end{enumerate}\n`
    })
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '\\&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, '~').replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n').trim()
}

function htmlToText(html = '') {
  return html
    .replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<\/li>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n').trim()
}

// ── Coleta dados do Atelier ───────────────────────────────────
function coletarDados(group, notaGrupo, nivelGrupo, atrasoGrupo, totalDisciplina, crud, notes, etapas) {
  const disciplinas = DISCIPLINAS.map(disc => {
    const todasFases = crud.getFasesDisciplina(disc.id)
    const fases = todasFases.map(fase => {
      const criterios = crud.getCriteriosFase(disc.id, fase.nome).map(cr => {
        const nivel      = nivelGrupo(disc.id, cr.id)
        const nivelInfo  = NIVEIS_AVALIACAO.find(n => n.id === nivel)
        const atraso     = atrasoGrupo(disc.id, cr.id)
        const atrasoInfo = PENALIZACOES_ATRASO.find(a => a.id === atraso)
        const nota       = notaGrupo(disc.id, cr.id) ?? 0
        const crNomeNorm = cr.nome.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim()
        const notaVinc   = notes.find(n => {
          const t = (n.title || '').replace(/&amp;/g, '&').trim()
          return t === `Avaliação: ${crNomeNorm}` || t === `Avaliação: ${cr.nome}`
        })
        const comentario = notaVinc?.content ? htmlToLatex(notaVinc.content) : ''
        const itens      = cr.itens || []
        const checksFeitos = itens.map((item, i) => ({
          texto: item,
          marcado: etapas?.[`${disc.id}-${cr.id}-item-${i}`] ?? false,
        }))
        return {
          id: cr.id, nome: cr.nome, max: cr.max, nota,
          nivelLabel:  nivelInfo?.label  || '—',
          nivelEmoji:  nivelInfo?.emoji  || '',
          nivelDesc:   nivelInfo?.desc   || '',
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

// ── Monta o .tex ──────────────────────────────────────────────
function montarTex(dados, turma, dataEntrega, resumoIA, discId, members, contribuicoes) {
  const { group, disciplinas } = dados
  const fmt  = n => String(Number(n).toFixed(2)).replace('.', ',')
  const hoje = new Date()
  const dataHoje = hoje.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
  const ano  = hoje.getFullYear()

  // Filtra disciplinas se discId passado
  const discsAlvo = discId
    ? disciplinas.filter(d => d.id === discId)
    : disciplinas

  // ── status por nivelId ──
  function statusCmd(cr) {
    const id = cr.nivelId
    if (!id || id === 'nao_fez')          return { cmd: 'statuswarn', label: 'Não entregue' }
    if (id === 'completo')                return { cmd: 'statusok',   label: 'Completo' }
    if (id === 'completo_ressalvas')      return { cmd: 'statuswarn', label: 'Completo c/ ressalvas' }
    if (id === 'completo_inadequado')     return { cmd: 'statuswarn', label: 'Completo, inadequado' }
    if (id === 'faltou_pouco')            return { cmd: 'statuswarn', label: 'Faltou pouco' }
    if (id === 'faltou_pouco_erros')      return { cmd: 'statuswarn', label: 'Faltou pouco c/ erros' }
    if (id === 'faltou_muito')            return { cmd: 'statuswarn', label: 'Faltou muito' }
    if (id === 'faltou_muito_erros')      return { cmd: 'statuswarn', label: 'Faltou muito e errou' }
    if (id === 'errado')                  return { cmd: 'statuswarn', label: 'Errado' }
    return { cmd: 'statuswarn', label: cr.nivelLabel || '—' }
  }

  // ── tabela resumo (Critério | Status | Nota | Máx) ──
  function tabelaResumo(criterios) {
    const linhas = criterios.map(cr => {
      const { cmd, label } = statusCmd(cr)
      return `${esc(cr.nome)} & \\${cmd}{${label}} & \\textbf{${fmt(cr.nota)}} & ${fmt(cr.max)} \\\\`
    }).join('\n')
    const totalF = criterios.reduce((a, c) => a + c.nota, 0)
    const maxF   = criterios.reduce((a, c) => a + c.max,  0)
    return [
      '\\rowcolors{2}{crow}{white}',
      '\\begin{tabular}{@{} L{2.8cm} C{2.2cm} C{1.1cm} C{1.1cm} @{}}',
      '\\toprule',
      '\\textbf{Critério} & \\textbf{Status} & \\textbf{Nota} & \\textbf{Máx.} \\\\',
      '\\midrule',
      linhas,
      '\\midrule',
      `\\textbf{Total} & & \\textbf{\\color{cred}${fmt(totalF)}} & \\textbf{${fmt(maxF)}} \\\\`,
      '\\bottomrule',
      '\\end{tabular}',
    ].join('\n')
  }

  // ── legenda dos níveis de avaliação ──
  function legendaNiveis() {
    const linhas = NIVEIS_AVALIACAO.map(n =>
      `  \\item \\textbf{${esc(n.label)}} (${Math.round(n.pct * 100)}\\%): ${esc(n.desc)}`
    ).join('\n')
    const penais = PENALIZACOES_ATRASO.filter(a => a.id !== 'sem_atraso').map(a => {
      const v = a.id === 'nao_entregou' ? 'zera' : `\\(-${Math.round(a.desconto * 100)}\\%\\) da nota máx.`
      return `  \\item \\textbf{${esc(a.label)}}: ${v}`
    }).join('\n')
    return [
      '\\section{Critérios e Níveis de Avaliação}',
      '',
      'Esta seção apresenta os níveis utilizados e as penalizações por atraso, para transparência na avaliação.',
      '',
      '\\subsection{Níveis de Completude}',
      '',
      '\\begin{itemize}[leftmargin=14pt,itemsep=2pt,topsep=3pt]',
      linhas,
      '\\end{itemize}',
      '',
      '\\subsection{Penalizações por Atraso}',
      '',
      '\\begin{itemize}[leftmargin=14pt,itemsep=2pt,topsep=3pt]',
      penais,
      '\\end{itemize}',
    ].join('\n')
  }

  // ── seção por critério ──
  function secaoCriterio(cr) {
    const { cmd, label } = statusCmd(cr)

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

    const nivelDescStr = cr.nivelDesc
      ? `\n\n{\\small\\color{cmuted}\\textit{${esc(cr.nivelDesc)}}}`
      : ''

    const comentStr = cr.comentario ? '\n\n' + cr.comentario : ''

    return [
      `\\subsection{${esc(cr.nome)}}`,
      '',
      `\\noindent\\${cmd}{${fmt(cr.nota)}\\,/\\,${fmt(cr.max)} pts \\textperiodcentered\\ ${label}}` +
        nivelDescStr + checksStr + comentStr + atrasoStr,
    ].join('\n')
  }

  // ── seção de devolutiva individual ──
  function secaoIndividual() {
    if (!members || members.length === 0) return ''

    const FATORES_INFO = {
      liderou:          { label: 'Liderou',           mult: 1.00, desc: 'Coordenou e entregou' },
      participou:       { label: 'Participou',         mult: 1.00, desc: 'Contribuiu ativamente' },
      participou_pouco: { label: 'Participou pouco',   mult: 0.70, desc: 'Envolvimento limitado' },
      so_fez_parte:     { label: 'Só fez sua parte',   mult: 0.40, desc: 'Mínimo, sem engajamento' },
      nao_participou:   { label: 'Não participou',     mult: 0.00, desc: 'Sem contribuição registrada' },
    }

    const blocosMembros = members.map(m => {
      const nome  = esc(m.name || m.profile?.name || 'Integrante')
      const mid   = m.user_id || m.id

      // nota por disciplina × fase
      let totalInd = 0
      const linhasDisc = discsAlvo.flatMap(d =>
        d.fases.map(f => {
          const notaFase = f.criterios.reduce((a, c) => a + c.nota, 0)
          const contrib  = contribuicoes.find(c => String(c.member_id) === String(mid) && c.disciplina === d.id && c.fase === f.nome)
          const fatorId  = contrib?.fator || null
          const info     = fatorId ? (FATORES_INFO[fatorId] || { label: fatorId, mult: 0, desc: '' }) : null
          const notaInd  = info ? parseFloat((notaFase * info.mult).toFixed(2)) : null
          if (notaInd != null) totalInd += notaInd
          const notaStr  = notaInd != null ? `${fmt(notaInd)}\\,pts` : '\\textit{sem registro}'
          const fatorStr = info ? `${esc(info.label)} (${Math.round(info.mult * 100)}\\%)` : '---'
          return `  \\item \\textbf{${esc(d.nome)} — ${esc(f.nome)}}: ${notaStr} — \\textit{${fatorStr}}`
        })
      ).join('\n')

      // extras
      const extrasM = []  // extras não incluídos na devolutiva PDF
      const totalExtras = extrasM.reduce((a, e) => a + Number(e.valor), 0)
      totalInd += totalExtras

      const extrasStr = extrasM.length > 0
        ? extrasM.map(e => `  \\item \\textbf{Extra — ${esc(e.descricao)}}: +${fmt(e.valor)}\\,pts`).join('\n')
        : ''

      return [
        `\\subsubsection*{${nome}}`,
        '',
        '\\begin{itemize}[leftmargin=14pt,itemsep=2pt,topsep=3pt,parsep=0pt]',
        linhasDisc,
        extrasStr,
        `  \\item[\\textbf{=}] \\textbf{Total Individual: ${fmt(totalInd)}\\,pts}`,
        '\\end{itemize}',
      ].filter(l => l !== undefined && l !== null).join('\n')
    }).join('\n\n')

    // Legenda fatores
    const legendaFatores = Object.entries(FATORES_INFO).map(([_, f]) =>
      `  \\item \\textbf{${esc(f.label)}} (${Math.round(f.mult * 100)}\\%): ${esc(f.desc)}`
    ).join('\n')

    return [
      '\\section{Devolutiva Individual}',
      '',
      'A nota individual é calculada aplicando o fator de contribuição registrado pela professora sobre a nota do grupo em cada fase.',
      '',
      '\\subsection{Fatores de Contribuição}',
      '',
      '\\begin{itemize}[leftmargin=14pt,itemsep=1pt,topsep=3pt]',
      legendaFatores,
      '\\end{itemize}',
      '',
      '\\subsection{Notas por Integrante}',
      '',
      blocosMembros,
    ].join('\n')
  }

  // ── corpo principal — uma section por disciplina ──
  const corpoPrincipal = discsAlvo.map(d => {
    const todosCriterios = d.fases.flatMap(f => f.criterios)

    const detalhesFases = d.fases.map(f => {
      return f.criterios.map(secaoCriterio).join('\n\n')
    }).join('\n\n')

    return [
      `\\section{${esc(d.nome)}}`,
      '',
      `\\notadestaque{${fmt(d.fases.reduce((a,f)=>a+f.totalFase,0))}}{${fmt(d.fases.reduce((a,f)=>a+f.maxFase,0))}}`,
      '',
      '\\subsection{Resumo dos Critérios}',
      '',
      tabelaResumo(todosCriterios),
      '',
      '\\section{Comentários por Critério}',
      '',
      detalhesFases,
    ].join('\n')
  }).join('\n\n')

  // ── abstract ──
  const abstractBody = resumoIA
    ? esc(resumoIA)
    : `Devolutiva de avaliação do grupo \\textbf{${esc(group.name)}}, referente à Fase~1 --- Imersão, no âmbito das disciplinas do Módulo~1 da ETE Cícero Dias. A nota total obtida foi de \\textbf{${fmt(discsAlvo.reduce((a, d) => a + d.total, 0))}} pontos.`

  const periodoStr = dataEntrega || dataHoje

  // ── preâmbulo ──
  const preambulo = `% % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % %
%  Devolutiva — Fase 1: Imersão
%  ETE Cícero Dias · Módulo 1 · ${turma}
%  Profa. Samara Silva  ·  Recife, ${dataHoje}
% % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % %

\\documentclass[
  sigconf,
  language=portuguese
]{acmart}

% ── Desliga rodapé ACM ──────────────────────────────────────
\\settopmatter{printacmref=false}
\\setcopyright{none}
\\acmYear{${ano}}
\\let\\balance\\relax

% ── Pacotes ─────────────────────────────────────────────────
\\usepackage[portuguese]{babel}
\\usepackage{microtype}
\\usepackage{booktabs}
\\usepackage{tabularx}
\\usepackage{array}
\\usepackage{colortbl}
\\usepackage[dvipsnames,table]{xcolor}
\\usepackage[inline]{enumitem}
\\usepackage{graphicx}
\\usepackage{textcomp}

% ── Cores ───────────────────────────────────────────────────
\\definecolor{cgood}{HTML}{1E6B3A}
\\definecolor{cwarn}{HTML}{8B4500}
\\definecolor{cred}{HTML}{C0392B}
\\definecolor{cmuted}{HTML}{666666}
\\definecolor{crow}{HTML}{F2EFEB}

% ── Colunas customizadas ─────────────────────────────────────
\\newcolumntype{L}[1]{>{\\raggedright\\arraybackslash}p{#1}}
\\newcolumntype{C}[1]{>{\\centering\\arraybackslash}p{#1}}

% ── Comandos ──────────────────────────────────────────────────
\\newcommand{\\notadestaque}[2]{%
  \\noindent\\textbf{Nota:}\\enspace%
  {\\large\\bfseries\\color{cred}#1\\,/\\,#2\\,pts}%
}
\\newcommand{\\statusok}[1]{{\\small\\bfseries\\color{cgood}#1}}
\\newcommand{\\statuswarn}[1]{{\\small\\bfseries\\color{cwarn}#1}}

% ── PT-BR ────────────────────────────────────────────────────
\\AtBeginDocument{%
  \\renewcommand{\\abstractname}{Resumo}
  \\renewcommand{\\figurename}{Figura}
  \\renewcommand{\\tablename}{Tabela}
}

% ────────────────────────────────────────────────────────────
\\begin{document}

% ── CAPA ────────────────────────────────────────────────────
\\thispagestyle{empty}
\\IfFileExists{capa.png}{%
  \\includegraphics[width=\\paperwidth,height=\\paperheight]{capa.png}%
}{%
  \\begin{center}\\small\\color{gray}[capa.png n\\~ao encontrada]\\end{center}%
}
\\newpage

% ── METADADOS ────────────────────────────────────────────────
\\title{Devolutiva de Avalia\\c{c}\\~ao --- ${esc(group.name)}}

\\author{Profa.\\ Samara Silva}
\\authornote{Grupo: \\textbf{${esc(group.name)}} \\textperiodcentered\\ Per\\'{i}odo: ${esc(periodoStr)} \\textperiodcentered\\ Avaliado em: ${esc(dataHoje)}.}
\\email{samarasilvia.educa@gmail.com}
\\affiliation{%
  \\institution{ETE C\\'{i}cero Dias}
  \\department{M\\'{o}dulo 1 --- ${esc(turma)}}
  \\city{Recife}
  \\state{Pernambuco}
  \\country{Brasil}
}

\\begin{abstract}
${abstractBody}
\\end{abstract}

\\maketitle

`

  // ── rodapé ──
  const rodape = `
\\section{Considera\\c{c}\\~oes Finais}

Os ajustes indicados s\\~ao de natureza metodol\\'{o}gica e devem ser
incorporados antes do avan\\c{c}o para a pr\\'{o}xima fase.
Continuem assim.

% ── Assinatura ───────────────────────────────────────────────

\\noindent\\rule{\\linewidth}{0.4pt}

\\begin{flushright}
\\textbf{Profa.\\ Samara Silva}\\\\
{\\small\\color{cmuted} M\\'{o}dulo 1 \\textperiodcentered\\ ETE C\\'{i}cero Dias}\\\\
{\\small\\color{cmuted} Recife, ${esc(dataHoje)}}
\\end{flushright}

\\end{document}
`

  return (
    preambulo +
    corpoPrincipal + '\n\n' +
    legendaNiveis() + '\n\n' +
    secaoIndividual() + '\n\n' +
    rodape
  )
}

// ── Groq resumo ───────────────────────────────────────────────
async function gerarResumoGroq(dados, settings) {
  const token = settings?.groq_token || localStorage.getItem('atelier_groq_token')
  if (!token) return null
  const { disciplinas, totalGeral } = dados
  const linhas = disciplinas.flatMap(d =>
    d.fases.flatMap(f =>
      f.criterios.map(cr => {
        const pct = cr.max > 0 ? ((cr.nota / cr.max) * 100).toFixed(0) : 0
        return `- ${cr.nome}: ${cr.nota.toFixed(2)}/${cr.max.toFixed(2)} pts (${pct}%) — nível: ${cr.nivelLabel}`
      })
    )
  ).join('\n')
  const prompt = `Você é professora de Design Thinking do ensino técnico. Escreva um resumo acadêmico conciso (8 a 10 linhas) em português para a devolutiva do grupo "${dados.group.name}". Mencione a nota total (${totalGeral.toFixed(2)} pts), destaque pontos fortes e indique pontos de atenção. Use linguagem técnica e objetiva.\n\nDados:\n${linhas}\n\nResponda apenas com o texto, sem títulos, markdown ou aspas.`
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ model: 'llama-3.1-70b-versatile', max_tokens: 400, temperature: 0.4, messages: [{ role: 'user', content: prompt }] }),
    })
    if (!res.ok) return null
    const json = await res.json()
    return json.choices?.[0]?.message?.content?.trim() || null
  } catch { return null }
}

// ── Componente ────────────────────────────────────────────────
export default function DevolutivaModal({ group, orgId: orgIdProp, org, discId, faseNome, onClose }) {
  const resolvedOrgId = orgIdProp || group?.org_id
  const avaliacao = useAvaliacao(group?.id, resolvedOrgId)
  const crud      = useAvaliacaoCrud(group?.id, resolvedOrgId)
  const { notes } = useNotes(group?.id, resolvedOrgId)
  const config    = useAvaliacaoConfig(group?.id, resolvedOrgId)
  const avInd     = useAvaliacaoIndividual(group?.id, resolvedOrgId)
  const { settings } = useSettings()

  const [turma,       setTurma]       = useState('Turma A · 2026.1')
  const [dataEntrega, setDataEntrega] = useState('22 de maio de 2026')
  const [etapa,       setEtapa]       = useState('idle')
  const [erro,        setErro]        = useState('')
  const [texContent,  setTexContent]  = useState('')
  const [pushUrl,     setPushUrl]     = useState('')

  const { notaGrupo, nivelGrupo, atrasoGrupo, totalDisciplina, loading } = avaliacao
  const loadingInd = avInd?.loading ?? false
  const { etapas } = config

  const parseMaybeJson = (val, fb = []) => {
    if (Array.isArray(val)) return val
    try { return JSON.parse(val) } catch { return fb }
  }
  const members = parseMaybeJson(group?.members)

  function montarPath() {
    const orgName    = org?.name || ''
    const turmaLetra = orgName.endsWith('B') ? 'B' : 'A'
    const turmaDir   = `Turma${turmaLetra}`
    const match      = group.name.match(/grupo\s*(\d+)/i)
    const grupoDir   = match ? `Grupo${match[1].padStart(2, '0')}` : group.name.replace(/[^a-zA-Z0-9]/g, '')
    const hoje       = new Date()
    const data       = `${hoje.getFullYear()}${String(hoje.getMonth()+1).padStart(2,'0')}${String(hoje.getDate()).padStart(2,'0')}`
    return `${turmaDir}/${grupoDir}/devolutiva-imersao-${data}.tex`
  }

  async function gerar() {
    try {
      setErro('')
      setEtapa('gerando')
      const dadosBrutos = coletarDados(group, notaGrupo, nivelGrupo, atrasoGrupo, totalDisciplina, crud, notes, etapas)
      // Filtra por discId e/ou faseNome
      let dados = dadosBrutos
      if (discId) {
        dados = { ...dados, disciplinas: dados.disciplinas.filter(d => d.id === discId) }
      }
      if (faseNome) {
        dados = {
          ...dados,
          disciplinas: dados.disciplinas.map(d => ({
            ...d,
            fases: d.fases.filter(f => f.nome === faseNome),
            total: d.fases.filter(f => f.nome === faseNome).reduce((a, f) => a + f.totalFase, 0),
          })).filter(d => d.fases.length > 0),
        }
      }
      const resumoIA = await gerarResumoGroq(dados, settings)
      const tex      = montarTex(dados, turma, dataEntrega, resumoIA, discId, members, avInd.contribuicoes || [])
      setTexContent(tex)
      const path   = montarPath()
      const result = await pushFileToRepo({
        repo: 'ETE-CiceroDias/ete-docs-mod1',
        path,
        content: tex,
        message: `devolutiva: ${group.name} — imersão ${new Date().toLocaleDateString('pt-BR')}`,
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
    const slug = group.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([texContent], { type: 'text/plain' }))
    a.download = `devolutiva-imersao-${slug}.tex`
    a.click()
  }

  const inp = { width: '100%', padding: '7px 10px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', ...mono, fontSize: 11, borderRadius: 'var(--radius)', outline: 'none', boxSizing: 'border-box' }
  const lbl = t => <div style={{ ...mono, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 4 }}>{t}</div>
  const path = texContent ? montarPath() : ''

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-red)', borderRadius: 'var(--radius-md)', width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        <div style={{ height: 3, background: 'linear-gradient(90deg, var(--red), var(--red-glow))', flexShrink: 0 }} />
        <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, borderBottom: '1px solid var(--border)' }}>
          <div>
            <div style={{ ...mono, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 3 }}>
              {faseNome ? `Devolutiva — ${faseNome}` : discId ? `Devolutiva — ${discId.toUpperCase()}` : 'Devolutiva Geral'}
            </div>
            <div style={{ fontFamily: 'var(--ff-disp)', fontSize: 18, color: 'var(--text)', letterSpacing: '0.04em' }}>{group.name}</div>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} /></button>
        </div>

        <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {etapa === 'idle' && (<>
            <div style={{ ...mono, fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.6, padding: '10px 12px', background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
              Gera o <strong style={{ color: 'var(--text-muted)' }}>.tex</strong> com notas, checks, anotações, legenda dos níveis e devolutiva individual.<br />
              <span style={{ color: 'var(--text-sub)' }}>→ {montarPath()}</span>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>{lbl('Turma')}<input value={turma} onChange={e => setTurma(e.target.value)} style={inp} /></div>
              <div style={{ flex: 1 }}>{lbl('Período')}<input value={dataEntrega} onChange={e => setDataEntrega(e.target.value)} style={inp} /></div>
            </div>
            <button onClick={gerar} disabled={loading || loadingInd}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', background: 'var(--red)', border: 'none', borderRadius: 'var(--radius)', color: '#fff', ...mono, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', opacity: loading ? 0.5 : 1 }}>
              <GitBranch size={14} /> Gerar e publicar no GitHub
            </button>
          </>)}

          {etapa === 'gerando' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '24px 0' }}>
              <div style={{ width: 40, height: 40, border: '2px solid var(--border)', borderTopColor: 'var(--red)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <div style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>Montando .tex e publicando...</div>
              {loadingInd && <div style={{ ...mono, fontSize: 10, color: 'var(--text-dim)' }}>carregando dados individuais...</div>}
            </div>
          )}

          {etapa === 'pronto' && (<>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'rgba(90,171,110,0.08)', border: '1px solid rgba(90,171,110,0.3)', borderRadius: 'var(--radius)' }}>
              <CheckCircle size={15} style={{ color: '#5aab6e', flexShrink: 0 }} />
              <div style={{ ...mono, fontSize: 11, color: '#5aab6e', lineHeight: 1.5 }}>
                Publicado em<br /><span style={{ opacity: 0.8 }}>{path}</span>
              </div>
            </div>
            <div style={{ ...mono, fontSize: 10, color: 'var(--text-dim)', padding: '8px 12px', background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', lineHeight: 1.7 }}>
              No terminal:<br />
              <span style={{ color: 'var(--text-sub)' }}>git pull</span><br />
              <span style={{ color: 'var(--text-sub)' }}>cd {path.split('/').slice(0,2).join('/')}</span><br />
              <span style={{ color: 'var(--text-sub)' }}>xelatex {path.split('/').pop()}</span>
            </div>
            {pushUrl && <a href={pushUrl} target="_blank" rel="noopener noreferrer" style={{ ...mono, fontSize: 11, color: 'var(--red)', textAlign: 'center' }}>ver no GitHub →</a>}
            <button onClick={downloadTex}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-muted)', ...mono, fontSize: 12, cursor: 'pointer' }}>
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