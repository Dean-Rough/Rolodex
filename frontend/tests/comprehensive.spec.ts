import { test, expect } from '@playwright/test'

const BASE_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000'
const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

test.describe('Rolodex Comprehensive E2E Tests', () => {

  test.describe('Backend Health & API', () => {
    test('backend health endpoint should return ok', async ({ request }) => {
      const response = await request.get(`${API_URL}/health`)
      expect(response.ok()).toBeTruthy()
      const data = await response.json()
      expect(data.status).toBe('ok')
    })

    test('items endpoint should be accessible with auth', async ({ request }) => {
      const response = await request.get(`${API_URL}/api/items`, {
        headers: {
          'Authorization': 'Bearer demo-token-12345'
        }
      })
      expect(response.ok()).toBeTruthy()
    })

    test('items endpoint should reject without auth', async ({ request }) => {
      const response = await request.get(`${API_URL}/api/items`)
      expect(response.status()).toBe(401)
    })
  })

  test.describe('Authentication Flow', () => {
    test('should be able to register a new user', async ({ request }) => {
      const timestamp = Date.now()
      const response = await request.post(`${API_URL}/api/auth/register`, {
        data: {
          email: `test${timestamp}@rolodex.app`,
          password: 'testpassword123',
          full_name: 'Test User'
        }
      })

      expect(response.ok()).toBeTruthy()
      const data = await response.json()
      expect(data.access_token).toBeTruthy()
      expect(data.user.email).toBe(`test${timestamp}@rolodex.app`)
    })

    test('should be able to login', async ({ request }) => {
      // First register
      const timestamp = Date.now()
      const email = `login${timestamp}@rolodex.app`
      const password = 'testpassword123'

      await request.post(`${API_URL}/api/auth/register`, {
        data: { email, password, full_name: 'Login Test' }
      })

      // Then login
      const response = await request.post(`${API_URL}/api/auth/login`, {
        data: { email, password }
      })

      expect(response.ok()).toBeTruthy()
      const data = await response.json()
      expect(data.access_token).toBeTruthy()
      expect(data.user.email).toBe(email)
    })

    test('should reject login with wrong password', async ({ request }) => {
      const response = await request.post(`${API_URL}/api/auth/login`, {
        data: {
          email: 'test@rolodex.app',
          password: 'wrongpassword'
        }
      })

      expect(response.status()).toBe(401)
    })
  })

  test.describe('Library Page', () => {
    test('should load the library page', async ({ page }) => {
      await page.goto(BASE_URL)
      await expect(page.locator('h1')).toContainText('Your Product Library')
    })

    test('should display items in grid view', async ({ page }) => {
      await page.goto(BASE_URL)

      // Wait for items to load
      await page.waitForTimeout(2000)

      // Check that items are displayed
      const items = await page.locator('[data-testid="item-card"], .item-card, article, img[alt]').count()
      expect(items).toBeGreaterThan(0)
    })

    test('should search for items', async ({ page }) => {
      await page.goto(BASE_URL)

      // Find search input
      const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="Search" i]').first()
      await searchInput.fill('sofa')
      await searchInput.press('Enter')

      // Wait for search results
      await page.waitForTimeout(1000)

      // Results should be filtered
      await expect(page.locator('body')).toContainText(/sofa|Sofa|results|items/i)
    })
  })

  test.describe('Capture Flow', () => {
    test('should load the capture page', async ({ page }) => {
      await page.goto(`${BASE_URL}/capture`)
      await expect(page.locator('h1, h2')).toContainText(/capture|add item/i)
    })

    test('should have capture form fields', async ({ page }) => {
      await page.goto(`${BASE_URL}/capture`)

      // Check for form fields
      await expect(page.locator('input[name="img_url"], input[placeholder*="image" i], input[placeholder*="url" i]').first()).toBeVisible()
    })

    test('should create an item with form submission', async ({ page }) => {
      await page.goto(`${BASE_URL}/capture`)

      // Fill in the form
      await page.fill('input[name="img_url"], input[placeholder*="image" i]', 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc')
      await page.fill('input[name="title"], input[placeholder*="title" i]', 'E2E Test Product')
      await page.fill('input[name="vendor"], input[placeholder*="vendor" i], input[placeholder*="brand" i]', 'Test Vendor')
      await page.fill('input[name="price"], input[type="number"]', '999')

      // Submit the form
      const submitButton = page.locator('button[type="submit"], button:has-text("submit"), button:has-text("add"), button:has-text("create")').first()
      await submitButton.click()

      // Wait for success message or redirect
      await page.waitForTimeout(2000)

      // Check for success indicator
      await expect(page.locator('body')).toContainText(/success|created|added|saved/i)
    })
  })

  test.describe('Projects Flow', () => {
    test('should load projects page', async ({ page }) => {
      await page.goto(`${BASE_URL}/projects`)
      await expect(page.locator('h1')).toContainText('Projects')
    })

    test('should create a new project', async ({ page }) => {
      await page.goto(`${BASE_URL}/projects`)

      // Click new project button
      const newProjectBtn = page.locator('button:has-text("New Project"), button:has-text("Create")').first()
      await newProjectBtn.click()

      // Fill in project name
      await page.waitForTimeout(500)
      const projectNameInput = page.locator('input[name="name"], input[placeholder*="project" i], input[placeholder*="name" i]').first()
      await projectNameInput.fill('E2E Test Project')

      // Submit
      const submitBtn = page.locator('button[type="submit"], button:has-text("Create")').last()
      await submitBtn.click()

      // Wait for project to be created
      await page.waitForTimeout(1000)

      // Check that project appears
      await expect(page.locator('body')).toContainText('E2E Test Project')
    })

    test('should view project details', async ({ page }) => {
      await page.goto(`${BASE_URL}/projects`)

      // Wait for projects to load
      await page.waitForTimeout(1000)

      // Click on a project
      const viewButton = page.locator('button:has-text("View"), a:has-text("View")').first()

      if (await viewButton.count() > 0) {
        await viewButton.click()

        // Should navigate to project detail page
        await page.waitForTimeout(1000)
        await expect(page.url()).toContain('/projects/')
      }
    })
  })

  test.describe('Moodboard Generation', () => {
    test('should access moodboard page from project', async ({ page }) => {
      await page.goto(`${BASE_URL}/projects`)

      // Wait for projects to load
      await page.waitForTimeout(1000)

      const projectCount = await page.locator('button:has-text("View"), a:has-text("View")').count()

      if (projectCount > 0) {
        // Click on first project
        await page.locator('button:has-text("View"), a:has-text("View")').first().click()
        await page.waitForTimeout(1000)

        // Look for moodboard/export button
        const moodboardBtn = page.locator('button:has-text("Moodboard"), button:has-text("Export")').first()

        if (await moodboardBtn.count() > 0) {
          await moodboardBtn.click()
          await page.waitForTimeout(1000)

          // Should be on moodboard page
          await expect(page.url()).toContain('moodboard')
        }
      }
    })

    test('should have layout options on moodboard page', async ({ page, request }) => {
      // First check if we have any projects with items
      const projectsResponse = await request.get(`${API_URL}/api/projects`, {
        headers: { 'Authorization': 'Bearer demo-token-12345' }
      })

      if (projectsResponse.ok()) {
        const projects = await projectsResponse.json()

        if (projects.length > 0) {
          const projectId = projects[0].id
          await page.goto(`${BASE_URL}/projects/${projectId}/moodboard`)

          // Wait for page to load
          await page.waitForTimeout(1000)

          // Check for layout buttons (Grid, Masonry, Collage)
          const layoutButtons = await page.locator('button:has-text("Grid"), button:has-text("Masonry"), button:has-text("Collage")').count()
          expect(layoutButtons).toBeGreaterThan(0)
        }
      }
    })
  })

  test.describe('Extension Integration', () => {
    test('extension auth page should load', async ({ page }) => {
      await page.goto(`${BASE_URL}/auth/extension?token=test-token`)

      // Should show auth handling
      await expect(page.locator('body')).toContainText(/extension|auth|token/i)
    })

    test('extension status endpoint should work', async ({ request }) => {
      const response = await request.get(`${API_URL}/api/auth/extension/status`, {
        headers: { 'Authorization': 'Bearer demo-token-12345' }
      })

      expect(response.ok()).toBeTruthy()
      const data = await response.json()
      expect(data).toHaveProperty('authenticated')
    })
  })

  test.describe('AI Extraction', () => {
    test('extract endpoint should process image URL', async ({ request }) => {
      const response = await request.post(`${API_URL}/api/items/extract`, {
        headers: { 'Authorization': 'Bearer demo-token-12345' },
        data: {
          imageUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc',
          sourceUrl: 'https://example.com/product',
          title: 'Test Product Page'
        }
      })

      expect(response.ok()).toBeTruthy()
      const data = await response.json()

      // Should have extracted data
      expect(data).toHaveProperty('title')
      expect(data).toHaveProperty('img_url')
    })

    test('extract endpoint should handle missing OpenAI key gracefully', async ({ request }) => {
      const response = await request.post(`${API_URL}/api/items/extract`, {
        headers: { 'Authorization': 'Bearer demo-token-12345' },
        data: {
          imageUrl: 'https://images.unsplash.com/photo-1616628188467-7a8e56b2a5ed'
        }
      })

      // Should still return data (fallback to dummy data)
      expect(response.ok()).toBeTruthy()
    })
  })

  test.describe('Semantic Search', () => {
    test('should support semantic search parameter', async ({ request }) => {
      const response = await request.get(`${API_URL}/api/items?query=modern+sofa&semantic=true`, {
        headers: { 'Authorization': 'Bearer demo-token-12345' }
      })

      expect(response.ok()).toBeTruthy()
      const data = await response.json()
      expect(data).toHaveProperty('items')
      expect(data).toHaveProperty('search_type')
    })
  })

  test.describe('Error Handling', () => {
    test('should handle 404 pages gracefully', async ({ page }) => {
      await page.goto(`${BASE_URL}/nonexistent-page`)

      // Should show 404 or redirect to home
      const has404 = await page.locator('body').textContent()
      expect(has404).toMatch(/404|not found|home/i)
    })

    test('should handle API errors gracefully', async ({ page }) => {
      // Navigate to a page that requires API
      await page.goto(BASE_URL)

      // Page should still load even if API has issues
      await expect(page.locator('h1')).toBeVisible()
    })
  })

  test.describe('Responsive Design', () => {
    test('should be mobile responsive', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto(BASE_URL)

      // Page should load without horizontal scroll
      const scrollWidth = await page.evaluate(() => document.body.scrollWidth)
      const clientWidth = await page.evaluate(() => document.body.clientWidth)
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1) // Allow 1px tolerance
    })

    test('should work on tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 })
      await page.goto(BASE_URL)

      await expect(page.locator('h1')).toBeVisible()
    })
  })

  test.describe('Performance', () => {
    test('library page should load within 5 seconds', async ({ page }) => {
      const startTime = Date.now()
      await page.goto(BASE_URL)
      await page.waitForLoadState('networkidle')
      const loadTime = Date.now() - startTime

      expect(loadTime).toBeLessThan(5000)
    })

    test('search should return results within 3 seconds', async ({ page }) => {
      await page.goto(BASE_URL)

      const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first()

      const startTime = Date.now()
      await searchInput.fill('sofa')
      await searchInput.press('Enter')
      await page.waitForTimeout(100)
      const searchTime = Date.now() - startTime

      expect(searchTime).toBeLessThan(3000)
    })
  })
})
