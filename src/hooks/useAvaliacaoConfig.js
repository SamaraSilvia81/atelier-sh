import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { NIVEIS_AVALIACAO } from './useAvaliacaoIndividual'
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

export function useAvaliacaoConfig(groupId, orgId) {
  const [loading, setSaving_]  = useState(false)
  const [saving,  setSaving]   = useState(false)
  const [erro,    setErro]     = useState(null)

  // ── Estado persistido ─────────────────────────────────────
  const [niveisCustom,  setNiveisCustom_]  = useState(NIVEIS_DEFAULT)
  const [fatoresCustom, setFatoresCustom_] = useState(FATORES_DEFAULT)
  const [baseOverrides, setBaseOverrides_] = useState({})
  const [itemOverrides, setItemOverrides_] = useState({})
  const [faseNomeEdit,  setFaseNomeEdit_]  = useState({})
  const [etapas,        setEtapas_]        = useState({})

  const debounceRef = useRef(null)
  const configIdRef = useRef(null)  // uuid da row salva no banco

  // ── Carregar do banco ─────────────────────────────────────
  const carregar = useCallback(async () => {
    if (!groupId) return
    setSaving_(true)
    setErro(null)
    try {
      const { data, error } = await supabase
        .from('avaliacoes_config')
        .select('*')
        .eq('group_id', groupId)
        .maybeSingle()

      if (error) throw error

      if (data) {
        configIdRef.current = data.id
        if (data.niveis_custom)  setNiveisCustom_(data.niveis_custom)
        if (data.fatores_custom) setFatoresCustom_(data.fatores_custom)
        if (data.base_overrides) setBaseOverrides_(data.base_overrides)
        if (data.item_overrides) setItemOverrides_(data.item_overrides)
        if (data.fase_nome_edit) setFaseNomeEdit_(data.fase_nome_edit)
        if (data.etapas)         setEtapas_(data.etapas)
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
      setSaving_(false)
    }
  }, [groupId])

  useEffect(() => { carregar() }, [carregar])

  // ── Persistir no banco (debounced) ────────────────────────
  const persistir = useCallback(async (patch) => {
    if (!groupId || !orgId) return
    setSaving(true)
    setErro(null)
    try {
      const payload = { org_id: orgId, group_id: groupId, ...patch }
      const { error } = await supabase
        .from('avaliacoes_config')
        .upsert(payload, { onConflict: 'group_id' })
      if (error) throw error
    } catch (e) {
      const msg = e?.message || JSON.stringify(e)
      console.error('[useAvaliacaoConfig] salvar erro:', msg)
      setErro(`Erro ao salvar config: ${msg}`)
    } finally {
      setSaving(false)
    }
  }, [groupId, orgId])

  // Debounce genérico — evita flood ao arrastar sliders ou digitar
  function debouncedSave(patch, ms = 600) {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => persistir(patch), ms)
  }

  // ── Setters que atualizam estado E persistem ──────────────
  const setNiveisCustom = useCallback((val) => {
    const next = typeof val === 'function' ? val(niveisCustom) : val
    setNiveisCustom_(next)
    debouncedSave({ niveis_custom: next })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [niveisCustom, persistir])

  const setFatoresCustom = useCallback((val) => {
    const next = typeof val === 'function' ? val(fatoresCustom) : val
    setFatoresCustom_(next)
    debouncedSave({ fatores_custom: next })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fatoresCustom, persistir])

  const setBaseOverrides = useCallback((val) => {
    const next = typeof val === 'function' ? val(baseOverrides) : val
    setBaseOverrides_(next)
    debouncedSave({ base_overrides: next })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseOverrides, persistir])

  const setItemOverrides = useCallback((val) => {
    const next = typeof val === 'function' ? val(itemOverrides) : val
    setItemOverrides_(next)
    debouncedSave({ item_overrides: next })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemOverrides, persistir])

  const setFaseNomeEdit = useCallback((val) => {
    const next = typeof val === 'function' ? val(faseNomeEdit) : val
    setFaseNomeEdit_(next)
    debouncedSave({ fase_nome_edit: next })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faseNomeEdit, persistir])

  const setEtapas = useCallback((val) => {
    const next = typeof val === 'function' ? val(etapas) : val
    setEtapas_(next)
    debouncedSave({ etapas: next }, 300)  // checkboxes respondem mais rápido
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etapas, persistir])

  return {
    loading, saving, erro,
    // estado
    niveisCustom, fatoresCustom,
    baseOverrides, itemOverrides,
    faseNomeEdit, etapas,
    // setters persistentes
    setNiveisCustom, setFatoresCustom,
    setBaseOverrides, setItemOverrides,
    setFaseNomeEdit, setEtapas,
    recarregar: carregar,
  }
}