import { test, expect } from '@playwright/test'

test('homepage renders welcome heading', async ({ page }) => {
  await page.goto('http://localhost:3000')
  const h1 = page.getByRole('heading', { name: /welcome to rolodex/i })
  await expect(h1).toBeVisible()
})

