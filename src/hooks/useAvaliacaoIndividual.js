import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// Fatores de contribuição e seus multiplicadores
export const FATORES = {
  liderou:          { label: '✦ Liderou',           mult: 1.10, cor: '#5aab6e' },
  participou:       { label: '✓ Participou',         mult: 1.00, cor: '#7F77DD' },
  participou_pouco: { label: '△ Participou pouco',   mult: 0.60, cor: '#c8922a' },
  nao_participou:   { label: '✗ Não participou',     mult: 0.00, cor: '#c83232' },
}

export const CRITERIOS_COMPORTAMENTAIS = [
  { id: 'proatividade',           nome: 'Proatividade',              desc: 'Age antes de ser cobrado. Antecipa problemas e toma iniciativa.' },
  { id: 'resolucao-problemas',    nome: 'Resolução de Problemas',    desc: 'Identifica o problema com clareza e busca soluções.' },
  { id: 'autonomia-autocorrecao', nome: 'Autonomia & Autocorreção',  desc: 'Percebe o erro e age para corrigir, sozinho ou pedindo ajuda.' },
  { id: 'atrasos-entregas',       nome: 'Atrasos nas Entregas',      desc: 'Pontualidade nas entregas. Comunica impedimentos com antecedência.' },
  { id: 'presenca-aulas',         nome: 'Presença nas Aulas',        desc: 'Frequência e engajamento. Presenças justificadas são consideradas.' },
  { id: 'colaboracao-time',       nome: 'Colaboração com o Time',    desc: 'Contribui ativamente. Ajuda colegas e participa das decisões.' },
]

export function useAvaliacaoIndividual(groupId, orgId) {
  const [contribuicoes,    setContribuicoes]    = useState([])
  const [comportamentais,  setComportamentais]  = useState([])
  const [extras,           setExtras]           = useState([])
  const [loading,          setLoading]          = useState(false)
  const [saving,           setSaving]           = useState(false)
  const [erro,             setErro]             = useState(null)

  const carregar = useCallback(async () => {
    if (!groupId) return
    setLoading(true)
    try {
      const [r1, r2, r3] = await Promise.all([
        supabase.from('avaliacoes_contribuicao').select('*').eq('group_id', groupId),
        supabase.from('avaliacoes_comportamental').select('*').eq('group_id', groupId),
        supabase.from('avaliacoes_extra').select('*').eq('group_id', groupId),
      ])
      setContribuicoes(r1.data || [])
      setComportamentais(r2.data || [])
      setExtras(r3.data || [])
    } catch (e) {
      setErro(e.message)
    } finally {
      setLoading(false)
    }
  }, [groupId])

  useEffect(() => { carregar() }, [carregar])

  // ── Leitura ────────────────────────────────────────────────
  const getFator = (memberId, disciplina, fase) => {
    const r = contribuicoes.find(
      c => c.member_id === memberId && c.disciplina === disciplina && c.fase === fase
    )
    return r?.fator || null
  }

  const getNotaIndividual = (memberId, disciplina, fase, notaGrupoFase) => {
    const fator = getFator(memberId, disciplina, fase)
    if (!fator) return null
    const mult = FATORES[fator]?.mult ?? 0
    // liderou pode ultrapassar levemente a nota do grupo
    return Math.min(notaGrupoFase * mult, notaGrupoFase * 1.10)
  }

  const getComportamental = (memberId, criterioId) => {
    return comportamentais.find(c => c.member_id === memberId && c.criterio === criterioId)?.registro || ''
  }

  const getExtras = (memberId) => extras.filter(e => e.member_id === memberId)

  const getTotalIndividual = (memberId, disciplinas, notasGrupo) => {
    let total = 0
    for (const disc of disciplinas) {
      for (const fase of disc.fases) {
        const notaFase = fase.criterios.reduce((acc, cr) => {
          const n = notasGrupo(disc.id, cr.id)
          return acc + (n || 0)
        }, 0)
        const notaInd = getNotaIndividual(memberId, disc.id, fase.nome, notaFase)
        total += notaInd || 0
      }
    }
    const extrasTotal = getExtras(memberId).reduce((a, e) => a + Number(e.valor), 0)
    return total + extrasTotal
  }

  // ── Escrita com update otimístico ──────────────────────────
  const salvarFator = useCallback(async (memberId, disciplina, fase, fator, notaCalculada) => {
    if (!groupId || !orgId) {
      console.warn('[useAvaliacaoIndividual] salvarFator: groupId ou orgId ausente', { groupId, orgId })
      return
    }

    // UPDATE OTIMÍSTICO — atualiza UI imediatamente, sem esperar o Supabase
    const updated = {
      org_id: orgId, group_id: groupId,
      member_id: memberId, disciplina, fase,
      fator, nota_calculada: notaCalculada
    }
    setContribuicoes(prev => {
      const idx = prev.findIndex(
        c => c.member_id === memberId && c.disciplina === disciplina && c.fase === fase
      )
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...prev[idx], ...updated }
        return next
      }
      return [...prev, updated]
    })

    // Persiste em background
    setSaving(true)
    try {
      const { error } = await supabase.from('avaliacoes_contribuicao').upsert(
        updated,
        { onConflict: 'group_id,member_id,disciplina,fase' }
      )
      if (error) throw error
    } catch (e) {
      setErro(e.message)
      // Rollback: recarregar do DB
      carregar()
    } finally {
      setSaving(false)
    }
  }, [groupId, orgId, carregar])

  const salvarComportamental = useCallback(async (memberId, criterioId, registro) => {
    if (!groupId || !orgId) return
    setSaving(true)
    try {
      const { error } = await supabase.from('avaliacoes_comportamental').upsert(
        { org_id: orgId, group_id: groupId, member_id: memberId, criterio: criterioId, registro },
        { onConflict: 'group_id,member_id,criterio' }
      )
      if (error) throw error
      setComportamentais(prev => {
        const idx = prev.findIndex(c => c.member_id === memberId && c.criterio === criterioId)
        const updated = { org_id: orgId, group_id: groupId, member_id: memberId, criterio: criterioId, registro }
        if (idx >= 0) { const next = [...prev]; next[idx] = { ...prev[idx], ...updated }; return next }
        return [...prev, updated]
      })
    } catch (e) { setErro(e.message) }
    finally { setSaving(false) }
  }, [groupId, orgId])

  const adicionarExtra = useCallback(async (memberId, descricao, valor) => {
    if (!groupId || !orgId) return
    setSaving(true)
    try {
      const { data, error } = await supabase.from('avaliacoes_extra')
        .insert({ org_id: orgId, group_id: groupId, member_id: memberId, descricao, valor })
        .select().single()
      if (error) throw error
      if (data) setExtras(prev => [...prev, data])
    } catch (e) { setErro(e.message) }
    finally { setSaving(false) }
  }, [groupId, orgId])

  const removerExtra = useCallback(async (id) => {
    setSaving(true)
    try {
      const { error } = await supabase.from('avaliacoes_extra').delete().eq('id', id)
      if (error) throw error
      setExtras(prev => prev.filter(e => e.id !== id))
    } catch (e) { setErro(e.message) }
    finally { setSaving(false) }
  }, [])

  return {
    loading, saving, erro,
    contribuicoes, comportamentais, extras,
    getFator, getNotaIndividual, getComportamental, getExtras, getTotalIndividual,
    salvarFator, salvarComportamental, adicionarExtra, removerExtra,
    recarregar: carregar,
  }
}