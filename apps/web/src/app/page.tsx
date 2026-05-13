import Link from 'next/link'
import { Sword, Map, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4 py-16">
      <div className="text-center max-w-2xl mx-auto space-y-8">
        <div className="flex justify-center">
          <div className="rounded-full bg-valkaria-900/50 p-8 border border-valkaria-700">
            <Sword className="h-16 w-16 text-valkaria-400" />
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-5xl font-serif text-valkaria-100 tracking-tight">
            Universo de Valkária
          </h1>
          <p className="text-lg text-valkaria-300 leading-relaxed">
            Um chatbot de RPG alimentado por IA. Converse com NPCs,
            explore localizações e descubra os segredos do mundo de Valkária.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12">
          <div className="rounded-lg border border-valkaria-800 bg-midnight-800/50 p-6 text-center">
            <Users className="h-8 w-8 text-valkaria-400 mx-auto mb-3" />
            <h3 className="text-valkaria-100 font-semibold mb-1">NPCs</h3>
            <p className="text-valkaria-400 text-xs">Personagens únicos com histórias e memórias</p>
          </div>
          <div className="rounded-lg border border-valkaria-800 bg-midnight-800/50 p-6 text-center">
            <Map className="h-8 w-8 text-valkaria-400 mx-auto mb-3" />
            <h3 className="text-valkaria-100 font-semibold mb-1">Localizações</h3>
            <p className="text-valkaria-400 text-xs">Explore regiões, cidades e masmorras</p>
          </div>
          <div className="rounded-lg border border-valkaria-800 bg-midnight-800/50 p-6 text-center">
            <Sword className="h-8 w-8 text-valkaria-400 mx-auto mb-3" />
            <h3 className="text-valkaria-100 font-semibold mb-1">Lore</h3>
            <p className="text-valkaria-400 text-xs">História e lore do universo de Valkária</p>
          </div>
        </div>

        <Button asChild size="lg" className="mt-8">
          <Link href="/chat">Começar Aventura</Link>
        </Button>
      </div>
    </div>
  )
}
