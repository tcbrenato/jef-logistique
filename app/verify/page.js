'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function VerifyPage() {
  const [search, setSearch] = useState('')
  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    const target = new Date('2026-06-13T07:00:00')
    const timer = setInterval(() => {
      const now = new Date()
      const diff = target - now
      if (diff <= 0) { clearInterval(timer); return }
      setCountdown({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000)
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

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
      <div style={{ background: 'linear-gradient(135deg, #308B0A 0%, #1e5c06 100%)', padding: '32px 24px 28px', textAlign: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: 700, letterSpacing: 1.5, margin: '0 0 6px' }}>VERIFICATION DE TICKET</p>
        <h1 style={{ color: 'white', fontSize: 28, fontWeight: 900, margin: '0 0 4px', letterSpacing: '-0.5px' }}>JEF 2026</h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, margin: '0 0 16px' }}>Grand-Popo via Ouidah · 13 Juin</p>

        {/* Compte à rebours */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
          {[
            { val: countdown.days, label: 'Jours' },
            { val: countdown.hours, label: 'Heures' },
            { val: countdown.minutes, label: 'Min' },
            { val: countdown.seconds, label: 'Sec' },
          ].map((c, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: '10px 12px', minWidth: 56, textAlign: 'center' }}>
              <p style={{ color: 'white', fontSize: 22, fontWeight: 900, margin: 0, letterSpacing: '-0.5px' }}>
                {String(c.val).padStart(2, '0')}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 9, fontWeight: 600, margin: '2px 0 0', letterSpacing: 0.5 }}>
                {c.label.toUpperCase()}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '20px 16px 40px' }}>

        {/* Infos voyage */}
        <div style={{ background: 'white', borderRadius: 16, padding: '16px', marginBottom: 14, boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
          <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: 1 }}>INFOS DU VOYAGE</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { label: 'Date', value: '13 Juin 2026' },
              { label: 'Depart', value: 'UAC · Cotonou' },
              { label: 'Trajet', value: 'Ouidah → Grand-Popo' },
              { label: 'Prix', value: '6 000 FCFA' },
            ].map((info, i) => (
              <div key={i} style={{ background: '#f9fafb', borderRadius: 10, padding: '10px 12px' }}>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: '#9ca3af', letterSpacing: 0.5 }}>{info.label.toUpperCase()}</p>
                <p style={{ margin: '3px 0 0', fontSize: 13, fontWeight: 700, color: '#111' }}>{info.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recherche */}
        <div style={{ background: 'white', borderRadius: 20, padding: '20px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', marginBottom: 14 }}>
          <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: 1 }}>VERIFIER MON TICKET</p>
          <input
            type="text"
            placeholder="Ex: JEF-001"
            value={search}
            onChange={(e) => setSearch(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
            style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '14px 16px', fontSize: 16, background: '#fafafa', outline: 'none', boxSizing: 'border-box', fontWeight: 700, letterSpacing: 1, marginBottom: 12 }}
          />
          <button onClick={handleVerify} disabled={loading}
            style={{ width: '100%', padding: '15px', borderRadius: 14, border: 'none', background: loading ? '#d1d5db' : '#308B0A', color: 'white', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 4px 14px rgba(48,139,10,0.3)' }}>
            {loading ? 'Verification...' : 'Verifier mon ticket'}
          </button>
        </div>

        {/* Ticket introuvable */}
        {searched && !ticket && (
          <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderLeft: '4px solid #ef4444', borderRadius: 16, padding: '20px', textAlign: 'center', marginBottom: 14 }}>
            <p style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 800, color: '#dc2626' }}>Ticket introuvable</p>
            <p style={{ margin: 0, fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>Ce numero ne correspond a aucun ticket enregistre. Contactez votre vendeur.</p>
          </div>
        )}

        {/* Ticket VENDU */}
        {ticket && ticket.status === 'vendu' && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ background: 'white', borderRadius: 20, padding: '24px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', marginBottom: 14 }}>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '12px', textAlign: 'center', marginBottom: 20 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#16a34a', letterSpacing: 0.5 }}>TICKET VALIDE — VOUS ETES ENREGISTRE</p>
              </div>
              <div style={{ marginBottom: 14 }}>
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
            <div style={{ background: 'linear-gradient(135deg, #308B0A, #1e5c06)', borderRadius: 20, padding: '24px', textAlign: 'center', boxShadow: '0 4px 20px rgba(48,139,10,0.3)' }}>
              <p style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 900, color: 'white' }}>JEF 2026 — LE RENDEZ-VOUS DE L'ANNEE !</p>
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
          <div style={{ marginBottom: 14 }}>
            <div style={{ background: 'white', borderRadius: 20, padding: '24px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', marginBottom: 14 }}>
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '12px', textAlign: 'center', marginBottom: 20 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: '#1d4ed8', letterSpacing: 0.5 }}>PASSAGER A BORD</p>
              </div>
              <div style={{ marginBottom: 14 }}>
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
            <div style={{ background: 'linear-gradient(135deg, #1d4ed8, #1e40af)', borderRadius: 20, padding: '24px', textAlign: 'center' }}>
              <p style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 900, color: 'white' }}>Bon voyage !</p>
              <p style={{ margin: '0 0 12px', fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 1.6 }}>
                Bonne traversee vers Grand-Popo. Profitez de chaque moment !
              </p>
              <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: '10px 16px' }}>
                <p style={{ margin: 0, fontSize: 13, color: 'white', fontWeight: 700 }}>Grand-Popo via Ouidah · 13 Juin 2026</p>
              </div>
            </div>
          </div>
        )}

        {/* Ticket DISPONIBLE */}
        {ticket && ticket.status === 'disponible' && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderLeft: '4px solid #f59e0b', borderRadius: 16, padding: '20px', textAlign: 'center', marginBottom: 14 }}>
            <p style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 800, color: '#b45309' }}>Ticket non enregistre</p>
            <p style={{ margin: 0, fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>Ce ticket existe mais n'a pas encore ete vendu. Contactez votre vendeur.</p>
          </div>
        )}

        {/* Message important — garder ticket */}
        <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderLeft: '4px solid #ef4444', borderRadius: 16, padding: '16px 18px', marginBottom: 14 }}>
          <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 800, color: '#dc2626' }}>
            IMPORTANT — Gardez bien votre ticket !
          </p>
          <p style={{ margin: 0, fontSize: 12, color: '#374151', lineHeight: 1.7 }}>
            Votre ticket physique est indispensable le jour J. En cas de perte, contactez immédiatement un membre BUE ou écrivez en urgence sur WhatsApp :
          </p>
          <a href="https://wa.me/22995754733" target="_blank" rel="noopener noreferrer"
            style={{ display: 'block', marginTop: 10, background: '#25D366', borderRadius: 10, padding: '10px 16px', textAlign: 'center', textDecoration: 'none' }}>
            <span style={{ color: 'white', fontSize: 14, fontWeight: 800 }}>WhatsApp : +229 95 75 47 33</span>
          </a>
        </div>

        {/* Conseils jour J */}
        <div style={{ background: 'white', borderRadius: 16, padding: '18px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
          <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: 1 }}>CONSEILS POUR LE JOUR J</p>
          {[
            'Arrivez 30 minutes avant le depart',
            'Gardez votre ticket dans un endroit sur',
            'Presentez votre ticket au controleur',
            'La souche sera dechirée a chaque etape',
            'Gardez la grande partie pour le retour',
          ].map((conseil, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: i < 4 ? 10 : 0 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#308B0A', marginTop: 5, flexShrink: 0 }}></div>
              <p style={{ margin: 0, fontSize: 13, color: '#374151', lineHeight: 1.5 }}>{conseil}</p>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}