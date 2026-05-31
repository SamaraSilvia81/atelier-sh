import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { NIVEIS_AVALIACAO } from '../data/criterios'
import { FATORES } from './useAvaliacaoIndividual'

const NIVEIS_DEFAULT = NIVEIS_AVALIACAO.map(n => ({
  ...n,
  display: {
    completo: 'Completo',
    faltou_pouco: 'Faltou pouco',
    faltou_muito: 'Faltou muito',
    errado: 'Errado',
    nao_fez: 'Não fez',
  }[n.id] || n.label,
}))

const FATORES_DEFAULT = Object.entries(FATORES).map(([id, f]) => ({ id, ...f }))

// ─────────────────────────────────────────────────────────────
// Separação clara de escopo:
//
//  ESCOPO ORG  (group_id = null) — template global da org
//    • niveis_custom    → aparência dos botões de avaliação
//    • fatores_custom   → fatores de contribuição individual
//    • base_overrides   → rename/max de critérios base
//    • item_overrides   → checklists editados
//    • fase_nome_edit   → rename de fases
//
//  ESCOPO GRUPO (group_id = <uuid>) — dados únicos por grupo
//    • etapas           → checkboxes marcados (progresso)
//    • fase_datas       → datas de cada fase
//
// Ao carregar: busca org-template + grupo.
// Ao salvar itens/base/niveis/fatores → persiste no org-template.
// Ao salvar etapas/datas → persiste no grupo.
// ─────────────────────────────────────────────────────────────

export function useAvaliacaoConfig(groupId, orgId) {
  const [loading, setLoading] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [erro,    setErro]    = useState(null)

  const [niveisCustom,  setNiveisCustom]  = useState(NIVEIS_DEFAULT)
  const [fatoresCustom, setFatoresCustom] = useState(FATORES_DEFAULT)
  const [baseOverrides, setBaseOverrides] = useState({})
  const [itemOverrides, setItemOverrides] = useState({})
  const [faseNomeEdit,  setFaseNomeEdit]  = useState({})
  const [etapas,        setEtapas]        = useState({})
  const [faseDatas,     setFaseDatas]     = useState({})

  const debounceOrgRef   = useRef(null)
  const debounceGrpRef   = useRef(null)
  const stateRef = useRef({})
  stateRef.current = { niveisCustom, fatoresCustom, baseOverrides, itemOverrides, faseNomeEdit, etapas, faseDatas }

  // ── Carregar: org-template + grupo ───────────────────────
  const carregar = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    setErro(null)
    try {
      // 1. Template global da org (group_id IS NULL)
      const { data: orgData, error: orgErr } = await supabase
        .from('avaliacoes_config')
        .select('*')
        .eq('org_id', orgId)
        .is('group_id', null)
        .maybeSingle()

      if (orgErr) throw orgErr

      if (orgData) {
        if (orgData.niveis_custom  && orgData.niveis_custom.length)  setNiveisCustom(orgData.niveis_custom)
        if (orgData.fatores_custom && orgData.fatores_custom.length) {
          const saved  = Object.fromEntries(orgData.fatores_custom.map(f => [f.id, f]))
          const merged = Object.entries(FATORES).map(([id, f]) => saved[id] ? saved[id] : { id, ...f })
          setFatoresCustom(merged)
        }
        if (orgData.base_overrides) setBaseOverrides(orgData.base_overrides)
        if (orgData.item_overrides) setItemOverrides(orgData.item_overrides)
        if (orgData.fase_nome_edit) setFaseNomeEdit(orgData.fase_nome_edit)
      }

      // 2. Config específica do grupo (etapas + datas)
      if (groupId) {
        const { data: grpData, error: grpErr } = await supabase
          .from('avaliacoes_config')
          .select('etapas, fase_datas')
          .eq('group_id', groupId)
          .maybeSingle()

        if (grpErr) throw grpErr

        if (grpData) {
          if (grpData.etapas)     setEtapas(grpData.etapas)
          if (grpData.fase_datas) setFaseDatas(grpData.fase_datas)
        }
      }
    } catch (e) {
      const msg = e?.message || JSON.stringify(e)
      console.error('[useAvaliacaoConfig] carregar erro:', msg)
      if (msg?.includes('42P01') || msg?.includes('does not exist')) {
        setErro('Tabela avaliacoes_config não existe — execute supabase_migration_v14.sql no Supabase.')
      } else {
        setErro(`Erro ao carregar config: ${msg}`)
      }
    } finally {
      setLoading(false)
    }
  }, [groupId, orgId])

  useEffect(() => { carregar() }, [carregar])

  // ── Persistir template da org (itens, nomes, níveis, fatores) ─
  const persistirOrg = useCallback((patch) => {
    if (!orgId) return
    if (debounceOrgRef.current) clearTimeout(debounceOrgRef.current)
    debounceOrgRef.current = setTimeout(async () => {
      setSaving(true)
      setErro(null)
      try {
        const s = stateRef.current
        const payload = {
          org_id:         orgId,
          group_id:       null,   // ← null = template da org
          niveis_custom:  patch.niveisCustom  ?? s.niveisCustom,
          fatores_custom: patch.fatoresCustom ?? s.fatoresCustom,
          base_overrides: patch.baseOverrides ?? s.baseOverrides,
          item_overrides: patch.itemOverrides ?? s.itemOverrides,
          fase_nome_edit: patch.faseNomeEdit  ?? s.faseNomeEdit,
        }
        const { error } = await supabase
          .from('avaliacoes_config')
          .upsert(payload, { onConflict: 'org_id,group_id' })
        if (error) throw error
      } catch (e) {
        const msg = e?.message || JSON.stringify(e)
        console.error('[useAvaliacaoConfig] salvar org erro:', msg)
        setErro(`Erro ao salvar config: ${msg}`)
      } finally {
        setSaving(false)
      }
    }, 500)
  }, [orgId])

  // ── Persistir config do grupo (etapas + datas) ───────────
  const persistirGrupo = useCallback((patch) => {
    if (!groupId || !orgId) return
    if (debounceGrpRef.current) clearTimeout(debounceGrpRef.current)
    debounceGrpRef.current = setTimeout(async () => {
      setSaving(true)
      try {
        const s = stateRef.current
        const payload = {
          org_id:     orgId,
          group_id:   groupId,
          etapas:     patch.etapas     ?? s.etapas,
          fase_datas: patch.faseDatas  ?? s.faseDatas,
        }
        const { error } = await supabase
          .from('avaliacoes_config')
          .upsert(payload, { onConflict: 'org_id,group_id' })
        if (error) throw error
      } catch (e) {
        console.error('[useAvaliacaoConfig] salvar grupo erro:', e?.message)
      } finally {
        setSaving(false)
      }
    }, 500)
  }, [groupId, orgId])

  // ── Setter factory ────────────────────────────────────────
  // scope: 'org' | 'grupo'
  function makeSetter(localSet, patchKey, scope = 'org') {
    return useCallback((val) => {
      localSet(prev => {
        const next = typeof val === 'function' ? val(prev) : val
        if (scope === 'org')   persistirOrg({ [patchKey]: next })
        else                   persistirGrupo({ [patchKey]: next })
        return next
      })
    }, [scope === 'org' ? persistirOrg : persistirGrupo])
  }

  // ── Setter especial para datas ────────────────────────────
  const updateFaseDatas = useCallback((faseNome, campo, valor) => {
    setFaseDatas(prev => {
      const next = {
        ...prev,
        [faseNome]: { ...(prev[faseNome] || {}), [campo]: valor || null }
      }
      persistirGrupo({ faseDatas: next })
      return next
    })
  }, [persistirGrupo])

  return {
    loading, saving, erro,
    // Escopo org — globais para todos os grupos
    niveisCustom,  setNiveisCustom:  makeSetter(setNiveisCustom,  'niveisCustom',  'org'),
    fatoresCustom, setFatoresCustom: makeSetter(setFatoresCustom, 'fatoresCustom', 'org'),
    baseOverrides, setBaseOverrides: makeSetter(setBaseOverrides, 'baseOverrides', 'org'),
    itemOverrides, setItemOverrides: makeSetter(setItemOverrides, 'itemOverrides', 'org'),
    faseNomeEdit,  setFaseNomeEdit:  makeSetter(setFaseNomeEdit,  'faseNomeEdit',  'org'),
    // Escopo grupo — únicos por grupo
    etapas,        setEtapas:        makeSetter(setEtapas,        'etapas',        'grupo'),
    faseDatas, updateFaseDatas,
    recarregar: carregar,
  }
}