'use client'

import { useQuery } from '@apollo/client'
import { Heart, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth/AuthContext'
import { GET_AFFINITIES, type GetAffinitiesQueryResult, type AffinityEntry, type AffinityLevel } from '@/lib/graphql/operations'
import { AffinityBadge } from '@/components/chat/AffinityBadge'

const LEVEL_ORDER: AffinityLevel[] = ['intimate', 'loyal', 'cordial', 'none']

const LEVEL_LABEL: Record<AffinityLevel, string> = {
  intimate: 'Íntimo',
  loyal: 'Leal',
  cordial: 'Cordial',
  none: 'Sem afinidade',
}

const BAR_COLOR: Record<AffinityLevel, string> = {
  intimate: 'bg-amber-500',
  loyal: 'bg-emerald-500',
  cordial: 'bg-blue-500',
  none: 'bg-valkaria-700',
}

function AffinityCard({ entry }: { entry: AffinityEntry }) {
  return (
    <div className="rounded-xl border border-valkaria-800 bg-midnight-900/60 p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-serif font-semibold text-valkaria-100">{entry.npcName}</p>
        <AffinityBadge level={entry.level} />
      </div>

      <div className="mb-1 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-valkaria-900">
          <div
            className={cn('h-full rounded-full transition-all', BAR_COLOR[entry.level])}
            style={{ width: `${entry.score}%` }}
            aria-label={`Score de afinidade: ${entry.score}`}
          />
        </div>
        <span className="shrink-0 text-xs text-valkaria-400">{entry.score}/100</span>
      </div>

      <p className="text-xs text-valkaria-600">
        {entry.interactionCount} {entry.interactionCount === 1 ? 'interação' : 'interações'}
      </p>
    </div>
  )
}

function AffinityPanel({ playerName }: { playerName: string }) {
  const { data, loading, error } = useQuery<GetAffinitiesQueryResult>(GET_AFFINITIES, {
    variables: { playerName },
  })

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-valkaria-400" />
      </div>
    )
  }

  if (error) {
    return (
      <p className="rounded-lg border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-300">
        Erro ao carregar afinidades: {error.message}
      </p>
    )
  }

  const entries = data?.affinities ?? []

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <Heart className="h-10 w-10 text-valkaria-700" aria-hidden="true" />
        <p className="text-valkaria-400">Nenhuma afinidade registrada ainda.</p>
        <p className="text-sm text-valkaria-600">
          Interaja com NPCs no{' '}
          <Link href="/chat" className="text-valkaria-400 underline hover:text-valkaria-200">
            chat
          </Link>{' '}
          para construir relacionamentos.
        </p>
      </div>
    )
  }

  const grouped = LEVEL_ORDER.reduce<Record<AffinityLevel, AffinityEntry[]>>(
    (acc, level) => {
      acc[level] = entries.filter((e) => e.level === level)
      return acc
    },
    { intimate: [], loyal: [], cordial: [], none: [] },
  )

  return (
    <div className="flex flex-col gap-8">
      {LEVEL_ORDER.filter((level) => grouped[level].length > 0).map((level) => (
        <section key={level}>
          <h2 className="mb-3 font-serif text-lg font-semibold text-valkaria-200">
            {LEVEL_LABEL[level]}
            <span className="ml-2 text-sm font-normal text-valkaria-500">
              ({grouped[level].length})
            </span>
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {grouped[level].map((entry) => (
              <AffinityCard key={entry.npcName} entry={entry} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

export default function ProfilePage() {
  const { playerName, role } = useAuth()

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8 flex items-center gap-3">
        <Heart className="h-6 w-6 text-valkaria-400" aria-hidden="true" />
        <div>
          <h1 className="font-serif text-2xl font-semibold text-valkaria-100">
            {playerName ? `Perfil de ${playerName}` : 'Perfil'}
          </h1>
          <p className="mt-0.5 text-sm text-valkaria-400">Relacionamentos com NPCs de Candessah</p>
        </div>
      </div>

      {role !== 'PLAYER' || !playerName ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Heart className="h-10 w-10 text-valkaria-700" aria-hidden="true" />
          <p className="text-valkaria-300">Você precisa se identificar como player.</p>
          <p className="text-sm text-valkaria-500">
            Vá ao{' '}
            <Link href="/chat" className="text-valkaria-400 underline hover:text-valkaria-200">
              chat
            </Link>{' '}
            e diga seu nome para o Oráculo.
          </p>
        </div>
      ) : (
        <AffinityPanel playerName={playerName} />
      )}
    </div>
  )
}
