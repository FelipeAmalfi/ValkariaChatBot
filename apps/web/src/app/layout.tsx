import type { Metadata } from 'next'
import { Providers } from '@/lib/providers'
import { Navbar } from '@/components/layout/Navbar'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: 'ValkáriaChatBot — Universo de RPG',
  description: 'Explore o mundo de Valkária através de conversas com NPCs, localizações e lore.',
  keywords: ['RPG', 'Valkária', 'chatbot', 'fantasy', 'AI'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <Providers>
          <div className="min-h-screen bg-gradient-valkaria">
            <Navbar />
            <main>{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  )
}
