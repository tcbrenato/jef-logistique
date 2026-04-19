'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from './lib/supabase'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (profile?.role === 'admin') router.push('/admin')
      else if (profile?.role === 'vendeur') router.push('/vendeur')
      else if (profile?.role === 'controleur') router.push('/controleur')
      else if (profile?.role === 'superviseur') router.push('/superviseur')
      else router.push('/login')
    }
    checkSession()
  }, [])

  return (
    <div style={{display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh'}}>
      <div style={{textAlign:'center'}}>
        <div style={{width:60, height:60, border:'4px solid #308B0A', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 1s linear infinite', margin:'0 auto 16px'}}></div>
        <p style={{color:'#666'}}>Chargement...</p>
      </div>
    </div>
  )
}