import { describe, expect, it } from 'vitest'
import { toFundDetailView } from '../../src/app/view-model'
import type {
  FundDetail,
  FundIndexItem,
  ScenarioFund,
  Source,
} from '../../src/data'
import type { FundListRow } from '../../src/components'

const fund = {
  share_code: '000008',
  share_name: '测试宽基 A',
  master_name: '测试宽基',
  share_class: 'A',
  fund_type: 'ordinary_index',
  review_status: 'verified',
  verified_at: '2026-08-15',
  currencies: ['CNY'],
  index: {
    canonical_id: 'IDX_TEST',
    name: '测试指数',
    code: '000001',
    match_status: 'official_index_directory',
  },
  flags: {
    purchase_discount_available: true,
    special_sales_service_policy: false,
  },
  table_fees: {
    purchase: {
      frontend: {
        state: 'known',
        rows: [
          { condition_text: '申购金额 < 100 万元', charge_text: '1.2%' },
          { condition_text: '申购金额 ≥ 100 万元', charge_text: '1,000 元 / 笔' },
        ],
      },
      discounted: {
        state: 'known',
        rows: [
          {
            condition_text: '申购金额 < 100 万元',
            charge_text: '0.12%（东方财富优惠）',
          },
          {
            condition_text: '申购金额 ≥ 100 万元',
            charge_text: '1,000 元 / 笔（标准费率）',
          },
        ],
      },
    },
  },
} as unknown as FundIndexItem

const detail = {
  profile_source_id: 'profile:000008',
  purchase_discount_source_id: 'discount:000008',
  schedule: {
    schedule_id: 'schedule:000008',
    document_id: 'standard:000008',
    valid_from: null,
  },
  fees: {
    purchase: {
      state: 'known',
      rules: [
        {
          document_id: 'standard:000008',
          tier_no: 1,
          tier_metric: 'purchase_amount',
          tier_unit: 'CNY',
          lower_bound: null,
          lower_inclusive: null,
          upper_bound: '1000000',
          upper_inclusive: false,
          formula_code: 'rate',
          rate_fraction: '0.012',
          fixed_amount: null,
          currency: 'CNY',
          secondary_tier_metric: 'none',
          secondary_tier_unit: 'none',
          secondary_lower_bound: null,
          secondary_lower_inclusive: null,
          secondary_upper_bound: null,
          secondary_upper_inclusive: null,
          source_locator: '标准费率页',
        },
      ],
      issue_ids: [],
    },
  },
  issues: [],
  source_document_ids: ['standard:000008'],
} as unknown as FundDetail

const rules = {
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
      fixed_amount: '1000',
      currency: 'CNY',
    },
  ],
} as unknown as ScenarioFund

const row = {
  ongoing: {
    management: '0.5%',
    custody: '0.1%',
    salesService: '0%',
    total: '0.6%',
  },
  scenario: { status: 'idle' },
} as unknown as FundListRow

const sources = Object.fromEntries(
  ['standard:000008', 'profile:000008', 'discount:000008'].map(
    (id) => [
      id,
      {
        title: id,
        site: '东方财富天天基金',
        url: `https://example.com/${id}`,
        retrieved_at: '2026-08-15',
      } satisfies Source,
    ],
  ),
)

describe('优惠价详情视图', () => {
  it('展示完整优惠分档、高亮命中档并包含补充来源', () => {
    const view = toFundDetailView(
      fund,
      detail,
      sources,
      row,
      {
        amount: '100000',
        holdingDays: '30',
        currency: 'CNY',
        purchasePriceMode: 'discounted',
      },
      rules,
    )

    expect(view.purchaseSections[0].label).toBe('申购费（优惠价）')
    expect(view.purchaseSections[0].note).toBe('来源：东方财富公开页面。')
    expect(view.purchaseSections[0].rows).toHaveLength(2)
    expect(view.purchaseSections[0].rows[0]).toMatchObject({
      charge: '0.12%',
      isMatched: true,
    })
    expect(view.purchaseSections[0].rows[0].note).toBeUndefined()
    expect(view.purchaseSections[0].rows[1]).toMatchObject({
      charge: '1,000 元 / 笔',
      note: '此档按标准费率展示',
      isMatched: false,
    })
    expect(view.sources.map((source) => source.documentId).sort()).toEqual([
      'discount:000008',
      'profile:000008',
      'standard:000008',
    ])
  })

  it('标准费率模式不展示优惠价来源', () => {
    const view = toFundDetailView(
      fund,
      detail,
      sources,
      row,
      {
        amount: '100000',
        holdingDays: '30',
        currency: 'CNY',
        purchasePriceMode: 'standard',
      },
      rules,
    )

    expect(view.purchaseSections[0].label).toBe('申购费（标准费率）')
    expect(view.sources.map((source) => source.documentId).sort()).toEqual([
      'profile:000008',
      'standard:000008',
    ])
  })
})
