import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'JEF 2026 - Logistique',
  description: 'Plateforme de gestion des tickets JEF 2026',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}