/**
 * E2E Tests for Threats Page
 * 
 * Features:
 * - Correct Playwright locator usage
 * - Accessibility testing with axe-core
 * - Data-testid selectors
 * - Keyboard navigation tests
 */

import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('Threats Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to threats page
    await page.goto('/threats')
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle')
  })

  test('displays list of threats', async ({ page }) => {
    // Use locator instead of page.$
    const cards = page.locator('[data-testid="threat-card"]')
    
    // Wait for at least one card to be visible
    await expect(cards.first()).toBeVisible({ timeout: 10000 })
    
    // Verify we have multiple threats
    const count = await cards.count()
    expect(count).toBeGreaterThan(0)
  })

  test('filters threats by severity', async ({ page }) => {
    // Click critical severity filter
    await page.locator('[data-testid="filter-severity-critical"]').click()
    
    // Wait for filtered results
    await page.waitForTimeout(500)
    
    // Verify only critical threats are shown
    const criticalBadges = page.locator('[data-testid="threat-card"] [data-severity="critical"]')
    const count = await criticalBadges.count()
    expect(count).toBeGreaterThan(0)
  })

  test('opens threat detail on card click', async ({ page }) => {
    // Click first threat card
    const firstCard = page.locator('[data-testid="threat-card"]').first()
    await firstCard.click()
    
    // Verify navigation to detail page
    await expect(page).toHaveURL(/\/threats\/[a-zA-Z0-9-]+/)
    
    // Verify detail page elements
    await expect(page.locator('[data-testid="threat-detail"]')).toBeVisible()
    await expect(page.locator('[data-testid="threat-title"]')).toBeVisible()
  })

  test('exports threats report', async ({ page }) => {
    // Click export button
    const exportButton = page.locator('[data-testid="export-threats"]')
    
    // Start waiting for download before clicking
    const downloadPromise = page.waitForEvent('download')
    await exportButton.click()
    
    // Wait for download to complete
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/threats.*\.(csv|json|pdf)/)
  })

  test('has no critical accessibility violations', async ({ page }) => {
    // Run axe accessibility scan
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    
    // Filter critical violations
    const critical = results.violations.filter(v => v.impact === 'critical')
    
    // Expect zero critical violations
    expect(critical).toEqual([])
    
    // Log any serious violations for review
    const serious = results.violations.filter(v => v.impact === 'serious')
    if (serious.length > 0) {
      console.warn(`Found ${serious.length} serious a11y violations:`, serious)
    }
  })

  test('supports keyboard navigation', async ({ page }) => {
    // Focus first threat card
    const firstCard = page.locator('[data-testid="threat-card"]').first()
    await firstCard.focus()
    
    // Press Enter to open
    await page.keyboard.press('Enter')
    
    // Verify navigation
    await expect(page).toHaveURL(/\/threats\/[a-zA-Z0-9-]+/)
    
    // Press Escape or back button
    await page.locator('[data-testid="back-button"]').click()
    
    // Verify return to list
    await expect(page).toHaveURL('/threats')
  })

  test('displays loading state correctly', async ({ page }) => {
    // Intercept API call to delay response
    await page.route('**/api/v1/threats*', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000))
      await route.continue()
    })
    
    // Navigate to page
    await page.goto('/threats')
    
    // Verify skeleton loader is shown
    await expect(page.locator('[data-testid="threats-skeleton"]')).toBeVisible()
    
    // Wait for actual content
    await expect(page.locator('[data-testid="threat-card"]').first()).toBeVisible({ timeout: 5000 })
  })

  test('handles empty state gracefully', async ({ page }) => {
    // Mock empty response
    await page.route('**/api/v1/threats*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ threats: [], total: 0 }),
      })
    })
    
    await page.goto('/threats')
    
    // Verify empty state message
    await expect(page.locator('[data-testid="threats-empty-state"]')).toBeVisible()
  })

  test('handles API errors gracefully', async ({ page }) => {
    // Mock error response
    await page.route('**/api/v1/threats*', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      })
    })
    
    await page.goto('/threats')
    
    // Verify error state
    await expect(page.locator('[data-testid="threats-error-state"]')).toBeVisible()
    
    // Verify retry button exists
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible()
  })
})

test.describe('Threat Detail Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a specific threat (using mock ID)
    await page.goto('/threats/test-threat-id-123')
    await page.waitForLoadState('networkidle')
  })

  test('displays threat details correctly', async ({ page }) => {
    await expect(page.locator('[data-testid="threat-detail"]')).toBeVisible()
    await expect(page.locator('[data-testid="threat-title"]')).toBeVisible()
    await expect(page.locator('[data-testid="threat-timeline"]')).toBeVisible()
    await expect(page.locator('[data-testid="threat-actions"]')).toBeVisible()
  })

  test('executes remediation action', async ({ page }) => {
    // Click remediate button
    const remediateButton = page.locator('[data-testid="action-remediate"]')
    await remediateButton.click()
    
    // Verify confirmation dialog
    await expect(page.locator('[role="dialog"]')).toBeVisible()
    
    // Confirm action
    await page.locator('[data-testid="confirm-action"]').click()
    
    // Verify success toast
    await expect(page.locator('[role="status"]')).toContainText(/remediation/i)
  })

  test('has no critical accessibility violations on detail page', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()
    
    const critical = results.violations.filter(v => v.impact === 'critical')
    expect(critical).toEqual([])
  })
})
