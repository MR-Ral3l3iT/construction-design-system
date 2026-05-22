import { test, expect } from '@playwright/test'

test.describe('Admin login', () => {
  test('shows login form', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByPlaceholder(/email/i)).toBeVisible()
    await expect(page.getByPlaceholder(/รหัสผ่าน|password/i)).toBeVisible()
  })

  test('redirects unauthenticated users to /login', async ({ page }) => {
    await page.goto('/admin/customers')
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe('Client Portal login', () => {
  test('shows client login form', async ({ page }) => {
    await page.goto('/client/login')
    await expect(page.getByText('Client Portal')).toBeVisible()
    await expect(page.getByPlaceholder('your@email.com')).toBeVisible()
    await expect(page.getByPlaceholder('••••••••')).toBeVisible()
  })

  test('redirects unauthenticated users to /client/login', async ({ page }) => {
    await page.goto('/client/projects')
    await expect(page).toHaveURL(/\/client\/login/)
  })

  test('shows error on wrong credentials', async ({ page }) => {
    await page.goto('/client/login')
    await page.fill('[placeholder="your@email.com"]', 'noone@example.com')
    await page.fill('[placeholder="••••••••"]', 'wrongpass')
    await page.getByRole('button', { name: /เข้าสู่ระบบ/ }).click()
    await expect(page.getByText(/ไม่ถูกต้อง/)).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Site Portal', () => {
  test('redirects unauthenticated to /login', async ({ page }) => {
    await page.goto('/site/projects')
    await expect(page).toHaveURL(/\/login/)
  })
})
