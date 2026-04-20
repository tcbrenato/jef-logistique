'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

export default function GestionnairePage() {
  const router = useRouter()
  const [vendeurs, setVendeurs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newVendeur, setNewVendeur] = useState({ full_name: '', email: '', phone: '', password: '' })
  const [addLoading, setAddLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [gestionnaire, setGestionnaire] = useState(null)

  useEffect(() => { checkGestionnaire() }, [])

  const checkGestionnaire = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
    if (!profile || !['gestionnaire', 'admin'].includes(profile.role)) { router.push('/login'); return }
    setGestionnaire(profile)
    fetchVendeurs()
  }

  const fetchVendeurs = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'vendeur')
      .order('created_at', { ascending: false })
    setVendeurs(data || [])
    setLoading(false)
  }

  const handleAddVendeur = async () => {
    if (!newVendeur.full_name || !newVendeur.email || !newVendeur.password) {
      setMessage({ type: 'error', text: 'Veuillez remplir tous les champs obligatoires' }); return
    }
    setAddLoading(true)
    setMessage({ type: '', text: '' })
    const res = await fetch('/api/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newVendeur, role: 'vendeur' })
    })
    const result = await res.json()
    if (result.error) {
      setMessage({ type: 'error', text: 'Erreur : ' + result.error })
    } else {
      setMessage({ type: 'success', text: `Compte vendeur cree pour ${newVendeur.full_name} !` })
      setNewVendeur({ full_name: '', email: '', phone: '', password: '' })
      fetchVendeurs()
      setTimeout(() => { setShowAdd(false); setMessage({ type: '', text: '' }) }, 2000)
    }
    setAddLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
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
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: 700, letterSpacing: 1.5, margin: 0 }}>ESPACE GESTIONNAIRE</p>
            <h1 style={{ color: 'white', fontSize: 20, fontWeight: 900, margin: '3px 0 0' }}>
              {gestionnaire?.full_name?.split(' ')[0]}
            </h1>
          </div>
          <button onClick={handleLogout} style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 10, padding: '9px 14px', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Quitter
          </button>
        </div>

        {/* Compteur */}
        <div style={{ marginTop: 16, background: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 500 }}>Vendeurs enregistres</span>
          <span style={{ color: 'white', fontSize: 22, fontWeight: 900 }}>{vendeurs.length}</span>
        </div>
      </div>

      <div style={{ padding: '20px 16px 40px' }}>

        {/* Bouton ajouter */}
        <button onClick={() => { setShowAdd(!showAdd); setMessage({ type: '', text: '' }) }}
          style={{ width: '100%', padding: '15px', borderRadius: 14, border: 'none', background: '#308B0A', color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginBottom: 14, boxShadow: '0 4px 14px rgba(48,139,10,0.3)' }}>
          + Ajouter un vendeur
        </button>

        {/* Formulaire */}
        {showAdd && (
          <div style={{ background: 'white', borderRadius: 20, padding: '22px', marginBottom: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
            <h3 style={{ margin: '0 0 18px', fontSize: 16, fontWeight: 800, color: '#111' }}>Nouveau vendeur</h3>

            {message.text && (
              <div style={{ background: message.type === 'success' ? '#f0fdf4' : '#fff5f5', border: `1px solid ${message.type === 'success' ? '#86efac' : '#fecaca'}`, borderRadius: 10, padding: '10px 14px', marginBottom: 14 }}>
                <p style={{ margin: 0, fontSize: 13, color: message.type === 'success' ? '#16a34a' : '#dc2626', fontWeight: 700 }}>{message.text}</p>
              </div>
            )}

            {[
              { label: 'Nom complet *', key: 'full_name', type: 'text', ph: 'Ex: Jean Dupont' },
              { label: 'Email *', key: 'email', type: 'email', ph: 'vendeur@email.com' },
              { label: 'Telephone', key: 'phone', type: 'tel', ph: '97000000' },
              { label: 'Mot de passe *', key: 'password', type: 'password', ph: 'Minimum 6 caracteres' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 6, letterSpacing: 0.8 }}>{f.label.toUpperCase()}</label>
                <input type={f.type} placeholder={f.ph} value={newVendeur[f.key]}
                  onChange={(e) => setNewVendeur({ ...newVendeur, [f.key]: e.target.value })}
                  style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '12px 14px', fontSize: 14, background: '#fafafa', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            ))}

            <button onClick={handleAddVendeur} disabled={addLoading}
              style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: addLoading ? '#d1d5db' : '#308B0A', color: 'white', fontSize: 15, fontWeight: 700, cursor: addLoading ? 'not-allowed' : 'pointer', marginTop: 6 }}>
              {addLoading ? 'Creation en cours...' : 'Creer le compte vendeur'}
            </button>
          </div>
        )}

        {/* Liste vendeurs */}
        <div style={{ background: 'white', borderRadius: 20, padding: '22px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
          <p style={{ margin: '0 0 16px', fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: 1 }}>VENDEURS ENREGISTRES</p>
          {vendeurs.length === 0 ? (
            <p style={{ color: '#9ca3af', fontSize: 14, textAlign: 'center', padding: '20px 0', margin: 0 }}>Aucun vendeur enregistre</p>
          ) : (
            vendeurs.map((v, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: i < vendeurs.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, background: '#f0fdf4', border: '2px solid #bbf7d0', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 16, fontWeight: 800, color: '#308B0A' }}>{v.full_name?.charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#111' }}>{v.full_name}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>{v.phone || 'Pas de telephone'}</p>
                  </div>
                </div>
                <div style={{ background: '#f0fdf4', borderRadius: 8, padding: '4px 10px' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#308B0A' }}>VENDEUR</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}