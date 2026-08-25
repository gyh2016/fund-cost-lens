import { expect, test } from '@playwright/test'

test('列表搜索、可选场景和详情', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chromium')
  await page.goto('/')

  await expect(
    page.getByRole('heading', { name: '基金费率对比' }),
  ).toBeVisible()
  await expect(page.getByLabel('数据概览')).toContainText('749')

  await page
    .getByRole('searchbox', { name: '搜索基金或指数' })
    .fill('018120')
  const row = page.getByRole('row').filter({ hasText: '018120' })
  await expect(row).toContainText('万家北证50成份指数发起式A')

  await page.getByLabel('快捷金额').check()
  await page.getByLabel('快捷天数').check()
  await expect(page).toHaveURL(/amount=1000000/)
  await expect(page).toHaveURL(/holding_days=30/)
  await expect(row.getByText('适用费率').first()).toBeVisible()

  await row.getByRole('button', { name: '查看详情' }).click()
  await expect(page).toHaveURL(new RegExp('/fund/018120'))
  await expect(
    page.getByRole('heading', { name: '万家北证50成份指数发起式A' }),
  ).toBeVisible()
  await expect(page.getByRole('heading', { name: '数据来源' })).toBeVisible()
})

test('标题层级和色彩模式切换会持久保留', async ({ page }) => {
  await page.goto('/')

  await expect(
    page.getByRole('heading', { level: 1, name: '基金费率对比' }),
  ).toBeVisible()
  await expect(page.locator('main').getByText('Fund Cost Lens')).toBeVisible()

  await page.getByRole('button', { name: '深色模式' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect.poll(() =>
    page.evaluate(() => localStorage.getItem('fund-cost-lens-theme')),
  ).toBe('dark')

  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(
    page.getByRole('button', { name: '深色模式' }),
  ).toHaveAttribute('aria-pressed', 'true')

  await page.getByRole('button', { name: '浅色模式' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
})

test('移动端使用基金卡片并可加载更多', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium')
  await page.goto('/')
  await expect(page.getByLabel('基金费率列表').last()).toBeVisible()
  await expect(page.getByRole('button', { name: '加载更多' })).toBeVisible()
  await page.getByRole('button', { name: '筛选和排序' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
})

test('详情深链接可直接访问', async ({ page }) => {
  await page.goto('/fund/240014')
  await expect(
    page.getByRole('heading', { name: '华宝中证A100ETF联接A' }),
  ).toBeVisible()
  await expect(page.getByText(/二维|40/).first()).toBeVisible()
})

test('639、640、1024 响应式断点与筛选面板切换', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium')
  await page.setViewportSize({ width: 639, height: 900 })
  await page.goto('/')
  await expect(page.getByLabel('基金费率卡片列表')).toBeVisible()
  await expect(page.getByRole('table', { name: /人民币指数基金费率列表/ })).toBeHidden()

  await page.getByRole('button', { name: '筛选和排序' }).click()
  const filterDialog = page.locator('dialog[aria-labelledby]')
    .filter({ hasText: '筛选和排序' })
  await expect(filterDialog).toBeVisible()
  await page.setViewportSize({ width: 640, height: 900 })
  await expect(filterDialog).not.toHaveAttribute('open', '')
  await expect(page.getByRole('table', { name: /人民币指数基金费率列表/ })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: /指数 \/ 类型/ })).toBeHidden()

  await page.setViewportSize({ width: 1024, height: 900 })
  await expect(page.getByRole('columnheader', { name: /指数 \/ 类型/ })).toBeVisible()
})
