import { cn } from '@/lib/utils'
import type { AffinityLevel } from './types'

interface AffinityBadgeProps {
  level: AffinityLevel
  className?: string
}

const AFFINITY_CONFIG: Record<AffinityLevel, { label: string; className: string }> = {
  none: {
    label: '—',
    className: 'bg-valkaria-900/60 text-valkaria-500 border-valkaria-700',
  },
  cordial: {
    label: 'Cordial',
    className: 'bg-blue-950/60 text-blue-400 border-blue-700',
  },
  loyal: {
    label: 'Leal',
    className: 'bg-emerald-950/60 text-emerald-400 border-emerald-700',
  },
  intimate: {
    label: 'Íntimo',
    className: 'bg-amber-950/60 text-amber-400 border-amber-700',
  },
}

export function AffinityBadge({ level, className }: AffinityBadgeProps) {
  const config = AFFINITY_CONFIG[level]

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
        config.className,
        className,
      )}
      aria-label={`Nível de afinidade: ${config.label}`}
    >
      {config.label}
    </span>
  )
}
