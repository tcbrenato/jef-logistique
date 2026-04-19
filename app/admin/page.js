'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

export default function AdminDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState({ total: 500, vendus: 0, embarques: 0, disponibles: 0 })
  const [vendeurs, setVendeurs] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [showAddVendeur, setShowAddVendeur] = useState(false)
  const [newVendeur, setNewVendeur] = useState({ full_name: '', email: '', phone: '', password: '' })
  const [addLoading, setAddLoading] = useState(false)
  const [addMsg, setAddMsg] = useState('')

  useEffect(() => { checkAdmin() }, [])

  const checkAdmin = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
    if (profile?.role !== 'admin') { router.push('/login'); return }
    fetchData()
  }

  const fetchData = async () => {
    setLoading(true)
    const { data: tickets } = await supabase.from('tickets').select('*')
    const { data: profiles } = await supabase.from('profiles').select('*').neq('role', 'admin')
    if (tickets) {
      setStats({
        total: 500,
        vendus: tickets.filter(t => t.status === 'vendu' || t.status === 'embarque').length,
        embarques: tickets.filter(t => t.status === 'embarque').length,
        disponibles: tickets.filter(t => t.status === 'disponible').length,
      })
      if (profiles) {
        setVendeurs(profiles.map(p => ({
          ...p,
          ventes: tickets.filter(t => t.vendeur_id === p.id).length,
          montant: tickets.filter(t => t.vendeur_id === p.id).length * 6000
        })))
      }
    }
    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const generateTickets = async () => {
    const { data: existing } = await supabase.from('tickets').select('serial_number')
    if (existing && existing.length > 0) { alert('Les tickets existent déjà !'); return }
    const tickets = []
    for (let i = 1; i <= 500; i++) {
      tickets.push({
        serial_number: `JEF-${String(i).padStart(3, '0')}`,
        secret_key: Math.random().toString(36).substring(2, 6).toUpperCase(),
        status: 'disponible'
      })
    }
    const { error } = await supabase.from('tickets').insert(tickets)
    if (!error) { alert('500 tickets générés avec succès !'); fetchData() }
    else alert('Erreur : ' + error.message)
  }

  const handleAddVendeur = async () => {
    if (!newVendeur.full_name || !newVendeur.email || !newVendeur.password) {
      setAddMsg('Veuillez remplir tous les champs obligatoires'); return
    }
    setAddLoading(true); setAddMsg('')
    const res = await fetch('/api/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newVendeur, role: 'vendeur' })
    })
    const result = await res.json()
    if (result.error) { setAddMsg('Erreur : ' + result.error) }
    else {
      setAddMsg('Vendeur créé avec succès !')
      setNewVendeur({ full_name: '', email: '', phone: '', password: '' })
      fetchData()
      setTimeout(() => { setShowAddVendeur(false); setAddMsg('') }, 1500)
    }
    setAddLoading(false)
  }

  const pct = Math.round((stats.vendus / stats.total) * 100)

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
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: 700, letterSpacing: 1.5, margin: 0 }}>ADMIN CONSOLE</p>
            <h1 style={{ color: 'white', fontSize: 22, fontWeight: 900, margin: '3px 0 0', letterSpacing: '-0.5px' }}>JEF 2026</h1>
          </div>
          <button onClick={handleLogout} style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 10, padding: '9px 16px', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', letterSpacing: 0.3 }}>
            Quitter
          </button>
        </div>

        {/* TABS */}
        <div style={{ display: 'flex', gap: 2 }}>
          {[['dashboard', 'Apercu'], ['vendeurs', 'Vendeurs'], ['tickets', 'Tickets']].map(([key, label]) => (
            <button key={key} onClick={() => setActiveTab(key)} style={{
              flex: 1, padding: '11px 0', border: 'none', background: 'transparent',
              color: activeTab === key ? 'white' : 'rgba(255,255,255,0.5)',
              fontWeight: activeTab === key ? 800 : 500,
              fontSize: 14, cursor: 'pointer',
              borderBottom: activeTab === key ? '3px solid white' : '3px solid transparent',
              transition: 'all 0.2s'
            }}>{label}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: '20px 16px 40px' }}>

        {/* ===== APERCU ===== */}
        {activeTab === 'dashboard' && (
          <div>
            {/* Jauge */}
            <div style={{ background: 'white', borderRadius: 20, padding: '24px', marginBottom: 14, boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <p style={{ color: '#9ca3af', fontSize: 11, fontWeight: 700, letterSpacing: 1, margin: '0 0 6px' }}>REMPLISSAGE GLOBAL</p>
                  <p style={{ color: '#111', fontSize: 36, fontWeight: 900, margin: 0, letterSpacing: '-1px' }}>
                    {stats.vendus}
                    <span style={{ fontSize: 16, color: '#9ca3af', fontWeight: 500 }}> / 500</span>
                  </p>
                </div>
                <div style={{ background: pct >= 80 ? '#dcfce7' : pct >= 50 ? '#fef9c3' : '#f0f2f5', borderRadius: 14, padding: '10px 16px', textAlign: 'center' }}>
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

            {/* 4 cartes stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              {[
                { label: 'Tickets vendus', value: stats.vendus, color: '#308B0A', bg: '#f0fdf4', border: '#bbf7d0' },
                { label: 'A bord', value: stats.embarques, color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
                { label: 'Disponibles', value: stats.disponibles, color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
                { label: 'Vendeurs actifs', value: vendeurs.length, color: '#6d28d9', bg: '#f5f3ff', border: '#ddd6fe' },
              ].map((card, i) => (
                <div key={i} style={{ background: card.bg, borderRadius: 16, padding: '18px 16px', border: `1px solid ${card.border}` }}>
                  <p style={{ color: '#6b7280', fontSize: 10, fontWeight: 700, margin: '0 0 8px', letterSpacing: 0.8 }}>{card.label.toUpperCase()}</p>
                  <p style={{ color: card.color, fontSize: 28, fontWeight: 900, margin: 0, letterSpacing: '-0.5px' }}>{card.value}</p>
                </div>
              ))}
            </div>

            {/* Caisse */}
            <div style={{ background: 'linear-gradient(135deg, #308B0A, #1e5c06)', borderRadius: 20, padding: '22px 24px' }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.65)', letterSpacing: 1.5 }}>CAISSE TOTALE PREVISION</p>
              <p style={{ margin: '8px 0 4px', fontSize: 32, fontWeight: 900, color: 'white', letterSpacing: '-1px' }}>
                {(stats.vendus * 6000).toLocaleString()} <span style={{ fontSize: 16, fontWeight: 500 }}>FCFA</span>
              </p>
              <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{stats.vendus} tickets x 6 000 F</p>
            </div>
          </div>
        )}

        {/* ===== VENDEURS ===== */}
        {activeTab === 'vendeurs' && (
          <div>
            <button onClick={() => setShowAddVendeur(!showAddVendeur)} style={{ width: '100%', padding: '15px', borderRadius: 14, border: 'none', background: '#308B0A', color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginBottom: 14, letterSpacing: 0.3, boxShadow: '0 4px 14px rgba(48,139,10,0.3)' }}>
              + Ajouter un vendeur
            </button>

            {showAddVendeur && (
              <div style={{ background: 'white', borderRadius: 20, padding: '22px', marginBottom: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
                <h3 style={{ margin: '0 0 18px', fontSize: 16, fontWeight: 800, color: '#111' }}>Nouveau vendeur</h3>
                {addMsg && (
                  <div style={{ background: addMsg.includes('succès') ? '#f0fdf4' : '#fff5f5', border: `1px solid ${addMsg.includes('succès') ? '#86efac' : '#fecaca'}`, borderRadius: 10, padding: '10px 14px', marginBottom: 14 }}>
                    <p style={{ margin: 0, fontSize: 13, color: addMsg.includes('succès') ? '#16a34a' : '#dc2626', fontWeight: 700 }}>{addMsg}</p>
                  </div>
                )}
                {[
                  { label: 'Nom complet *', key: 'full_name', type: 'text', ph: 'Jean Dupont' },
                  { label: 'Email *', key: 'email', type: 'email', ph: 'vendeur@email.com' },
                  { label: 'Telephone', key: 'phone', type: 'tel', ph: '97000000' },
                  { label: 'Mot de passe *', key: 'password', type: 'password', ph: 'Minimum 6 caracteres' },
                ].map(f => (
                  <div key={f.key} style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 6, letterSpacing: 0.8 }}>{f.label.toUpperCase()}</label>
                    <input type={f.type} placeholder={f.ph} value={newVendeur[f.key]}
                      onChange={(e) => setNewVendeur({ ...newVendeur, [f.key]: e.target.value })}
                      style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '12px 14px', fontSize: 14, background: '#fafafa', outline: 'none', boxSizing: 'border-box', color: '#111' }}
                    />
                  </div>
                ))}
                <button onClick={handleAddVendeur} disabled={addLoading}
                  style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: addLoading ? '#d1d5db' : '#308B0A', color: 'white', fontSize: 15, fontWeight: 700, cursor: addLoading ? 'not-allowed' : 'pointer', marginTop: 6 }}>
                  {addLoading ? 'Creation en cours...' : 'Creer le compte vendeur'}
                </button>
              </div>
            )}

            {vendeurs.length === 0 ? (
              <div style={{ background: 'white', borderRadius: 20, padding: '48px 20px', textAlign: 'center', boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
                <p style={{ color: '#9ca3af', fontSize: 15, margin: 0, fontWeight: 500 }}>Aucun vendeur pour le moment</p>
                <p style={{ color: '#d1d5db', fontSize: 13, margin: '6px 0 0' }}>Ajoutez votre premier vendeur ci-dessus</p>
              </div>
            ) : (
              vendeurs.map((v, i) => (
                <div key={i} style={{ background: 'white', borderRadius: 16, padding: '18px', marginBottom: 10, boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 42, height: 42, background: '#f0fdf4', border: '2px solid #bbf7d0', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 16, fontWeight: 800, color: '#308B0A' }}>{v.full_name?.charAt(0).toUpperCase()}</span>
                      </div>
                      <div>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#111' }}>{v.full_name}</p>
                        <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>{v.role} · {v.phone || 'Pas de telephone'}</p>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ margin: 0, fontWeight: 900, fontSize: 20, color: '#308B0A' }}>{v.ventes}</p>
                      <p style={{ margin: 0, fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>tickets</p>
                    </div>
                  </div>
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>Montant attendu</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#111' }}>{v.montant.toLocaleString()} FCFA</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ===== TICKETS ===== */}
        {activeTab === 'tickets' && (
          <div>
            <div style={{ background: 'white', borderRadius: 20, padding: '24px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', marginBottom: 14 }}>
              <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: 1 }}>GENERATION DES TICKETS</p>
              <h3 style={{ margin: '0 0 10px', fontSize: 18, fontWeight: 800, color: '#111' }}>500 tickets numerotes</h3>
              <p style={{ margin: '0 0 20px', fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>
                Genere les tickets JEF-001 a JEF-500 avec leurs codes secrets uniques. Cette action est irreversible.
              </p>
              <button onClick={generateTickets} style={{ width: '100%', padding: '15px', borderRadius: 14, border: 'none', background: '#308B0A', color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(48,139,10,0.3)', letterSpacing: 0.3 }}>
                Generer les 500 tickets
              </button>
            </div>
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 16, padding: '16px 18px' }}>
              <p style={{ margin: 0, fontSize: 13, color: '#92400e', fontWeight: 600, lineHeight: 1.5 }}>
                Apres generation, les tickets seront disponibles pour vente par les vendeurs. Chaque ticket aura un numero serie unique et un code secret pour eviter la fraude.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}