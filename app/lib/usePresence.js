import { useEffect } from 'react'
import { supabase } from './supabase'

export function usePresence(action = 'Navigation') {
  useEffect(() => {
    let interval

    const updatePresence = async (online) => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      await supabase
        .from('profiles')
        .update({
          is_online: online,
          last_seen: new Date().toISOString(),
          last_action: online ? action : 'Deconnecte'
        })
        .eq('id', session.user.id)
    }

    // Marquer en ligne
    updatePresence(true)

    // Mettre à jour toutes les 30 secondes
    interval = setInterval(() => updatePresence(true), 30000)

    // Marquer hors ligne quand on quitte
    const handleUnload = () => updatePresence(false)
    window.addEventListener('beforeunload', handleUnload)

    return () => {
      clearInterval(interval)
      window.removeEventListener('beforeunload', handleUnload)
      updatePresence(false)
    }
  }, [action])
}