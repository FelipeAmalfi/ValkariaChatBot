import { Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChatMessage } from './types'

interface MessageBubbleProps {
  message: ChatMessage
}

const INTENT_LABELS: Record<string, string> = {
  ask_character: 'Personagem',
  ask_location: 'Localização',
  identify_player: 'Identidade',
  ask_recommendation: 'Recomendação',
  ask_lore: 'Lore',
  greet: 'Saudação',
  farewell: 'Despedida',
  ask_quest: 'Missão',
  ask_item: 'Item',
  unknown: 'Geral',
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function LoadingDots() {
  return (
    <span className="inline-flex items-center gap-1" aria-label="Carregando resposta">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-valkaria-400 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  )
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const isLoading = message.content === '__loading__'

  return (
    <div
      className={cn('flex w-full gap-2', isUser ? 'justify-end' : 'justify-start')}
      role="listitem"
    >
      {!isUser && (
        <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-valkaria-700 bg-valkaria-900/60">
          <Eye className="h-3.5 w-3.5 text-valkaria-400" aria-hidden="true" />
        </div>
      )}

      <div className={cn('flex max-w-[75%] flex-col gap-1', isUser ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'rounded-2xl border px-4 py-2.5 text-sm leading-relaxed',
            isUser
              ? 'rounded-tr-sm border-valkaria-600 bg-valkaria-800 text-valkaria-50'
              : 'rounded-tl-sm border-midnight-700 bg-midnight-800 text-valkaria-100',
          )}
        >
          {isLoading ? <LoadingDots /> : message.content}
        </div>

        <div className={cn('flex items-center gap-2', isUser ? 'flex-row-reverse' : 'flex-row')}>
          <span className="text-xs text-valkaria-600">{formatTime(message.timestamp)}</span>

          {!isUser && !isLoading && message.intent && INTENT_LABELS[message.intent] && (
            <span className="rounded-full border border-valkaria-800 bg-valkaria-950/40 px-2 py-0.5 text-xs text-valkaria-500">
              {INTENT_LABELS[message.intent]}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
