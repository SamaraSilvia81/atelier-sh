import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

/**
 * useReview — persiste anotações de revisão no Supabase
 * Um registro por grupo (upsert por group_id)
 */
export function useReview(groupId, orgId) {
  const [reviewId, setReviewId]     = useState(null)
  const [annotations, setAnnotations] = useState([])
  const [paths, setPaths]           = useState([])
  const [url, setUrl]               = useState('')
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    if (!groupId) return
    load()
  }, [groupId])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('reviews')
      .select('*')
      .eq('group_id', groupId)
      .maybeSingle()

    if (data) {
      setReviewId(data.id)
      setAnnotations(data.annotations || [])
      setPaths(data.paths || [])
      setUrl(data.url || '')
    }
    setLoading(false)
  }

  const save = useCallback(async ({ annotations: ann, paths: pths, url: u }) => {
    const payload = {
      group_id:    groupId,
      org_id:      orgId,
      annotations: ann  ?? annotations,
      paths:       pths ?? paths,
      url:         u    ?? url,
    }

    if (reviewId) {
      // Update
      const { data } = await supabase
        .from('reviews')
        .update(payload)
        .eq('id', reviewId)
        .select()
        .single()
      if (data) {
        setAnnotations(data.annotations)
        setPaths(data.paths)
        setUrl(data.url || '')
      }
    } else {
      // Insert
      const { data } = await supabase
        .from('reviews')
        .insert(payload)
        .select()
        .single()
      if (data) {
        setReviewId(data.id)
        setAnnotations(data.annotations)
        setPaths(data.paths)
        setUrl(data.url || '')
      }
    }
  }, [groupId, orgId, reviewId, annotations, paths, url])

  async function clear() {
    await save({ annotations: [], paths: [], url })
  }

  return { annotations, setAnnotations, paths, setPaths, url, setUrl, save, clear, loading }
}
