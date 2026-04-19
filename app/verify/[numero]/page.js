'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function VerifyTicketPage({ params }) {
  const router = useRouter()
  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (params?.numero) fetchTicket(params.numero)
  }, [params])

  const fetchTicket = async (numero) => {
    setLoading(true)
    const { data } = await supabase
      .from('tickets')
      .select('serial_number, status, client_name, client_phone, sold_at, embarked_at')
      .eq('serial_number', numero.toUpperCase())
      .single()

    if (!data) setNotFound(true)
    else setTicket(data)
    setLoading(false)
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f8f9fa', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 44, height: 44, border: '3px solid #308B0A', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 14px' }}></div>
        <p style={{ color: '#6b7280', fontWeight: 600, fontSize: 14 }}>Verification en cours...</p>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', fontFamily: "'Segoe UI', system-ui, sans-serif", maxWidth: 430, margin: '0 auto' }}>

      {/* HEADER */}
      <div style={{ background: 'linear-gradient(135deg, #308B0A 0%, #1e5c06 100%)', padding: '40px 24px 32px', textAlign: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: 700, letterSpacing: 1.5, margin: '0 0 6px' }}>VERIFICATION DE TICKET</p>
        <h1 style={{ color: 'white', fontSize: 26, fontWeight: 900, margin: '0 0 6px' }}>JEF 2026</h1>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, margin: 0 }}>Grand-Popo via Ouidah · 13 Juin</p>
      </div>

      <div style={{ padding: '24px 16px 40px' }}>

        {/* Ticket introuvable */}
        {notFound && (
          <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderLeft: '4px solid #ef4444', borderRadius: 16, padding: '24px', textAlign: 'center' }}>
            <p style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 800, color: '#dc2626' }}>Ticket introuvable</p>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>
              Le ticket <strong>{params?.numero}</strong> ne correspond a aucun ticket enregistre.
            </p>
            <button onClick={() => router.push('/verify')}
              style={{ padding: '12px 24px', borderRadius: 12, border: 'none', background: '#308B0A', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              Verifier un autre ticket
            </button>
          </div>
        )}

        {/* Ticket VENDU */}
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
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>{ticket.client_phone}</p>
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
              <p style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 900, color: 'white' }}>
                JEF 2026 — LE RENDEZ-VOUS DE L'ANNEE !
              </p>
              <p style={{ margin: '0 0 12px', fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 1.6 }}>
                Votre place est confirmee. Preparez-vous a vivre une experience inoubliable a Grand-Popo !
              </p>
              <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: '10px 16px' }}>
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
                <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 14, marginBottom: 14 }}>
                  <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: 1 }}>PASSAGER</p>
                  <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#111' }}>{ticket.client_name}</p>
                </div>
              )}
              {ticket.embarked_at && (
                <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 14 }}>
                  <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: 1 }}>EMBARQUE LE</p>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#1d4ed8' }}>{new Date(ticket.embarked_at).toLocaleString('fr-FR')}</p>
                </div>
              )}
            </div>

            {/* Message bon voyage */}
            <div style={{ background: 'linear-gradient(135deg, #1d4ed8, #1e40af)', borderRadius: 20, padding: '24px', textAlign: 'center', boxShadow: '0 4px 20px rgba(29,78,216,0.3)' }}>
              <p style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 900, color: 'white' }}>Bon voyage !</p>
              <p style={{ margin: '0 0 12px', fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 1.6 }}>
                Bonne traversee vers Grand-Popo. Profitez de chaque moment de cette belle aventure !
              </p>
              <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: '10px 16px' }}>
                <p style={{ margin: 0, fontSize: 13, color: 'white', fontWeight: 700 }}>Grand-Popo via Ouidah · 13 Juin 2026</p>
              </div>
            </div>
          </div>
        )}

        {/* Ticket DISPONIBLE */}
        {ticket && ticket.status === 'disponible' && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderLeft: '4px solid #f59e0b', borderRadius: 16, padding: '24px', textAlign: 'center' }}>
            <p style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 800, color: '#b45309' }}>Ticket non enregistre</p>
            <p style={{ margin: 0, fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>
              Ce ticket existe mais n'a pas encore ete vendu. Contactez votre vendeur pour regulariser.
            </p>
          </div>
        )}

        {/* Bouton retour */}
        <button onClick={() => router.push('/verify')}
          style={{ width: '100%', padding: '14px', borderRadius: 14, border: '1.5px solid #e5e7eb', background: 'white', color: '#6b7280', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 16 }}>
          Verifier un autre ticket
        </button>

      </div>
    </div>
  )
}