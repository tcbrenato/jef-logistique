'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function ProfilVendeur() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState({ ventes: 0, montant: 0, classement: 0 })
  const [loading, setLoading] = useState(true)
  const [editNom, setEditNom] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saveLoading, setSaveLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  useEffect(() => { checkVendeur() }, [])

  const checkVendeur = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
    if (!prof || !['vendeur', 'admin'].includes(prof.role)) { router.push('/login'); return }
    setProfile(prof)
    setEditNom(prof.full_name || '')
    setEditPhone(prof.phone || '')
    fetchStats(session.user.id)
  }

  const fetchStats = async (uid) => {
    setLoading(true)
    const { data: mesTickets } = await supabase
      .from('tickets')
      .select('*')
      .eq('vendeur_id', uid)
      .in('status', ['vendu', 'embarque'])

    const { data: allVendeurs } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'vendeur')

    if (mesTickets) {
      const ventes = mesTickets.length
      const montant = ventes * 6000

      // Calculer classement
      let classement = 1
      if (allVendeurs) {
        for (const v of allVendeurs) {
          if (v.id === uid) continue
          const { data: vTickets } = await supabase
            .from('tickets')
            .select('id')
            .eq('vendeur_id', v.id)
            .in('status', ['vendu', 'embarque'])
          if (vTickets && vTickets.length > ventes) classement++
        }
      }
      setStats({ ventes, montant, classement })
    }
    setLoading(false)
  }

  const handleSaveProfil = async () => {
    if (!editNom.trim()) {
      setMessage({ type: 'error', text: 'Le nom ne peut pas etre vide' }); return
    }
    setSaveLoading(true)
    setMessage({ type: '', text: '' })
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: editNom, phone: editPhone })
      .eq('id', profile.id)
    if (!error) {
      setMessage({ type: 'success', text: 'Profil mis a jour avec succes !' })
      setProfile({ ...profile, full_name: editNom, phone: editPhone })
    } else {
      setMessage({ type: 'error', text: 'Erreur : ' + error.message })
    }
    setSaveLoading(false)
  }

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Le mot de passe doit faire au moins 6 caracteres' }); return
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Les mots de passe ne correspondent pas' }); return
    }
    setSaveLoading(true)
    setMessage({ type: '', text: '' })
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (!error) {
      setMessage({ type: 'success', text: 'Mot de passe change avec succes !' })
      setNewPassword('')
      setConfirmPassword('')
    } else {
      setMessage({ type: 'error', text: 'Erreur : ' + error.message })
    }
    setSaveLoading(false)
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
      <div style={{ background: 'linear-gradient(135deg, #308B0A 0%, #1e5c06 100%)', padding: '24px 20px 28px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: 700, letterSpacing: 1.5, margin: 0 }}>MON PROFIL</p>
            <h1 style={{ color: 'white', fontSize: 20, fontWeight: 900, margin: '3px 0 0' }}>JEF 2026</h1>
          </div>
          <button onClick={() => router.push('/vendeur')} style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 10, padding: '9px 14px', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Retour
          </button>
        </div>

        {/* Avatar et nom */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 64, height: 64, background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.4)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 28, fontWeight: 900, color: 'white' }}>{profile?.full_name?.charAt(0).toUpperCase()}</span>
          </div>
          <div>
            <p style={{ color: 'white', fontSize: 18, fontWeight: 800, margin: 0 }}>{profile?.full_name}</p>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, margin: '4px 0 0' }}>Vendeur · JEF 2026</p>
          </div>
        </div>
      </div>

      <div style={{ padding: '20px 16px 40px' }}>

        {/* Stats personnelles */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'VENTES', value: stats.ventes, color: '#308B0A', bg: '#f0fdf4', border: '#bbf7d0' },
            { label: 'MONTANT', value: `${(stats.montant / 1000).toFixed(0)}K`, color: '#6d28d9', bg: '#f5f3ff', border: '#ddd6fe' },
            { label: 'CLASSEMENT', value: `#${stats.classement}`, color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
          ].map((card, i) => (
            <div key={i} style={{ background: card.bg, borderRadius: 14, padding: '14px 10px', textAlign: 'center', border: `1px solid ${card.border}` }}>
              <p style={{ color: '#6b7280', fontSize: 9, fontWeight: 700, margin: '0 0 6px', letterSpacing: 0.8 }}>{card.label}</p>
              <p style={{ color: card.color, fontSize: 20, fontWeight: 900, margin: 0 }}>{card.value}</p>
            </div>
          ))}
        </div>

        {/* Barre de progression */}
        <div style={{ background: 'white', borderRadius: 20, padding: '20px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#111' }}>Ma progression</p>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#308B0A' }}>{stats.ventes} / 50 tickets</p>
          </div>
          <div style={{ background: '#f0f2f5', borderRadius: 99, height: 8, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.min((stats.ventes / 50) * 100, 100)}%`, background: 'linear-gradient(90deg, #308B0A, #5fb832)', borderRadius: 99, transition: 'width 0.6s ease' }}></div>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 11, color: '#9ca3af' }}>
            {stats.ventes >= 50 ? 'Objectif atteint !' : `${50 - stats.ventes} tickets restants pour atteindre l'objectif`}
          </p>
        </div>

        {/* Message */}
        {message.text && (
          <div style={{
            background: message.type === 'success' ? '#f0fdf4' : '#fff5f5',
            border: `1px solid ${message.type === 'success' ? '#86efac' : '#fecaca'}`,
            borderLeft: `4px solid ${message.type === 'success' ? '#308B0A' : '#ef4444'}`,
            borderRadius: 14, padding: '14px 16px', marginBottom: 16
          }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: message.type === 'success' ? '#16a34a' : '#dc2626' }}>{message.text}</p>
          </div>
        )}

        {/* Modifier profil */}
        <div style={{ background: 'white', borderRadius: 20, padding: '22px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', marginBottom: 16 }}>
          <p style={{ margin: '0 0 18px', fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: 1 }}>MODIFIER MON PROFIL</p>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 6, letterSpacing: 0.8 }}>NOM COMPLET</label>
            <input type="text" value={editNom}
              onChange={(e) => setEditNom(e.target.value)}
              style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '13px 14px', fontSize: 15, background: '#fafafa', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 6, letterSpacing: 0.8 }}>TELEPHONE</label>
            <input type="tel" value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              placeholder="Ex: 97000000"
              style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '13px 14px', fontSize: 15, background: '#fafafa', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <button onClick={handleSaveProfil} disabled={saveLoading}
            style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none', background: saveLoading ? '#d1d5db' : '#308B0A', color: 'white', fontSize: 15, fontWeight: 700, cursor: saveLoading ? 'not-allowed' : 'pointer', boxShadow: '0 4px 14px rgba(48,139,10,0.3)' }}>
            {saveLoading ? 'Sauvegarde...' : 'Sauvegarder le profil'}
          </button>
        </div>

        {/* Changer mot de passe */}
        <div style={{ background: 'white', borderRadius: 20, padding: '22px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
          <p style={{ margin: '0 0 18px', fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: 1 }}>CHANGER MON MOT DE PASSE</p>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 6, letterSpacing: 0.8 }}>NOUVEAU MOT DE PASSE</label>
            <input type="password" value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 6 caracteres"
              style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '13px 14px', fontSize: 15, background: '#fafafa', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 6, letterSpacing: 0.8 }}>CONFIRMER LE MOT DE PASSE</label>
            <input type="password" value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Retaper le mot de passe"
              style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '13px 14px', fontSize: 15, background: '#fafafa', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <button onClick={handleChangePassword} disabled={saveLoading}
            style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none', background: saveLoading ? '#d1d5db' : '#1d4ed8', color: 'white', fontSize: 15, fontWeight: 700, cursor: saveLoading ? 'not-allowed' : 'pointer', boxShadow: '0 4px 14px rgba(29,78,216,0.3)' }}>
            {saveLoading ? 'Changement...' : 'Changer le mot de passe'}
          </button>
        </div>

      </div>
    </div>
  )
}