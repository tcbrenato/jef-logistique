'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { usePresence } from '../lib/usePresence'

export default function VendeurPage() {
  const router = useRouter()
  usePresence('Espace vendeur')
  const [vendeur, setVendeur] = useState(null)
  const [mode, setMode] = useState('individuel') // 'individuel' ou 'groupe'
  const [form, setForm] = useState({ serial_number: '', secret_key: '', client_name: '', client_phone: '' })
  const [groupeForm, setGroupeForm] = useState({ responsable: '', telephone: '', debut: '', fin: '' })
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

  // VENTE INDIVIDUELLE
  const handleVendre = async () => {
    if (!form.serial_number || !form.secret_key || !form.client_name || !form.client_phone) {
      setMessage({ type: 'error', text: 'Veuillez remplir tous les champs' }); return
    }
    setSubmitLoading(true)
    setMessage({ type: '', text: '' })

    const { data: ticket } = await supabase
      .from('tickets')
      .select('*')
      .eq('serial_number', form.serial_number.toUpperCase())
      .single()

    if (!ticket) {
      setMessage({ type: 'error', text: 'Numero de ticket introuvable.' })
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
    const { error } = await supabase
      .from('tickets')
      .update({
        status: 'vendu',
        client_name: form.client_name,
        client_phone: form.client_phone,
        vendeur_id: session.user.id,
        sold_at: new Date().toISOString(),
        is_groupe: false
      })
      .eq('id', ticket.id)

    if (!error) {
      setMessage({ type: 'success', text: `Ticket ${ticket.serial_number} vendu a ${form.client_name} !` })
      setForm({ serial_number: '', secret_key: '', client_name: '', client_phone: '' })
      fetchMesVentes(session.user.id)
    }
    setSubmitLoading(false)
  }

  // VENTE GROUPE
  const handleVendreGroupe = async () => {
    if (!groupeForm.responsable || !groupeForm.telephone || !groupeForm.debut || !groupeForm.fin) {
      setMessage({ type: 'error', text: 'Veuillez remplir tous les champs' }); return
    }
    const debut = parseInt(groupeForm.debut.includes('-') ? groupeForm.debut.split('-')[1] : groupeForm.debut)
    const fin = parseInt(groupeForm.fin.includes('-') ? groupeForm.fin.split('-')[1] : groupeForm.fin)
    if (debut > fin) {
      setMessage({ type: 'error', text: 'Le ticket de debut doit etre inferieur au ticket de fin' }); return
    }
    if (fin - debut + 1 > 20) {
      setMessage({ type: 'error', text: 'Maximum 20 tickets par achat groupe' }); return
    }

    setSubmitLoading(true)
    setMessage({ type: '', text: '' })

    const { data: { session } } = await supabase.auth.getSession()
    const taillGroupe = fin - debut + 1
    let erreurs = []
    let succes = 0

    for (let i = debut; i <= fin; i++) {
      const prefix = groupeForm.debut.includes('-') ? groupeForm.debut.split('-')[0] : 'JEF'
      const serial = `${prefix}-${String(i).padStart(3, '0')}`
      const { data: ticket } = await supabase
        .from('tickets')
        .select('*')
        .eq('serial_number', serial)
        .single()

      if (!ticket) { erreurs.push(`${serial} introuvable`); continue }
      if (ticket.status !== 'disponible') { erreurs.push(`${serial} deja vendu`); continue }

      const { error } = await supabase
        .from('tickets')
        .update({
          status: 'vendu',
          client_name: groupeForm.responsable,
          client_phone: groupeForm.telephone,
          vendeur_id: session.user.id,
          sold_at: new Date().toISOString(),
          is_groupe: true,
          groupe_responsable: groupeForm.responsable,
          groupe_telephone: groupeForm.telephone,
          groupe_taille: taillGroupe
        })
        .eq('id', ticket.id)

      if (!error) succes++
      else erreurs.push(`${serial} erreur`)
    }

    if (succes > 0) {
      setMessage({
        type: 'success',
        text: `${succes} ticket${succes > 1 ? 's' : ''} vendus au groupe de ${groupeForm.responsable} !${erreurs.length > 0 ? ` (${erreurs.length} erreur${erreurs.length > 1 ? 's' : ''})` : ''}`
      })
      setGroupeForm({ responsable: '', telephone: '', debut: '', fin: '' })
      fetchMesVentes(session.user.id)
    } else {
      setMessage({ type: 'error', text: 'Erreur : ' + erreurs.join(', ') })
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
            <h1 style={{ color: 'white', fontSize: 20, fontWeight: 900, margin: '3px 0 0' }}>{vendeur?.full_name?.split(' ')[0]}</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ textAlign: 'right' }}>
              <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10, fontWeight: 700, margin: 0, letterSpacing: 1 }}>MES VENTES</p>
              <p style={{ color: 'white', fontSize: 22, fontWeight: 900, margin: 0 }}>{mesVentes.length}</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => router.push('/vendeur/profil')} style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 10, padding: '9px 14px', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Mon profil
              </button>
              <button onClick={handleLogout} style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 10, padding: '9px 14px', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Quitter
              </button>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          {[['vendre', 'Vendre'], ['historique', 'Historique'], ['caisse', 'Ma caisse']].map(([key, label]) => (
            <button key={key} onClick={() => setActiveTab(key)} style={{
              flex: 1, padding: '11px 0', border: 'none', background: 'transparent',
              color: activeTab === key ? 'white' : 'rgba(255,255,255,0.5)',
              fontWeight: activeTab === key ? 800 : 500, fontSize: 13, cursor: 'pointer',
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
            {/* Selector mode */}
            <div style={{ display: 'flex', background: 'white', borderRadius: 16, padding: 4, marginBottom: 16, boxShadow: '0 1px 8px rgba(0,0,0,0.06)', gap: 4 }}>
              <button onClick={() => { setMode('individuel'); setMessage({ type: '', text: '' }) }}
                style={{ flex: 1, padding: '11px', borderRadius: 12, border: 'none', background: mode === 'individuel' ? '#308B0A' : 'transparent', color: mode === 'individuel' ? 'white' : '#6b7280', fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s' }}>
                Vente individuelle
              </button>
              <button onClick={() => { setMode('groupe'); setMessage({ type: '', text: '' }) }}
                style={{ flex: 1, padding: '11px', borderRadius: 12, border: 'none', background: mode === 'groupe' ? '#308B0A' : 'transparent', color: mode === 'groupe' ? 'white' : '#6b7280', fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s' }}>
                Achat groupe
              </button>
            </div>

            {/* Message */}
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

            {/* MODE INDIVIDUEL */}
            {mode === 'individuel' && (
              <div>
                <div style={{ background: 'white', borderRadius: 20, padding: '22px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', marginBottom: 14 }}>
                  <p style={{ margin: '0 0 18px', fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: 1 }}>INFORMATIONS DU TICKET</p>
                  {[
                    { label: 'Numero de ticket *', key: 'serial_number', type: 'text', ph: 'Ex: JEF-001', upper: true },
                    { label: 'Code secret *', key: 'secret_key', type: 'text', ph: 'Ex: X8R2', upper: true },
                  ].map(f => (
                    <div key={f.key} style={{ marginBottom: 14 }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 6, letterSpacing: 0.8 }}>{f.label.toUpperCase()}</label>
                      <input type={f.type} placeholder={f.ph} value={form[f.key]}
                        onChange={(e) => setForm({ ...form, [f.key]: f.upper ? e.target.value.toUpperCase() : e.target.value })}
                        style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '13px 14px', fontSize: 15, background: '#fafafa', outline: 'none', boxSizing: 'border-box', fontWeight: 600 }}
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
                      <input type={f.type} placeholder={f.ph} value={form[f.key]}
                        onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                        style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '13px 14px', fontSize: 15, background: '#fafafa', outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>
                  ))}
                </div>
                <button onClick={handleVendre} disabled={submitLoading}
                  style={{ width: '100%', padding: '17px', borderRadius: 16, border: 'none', background: submitLoading ? '#d1d5db' : 'linear-gradient(135deg, #308B0A, #1e5c06)', color: 'white', fontSize: 17, fontWeight: 800, cursor: submitLoading ? 'not-allowed' : 'pointer', boxShadow: submitLoading ? 'none' : '0 6px 20px rgba(48,139,10,0.35)' }}>
                  {submitLoading ? 'Enregistrement...' : 'Valider la vente'}
                </button>
              </div>
            )}

            {/* MODE GROUPE */}
            {mode === 'groupe' && (
              <div>
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 14, padding: '14px 16px', marginBottom: 16 }}>
                  <p style={{ margin: 0, fontSize: 13, color: '#1d4ed8', fontWeight: 600, lineHeight: 1.6 }}>
                    Pour un achat groupe, entrez les informations du responsable et la plage de tickets. Maximum 20 tickets par groupe.
                  </p>
                </div>

                <div style={{ background: 'white', borderRadius: 20, padding: '22px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', marginBottom: 14 }}>
                  <p style={{ margin: '0 0 18px', fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: 1 }}>RESPONSABLE DU GROUPE</p>
                  {[
                    { label: 'Nom du responsable *', key: 'responsable', type: 'text', ph: 'Ex: Marc Dossou' },
                    { label: 'Telephone *', key: 'telephone', type: 'tel', ph: 'Ex: 97000000' },
                  ].map(f => (
                    <div key={f.key} style={{ marginBottom: 14 }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 6, letterSpacing: 0.8 }}>{f.label.toUpperCase()}</label>
                      <input type={f.type} placeholder={f.ph} value={groupeForm[f.key]}
                        onChange={(e) => setGroupeForm({ ...groupeForm, [f.key]: e.target.value })}
                        style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '13px 14px', fontSize: 15, background: '#fafafa', outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>
                  ))}
                </div>

                <div style={{ background: 'white', borderRadius: 20, padding: '22px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)', marginBottom: 20 }}>
                  <p style={{ margin: '0 0 18px', fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: 1 }}>PLAGE DE TICKETS</p>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 6, letterSpacing: 0.8 }}>DU NUMERO *</label>
                      <input type="text" placeholder="Ex: 10 ou TEST-001" value={groupeForm.debut}
                        onChange={(e) => setGroupeForm({ ...groupeForm, debut: e.target.value })}
                        style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '13px 14px', fontSize: 15, fontWeight: 700, background: '#fafafa', outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 6, letterSpacing: 0.8 }}>AU NUMERO *</label>
                      <input type="text" placeholder="Ex: 19 ou TEST-030" value={groupeForm.fin}
                        onChange={(e) => setGroupeForm({ ...groupeForm, fin: e.target.value })}
                        style={{ width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '13px 14px', fontSize: 15, fontWeight: 700, background: '#fafafa', outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                  {groupeForm.debut && groupeForm.fin && parseInt(groupeForm.fin) >= parseInt(groupeForm.debut) && (
                    <div style={{ marginTop: 12, background: '#f0fdf4', borderRadius: 10, padding: '10px 14px' }}>
                      <p style={{ margin: 0, fontSize: 13, color: '#16a34a', fontWeight: 700 }}>
                        {parseInt(groupeForm.fin) - parseInt(groupeForm.debut) + 1} ticket(s) —
                        {groupeForm.debut.includes('-') ? groupeForm.debut : `JEF-${String(groupeForm.debut).padStart(3, '0')}`} a {groupeForm.fin.includes('-') ? groupeForm.fin : `JEF-${String(groupeForm.fin).padStart(3, '0')}`} —
                        {((parseInt(groupeForm.fin) - parseInt(groupeForm.debut) + 1) * 6000).toLocaleString()} FCFA
                      </p>
                    </div>
                  )}
                </div>

                <button onClick={handleVendreGroupe} disabled={submitLoading}
                  style={{ width: '100%', padding: '17px', borderRadius: 16, border: 'none', background: submitLoading ? '#d1d5db' : 'linear-gradient(135deg, #308B0A, #1e5c06)', color: 'white', fontSize: 17, fontWeight: 800, cursor: submitLoading ? 'not-allowed' : 'pointer', boxShadow: submitLoading ? 'none' : '0 6px 20px rgba(48,139,10,0.35)' }}>
                  {submitLoading ? 'Enregistrement...' : 'Valider l\'achat groupe'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ===== HISTORIQUE ===== */}
        {activeTab === 'historique' && (
          <div>
            {mesVentes.length === 0 ? (
              <div style={{ background: 'white', borderRadius: 20, padding: '48px 20px', textAlign: 'center', boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
                <p style={{ color: '#9ca3af', fontSize: 15, margin: 0, fontWeight: 500 }}>Aucune vente pour le moment</p>
              </div>
            ) : (
              mesVentes.map((v, i) => (
                <div key={i} style={{ background: 'white', borderRadius: 16, padding: '16px 18px', marginBottom: 10, boxShadow: '0 1px 6px rgba(0,0,0,0.05)', borderLeft: v.is_groupe ? '4px solid #1d4ed8' : '4px solid #308B0A' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: '#111' }}>{v.client_name}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>
                        {v.client_phone} {v.is_groupe ? `· Groupe (${v.groupe_taille} tickets)` : ''}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ background: v.is_groupe ? '#eff6ff' : '#f0fdf4', borderRadius: 8, padding: '4px 10px' }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: v.is_groupe ? '#1d4ed8' : '#308B0A' }}>{v.serial_number}</span>
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
              <p style={{ margin: '10px 0 4px', fontSize: 40, fontWeight: 900, color: 'white', letterSpacing: '-1px' }}>{montantTotal.toLocaleString()}</p>
              <p style={{ margin: 0, fontSize: 16, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>FCFA</p>
            </div>
            <div style={{ background: 'white', borderRadius: 20, padding: '22px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 14, borderBottom: '1px solid #f3f4f6', marginBottom: 14 }}>
                <span style={{ fontSize: 14, color: '#6b7280', fontWeight: 500 }}>Tickets vendus</span>
                <span style={{ fontSize: 18, fontWeight: 900, color: '#111' }}>{mesVentes.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 14, borderBottom: '1px solid #f3f4f6', marginBottom: 14 }}>
                <span style={{ fontSize: 14, color: '#6b7280', fontWeight: 500 }}>Ventes individuelles</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: '#308B0A' }}>{mesVentes.filter(v => !v.is_groupe).length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 14, borderBottom: '1px solid #f3f4f6', marginBottom: 14 }}>
                <span style={{ fontSize: 14, color: '#6b7280', fontWeight: 500 }}>Ventes groupe</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: '#1d4ed8' }}>{mesVentes.filter(v => v.is_groupe).length}</span>
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