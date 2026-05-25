'use client'

import { useState, useCallback } from 'react'
import { useMutation, useQuery } from '@apollo/client'
import { Shield, Plus, X, Loader2, UserPlus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth/AuthContext'
import {
  AUTHENTICATE_DM,
  REGISTER_PLAYER,
  LIST_PLAYERS,
  type AuthenticateDMMutationResult,
  type RegisterPlayerMutationResult,
  type ListPlayersQueryResult,
  type PlayerProfile,
} from '@/lib/graphql/operations'

// ── DM Login ──────────────────────────────────────────────────────────────────

function DmLoginForm() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { loginDM } = useAuth()

  const [authenticate, { loading }] = useMutation<AuthenticateDMMutationResult>(AUTHENTICATE_DM)

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setError(null)
      try {
        const { data } = await authenticate({ variables: { password } })
        if (data?.authenticateDM.token) {
          loginDM(data.authenticateDM.token)
        }
      } catch {
        setError('Senha incorreta ou erro ao autenticar.')
      }
    },
    [authenticate, password, loginDM],
  )

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-valkaria-800 bg-midnight-900/80 p-8 shadow-xl">
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="rounded-full border border-valkaria-700 bg-valkaria-900/60 p-4">
            <Shield className="h-8 w-8 text-valkaria-400" aria-hidden="true" />
          </div>
          <h1 className="font-serif text-xl font-semibold text-valkaria-100">Acesso do Mestre</h1>
          <p className="text-center text-sm text-valkaria-400">
            Insira a senha do Dungeon Master para acessar o painel.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="dm-password" className="mb-1.5 block text-sm text-valkaria-300">
              Senha
            </label>
            <input
              id="dm-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className={cn(
                'w-full rounded-lg border border-valkaria-800 bg-midnight-800 px-3 py-2',
                'text-sm text-valkaria-100 placeholder-valkaria-600',
                'focus:border-valkaria-600 focus:outline-none focus:ring-1 focus:ring-valkaria-600',
              )}
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-800 bg-red-950/50 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className={cn(
              'flex items-center justify-center gap-2 rounded-lg px-4 py-2.5',
              'bg-valkaria-700 text-sm font-medium text-white transition-colors',
              'hover:bg-valkaria-600 disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Entrar como Mestre
          </button>
        </form>
      </div>
    </div>
  )
}

// ── New Player Form ───────────────────────────────────────────────────────────

interface NewPlayerFormProps {
  onSuccess: (player: PlayerProfile) => void
  onCancel: () => void
}

const CLASS_OPTIONS = ['Guerreiro', 'Mago', 'Ladino', 'Ranger', 'Clérigo']
const RACE_OPTIONS = ['Humano', 'Moreau', 'Qareen', 'Aggelus', 'Sulfure', 'Silfide']

function NewPlayerForm({ onSuccess, onCancel }: NewPlayerFormProps) {
  const [fields, setFields] = useState({
    name: '',
    class: '',
    race: '',
    background: '',
    personality: '',
    interests: '',
  })
  const [error, setError] = useState<string | null>(null)

  const [register, { loading }] = useMutation<RegisterPlayerMutationResult>(REGISTER_PLAYER)

  const handleChange = useCallback((key: string, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setError(null)
      try {
        const { data } = await register({ variables: fields })
        if (data?.registerPlayer) onSuccess(data.registerPlayer)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao criar personagem.')
      }
    },
    [register, fields, onSuccess],
  )

  const inputClass = cn(
    'w-full rounded-lg border border-valkaria-800 bg-midnight-800 px-3 py-2',
    'text-sm text-valkaria-100 placeholder-valkaria-600',
    'focus:border-valkaria-600 focus:outline-none focus:ring-1 focus:ring-valkaria-600',
  )

  return (
    <div className="rounded-xl border border-valkaria-700 bg-midnight-900/80 p-6">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-serif text-lg font-semibold text-valkaria-100">Novo Personagem</h2>
        <button
          onClick={onCancel}
          className="rounded-lg p-1.5 text-valkaria-500 hover:text-valkaria-200 transition-colors"
          aria-label="Fechar formulário"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-valkaria-400">
            Nome
          </label>
          <input
            type="text"
            value={fields.name}
            onChange={(e) => handleChange('name', e.target.value)}
            required
            className={inputClass}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-valkaria-400">
            Classe
          </label>
          <select
            value={fields.class}
            onChange={(e) => handleChange('class', e.target.value)}
            required
            className={cn(inputClass, 'cursor-pointer')}
          >
            <option value="">Selecione...</option>
            {CLASS_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-valkaria-400">
            Raça
          </label>
          <select
            value={fields.race}
            onChange={(e) => handleChange('race', e.target.value)}
            required
            className={cn(inputClass, 'cursor-pointer')}
          >
            <option value="">Selecione...</option>
            {RACE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-valkaria-400">
            História
          </label>
          <textarea
            value={fields.background}
            onChange={(e) => handleChange('background', e.target.value)}
            required
            rows={2}
            className={cn(inputClass, 'resize-none')}
          />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-valkaria-400">
            Personalidade
          </label>
          <textarea
            value={fields.personality}
            onChange={(e) => handleChange('personality', e.target.value)}
            required
            rows={2}
            className={cn(inputClass, 'resize-none')}
          />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-valkaria-400">
            Interesses (separados por vírgula)
          </label>
          <input
            type="text"
            value={fields.interests}
            onChange={(e) => handleChange('interests', e.target.value)}
            required
            placeholder="ex: magia, espadas, tavernas"
            className={inputClass}
          />
        </div>

        {error && (
          <p className="sm:col-span-2 rounded-lg border border-red-800 bg-red-950/50 px-3 py-2 text-xs text-red-300">
            {error}
          </p>
        )}

        <div className="sm:col-span-2 flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-valkaria-800 px-4 py-2 text-sm text-valkaria-400 hover:text-valkaria-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className={cn(
              'flex items-center gap-2 rounded-lg px-4 py-2',
              'bg-valkaria-700 text-sm font-medium text-white transition-colors',
              'hover:bg-valkaria-600 disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Criar Personagem
          </button>
        </div>
      </form>
    </div>
  )
}

// ── Player List ───────────────────────────────────────────────────────────────

function PlayerList() {
  const [showForm, setShowForm] = useState(false)
  const { data, loading, error, refetch } = useQuery<ListPlayersQueryResult>(LIST_PLAYERS)
  const { logout } = useAuth()

  const handlePlayerCreated = useCallback(
    (_player: PlayerProfile) => {
      setShowForm(false)
      void refetch()
    },
    [refetch],
  )

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-valkaria-400" aria-hidden="true" />
          <h1 className="font-serif text-2xl font-semibold text-valkaria-100">Painel do Mestre</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowForm(true)}
            className={cn(
              'flex items-center gap-2 rounded-lg px-3 py-2',
              'bg-valkaria-700 text-sm font-medium text-white transition-colors hover:bg-valkaria-600',
            )}
          >
            <UserPlus className="h-4 w-4" />
            Novo Player
          </button>
          <button
            onClick={logout}
            className="rounded-lg border border-valkaria-800 px-3 py-2 text-sm text-valkaria-400 hover:text-valkaria-200 transition-colors"
          >
            Sair
          </button>
        </div>
      </div>

      {showForm && (
        <div className="mb-6">
          <NewPlayerForm onSuccess={handlePlayerCreated} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-valkaria-400" />
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-red-800 bg-red-950/50 px-4 py-3 text-sm text-red-300">
          Erro ao carregar players: {error.message}
        </p>
      )}

      {data && data.players.length === 0 && !showForm && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Plus className="h-10 w-10 text-valkaria-700" aria-hidden="true" />
          <p className="text-valkaria-400">Nenhum personagem criado ainda.</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-2 text-sm text-valkaria-300 underline hover:text-valkaria-100 transition-colors"
          >
            Criar o primeiro personagem
          </button>
        </div>
      )}

      {data && data.players.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {data.players.map((player) => (
            <div
              key={player.id}
              className="rounded-xl border border-valkaria-800 bg-midnight-900/60 p-4"
            >
              <p className="font-serif font-semibold text-valkaria-100">{player.name}</p>
              <p className="mt-0.5 text-sm text-valkaria-400">
                {player.class} · {player.race}
              </p>
              <p className="mt-1 text-xs text-valkaria-600">
                Criado em {new Date(player.createdAt).toLocaleDateString('pt-BR')}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DmPlayersPage() {
  const { dmToken } = useAuth()
  return dmToken ? <PlayerList /> : <DmLoginForm />
}
