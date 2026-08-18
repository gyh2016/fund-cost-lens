import { describe, expect, it } from 'vitest'
import type { FundIndexItem } from '../../src/data'
import {
  buildFilterOptions,
  normalizeFilterUrlState,
} from '../../src/app/filter-options'
import {
  parseListUrlState,
  serializeListUrlState,
} from '../../src/app/url-state'

interface FundSpec {
  code: string
  indexId: string
  indexName: string
  indexStatus: string
  fundType: 'ordinary_index' | 'etf_feeder'
  shareClass: string
  management: string
  custody: string
  salesState: 'known' | 'not_applicable' | 'source_missing'
  salesKind: string | null
  salesRate: string | null
  purchaseBackend: 'known' | 'not_listed'
  redemptionBackend: 'known' | 'not_listed'
  sourceTypes: Array<
    'eastmoney_standard_rate_page' | 'fund_legal_document'
  >
}

function fund(spec: FundSpec): FundIndexItem {
  return {
    share_code: spec.code,
    fund_type: spec.fundType,
    share_class: spec.shareClass,
    index: {
      canonical_id: spec.indexId,
      code: spec.indexId,
      name: spec.indexName,
      match_status: spec.indexStatus,
    },
    source_types: spec.sourceTypes,
    fees: {
      sales_service: {
        state: spec.salesState,
        kind: spec.salesKind,
        rate_fraction: spec.salesRate,
      },
    },
    flags: {
      purchase_backend_state: spec.purchaseBackend,
      redemption_backend_state: spec.redemptionBackend,
    },
    sort_values: {
      management_rate_fraction: spec.management,
      custody_rate_fraction: spec.custody,
    },
  } as unknown as FundIndexItem
}

const cnyFunds = [
  fund({
    code: '000001',
    indexId: 'index-a',
    indexName: '指数甲',
    indexStatus: 'official_index_directory',
    fundType: 'ordinary_index',
    shareClass: 'A',
    management: '0.0015',
    custody: '0.0005',
    salesState: 'known',
    salesKind: 'single_rate',
    salesRate: '0',
    purchaseBackend: 'known',
    redemptionBackend: 'not_listed',
    sourceTypes: ['eastmoney_standard_rate_page'],
  }),
  fund({
    code: '000002',
    indexId: 'index-b',
    indexName: '指数乙',
    indexStatus: 'name_candidate',
    fundType: 'etf_feeder',
    shareClass: 'C',
    management: '0.003',
    custody: '0.001',
    salesState: 'known',
    salesKind: 'single_rate',
    salesRate: '0.002',
    purchaseBackend: 'not_listed',
    redemptionBackend: 'not_listed',
    sourceTypes: [
      'eastmoney_standard_rate_page',
      'fund_legal_document',
    ],
  }),
  fund({
    code: '000003',
    indexId: 'index-a',
    indexName: '指数甲',
    indexStatus: 'official_index_directory',
    fundType: 'etf_feeder',
    shareClass: 'A',
    management: '0.006',
    custody: '0.0015',
    salesState: 'known',
    salesKind: 'tiered',
    salesRate: null,
    purchaseBackend: 'not_listed',
    redemptionBackend: 'known',
    sourceTypes: ['eastmoney_standard_rate_page'],
  }),
]

const usdFunds = [
  fund({
    code: '110032',
    indexId: 'index-usd',
    indexName: '美元指数',
    indexStatus: 'name_candidate',
    fundType: 'etf_feeder',
    shareClass: '现汇A',
    management: '0.006',
    custody: '0.0015',
    salesState: 'known',
    salesKind: 'single_rate',
    salesRate: '0',
    purchaseBackend: 'not_listed',
    redemptionBackend: 'not_listed',
    sourceTypes: ['eastmoney_standard_rate_page'],
  }),
  fund({
    code: '110033',
    indexId: 'index-usd',
    indexName: '美元指数',
    indexStatus: 'name_candidate',
    fundType: 'etf_feeder',
    shareClass: '现钞A',
    management: '0.006',
    custody: '0.0015',
    salesState: 'known',
    salesKind: 'single_rate',
    salesRate: '0',
    purchaseBackend: 'not_listed',
    redemptionBackend: 'not_listed',
    sourceTypes: ['eastmoney_standard_rate_page'],
  }),
]

describe('数据驱动的筛选选项', () => {
  it('只保留有数据且能缩小结果范围的选项', () => {
    const options = buildFilterOptions(cnyFunds)

    expect(options.managementRateBands.map((option) => option.value)).toEqual([
      '0.15',
      '0.30',
    ])
    expect(options.custodyRateBands.map((option) => option.value)).toEqual([
      '0.05',
      '0.10',
    ])
    expect(options.salesServiceStates.map((option) => option.value)).toEqual(
      expect.arrayContaining(['zero', 'nonzero', 'tiered']),
    )
    expect(options.salesServiceStates.map((option) => option.value)).not.toContain(
      'source_missing',
    )
    expect(options).not.toHaveProperty('indexMatchStatuses')
    expect(options).not.toHaveProperty('purchaseBackendStates')
    expect(options).not.toHaveProperty('redemptionBackendStates')
    expect(options).not.toHaveProperty('sourceTypes')
  })

  it('所有基金都相同的条件不提供筛选项', () => {
    const options = buildFilterOptions(usdFunds)

    expect(options.indices).toEqual([])
    expect(options.fundTypes).toEqual([])
    expect(options.shareClasses).toEqual([])
    expect(options.managementRateBands).toEqual([])
    expect(options.custodyRateBands).toEqual([])
    expect(options.salesServiceStates).toEqual([])
  })

  it('清除已失效、无筛选价值和旧币种 URL 条件', () => {
    const params = new URLSearchParams()
    params.append('class', '现汇A')
    params.append('class', 'A')
    params.set('type', 'etf_feeder')
    params.set('status', 'verified')
    params.set('index_status', 'official_index_directory')
    params.set('management_max', '0.15')
    params.set('sales_service', 'source_missing')
    params.set('purchase_backend', 'known')
    params.set('source', 'fund_legal_document')
    params.set('currency', 'USD')
    params.set('sort', 'review_status')

    const normalized = normalizeFilterUrlState(
      parseListUrlState(params),
      buildFilterOptions(usdFunds),
    )

    expect(normalized.shareClasses).toEqual([])
    expect(normalized.fundTypes).toEqual([])
    expect(normalized.reviewStatuses).toEqual([])
    expect(normalized.indexStatuses).toEqual([])
    expect(normalized.managementMax).toBe('')
    expect(normalized.salesServices).toEqual([])
    expect(normalized.purchaseBackend).toEqual([])
    expect(normalized.redemptionBackend).toEqual([])
    expect(normalized.sourceTypes).toEqual([])
    expect(normalized.sort).toBe('share_code_asc')
    expect(serializeListUrlState(normalized).has('currency')).toBe(false)
  })

  it('类别只保留单字母值，其余值合并为其他', () => {
    const mixedShareClasses = [
      ...cnyFunds,
      { ...cnyFunds[0], share_code: '000004', share_class: '现汇A' },
      { ...cnyFunds[0], share_code: '000005', share_class: 'unspecified' },
    ]

    expect(buildFilterOptions(mixedShareClasses).shareClasses).toEqual([
      { value: 'A', label: 'A', count: 2 },
      { value: 'C', label: 'C', count: 1 },
      { value: 'other', label: '其他', count: 2 },
    ])
  })
})
