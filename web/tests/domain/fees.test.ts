import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'
import {
  calculateScenario,
  formatPercent,
  matchTier,
  parseIntegerInput,
  resolvePurchaseRate,
  type ScenarioFeeRules,
} from '../../src/domain/fees'

const rules: ScenarioFeeRules = {
  purchase_currency: 'CNY',
  purchase: [
    {
      lower_bound: null,
      lower_inclusive: null,
      upper_bound: '1000000',
      upper_inclusive: false,
      rate_fraction: '0.012',
      fixed_amount: null,
    },
    {
      lower_bound: '1000000',
      lower_inclusive: true,
      upper_bound: null,
      upper_inclusive: null,
      rate_fraction: null,
      fixed_amount: '1000',
      currency: 'CNY',
    },
  ],
  purchase_discounted: [
    {
      lower_bound: null,
      lower_inclusive: null,
      upper_bound: '1000000',
      upper_inclusive: false,
      rate_fraction: '0.0012',
      fixed_amount: null,
    },
    {
      lower_bound: '1000000',
      lower_inclusive: true,
      upper_bound: null,
      upper_inclusive: null,
      rate_fraction: null,
      fixed_amount: '100',
      currency: 'CNY',
    },
  ],
  redemption: [
    {
      lower_bound: null,
      lower_inclusive: null,
      upper_bound: '7',
      upper_inclusive: false,
      rate_fraction: '0.015',
    },
    {
      lower_bound: '7',
      lower_inclusive: true,
      upper_bound: null,
      upper_inclusive: null,
      rate_fraction: '0',
    },
  ],
  sales_service: {
    state: 'known',
    rules: [
      {
        tier_metric: 'none',
        lower_bound: null,
        lower_inclusive: null,
        upper_bound: null,
        upper_inclusive: null,
        rate_fraction: '0.002',
      },
    ],
  },
}

describe('正整数输入', () => {
  it('空输入是未设置，非空非法值才报错', () => {
    expect(parseIntegerInput('').kind).toBe('unset')
    expect(parseIntegerInput('1.5').kind).toBe('invalid')
    expect(parseIntegerInput('1,000').kind).toBe('invalid')
    expect(parseIntegerInput('0010')).toEqual({
      kind: 'valid',
      normalized: '10',
    })
  })
})

describe('分档与场景费率', () => {
  it('严格遵守边界开闭', () => {
    expect(matchTier(rules.purchase, '999999').status).toBe('matched')
    const boundary = matchTier(rules.purchase, '1000000')
    expect(boundary.status).toBe('matched')
    if (boundary.status === 'matched') {
      expect(boundary.rule.fixed_amount).toBe('1000')
    }
  })

  it('固定费用按场景金额折算', () => {
    const result = resolvePurchaseRate(rules, '2000000', 'CNY')
    expect(result.status).toBe('ready')
    if (result.status === 'ready') {
      expect(result.rateFraction).toBe('0.0005')
    }
  })

  it('币种不一致时不可计算', () => {
    expect(resolvePurchaseRate(rules, '100000', 'USD')).toEqual({
      status: 'unavailable',
      reason: 'currency_mismatch',
    })
  })

  it('仅在明确选择东方财富优惠价时使用完整优惠规则', () => {
    const standard = resolvePurchaseRate(
      rules,
      '100000',
      'CNY',
      'standard',
    )
    const discounted = resolvePurchaseRate(
      rules,
      '100000',
      'CNY',
      'discounted',
    )
    expect(standard.status).toBe('ready')
    expect(discounted.status).toBe('ready')
    if (standard.status === 'ready' && discounted.status === 'ready') {
      expect(standard.rateFraction).toBe('0.012')
      expect(discounted.rateFraction).toBe('0.0012')
    }
  })

  it('优惠模式的场景总费率使用优惠申购费，其他费用不变', () => {
    const input = {
      amount: '100000',
      holdingDays: '30',
      currency: 'CNY' as const,
      managementRateFraction: '0.005',
      custodyRateFraction: '0.001',
      rules,
    }
    const standard = calculateScenario({
      ...input,
      purchasePriceMode: 'standard',
    })
    const discounted = calculateScenario({
      ...input,
      purchasePriceMode: 'discounted',
    })
    expect(standard.status).toBe('ready')
    expect(discounted.status).toBe('ready')
    if (standard.status === 'ready' && discounted.status === 'ready') {
      expect(discounted.purchaseRateFraction).toBe('0.0012')
      expect(discounted.proratedOngoingRateFraction).toBe(
        standard.proratedOngoingRateFraction,
      )
      expect(discounted.redemptionRateFraction).toBe(
        standard.redemptionRateFraction,
      )
      expect(new Decimal(standard.totalRateFraction).minus(discounted.totalRateFraction).toString()).toBe('0.0108')
    }
  })

  it('两项齐全后按持有天数折算年度持续费用', () => {
    const result = calculateScenario({
      amount: '100000',
      holdingDays: '30',
      currency: 'CNY',
      managementRateFraction: '0.005',
      custodyRateFraction: '0.001',
      rules,
    })
    expect(result.status).toBe('ready')
    if (result.status === 'ready') {
      const prorated = new Decimal('0.008').mul(30).div(365)
      expect(result.annualOngoingRateFraction).toBe('0.008')
      expect(result.proratedOngoingRateFraction).toBe(prorated.toString())
      expect(result.totalRateFraction).toBe(
        prorated.plus('0.012').toString(),
      )
    }
  })

  it('持有一年时等于年度持续费率，持有两年时按两倍累计', () => {
    const calculate = (holdingDays: string) =>
      calculateScenario({
        amount: '100000',
        holdingDays,
        currency: 'CNY',
        managementRateFraction: '0.005',
        custodyRateFraction: '0.001',
        rules,
      })

    const oneYear = calculate('365')
    const twoYears = calculate('730')
    expect(oneYear.status).toBe('ready')
    expect(twoYears.status).toBe('ready')
    if (oneYear.status === 'ready' && twoYears.status === 'ready') {
      expect(oneYear.proratedOngoingRateFraction).toBe('0.008')
      expect(twoYears.proratedOngoingRateFraction).toBe('0.016')
      expect(twoYears.totalRateFraction).toBe('0.028')
    }
  })

  it('固定申购费只按申购金额折算，不再按持有天数折算', () => {
    const calculate = (holdingDays: string) =>
      calculateScenario({
        amount: '2000000',
        holdingDays,
        currency: 'CNY',
        managementRateFraction: '0.005',
        custodyRateFraction: '0.001',
        rules,
      })

    for (const holdingDays of ['30', '365', '730']) {
      const result = calculate(holdingDays)
      expect(result.status).toBe('ready')
      if (result.status === 'ready') {
        expect(result.purchaseRateFraction).toBe('0.0005')
      }
    }
  })

  it('缺少任一输入时保持待完善', () => {
    expect(
      calculateScenario({
        amount: '100000',
        holdingDays: null,
        currency: 'CNY',
        managementRateFraction: '0.005',
        custodyRateFraction: '0.001',
        rules,
      }).status,
    ).toBe('idle')
  })
})

describe('格式化', () => {
  it('费率最多展示四位百分数', () => {
    expect(formatPercent('0.012')).toBe('1.2%')
    expect(formatPercent('0.000123456')).toBe('0.0123%')
    expect(formatPercent('0')).toBe('0%')
  })
})
