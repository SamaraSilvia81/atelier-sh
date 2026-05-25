import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useAvaliacao(groupId, orgId) {
  const [notasGrupo, setNotasGrupo] = useState([])
  const [notasInd,   setNotasInd]   = useState([])
  const [loading,    setLoading]    = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [erro,       setErro]       = useState(null)

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
      setErro(e.message || 'Erro ao carregar avaliações')
    } finally {
      setLoading(false)
    }
  }, [groupId])

  useEffect(() => { carregar() }, [carregar])

  const notaGrupo     = (disc, cid) => { const r = notasGrupo.find(r => r.disciplina === disc && r.criterio_id === cid); return r ? Number(r.nota) : null }
  const obsGrupo      = (disc, cid) => notasGrupo.find(r => r.disciplina === disc && r.criterio_id === cid)?.observacao || ''
  const notaIndividual = (mid, crit) => { const r = notasInd.find(r => r.member_id === mid && r.criterio === crit); return r ? Number(r.nota) : null }
  const obsIndividual  = (mid, crit) => notasInd.find(r => r.member_id === mid && r.criterio === crit)?.observacao || ''
  const totalDisciplina = (disc) => notasGrupo.filter(r => r.disciplina === disc).reduce((a, r) => a + Number(r.nota), 0)
  const mediaIndividual = (mid) => { const rows = notasInd.filter(r => r.member_id === mid); return rows.length ? rows.reduce((a, r) => a + Number(r.nota), 0) / rows.length : null }

  const salvarNotaGrupo = useCallback(async ({ disciplina, fase, criterioId, nota, notaMax, observacao }) => {
    if (!groupId || !orgId) return
    setSaving(true); setErro(null)
    try {
      const notaFinal = Math.min(Number(nota), notaMax)
      const { error } = await supabase.from('avaliacoes_grupo').upsert(
        { org_id: orgId, group_id: groupId, disciplina, fase, criterio_id: criterioId, nota: notaFinal, nota_max: notaMax, observacao: observacao || null },
        { onConflict: 'group_id,disciplina,criterio_id' }
      )
      if (error) throw error
      setNotasGrupo(prev => {
        const idx = prev.findIndex(r => r.disciplina === disciplina && r.criterio_id === criterioId)
        const updated = { group_id: groupId, org_id: orgId, disciplina, fase, criterio_id: criterioId, nota: notaFinal, nota_max: notaMax, observacao: observacao || null }
        if (idx >= 0) { const next = [...prev]; next[idx] = { ...prev[idx], ...updated }; return next }
        return [...prev, updated]
      })
    } catch (e) { setErro(e.message || 'Erro ao salvar nota') }
    finally { setSaving(false) }
  }, [groupId, orgId])

  const salvarNotaIndividual = useCallback(async ({ memberId, criterio, nota, observacao }) => {
    if (!groupId || !orgId) return
    setSaving(true); setErro(null)
    try {
      const notaFinal = Math.min(Math.max(Number(nota), 0), 10)
      const { error } = await supabase.from('avaliacoes_individual').upsert(
        { org_id: orgId, group_id: groupId, member_id: memberId, criterio, nota: notaFinal, observacao: observacao || null },
        { onConflict: 'group_id,member_id,criterio' }
      )
      if (error) throw error
      setNotasInd(prev => {
        const idx = prev.findIndex(r => r.member_id === memberId && r.criterio === criterio)
        const updated = { group_id: groupId, org_id: orgId, member_id: memberId, criterio, nota: notaFinal, observacao: observacao || null }
        if (idx >= 0) { const next = [...prev]; next[idx] = { ...prev[idx], ...updated }; return next }
        return [...prev, updated]
      })
    } catch (e) { setErro(e.message || 'Erro ao salvar nota individual') }
    finally { setSaving(false) }
  }, [groupId, orgId])

  return { loading, saving, erro, notasGrupo, notasInd, notaGrupo, obsGrupo, notaIndividual, obsIndividual, totalDisciplina, mediaIndividual, salvarNotaGrupo, salvarNotaIndividual, recarregar: carregar }
}
