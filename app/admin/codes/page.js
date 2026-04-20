'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function CodesPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [allTickets, setAllTickets] = useState([])
  const [filtered, setFiltered] = useState([])
  const [showAll, setShowAll] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)

  useEffect(() => { checkAdmin() }, [])

  useEffect(() => {
    if (search.trim() === '') {
      setFiltered(allTickets.slice(0, 20))
      setTicket(null)
      setNotFound(false)
    } else {
      const results = allTickets.filter(t =>
        t.serial_number.toLowerCase().includes(search.toLowerCase()) ||
        t.secret_key.toLowerCase().includes(search.toLowerCase())
      )
      setFiltered(results.slice(0, 50))
    }
  }, [search, allTickets])

  const checkAdmin = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
    if (profile?.role !== 'admin') { router.push('/login'); return }
    fetchAll()
  }

  const fetchAll = async () => {
    const { data } = await supabase
      .from('tickets')
      .select('serial_number, secret_key, status, client_name')
      .order('serial_number')
    setAllTickets(data || [])
    setFiltered((data || []).slice(0, 20))
    setPageLoading(false)
  }

  const getStatusColor = (status) => {
    if (status === 'vendu') return { bg: '#f0fdf4', color: '#16a34a', label: 'VENDU' }
    if (status === 'embarque') return { bg: '#eff6ff', color: '#1d4ed8', label: 'EMBARQUE' }
    if (status === 'perdu') return { bg: '#fff5f5', color: '#dc2626', label: 'PERDU' }
    return { bg: '#f9fafb', color: '#6b7280', label: 'DISPONIBLE' }
  }

  if (pageLoading) return (
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: 700, letterSpacing: 1.5, margin: 0 }}>ADMIN · CONFIDENTIEL</p>
            <h1 style={{ color: 'white', fontSize: 20, fontWeight: 900, margin: '3px 0 0' }}>Codes Secrets</h1>
          </div>
          <button onClick={() => router.push('/admin')}
            style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 10, padding: '9px 14px', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Retour
          </button>
        </div>

        {/* Barre de recherche */}
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            placeholder="Ex: JEF-042 ou code secret..."
            value={search}
            onChange={(e) => setSearch(e.target.value.toUpperCase())}
            style={{ flex: 1, border: 'none', borderRadius: 12, padding: '12px 14px', fontSize: 14, background: 'rgba(255,255,255,0.15)', color: 'white', outline: 'none', boxSizing: 'border-box' }}
          />
          {search && (
            <button onClick={() => setSearch('')}
              style={{ padding: '12px 14px', borderRadius: 12, border: 'none', background: 'rgba(255,255,255,0.15)', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              X
            </button>
          )}
        </div>

        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, margin: '8px 0 0' }}>
          {allTickets.length} tickets · {filtered.length} affiches
        </p>
      </div>

      <div style={{ padding: '16px 16px 40px' }}>

        {/* Avertissement */}
        <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderLeft: '4px solid #ef4444', borderRadius: 14, padding: '12px 16px', marginBottom: 16 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#dc2626' }}>
            PAGE CONFIDENTIELLE — Ne pas partager ces informations
          </p>
        </div>

        {/* Liste tickets */}
        {filtered.length === 0 ? (
          <div style={{ background: 'white', borderRadius: 20, padding: '40px 20px', textAlign: 'center' }}>
            <p style={{ color: '#9ca3af', fontSize: 15, margin: 0 }}>Aucun ticket trouvé</p>
          </div>
        ) : (
          <div>
            {filtered.map((t, i) => {
              const s = getStatusColor(t.status)
              return (
                <div key={i} style={{ background: 'white', borderRadius: 16, padding: '16px', marginBottom: 8, boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

                    {/* Numéro ticket */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 48, height: 48, background: '#f0fdf4', border: '2px solid #bbf7d0', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 10, fontWeight: 900, color: '#308B0A' }}>{t.serial_number.replace('JEF-', '')}</span>
                      </div>
                      <div>
                        <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: '#111' }}>{t.serial_number}</p>
                        {t.client_name && (
                          <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6b7280' }}>{t.client_name}</p>
                        )}
                      </div>
                    </div>

                    {/* Code secret + statut */}
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ background: '#1e5c06', borderRadius: 10, padding: '6px 12px', marginBottom: 4 }}>
                        <span style={{ fontSize: 16, fontWeight: 900, color: 'white', letterSpacing: 2 }}>{t.secret_key}</span>
                      </div>
                      <div style={{ background: s.bg, borderRadius: 6, padding: '3px 8px', display: 'inline-block' }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: s.color }}>{s.label}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Bouton voir plus */}
            {!search && allTickets.length > 20 && filtered.length < allTickets.length && (
              <button onClick={() => setFiltered(allTickets)}
                style={{ width: '100%', padding: '14px', borderRadius: 14, border: '2px solid #308B0A', background: 'white', color: '#308B0A', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginTop: 8 }}>
                Voir tous les {allTickets.length} tickets
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}