'use client'

import Link from 'next/link'
import { Sword, Heart, Shield, User } from 'lucide-react'
import { useAuth } from '@/lib/auth/AuthContext'
import { cn } from '@/lib/utils'

export function Navbar() {
  const { playerName, role, dmToken } = useAuth()

  const isDM = role === 'DM' || Boolean(dmToken)
  const isPlayer = role === 'PLAYER' && Boolean(playerName)

  return (
    <nav className="border-b border-valkaria-800 bg-midnight-800/80 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-valkaria-300 hover:text-valkaria-100 transition-colors"
          >
            <Sword className="h-6 w-6" />
            <span className="text-lg font-serif font-semibold">Valkária</span>
          </Link>

          <div className="flex items-center gap-1 sm:gap-4">
            <Link
              href="/chat"
              className="rounded-lg px-3 py-1.5 text-sm text-valkaria-300 hover:text-valkaria-100 transition-colors"
            >
              Chat
            </Link>

            {isPlayer && (
              <Link
                href="/profile"
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5',
                  'text-sm text-valkaria-300 hover:text-valkaria-100 transition-colors',
                )}
              >
                <Heart className="h-3.5 w-3.5" aria-hidden="true" />
                Perfil
              </Link>
            )}

            {isDM && (
              <Link
                href="/dm/players"
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5',
                  'text-sm text-valkaria-300 hover:text-valkaria-100 transition-colors',
                )}
              >
                <Shield className="h-3.5 w-3.5" aria-hidden="true" />
                Mestre
              </Link>
            )}

            {isPlayer && (
              <div className="flex items-center gap-1.5 rounded-full border border-valkaria-700 bg-valkaria-900/50 px-3 py-1">
                <User className="h-3 w-3 text-valkaria-400" aria-hidden="true" />
                <span className="text-xs font-medium text-valkaria-300">{playerName}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
