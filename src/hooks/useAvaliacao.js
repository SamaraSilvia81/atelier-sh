import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

// ─────────────────────────────────────────────────────────────
// Status de correção automático
//   notaFinal == null                  → null  (ainda não reavaliado)
//   notaInicial já estava no máximo    → null  (nada a corrigir)
//   notaFinal <= notaInicial           → 'nao_corrigido'
//   notaFinal >= notaMax               → 'corrigido'
//   notaFinal > notaInicial (mas < max)→ 'parcial'
// ─────────────────────────────────────────────────────────────
export function calcStatusCorrecao(notaInicial, notaFinal, notaMax) {
  if (notaFinal == null) return null
  const ini = Number(notaInicial) || 0
  const fin = Number(notaFinal)   || 0
  const max = Number(notaMax)     || 0
  // Se já estava no teto na 1ª impressão, não há o que corrigir
  if (max > 0 && ini >= max - 0.001) return null
  if (fin <= ini) return 'nao_corrigido'
  if (max > 0 && fin >= max - 0.001) return 'corrigido'
  return 'parcial'
}

export function useAvaliacao(groupId, orgId) {
  const [notasGrupo, setNotasGrupo] = useState([])
  const [notasInd,   setNotasInd]   = useState([])
  const [loading,    setLoading]    = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [erro,       setErro]       = useState(null)
  const savingCount = useRef(0)

  const carregar = useCallback(async () => {
    if (!groupId) return
    setLoading(true); setErro(null)
    try {
      const [{ data: dg, error: eg }, { data: di, error: ei }] = await Promise.all([
        supabase.from('avaliacoes_grupo').select('*').eq('group_id', groupId),
        supabase.from('avaliacoes_individual').select('*').eq('group_id', groupId),
      ])
      if (eg) throw eg
      if (ei) throw ei
      setNotasGrupo(dg || [])
      setNotasInd(di || [])
    } catch (e) {
      const msg = e?.message || e?.details || JSON.stringify(e)
      console.error('[useAvaliacao] carregar erro:', msg, e)
      if (msg?.includes('42P01') || msg?.includes('does not exist')) {
        setErro('⚠ TABELA NÃO EXISTE — Execute o arquivo supabase_migration_v15_fix_rls.sql no SQL Editor do Supabase.')
      } else if (msg?.includes('permission') || msg?.includes('policy') || msg?.includes('RLS')) {
        setErro('⚠ PERMISSÃO NEGADA — Execute o arquivo supabase_migration_v15_fix_rls.sql para corrigir as políticas RLS.')
      } else {
        setErro(`Erro ao carregar: ${msg}`)
      }
    } finally {
      setLoading(false)
    }
  }, [groupId])

  useEffect(() => { carregar() }, [carregar])

  // ── Mapa de critérios migrados entre disciplinas ─────────
  // Quando um critério é movido de uma disciplina para outra, as notas
  // antigas ficam no banco com a disciplina original. Este mapa define
  // o fallback: se não achar em (disc, cid), tenta em (legacyDisc, cid).
  const LEGACY_DISC = { 'relatorio-imersao': 'dt' }

  // ── Leitura ──────────────────────────────────────────────
  // Todas as leituras aceitam `rodada` (default 'inicial'), então as
  // chamadas antigas de 2 argumentos continuam lendo a primeira avaliação.
  const _findNota = (disc, cid, rodada = 'inicial') => {
    const r = notasGrupo.find(r => r.disciplina === disc && r.criterio_id === cid && (r.rodada || 'inicial') === rodada)
    if (r) return r
    const legacyDisc = LEGACY_DISC[cid]
    if (legacyDisc && legacyDisc !== disc) return notasGrupo.find(r => r.disciplina === legacyDisc && r.criterio_id === cid && (r.rodada || 'inicial') === rodada)
    return undefined
  }
  const notaGrupo      = (disc, cid, rodada = 'inicial') => { const r = _findNota(disc, cid, rodada); return r ? Number(r.nota) : null }
  const nivelGrupo     = (disc, cid, rodada = 'inicial') => _findNota(disc, cid, rodada)?.nivel || null
  const atrasoGrupo    = (disc, cid, rodada = 'inicial') => _findNota(disc, cid, rodada)?.atraso || 'sem_atraso'
  const obsGrupo       = (disc, cid, rodada = 'inicial') => _findNota(disc, cid, rodada)?.observacao || ''
  // Status de correção da rodada final (valor salvo, com ou sem override)
  const statusGrupo    = (disc, cid) => _findNota(disc, cid, 'final')?.status_correcao || null
  const statusOverride = (disc, cid) => _findNota(disc, cid, 'final')?.status_override || false
  const temFinal       = (disc, cid) => !!_findNota(disc, cid, 'final')

  const notaIndividual = (mid, crit) => { const r = notasInd.find(r => r.member_id === mid && r.criterio === crit); return r ? Number(r.nota) : null }
  const obsIndividual  = (mid, crit) => notasInd.find(r => r.member_id === mid && r.criterio === crit)?.observacao || ''

  // Critérios que foram migrados de disciplina — excluir do total da disc original
  const LEGACY_CRITERIOS_POR_DISC = Object.entries(LEGACY_DISC).reduce((acc, [cid, legacyDisc]) => {
    if (!acc[legacyDisc]) acc[legacyDisc] = []
    acc[legacyDisc].push(cid)
    return acc
  }, {})

  // ── Total por disciplina, respeitando a rodada vigente por fase ──
  // rodadaVigente: mapa { `${disc}::${fase}`: 'inicial' | 'final' }.
  // Para cada critério, se a fase está vigente em 'final' E existe linha
  // final, usa a final; senão cai pra inicial (nunca derruba o total).
  // Sem mapa (default {}), tudo resolve pra inicial = comportamento antigo.
  const totalDisciplina = (disc, rodadaVigente = {}) => {
    const linhas = notasGrupo.filter(r =>
      r.disciplina === disc &&
      !(LEGACY_CRITERIOS_POR_DISC[disc] || []).includes(r.criterio_id)
    )
    // Agrupa por critério, guardando inicial e final
    const porCriterio = {}
    for (const r of linhas) {
      const rod = r.rodada || 'inicial'
      if (!porCriterio[r.criterio_id]) porCriterio[r.criterio_id] = { fase: r.fase }
      porCriterio[r.criterio_id][rod] = r
    }
    let total = 0
    for (const cid in porCriterio) {
      const g = porCriterio[cid]
      const vigente = rodadaVigente[`${disc}::${g.fase}`] || 'inicial'
      const escolhida = (vigente === 'final' && g.final) ? g.final : (g.inicial || g.final)
      if (escolhida) total += Number(escolhida.nota)
    }
    return total
  }

  const mediaIndividual = (mid) => { const rows = notasInd.filter(r => r.member_id === mid); return rows.length ? rows.reduce((a, r) => a + Number(r.nota), 0) / rows.length : null }

  // ── Salvar nota — SEM debounce, update otimístico ────────
  // Agora com `rodada` (default 'inicial') e os campos de status.
  // onConflict inclui a rodada, casando com a UNIQUE nova da v14.
  const salvarNotaGrupo = useCallback(async ({ disciplina, fase, criterioId, nota, notaMax, observacao, nivel, atraso, rodada = 'inicial', statusCorrecao, statusOverride: statusOv }) => {
    if (!groupId || !orgId) {
      console.error('[useAvaliacao] groupId ou orgId ausente', { groupId, orgId })
      setErro('Grupo ou organização não identificado — tente recarregar a página.')
      return
    }

    const notaFinal = Math.min(Math.max(Number(nota) || 0, 0), notaMax)
    const payload = {
      org_id: orgId, group_id: groupId,
      disciplina, fase, criterio_id: criterioId,
      nota: notaFinal, nota_max: notaMax,
      observacao: observacao || null,
      nivel: nivel || null,
      atraso: atraso || null,
      rodada,
    }
    // status só é gravado na rodada final
    if (rodada === 'final') {
      if (statusCorrecao !== undefined) payload.status_correcao = statusCorrecao
      if (statusOv !== undefined)       payload.status_override = !!statusOv
    }

    // Optimistic update — UI muda imediatamente (casa por disc + critério + rodada)
    setNotasGrupo(prev => {
      const idx = prev.findIndex(r => r.disciplina === disciplina && r.criterio_id === criterioId && (r.rodada || 'inicial') === rodada)
      if (idx >= 0) {
        const next = [...prev]; next[idx] = { ...prev[idx], ...payload }; return next
      }
      return [...prev, payload]
    })
    setErro(null)

    savingCount.current++
    setSaving(true)
    try {
      const { error } = await supabase
        .from('avaliacoes_grupo')
        .upsert(payload, { onConflict: 'group_id,disciplina,criterio_id,rodada' })

      if (error) {
        console.error('[useAvaliacao] upsert erro:', error)
        throw error
      }
      console.log('[useAvaliacao] ✓ salvo:', disciplina, criterioId, rodada, notaFinal, nivel)
    } catch (e) {
      const msg = e?.message || e?.details || JSON.stringify(e)
      console.error('[useAvaliacao] FALHA ao salvar:', msg, payload)
      if (msg?.includes('42P01') || msg?.includes('does not exist')) {
        setErro('⚠ Tabela não existe — execute supabase_migration_v15_fix_rls.sql no Supabase.')
      } else if (msg?.includes('policy') || msg?.includes('permission') || msg?.includes('denied')) {
        setErro('⚠ Permissão negada — execute supabase_migration_v15_fix_rls.sql para corrigir RLS.')
      } else if (msg?.includes('ON CONFLICT') || msg?.includes('constraint')) {
        setErro('⚠ Constraint da rodada ausente — execute supabase_migration_v14.sql no Supabase.')
      } else {
        setErro(`Erro ao salvar: ${msg}`)
      }
      carregar() // rollback
    } finally {
      savingCount.current--
      if (savingCount.current === 0) setSaving(false)
    }
  }, [groupId, orgId, carregar])

  const salvarNotaIndividual = useCallback(async ({ memberId, criterio, nota, observacao }) => {
    if (!groupId || !orgId) return
    setSaving(true)
    try {
      const notaFinal = Math.min(Math.max(Number(nota), 0), 10)
      const payload = { org_id: orgId, group_id: groupId, member_id: memberId, criterio, nota: notaFinal, observacao: observacao || null }
      const { error } = await supabase.from('avaliacoes_individual').upsert(payload, { onConflict: 'group_id,member_id,criterio' })
      if (error) throw error
      setNotasInd(prev => {
        const idx = prev.findIndex(r => r.member_id === memberId && r.criterio === criterio)
        if (idx >= 0) { const next = [...prev]; next[idx] = { ...prev[idx], ...payload }; return next }
        return [...prev, payload]
      })
    } catch (e) {
      setErro(e?.message || 'Erro ao salvar nota individual')
    } finally {
      setSaving(false)
    }
  }, [groupId, orgId])

  return {
    loading, saving, erro,
    notasGrupo, notasInd,
    notaGrupo, obsGrupo, nivelGrupo, atrasoGrupo,
    statusGrupo, statusOverride, temFinal,
    notaIndividual, obsIndividual,
    totalDisciplina, mediaIndividual,
    salvarNotaGrupo, salvarNotaIndividual,
    recarregar: carregar,
  }
}