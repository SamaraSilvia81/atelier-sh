import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

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
  const _findNota = (disc, cid) => {
    const r = notasGrupo.find(r => r.disciplina === disc && r.criterio_id === cid)
    if (r) return r
    const legacyDisc = LEGACY_DISC[cid]
    if (legacyDisc && legacyDisc !== disc) return notasGrupo.find(r => r.disciplina === legacyDisc && r.criterio_id === cid)
    return undefined
  }
  const notaGrupo      = (disc, cid) => { const r = _findNota(disc, cid); return r ? Number(r.nota) : null }
  const nivelGrupo     = (disc, cid) => _findNota(disc, cid)?.nivel || null
  const atrasoGrupo    = (disc, cid) => _findNota(disc, cid)?.atraso || 'sem_atraso'
  const obsGrupo       = (disc, cid) => _findNota(disc, cid)?.observacao || ''
  const notaIndividual = (mid, crit) => { const r = notasInd.find(r => r.member_id === mid && r.criterio === crit); return r ? Number(r.nota) : null }
  const obsIndividual  = (mid, crit) => notasInd.find(r => r.member_id === mid && r.criterio === crit)?.observacao || ''
  // Critérios que foram migrados de disciplina — excluir do total da disc original
  const LEGACY_CRITERIOS_POR_DISC = Object.entries(LEGACY_DISC).reduce((acc, [cid, legacyDisc]) => {
    if (!acc[legacyDisc]) acc[legacyDisc] = []
    acc[legacyDisc].push(cid)
    return acc
  }, {})
  const totalDisciplina = (disc) => notasGrupo
    .filter(r => r.disciplina === disc && !(LEGACY_CRITERIOS_POR_DISC[disc] || []).includes(r.criterio_id))
    .reduce((a, r) => a + Number(r.nota), 0)
  const mediaIndividual = (mid) => { const rows = notasInd.filter(r => r.member_id === mid); return rows.length ? rows.reduce((a, r) => a + Number(r.nota), 0) / rows.length : null }

  // ── Salvar nota — SEM debounce, update otimístico ────────
  const salvarNotaGrupo = useCallback(async ({ disciplina, fase, criterioId, nota, notaMax, observacao, nivel, atraso }) => {
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
    }

    // Optimistic update — UI muda imediatamente
    setNotasGrupo(prev => {
      const idx = prev.findIndex(r => r.disciplina === disciplina && r.criterio_id === criterioId)
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
        .upsert(payload, { onConflict: 'group_id,disciplina,criterio_id' })

      if (error) {
        console.error('[useAvaliacao] upsert erro:', error)
        throw error
      }
      console.log('[useAvaliacao] ✓ salvo:', disciplina, criterioId, notaFinal, nivel)
    } catch (e) {
      const msg = e?.message || e?.details || JSON.stringify(e)
      console.error('[useAvaliacao] FALHA ao salvar:', msg, payload)
      if (msg?.includes('42P01') || msg?.includes('does not exist')) {
        setErro('⚠ Tabela não existe — execute supabase_migration_v15_fix_rls.sql no Supabase.')
      } else if (msg?.includes('policy') || msg?.includes('permission') || msg?.includes('denied')) {
        setErro('⚠ Permissão negada — execute supabase_migration_v15_fix_rls.sql para corrigir RLS.')
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
    notaIndividual, obsIndividual,
    totalDisciplina, mediaIndividual,
    salvarNotaGrupo, salvarNotaIndividual,
    recarregar: carregar,
  }
}
