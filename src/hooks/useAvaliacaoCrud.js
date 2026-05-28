import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { DISCIPLINAS } from '../data/criterios'

// Gerencia critérios customizados por grupo — CRUD persistente no Supabase
export function useAvaliacaoCrud(groupId, orgId) {
  const [customCriterios, setCustomCriterios] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving,  setSaving]  = useState(false)

  const carregar = useCallback(async () => {
    if (!groupId) return
    setLoading(true)
    const { data } = await supabase
      .from('avaliacoes_criterios_custom')
      .select('*')
      .eq('group_id', groupId)
      .order('disciplina').order('ordem')
    setCustomCriterios(data || [])
    setLoading(false)
  }, [groupId])

  useEffect(() => { carregar() }, [carregar])

  // Retorna os critérios de uma fase (base + custom)
  const getCriteriosFase = (disciplinaId, faseNome) => {
    const disc = DISCIPLINAS.find(d => d.id === disciplinaId)
    const fase = disc?.fases.find(f => f.nome === faseNome)
    const base = fase?.criterios || []
    const custom = customCriterios.filter(
      c => c.disciplina === disciplinaId && c.fase_nome === faseNome
    ).map(c => ({
      id: c.criterio_id, nome: c.criterio_nome,
      max: Number(c.nota_max), isCustom: true, dbId: c.id,
    }))
    return [...base, ...custom]
  }

  // Retorna as fases de uma disciplina (base + custom)
  const getFasesDisciplina = (disciplinaId) => {
    const disc = DISCIPLINAS.find(d => d.id === disciplinaId)
    const baseFases = disc?.fases || []
    const customFases = [...new Set(
      customCriterios
        .filter(c => c.disciplina === disciplinaId)
        .map(c => c.fase_nome)
    )].filter(nome => !baseFases.find(f => f.nome === nome))
    const extraFases = customFases.map(nome => ({
      nome, total: customCriterios
        .filter(c => c.disciplina === disciplinaId && c.fase_nome === nome)
        .reduce((a, c) => a + Number(c.nota_max), 0),
      criterios: getCriteriosFase(disciplinaId, nome),
      isCustom: true,
    }))
    return [...baseFases, ...extraFases]
  }

  // Adicionar critério custom numa fase
  const adicionarCriterio = useCallback(async (disciplina, faseNome, nome, notaMax) => {
    if (!groupId || !orgId) return
    setSaving(true)
    const criterioId = `custom-${Date.now()}`
    const ordem = customCriterios.filter(c => c.disciplina === disciplina && c.fase_nome === faseNome).length
    const { data, error } = await supabase.from('avaliacoes_criterios_custom')
      .insert({ org_id: orgId, group_id: groupId, disciplina, fase_nome: faseNome, criterio_id: criterioId, criterio_nome: nome, nota_max: notaMax, ordem })
      .select().single()
    if (!error && data) setCustomCriterios(prev => [...prev, data])
    setSaving(false)
    return { data, error }
  }, [groupId, orgId, customCriterios])

  // Editar critério (nome ou notaMax)
  const editarCriterio = useCallback(async (dbId, changes) => {
    setSaving(true)
    const { error } = await supabase.from('avaliacoes_criterios_custom')
      .update(changes).eq('id', dbId)
    if (!error) {
      setCustomCriterios(prev => prev.map(c => c.id === dbId ? { ...c, ...changes } : c))
    }
    setSaving(false)
  }, [])

  // Remover critério custom
  const removerCriterio = useCallback(async (dbId) => {
    setSaving(true)
    const { error } = await supabase.from('avaliacoes_criterios_custom').delete().eq('id', dbId)
    if (!error) setCustomCriterios(prev => prev.filter(c => c.id !== dbId))
    setSaving(false)
  }, [])

  // Editar critério BASE (nome/max) — salva como override custom
  const editarCriterioBase = useCallback(async (disciplina, faseNome, criterioId, nome, notaMax) => {
    const existing = customCriterios.find(
      c => c.disciplina === disciplina && c.fase_nome === faseNome && c.criterio_id === `override-${criterioId}`
    )
    if (existing) {
      return editarCriterio(existing.id, { criterio_nome: nome, nota_max: notaMax })
    }
    return adicionarCriterio(disciplina, faseNome, nome, notaMax)
      .then(() => {
        // Marcar como override do base
        setCustomCriterios(prev => prev.map(c =>
          c.criterio_id === `custom-${Date.now()}` ? { ...c, criterio_id: `override-${criterioId}` } : c
        ))
      })
  }, [customCriterios, editarCriterio, adicionarCriterio])

  // Adicionar fase nova
  const adicionarFase = useCallback(async (disciplina, faseNome, primeiroCriterioNome = 'Critério 1', notaMax = 1.0) => {
    return adicionarCriterio(disciplina, faseNome, primeiroCriterioNome, notaMax)
  }, [adicionarCriterio])

  return {
    loading, saving, customCriterios,
    getCriteriosFase, getFasesDisciplina,
    adicionarCriterio, editarCriterio, removerCriterio,
    adicionarFase,
    recarregar: carregar,
  }
}
