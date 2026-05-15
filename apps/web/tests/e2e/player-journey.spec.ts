/**
 * Player journey E2E tests.
 * Prerequisites: API running on http://localhost:3001 with test data (at least one
 * registered player named "Lyriel"). Web dev server starts automatically via playwright.config.ts.
 */
import { test, expect } from '@playwright/test'

test.describe('Player journey — home page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('home page loads with Valkária branding', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Universo de Valkária/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Chat/i }).first()).toBeVisible()
  })

  test('"Começar Aventura" button navigates to /chat', async ({ page }) => {
    await page.getByRole('link', { name: /Começar Aventura/i }).click()
    await expect(page).toHaveURL('/chat')
    await expect(page.getByText(/O Oráculo de Candessah/i)).toBeVisible()
  })
})

test.describe('Player journey — chat page without auth', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/chat')
  })

  test('shows oracle placeholder when no messages', async ({ page }) => {
    await expect(page.getByText(/O Oráculo de Candessah/i)).toBeVisible()
    await expect(page.getByText(/Diga seu nome para começar/i)).toBeVisible()
  })

  test('shows welcome suggestion buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Sou o Mestre/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Me fale sobre a taverna/i })).toBeVisible()
  })

  test('chat input is visible and accepts text', async ({ page }) => {
    const input = page.getByLabel('Mensagem para o Oráculo')
    await expect(input).toBeVisible()
    await input.fill('Olá, quem és tu?')
    await expect(input).toHaveValue('Olá, quem és tu?')
  })

  test('send button is disabled when input is empty', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Enviar mensagem/i })).toBeDisabled()
  })
})

test.describe('Player journey — navbar links', () => {
  test('navbar does not show Mestre or Perfil links when not authenticated', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('link', { name: /Mestre/i })).not.toBeVisible()
    await expect(page.getByRole('link', { name: /Perfil/i })).not.toBeVisible()
  })
})

test.describe('Player journey — sending a message', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/chat')
  })

  test('sends a message and shows assistant response', async ({ page }) => {
    const input = page.getByLabel('Mensagem para o Oráculo')
    await input.fill('Olá, o que há por aqui?')
    await page.getByRole('button', { name: /Enviar mensagem/i }).click()

    await expect(page.getByText('Olá, o que há por aqui?')).toBeVisible()
    await expect(page.getByRole('list', { name: /Histórico de mensagens/i })).toBeVisible()
  })

  test('pressing Enter sends the message', async ({ page }) => {
    const input = page.getByLabel('Mensagem para o Oráculo')
    await input.fill('Teste via Enter')
    await input.press('Enter')
    await expect(page.getByText('Teste via Enter')).toBeVisible()
  })
})
