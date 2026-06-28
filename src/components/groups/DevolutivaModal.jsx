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
    // aspas tipográficas curvas → LaTeX seguro
    .replace(/[\u201C\u201D]/g, "''")   // " "  → ''
    .replace(/[\u2018\u2019]/g, "'")    // ' '  → '
    .replace(/"/g, "''")                // aspas retas duplas → ''
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
      .replace(/[\u201C\u201D]/g, "''").replace(/[\u2018\u2019]/g, "'")
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
    .replace(/[\u201C\u201D]/g, "''").replace(/[\u2018\u2019]/g, "'")
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

// CORREÇÃO: Passando baseOverrides e itemOverrides para puxar os nomes customizados e os itens editados
function coletarDados(group, notaGrupo, nivelGrupo, atrasoGrupo, totalDisciplina, crud, notes, etapas, baseOverrides, itemOverrides, av) {
  const disciplinas = DISCIPLINAS.map(disc => {
    const fases = crud.getFasesDisciplina(disc.id).map(fase => {
      const criterios = crud.getCriteriosFase(disc.id, fase.nome).map(cr => {
        // Aplica overrides de nome/max (Se o usuário renomeou o critério no UI)
        const override = baseOverrides?.[`${disc.id}-${cr.id}`]
        const nomeFinal = override?.nome ?? cr.nome
        const maxFinal = override?.max ?? cr.max

        // Sempre usa nota/nível/atraso FINAL quando disponível
        const temFin     = av?.temFinal?.(disc.id, cr.id) || false
        const rod        = temFin ? 'final' : 'inicial'
        const nivel      = av ? av.nivelGrupo(disc.id, cr.id, rod) : nivelGrupo(disc.id, cr.id)
        const nivelInfo  = NIVEIS_AVALIACAO.find(n => n.id === nivel)
        const atraso     = av ? av.atrasoGrupo(disc.id, cr.id, rod) : atrasoGrupo(disc.id, cr.id)
        const atrasoInfo = PENALIZACOES_ATRASO.find(a => a.id === atraso)
        // nota = sempre a nota final (se existir), senão inicial
        const nota       = (av ? av.notaGrupo(disc.id, cr.id, rod) : notaGrupo(disc.id, cr.id)) ?? 0

        // Busca anotação pelo NOME FINAL do critério
        const notaVinc = notes.find(n => n.title === `Avaliação: ${nomeFinal}`)
        const comentario = notaVinc?.content ? htmlToLatex(notaVinc.content) : ''

        // Checks marcados — puxa overrides de itens se existirem
        const itensAtivos = itemOverrides?.[`${disc.id}-${cr.id}`] || cr.itens || []
        const checksFeitos = itensAtivos.map((item, i) => {
          const key = `${disc.id}-${cr.id}-item-${i}`
          return { texto: item, marcado: etapas?.[key] ?? false }
        })

        return {
          id: cr.id, nome: nomeFinal, max: maxFinal, nota,
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
    return { id: disc.id, nome: disc.nome, total: fases.reduce((a, f) => a + f.totalFase, 0), max: disc.total, fases }
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
  const totalCols = fasesCols.length
  
  // Utilizando tabularx com X dinâmico para esticar conforme o número de fases
  const colSpec = `X ${Array(totalCols).fill('X').join(' ')} p{2.5cm}`

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
    `\\begin{tabularx}{0.6\\linewidth}{@{} X c @{}}\n` +
    `\\toprule\n` +
    `\\textbf{Fator} & \\textbf{Multiplicador} \\\\\n` +
    `\\midrule\n` +
    linhasFatores + `\n` +
    `\\bottomrule\n` +
    `\\end{tabularx}\n\n` +
    `\\vspace{1em}\n` +
    `\\subsection{Notas por Integrante}\n\n` +
    `\\begin{tabularx}{\\linewidth}{@{} ${colSpec} @{}}\n` +
    `\\toprule\n` +
    `\\textbf{Integrante} & ${headerCols} & \\textbf{Total} \\\\\n` +
    `\\midrule\n` +
    linhasInt + `\n` +
    `\\bottomrule\n` +
    `\\end{tabularx}`
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
    `\\begin{tabularx}{\\linewidth}{@{} p{4cm} p{1.5cm} X @{}}\n` +
    `\\toprule\n` +
    `\\textbf{Nível} & \\textbf{\\%} & \\textbf{Descrição} \\\\\n` +
    `\\midrule\n` +
    linhasNiveis + `\n` +
    `\\bottomrule\n` +
    `\\end{tabularx}\n\n` +
    `\\vspace{1em}\n` +
    `\\subsection{Penalizações por Atraso}\n\n` +
    `\\begin{tabularx}{0.6\\linewidth}{@{} X p{5cm} @{}}\n` +
    `\\toprule\n` +
    `\\textbf{Atraso} & \\textbf{Desconto} \\\\\n` +
    `\\midrule\n` +
    linhasPenais + `\n` +
    `\\bottomrule\n` +
    `\\end{tabularx}`
  )
}


function montarTex(dados, turma, dataEntrega, resumoIA = null, discId = null, members = [], avInd = null, faseNome = null) {
  const { group, disciplinas, totalGeral } = dados
  const fmt = n => String(n.toFixed(2)).replace('.', ',')
  const hoje = new Date()
  const dataHoje = hoje.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
  const ano = hoje.getFullYear()

  // título adaptado
  const discNome = discId ? (disciplinas.find(d => d.id === discId)?.nome || discId) : null
  let tituloDoc = `Feedback Avaliativo de Projeto`
  if (discNome && !faseNome) tituloDoc += `: ${discNome} --- Avaliação Completa`
  else if (discNome && faseNome) tituloDoc += `: ${discNome} --- ${faseNome}`
  else if (!discNome && !faseNome) tituloDoc += `: Avaliação Completa`

  // ── helpers de status — usa nivelId real do sistema ──────────
  function statusCmd(cr) {
    const id = cr.nivelId
    if (!id || id === 'nao_fez') return { cmd: 'statuswarn', label: 'Não entregue' }
    if (id === 'completo')           return { cmd: 'statusok',   label: 'Completo' }
    if (id === 'completo_ressalvas') return { cmd: 'statuswarn', label: 'Completo c/ ressalvas' }
    if (id === 'completo_inadequado') return { cmd: 'statuswarn', label: 'Completo, mas inadequado'}
    if (id === 'faltou_pouco')       return { cmd: 'statuswarn', label: 'Faltou pouco' }
    if (id === 'faltou_pouco_erros') return { cmd: 'statuswarn', label: 'Faltou pouco c/ erros' }
    if (id === 'faltou_muito')       return { cmd: 'statuswarn', label: 'Faltou muito' }
    if (id === 'faltou_muito_erros') return { cmd: 'statuswarn', label: 'Faltou muito e errou' }
    if (id === 'errado')             return { cmd: 'statuswarn', label: 'Errado' }
    return { cmd: 'statuswarn', label: cr.nivelLabel || 'Não entregue' }
  }

  // ── tabela resumo — sempre nota final, sem comparativo ─────
  function tabelaResumo(criterios) {
    const linhas = criterios.map(cr => {
      const { cmd, label } = statusCmd(cr)
      return `${esc(cr.nome)} & \\${cmd}{${label}} & \\textbf{${fmt(cr.nota)}} & ${fmt(cr.max)} \\\\`
    }).join('\n')
    const totalFase = criterios.reduce((a, c) => a + c.nota, 0)
    const maxFase   = criterios.reduce((a, c) => a + c.max,  0)
    return (
      '\\rowcolors{2}{crow}{white}\n' +
      '\\begin{tabular}{@{} L{2.6cm} C{2.5cm} C{1.1cm} C{1.1cm} @{}}\n' +
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
            ? `  \\item[\\textcolor{cgood}{\\ding{51}}] {\\small\\textcolor{cgood}{${esc(c.texto)}}}`
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

  // ── monta todas as sections ────────────────────────────────
  // faseNome === null  → modo disciplina inteira: uma section por fase
  // faseNome !== null  → modo fase única: igual ao comportamento anterior
  const secoes = disciplinas.map(d => {
    if (faseNome === null) {
      // Nota total da disciplina
      const todosCriterios = d.fases.flatMap(f => f.criterios)
      const totalDisc = todosCriterios.reduce((a, c) => a + c.nota, 0)
      const maxDisc   = todosCriterios.reduce((a, c) => a + c.max, 0)

      const cabecalho =
        `\\section{Avaliação — ${esc(d.nome)}}\n\n` +
        `\\notadestaque{${fmt(totalDisc)}}{${fmt(maxDisc)}}\n\n` +
        `A seguir o detalhamento por fase da disciplina.\n\n`

      const fasesSections = d.fases.map(f => {
        const totalFase = f.criterios.reduce((a, c) => a + c.nota, 0)
        const maxFase   = f.criterios.reduce((a, c) => a + c.max, 0)
        return (
          `\\subsection{${esc(f.nome)}}\n\n` +
          `\\notadestaque{${fmt(totalFase)}}{${fmt(maxFase)}}\n\n` +
          `\\medskip\\noindent{\\small\\textbf{Resumo dos Critérios}}\\par\\smallskip\n\n` +
          tabelaResumo(f.criterios) + '\n\n' +
          `\\medskip\\noindent{\\small\\textbf{Comentários}}\\par\\smallskip\n\n` +
          f.criterios.map(secaoCriterio).join('\n\n')
        )
      }).join('\n\n')

      return cabecalho + fasesSections
    }

    // Modo fase única (botão por fase — comportamento original)
    const todosCriterios = d.fases.flatMap(f => f.criterios)
    const tabelaGeral = tabelaResumo(todosCriterios)
    const detalhesFases = d.fases.map(f =>
      f.criterios.map(secaoCriterio).join('\n\n')
    ).join('\n\n')

    return (
      `\\section{Avaliação Geral}\n\n` +
      `\\notadestaque{${fmt(d.total)}}{${fmt(d.max)}}\n\n` +
      'A avaliação foi concluída. A seguir o resumo dos critérios e os comentários detalhados.\n\n' +
      `\\subsection{Resumo dos Critérios}\n\n` +
      tabelaGeral + '\n\n' +
      `\\section{Comentários por Critério}\n\n` +
      detalhesFases
    )
  }).join('\n\n')

  const periodoStr = dataEntrega || dataHoje

  // ── preâmbulo ───────────────────────────────────────────────
  const preambulo = [
    `% % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % %`,
    `%  Devolutiva — Fase 1: Imersão`,
    `%  Disciplina: Design Thinking (DE_233) — ETE Cícero Dias`,
    `%  Profa. Samara Silva  ·  Recife, ${dataHoje}`,
    `% % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % % %`,
    ``,
    `\\documentclass[`,
    `  sigconf,`,
    `  nonacm, % Remove o rodapé da ACM`,
    `  language=portuguese`,
    `]{acmart}`,
    ``,
    `% ── Desliga rodapé ACM ──────────────────────────────────────`,
    `\\settopmatter{printacmref=false}`,
    `\\setcopyright{none}`,
    `\\acmYear{${ano}}`,
    `\\let\\balance\\relax`,
    ``,
    `% ── Mata a página temporária da ACM (compilação única via API) ──`,
    `\\makeatletter`,
    `\\def\\acm@addtemp@page{}`,
    `\\makeatother`,
    ``,
    `% ── Pacotes ─────────────────────────────────────────────────`,
    `\\usepackage{pifont}`,
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
    `\\usepackage{eso-pic} % Para a capa preencher toda a página sem gerar páginas em branco`,
    ``,
    `% ── Ajuste contra quebras de texto ruins (Textos Cortados) ──`,
    `\\tolerance=1000`,
    `\\emergencystretch=1.5em`,
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
    `\\AddToShipoutPictureBG*{%`,
    `  \\AtPageLowerLeft{%`,
    `    \\IfFileExists{capa-${discId || 'dt'}.png}{%`,
    `      \\includegraphics[width=\\paperwidth,height=\\paperheight]{capa-${discId || 'dt'}.png}%`,
    `    }{%`,
    `      \\IfFileExists{../../capa-${discId || 'dt'}.png}{%`,
    `        \\includegraphics[width=\\paperwidth,height=\\paperheight]{../../capa-${discId || 'dt'}.png}%`,
    `      }{%`,
    `        \\parbox[b][\\paperheight]{\\paperwidth}{%`,
    `          \\vspace*{10cm}\\begin{center}{\\large\\color{gray}[capa-${discId || 'dt'}.png não encontrada]}\\end{center}%`,
    `        }%`,
    `      }%`,
    `    }%`,
    `  }%`,
    `}`,
    `\\mbox{} % Caixa vazia para garantir que a página da capa seja gerada e preenchida`,
    `\\clearpage`,
    ``,
    `% ── CONFIGURAÇÃO DE PÁGINA PÓS-CAPA ─────────────────────────`,
    `\\setcounter{page}{1}`,
    `\\pagestyle{fancy}`,
    `\\fancyhf{}`,
    `\\renewcommand{\\headrulewidth}{0pt}`,
    `\\fancyfoot[C]{\\thepage}`,
    `\\setlength{\\headsep}{0.8cm} % Distancia o cabeçalho do conteúdo das colunas`,
    ``,
    `% ── METADADOS ────────────────────────────────────────────────`,
    `\\title{${esc(tituloDoc)}}`,
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
    ...(resumoIA?.trim() ? [`\\begin{abstract}`, resumoIA.trim(), `\\end{abstract}`, ``] : []),
  ].join('\n')

  // ── rodapé / assinatura ────────────────────────────────────
  const rodape = [
    `\\section{Considerações Finais}`,
    ``,
    `Os ajustes indicados são de natureza metodológica e devem ser`,
    `incorporados para as próximas entregas.`,
    `Continuem assim.`,
    ``,
    `% ── Assinatura ───────────────────────────────────────────────`,
    ``,
    `\\vspace{1.5em}`,
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
    '\\maketitle\n\n\\vspace{1em}\n' +
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
  const { etapas, baseOverrides, itemOverrides } = config

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

    const faseSlug = faseNome ? faseNome.toLowerCase().replace(/[^a-z0-9]/g, '') : (discId || 'geral')
    return `${turmaDir}/${grupoDir}/devolutiva-${faseSlug}-${data}.tex`
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

      // CORREÇÃO 2: Passando baseOverrides e itemOverrides pro coletor
      const dadosBrutos = coletarDados(group, notaGrupo, nivelGrupo, atrasoGrupo, totalDisciplina, crud, notes, etapas, baseOverrides, itemOverrides, avaliacao)
      
      let dados = dadosBrutos
      if (discId) dados = { ...dados, disciplinas: dados.disciplinas.filter(d => d.id === discId) }
      
      if (faseNome) {
        dados = { ...dados, disciplinas: dados.disciplinas.map(d => {
          const fasesFiltradas = d.fases.filter(f => f.nome === faseNome)
          const crits = fasesFiltradas.flatMap(f => f.criterios)
          return {
            ...d,
            fases: fasesFiltradas,
            total: crits.reduce((a,c) => a+c.nota, 0),
            // CORREÇÃO 1: Recalculando o MAX da disciplina com base apenas na fase filtrada
            max: crits.reduce((a,c) => a+c.max, 0), 
          }
        }).filter(d => d.fases.length > 0) }
      }

      const resumoIA = await gerarResumoGroq(dados)
      const tex      = montarTex(dados, turma, dataEntrega, resumoIA, discId, members, avInd, faseNome)
      setTexContent(tex)

      // Push pro GitHub ETE-CiceroDias/ete-docs-mod1
      const path = montarPath()
      const faseSlug = faseNome ? faseNome.toLowerCase() : (discId || 'geral')
      const result = await pushFileToRepo({
        repo: 'ETE-CiceroDias/ete-docs-mod1',
        path,
        content: tex,
        message: `devolutiva: ${group.name} — ${faseSlug} ${new Date().toLocaleDateString('pt-BR')}`,
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
    const faseSlug = faseNome ? faseNome.toLowerCase().replace(/[^a-z0-9]/g, '') : (discId || 'geral')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([texContent], { type: 'text/plain' }))
    a.download = `devolutiva-${faseSlug}-${grupoSlug}.tex`
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
            <div style={{ ...mono, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 3 }}>
              Gerar Devolutiva {faseNome ? `— ${faseNome}` : '— Disciplina Completa'}
            </div>
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