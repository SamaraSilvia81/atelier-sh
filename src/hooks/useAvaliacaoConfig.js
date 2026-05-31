import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { NIVEIS_AVALIACAO } from '../data/criterios'
import { FATORES } from './useAvaliacaoIndividual'

const NIVEIS_DEFAULT = NIVEIS_AVALIACAO.map(n => ({
  ...n,
  display: {
    completo:             'Completo',
    completo_ressalvas:   'Completo c/ ressalvas',
    faltou_pouco:         'Faltou pouco',
    faltou_pouco_erros:   'Faltou pouco c/ erros',
    faltou_muito:         'Faltou muito',
    faltou_muito_erros:   'Faltou muito e errou',
    errado:               'Errado',
    nao_fez:              'Não fez',
  }[n.id] || n.label,
}))

const FATORES_DEFAULT = Object.entries(FATORES).map(([id, f]) => ({ id, ...f }))

// ─────────────────────────────────────────────────────────────
// ESCOPO ORG  (group_id = null) — template global da org
//   niveis_custom, fatores_custom, base_overrides, item_overrides, fase_nome_edit
//
// ESCOPO GRUPO (group_id = <uuid>) — dados únicos por grupo
//   etapas, fase_datas
// ─────────────────────────────────────────────────────────────

export function useAvaliacaoConfig(groupId, orgId) {
  const [loading, setLoading] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [erro,    setErro]    = useState(null)

  const [niveisCustom,  setNiveisCustomRaw]  = useState(NIVEIS_DEFAULT)
  const [fatoresCustom, setFatoresCustomRaw] = useState(FATORES_DEFAULT)
  const [baseOverrides, setBaseOverridesRaw] = useState({})
  const [itemOverrides, setItemOverridesRaw] = useState({})
  const [faseNomeEdit,  setFaseNomeEditRaw]  = useState({})
  const [etapas,        setEtapasRaw]        = useState({})
  const [faseDatas,     setFaseDatasRaw]     = useState({})

  const debounceOrgRef = useRef(null)
  const debounceGrpRef = useRef(null)
  const stateRef = useRef({})
  stateRef.current = { niveisCustom, fatoresCustom, baseOverrides, itemOverrides, faseNomeEdit, etapas, faseDatas }

  // ── Carregar ──────────────────────────────────────────────
  const carregar = useCallback(async () => {
    if (!orgId) return
    setLoading(true)
    setErro(null)
    try {
      // 1. Template global da org
      const { data: orgData, error: orgErr } = await supabase
        .from('avaliacoes_config')
        .select('*')
        .eq('org_id', orgId)
        .is('group_id', null)
        .maybeSingle()

      if (orgErr) throw orgErr

      if (orgData) {
        if (orgData.niveis_custom?.length)  setNiveisCustomRaw(orgData.niveis_custom)
        if (orgData.fatores_custom?.length) {
          const saved  = Object.fromEntries(orgData.fatores_custom.map(f => [f.id, f]))
          const merged = Object.entries(FATORES).map(([id, f]) => saved[id] ? saved[id] : { id, ...f })
          setFatoresCustomRaw(merged)
        }
        if (orgData.base_overrides) setBaseOverridesRaw(orgData.base_overrides)
        if (orgData.item_overrides) setItemOverridesRaw(orgData.item_overrides)
        if (orgData.fase_nome_edit) setFaseNomeEditRaw(orgData.fase_nome_edit)
      }

      // 2. Config específica do grupo (etapas + datas)
      if (groupId) {
        const { data: grpData, error: grpErr } = await supabase
          .from('avaliacoes_config')
          .select('etapas, fase_datas')
          .eq('org_id', orgId)
          .eq('group_id', groupId)
          .maybeSingle()

        if (grpErr) throw grpErr

        if (grpData) {
          if (grpData.etapas)     setEtapasRaw(grpData.etapas || {})
          if (grpData.fase_datas) setFaseDatasRaw(grpData.fase_datas || {})
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

  // ── Persistir template da org ─────────────────────────────
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
          group_id:       null,
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

  // ── Persistir config do grupo ─────────────────────────────
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
          etapas:     patch.etapas    ?? s.etapas,
          fase_datas: patch.faseDatas ?? s.faseDatas,
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

  // ── Setters com persistência — SEM useCallback dentro de função ──
  // Escopo ORG
  const setNiveisCustom = useCallback((val) => {
    setNiveisCustomRaw(prev => {
      const next = typeof val === 'function' ? val(prev) : val
      persistirOrg({ niveisCustom: next })
      return next
    })
  }, [persistirOrg])

  const setFatoresCustom = useCallback((val) => {
    setFatoresCustomRaw(prev => {
      const next = typeof val === 'function' ? val(prev) : val
      persistirOrg({ fatoresCustom: next })
      return next
    })
  }, [persistirOrg])

  const setBaseOverrides = useCallback((val) => {
    setBaseOverridesRaw(prev => {
      const next = typeof val === 'function' ? val(prev) : val
      persistirOrg({ baseOverrides: next })
      return next
    })
  }, [persistirOrg])

  const setItemOverrides = useCallback((val) => {
    setItemOverridesRaw(prev => {
      const next = typeof val === 'function' ? val(prev) : val
      persistirOrg({ itemOverrides: next })
      return next
    })
  }, [persistirOrg])

  const setFaseNomeEdit = useCallback((val) => {
    setFaseNomeEditRaw(prev => {
      const next = typeof val === 'function' ? val(prev) : val
      persistirOrg({ faseNomeEdit: next })
      return next
    })
  }, [persistirOrg])

  // Escopo GRUPO
  const setEtapas = useCallback((val) => {
    setEtapasRaw(prev => {
      const next = typeof val === 'function' ? val(prev) : val
      persistirGrupo({ etapas: next })
      return next
    })
  }, [persistirGrupo])

  const updateFaseDatas = useCallback((faseNome, campo, valor) => {
    setFaseDatasRaw(prev => {
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
    niveisCustom,  setNiveisCustom,
    fatoresCustom, setFatoresCustom,
    baseOverrides, setBaseOverrides,
    itemOverrides, setItemOverrides,
    faseNomeEdit,  setFaseNomeEdit,
    // Escopo grupo — únicos por grupo
    etapas,        setEtapas,
    faseDatas, updateFaseDatas,
    recarregar: carregar,
  }
}