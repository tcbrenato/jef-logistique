'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function RapportPage() {
  const router = useRouter()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  useEffect(() => { checkAdmin() }, [])

  const checkAdmin = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/login'); return }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
    if (!['admin', 'superviseur'].includes(profile?.role)) { router.push('/login'); return }
    fetchData()
  }

  const fetchData = async () => {
    setLoading(true)
    const { data: tickets } = await supabase
      .from('tickets')
      .select('*, profiles(full_name, phone)')
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .neq('role', 'admin')

    if (tickets && profiles) {
      const vendeurs = profiles.map(p => ({
        ...p,
        tickets_vendus: tickets.filter(t => t.vendeur_id === p.id && (t.status === 'vendu' || t.status === 'embarque')).length,
        montant: tickets.filter(t => t.vendeur_id === p.id && (t.status === 'vendu' || t.status === 'embarque')).length * 6000,
      })).sort((a, b) => b.tickets_vendus - a.tickets_vendus)

      setData({
        total_vendus: tickets.filter(t => t.status === 'vendu' || t.status === 'embarque').length,
        total_embarques: tickets.filter(t => t.status === 'embarque').length,
        total_disponibles: tickets.filter(t => t.status === 'disponible').length,
        recette_totale: tickets.filter(t => t.status === 'vendu' || t.status === 'embarque').length * 6000,
        recette_potentielle: 500 * 6000,
        manque_a_gagner: tickets.filter(t => t.status === 'disponible').length * 6000,
        vendeurs,
        date_rapport: new Date().toLocaleString('fr-FR')
      })
    }
    setLoading(false)
  }

  const generatePDF = async () => {
    setGenerating(true)
    const { jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')

    const doc = new jsPDF()
    const green = [48, 139, 10]

    // En-tete
    doc.setFillColor(...green)
    doc.rect(0, 0, 210, 35, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('JEF 2026 — RAPPORT FINANCIER', 14, 16)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('Grand-Popo via Ouidah · 13 Juin 2026', 14, 24)
    doc.text(`Genere le : ${data.date_rapport}`, 14, 31)

    // Stats globales
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text('RESUME GLOBAL', 14, 48)

    autoTable(doc, {
      startY: 52,
      head: [['Indicateur', 'Valeur']],
      body: [
        ['Tickets vendus', `${data.total_vendus} / 500`],
        ['Passagers embarques', `${data.total_embarques}`],
        ['Tickets disponibles', `${data.total_disponibles}`],
        ['Taux de remplissage', `${Math.round((data.total_vendus / 500) * 100)}%`],
        ['Recette encaissee', `${data.recette_totale.toLocaleString()} FCFA`],
        ['Recette potentielle totale', `${data.recette_potentielle.toLocaleString()} FCFA`],
        ['Manque a gagner', `${data.manque_a_gagner.toLocaleString()} FCFA`],
      ],
      headStyles: { fillColor: green, textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [240, 253, 244] },
      styles: { fontSize: 11 }
    })

    // Tableau vendeurs
    doc.setFontSize(13)
    doc.setFont('helvetica', 'bold')
    doc.text('PERFORMANCE DES VENDEURS', 14, doc.lastAutoTable.finalY + 16)

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 20,
      head: [['#', 'Vendeur', 'Role', 'Tickets vendus', 'Montant (FCFA)']],
      body: data.vendeurs.map((v, i) => [
        `#${i + 1}`,
        v.full_name,
        v.role,
        v.tickets_vendus,
        v.montant.toLocaleString()
      ]),
      headStyles: { fillColor: green, textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [240, 253, 244] },
      styles: { fontSize: 10 }
    })

    // Pied de page
    const pageCount = doc.internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(150)
      doc.text(`JEF 2026 · Rapport financier · Page ${i}/${pageCount}`, 14, 290)
      doc.text('BUE / COJEF Benin', 160, 290)
    }

    doc.save(`rapport-financier-jef2026-${new Date().toISOString().slice(0, 10)}.pdf`)
    setGenerating(false)
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
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: 700, letterSpacing: 1.5, margin: 0 }}>RAPPORT FINANCIER</p>
            <h1 style={{ color: 'white', fontSize: 20, fontWeight: 900, margin: '3px 0 0' }}>JEF 2026</h1>
          </div>
          <button onClick={() => router.back()} style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 10, padding: '9px 14px', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Retour
          </button>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, margin: '10px 0 0' }}>
          Genere le {data?.date_rapport}
        </p>
      </div>

      <div style={{ padding: '20px 16px 40px' }}>

        {/* Bouton export PDF */}
        <button onClick={generatePDF} disabled={generating}
          style={{ width: '100%', padding: '16px', borderRadius: 16, border: 'none', background: generating ? '#d1d5db' : '#308B0A', color: 'white', fontSize: 16, fontWeight: 800, cursor: generating ? 'not-allowed' : 'pointer', marginBottom: 20, boxShadow: '0 4px 14px rgba(48,139,10,0.3)' }}>
          {generating ? 'Generation du PDF...' : 'Telecharger le rapport PDF'}
        </button>

        {/* Resume global */}
        <div style={{ background: 'white', borderRadius: 20, padding: '22px', marginBottom: 14, boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
          <p style={{ margin: '0 0 16px', fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: 1 }}>RESUME GLOBAL</p>
          {[
            { label: 'Tickets vendus', value: `${data.total_vendus} / 500`, color: '#308B0A' },
            { label: 'Passagers embarques', value: data.total_embarques, color: '#1d4ed8' },
            { label: 'Taux de remplissage', value: `${Math.round((data.total_vendus / 500) * 100)}%`, color: '#308B0A' },
            { label: 'Recette encaissee', value: `${data.recette_totale.toLocaleString()} FCFA`, color: '#6d28d9' },
            { label: 'Recette potentielle', value: `${data.recette_potentielle.toLocaleString()} FCFA`, color: '#374151' },
            { label: 'Manque a gagner', value: `${data.manque_a_gagner.toLocaleString()} FCFA`, color: '#dc2626' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: i < 5 ? '1px solid #f3f4f6' : 'none' }}>
              <span style={{ fontSize: 13, color: '#6b7280', fontWeight: 500 }}>{item.label}</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: item.color }}>{item.value}</span>
            </div>
          ))}
        </div>

        {/* Classement vendeurs */}
        <div style={{ background: 'white', borderRadius: 20, padding: '22px', boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
          <p style={{ margin: '0 0 16px', fontSize: 11, fontWeight: 700, color: '#9ca3af', letterSpacing: 1 }}>PERFORMANCE VENDEURS</p>
          {data.vendeurs.map((v, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: i < data.vendeurs.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 32, height: 32, background: i === 0 ? '#fef9c3' : '#f0f2f5', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 900, color: i === 0 ? '#ca8a04' : '#6b7280' }}>#{i + 1}</span>
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#111' }}>{v.full_name}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>{v.montant.toLocaleString()} FCFA</p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: 0, fontWeight: 900, fontSize: 20, color: '#308B0A' }}>{v.tickets_vendus}</p>
                <p style={{ margin: 0, fontSize: 11, color: '#9ca3af' }}>tickets</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}