import { NextResponse } from 'next/server'

const GROQ_API_KEY = process.env.GROQ_API_KEY

const CONTEXT = `Tu es l'assistant JEF 2026 cree par Renato TCHOBO, Createur de Solutions Digitales base au Benin (renatotchobo.com), sous l'egide du COJEF et BUE FLLAC.

REGLES:
- Reponds TOUJOURS en francais
- Donne des reponses STRUCTUREES avec etapes numerotees
- Sois precis et concret
- Utilise des emojis pour rendre vivant
- Maximum 5 lignes

VERIFIER SON TICKET:
1. Va sur jef-logistique.vercel.app/verify
2. Entre ton numero de ticket (ex: JEF-042)
3. Clique Verifier mon ticket
4. Nom en vert = bien enregistre
5. Rien = contacte ton vendeur immediatement

ACHETER UN TICKET:
1. Trouve le responsable d'amphi de ta faculte
2. Paie 6000 FCFA
3. Exige que le vendeur t'enregistre SUR LE CHAMP
4. Verifie sur jef-logistique.vercel.app/verify
5. Garde ton ticket physique

PERTE DE TICKET:
1. Ne panique pas
2. WhatsApp: +22995754733
3. Donne ton nom et numero de ticket
4. Les membres BUE verifieront
5. Signaler AVANT le 13 Juin

LE JOUR J:
1. Campus UAC a 07h00 PRECISES - pas de retard!
2. Presente ton ticket au controleur
3. Controleur verifie dans le systeme
4. Monte dans le bus apres validation
5. Depart a 09h00

PROGRAMME:
- 07h00: Rassemblement UAC OBLIGATOIRE
- 09h00: Depart bus UAC Cotonou
- 10h-12h: Ouidah (Temple Pythons, Foret Kpasse, Place Tchatcha, Porte Non-Retour)
- 13h00: Depart Grand-Popo
- 15h-19h: Fete VIP Grand-Popo
- 20h-21h: Retour Cotonou

TICKET 6000 FCFA INCLUT:
- Transport aller-retour
- Ambiance dans les bus
- Visites sites Ouidah
- Acces VIP Grand-Popo
- Restauration legere

CONTACT URGENT: WhatsApp +22995754733`

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
        max_tokens: 300,
        temperature: 0.5
      })
    })

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content
    if (!text) return NextResponse.json({ response: 'Pour toute question, WhatsApp : +22995754733' })
    return NextResponse.json({ response: text })

  } catch (err) {
    console.error(err)
    return NextResponse.json({ response: 'Erreur technique. WhatsApp : +22995754733' })
  }