'use client'
import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function VerifyPage() {
  const [search, setSearch] = useState('')
  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const handleVerify = async () => {
    if (!search.trim()) return
    setLoading(true)
    setTicket(null)
    setSearched(false)

    const { data } = await supabase
      .from('tickets')
      .select('serial_number, status, client_name, sold_at')
      .eq('serial_number', search.toUpperCase())
      .single()

    setTicket(data || null)
    setSearched(true)
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', fontFamily: "'Segoe UI', system-ui, sans-serif", maxWidth: 430, margin: '0 auto' }}>

      {/* HEADER */}
      <div style={{ background: 'linear-gradient(135deg, #308B0A 0%, #1e5c06 100%)', padding: '40px 24px 32px', textAlign: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: 700, letterSpacing: 1.5, margin: '0 0 6px' }}>VERIFICATION DE TICKET</p>
        <h1 style={{ color: 'white', fontSize: 26, fontWeight: 900, margin: '0 0 6px', letterSpacing: '-0.5px' }}>JEF 2026</h1>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, margin: 0 }}>Grand-Popo via Ouidah · 13 Juin</p>
      </div>

      <div style={{ padding: '24px 16px 40px' }}>

        {/* Recherche */}
        <div style={{ background: 'white', borderRadius: 20, padding: '22px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', marginBottom: 16 }}>
          <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: 1 }}>ENTREZ VOTRE NUMERO DE TICKET</p>
          <input
            type="text"
            placeholder="Ex: JEF-001"
            value={search}
            onChange={(e) => setSearch(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
            style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '14px 16px', fontSize: 16, background: '#fafafa', outline: 'none', boxSizing: 'border-box', fontWeight: 700, letterSpacing: 1, marginBottom: 12 }}
          />
          <button
            onClick={handleVerify}
            disabled={loading}
            style={{ width: '100%', padding: '15px', borderRadius: 14, border: 'none', background: loading ? '#d1d5db' : '#308B0A', color: 'white', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 4px 14px rgba(48,139,10,0.3)' }}>
            {loading ? 'Verification...' : 'Verifier mon ticket'}
          </button>
        </div>

        {/* Ticket introuvable */}
        {searched && !ticket && (
          <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderLeft: '4px solid #ef4444', borderRadius: 16, padding: '20px', textAlign: 'center' }}>
            <p style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 800, color: '#dc2626' }}>Ticket introuvable</p>
            <p style={{ margin: 0, fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>Ce numero ne correspond a aucun ticket enregistre. Contactez votre vendeur.</p>
          </div>
        )}

        {/* Ticket VENDU — valide */}
        {ticket && ticket.status === 'vendu' && (
          <div>
            <div style={{ background: 'white', borderRadius: 20, padding: '24px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', marginBottom: 14 }}>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '12px', textAlign: 'center', marginBottom: 20 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#16a34a', letterSpacing: 0.5 }}>TICKET VALIDE — VOUS ETES ENREGISTRE</p>
              </div>
              <div style={{ marginBottom: 16 }}>
                <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: 1 }}>NUMERO</p>
                <p style={{ margin: 0, fontSize: 28, fontWeight: 900, color: '#111', letterSpacing: 1 }}>{ticket.serial_number}</p>
              </div>
              {ticket.client_name && (
                <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 14, marginBottom: 14 }}>
                  <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: 1 }}>PASSAGER</p>
                  <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#111' }}>{ticket.client_name}</p>
                </div>
              )}
              {ticket.sold_at && (
                <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 14 }}>
                  <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: 1 }}>ENREGISTRE LE</p>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#374151' }}>{new Date(ticket.sold_at).toLocaleString('fr-FR')}</p>
                </div>
              )}
            </div>

            {/* Message festif */}
            <div style={{ background: 'linear-gradient(135deg, #308B0A, #1e5c06)', borderRadius: 20, padding: '24px', textAlign: 'center', boxShadow: '0 4px 20px rgba(48,139,10,0.3)' }}>
              <p style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 900, color: 'white', letterSpacing: '-0.5px' }}>
                JEF 2026 — LE RENDEZ-VOUS DE L'ANNEE !
              </p>
              <p style={{ margin: '0 0 12px', fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 1.6 }}>
                Votre place est confirmee. Preparez-vous a vivre une experience inoubliable a Grand-Popo !
              </p>
              <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: '10px 16px', display: 'inline-block' }}>
                <p style={{ margin: 0, fontSize: 13, color: 'white', fontWeight: 700 }}>Vous allez adorer chaque instant !</p>
              </div>
            </div>
          </div>
        )}

        {/* Ticket EMBARQUE */}
        {ticket && ticket.status === 'embarque' && (
          <div>
            <div style={{ background: 'white', borderRadius: 20, padding: '24px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', marginBottom: 14 }}>
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '12px', textAlign: 'center', marginBottom: 20 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#1d4ed8', letterSpacing: 0.5 }}>PASSAGER A BORD</p>
              </div>
              <div style={{ marginBottom: 16 }}>
                <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: 1 }}>NUMERO</p>
                <p style={{ margin: 0, fontSize: 28, fontWeight: 900, color: '#111', letterSpacing: 1 }}>{ticket.serial_number}</p>
              </div>
              {ticket.client_name && (
                <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 14 }}>
                  <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: 1 }}>PASSAGER</p>
                  <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#111' }}>{ticket.client_name}</p>
                </div>
              )}
            </div>

            {/* Message bon voyage */}
            <div style={{ background: 'linear-gradient(135deg, #1d4ed8, #1e40af)', borderRadius: 20, padding: '24px', textAlign: 'center', boxShadow: '0 4px 20px rgba(29,78,216,0.3)' }}>
              <p style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 900, color: 'white', letterSpacing: '-0.5px' }}>
                Bon voyage !
              </p>
              <p style={{ margin: '0 0 12px', fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 1.6 }}>
                Bonne traversee vers Grand-Popo. Profitez de chaque moment de cette belle aventure avec la JEF 2026 !
              </p>
              <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: '10px 16px', display: 'inline-block' }}>
                <p style={{ margin: 0, fontSize: 13, color: 'white', fontWeight: 700 }}>Grand-Popo via Ouidah · 13 Juin 2026</p>
              </div>
            </div>
          </div>
        )}

        {/* Ticket DISPONIBLE — non vendu */}
        {ticket && ticket.status === 'disponible' && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderLeft: '4px solid #f59e0b', borderRadius: 16, padding: '20px', textAlign: 'center' }}>
            <p style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 800, color: '#b45309' }}>Ticket non enregistre</p>
            <p style={{ margin: 0, fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>Ce ticket existe mais n'a pas encore ete vendu. Contactez votre vendeur pour regulariser.</p>
          </div>
        )}

      </div>
    </div>
  )
}