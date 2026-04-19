'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function TicketsPerdustPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [ticket, setTicket] = useState(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [ticketsPerdus, setTicketsPerdus] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { checkAdmin() }, [])

  const checkAdmin = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
    if (profile?.role !== 'admin') { router.push('/login'); return }
    fetchTicketsPerdus()
  }

  const fetchTicketsPerdus = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('tickets')
      .select('*, profiles(full_name)')
      .eq('status', 'perdu')
      .order('updated_at', { ascending: false })
    setTicketsPerdus(data || [])
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
      .or(`serial_number.ilike.%${search}%,client_name.ilike.%${search}%,client_phone.ilike.%${search}%`)
      .neq('status', 'disponible')
      .limit(1)
      .single()

    if (!data) {
      setMessage({ type: 'error', text: 'Aucun ticket trouve pour cette recherche.' })
    } else {
      setTicket(data)
    }
    setSearchLoading(false)
  }

  const handleMarquerPerdu = async () => {
    if (!ticket) return
    if (ticket.status === 'perdu') {
      setMessage({ type: 'error', text: 'Ce ticket est deja marque comme perdu.' })
      return
    }
    if (ticket.status === 'embarque') {
      setMessage({ type: 'error', text: 'Ce ticket a deja ete utilise pour embarquer.' })
      return
    }
    setActionLoading(true)
    const { error } = await supabase
      .from('tickets')
      .update({ status: 'perdu', updated_at: new Date().toISOString() })
      .eq('id', ticket.id)

    if (!error) {
      setMessage({ type: 'success', text: `Ticket ${ticket.serial_number} marque comme perdu. Le proprietaire peut embarquer sur presentation de sa CNI.` })
      setTicket({ ...ticket, status: 'perdu' })
      fetchTicketsPerdus()
    } else {
      setMessage({ type: 'error', text: 'Erreur : ' + error.message })
    }
    setActionLoading(false)
  }

  const handleRestaurer = async (t) => {
    const { error } = await supabase
      .from('tickets')
      .update({ status: 'vendu', updated_at: new Date().toISOString() })
      .eq('id', t.id)
    if (!error) {
      setMessage({ type: 'success', text: `Ticket ${t.serial_number} restaure avec succes !` })
      fetchTicketsPerdus()
      if (ticket?.id === t.id) setTicket({ ...ticket, status: 'vendu' })
    }
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
      <div style={{ background: 'linear-gradient(135deg, #308B0A 0%, #1e5c06 100%)', padding: '24px 20px 20px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: 700, letterSpacing: 1.5, margin: 0 }}>GESTION</p>
            <h1 style={{ color: 'white', fontSize: 20, fontWeight: 900, margin: '3px 0 0' }}>Tickets perdus</h1>
          </div>
          <button onClick={() => router.push('/admin')} style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 10, padding: '9px 14px', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Retour
          </button>
        </div>
        <div style={{ marginTop: 14, background: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: '10px 14px' }}>
          <span style={{ color: 'white', fontSize: 13, fontWeight: 600 }}>{ticketsPerdus.length} ticket{ticketsPerdus.length > 1 ? 's' : ''} declare{ticketsPerdus.length > 1 ? 's' : ''} perdu{ticketsPerdus.length > 1 ? 's' : ''}</span>
        </div>
      </div>

      <div style={{ padding: '20px 16px 40px' }}>

        {/* Recherche */}
        <div style={{ background: 'white', borderRadius: 20, padding: '20px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', marginBottom: 14 }}>
          <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: 1 }}>RECHERCHER UN TICKET</p>
          <p style={{ margin: '0 0 12px', fontSize: 13, color: '#6b7280' }}>Par numero de ticket, nom ou telephone</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="text" placeholder="Ex: JEF-042 ou Marc Dossou"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              style={{ flex: 1, border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '12px 14px', fontSize: 14, background: '#fafafa', outline: 'none', boxSizing: 'border-box' }}
            />
            <button onClick={handleSearch} disabled={searchLoading}
              style={{ padding: '12px 16px', borderRadius: 12, border: 'none', background: '#308B0A', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              {searchLoading ? '...' : 'OK'}
            </button>
          </div>
        </div>

        {/* Message */}
        {message.text && (
          <div style={{
            background: message.type === 'success' ? '#f0fdf4' : '#fff5f5',
            border: `1px solid ${message.type === 'success' ? '#86efac' : '#fecaca'}`,
            borderLeft: `4px solid ${message.type === 'success' ? '#308B0A' : '#ef4444'}`,
            borderRadius: 14, padding: '14px 16px', marginBottom: 14
          }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: message.type === 'success' ? '#16a34a' : '#dc2626' }}>{message.text}</p>
          </div>
        )}

        {/* Resultat recherche */}
        {ticket && (
          <div style={{ background: 'white', borderRadius: 20, padding: '22px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', marginBottom: 14 }}>
            <div style={{
              background: ticket.status === 'perdu' ? '#fff5f5' : ticket.status === 'embarque' ? '#eff6ff' : '#f0fdf4',
              border: `1px solid ${ticket.status === 'perdu' ? '#fecaca' : ticket.status === 'embarque' ? '#bfdbfe' : '#bbf7d0'}`,
              borderRadius: 12, padding: '10px 14px', textAlign: 'center', marginBottom: 18
            }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: ticket.status === 'perdu' ? '#dc2626' : ticket.status === 'embarque' ? '#1d4ed8' : '#16a34a' }}>
                {ticket.status === 'perdu' ? 'TICKET DECLARE PERDU' : ticket.status === 'embarque' ? 'DEJA EMBARQUE' : 'TICKET VENDU — ACTIF'}
              </span>
            </div>

            <div style={{ marginBottom: 14 }}>
              <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: 1 }}>NUMERO</p>
              <p style={{ margin: 0, fontSize: 26, fontWeight: 900, color: '#111' }}>{ticket.serial_number}</p>
            </div>

            <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 14, marginBottom: 14 }}>
              <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: 1 }}>PROPRIETAIRE</p>
              <p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#111' }}>{ticket.client_name}</p>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>{ticket.client_phone}</p>
            </div>

            {ticket.profiles?.full_name && (
              <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 14, marginBottom: 18 }}>
                <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: 1 }}>VENDU PAR</p>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111' }}>{ticket.profiles.full_name}</p>
              </div>
            )}

            {ticket.status === 'vendu' && (
              <button onClick={handleMarquerPerdu} disabled={actionLoading}
                style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none', background: actionLoading ? '#d1d5db' : '#dc2626', color: 'white', fontSize: 15, fontWeight: 700, cursor: actionLoading ? 'not-allowed' : 'pointer' }}>
                {actionLoading ? 'En cours...' : 'Declarer ce ticket comme perdu'}
              </button>
            )}

            {ticket.status === 'perdu' && (
              <button onClick={() => handleRestaurer(ticket)}
                style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none', background: '#308B0A', color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                Restaurer ce ticket (retrouve)
              </button>
            )}
          </div>
        )}

        {/* Liste tickets perdus */}
        <div style={{ background: 'white', borderRadius: 20, padding: '22px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
          <p style={{ margin: '0 0 16px', fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: 1 }}>TICKETS DECLARES PERDUS</p>
          {ticketsPerdus.length === 0 ? (
            <p style={{ color: '#9ca3af', fontSize: 14, textAlign: 'center', padding: '20px 0', margin: 0 }}>Aucun ticket perdu declare</p>
          ) : (
            ticketsPerdus.map((t, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: i < ticketsPerdus.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#111' }}>{t.client_name}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>{t.client_phone}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ background: '#fff5f5', borderRadius: 8, padding: '4px 10px' }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#dc2626' }}>{t.serial_number}</span>
                  </div>
                  <button onClick={() => handleRestaurer(t)}
                    style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#16a34a', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    Restaurer
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  )
}