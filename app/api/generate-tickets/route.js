import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'
import fs from 'fs'
import path from 'path'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  const { debut, fin } = await request.json()

  const { data: tickets, error } = await supabaseAdmin
    .from('tickets')
    .select('serial_number, secret_key')
    .gte('serial_number', `JEF-${String(debut).padStart(3, '0')}`)
    .lte('serial_number', `JEF-${String(fin).padStart(3, '0')}`)
    .order('serial_number')

  if (error || !tickets || tickets.length === 0) {
    return NextResponse.json({ error: 'Aucun ticket trouve' }, { status: 400 })
  }

  // A4 portrait en points (595 x 842)
  const A4_W = 595
  const A4_H = 842

  // Template : 8.5po x 2.75po -> sur A4 on adapte
  // Chaque ticket occupe 1/4 de la hauteur A4
  const TICKET_W = A4_W          // toute la largeur
  const TICKET_H = A4_H / 4      // quart de hauteur = 210.5 pts

  // Ratio de conversion : template 8.5po = 612pts -> notre largeur 595pts
  const RATIO_X = TICKET_W / (8.5 * 72)
  const RATIO_Y = TICKET_H / (2.75 * 72)

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4'
  })

  // Charger le template une seule fois
  const templatePath = path.join(process.cwd(), 'public', 'templateticket.png')
  const templateBase64 = fs.readFileSync(templatePath).toString('base64')
  const templateDataUrl = `data:image/png;base64,${templateBase64}`

  for (let i = 0; i < tickets.length; i++) {
    const ticket = tickets[i]
    const serial = ticket.serial_number
    const code = ticket.secret_key
    const label = `${serial}  |  C: ${code}`
    const qrUrl = `https://jef-logistique.vercel.app/verify/${serial}`

    // Nouvelle page tous les 4 tickets
    if (i > 0 && i % 4 === 0) doc.addPage()

    // Position verticale du ticket sur la page
    const posY = (i % 4) * TICKET_H

    // Fond template
    doc.addImage(templateDataUrl, 'PNG', 0, posY, TICKET_W, TICKET_H)

    // QR Code vert
    const qrDataUrl = await QRCode.toDataURL(qrUrl, {
      width: 300,
      margin: 0,
      color: { dark: '#1a5c05', light: '#ffffff' }
    })

    // Position QR (X:5.08po, Y:1.5po, W:0.87po, H:0.84po)
    const qrX = 5.08 * 72 * RATIO_X
    const qrY = posY + (1.5 * 72 * RATIO_Y)
    const qrW = 0.87 * 72 * RATIO_X
    const qrH = 0.84 * 72 * RATIO_Y
    doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrW, qrH)

    // Style texte — Courier (style machine à écrire)
    doc.setFont('courier', 'bold')
    doc.setTextColor(20, 20, 20)

    // Numéro souche droite extrême (X:7.52, Y:0.6)
    doc.setFontSize(6)
    doc.text(serial,
      7.52 * 72 * RATIO_X,
      posY + (0.65 * 72 * RATIO_Y)
    )

    // Numéro souche milieu (X:6.43, Y:0.6)
    doc.text(serial,
      6.43 * 72 * RATIO_X,
      posY + (0.65 * 72 * RATIO_Y)
    )

    // Numéro au-dessus QR (X:5.1, Y:1.39)
    doc.setFontSize(5.5)
    doc.text(serial,
      5.1 * 72 * RATIO_X,
      posY + (1.42 * 72 * RATIO_Y)
    )

    // Bande sécurité 1 (X:2.48, Y:2.22)
    doc.setFontSize(4.5)
    doc.text(label,
      2.48 * 72 * RATIO_X,
      posY + (2.28 * 72 * RATIO_Y)
    )

    // Bande sécurité 2 (X:4.05, Y:2.22)
    doc.text(label,
      4.05 * 72 * RATIO_X,
      posY + (2.28 * 72 * RATIO_Y)
    )
  }

  const pdfBuffer = Buffer.from(doc.output('arraybuffer'))

  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="tickets-jef2026-${debut}-${fin}.pdf"`
    }
  })
}