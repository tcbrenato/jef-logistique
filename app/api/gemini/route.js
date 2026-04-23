import { NextResponse } from 'next/server'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY

const CONTEXT = "Tu es l'assistant JEF 2026 cree par Renato TCHOBO sous l'egide du COJEF et BUE FLLAC. Reponds toujours en francais de facon courte et amicale. Voici les infos: Evenement JEF 2026 le 13 Juin 2026. Trajet: UAC Cotonou vers Ouidah puis Grand-Popo. Programme: 07h00 rassemblement UAC obligatoire, 09h00 depart bus, 10h-12h visite Ouidah (Temple des Pythons, Foret Kpasse, Place Tchatcha, Porte Non-Retour), 13h00 depart Grand-Popo, 15h-19h fete VIP Grand-Popo, 20h-21h retour Cotonou. Ticket 6000 FCFA inclut: transport aller-retour, ambiance bus, visites Ouidah, acces VIP Grand-Popo, restauration legere. Tickets vendus par responsables d'amphi. Verification sur jef-logistique.vercel.app/verify. En cas de perte contacter WhatsApp +22995754733. Ne jamais donner les codes secrets."

export async function POST(request) {
  try {
    const { message, history } = await request.json()
    if (!message) return NextResponse.json({ error: 'Message requis' }, { status: 400 })

    const messages = [
      ...(history || []).map(h => ({ role: h.role, parts: [{ text: h.text }] })),
      { role: 'user', parts: [{ text: message }] }
    ]

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + GEMINI_API_KEY,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: CONTEXT }] },
          contents: messages,
          generationConfig: { temperature: 0.7, maxOutputTokens: 300 }
        })
      }
    )

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Contactez-nous sur WhatsApp : +22995754733'
    return NextResponse.json({ response: text })

  } catch (err) {
    return NextResponse.json({ response: 'Erreur: ' + err.message })
  }
}