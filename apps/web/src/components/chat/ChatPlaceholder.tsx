'use client'

import { MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ChatPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] gap-6 p-8">
      <div className="rounded-full bg-valkaria-900/50 p-6 border border-valkaria-700">
        <MessageCircle className="h-12 w-12 text-valkaria-400" />
      </div>

      <div className="text-center max-w-md">
        <h2 className="text-2xl font-serif text-valkaria-100 mb-2">
          O Oráculo de Valkária
        </h2>
        <p className="text-valkaria-300 text-sm leading-relaxed">
          Em breve você poderá conversar com os NPCs do mundo de Valkária,
          explorar localizações e descobrir lore secreto do universo.
        </p>
      </div>

      <Button variant="outline" disabled className="gap-2">
        <MessageCircle className="h-4 w-4" />
        Chat em breve...
      </Button>
    </div>
  )
}
