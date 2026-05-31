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
  // { "nome da fase": { prazo: "2025-06-01", avaliado_em: "2025-06-05", feedback_em: "2025-06-06" } }
  const [faseDatas,     setFaseDatas]     = useState({})

  const debounceRef = useRef(null)
  const stateRef = useRef({})
  stateRef.current = { niveisCustom, fatoresCustom, baseOverrides, itemOverrides, faseNomeEdit, etapas, faseDatas }

  // ── Carregar do banco ─────────────────────────────────────
  const carregar = useCallback(async () => {
    if (!groupId) return
    setLoading(true)
    setErro(null)
    try {
      const { data, error } = await supabase
        .from('avaliacoes_config')
        .select('*')
        .eq('group_id', groupId)
        .maybeSingle()

      if (error) throw error

      if (data) {
        if (data.niveis_custom  && data.niveis_custom.length)  setNiveisCustom(data.niveis_custom)
        if (data.fatores_custom && data.fatores_custom.length) {
          // Merge: preserva fatores salvos mas adiciona novos que não existam
          const saved = Object.fromEntries(data.fatores_custom.map(f => [f.id, f]))
          const merged = Object.entries(FATORES).map(([id, f]) => saved[id] ? saved[id] : { id, ...f })
          setFatoresCustom(merged)
        }
        if (data.base_overrides) setBaseOverrides(data.base_overrides)
        if (data.item_overrides) setItemOverrides(data.item_overrides)
        if (data.fase_nome_edit) setFaseNomeEdit(data.fase_nome_edit)
        if (data.etapas)         setEtapas(data.etapas)
        if (data.fase_datas)     setFaseDatas(data.fase_datas)
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
  }, [groupId])

  useEffect(() => { carregar() }, [carregar])

  // ── Persistir com debounce, sempre lendo do ref ───────────
  const persistir = useCallback((patch) => {
    if (!groupId || !orgId) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSaving(true)
      setErro(null)
      try {
        const s = stateRef.current
        const payload = {
          org_id: orgId,
          group_id: groupId,
          niveis_custom:  patch.niveisCustom  ?? s.niveisCustom,
          fatores_custom: patch.fatoresCustom ?? s.fatoresCustom,
          base_overrides: patch.baseOverrides ?? s.baseOverrides,
          item_overrides: patch.itemOverrides ?? s.itemOverrides,
          fase_nome_edit: patch.faseNomeEdit  ?? s.faseNomeEdit,
          etapas:         patch.etapas        ?? s.etapas,
          fase_datas:     patch.faseDatas     ?? s.faseDatas,
        }
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
    }, 500)
  }, [groupId, orgId])

  // ── Setter factory — evita repetição ─────────────────────
  function makeSetter(localSet, patchKey) {
    return useCallback((val) => {
      localSet(prev => {
        const next = typeof val === 'function' ? val(prev) : val
        persistir({ [patchKey]: next })
        return next
      })
    }, [persistir])
  }

  // ── Setter especial para datas de fase ───────────────────
  // updateFaseDatas(faseNome, campo, valor)
  // campo: 'prazo' | 'avaliado_em' | 'feedback_em'
  const updateFaseDatas = useCallback((faseNome, campo, valor) => {
    setFaseDatas(prev => {
      const next = {
        ...prev,
        [faseNome]: { ...(prev[faseNome] || {}), [campo]: valor || null }
      }
      persistir({ faseDatas: next })
      return next
    })
  }, [persistir])

  return {
    loading, saving, erro,
    niveisCustom,  setNiveisCustom:  makeSetter(setNiveisCustom,  'niveisCustom'),
    fatoresCustom, setFatoresCustom: makeSetter(setFatoresCustom, 'fatoresCustom'),
    baseOverrides, setBaseOverrides: makeSetter(setBaseOverrides, 'baseOverrides'),
    itemOverrides, setItemOverrides: makeSetter(setItemOverrides, 'itemOverrides'),
    faseNomeEdit,  setFaseNomeEdit:  makeSetter(setFaseNomeEdit,  'faseNomeEdit'),
    etapas,        setEtapas:        makeSetter(setEtapas,        'etapas'),
    faseDatas, updateFaseDatas,
    recarregar: carregar,
  }
}