'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function HistoriquePage() {
  const router = useRouter()
  const [ventes, setVentes] = useState([])
  const [filtered, setFiltered] = useState([])
  const [loading, setLoading] = useState(true)
  const [vendeurs, setVendeurs] = useState([])
  const [filterVendeur, setFilterVendeur] = useState('tous')
  const [filterStatut, setFilterStatut] = useState('tous')
  const [search, setSearch] = useState('')

  useEffect(() => { checkAdmin() }, [])

  useEffect(() => {
    let result = ventes
    if (filterVendeur !== 'tous') result = result.filter(v => v.vendeur_id === filterVendeur)
    if (filterStatut !== 'tous') result = result.filter(v => v.status === filterStatut)
    if (search) result = result.filter(v =>
      v.client_name?.toLowerCase().includes(search.toLowerCase()) ||
      v.serial_number?.toLowerCase().includes(search.toLowerCase()) ||
      v.client_phone?.includes(search)
    )
    setFiltered(result)
  }, [filterVendeur, filterStatut, search, ventes])

  const checkAdmin = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
    if (!['admin', 'superviseur'].includes(profile?.role)) { router.push('/login'); return }
    fetchData()
  }

  const fetchData = async () => {
    setLoading(true)
    const { data: tickets } = await supabase
      .from('tickets')
      .select('*, profiles(full_name)')
      .neq('status', 'disponible')
      .order('sold_at', { ascending: false })

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'vendeur')

    if (tickets) { setVentes(tickets); setFiltered(tickets) }
    if (profiles) setVendeurs(profiles)
    setLoading(false)
  }

  const exportCSV = () => {
    let csv = 'N°,Ticket,Passager,Telephone,Vendeur,Statut,Date Vente\n'
    filtered.forEach((t, i) => {
      csv += `${i + 1},${t.serial_number},"${t.client_name}",${t.client_phone},"${t.profiles?.full_name || 'N/A'}",${t.status},${t.sold_at ? new Date(t.sold_at).toLocaleString('fr-FR') : ''}\n`
    })
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `historique-jef2026-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getStatusStyle = (status) => {
    if (status === 'embarque') return { bg: '#eff6ff', color: '#1d4ed8', label: 'EMBARQUE' }
    if (status === 'vendu') return { bg: '#f0fdf4', color: '#16a34a', label: 'VENDU' }
    return { bg: '#fffbeb', color: '#b45309', label: 'DISPONIBLE' }
  }

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
      <div style={{ background: 'linear-gradient(135deg, #308B0A 0%, #1e5c06 100%)', padding: '24px 20px 20px', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: 700, letterSpacing: 1.5, margin: 0 }}>HISTORIQUE DES VENTES</p>
            <h1 style={{ color: 'white', fontSize: 20, fontWeight: 900, margin: '3px 0 0' }}>JEF 2026</h1>
          </div>
          <button onClick={() => router.back()} style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 10, padding: '9px 14px', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Retour
          </button>
        </div>
        <div style={{ marginTop: 14, background: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: '10px 14px', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'white', fontSize: 13, fontWeight: 600 }}>{filtered.length} vente{filtered.length > 1 ? 's' : ''} affichee{filtered.length > 1 ? 's' : ''}</span>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{ventes.length} total</span>
        </div>
      </div>

      <div style={{ padding: '16px 16px 40px' }}>

        {/* Recherche */}
        <div style={{ background: 'white', borderRadius: 16, padding: '16px', marginBottom: 12, boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
          <input
            type="text"
            placeholder="Rechercher par nom, ticket ou telephone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '12px 14px', fontSize: 14, background: '#fafafa', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* Filtres */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <select value={filterStatut} onChange={(e) => setFilterStatut(e.target.value)}
            style={{ flex: 1, border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '11px 12px', fontSize: 13, background: 'white', outline: 'none', fontWeight: 600, color: '#374151' }}>
            <option value="tous">Tous les statuts</option>
            <option value="vendu">Vendus</option>
            <option value="embarque">Embarques</option>
          </select>
          <select value={filterVendeur} onChange={(e) => setFilterVendeur(e.target.value)}
            style={{ flex: 1, border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '11px 12px', fontSize: 13, background: 'white', outline: 'none', fontWeight: 600, color: '#374151' }}>
            <option value="tous">Tous les vendeurs</option>
            {vendeurs.map(v => (
              <option key={v.id} value={v.id}>{v.full_name}</option>
            ))}
          </select>
        </div>

        {/* Export */}
        <button onClick={exportCSV} style={{ width: '100%', padding: '13px', borderRadius: 14, border: '2px solid #308B0A', background: 'white', color: '#308B0A', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginBottom: 16 }}>
          Exporter la selection en CSV
        </button>

        {/* Liste */}
        {filtered.length === 0 ? (
          <div style={{ background: 'white', borderRadius: 20, padding: '48px 20px', textAlign: 'center' }}>
            <p style={{ color: '#9ca3af', fontSize: 15, margin: 0, fontWeight: 500 }}>Aucune vente trouvee</p>
          </div>
        ) : (
          filtered.map((v, i) => {
            const s = getStatusStyle(v.status)
            return (
              <div key={i} style={{ background: 'white', borderRadius: 16, padding: '16px', marginBottom: 10, boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: '#111' }}>{v.client_name}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>{v.client_phone}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ background: s.bg, borderRadius: 8, padding: '4px 10px', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: s.color }}>{s.label}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#308B0A' }}>{v.serial_number}</p>
                  </div>
                </div>
                <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>
                    {v.profiles?.full_name || 'Vendeur inconnu'}
                  </span>
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>
                    {v.sold_at ? new Date(v.sold_at).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}