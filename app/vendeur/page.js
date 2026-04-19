'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

export default function VendeurPage() {
  const router = useRouter()
  const [vendeur, setVendeur] = useState(null)
  const [form, setForm] = useState({ serial_number: '', secret_key: '', client_name: '', client_phone: '' })
  const [mesVentes, setMesVentes] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('vendre')
  const [message, setMessage] = useState({ type: '', text: '' })

  useEffect(() => { checkVendeur() }, [])

  const checkVendeur = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
    if (!profile || !['vendeur', 'admin'].includes(profile.role)) { router.push('/login'); return }
    setVendeur(profile)
    fetchMesVentes(session.user.id)
  }

  const fetchMesVentes = async (uid) => {
    setLoading(true)
    const { data } = await supabase
      .from('tickets')
      .select('*')
      .eq('vendeur_id', uid)
      .order('sold_at', { ascending: false })
    setMesVentes(data || [])
    setLoading(false)
  }

  const handleVendre = async () => {
    if (!form.serial_number || !form.secret_key || !form.client_name || !form.client_phone) {
      setMessage({ type: 'error', text: 'Veuillez remplir tous les champs' }); return
    }
    setSubmitLoading(true)
    setMessage({ type: '', text: '' })

    const { data: ticket, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('serial_number', form.serial_number.toUpperCase())
      .single()

    if (error || !ticket) {
      setMessage({ type: 'error', text: 'Numero de ticket introuvable. Verifiez le numero.' })
      setSubmitLoading(false); return
    }
    if (ticket.secret_key !== form.secret_key.toUpperCase()) {
      setMessage({ type: 'error', text: 'Code secret incorrect.' })
      setSubmitLoading(false); return
    }
    if (ticket.status !== 'disponible') {
      setMessage({ type: 'error', text: 'Ce ticket a deja ete vendu !' })
      setSubmitLoading(false); return
    }

    const { data: { session } } = await supabase.auth.getSession()
    const { error: updateError } = await supabase
      .from('tickets')
      .update({
        status: 'vendu',
        client_name: form.client_name,
        client_phone: form.client_phone,
        vendeur_id: session.user.id,
        sold_at: new Date().toISOString()
      })
      .eq('id', ticket.id)

    if (updateError) {
      setMessage({ type: 'error', text: 'Erreur lors de la vente. Reessayez.' })
    } else {
      setMessage({ type: 'success', text: `Ticket ${ticket.serial_number} vendu avec succes a ${form.client_name} !` })
      setForm({ serial_number: '', secret_key: '', client_name: '', client_phone: '' })
      fetchMesVentes(session.user.id)
    }
    setSubmitLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const montantTotal = mesVentes.length * 6000

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
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: 700, letterSpacing: 1.5, margin: 0 }}>ESPACE VENDEUR</p>
            <h1 style={{ color: 'white', fontSize: 20, fontWeight: 900, margin: '3px 0 0', letterSpacing: '-0.5px' }}>
              {vendeur?.full_name?.split(' ')[0]}
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ textAlign: 'right' }}>
              <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10, fontWeight: 700, margin: 0, letterSpacing: 1 }}>MES VENTES</p>
              <p style={{ color: 'white', fontSize: 22, fontWeight: 900, margin: 0 }}>{mesVentes.length}</p>
            </div>
            <button onClick={handleLogout} style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 10, padding: '9px 14px', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Quitter
            </button>
          </div>
        </div>

        {/* TABS */}
        <div style={{ display: 'flex', gap: 2 }}>
          {[['vendre', 'Vendre'], ['historique', 'Historique'], ['caisse', 'Ma caisse']].map(([key, label]) => (
            <button key={key} onClick={() => setActiveTab(key)} style={{
              flex: 1, padding: '11px 0', border: 'none', background: 'transparent',
              color: activeTab === key ? 'white' : 'rgba(255,255,255,0.5)',
              fontWeight: activeTab === key ? 800 : 500,
              fontSize: 13, cursor: 'pointer',
              borderBottom: activeTab === key ? '3px solid white' : '3px solid transparent',
              transition: 'all 0.2s'
            }}>{label}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: '20px 16px 40px' }}>

        {/* ===== VENDRE ===== */}
        {activeTab === 'vendre' && (
          <div>
            {message.text && (
              <div style={{
                background: message.type === 'success' ? '#f0fdf4' : '#fff5f5',
                border: `1px solid ${message.type === 'success' ? '#86efac' : '#fecaca'}`,
                borderLeft: `4px solid ${message.type === 'success' ? '#308B0A' : '#ef4444'}`,
                borderRadius: 14, padding: '14px 16px', marginBottom: 16
              }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: message.type === 'success' ? '#16a34a' : '#dc2626' }}>
                  {message.text}
                </p>
              </div>
            )}

            <div style={{ background: 'white', borderRadius: 20, padding: '22px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', marginBottom: 14 }}>
              <p style={{ margin: '0 0 18px', fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: 1 }}>INFORMATIONS DU TICKET</p>

              {[
                { label: 'Numero de ticket *', key: 'serial_number', type: 'text', ph: 'Ex: JEF-001', upper: true },
                { label: 'Code secret *', key: 'secret_key', type: 'text', ph: 'Ex: X8R2', upper: true },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 6, letterSpacing: 0.8 }}>{f.label.toUpperCase()}</label>
                  <input
                    type={f.type}
                    placeholder={f.ph}
                    value={form[f.key]}
                    onChange={(e) => setForm({ ...form, [f.key]: f.upper ? e.target.value.toUpperCase() : e.target.value })}
                    style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '13px 14px', fontSize: 15, background: '#fafafa', outline: 'none', boxSizing: 'border-box', fontWeight: 600, letterSpacing: f.upper ? 1 : 0 }}
                  />
                </div>
              ))}
            </div>

            <div style={{ background: 'white', borderRadius: 20, padding: '22px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', marginBottom: 20 }}>
              <p style={{ margin: '0 0 18px', fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: 1 }}>INFORMATIONS DU CLIENT</p>

              {[
                { label: 'Nom complet *', key: 'client_name', type: 'text', ph: 'Ex: Marc Dossou' },
                { label: 'Telephone *', key: 'client_phone', type: 'tel', ph: 'Ex: 97000000' },
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

            <button
              onClick={handleVendre}
              disabled={submitLoading}
              style={{ width: '100%', padding: '17px', borderRadius: 16, border: 'none', background: submitLoading ? '#d1d5db' : 'linear-gradient(135deg, #308B0A, #1e5c06)', color: 'white', fontSize: 17, fontWeight: 800, cursor: submitLoading ? 'not-allowed' : 'pointer', boxShadow: submitLoading ? 'none' : '0 6px 20px rgba(48,139,10,0.35)', letterSpacing: 0.3 }}>
              {submitLoading ? 'Enregistrement...' : 'Valider la vente'}
            </button>
          </div>
        )}

        {/* ===== HISTORIQUE ===== */}
        {activeTab === 'historique' && (
          <div>
            {mesVentes.length === 0 ? (
              <div style={{ background: 'white', borderRadius: 20, padding: '48px 20px', textAlign: 'center', boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
                <p style={{ color: '#9ca3af', fontSize: 15, margin: 0, fontWeight: 500 }}>Aucune vente pour le moment</p>
                <p style={{ color: '#d1d5db', fontSize: 13, margin: '6px 0 0' }}>Vos ventes apparaitront ici</p>
              </div>
            ) : (
              mesVentes.map((v, i) => (
                <div key={i} style={{ background: 'white', borderRadius: 16, padding: '16px 18px', marginBottom: 10, boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: '#111' }}>{v.client_name}</p>
                      <p style={{ margin: '3px 0 0', fontSize: 12, color: '#6b7280' }}>{v.client_phone}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ background: '#f0fdf4', borderRadius: 8, padding: '4px 10px' }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: '#308B0A' }}>{v.serial_number}</span>
                      </div>
                      <p style={{ margin: '4px 0 0', fontSize: 11, color: '#9ca3af' }}>
                        {v.sold_at ? new Date(v.sold_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ===== MA CAISSE ===== */}
        {activeTab === 'caisse' && (
          <div>
            <div style={{ background: 'linear-gradient(135deg, #308B0A, #1e5c06)', borderRadius: 20, padding: '28px 24px', marginBottom: 14, textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.65)', letterSpacing: 1.5 }}>MONTANT A REMETTRE</p>
              <p style={{ margin: '10px 0 4px', fontSize: 40, fontWeight: 900, color: 'white', letterSpacing: '-1px' }}>
                {montantTotal.toLocaleString()}
              </p>
              <p style={{ margin: 0, fontSize: 16, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>FCFA</p>
            </div>

            <div style={{ background: 'white', borderRadius: 20, padding: '22px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 14, borderBottom: '1px solid #f3f4f6', marginBottom: 14 }}>
                <span style={{ fontSize: 14, color: '#6b7280', fontWeight: 500 }}>Tickets vendus</span>
                <span style={{ fontSize: 18, fontWeight: 900, color: '#111' }}>{mesVentes.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 14, borderBottom: '1px solid #f3f4f6', marginBottom: 14 }}>
                <span style={{ fontSize: 14, color: '#6b7280', fontWeight: 500 }}>Prix unitaire</span>
                <span style={{ fontSize: 18, fontWeight: 900, color: '#111' }}>6 000 FCFA</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14, color: '#111', fontWeight: 700 }}>Total a remettre</span>
                <span style={{ fontSize: 20, fontWeight: 900, color: '#308B0A' }}>{montantTotal.toLocaleString()} FCFA</span>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}