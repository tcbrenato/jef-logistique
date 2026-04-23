import { NextResponse } from 'next/server'

const GROQ_API_KEY = process.env.GROQ_API_KEY

const CONTEXT = "Tu es l'assistant JEF 2026 cree par Renato TCHOBO, Createur de Solutions Digitales et developpeur web base au Benin. Renato est diplome de l'Universite d'Abomey-Calavi en Didactique des langues et cultures, et travaille dans le digital et la communication. Son site: renatotchobo.com. Il a developpe cette plateforme sous l'egide du COJEF et BUE FLLAC. Reponds en francais, sois court et amical. JEF 2026 le 13 Juin 2026, trajet UAC Cotonou vers Ouidah puis Grand-Popo. Programme: 07h rassemblement UAC, 09h depart, 10h-12h Ouidah (Temple Pythons, Foret Kpasse, Place Tchatcha, Porte Non-Retour), 15h-19h fete Grand-Popo VIP, 20h-21h retour. Ticket 6000F inclut transport, visites, ambiance, restauration. Perte ticket: WhatsApp +22995754733."

export async function POST(request) {
  try {
    const { message, history } = await request.json()

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
        max_tokens: 200,
        temperature: 0.7
      })
    })

    const data = await response.json()
    console.log('Status:', response.status, 'Data:', JSON.stringify(data).slice(0, 300))

    const text = data.choices?.[0]?.message?.content
    if (!text) return NextResponse.json({ response: 'Pour toute question, WhatsApp : +22995754733' })
    return NextResponse.json({ response: text })

  } catch (err) {
    console.error(err)
    return NextResponse.json({ response: 'Erreur technique. WhatsApp : +22995754733' })
  }
}