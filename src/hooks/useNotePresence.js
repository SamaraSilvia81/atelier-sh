import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useNotePresence(noteId, user) {
  const [peers, setPeers] = useState([])
  const channelRef = useRef(null)
  const userRef    = useRef(user)
  useEffect(() => { userRef.current = user })   // atualiza ref após cada render sem mutar durante render

  useEffect(() => {
    if (!noteId || !user) return

    const channel = supabase.channel(`note-presence:${noteId}`, {
      config: { presence: { key: user.id } },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const others = Object.entries(state)
          .filter(([key]) => key !== user.id)
          .map(([, vals]) => vals[0])
          .filter(Boolean)
        setPeers(others)   // ✅ em callback de sistema externo — correto
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const u = userRef.current
          await channel.track({
            name:      u?.user_metadata?.name || u?.email?.split('@')[0] || 'alguém',
            avatar:    u?.user_metadata?.avatar_url || null,
            online_at: new Date().toISOString(),
          })
        }
      })

    channelRef.current = channel

    return () => {
      channel.untrack().then(() => supabase.removeChannel(channel))
    }
  }, [noteId, user?.id])  // canal recria só quando muda de nota ou de usuário

  return (noteId && user) ? peers : []
}
