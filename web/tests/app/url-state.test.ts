import { describe, expect, it } from 'vitest'
import {
  hasCompleteScenario,
  normalizeScenarioSort,
  parseListUrlState,
  serializeListUrlState,
} from '../../src/app/url-state'

describe('列表 URL 状态', () => {
  it('默认金额和持有期均未设置', () => {
    const state = parseListUrlState(new URLSearchParams())
    expect(state.amountMode).toBe('unset')
    expect(state.amount).toBe('')
    expect(state.holdingMode).toBe('unset')
    expect(state.holdingDays).toBe('')
    expect(state.purchasePriceMode).toBe('discounted')
  })

  it('保留合法场景并忽略冲突的快捷金额', () => {
    const legal = parseListUrlState(
      new URLSearchParams(
        'amount_mode=preset&amount=1000000&holding_days=30',
      ),
    )
    expect(legal.amountMode).toBe('preset')
    expect(legal.amount).toBe('1000000')
    expect(legal.holdingMode).toBe('preset')

    const invalid = parseListUrlState(
      new URLSearchParams('amount_mode=preset&amount=123'),
    )
    expect(invalid.amountMode).toBe('unset')
    expect(invalid.amount).toBe('')
  })

  it('识别新增的三年、五年和十年快捷持有期', () => {
    for (const holdingDays of ['1095', '1825', '3650']) {
      const state = parseListUrlState(
        new URLSearchParams(`holding_days=${holdingDays}`),
      )
      expect(state.holdingMode).toBe('preset')
      expect(state.holdingDays).toBe(holdingDays)
    }
  })

  it('不把未设置状态写入 URL', () => {
    const state = parseListUrlState(new URLSearchParams())
    expect(serializeListUrlState(state).toString()).toBe('')
  })

  it('默认使用优惠价，仅把标准费率写入 URL', () => {
    const standard = parseListUrlState(
      new URLSearchParams('purchase_price=standard'),
    )
    expect(standard.purchasePriceMode).toBe('standard')
    expect(serializeListUrlState(standard).toString()).toBe(
      'purchase_price=standard',
    )

    const unknown = parseListUrlState(
      new URLSearchParams('purchase_price=unknown'),
    )
    expect(unknown.purchasePriceMode).toBe('discounted')
    expect(serializeListUrlState(unknown).has('purchase_price')).toBe(false)
  })

  it('忽略并移除旧网址中的币种参数', () => {
    for (const currency of ['USD', 'CNY']) {
      const state = parseListUrlState(
        new URLSearchParams(`currency=${currency}`),
      )
      expect(state.amountMode).toBe('unset')
      expect(serializeListUrlState(state).has('currency')).toBe(false)
    }
  })

  it('忽略缺少模式的金额，不能借此启用场景总费率排序', () => {
    const state = parseListUrlState(
      new URLSearchParams(
        'amount=1000000&holding_days=30&sort=scenario_total_rate_asc',
      ),
    )
    expect(state.amountMode).toBe('unset')
    expect(state.amount).toBe('')
    expect(hasCompleteScenario(state)).toBe(false)
    expect(normalizeScenarioSort(state).sort).toBe('share_code_asc')
  })
})
