import Link from 'next/link'
import { Sword } from 'lucide-react'

export function Navbar() {
  return (
    <nav className="border-b border-valkaria-800 bg-midnight-800/80 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-valkaria-300 hover:text-valkaria-100 transition-colors">
            <Sword className="h-6 w-6" />
            <span className="text-lg font-serif font-semibold">Valkária</span>
          </Link>

          <div className="flex items-center gap-6">
            <Link
              href="/chat"
              className="text-sm text-valkaria-300 hover:text-valkaria-100 transition-colors"
            >
              Chat
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
