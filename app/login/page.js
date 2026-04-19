'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Veuillez remplir tous les champs')
      return
    }
    setLoading(true)
    setError('')

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError('Email ou mot de passe incorrect')
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    if (profile?.role === 'admin') router.push('/admin')
    else if (profile?.role === 'vendeur') router.push('/vendeur')
    else if (profile?.role === 'controleur') router.push('/controleur')
    else if (profile?.role === 'superviseur') router.push('/superviseur')
    else {
  console.log('Profil récupéré:', profile)
  setError("Accès non autorisé. Contactez l'administrateur.")
}

    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: '#0F172A', // Fond sombre élégant pour faire ressortir le container
      maxWidth: 430,
      margin: '0 auto',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      position: 'relative',
      overflow: 'hidden'
    }}>
      
      {/* Effet de lumière en arrière-plan */}
      <div style={{
        position: 'absolute',
        top: -100,
        right: -100,
        width: 300,
        height: 300,
        background: 'radial-gradient(circle, rgba(48,139,10,0.15) 0%, transparent 70%)',
        zIndex: 0
      }} />

      {/* Header avec dégradé premium */}
      <div style={{
        background: 'linear-gradient(180deg, #1e5c06 0%, #308B0A 100%)',
        padding: '60px 32px 60px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Logo Iconisé */}
        <div style={{
          width: 80,
          height: 80,
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 24,
          border: '1px solid rgba(255,255,255,0.2)',
          boxShadow: '0 12px 24px rgba(0,0,0,0.2)'
        }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </div>
        
        <h1 style={{
          color: 'white',
          fontSize: 32,
          fontWeight: 900,
          margin: '0 0 8px',
          letterSpacing: '-1px',
          textShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }}>JEF 2026</h1>
        
        <div style={{
          background: 'rgba(0,0,0,0.2)',
          padding: '6px 16px',
          borderRadius: '100px',
          fontSize: 12,
          color: '#A7F3D0',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '1px'
        }}>
          Administration & Logistique
        </div>
      </div>

      {/* Body du formulaire */}
      <div style={{
        background: 'white',
        borderRadius: '32px 32px 0 0',
        marginTop: -30,
        padding: '40px 32px 40px',
        flex: 1,
        position: 'relative',
        zIndex: 2,
        boxShadow: '0 -10px 40px rgba(0,0,0,0.1)'
      }}>
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#1E293B', margin: '0 0 8px' }}>Bienvenue</h2>
          <p style={{ color: '#64748B', fontSize: 14, fontWeight: 500 }}>Identifiez-vous pour gérer les tickets</p>
        </div>

        {error && (
          <div style={{
            background: '#FEF2F2',
            border: '1px solid #FEE2E2',
            borderRadius: '16px',
            padding: '14px 18px',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 10
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#EF4444' }} />
            <p style={{ color: '#991B1B', fontSize: 13, margin: 0, fontWeight: 600 }}>{error}</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Input Email */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 8, display: 'block', marginLeft: 4 }}>Email Professionnel</label>
            <input
              type="email"
              placeholder="nom@jef2026.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                background: '#F8FAFC',
                border: '2px solid #F1F5F9',
                borderRadius: '16px',
                padding: '16px',
                fontSize: 15,
                outline: 'none',
                boxSizing: 'border-box',
                color: '#1E293B',
                transition: 'all 0.2s ease'
              }}
              onFocus={(e) => { e.target.style.borderColor = '#308B0A'; e.target.style.background = '#fff'; }}
              onBlur={(e) => { e.target.style.borderColor = '#F1F5F9'; e.target.style.background = '#F8FAFC'; }}
            />
          </div>

          {/* Input Password */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 8, display: 'block', marginLeft: 4 }}>Mot de passe</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              style={{
                width: '100%',
                background: '#F8FAFC',
                border: '2px solid #F1F5F9',
                borderRadius: '16px',
                padding: '16px',
                fontSize: 15,
                outline: 'none',
                boxSizing: 'border-box',
                color: '#1E293B',
                transition: 'all 0.2s ease'
              }}
              onFocus={(e) => { e.target.style.borderColor = '#308B0A'; e.target.style.background = '#fff'; }}
              onBlur={(e) => { e.target.style.borderColor = '#F1F5F9'; e.target.style.background = '#F8FAFC'; }}
            />
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              width: '100%',
              padding: '18px',
              borderRadius: '16px',
              border: 'none',
              background: loading ? '#94A3B8' : '#308B0A',
              color: 'white',
              fontSize: 16,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 10px 25px rgba(48,139,10,0.3)',
              marginTop: 10,
              transition: 'transform 0.1s active'
            }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                 Chargement...
              </span>
            ) : 'Se connecter au Dashboard'}
          </button>
        </div>

        <div style={{
          marginTop: 40,
          paddingTop: 30,
          borderTop: '1px solid #F1F5F9',
          textAlign: 'center'
        }}>
          <p style={{ color: '#94A3B8', fontSize: 13, marginBottom: 16 }}>Accès public</p>
          <button
            onClick={() => router.push('/verify')}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '14px',
              border: '2px solid #F1F5F9',
              background: 'transparent',
              color: '#475569',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Vérifier la validité d'un ticket
          </button>
        </div>

        <footer style={{ marginTop: 40, textAlign: 'center' }}>
          <p style={{ color: '#CBD5E1', fontSize: 10, textTransform: 'uppercase', letterSpacing: '1px' }}>
            Powered by BUE FLLAC · 2026
          </p>
        </footer>
      </div>
    </div>
  )
}