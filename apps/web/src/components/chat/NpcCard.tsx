import { MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AffinityBadge } from './AffinityBadge'
import type { NpcCardData, AffinityLevel } from './types'

interface NpcCardProps {
  data: NpcCardData
  className?: string
}

const BORDER_BY_LEVEL: Record<AffinityLevel, string> = {
  none: 'border-valkaria-800',
  cordial: 'border-blue-700',
  loyal: 'border-emerald-700',
  intimate: 'border-amber-600',
}

export function NpcCard({ data, className }: NpcCardProps) {
  const level: AffinityLevel = data.affinityLevel ?? 'none'
  const borderClass = BORDER_BY_LEVEL[level]

  return (
    <div
      className={cn(
        'relative rounded-lg border bg-midnight-800/80 p-3 shadow-md',
        borderClass,
        className,
      )}
      role="article"
      aria-label={`NPC: ${data.name}`}
    >
      <div className="absolute right-2 top-2">
        <AffinityBadge level={level} />
      </div>

      <div className="pr-20">
        <p className="font-serif text-sm font-semibold text-valkaria-100">{data.name}</p>

        <div className="mt-0.5 flex items-center gap-1 text-xs text-valkaria-400">
          <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span>{data.location}</span>
        </div>

        {data.affinityScore !== undefined && (
          <p className="mt-1 text-xs text-valkaria-500">
            Afinidade:{' '}
            <span className="font-medium text-valkaria-300">{data.affinityScore}</span>
          </p>
        )}

        {data.description && (
          <p className="mt-1.5 truncate text-xs text-valkaria-400">{data.description}</p>
        )}
      </div>
    </div>
  )
}
