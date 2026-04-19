'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

export default function ControleurPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [ticket, setTicket] = useState(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [embarquementLoading, setEmbarquementLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [stats, setStats] = useState({ embarques: 0, vendus: 0 })
  const [controleur, setControleur] = useState(null)

  useEffect(() => { checkControleur() }, [])

  const checkControleur = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
    if (!profile || !['controleur', 'admin'].includes(profile.role)) { router.push('/login'); return }
    setControleur(profile)
    fetchStats()
  }

  const fetchStats = async () => {
    const { data } = await supabase.from('tickets').select('status')
    if (data) {
      setStats({
        embarques: data.filter(t => t.status === 'embarque').length,
        vendus: data.filter(t => t.status === 'vendu' || t.status === 'embarque').length,
      })
    }
  }

  const handleSearch = async () => {
    if (!search.trim()) return
    setSearchLoading(true)
    setTicket(null)
    setMessage({ type: '', text: '' })

    const { data, error } = await supabase
      .from('tickets')
      .select('*, profiles(full_name)')
      .or(`serial_number.ilike.%${search}%,client_name.ilike.%${search}%`)
      .limit(1)
      .single()

    if (error || !data) {
      setMessage({ type: 'error', text: 'Aucun ticket trouve pour cette recherche.' })
    } else {
      setTicket(data)
    }
    setSearchLoading(false)
  }

  const handleEmbarquement = async () => {
    if (!ticket) return
    if (ticket.status === 'embarque') {
      setMessage({ type: 'fraud', text: 'ALERTE FRAUDE — Ce ticket a deja ete utilise pour embarquer !' })
      return
    }
    if (ticket.status === 'disponible') {
      setMessage({ type: 'error', text: 'Ce ticket n\'a pas encore ete vendu.' })
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
      fetchStats()
    }
    setEmbarquementLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const getStatusStyle = (status) => {
    if (status === 'embarque') return { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8', label: 'EMBARQUE' }
    if (status === 'vendu') return { bg: '#f0fdf4', border: '#bbf7d0', color: '#308B0A', label: 'VENDU — PRET A EMBARQUER' }
    return { bg: '#fffbeb', border: '#fde68a', color: '#b45309', label: 'NON VENDU' }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', fontFamily: "'Segoe UI', system-ui, sans-serif", maxWidth: 430, margin: '0 auto' }}>

      {/* HEADER */}
      <div style={{ background: 'linear-gradient(135deg, #308B0A 0%, #1e5c06 100%)', padding: '24px 20px 20px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: 700, letterSpacing: 1.5, margin: 0 }}>CONTROLE EMBARQUEMENT</p>
            <h1 style={{ color: 'white', fontSize: 20, fontWeight: 900, margin: '3px 0 0' }}>JEF 2026</h1>
          </div>
          <button onClick={handleLogout} style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 10, padding: '9px 14px', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Quitter
          </button>
        </div>

        {/* Compteur embarquement */}
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.12)', borderRadius: 14, padding: '14px', textAlign: 'center' }}>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: 700, margin: '0 0 4px', letterSpacing: 1 }}>A BORD</p>
            <p style={{ color: 'white', fontSize: 28, fontWeight: 900, margin: 0 }}>{stats.embarques}</p>
          </div>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.12)', borderRadius: 14, padding: '14px', textAlign: 'center' }}>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: 700, margin: '0 0 4px', letterSpacing: 1 }}>TOTAL VENDUS</p>
            <p style={{ color: 'white', fontSize: 28, fontWeight: 900, margin: 0 }}>{stats.vendus}</p>
          </div>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.12)', borderRadius: 14, padding: '14px', textAlign: 'center' }}>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: 700, margin: '0 0 4px', letterSpacing: 1 }}>RESTANTS</p>
            <p style={{ color: 'white', fontSize: 28, fontWeight: 900, margin: 0 }}>{stats.vendus - stats.embarques}</p>
          </div>
        </div>
      </div>

      <div style={{ padding: '20px 16px 40px' }}>

        {/* Barre de recherche */}
        <div style={{ background: 'white', borderRadius: 20, padding: '20px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', marginBottom: 14 }}>
          <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: 1 }}>RECHERCHE PAR NUMERO OU NOM</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              type="text"
              placeholder="Ex: JEF-001 ou Marc Dossou"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              style={{ flex: 1, border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '13px 14px', fontSize: 14, background: '#fafafa', outline: 'none', boxSizing: 'border-box' }}
            />
            <button
              onClick={handleSearch}
              disabled={searchLoading}
              style={{ padding: '13px 18px', borderRadius: 12, border: 'none', background: '#308B0A', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {searchLoading ? '...' : 'Chercher'}
            </button>
          </div>
        </div>

        {/* Message */}
        {message.text && (
          <div style={{
            background: message.type === 'success' ? '#f0fdf4' : message.type === 'fraud' ? '#fff1f2' : '#fff5f5',
            border: `1px solid ${message.type === 'success' ? '#86efac' : message.type === 'fraud' ? '#fecdd3' : '#fecaca'}`,
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
          <div style={{ background: 'white', borderRadius: 20, padding: '22px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', marginBottom: 14 }}>

            {/* Statut */}
            {(() => {
              const s = getStatusStyle(ticket.status)
              return (
                <div style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 12, padding: '10px 14px', marginBottom: 18, textAlign: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: s.color, letterSpacing: 0.5 }}>{s.label}</span>
                </div>
              )
            })()}

            {/* Infos ticket */}
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
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#1d4ed8' }}>
                  {new Date(ticket.embarked_at).toLocaleString('fr-FR')}
                </p>
              </div>
            )}

            {/* Bouton embarquement */}
            {ticket.status === 'vendu' && (
              <button
                onClick={handleEmbarquement}
                disabled={embarquementLoading}
                style={{ width: '100%', padding: '17px', borderRadius: 16, border: 'none', background: embarquementLoading ? '#d1d5db' : 'linear-gradient(135deg, #308B0A, #1e5c06)', color: 'white', fontSize: 17, fontWeight: 800, cursor: embarquementLoading ? 'not-allowed' : 'pointer', boxShadow: '0 6px 20px rgba(48,139,10,0.35)', marginTop: 4 }}>
                {embarquementLoading ? 'Validation...' : 'Valider l\'embarquement'}
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
          </div>
        )}

        {/* Etat vide */}
        {!ticket && !message.text && (
          <div style={{ background: 'white', borderRadius: 20, padding: '48px 20px', textAlign: 'center', boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
            <p style={{ color: '#9ca3af', fontSize: 15, margin: 0, fontWeight: 500 }}>Recherchez un ticket pour commencer</p>
            <p style={{ color: '#d1d5db', fontSize: 13, margin: '6px 0 0' }}>Par numero de ticket ou nom du passager</p>
          </div>
        )}
      </div>
    </div>
  )
}