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

  // Ref para o debounce — não causa re-render
  const debounceRef = useRef(null)
  // Ref com o estado atual para o persistir ter sempre o valor mais recente
  const stateRef = useRef({})
  stateRef.current = { niveisCustom, fatoresCustom, baseOverrides, itemOverrides, faseNomeEdit, etapas }

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
        if (data.fatores_custom && data.fatores_custom.length) setFatoresCustom(data.fatores_custom)
        if (data.base_overrides) setBaseOverrides(data.base_overrides)
        if (data.item_overrides) setItemOverrides(data.item_overrides)
        if (data.fase_nome_edit) setFaseNomeEdit(data.fase_nome_edit)
        if (data.etapas)         setEtapas(data.etapas)
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

  // ── Persistir — sempre lê do ref, nunca cria closure com estado ──
  const persistir = useCallback((patch) => {
    if (!groupId || !orgId) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSaving(true)
      setErro(null)
      try {
        const payload = {
          org_id: orgId,
          group_id: groupId,
          ...stateRef.current,   // estado completo e atualizado
          ...patch,              // override com o que acabou de mudar
          // normalizar nomes de campos para o banco
          niveis_custom:  (patch.niveisCustom  ?? stateRef.current.niveisCustom),
          fatores_custom: (patch.fatoresCustom ?? stateRef.current.fatoresCustom),
          base_overrides: (patch.baseOverrides ?? stateRef.current.baseOverrides),
          item_overrides: (patch.itemOverrides ?? stateRef.current.itemOverrides),
          fase_nome_edit: (patch.faseNomeEdit  ?? stateRef.current.faseNomeEdit),
          etapas:         (patch.etapas        ?? stateRef.current.etapas),
        }
        // Remover chaves camelCase — o banco usa snake_case
        delete payload.niveisCustom
        delete payload.fatoresCustom
        delete payload.baseOverrides
        delete payload.itemOverrides
        delete payload.faseNomeEdit

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

  // ── Setters que atualizam estado E disparam persistência ──
  // Usam funções estáveis — não dependem do estado atual no closure

  const updateNiveisCustom = useCallback((val) => {
    setNiveisCustom(prev => {
      const next = typeof val === 'function' ? val(prev) : val
      persistir({ niveisCustom: next })
      return next
    })
  }, [persistir])

  const updateFatoresCustom = useCallback((val) => {
    setFatoresCustom(prev => {
      const next = typeof val === 'function' ? val(prev) : val
      persistir({ fatoresCustom: next })
      return next
    })
  }, [persistir])

  const updateBaseOverrides = useCallback((val) => {
    setBaseOverrides(prev => {
      const next = typeof val === 'function' ? val(prev) : val
      persistir({ baseOverrides: next })
      return next
    })
  }, [persistir])

  const updateItemOverrides = useCallback((val) => {
    setItemOverrides(prev => {
      const next = typeof val === 'function' ? val(prev) : val
      persistir({ itemOverrides: next })
      return next
    })
  }, [persistir])

  const updateFaseNomeEdit = useCallback((val) => {
    setFaseNomeEdit(prev => {
      const next = typeof val === 'function' ? val(prev) : val
      persistir({ faseNomeEdit: next })
      return next
    })
  }, [persistir])

  const updateEtapas = useCallback((val) => {
    setEtapas(prev => {
      const next = typeof val === 'function' ? val(prev) : val
      persistir({ etapas: next })
      return next
    })
  }, [persistir])

  return {
    loading, saving, erro,
    niveisCustom,  setNiveisCustom:  updateNiveisCustom,
    fatoresCustom, setFatoresCustom: updateFatoresCustom,
    baseOverrides, setBaseOverrides: updateBaseOverrides,
    itemOverrides, setItemOverrides: updateItemOverrides,
    faseNomeEdit,  setFaseNomeEdit:  updateFaseNomeEdit,
    etapas,        setEtapas:        updateEtapas,
    recarregar: carregar,
  }
}