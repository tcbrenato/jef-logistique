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

// Conversion pouces -> points PDF (1 pouce = 72 points)
const toPoints = (inches) => inches * 72

export async function POST(request) {
  const { debut, fin } = await request.json()

  // Récupérer les tickets demandés
  const { data: tickets, error } = await supabaseAdmin
    .from('tickets')
    .select('serial_number, secret_key')
    .gte('serial_number', `JEF-${String(debut).padStart(3, '0')}`)
    .lte('serial_number', `JEF-${String(fin).padStart(3, '0')}`)
    .order('serial_number')

  if (error || !tickets || tickets.length === 0) {
    return NextResponse.json({ error: 'Aucun ticket trouve' }, { status: 400 })
  }

  // Dimensions du template en points
  const W = toPoints(8.5)  // 612 pts
  const H = toPoints(2.75) // 198 pts

  // Créer le PDF en mode paysage
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: [H, W]
  })

  // Charger le template
  const templatePath = path.join(process.cwd(), 'public', 'templateticket.png')
  const templateBase64 = fs.readFileSync(templatePath).toString('base64')
  const templateDataUrl = `data:image/png;base64,${templateBase64}`

  for (let i = 0; i < tickets.length; i++) {
    const ticket = tickets[i]
    const serial = ticket.serial_number
    const code = ticket.secret_key
    const label = `${serial} | C: ${code}`
    const qrUrl = `https://jef-logistique.vercel.app/verify/${serial}`

    if (i > 0) doc.addPage([H, W], 'landscape')

    // Fond — template
    doc.addImage(templateDataUrl, 'PNG', 0, 0, W, H)

    // Générer QR Code
    const qrDataUrl = await QRCode.toDataURL(qrUrl, {
      width: 200,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' }
    })

    // Positions (pouces -> points)
    const DPI = 72

    // QR Code (X:5.08, Y:1.5, W:0.87, H:0.84)
    doc.addImage(qrDataUrl, 'PNG',
      5.08 * DPI, 1.5 * DPI,
      0.87 * DPI, 0.84 * DPI
    )

    doc.setFontSize(7)
    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'bold')

    // Numéro souche droite extrême (X:7.52, Y:0.6)
    doc.text(serial, 7.52 * DPI, 0.6 * DPI)

    // Numéro souche milieu (X:6.43, Y:0.6)
    doc.text(serial, 6.43 * DPI, 0.6 * DPI)

    // Numéro au-dessus QR (X:5.1, Y:1.39)
    doc.text(serial, 5.1 * DPI, 1.39 * DPI)

    // Bande sécurité 1 (X:2.48, Y:2.22)
    doc.setFontSize(5)
    doc.text(label, 2.48 * DPI, 2.22 * DPI)

    // Bande sécurité 2 (X:4.05, Y:2.22)
    doc.text(label, 4.05 * DPI, 2.22 * DPI)
  }

  // Retourner le PDF
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'))

  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="tickets-jef2026-${debut}-${fin}.pdf"`
    }
  })
}