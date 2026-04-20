'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function SuperviseurProfil() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saveLoading, setSaveLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [userId, setUserId] = useState(null)
  const [form, setForm] = useState({
    full_name: '',
    prenom: '',
    poste: '',
    phone: '',
    newPassword: '',
    confirmPassword: ''
  })

  useEffect(() => { checkSession() }, [])

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
    if (!profile || profile.role !== 'superviseur') { router.push('/login'); return }
    if (profile.profil_complet) { router.push('/superviseur'); return }
    setUserId(session.user.id)
    setForm(f => ({ ...f, full_name: profile.full_name || '', prenom: profile.prenom || '', poste: profile.poste || '', phone: profile.phone || '' }))
    setLoading(false)
  }

  const handleSave = async () => {
    if (!form.full_name || !form.prenom || !form.poste) {
      setMessage({ type: 'error', text: 'Nom, prénom et poste sont obligatoires' }); return
    }
    if (!form.newPassword || form.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Le mot de passe doit faire au moins 6 caractères' }); return
    }
    if (form.newPassword !== form.confirmPassword) {
      setMessage({ type: 'error', text: 'Les mots de passe ne correspondent pas' }); return
    }

    setSaveLoading(true)
    setMessage({ type: '', text: '' })

    // Changer le mot de passe
    const { error: passError } = await supabase.auth.updateUser({ password: form.newPassword })
    if (passError) {
      setMessage({ type: 'error', text: 'Erreur mot de passe : ' + passError.message })
      setSaveLoading(false); return
    }

    // Mettre à jour le profil
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name: form.full_name,
        prenom: form.prenom,
        poste: form.poste,
        phone: form.phone,
        profil_complet: true
      })
      .eq('id', userId)

    if (profileError) {
      setMessage({ type: 'error', text: 'Erreur profil : ' + profileError.message })
      setSaveLoading(false); return
    }

    setMessage({ type: 'success', text: 'Profil complété avec succès ! Redirection...' })
    setTimeout(() => router.push('/superviseur'), 1500)
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
      <div style={{ background: 'linear-gradient(135deg, #308B0A 0%, #1e5c06 100%)', padding: '40px 24px 32px', textAlign: 'center' }}>
        <div style={{ width: 70, height: 70, background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.3)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        </div>
        <h1 style={{ color: 'white', fontSize: 22, fontWeight: 900, margin: '0 0 6px' }}>Bienvenue sur JEF 2026</h1>
        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, margin: 0 }}>Complétez votre profil pour continuer</p>
        <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: '8px 16px', marginTop: 12, display: 'inline-block' }}>
          <span style={{ color: 'white', fontSize: 12, fontWeight: 700 }}>Cette étape est obligatoire</span>
        </div>
      </div>

      <div style={{ padding: '24px 16px 40px' }}>

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

        {/* Informations personnelles */}
        <div style={{ background: 'white', borderRadius: 20, padding: '22px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', marginBottom: 14 }}>
          <p style={{ margin: '0 0 18px', fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: 1 }}>INFORMATIONS PERSONNELLES</p>

          {[
            { label: 'Nom *', key: 'full_name', type: 'text', ph: 'Ex: AGBOSSOU' },
            { label: 'Prénom *', key: 'prenom', type: 'text', ph: 'Ex: Romaric' },
            { label: 'Poste / Fonction *', key: 'poste', type: 'text', ph: 'Ex: Président BUE, Trésorier...' },
            { label: 'Téléphone', key: 'phone', type: 'tel', ph: 'Ex: 97000000' },
          ].map(f => (
            <div key={f.key} style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 6, letterSpacing: 0.8 }}>{f.label.toUpperCase()}</label>
              <input
                type={f.type}
                placeholder={f.ph}
                value={form[f.key]}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '13px 14px', fontSize: 15, background: '#fafafa', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          ))}
        </div>

        {/* Sécurité */}
        <div style={{ background: 'white', borderRadius: 20, padding: '22px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', marginBottom: 20 }}>
          <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: 1 }}>SECURITE</p>
          <p style={{ margin: '0 0 18px', fontSize: 13, color: '#6b7280' }}>Choisissez un mot de passe personnel et sécurisé</p>

          {[
            { label: 'Nouveau mot de passe *', key: 'newPassword', ph: 'Minimum 6 caractères' },
            { label: 'Confirmer le mot de passe *', key: 'confirmPassword', ph: 'Retaper le mot de passe' },
          ].map(f => (
            <div key={f.key} style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 6, letterSpacing: 0.8 }}>{f.label.toUpperCase()}</label>
              <input
                type="password"
                placeholder={f.ph}
                value={form[f.key]}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '13px 14px', fontSize: 15, background: '#fafafa', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          ))}
        </div>

        <button onClick={handleSave} disabled={saveLoading}
          style={{ width: '100%', padding: '17px', borderRadius: 16, border: 'none', background: saveLoading ? '#d1d5db' : 'linear-gradient(135deg, #308B0A, #1e5c06)', color: 'white', fontSize: 17, fontWeight: 800, cursor: saveLoading ? 'not-allowed' : 'pointer', boxShadow: saveLoading ? 'none' : '0 6px 20px rgba(48,139,10,0.35)' }}>
          {saveLoading ? 'Enregistrement...' : 'Compléter mon profil'}
        </button>

        <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 12, marginTop: 16, lineHeight: 1.6 }}>
          Ces informations sont nécessaires pour identifier les membres BUE sur la plateforme JEF 2026.
        </p>
      </div>
    </div>
  )
}