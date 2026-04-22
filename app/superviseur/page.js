'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { usePresence } from '../lib/usePresence'

export default function SuperviseurPage() {
  const router = useRouter()
  usePresence('Supervision BUE')
  const [stats, setStats] = useState({ total: 500, vendus: 0, embarques: 0, disponibles: 0 })
  const [vendeurs, setVendeurs] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [profile, setProfile] = useState(null)

  // Embarquement
  const [search, setSearch] = useState('')
  const [ticket, setTicket] = useState(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [embarquementLoading, setEmbarquementLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [statsEmbarquement, setStatsEmbarquement] = useState({ embarques: 0, vendus: 0 })

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
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
    if (!prof || !['superviseur', 'admin'].includes(prof.role)) { router.push('/login'); return }
    if (!prof.profil_complet) {
      router.push('/superviseur/profil')
      return
    }
    setProfile(prof)
    fetchData()
  }

  const fetchData = async () => {
    const { data: tickets } = await supabase.from('tickets').select('*')
    const { data: profiles } = await supabase.from('profiles').select('*').neq('role', 'admin')
    if (tickets) {
      const vendus = tickets.filter(t => t.status === 'vendu' || t.status === 'embarque').length
      const embarques = tickets.filter(t => t.status === 'embarque').length
      setStats({
        total: 500,
        vendus,
        embarques,
        disponibles: tickets.filter(t => t.status === 'disponible').length,
      })
      setStatsEmbarquement({ embarques, vendus })
      if (profiles) {
        setVendeurs(profiles.filter(p => p.role === 'vendeur').map(p => ({
          ...p,
          ventes: tickets.filter(t => t.vendeur_id === p.id).length,
          montant: tickets.filter(t => t.vendeur_id === p.id).length * 6000
        })).sort((a, b) => b.ventes - a.ventes))
      }
    }
    setLastUpdate(new Date())
    setLoading(false)
  }

  const handleSearch = async () => {
    if (!search.trim()) return
    setSearchLoading(true)
    setTicket(null)
    setMessage({ type: '', text: '' })
    const { data } = await supabase
      .from('tickets')
      .select('*, profiles(full_name)')
      .or(`serial_number.ilike.%${search}%,client_name.ilike.%${search}%`)
      .limit(1)
      .single()
    if (!data) {
      setMessage({ type: 'error', text: 'Aucun ticket trouve pour cette recherche.' })
    } else {
      setTicket(data)
    }
    setSearchLoading(false)
  }

  const handleEmbarquement = async () => {
    if (!ticket) return
    if (ticket.status === 'embarque') {
      setMessage({ type: 'fraud', text: 'ALERTE FRAUDE — Ce ticket a deja ete utilise !' })
      return
    }
    if (ticket.status === 'disponible') {
      setMessage({ type: 'error', text: 'Ce ticket n\'a pas encore ete vendu.' })
      return
    }
    if (ticket.status === 'perdu') {
      setMessage({ type: 'error', text: 'Ce ticket est declare perdu. Verifier l\'identite du passager.' })
      return
    }
    setEmbarquementLoading(true)
    const { error } = await supabase
      .from('tickets')
      .update({ status: 'embarque', embarked_at: new Date().toISOString() })
      .eq('id', ticket.id)
    if (!error) {
      setTicket({ ...ticket, status: 'embarque' })
      setMessage({ type: 'success', text: `Embarquement valide ! ${ticket.client_name} est a bord.` })
      fetchData()
    }
    setEmbarquementLoading(false)
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
    if (!tickets || tickets.length === 0) { alert('Aucun ticket vendu a exporter.'); return }
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

  const getStatusStyle = (status) => {
    if (status === 'embarque') return { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8', label: 'EMBARQUE' }
    if (status === 'vendu') return { bg: '#f0fdf4', border: '#bbf7d0', color: '#308B0A', label: 'VENDU — PRET A EMBARQUER' }
    if (status === 'perdu') return { bg: '#fff5f5', border: '#fecaca', color: '#dc2626', label: 'TICKET DECLARE PERDU' }
    return { bg: '#fffbeb', border: '#fde68a', color: '#b45309', label: 'NON VENDU' }
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
      <div style={{ background: 'linear-gradient(135deg, #308B0A 0%, #1e5c06 100%)', padding: '24px 20px 0', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: 700, letterSpacing: 1.5, margin: 0 }}>BUE / COJEF</p>
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

        {/* TABS */}
        <div style={{ display: 'flex', gap: 2 }}>
          {[['dashboard', 'Tableau de bord'], ['embarquement', 'Embarquement'], ['manifeste', 'Manifeste']].map(([key, label]) => (
            <button key={key} onClick={() => { setActiveTab(key); setTicket(null); setMessage({ type: '', text: '' }) }} style={{
              flex: 1, padding: '11px 0', border: 'none', background: 'transparent',
              color: activeTab === key ? 'white' : 'rgba(255,255,255,0.5)',
              fontWeight: activeTab === key ? 800 : 500, fontSize: 12, cursor: 'pointer',
              borderBottom: activeTab === key ? '3px solid white' : '3px solid transparent',
              transition: 'all 0.2s'
            }}>{label}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: '20px 16px 40px' }}>

        {/* ===== TABLEAU DE BORD ===== */}
        {activeTab === 'dashboard' && (
          <div>
            {lastUpdate && (
              <p style={{ color: '#9ca3af', fontSize: 11, margin: '0 0 14px', fontWeight: 500 }}>
                Mise a jour en temps reel · {lastUpdate.toLocaleTimeString('fr-FR')}
              </p>
            )}

            <div style={{ background: 'white', borderRadius: 20, padding: '24px', marginBottom: 14, boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <p style={{ color: '#9ca3af', fontSize: 11, fontWeight: 700, letterSpacing: 1, margin: '0 0 6px' }}>REMPLISSAGE GLOBAL</p>
                  <p style={{ color: '#111', fontSize: 36, fontWeight: 900, margin: 0, letterSpacing: '-1px' }}>
                    {stats.vendus}<span style={{ fontSize: 16, color: '#9ca3af', fontWeight: 500 }}> / 500</span>
                  </p>
                </div>
                <div style={{ background: pct >= 80 ? '#dcfce7' : pct >= 50 ? '#fef9c3' : '#f0f2f5', borderRadius: 14, padding: '10px 16px' }}>
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
        )}

        {/* ===== EMBARQUEMENT ===== */}
        {activeTab === 'embarquement' && (
          <div>
            {/* Compteurs */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              {[
                { label: 'A BORD', value: statsEmbarquement.embarques, color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
                { label: 'VENDUS', value: statsEmbarquement.vendus, color: '#308B0A', bg: '#f0fdf4', border: '#bbf7d0' },
                { label: 'RESTANTS', value: statsEmbarquement.vendus - statsEmbarquement.embarques, color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
              ].map((s, i) => (
                <div key={i} style={{ flex: 1, background: s.bg, borderRadius: 14, padding: '14px', textAlign: 'center', border: `1px solid ${s.border}` }}>
                  <p style={{ color: '#6b7280', fontSize: 9, fontWeight: 700, margin: '0 0 4px', letterSpacing: 1 }}>{s.label}</p>
                  <p style={{ color: s.color, fontSize: 26, fontWeight: 900, margin: 0 }}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Recherche */}
            <div style={{ background: 'white', borderRadius: 20, padding: '20px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', marginBottom: 14 }}>
              <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: 1 }}>RECHERCHE PAR NUMERO OU NOM</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input type="text" placeholder="Ex: JEF-001 ou Marc Dossou"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  style={{ flex: 1, border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '13px 14px', fontSize: 14, background: '#fafafa', outline: 'none', boxSizing: 'border-box' }}
                />
                <button onClick={handleSearch} disabled={searchLoading}
                  style={{ padding: '13px 18px', borderRadius: 12, border: 'none', background: '#308B0A', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                  {searchLoading ? '...' : 'OK'}
                </button>
              </div>
            </div>

            {/* Message */}
            {message.text && (
              <div style={{
                background: message.type === 'success' ? '#f0fdf4' : message.type === 'fraud' ? '#fff1f2' : '#fff5f5',
                border: `1px solid ${message.type === 'success' ? '#86efac' : '#fecaca'}`,
                borderLeft: `4px solid ${message.type === 'success' ? '#308B0A' : '#ef4444'}`,
                borderRadius: 14, padding: '14px 16px', marginBottom: 14
              }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: message.type === 'success' ? '#16a34a' : '#dc2626' }}>
                  {message.text}
                </p>
              </div>
            )}

            {/* Resultat ticket */}
            {ticket && (
              <div style={{ background: 'white', borderRadius: 20, padding: '22px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
                {(() => {
                  const s = getStatusStyle(ticket.status)
                  return (
                    <div style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 12, padding: '10px 14px', marginBottom: 18, textAlign: 'center' }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: s.color, letterSpacing: 0.5 }}>{s.label}</span>
                    </div>
                  )
                })()}

                <div style={{ marginBottom: 16 }}>
                  <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: 1 }}>NUMERO DE TICKET</p>
                  <p style={{ margin: 0, fontSize: 26, fontWeight: 900, color: '#111', letterSpacing: 1 }}>{ticket.serial_number}</p>
                </div>

                <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 16, marginBottom: 16 }}>
                  <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: 1 }}>PASSAGER</p>
                  <p style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: '#111' }}>{ticket.client_name}</p>
                  <p style={{ margin: 0, fontSize: 14, color: '#6b7280' }}>{ticket.client_phone}</p>
                </div>

                {ticket.profiles?.full_name && (
                  <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 16, marginBottom: 16 }}>
                    <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: 1 }}>VENDU PAR</p>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111' }}>{ticket.profiles.full_name}</p>
                  </div>
                )}

                {ticket.embarked_at && (
                  <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 16, marginBottom: 16 }}>
                    <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: 1 }}>EMBARQUE LE</p>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#1d4ed8' }}>{new Date(ticket.embarked_at).toLocaleString('fr-FR')}</p>
                  </div>
                )}

                {ticket.status === 'vendu' && (
                  <button onClick={handleEmbarquement} disabled={embarquementLoading}
                    style={{ width: '100%', padding: '17px', borderRadius: 16, border: 'none', background: embarquementLoading ? '#d1d5db' : 'linear-gradient(135deg, #308B0A, #1e5c06)', color: 'white', fontSize: 17, fontWeight: 800, cursor: embarquementLoading ? 'not-allowed' : 'pointer', boxShadow: '0 6px 20px rgba(48,139,10,0.35)', marginTop: 4 }}>
                    {embarquementLoading ? 'Validation...' : "Valider l'embarquement"}
                  </button>
                )}

                {ticket.status === 'embarque' && (
                  <div style={{ background: '#eff6ff', borderRadius: 14, padding: '14px', textAlign: 'center', marginTop: 4 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#1d4ed8' }}>Passager deja a bord</p>
                  </div>
                )}

                {ticket.status === 'disponible' && (
                  <div style={{ background: '#fffbeb', borderRadius: 14, padding: '14px', textAlign: 'center', marginTop: 4 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#b45309' }}>Ticket non vendu — Embarquement refuse</p>
                  </div>
                )}

                {ticket.status === 'perdu' && (
                  <div style={{ background: '#fff5f5', borderRadius: 14, padding: '14px', textAlign: 'center', marginTop: 4 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#dc2626' }}>Ticket declare perdu</p>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280' }}>Verifier CNI et contacter l'admin</p>
                  </div>
                )}
              </div>
            )}

            {!ticket && !message.text && (
              <div style={{ background: 'white', borderRadius: 20, padding: '48px 20px', textAlign: 'center', boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
                <p style={{ color: '#9ca3af', fontSize: 15, margin: 0, fontWeight: 500 }}>Recherchez un ticket pour commencer</p>
                <p style={{ color: '#d1d5db', fontSize: 13, margin: '6px 0 0' }}>Par numero de ticket ou nom du passager</p>
              </div>
            )}
          </div>
        )}

        {/* ===== MANIFESTE ===== */}
        {activeTab === 'manifeste' && (
          <div>
            <div style={{ background: 'white', borderRadius: 20, padding: '24px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', marginBottom: 14 }}>
              <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: 1 }}>LISTE DES PASSAGERS</p>
              <p style={{ margin: '0 0 20px', fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>
                Telechargez la liste complete des passagers enregistres au format CSV (Excel).
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                <div style={{ background: '#f0fdf4', borderRadius: 14, padding: '16px', textAlign: 'center', border: '1px solid #bbf7d0' }}>
                  <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: '#6b7280', letterSpacing: 0.8 }}>VENDUS</p>
                  <p style={{ margin: '6px 0 0', fontSize: 28, fontWeight: 900, color: '#308B0A' }}>{stats.vendus}</p>
                </div>
                <div style={{ background: '#eff6ff', borderRadius: 14, padding: '16px', textAlign: 'center', border: '1px solid #bfdbfe' }}>
                  <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: '#6b7280', letterSpacing: 0.8 }}>A BORD</p>
                  <p style={{ margin: '6px 0 0', fontSize: 28, fontWeight: 900, color: '#1d4ed8' }}>{stats.embarques}</p>
                </div>
              </div>
              <button onClick={exportManifeste}
                style={{ width: '100%', padding: '15px', borderRadius: 16, border: '2px solid #308B0A', background: 'white', color: '#308B0A', fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>
                Telecharger le manifeste (CSV)
              </button>
            </div>

            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 16, padding: '16px 18px' }}>
              <p style={{ margin: 0, fontSize: 13, color: '#92400e', fontWeight: 600, lineHeight: 1.5 }}>
                Le manifeste contient uniquement les tickets vendus et embarques. Les tickets disponibles ne sont pas inclus.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}