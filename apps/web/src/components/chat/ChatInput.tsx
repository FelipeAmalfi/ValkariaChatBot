'use client'

import { useRef, useEffect, type KeyboardEvent, type ChangeEvent } from 'react'
import { Send } from 'lucide-react'
import { cn } from '@/lib/utils'

const MAX_CHARS = 2000

interface ChatInputProps {
  onSend: (message: string) => void
  isLoading: boolean
  value: string
  onChange: (value: string) => void
}

export function ChatInput({ onSend, isLoading, value, onChange }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const lineHeight = 24
    const minHeight = lineHeight * 1
    const maxHeight = lineHeight * 4
    el.style.height = `${Math.min(Math.max(el.scrollHeight, minHeight), maxHeight)}px`
  }, [value])

  function handleChange(e: ChangeEvent<HTMLTextAreaElement>) {
    if (e.target.value.length <= MAX_CHARS) {
      onChange(e.target.value)
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  function handleSubmit() {
    const trimmed = value.trim()
    if (!trimmed || isLoading) return
    onSend(trimmed)
    onChange('')
  }

  const remaining = MAX_CHARS - value.length
  const isNearLimit = remaining <= 200

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-end gap-2 rounded-xl border border-valkaria-800 bg-midnight-800/80 px-3 py-2 focus-within:border-valkaria-600 transition-colors">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Fale com o Oráculo de Candessah..."
          disabled={isLoading}
          rows={1}
          aria-label="Mensagem para o Oráculo"
          className={cn(
            'flex-1 resize-none bg-transparent text-sm text-valkaria-100 placeholder:text-valkaria-600',
            'focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
            'min-h-6 leading-6',
          )}
        />

        <button
          onClick={handleSubmit}
          disabled={isLoading || !value.trim()}
          aria-label="Enviar mensagem"
          className={cn(
            'mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors',
            'bg-valkaria-600 text-white hover:bg-valkaria-700',
            'disabled:cursor-not-allowed disabled:opacity-40',
          )}
        >
          <Send className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="flex justify-end px-1">
        <span
          className={cn(
            'text-xs',
            isNearLimit ? 'text-amber-500' : 'text-valkaria-700',
          )}
          aria-live="polite"
          aria-label={`${value.length} de ${MAX_CHARS} caracteres`}
        >
          {value.length}/{MAX_CHARS}
        </span>
      </div>
    </div>
  )
}
