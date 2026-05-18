/**
 * DM journey E2E tests.
 * Prerequisites: API running on http://localhost:3001. DM password must match DM_PASSWORD env var.
 */
import { test, expect } from '@playwright/test'

test.describe('DM journey — unauthenticated state', () => {
  test('Mestre link is not visible in navbar when not authenticated as DM', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('link', { name: /Mestre/i })).not.toBeVisible()
  })

  test('/dm/players page loads without crash even without auth', async ({ page }) => {
    await page.goto('/dm/players')
    await expect(page).not.toHaveURL(/error/i)
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('DM journey — chat interaction', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/chat')
  })

  test('oracle placeholder shows "Sou o Mestre" suggestion', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Sou o Mestre/i })).toBeVisible()
  })

  test('clicking "Sou o Mestre" sends the identification message', async ({ page }) => {
    await page.getByRole('button', { name: /Sou o Mestre/i }).click()
    await expect(page.getByText('Sou o Mestre')).toBeVisible()
  })

  test('chat accepts DM identification flow messages', async ({ page }) => {
    const input = page.getByLabel('Mensagem para o Oráculo')
    await input.fill('Sou o Mestre')
    await page.getByRole('button', { name: /Enviar mensagem/i }).click()
    await expect(page.getByText('Sou o Mestre')).toBeVisible()
    await expect(page.getByRole('list', { name: /Histórico de mensagens/i })).toBeVisible()
  })
})

test.describe('DM journey — DM panel', () => {
  test('/dm/players page renders the DM players section', async ({ page }) => {
    await page.goto('/dm/players')
    await expect(page.locator('body')).toBeVisible()
    await expect(page).toHaveURL('/dm/players')
  })
})

test.describe('DM journey — access denied for player role', () => {
  test('player role sees DM login form at /dm/players, not player list', async ({ page }) => {
    await page.route('**/api/me', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ playerName: 'Lyriel', role: 'PLAYER', validationState: 'validated' }),
      }),
    )
    await page.goto('/dm/players')
    await expect(page.getByText(/Acesso do Mestre/i)).toBeVisible()
    await expect(page.getByText(/Painel do Mestre/i)).not.toBeVisible()
  })
})

test.describe('DM journey — create player via panel (requires live API)', () => {
  test.skip(!!process.env.CI, 'requires live API + DB')

  test('DM logs in via form and creates a player', async ({ page }) => {
    await page.goto('/dm/players')
    await page.getByLabel('Senha').fill(process.env['DM_PASSWORD'] ?? 'test-dm-pass')
    await page.getByRole('button', { name: /Entrar como Mestre/i }).click()
    await expect(page.getByText(/Painel do Mestre/i)).toBeVisible({ timeout: 15_000 })

    await page.getByRole('button', { name: /Novo Player/i }).click()
    await expect(page.getByText(/Novo Personagem/i)).toBeVisible()

    await page.getByLabel(/Nome/i).fill('Teste E2E')
    await page.getByLabel(/Classe/i).selectOption('Guerreiro')
    await page.getByLabel(/Raça/i).selectOption('Humano')
    await page.getByLabel(/História/i).fill('Criado em terras distantes para testes automatizados')
    await page.getByLabel(/Personalidade/i).fill('Corajoso e determinado')
    await page.getByLabel(/Interesses/i).fill('combate, honra')
    await page.getByRole('button', { name: /Criar Personagem/i }).click()

    await expect(page.getByText('Teste E2E')).toBeVisible({ timeout: 15_000 })
  })
})
