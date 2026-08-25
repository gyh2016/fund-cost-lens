// @vitest-environment jsdom

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from '../../src/app/App'

const publicRoot = resolve(process.cwd(), 'public')

describe('完整应用', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/')
    vi.stubGlobal('scrollTo', vi.fn())
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.setAttribute('open', '')
    }
    HTMLDialogElement.prototype.close = function close() {
      this.removeAttribute('open')
      this.dispatchEvent(new Event('close'))
    }
    vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
      const url = new URL(
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.href
            : input.url,
        window.location.href,
      )
      try {
        const body = readFileSync(resolve(publicRoot, url.pathname.slice(1)))
        return new Response(body, {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      } catch {
        return new Response('not found', { status: 404 })
      }
    })
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('加载全量索引、搜索基金并按可选场景折叠费率', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(
      (
        await screen.findAllByText(
          '嘉实中证500ETF联接A',
          {},
          { timeout: 5000 },
        )
    ).length,
    ).toBeGreaterThan(0)
    expect(screen.queryByText(/^753$/)).toBeNull()
    expect(screen.queryByText('全库基金')).toBeNull()
    expect(screen.getByText('数据版本')).toBeTruthy()
    expect(screen.getByText('v1-f86c97aa1c9f')).toBeTruthy()
    expect(screen.getByText('数据日期')).toBeTruthy()
    expect(screen.getByText('基金总数')).toBeTruthy()
    expect(screen.getByText('基金总数').nextElementSibling?.textContent).toBe(
      '749',
    )
    expect(screen.queryByText(/^发布版本/)).toBeNull()
    expect(
      screen.getByText(
          (_, element) =>
            element?.tagName === 'P' &&
          element.textContent === '共 749 只基金',
      ),
    ).toBeTruthy()
    expect(screen.getByText('显示 1–25，共 749 只基金')).toBeTruthy()
    expect(screen.getByText('已显示 30 / 749 只基金')).toBeTruthy()
    expect(screen.getAllByText('类别').length).toBeGreaterThan(0)
    expect(screen.queryByText('份额类')).toBeNull()

    expect(
      (screen.getByDisplayValue('discounted') as HTMLInputElement)
        .checked,
    ).toBe(true)
    await user.click(
      screen.getByDisplayValue('standard'),
    )
    await waitFor(() => {
      expect(
        new URLSearchParams(window.location.search).get('purchase_price'),
      ).toBe('standard')
    })
    await user.click(
      screen.getByDisplayValue('discounted'),
    )
    await waitFor(() => {
      expect(
        new URLSearchParams(window.location.search).get('purchase_price'),
      ).toBeNull()
    })

    const holdingPresets = screen.getByLabelText('快捷持有天数')
    expect(within(holdingPresets).getByRole('option', { name: '1,095 日（3 年）' })).toBeTruthy()
    expect(within(holdingPresets).getByRole('option', { name: '1,825 日（5 年）' })).toBeTruthy()
    expect(within(holdingPresets).getByRole('option', { name: '3,650 日（10 年）' })).toBeTruthy()

    const search = screen.getByRole('searchbox', {
      name: /搜索基金或指数/,
    })
    await user.clear(search)
    await user.type(search, '018120')
    expect((search as HTMLInputElement).type).toBe('text')
    expect(
      screen.getAllByRole('button', { name: '清除搜索' }),
    ).toHaveLength(1)
    expect(
      (await screen.findAllByText('万家北证50成份指数发起式A')).length,
    ).toBeGreaterThan(0)

    await user.click(screen.getByLabelText('快捷金额'))
    await user.click(screen.getByLabelText('快捷天数'))

    await waitFor(() => {
      expect(window.location.search).toContain('amount=1000000')
      expect(window.location.search).toContain('holding_days=30')
      expect(screen.getAllByText(/适用费率/).length).toBeGreaterThan(0)
      expect(
        screen.getAllByText(/持续费用 .*持有 30 日/).length,
      ).toBeGreaterThan(0)
    })
    expect(window.scrollTo).not.toHaveBeenCalled()
  })

  it('只展示人民币基金，并移除旧网址中的币种参数', async () => {
    window.history.replaceState(null, '', '/?currency=USD')
    render(<App />)

    await screen.findAllByText(
      '嘉实中证500ETF联接A',
      {},
      { timeout: 5000 },
    )
    await waitFor(() => {
      expect(new URLSearchParams(window.location.search).has('currency')).toBe(
        false,
      )
    })
    expect(screen.queryByLabelText('币种')).toBeNull()
    expect(screen.queryByText('费率状态')).toBeNull()
    expect(screen.queryByRole('option', { name: '数据状态' })).toBeNull()
    expect(screen.queryByText('来源缺失')).toBeNull()
    expect(screen.queryByText('后端申购')).toBeNull()
    expect(screen.queryByText('后端赎回')).toBeNull()
    expect(screen.queryByText('指数映射')).toBeNull()
    expect(screen.queryByText('来源类型')).toBeNull()

    const amountPresets = screen.getByLabelText('快捷申购金额')
    expect(
      within(amountPresets).getByRole('option', { name: '10 万元' }),
    ).toBeTruthy()
    expect(
      within(amountPresets).queryByRole('option', { name: '10 万美元' }),
    ).toBeNull()
    expect(screen.queryByText('易方达恒生国企ETF联接现汇A')).toBeNull()
    expect(screen.getAllByText('嘉实中证500ETF联接A').length).toBeGreaterThan(0)
    expect(screen.getByText('基金总数').nextElementSibling?.textContent).toBe(
      '749',
    )
  })

  it('不展示四只美元基金的直接详情网址', async () => {
    for (const shareCode of ['000075', '000076', '110032', '110033']) {
      window.history.replaceState(
        null,
        '',
        `/fund/${shareCode}?currency=USD`,
      )
      const view = render(<App />)

      expect(
        await screen.findByText('没有找到该基金。', {}, { timeout: 5000 }),
      ).toBeTruthy()
      expect(
        screen.getByText('基金总数').nextElementSibling?.textContent,
      ).toBe('749')
      await waitFor(() => {
        expect(
          new URLSearchParams(window.location.search).has('currency'),
        ).toBe(false)
      })

      view.unmount()
    }
  })

  it('中文输入法组词期间保留草稿，组词结束后才提交搜索', async () => {
    render(<App />)
    await screen.findAllByText(
      '嘉实中证500ETF联接A',
      {},
      { timeout: 5000 },
    )
    const search = screen.getByRole('searchbox', {
      name: /搜索基金或指数/,
    }) as HTMLInputElement

    fireEvent.compositionStart(search)
    fireEvent.change(search, { target: { value: '沪深' } })
    fireEvent.change(search, { target: { value: '沪深300' } })

    expect(search.value).toBe('沪深300')
    expect(new URLSearchParams(window.location.search).get('q')).toBeNull()

    fireEvent.compositionEnd(search)

    await waitFor(() => {
      expect(new URLSearchParams(window.location.search).get('q')).toBe(
        '沪深300',
      )
    })
    expect(search.value).toBe('沪深300')
    expect(
      (await screen.findAllByText(/华夏沪深300ETF联接A/)).length,
    ).toBeGreaterThan(0)
  })

  it('跟踪指数可按名称或代码搜索，下拉框支持点击外部和 Esc 关闭', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findAllByText(
      '嘉实中证500ETF联接A',
      {},
      { timeout: 5000 },
    )

    const indexSummary = screen
      .getAllByText('全部指数')[0]
      .closest('summary') as HTMLElement
    const indexMenu = indexSummary.closest('details') as HTMLDetailsElement
    await user.click(indexSummary)
    expect(indexMenu.open).toBe(true)

    const optionSearch = within(indexMenu).getByRole('searchbox', {
      name: '搜索跟踪指数',
    })
    await user.type(optionSearch, '000300')
    expect(within(indexMenu).getByText('沪深300')).toBeTruthy()
    expect(within(indexMenu).queryByText('中证500')).toBeNull()

    await user.clear(optionSearch)
    await user.type(optionSearch, '中证500')
    expect(within(indexMenu).getByText('中证500')).toBeTruthy()
    expect(within(indexMenu).queryByText('沪深300')).toBeNull()

    await user.click(
      screen.getByRole('heading', { name: '基金费率对比' }),
    )
    expect(indexMenu.open).toBe(false)

    await user.click(indexSummary)
    expect(indexMenu.open).toBe(true)
    await user.keyboard('{Escape}')
    expect(indexMenu.open).toBe(false)
    expect(document.activeElement).toBe(indexSummary)
  })

  it('从列表打开并关闭基金详情抽屉', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findAllByText(
      '嘉实中证500ETF联接A',
      {},
      { timeout: 5000 },
    )
    const details = screen.getAllByRole('button', { name: '查看详情' })
    const trigger = details[0]
    await user.click(trigger)
    expect(window.location.pathname).toBe('/fund/000008')
    expect(
      await screen.findByText('完整费率与来源', {}, { timeout: 5000 }),
    ).toBeTruthy()
    expect(screen.getByRole('heading', { name: '数据来源' })).toBeTruthy()
    expect(screen.queryByText('来源与费率版本')).toBeNull()
    expect(screen.queryByText('主来源 ID')).toBeNull()
    expect(screen.queryByText('口径说明')).toBeNull()
    expect(screen.queryByText('币种')).toBeNull()
    await user.click(screen.getByRole('button', { name: '关闭基金详情' }))
    await waitFor(() => expect(window.location.pathname).toBe('/'))
    await waitFor(() =>
      expect(
        (document.activeElement as HTMLElement).dataset.fundDetailTrigger,
      ).toBe(trigger.dataset.fundDetailTrigger),
    )
  })

  it('自定义输入留空可编辑，规范化后保留同时更新的搜索状态并在详情标出命中档', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)
    await screen.findAllByText(
      '嘉实中证500ETF联接A',
      {},
      { timeout: 5000 },
    )

    await user.click(screen.getByLabelText('自定义整数'))
    const amountInput = screen.getByPlaceholderText('例如 1250000')
    expect((amountInput as HTMLInputElement).disabled).toBe(false)
    await user.type(amountInput, '001000000')
    await user.type(
      screen.getByRole('searchbox', { name: /搜索基金或指数/ }),
      '018120',
    )

    await waitFor(() => {
      expect(window.location.search).toContain('q=018120')
      expect(window.location.search).toContain('amount_mode=custom')
      expect(window.location.search).toContain('amount=1000000')
    })
    expect((amountInput as HTMLInputElement).value).toBe('1000000')

    await user.click(screen.getByLabelText('快捷天数'))
    await waitFor(() =>
      expect(window.location.search).toContain('holding_days=30'),
    )
    await user.click(screen.getByRole('button', { name: '查看详情' }))

    expect(
      await screen.findByText(
        /人民币 1,000,000 元，持有 30 日；适用档位已高亮/,
        {},
        { timeout: 5000 },
      ),
    ).toBeTruthy()
    await waitFor(() => {
      expect(
        container.querySelectorAll('tr[data-matched="true"]').length,
      ).toBeGreaterThanOrEqual(2)
    })
  })
})
