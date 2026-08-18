import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'
import {
  calculateFundScenario,
  toFundListRow,
} from '../../src/app/view-model'
import {
  fundIndexSchema,
  manifestSchema,
  scenarioRulesSchema,
} from '../../src/data/schemas'

const dataRoot = resolve(process.cwd(), 'public/data/fees')
const readJson = (path: string) =>
  JSON.parse(readFileSync(resolve(dataRoot, path), 'utf8')) as unknown
const manifest = manifestSchema.parse(readJson('manifest.json'))
const index = fundIndexSchema.parse(readJson(manifest.assets.index.url))
const scenarioRules = scenarioRulesSchema.parse(
  readJson(manifest.assets.scenario_rules.url),
)

const fundByCode = (shareCode: string) => {
  const fund = index.funds.find((item) => item.share_code === shareCode)
  if (!fund) throw new Error(`测试基金不存在：${shareCode}`)
  return fund
}

const readyScenario = (shareCode: string, holdingDays: string) => {
  const fund = fundByCode(shareCode)
  const calculation = calculateFundScenario(
    fund,
    scenarioRules.funds[shareCode],
    {
      amount: '1000000',
      holdingDays,
      currency: 'CNY',
      purchasePriceMode: 'standard',
    },
  )
  if (calculation?.status !== 'ready') {
    throw new Error(`${shareCode} 在 ${holdingDays} 日场景不可计算`)
  }
  return calculation
}

describe('列表费率状态展示', () => {
  it('优惠模式使用优惠档，并带出成立日期和最新规模', () => {
    const baseFund = fundByCode('000008')
    const baseRules = scenarioRules.funds['000008']
    const discountedRules = {
      ...baseRules,
      purchase_discounted: baseRules.purchase.map((rule) => ({
        ...rule,
        rate_fraction:
          rule.rate_fraction === null
            ? null
            : new Decimal(rule.rate_fraction).div(10).toString(),
        fixed_amount:
          rule.fixed_amount === null || rule.fixed_amount === undefined
            ? rule.fixed_amount
            : new Decimal(rule.fixed_amount).div(10).toString(),
      })),
    }
    const discountedRows = baseFund.table_fees.purchase.frontend.rows.map(
      (row, index) => ({
        ...row,
        charge_text: index === 0
          ? '优惠档 1（东方财富优惠）'
          : `优惠档 ${index + 1}（标准费率）`,
      }),
    )
    const enrichedFund = {
      ...baseFund,
      profile: {
        inception_date: '2013-03-28',
        net_asset_cny_100m: '42.68',
        net_asset_as_of: '2026-06-30',
        source_id: 'eastmoney:000008',
      },
      flags: {
        ...baseFund.flags,
        purchase_discount_available: true,
      },
      table_fees: {
        ...baseFund.table_fees,
        purchase: {
          ...baseFund.table_fees.purchase,
          discounted: {
            ...baseFund.table_fees.purchase.frontend,
            rows: discountedRows,
          },
        },
      },
    }
    const scenario = {
      amount: '100000',
      holdingDays: '30',
      currency: 'CNY' as const,
      purchasePriceMode: 'discounted' as const,
    }
    const calculation = calculateFundScenario(
      enrichedFund,
      discountedRules as typeof baseRules,
      scenario,
    )
    const row = toFundListRow(
      enrichedFund,
      discountedRules as typeof baseRules,
      scenario,
      calculation,
    )

    expect(calculation?.status).toBe('ready')
    if (calculation?.status === 'ready') {
      expect(calculation.purchaseRateFraction).toBe('0.0012')
    }
    expect(row.purchase.caption).toBe('优惠价')
    expect(row.purchase.sections[0].rows[0].charge).toBe('0.12%')
    expect(row.purchase.sections[0].rows[0].note).toBeUndefined()
    expect(row.profile).toEqual({
      inceptionDate: '2013-03-28',
      netAssetCny100m: '42.68',
      netAssetAsOf: '2026-06-30',
    })

    const allTiers = toFundListRow(
      enrichedFund,
      undefined,
      { ...scenario, amount: null, holdingDays: null },
      undefined,
    )
    expect(allTiers.purchase.sections[0].rows[0].charge).toBe('优惠档 1')
    expect(allTiers.purchase.sections[0].rows[0].note).toBeUndefined()
    expect(allTiers.purchase.sections[0].rows[1].note).toBe('此档按标准费率展示')
  })

  it('设置金额后仍把不收取的前端申购费显示为不适用', () => {
    const fund = fundByCode('960022')
    const row = toFundListRow(
      fund,
      scenarioRules.funds[fund.share_code],
      {
        amount: '1000000',
        holdingDays: null,
        currency: 'CNY',
        purchasePriceMode: 'standard',
      },
      undefined,
    )

    expect(row.purchase.mode).toBe('matched')
    expect(row.purchase.sections).toHaveLength(1)
    expect(row.purchase.sections[0].state).toBe('not_applicable')
  })

  it('销售服务费不适用时显示状态文字，同时持续费合计仍保留', () => {
    const fund = fundByCode('519100')
    const row = toFundListRow(
      fund,
      scenarioRules.funds[fund.share_code],
      {
        amount: null,
        holdingDays: null,
        currency: 'CNY',
        purchasePriceMode: 'standard',
      },
      undefined,
    )

    expect(row.ongoing.salesService).toBe('不适用')
    expect(row.ongoing.total).toBe('0.9%')
  })

  it('年度持续费率与持有期折算值在列表中保持各自口径', () => {
    const fund = fundByCode('027056')
    const scenario = {
      amount: '1000000',
      holdingDays: '366',
      currency: 'CNY' as const,
      purchasePriceMode: 'standard' as const,
    }
    const calculation = calculateFundScenario(
      fund,
      scenarioRules.funds[fund.share_code],
      scenario,
    )
    const row = toFundListRow(
      fund,
      scenarioRules.funds[fund.share_code],
      scenario,
      calculation,
    )

    expect(row.ongoing.total).toBe('0.6%')
    expect(row.scenario.status).toBe('ready')
    if (row.scenario.status === 'ready') {
      expect(row.scenario.ongoing).toBe('0.6016%')
      expect(row.scenario.holdingDays).toBe('366')
    }
  })
})

describe('真实分档销售服务费的持续费用折算', () => {
  it('保留 027324 与 027056 在 365 日的相反边界', () => {
    const leftOpen = readyScenario('027324', '365')
    const leftClosed = readyScenario('027056', '365')

    expect(leftOpen.annualOngoingRateFraction).toBe('0.006')
    expect(leftOpen.proratedOngoingRateFraction).toBe('0.006')
    expect(leftClosed.annualOngoingRateFraction).toBe('0.008')
    expect(leftClosed.proratedOngoingRateFraction).toBe('0.008')
  })

  it('五只特殊份额及普通分档份额在 366 日先选档再折算', () => {
    const expected = [
      ['027324', '0.006', '0.0060164383561643835616'],
      ['027056', '0.006', '0.0060164383561643835616'],
      ['026786', '0.002', '0.0020054794520547945205'],
      ['026719', '0.002', '0.0020054794520547945205'],
      ['027455', '0.006', '0.0060164383561643835616'],
      ['026883', '0.006', '0.0060164383561643835616'],
      ['026796', '0.006', '0.0060164383561643835616'],
    ] as const

    for (const [shareCode, annual, prorated] of expected) {
      const result = readyScenario(shareCode, '366')
      expect(result.annualOngoingRateFraction, shareCode).toBe(annual)
      expect(result.proratedOngoingRateFraction, shareCode).toBe(prorated)
      expect(result.totalRateFraction, shareCode).toBe(prorated)
    }
  })
})
