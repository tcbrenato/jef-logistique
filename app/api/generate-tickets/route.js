import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Cache du template compressé
let cachedTemplate = null

const getTemplate = async () => {
  if (cachedTemplate) return cachedTemplate
  const templatePath = path.join(process.cwd(), 'public', 'templateticket.png')
  const compressed = await sharp(templatePath)
    .resize(1240, 400, { fit: 'fill' })
    .jpeg({ quality: 75 })
    .toBuffer()
  cachedTemplate = `data:image/jpeg;base64,${compressed.toString('base64')}`
  return cachedTemplate
}

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

  const A4_W = 595
  const A4_H = 842
  const MARGIN = 8
  const TICKET_H = (A4_H - (MARGIN * 5)) / 4
  const TICKET_W = A4_W - (MARGIN * 2)
  const RATIO_X = TICKET_W / (8.5 * 72)
  const RATIO_Y = TICKET_H / (2.75 * 72)

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
    compress: true
  })

  // Template compressé
  const templateDataUrl = await getTemplate()

  // Générer tous les QR codes en parallèle
  const qrPromises = tickets.map(ticket =>
    QRCode.toDataURL(
      `https://jef-logistique.vercel.app/verify/${ticket.serial_number}`,
      { width: 150, margin: 0, color: { dark: '#1a5c05', light: '#ffffff' } }
    )
  )
  const qrDataUrls = await Promise.all(qrPromises)

  for (let i = 0; i < tickets.length; i++) {
    const ticket = tickets[i]
    const serial = ticket.serial_number
    const code = ticket.secret_key
    const label = `${serial}  |  C: ${code}`

    if (i > 0 && i % 4 === 0) doc.addPage()

    const ticketIndex = i % 4
    const posY = MARGIN + ticketIndex * (TICKET_H + MARGIN)

    // Template
    doc.addImage(templateDataUrl, 'JPEG', MARGIN, posY, TICKET_W, TICKET_H)

    // QR Code
    const qrX = MARGIN + (5.08 * 72 * RATIO_X)
    const qrY = posY + (1.5 * 72 * RATIO_Y)
    const qrW = 0.87 * 72 * RATIO_X
    const qrH = 0.84 * 72 * RATIO_Y
    doc.addImage(qrDataUrls[i], 'PNG', qrX, qrY, qrW, qrH)

    // Texte style machine a ecrire
    doc.setFont('courier', 'bold')
    doc.setTextColor(20, 20, 20)

    doc.setFontSize(6)
    doc.text(serial, MARGIN + (7.52 * 72 * RATIO_X), posY + (0.65 * 72 * RATIO_Y))
    doc.text(serial, MARGIN + (6.43 * 72 * RATIO_X), posY + (0.65 * 72 * RATIO_Y))

    doc.setFontSize(5.5)
    doc.text(serial, MARGIN + (5.1 * 72 * RATIO_X), posY + (1.42 * 72 * RATIO_Y))

    doc.setFontSize(4.5)
    doc.text(label, MARGIN + (2.48 * 72 * RATIO_X), posY + (2.28 * 72 * RATIO_Y))
    doc.text(label, MARGIN + (4.05 * 72 * RATIO_X), posY + (2.28 * 72 * RATIO_Y))

    // Ligne pointillee
    if (ticketIndex < 3 && i < tickets.length - 1) {
      const ligneY = posY + TICKET_H + (MARGIN / 2)
      doc.setDrawColor(180, 180, 180)
      doc.setLineWidth(0.4)
      doc.setLineDashPattern([4, 3], 0)
      doc.line(MARGIN, ligneY, A4_W - MARGIN, ligneY)
      doc.setLineDashPattern([], 0)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(180, 180, 180)
      doc.text('✂', 2, ligneY + 2.5)
      doc.setTextColor(20, 20, 20)
    }
  }

  const pdfBuffer = Buffer.from(doc.output('arraybuffer'))

  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="tickets-jef2026-${debut}-${fin}.pdf"`
    }
  })
}