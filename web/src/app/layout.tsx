import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
})

// Orbitron via CSS (carregado no globals.css via Google Fonts link)
// Usando next/font/google diretamente
import { Orbitron } from 'next/font/google'

const orbitron = Orbitron({
  variable: '--font-orbitron',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'gabrielfpoker | Mentoria Evolution',
    template: '%s · gabrielfpoker',
  },
  description: 'A plataforma definitiva para treinar, evoluir e dominar o poker.',
  keywords: ['poker', 'GTO', 'treinamento', 'ranges', 'simulador'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`
          ${geistSans.variable}
          ${geistMono.variable}
          ${orbitron.variable}
          antialiased
        `}
      >
        {children}
      </body>
    </html>
  )
}
