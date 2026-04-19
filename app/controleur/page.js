'use client'
import { useState, useEffect, useRef } from 'react'
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
  const [scanning, setScanning] = useState(false)
  const scannerRef = useRef(null)
  const scannerInstanceRef = useRef(null)

  useEffect(() => { checkControleur() }, [])

  useEffect(() => {
    if (scanning) {
      startScanner()
    } else {
      stopScanner()
    }
    return () => stopScanner()
  }, [scanning])

  const checkControleur = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
    if (!profile || !['controleur', 'admin'].includes(profile.role)) { router.push('/login'); return }
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

  const startScanner = async () => {
    const { Html5Qrcode } = await import('html5-qrcode')
    try {
      const scanner = new Html5Qrcode('qr-reader')
      scannerInstanceRef.current = scanner
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        async (decodedText) => {
          await stopScanner()
          setScanning(false)
          setSearch(decodedText)
          await handleSearch(decodedText)
        },
        () => {}
      )
    } catch (err) {
      setScanning(false)
      setMessage({ type: 'error', text: 'Impossible d\'acceder a la camera. Verifiez les permissions.' })
    }
  }

  const stopScanner = async () => {
    if (scannerInstanceRef.current) {
      try {
        await scannerInstanceRef.current.stop()
        scannerInstanceRef.current = null
      } catch (e) {}
    }
  }

  const handleSearch = async (query) => {
    const searchQuery = query || search
    if (!searchQuery.trim()) return
    setSearchLoading(true)
    setTicket(null)
    setMessage({ type: '', text: '' })

    const { data, error } = await supabase
      .from('tickets')
      .select('*, profiles(full_name)')
      .or(`serial_number.ilike.%${searchQuery}%,client_name.ilike.%${searchQuery}%`)
      .limit(1)
      .single()

    if (error || !data) {
      setMessage({ type: 'error', text: 'Aucun ticket trouve pour cette recherche.' })
    } else {
      setTicket(data)
    }
    setSearchLoading(false)
  }

  const playSound = (type) => {
    const context = new (window.AudioContext || window.webkitAudioContext)()
    const oscillator = context.createOscillator()
    const gainNode = context.createGain()
    oscillator.connect(gainNode)
    gainNode.connect(context.destination)

    if (type === 'success') {
      oscillator.frequency.setValueAtTime(880, context.currentTime)
      oscillator.frequency.setValueAtTime(1100, context.currentTime + 0.15)
      gainNode.gain.setValueAtTime(0.3, context.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.4)
      oscillator.start(context.currentTime)
      oscillator.stop(context.currentTime + 0.4)
    } else {
      oscillator.type = 'sawtooth'
      oscillator.frequency.setValueAtTime(440, context.currentTime)
      gainNode.gain.setValueAtTime(0.5, context.currentTime)
      oscillator.start(context.currentTime)
      for (let i = 0; i < 6; i++) {
        oscillator.frequency.setValueAtTime(i % 2 === 0 ? 440 : 220, context.currentTime + i * 0.15)
      }
      gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 1)
      oscillator.stop(context.currentTime + 1)
    }
  }

  const handleEmbarquement = async () => {
    if (!ticket) return

    if (ticket.status === 'embarque') {
      playSound('fraud')
      setMessage({ type: 'fraud', text: 'ALERTE FRAUDE — Ce ticket a deja ete utilise !' })
      return
    }
    if (ticket.status === 'disponible') {
      playSound('fraud')
      setMessage({ type: 'error', text: 'Ce ticket n\'a pas encore ete vendu.' })
      return
    }
    setEmbarquementLoading(true)
    const { error } = await supabase
      .from('tickets')
      .update({ status: 'embarque', embarked_at: new Date().toISOString() })
      .eq('id', ticket.id)

    if (!error) {
      playSound('success')
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

        {/* Compteurs */}
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          {[
            { label: 'A BORD', value: stats.embarques },
            { label: 'TOTAL VENDUS', value: stats.vendus },
            { label: 'RESTANTS', value: stats.vendus - stats.embarques },
          ].map((s, i) => (
            <div key={i} style={{ flex: 1, background: 'rgba(255,255,255,0.12)', borderRadius: 14, padding: '14px', textAlign: 'center' }}>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: 700, margin: '0 0 4px', letterSpacing: 1 }}>{s.label}</p>
              <p style={{ color: 'white', fontSize: 28, fontWeight: 900, margin: 0 }}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '20px 16px 40px' }}>

        {/* Scanner QR */}
        {scanning && (
          <div style={{ background: 'white', borderRadius: 20, padding: '20px', marginBottom: 14, boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#111' }}>Pointez vers le QR Code</p>
              <button onClick={() => setScanning(false)}
                style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 8, padding: '6px 12px', color: '#dc2626', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Annuler
              </button>
            </div>
            <div id="qr-reader" ref={scannerRef} style={{ width: '100%', borderRadius: 14, overflow: 'hidden' }}></div>
          </div>
        )}

        {/* Barre de recherche */}
        <div style={{ background: 'white', borderRadius: 20, padding: '20px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', marginBottom: 14 }}>
          <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: 1 }}>RECHERCHE</p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <input
              type="text"
              placeholder="Ex: JEF-001 ou Marc Dossou"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              style={{ flex: 1, border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '13px 14px', fontSize: 14, background: '#fafafa', outline: 'none', boxSizing: 'border-box' }}
            />
            <button onClick={() => handleSearch()}
              disabled={searchLoading}
              style={{ padding: '13px 16px', borderRadius: 12, border: 'none', background: '#308B0A', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              {searchLoading ? '...' : 'OK'}
            </button>
          </div>

          {/* Bouton scanner */}
          <button onClick={() => { setScanning(true); setTicket(null); setMessage({ type: '', text: '' }) }}
            style={{ width: '100%', padding: '13px', borderRadius: 12, border: '2px solid #308B0A', background: 'white', color: '#308B0A', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#308B0A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="5" height="5"/><rect x="16" y="3" width="5" height="5"/><rect x="3" y="16" width="5" height="5"/>
              <path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/>
            </svg>
            Scanner un QR Code
          </button>
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
              <p style={{ margin: 0, fontSize: 28, fontWeight: 900, color: '#111', letterSpacing: 1 }}>{ticket.serial_number}</p>
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
          </div>
        )}

        {!ticket && !message.text && !scanning && (
          <div style={{ background: 'white', borderRadius: 20, padding: '48px 20px', textAlign: 'center', boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
            <p style={{ color: '#9ca3af', fontSize: 15, margin: 0, fontWeight: 500 }}>Recherchez ou scannez un ticket</p>
            <p style={{ color: '#d1d5db', fontSize: 13, margin: '6px 0 0' }}>Par numero, nom ou QR Code</p>
          </div>
        )}
      </div>
    </div>
  )
}