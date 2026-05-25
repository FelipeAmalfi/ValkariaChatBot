'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useMutation, useApolloClient } from '@apollo/client'
import { Eye, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CHAT_MUTATION, GET_NPC, type ChatMutationResult, type NpcQueryResult } from '@/lib/graphql/operations'
import { useAuth } from '@/lib/auth/AuthContext'
import { MessageBubble } from './MessageBubble'
import { ChatInput } from './ChatInput'
import { NpcCard } from './NpcCard'
import type { ChatMessage, NpcCardData } from './types'

const SESSION_KEY = 'valkaria:threadId'

const WELCOME_SUGGESTIONS = [
  'Sou o Mestre',
  'Me fale sobre a taverna',
  'Quais NPCs posso encontrar aqui?',
]

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function extractNpcNames(text: string): string[] {
  const matches = text.matchAll(/\*\*([^*]{2,40})\*\*/g)
  const names: string[] = []
  for (const m of matches) {
    const candidate = m[1]?.trim()
    if (candidate && !names.includes(candidate)) names.push(candidate)
  }
  return names.slice(0, 3)
}

interface ExtendedMessage extends ChatMessage {
  npcCards?: NpcCardData[]
}

export function ChatWindow() {
  const [messages, setMessages] = useState<ExtendedMessage[]>([])
  const [threadId, setThreadId] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [errorText, setErrorText] = useState<string | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const loadingIdRef = useRef<string | null>(null)

  const apollo = useApolloClient()
  const { refreshMe } = useAuth()

  const [sendChat, { loading: isLoading }] = useMutation<
    ChatMutationResult,
    { message: string; threadId?: string }
  >(CHAT_MUTATION)

  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_KEY)
    if (saved) setThreadId(saved)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const dismissError = useCallback(() => setErrorText(null), [])

  const fetchNpcCards = useCallback(
    async (names: string[], _currentPlayerName: string | null): Promise<NpcCardData[]> => {
      const cards: NpcCardData[] = []
      for (const name of names) {
        try {
          const { data } = await apollo.query<NpcQueryResult>({
            query: GET_NPC,
            variables: { name },
            fetchPolicy: 'cache-first',
          })
          if (data.npc) {
            cards.push({
              name: data.npc.name,
              location: data.npc.location ?? 'Localização desconhecida',
              description: data.npc.description,
            })
          }
        } catch {
          // NPC not found — skip
        }
      }
      return cards
    },
    [apollo],
  )

  const sendMessage = useCallback(
    async (text: string) => {
      setErrorText(null)

      const userMsg: ExtendedMessage = {
        id: generateId(),
        role: 'user',
        content: text,
        timestamp: new Date(),
      }

      const loadingId = generateId()
      loadingIdRef.current = loadingId

      const loadingMsg: ExtendedMessage = {
        id: loadingId,
        role: 'assistant',
        content: '__loading__',
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, userMsg, loadingMsg])

      try {
        const { data } = await sendChat({
          variables: { message: text, threadId: threadId ?? undefined },
        })

        if (!data) throw new Error('Resposta vazia do servidor.')

        const { response, threadId: newThreadId, intent } = data.chat

        const activeThreadId = newThreadId ?? threadId
        if (newThreadId && newThreadId !== threadId) {
          setThreadId(newThreadId)
          sessionStorage.setItem(SESSION_KEY, newThreadId)
        }

        const npcNames = extractNpcNames(response)
        const npcCards = npcNames.length > 0 ? await fetchNpcCards(npcNames, null) : []

        const assistantMsg: ExtendedMessage = {
          id: loadingId,
          role: 'assistant',
          content: response,
          timestamp: new Date(),
          intent,
          npcCards: npcCards.length > 0 ? npcCards : undefined,
        }

        setMessages((prev) =>
          prev.map((m) => (m.id === loadingId ? assistantMsg : m)),
        )

        if (activeThreadId) {
          refreshMe(activeThreadId).catch(() => {})
        }
      } catch {
        setMessages((prev) => prev.filter((m) => m.id !== loadingId))
        setErrorText('Não foi possível contactar o Oráculo. Tente novamente.')
      }
    },
    [sendChat, threadId, fetchNpcCards, refreshMe],
  )

  const handleSuggestion = useCallback(
    (suggestion: string) => {
      void sendMessage(suggestion)
    },
    [sendMessage],
  )

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
            <div className="rounded-full border border-valkaria-700 bg-valkaria-900/50 p-5">
              <Eye className="h-10 w-10 text-valkaria-400" aria-hidden="true" />
            </div>

            <div>
              <h2 className="font-serif text-2xl font-semibold text-valkaria-100">
                O Oráculo de Candessah
              </h2>
              <p className="mt-2 text-sm text-valkaria-400">
                Diga seu nome para começar sua jornada...
              </p>
            </div>

            <div className="flex flex-col items-center gap-2 sm:flex-row">
              {WELCOME_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSuggestion(suggestion)}
                  className={cn(
                    'rounded-full border border-valkaria-700 bg-valkaria-900/40 px-4 py-2',
                    'text-sm text-valkaria-300 transition-colors',
                    'hover:border-valkaria-500 hover:bg-valkaria-800/60 hover:text-valkaria-100',
                  )}
                  aria-label={`Enviar sugestão: ${suggestion}`}
                >
                  <Sparkles className="mr-1.5 inline h-3 w-3" aria-hidden="true" />
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div
            className="mx-auto flex max-w-3xl flex-col gap-4"
            role="list"
            aria-label="Histórico de mensagens"
          >
            {messages.map((msg) => (
              <div key={msg.id} className="flex gap-3 items-start">
                <div className="flex-1 min-w-0">
                  <MessageBubble message={msg} />
                </div>
                {msg.npcCards && msg.npcCards.length > 0 && (
                  <div className="flex flex-col gap-2 w-48 shrink-0">
                    {msg.npcCards.map((npc) => (
                      <NpcCard key={npc.name} data={npc} />
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {errorText && (
        <div
          className="mx-4 mb-2 flex items-center justify-between rounded-lg border border-red-800 bg-red-950/60 px-4 py-2 text-sm text-red-300"
          role="alert"
          aria-live="assertive"
        >
          <span>{errorText}</span>
          <button
            onClick={dismissError}
            aria-label="Fechar mensagem de erro"
            className="ml-3 text-red-400 hover:text-red-200 transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      <div className="border-t border-valkaria-900/60 bg-midnight-900/80 px-4 py-3 backdrop-blur-sm">
        <div className="mx-auto max-w-3xl">
          <ChatInput
            value={inputValue}
            onChange={setInputValue}
            onSend={sendMessage}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  )
}
