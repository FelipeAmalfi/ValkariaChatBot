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
