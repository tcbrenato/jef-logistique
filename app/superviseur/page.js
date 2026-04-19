'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

export default function SuperviseurPage() {
  const router = useRouter()
  const [stats, setStats] = useState({ total: 500, vendus: 0, embarques: 0, disponibles: 0 })
  const [vendeurs, setVendeurs] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)

  useEffect(() => {
    checkSuperviseur()

    const channel = supabase
      .channel('tickets-realtime-superviseur')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'tickets' },
        () => { fetchData() }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  const checkSuperviseur = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
    if (!profile || !['superviseur', 'admin'].includes(profile.role)) { router.push('/login'); return }
    fetchData()
  }

  const checkSuperviseur = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
    if (!profile || !['superviseur', 'admin'].includes(profile.role)) { router.push('/login'); return }

    fetchData()

    // Realtime — mise a jour instantanee
    const channel = supabase
      .channel('tickets-realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'tickets' },
        () => { fetchData() }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }

  const fetchData = async () => {
    const { data: tickets } = await supabase.from('tickets').select('*')
    const { data: profiles } = await supabase.from('profiles').select('*').neq('role', 'admin')
    if (tickets) {
      setStats({
        total: 500,
        vendus: tickets.filter(t => t.status === 'vendu' || t.status === 'embarque').length,
        embarques: tickets.filter(t => t.status === 'embarque').length,
        disponibles: tickets.filter(t => t.status === 'disponible').length,
      })
      if (profiles) {
        setVendeurs(profiles.map(p => ({
          ...p,
          ventes: tickets.filter(t => t.vendeur_id === p.id).length,
          montant: tickets.filter(t => t.vendeur_id === p.id).length * 6000
        })).sort((a, b) => b.ventes - a.ventes))
      }
    }
    setLastUpdate(new Date())
    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const exportManifeste = async () => {
    const { data: tickets } = await supabase
      .from('tickets')
      .select('*, profiles(full_name)')
      .in('status', ['vendu', 'embarque'])
      .order('serial_number')

    if (!tickets || tickets.length === 0) {
      alert('Aucun ticket vendu a exporter.')
      return
    }

    let csv = 'N°,Numero Ticket,Nom Passager,Telephone,Vendeur,Statut,Date Vente\n'
    tickets.forEach((t, i) => {
      csv += `${i + 1},${t.serial_number},"${t.client_name}",${t.client_phone},"${t.profiles?.full_name || 'N/A'}",${t.status},${t.sold_at ? new Date(t.sold_at).toLocaleString('fr-FR') : ''}\n`
    })

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `manifeste-jef2026-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const pct = Math.round((stats.vendus / stats.total) * 100)

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f8f9fa', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 44, height: 44, border: '3px solid #308B0A', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 14px' }}></div>
        <p style={{ color: '#6b7280', fontWeight: 600, fontSize: 14 }}>Chargement...</p>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', fontFamily: "'Segoe UI', system-ui, sans-serif", maxWidth: 430, margin: '0 auto' }}>

      {/* HEADER */}
      <div style={{ background: 'linear-gradient(135deg, #308B0A 0%, #1e5c06 100%)', padding: '24px 20px 20px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: 700, letterSpacing: 1.5, margin: 0 }}>SUPERVISION</p>
            <h1 style={{ color: 'white', fontSize: 20, fontWeight: 900, margin: '3px 0 0' }}>JEF 2026</h1>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={fetchData} style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 10, padding: '9px 14px', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Actualiser
            </button>
            <button onClick={handleLogout} style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 10, padding: '9px 14px', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Quitter
            </button>
          </div>
        </div>
        {lastUpdate && (
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, margin: '10px 0 0', fontWeight: 500 }}>
            Mise a jour en temps reel · {lastUpdate.toLocaleTimeString('fr-FR')}
          </p>
        )}
      </div>

      <div style={{ padding: '20px 16px 40px' }}>

        {/* Jauge */}
        <div style={{ background: 'white', borderRadius: 20, padding: '24px', marginBottom: 14, boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <p style={{ color: '#9ca3af', fontSize: 11, fontWeight: 700, letterSpacing: 1, margin: '0 0 6px' }}>REMPLISSAGE GLOBAL</p>
              <p style={{ color: '#111', fontSize: 36, fontWeight: 900, margin: 0, letterSpacing: '-1px' }}>
                {stats.vendus}
                <span style={{ fontSize: 16, color: '#9ca3af', fontWeight: 500 }}> / 500</span>
              </p>
            </div>
            <div style={{ background: pct >= 80 ? '#dcfce7' : pct >= 50 ? '#fef9c3' : '#f0f2f5', borderRadius: 14, padding: '10px 16px', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 24, fontWeight: 900, color: pct >= 80 ? '#16a34a' : pct >= 50 ? '#ca8a04' : '#308B0A' }}>{pct}%</p>
            </div>
          </div>
          <div style={{ background: '#f0f2f5', borderRadius: 99, height: 10, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #308B0A, #5fb832)', borderRadius: 99, transition: 'width 0.6s ease', minWidth: pct > 0 ? 10 : 0 }}></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>0 ticket</span>
            <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>500 places</span>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          {[
            { label: 'Tickets vendus', value: stats.vendus, color: '#308B0A', bg: '#f0fdf4', border: '#bbf7d0' },
            { label: 'A bord', value: stats.embarques, color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
            { label: 'Disponibles', value: stats.disponibles, color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
            { label: 'Recette totale', value: `${(stats.vendus * 6000).toLocaleString()} F`, color: '#6d28d9', bg: '#f5f3ff', border: '#ddd6fe' },
          ].map((card, i) => (
            <div key={i} style={{ background: card.bg, borderRadius: 16, padding: '18px 16px', border: `1px solid ${card.border}` }}>
              <p style={{ color: '#6b7280', fontSize: 10, fontWeight: 700, margin: '0 0 8px', letterSpacing: 0.8 }}>{card.label.toUpperCase()}</p>
              <p style={{ color: card.color, fontSize: card.value.toString().length > 6 ? 16 : 26, fontWeight: 900, margin: 0 }}>{card.value}</p>
            </div>
          ))}
        </div>

        {/* Export manifeste */}
        <button onClick={exportManifeste} style={{ width: '100%', padding: '15px', borderRadius: 16, border: '2px solid #308B0A', background: 'white', color: '#308B0A', fontSize: 15, fontWeight: 800, cursor: 'pointer', marginBottom: 14, letterSpacing: 0.3 }}>
          Telecharger le manifeste (CSV)
        </button>

        {/* Classement vendeurs */}
        <div style={{ background: 'white', borderRadius: 20, padding: '22px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
          <p style={{ margin: '0 0 16px', fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: 1 }}>CLASSEMENT DES VENDEURS</p>
          {vendeurs.length === 0 ? (
            <p style={{ color: '#9ca3af', fontSize: 14, textAlign: 'center', padding: '20px 0' }}>Aucun vendeur enregistre</p>
          ) : (
            vendeurs.map((v, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: i < vendeurs.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 32, height: 32, background: i === 0 ? '#fef9c3' : '#f0f2f5', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 900, color: i === 0 ? '#ca8a04' : '#6b7280' }}>#{i + 1}</span>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#111' }}>{v.full_name}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>{v.montant.toLocaleString()} FCFA</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0, fontWeight: 900, fontSize: 20, color: '#308B0A' }}>{v.ventes}</p>
                  <p style={{ margin: 0, fontSize: 11, color: '#9ca3af' }}>tickets</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}