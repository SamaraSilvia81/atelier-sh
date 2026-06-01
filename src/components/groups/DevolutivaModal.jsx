import { useState } from 'react'
import { X, FileText, Download, CheckCircle, AlertTriangle, GitBranch } from 'lucide-react'
import { DISCIPLINAS, NIVEIS_AVALIACAO, PENALIZACOES_ATRASO } from '../../data/criterios'
import { useAvaliacao } from '../../hooks/useAvaliacao'
import { useAvaliacaoCrud } from '../../hooks/useAvaliacaoCrud'
import { useNotes } from '../../hooks/useNotes'
import { useAvaliacaoConfig } from '../../hooks/useAvaliacaoConfig'
import { useAvaliacaoIndividual } from '../../hooks/useAvaliacaoIndividual'
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

function escInline(str = '') {
  return esc(
    String(str)
      .replace(/<[^>]*>/g, '')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"')
  )
}

function htmlToLatex(html = '') {
  if (!html) return ''

  function inlineToLatex(h) {
    if (!h) return ''
    return h
      .replace(/<strong[^>]*>(.*?)<\/strong>/gis, (_, t) => `\\textbf{${inlineToLatex(t)}}`)
      .replace(/<b[^>]*>(.*?)<\/b>/gis,           (_, t) => `\\textbf{${inlineToLatex(t)}}`)
      .replace(/<em[^>]*>(.*?)<\/em>/gis,         (_, t) => `\\textit{${inlineToLatex(t)}}`)
      .replace(/<i[^>]*>(.*?)<\/i>/gis,           (_, t) => `\\textit{${inlineToLatex(t)}}`)
      .replace(/<code[^>]*>(.*?)<\/code>/gis,     (_, t) => `\\texttt{${escInline(t)}}`)
      .replace(/<[^>]*>/g, '')
      .replace(/&amp;/g, '\\&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, '~').replace(/&quot;/g, "''")
      .replace(/([%#])/g, '\\$1')
  }

  function liToLatex(h) {
    return inlineToLatex(h.replace(/<p[^>]*>(.*?)<\/p>/gis, '$1'))
  }

  return html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gis, (_, t) => `\n\n\\textbf{\\large ${inlineToLatex(t)}}\n\n`)
    .replace(/<h2[^>]*>(.*?)<\/h2>/gis, (_, t) => `\n\n\\textbf{${inlineToLatex(t)}}\n\n`)
    .replace(/<h3[^>]*>(.*?)<\/h3>/gis, (_, t) => `\n\n\\textit{\\textbf{${inlineToLatex(t)}}}\n\n`)
    .replace(/<ul[^>]*>(.*?)<\/ul>/gis, (_, body) => {
      const items = [...body.matchAll(/<li[^>]*>(.*?)<\/li>/gis)]
        .map(m => `  \\item ${liToLatex(m[1].trim())}`).join('\n')
      return `\n\\begin{itemize}[leftmargin=14pt,itemsep=2pt,topsep=4pt]\n${items}\n\\end{itemize}\n`
    })
    .replace(/<ol[^>]*>(.*?)<\/ol>/gis, (_, body) => {
      const items = [...body.matchAll(/<li[^>]*>(.*?)<\/li>/gis)]
        .map(m => `  \\item ${liToLatex(m[1].trim())}`).join('\n')
      return `\n\\begin{enumerate}[leftmargin=14pt,itemsep=2pt,topsep=4pt]\n${items}\n\\end{enumerate}\n`
    })
    .replace(/<p[^>]*>(.*?)<\/p>/gis, (_, t) => `\n\n${inlineToLatex(t)}\n\n`)
    .replace(/<strong[^>]*>(.*?)<\/strong>/gis, (_, t) => `\\textbf{${inlineToLatex(t)}}`)
    .replace(/<b[^>]*>(.*?)<\/b>/gis,           (_, t) => `\\textbf{${inlineToLatex(t)}}`)
    .replace(/<em[^>]*>(.*?)<\/em>/gis,         (_, t) => `\\textit{${inlineToLatex(t)}}`)
    .replace(/<i[^>]*>(.*?)<\/i>/gis,           (_, t) => `\\textit{${inlineToLatex(t)}}`)
    .replace(/<br\s*\/?>/gi, '\n\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '\\&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, '~').replace(/&quot;/g, "''")
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
        const comentario = notaVinc?.content ? htmlToLatex(notaVinc.content) : ''

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


function montarSecaoIndividual(members, contribuicoes, disciplinas) {
  if (!members || members.length === 0) return ''
  const fmt = n => n != null ? String(Number(n).toFixed(2)).replace('.', ',') : '---'
  const FATORES_INFO = {
    liderou:          { label: 'Liderou',           mult: 1.00 },
    participou:       { label: 'Participou',         mult: 1.00 },
    participou_pouco: { label: 'Participou pouco',   mult: 0.70 },
    so_fez_parte:     { label: 'Só fez sua parte',   mult: 0.40 },
    nao_participou:   { label: 'Não participou',     mult: 0.00 },
  }

  // Tabela de fatores
  const linhasFatores = Object.entries(FATORES_INFO).map(([_, f]) =>
    `${esc(f.label)} & ${Math.round(f.mult * 100)}\\% \\\\`
  ).join('\n')

  // Fases disponíveis
  const fasesCols = disciplinas.flatMap(d => d.fases.map(f => ({ discId: d.id, discNome: d.nome, faseNome: f.nome, criterios: f.criterios })))
  const headerCols = fasesCols.map(c => `\\textbf{\\small ${esc(c.discId.toUpperCase())} ${esc(c.faseNome)}}`).join(' & ')
  const colSpec = 'p{3.5cm} ' + 'p{3.2cm} '.repeat(fasesCols.length) + 'p{1.8cm}'

  const linhasInt = members.map(m => {
    const mid = m.user_id || m.id
    const nome = esc(m.name || m.profile?.name || 'Integrante')
    let total = 0
    const cells = fasesCols.map(fc => {
      const notaFase = fc.criterios.reduce((a, c) => a + (c.nota || 0), 0)
      const contrib = (contribuicoes || []).find(c =>
        String(c.member_id) === String(mid) && c.disciplina === fc.discId && c.fase === fc.faseNome)
      const fatorId = contrib?.fator || null
      const info = fatorId ? (FATORES_INFO[fatorId] || null) : null
      const nota = info ? parseFloat((notaFase * info.mult).toFixed(2)) : null
      if (nota != null) total += nota
      return nota != null
        ? `${fmt(nota)} \\textit{(${esc(info.label)})}`
        : '\\textit{---}'
    })
    return `${nome} & ${cells.join(' & ')} & \\textbf{${fmt(total)}} \\\\`
  }).join('\n')

  return (
    `\\section{Devolutiva Individual}\n\n` +
    `A nota individual é calculada aplicando o fator de contribuição sobre a nota do grupo em cada fase.\n\n` +
    `\\subsection{Fatores de Contribuição}\n\n` +
    `\\begin{tabular}{@{} p{4cm} c @{}}\n` +
    `\\toprule\n` +
    `\\textbf{Fator} & \\textbf{Multiplicador} \\\\\n` +
    `\\midrule\n` +
    linhasFatores + `\n` +
    `\\bottomrule\n` +
    `\\end{tabular}\n\n` +
    `\\subsection{Notas por Integrante}\n\n` +
    `\\begin{tabular}{@{} ${colSpec} @{}}\n` +
    `\\toprule\n` +
    `\\textbf{Integrante} & ${headerCols} & \\textbf{Total} \\\\\n` +
    `\\midrule\n` +
    linhasInt + `\n` +
    `\\bottomrule\n` +
    `\\end{tabular}`
  )
}
function legendaNiveis() {
  const linhasNiveis = NIVEIS_AVALIACAO.map(n =>
    `${esc(n.label)} & ${Math.round(n.pct * 100)}\\% & ${esc(n.desc)} \\\\`
  ).join('\n')
  const linhasPenais = PENALIZACOES_ATRASO.filter(a => a.id !== 'sem_atraso').map(a => {
    const v = a.id === 'nao_entregou' ? 'Zera a nota' : `-${Math.round(a.desconto * 100)}\\%`
    return `${esc(a.label)} & ${v} \\\\`
  }).join('\n')
  return (
    `\\appendix\n` +
    `\\onecolumn\n` +
    `\\section{Critérios e Níveis de Avaliação}\n\n` +
    `Esta seção apresenta os critérios de avaliação para referência dos estudantes.\n\n` +
    `\\subsection{Níveis de Completude}\n\n` +
    `\\begin{tabular}{@{} p{3cm} p{0.8cm} p{9.5cm} @{}}\n` +
    `\\toprule\n` +
    `\\textbf{Nível} & \\textbf{\\%} & \\textbf{Descrição} \\\\\n` +
    `\\midrule\n` +
    linhasNiveis + `\n` +
    `\\bottomrule\n` +
    `\\end{tabular}\n\n` +
    `\\subsection{Penalizações por Atraso}\n\n` +
    `\\begin{tabular}{@{} p{3.5cm} p{5cm} @{}}\n` +
    `\\toprule\n` +
    `\\textbf{Atraso} & \\textbf{Desconto} \\\\\n` +
    `\\midrule\n` +
    linhasPenais + `\n` +
    `\\bottomrule\n` +
    `\\end{tabular}`
  )
}


function montarTex(dados, turma, dataEntrega, resumoIA = null, discId = null, members = [], avInd = null) {
  const { group, disciplinas, totalGeral } = dados
  const fmt = n => String(n.toFixed(2)).replace('.', ',')
  const hoje = new Date()
  const dataHoje = hoje.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
  const ano = hoje.getFullYear()

  // título adaptado
  const discNome = discId ? (disciplinas.find(d => d.id === discId)?.nome || discId) : null
  const tituloDoc = discNome
    ? `Devolutiva de Avaliação: ${discNome}`
    : `Devolutiva de Avaliação: Fase 1 --- Imersão`

  // ── helpers de status — usa nivelId real do sistema ──────────
  function statusCmd(cr) {
    const id = cr.nivelId
    if (!id || id === 'nao_fez') return { cmd: 'statuswarn', label: 'Não entregue' }
    if (id === 'completo')           return { cmd: 'statusok',   label: 'Completo' }
    if (id === 'completo_ressalvas') return { cmd: 'statuswarn', label: 'Completo c/ ressalvas' }
    if (id === 'completo_inadequado') return { cmd: 'statuswarn', label: 'Completo, mas inadequeado'}
    if (id === 'faltou_pouco')       return { cmd: 'statuswarn', label: 'Faltou pouco' }
    if (id === 'faltou_pouco_erros') return { cmd: 'statuswarn', label: 'Faltou pouco c/ erros' }
    if (id === 'faltou_muito')       return { cmd: 'statuswarn', label: 'Faltou muito' }
    if (id === 'faltou_muito_erros') return { cmd: 'statuswarn', label: 'Faltou muito e errou' }
    if (id === 'errado')             return { cmd: 'statuswarn', label: 'Errado' }
    return { cmd: 'statuswarn', label: cr.nivelLabel || 'Não entregue' }
  }

  // ── tabela resumo de uma fase ──────────────────────────────
  function tabelaResumo(criterios) {
    const linhas = criterios.map(cr => {
      const { cmd, label } = statusCmd(cr)
      return `${esc(cr.nome)} & \\${cmd}{${label}} & \\textbf{${fmt(cr.nota)}} & ${fmt(cr.max)} \\\\`
    }).join('\n')
    const totalFase = criterios.reduce((a, c) => a + c.nota, 0)
    const maxFase   = criterios.reduce((a, c) => a + c.max,  0)
    return (
      '\\rowcolors{2}{crow}{white}\n' +
      '\\begin{tabular}{@{} L{2.8cm} C{2.0cm} C{1.1cm} C{1.1cm} @{}}\n' +
      '\\toprule\n' +
      '\\textbf{Critério} & \\textbf{Status} & \\textbf{Nota} & \\textbf{Máx.} \\\\\n' +
      '\\midrule\n' +
      linhas + '\n' +
      '\\midrule\n' +
      `\\textbf{Total} & & \\textbf{\\color{cred}${fmt(totalFase)}} & \\textbf{${fmt(maxFase)}} \\\\\n` +
      '\\bottomrule\n' +
      '\\end{tabular}'
    )
  }

  // ── seção por critério (subsection + nota + checks + comentário) ──
  function secaoCriterio(cr) {
    const { cmd, label } = statusCmd(cr)

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
      ? '\n\n' + cr.comentario
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

  // ── abstract após maketitle, em 1 coluna ──────────────────────
  const abstractStr = ''

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
    `\\usepackage{adjustbox}`,
    `\\usepackage{fancyhdr}`,
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
    `\\pagestyle{fancy}`,
    `\\fancyhf{}`,
    `\\renewcommand{\\headrulewidth}{0pt}`,
    `\\fancyfoot[C]{\\thepage}`,
    ``,
    `% ── CAPA ────────────────────────────────────────────────────`,
    `\\clearpage`,
    `\\thispagestyle{empty}`,
    `{`,
    `  \\newgeometry{top=0cm,bottom=0cm,left=0cm,right=0cm}`,
    `  \\IfFileExists{capa.png}{\\includegraphics[width=\\paperwidth,height=\\paperheight,keepaspectratio=false]{capa.png}}{`,
    `    \\IfFileExists{../../capa.png}{\\includegraphics[width=\\paperwidth,height=\\paperheight,keepaspectratio=false]{../../capa.png}}{`,
    `      \\vspace*{6cm}\\begin{center}{\\large\\color{gray}[capa.png nao encontrada]}\\end{center}`,
    `    }`,
    `  }`,
    `  \\restoregeometry`,
    `}`,
    `\\clearpage`,
    `\\setcounter{page}{1}`,
    ``,
    `% ── METADADOS ────────────────────────────────────────────────`,
    `\\title{Devolutiva de Avaliação: Fase 1 --- Imersão}`,
    ``,
    `\\author{Profa.\\ Samara Silva}`,
    `\\authornote{Grupo: \\textbf{${esc(group.name)}} \\textperiodcentered\\ Per\\'{i}odo: ${esc(periodoStr)} \\textperiodcentered\\ Avaliado em: ${esc(dataHoje)}.}`,
    `\\email{samarasilvia.educa@gmail.com}`,
    `\\affiliation{%`,
    `  \\institution{ETE C\\'{i}cero Dias}`,
    `  \\department{M\\'{o}dulo 1 --- ${esc(turma)}}`,
    `  \\city{Recife}`,
    `  \\state{Pernambuco}`,
    `  \\country{Brasil}`,
    `}`,
    ``,
    `\\author{${esc(group.name)}}`,
    `\\affiliation{%`,
    `  \\institution{ETE C\\'{i}cero Dias}`,
    `  \\department{Turma --- ${esc(turma)}}`,
    `  \\city{Recife}`,
    `  \\state{Pernambuco}`,
    `  \\country{Brasil}`,
    `}`,
    ``,
    ...(resumoIA ? [`\\begin{abstract}`, esc(resumoIA), `\\end{abstract}`, ``] : []),
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
  ].join('\n')

  return (
    preambulo +
    '\\maketitle\n\n' +
    secoes + '\n\n' +
    rodape + '\n\n' +
    legendaNiveis() + '\n\n' +
    montarSecaoIndividual(members, avInd?.contribuicoes || [], dados.disciplinas) + '\n\n\\end{document}\n'
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
export default function DevolutivaModal({ group, orgId: orgIdProp, org, discId, faseNome, onClose }) {
  const resolvedOrgId = orgIdProp || group?.org_id
  const avaliacao = useAvaliacao(group?.id, resolvedOrgId)
  const crud      = useAvaliacaoCrud(group?.id, resolvedOrgId)
  const { notes } = useNotes(group?.id, resolvedOrgId)
  const config    = useAvaliacaoConfig(group?.id, resolvedOrgId)
  const avInd     = useAvaliacaoIndividual(group?.id, resolvedOrgId)
  const parseMaybeJson = (val, fb = []) => { if (Array.isArray(val)) return val; try { return JSON.parse(val) } catch { return fb } }
  const members   = parseMaybeJson(group?.members)

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

      const dadosBrutos = coletarDados(group, notaGrupo, nivelGrupo, atrasoGrupo, totalDisciplina, crud, notes, etapas)
      // Se discId foi passado, filtra só a disciplina ativa
      let dados = dadosBrutos
      if (discId) dados = { ...dados, disciplinas: dados.disciplinas.filter(d => d.id === discId) }
      if (faseNome) {
        dados = { ...dados, disciplinas: dados.disciplinas.map(d => ({
          ...d,
          fases: d.fases.filter(f => f.nome === faseNome),
          total: d.fases.filter(f => f.nome === faseNome).flatMap(f => f.criterios).reduce((a,c) => a+c.nota, 0),
        })).filter(d => d.fases.length > 0) }
      }
      const resumoIA = await gerarResumoGroq(dados)
      const tex      = montarTex(dados, turma, dataEntrega, resumoIA, discId, members, avInd)
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