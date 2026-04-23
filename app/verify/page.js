'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function VerifyPage() {
  const [search, setSearch] = useState('')
  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', text: 'Bonjour ! Je suis l\'assistant JEF 2026 créé par Rénato TCHOBO. Comment puis-je vous aider ?' }
  ])
  const [showFlash, setShowFlash] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)

  useEffect(() => {
    const target = new Date('2026-06-13T09:00:00')
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

  useEffect(() => {
    if (chatOpen) return
    const timer = setInterval(() => {
      setShowFlash(true)
      setTimeout(() => setShowFlash(false), 3000)
    }, 12000)
    setShowFlash(true)
    setTimeout(() => setShowFlash(false), 3000)
    return () => clearInterval(timer)
  }, [chatOpen])

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

  const sendMessage = async () => {
    if (!chatInput.trim() || chatLoading) return
    const userMsg = chatInput.trim()
    setChatInput('')
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }])
    setChatLoading(true)
    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          history: chatMessages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', text: m.text }))
        })
      })
      const data = await res.json()
      setChatMessages(prev => [...prev, { role: 'assistant', text: data.response }])
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', text: 'Désolé, une erreur s\'est produite. Contactez-nous sur WhatsApp : +22995754733' }])
    }
    setChatLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', fontFamily: "'Segoe UI', system-ui, sans-serif", maxWidth: 430, margin: '0 auto' }}>

      {/* HEADER */}
      <div style={{ background: 'linear-gradient(135deg, #308B0A 0%, #1e5c06 100%)', padding: '32px 24px 28px', textAlign: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: 700, letterSpacing: 1.5, margin: '0 0 6px' }}>VERIFICATION DE TICKET</p>
        <h1 style={{ color: 'white', fontSize: 28, fontWeight: 900, margin: '0 0 4px', letterSpacing: '-0.5px' }}>JEF 2026</h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, margin: '0 0 16px' }}>Grand-Popo via Ouidah · 13 Juin</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
          {[
            { val: countdown.days, label: 'Jours' },
            { val: countdown.hours, label: 'Heures' },
            { val: countdown.minutes, label: 'Min' },
            { val: countdown.seconds, label: 'Sec' },
          ].map((c, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: '10px 12px', minWidth: 56, textAlign: 'center' }}>
              <p style={{ color: 'white', fontSize: 22, fontWeight: 900, margin: 0 }}>{String(c.val).padStart(2, '0')}</p>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 9, fontWeight: 600, margin: '2px 0 0', letterSpacing: 0.5 }}>{c.label.toUpperCase()}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '20px 16px 100px' }}>

        {/* Infos voyage */}
        <div style={{ background: 'white', borderRadius: 16, padding: '16px', marginBottom: 14, boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: 1 }}>INFOS DU VOYAGE</p>
            <button onClick={() => setShowModal(true)}
              style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: '#308B0A', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              Voir le programme
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { label: 'Date', value: '13 Juin 2026' },
              { label: 'Depart', value: 'UAC · 09h00' },
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

        {/* Modal Programme */}
        {showModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
            onClick={() => setShowModal(false)}>
            <div style={{ background: 'white', borderRadius: '24px 24px 0 0', padding: '28px 24px 40px', width: '100%', maxWidth: 430, boxShadow: '0 -10px 40px rgba(0,0,0,0.2)' }}
              onClick={(e) => e.stopPropagation()}>
              <div style={{ width: 40, height: 4, background: '#e5e7eb', borderRadius: 99, margin: '0 auto 20px' }}></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: 1 }}>JEF 2026</p>
                  <h2 style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 900, color: '#111' }}>Programme du 13 Juin</h2>
                </div>
                <button onClick={() => setShowModal(false)}
                  style={{ width: 36, height: 36, borderRadius: 10, border: '1.5px solid #e5e7eb', background: 'white', color: '#6b7280', fontSize: 16, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  ✕
                </button>
              </div>
              {[
                { heure: '07h00', titre: 'Rassemblement UAC', detail: 'Etre sur le campus UAC OBLIGATOIREMENT — pas de retard !', color: '#dc2626', bg: '#fff5f5', border: '#fecaca' },
                { heure: '09h00', titre: 'Depart officiel', detail: 'Depart des bus depuis l\'UAC · Cotonou', color: '#308B0A', bg: '#f0fdf4', border: '#bbf7d0' },
                { heure: '10h - 12h', titre: 'Escale Ouidah', detail: 'Temple des Pythons, Foret de Kpasse, Place Tchatcha, Porte du Non-Retour...', color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
                { heure: '13h00', titre: 'Depart Grand-Popo', detail: 'Depart depuis Ouidah vers Grand-Popo', color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
                { heure: '15h - 19h', titre: 'Fete VIP Grand-Popo', detail: 'Espace VIP spacieux et style — ambiance, detente, restauration legere incluse', color: '#6d28d9', bg: '#f5f3ff', border: '#ddd6fe' },
                { heure: '20h - 21h', titre: 'Retour Cotonou', detail: 'Retour vers Cotonou · Fin de l\'evenement', color: '#374151', bg: '#f9fafb', border: '#e5e7eb' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 14, marginBottom: i < 5 ? 16 : 0 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: item.bg, border: `2px solid ${item.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 9, fontWeight: 900, color: item.color, textAlign: 'center', lineHeight: 1.3 }}>{item.heure}</span>
                    </div>
                    {i < 5 && <div style={{ width: 2, height: 16, background: '#f3f4f6', margin: '4px 0' }}></div>}
                  </div>
                  <div style={{ paddingTop: 4 }}>
                    <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: '#111' }}>{item.titre}</p>
                    <p style={{ margin: '3px 0 0', fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>{item.detail}</p>
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 24, background: 'linear-gradient(135deg, #308B0A, #1e5c06)', borderRadius: 14, padding: '14px 16px', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'white' }}>JEF 2026 — Le rendez-vous de l'annee !</p>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>Grand-Popo via Ouidah · 13 Juin 2026</p>
              </div>
            </div>
          </div>
        )}

        {/* Recherche */}
        <div style={{ background: 'white', borderRadius: 20, padding: '20px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', marginBottom: 14 }}>
          <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: 1 }}>VERIFIER MON TICKET</p>
          <input type="text" placeholder="Ex: JEF-001" value={search}
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
              <p style={{ margin: '0 0 12px', fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 1.6 }}>Votre place est confirmee. Preparez-vous a vivre une experience inoubliable a Grand-Popo !</p>
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
              <p style={{ margin: '0 0 12px', fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 1.6 }}>Bonne traversee vers Grand-Popo. Profitez de chaque moment !</p>
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

        {/* Message important */}
        <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderLeft: '4px solid #ef4444', borderRadius: 16, padding: '16px 18px', marginBottom: 14 }}>
          <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 800, color: '#dc2626' }}>IMPORTANT — Gardez bien votre ticket !</p>
          <p style={{ margin: '0 0 10px', fontSize: 12, color: '#374151', lineHeight: 1.7 }}>
            Votre ticket physique est indispensable le jour J. En cas de perte, contactez immediatement un membre BUE ou ecrivez en urgence sur WhatsApp :
          </p>
          <a href="https://wa.me/22995754733" target="_blank" rel="noopener noreferrer"
            style={{ display: 'block', background: '#25D366', borderRadius: 10, padding: '10px 16px', textAlign: 'center', textDecoration: 'none' }}>
            <span style={{ color: 'white', fontSize: 14, fontWeight: 800 }}>WhatsApp : +229 95 75 47 33</span>
          </a>
        </div>

        {/* Conseils jour J */}
        <div style={{ background: 'white', borderRadius: 16, padding: '18px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
          <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: 1 }}>CONSEILS POUR LE JOUR J</p>
          {[
            'Etre sur le campus UAC a 07h00 PRECISES — pas de retard',
            'Gardez votre ticket dans un endroit sur',
            'Presentez votre ticket au controleur avant d\'embarquer',
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

      {/* Bouton chat flottant */}
      {!chatOpen && (
        <div style={{ position: 'fixed', bottom: 24, right: 16, zIndex: 400, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
          {showFlash && (
            <div style={{ background: 'white', borderRadius: 14, padding: '10px 14px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', maxWidth: 200, animation: 'fadeIn 0.3s ease' }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#111', lineHeight: 1.4 }}>
                💬 Posez-moi vos questions sur la JEF 2026 !
              </p>
              <div style={{ width: 0, height: 0, borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderTop: '8px solid white', position: 'absolute', bottom: -8, right: 28 }}></div>
            </div>
          )}
          <button onClick={() => setChatOpen(true)}
            style={{ width: 56, height: 56, borderRadius: '50%', border: 'none', background: 'linear-gradient(135deg, #308B0A, #1e5c06)', color: 'white', fontSize: 24, cursor: 'pointer', boxShadow: '0 4px 20px rgba(48,139,10,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            💬
          </button>
        </div>
      )}

      {/* Chat modal */}
      {chatOpen && (
        <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, height: '70vh', background: 'white', borderRadius: '24px 24px 0 0', boxShadow: '0 -10px 40px rgba(0,0,0,0.2)', zIndex: 500, display: 'flex', flexDirection: 'column' }}>

          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg, #308B0A, #1e5c06)', borderRadius: '24px 24px 0 0', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.2)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🤖</div>
              <div>
                <p style={{ margin: 0, color: 'white', fontWeight: 800, fontSize: 14 }}>Assistant JEF 2026</p>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>Par Rénato TCHOBO · COJEF / BUE FLLAC</p>
              </div>
            </div>
            <button onClick={() => setChatOpen(false)}
              style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.2)', color: 'white', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              ✕
            </button>
          </div>

          {/* Messages */}
          <div id="chat-messages" style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {chatMessages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '80%', padding: '10px 14px',
                  borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  background: msg.role === 'user' ? '#308B0A' : '#f3f4f6',
                  color: msg.role === 'user' ? 'white' : '#111',
                  fontSize: 13, lineHeight: 1.5
                }}>
                  <span dangerouslySetInnerHTML={{ __html: msg.text
  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  .replace(/\*(.*?)\*/g, '<em>$1</em>')
  .replace(/^- (.*)/gm, '• $1')
  .replace(/\n/g, '<br/>')
}} />
                </div>
              </div>
            ))}
            {chatLoading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ background: '#f3f4f6', borderRadius: '16px 16px 16px 4px', padding: '12px 16px', display: 'flex', gap: 4, alignItems: 'center' }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#9ca3af' }}></div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Questions rapides */}
          {chatMessages.length === 1 && (
            <div style={{ padding: '0 16px 8px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['Heure de départ ?', 'J\'ai perdu mon ticket', 'Comment vérifier ?', 'Qu\'inclut le ticket ?', 'Sites à Ouidah ?'].map((q, i) => (
                <button key={i} onClick={() => setChatInput(q)}
                  style={{ padding: '6px 12px', borderRadius: 20, border: '1px solid #308B0A', background: 'white', color: '#308B0A', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid #f3f4f6', display: 'flex', gap: 8 }}>
            <input type="text" placeholder="Posez votre question..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              style={{ flex: 1, border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '10px 14px', fontSize: 14, background: '#fafafa', outline: 'none', boxSizing: 'border-box' }}
            />
            <button onClick={sendMessage} disabled={chatLoading}
              style={{ width: 44, height: 44, borderRadius: 12, border: 'none', background: chatLoading ? '#d1d5db' : '#308B0A', color: 'white', fontSize: 20, cursor: chatLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              →
            </button>
          </div>
        </div>
      )}

    </div>
  )
}