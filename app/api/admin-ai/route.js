import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const GROQ_API_KEY = process.env.GROQ_API_KEY
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { message, history } = await request.json()

    // Charger les donnees reelles
    const { data: tickets } = await supabaseAdmin.from('tickets').select('*')
    const { data: profiles } = await supabaseAdmin.from('profiles').select('*')

    const vendus = tickets?.filter(t => t.status === 'vendu' || t.status === 'embarque').length || 0
    const embarques = tickets?.filter(t => t.status === 'embarque').length || 0
    const disponibles = tickets?.filter(t => t.status === 'disponible').length || 0
    const montantTotal = vendus * 6000

    const vendeurs = profiles?.filter(p => p.role === 'vendeur') || []
    const vendeurStats = vendeurs.map(v => ({
      nom: v.full_name,
      ventes: tickets?.filter(t => t.vendeur_id === v.id && (t.status === 'vendu' || t.status === 'embarque')).length || 0,
      montant: (tickets?.filter(t => t.vendeur_id === v.id && (t.status === 'vendu' || t.status === 'embarque')).length || 0) * 6000,
      suspendu: v.suspended,
      tickets_remis: v.tickets_remis || 0
    })).sort((a, b) => b.ventes - a.ventes)

    const superviseurs = profiles?.filter(p => p.role === 'superviseur') || []
    const enLigne = profiles?.filter(p => {
      if (!p.last_seen) return false
      return new Date() - new Date(p.last_seen) < 60000
    }) || []

    const CONTEXT = `Tu es l'assistant IA personnel de l'administrateur de la plateforme JEF 2026, developpee par Renato TCHOBO.
Tu as acces aux donnees en temps reel de la plateforme. Reponds en francais, de facon claire et structuree.

STATISTIQUES EN TEMPS REEL:
- Tickets vendus: ${vendus} / 500
- Tickets embarques: ${embarques}
- Tickets disponibles: ${disponibles}
- Montant total collecte: ${montantTotal.toLocaleString()} FCFA
- Taux de remplissage: ${Math.round((vendus/500)*100)}%
- Nombre de vendeurs: ${vendeurs.length}
- Membres BUE: ${superviseurs.length}
- Utilisateurs en ligne: ${enLigne.length}

CLASSEMENT DES VENDEURS:
${vendeurStats.map((v, i) => `${i+1}. ${v.nom}: ${v.ventes} tickets vendus (${v.montant.toLocaleString()} FCFA) - Remis: ${v.tickets_remis} - En main: ${v.tickets_remis - v.ventes}${v.suspendu ? ' [SUSPENDU]' : ''}`).join('\n')}

VENDEURS SANS VENTES:
${vendeurStats.filter(v => v.ventes === 0).map(v => `- ${v.nom}`).join('\n') || 'Tous les vendeurs ont vendu au moins un ticket'}

UTILISATEURS EN LIGNE:
${enLigne.map(u => `- ${u.full_name} (${u.role}) - ${u.last_action || 'Connecte'}`).join('\n') || 'Aucun utilisateur en ligne'}

Tu peux analyser ces donnees et repondre a toutes les questions de l'administrateur sur les ventes, les vendeurs, les tickets et les performances.`

    const messages = [
      { role: 'system', content: CONTEXT },
      ...(history || []).map(h => ({
        role: h.role === 'assistant' ? 'assistant' : 'user',
        content: h.text
      })),
      { role: 'user', content: message }
    ]

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: messages,
        max_tokens: 500,
        temperature: 0.3
      })
    })

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content
    if (!text) return NextResponse.json({ response: 'Erreur. Reessayez.' })
    return NextResponse.json({ response: text })

  } catch (err) {
    console.error(err)
    return NextResponse.json({ response: 'Erreur: ' + err.message })
  }
}