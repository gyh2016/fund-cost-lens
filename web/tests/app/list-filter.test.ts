import { describe, expect, it } from 'vitest'
import type { FundIndexItem } from '../../src/data'
import { filterFunds, searchRank, sortFunds } from '../../src/app/list-filter'
import { parseListUrlState, sortTokens } from '../../src/app/url-state'

const fund = {
  share_code: '018120',
  share_name: '万家北证50成份指数发起式A',
  master_name: '万家北证50成份指数发起式',
  index: {
    name: '北证50',
    code: '899050',
    aliases: ['北证五十'],
  },
  currencies: ['CNY'],
  fees: {
    sales_service: {
      state: 'known',
      kind: 'single_rate',
      rate_fraction: '0',
    },
  },
  sort_values: {
    management_rate_fraction: '0.005',
    custody_rate_fraction: '0.001',
  },
  search_terms: [],
} as unknown as FundIndexItem

describe('列表检索与排序', () => {
  it('代码精确匹配优先，别名可以检索', () => {
    expect(searchRank(fund, '018120')).toBe(0)
    expect(searchRank(fund, '018')).toBe(1)
    expect(searchRank(fund, '北证五十')).toBe(4)
  })

  it('升降序都把不可计算值置后', () => {
    const rows = [
      { fund: { ...fund, share_code: '000001' }, scenarioRate: null },
      { fund: { ...fund, share_code: '000002' }, scenarioRate: '0.02' },
      { fund: { ...fund, share_code: '000003' }, scenarioRate: '0.01' },
    ]
    expect(
      sortFunds(rows, 'scenario_total_rate_asc').map(
        (row) => row.fund.share_code,
      ),
    ).toEqual(['000003', '000002', '000001'])
    expect(
      sortFunds(rows, 'scenario_total_rate_desc').map(
        (row) => row.fund.share_code,
      ),
    ).toEqual(['000002', '000003', '000001'])
  })

  it('所有主排序值相同时都按基金代码升序稳定排序', () => {
    const rows = ['000003', '000001', '000002'].map((shareCode) => ({
      fund: {
        ...fund,
        share_code: shareCode,
        share_name: '同名基金',
        review_status: 'verified' as const,
        verified_at: '2026-08-15',
        index: { ...fund.index, name: '同一指数' },
        sort_values: {
          management_rate_fraction: '0.005',
          custody_rate_fraction: null,
          flat_sales_service_rate_fraction: null,
          ongoing_rate_fraction: '0.006',
        },
      },
      scenarioRate: null,
    }))
    const codes = ['000001', '000002', '000003']

    for (const token of sortTokens) {
      expect(
        sortFunds(rows, token).map((row) => row.fund.share_code),
        token,
      ).toEqual(codes)
    }
  })

  it('销售服务费筛选把零费率、不适用、非零和平档分开', () => {
    const salesFunds = [
      ['zero', 'known', 'flat', '0'],
      ['not-applicable', 'not_applicable', 'flat', null],
      ['nonzero', 'known', 'flat', '0.002'],
      ['tiered', 'known', 'tiered', null],
    ].map(([code, state, kind, rate]) => ({
      ...fund,
      share_code: code,
      fees: {
        sales_service: {
          state,
          kind,
          rate_fraction: rate,
        },
      },
      sort_values: {
        management_rate_fraction: '0.005',
        custody_rate_fraction: '0.001',
      },
    })) as unknown as FundIndexItem[]

    const matching = (value: string) =>
      filterFunds(
        salesFunds,
        parseListUrlState(new URLSearchParams(`sales_service=${value}`)),
      ).map((item) => item.share_code)

    expect(matching('zero')).toEqual(['zero', 'not-applicable'])
    expect(matching('nonzero')).toEqual(['nonzero'])
    expect(matching('tiered')).toEqual(['tiered'])
  })

  it('只显示人民币基金，并忽略旧网址中的美元参数', () => {
    const currencyFunds = [
      { ...fund, share_code: '000001', currencies: ['CNY'] },
      { ...fund, share_code: '000075', currencies: ['CNY'] },
      { ...fund, share_code: '000076', currencies: ['CNY'] },
      { ...fund, share_code: '110032', currencies: ['USD'] },
      { ...fund, share_code: '110033', currencies: ['USD'] },
    ] as FundIndexItem[]

    expect(
      filterFunds(
        currencyFunds,
        parseListUrlState(new URLSearchParams()),
      ).map((item) => item.share_code),
    ).toEqual(['000001'])

    expect(
      filterFunds(
        currencyFunds,
        parseListUrlState(new URLSearchParams('currency=USD')),
      ).map((item) => item.share_code),
    ).toEqual(['000001'])
  })

  it('类别筛选将非纯字母类别统一归入其他', () => {
    const shareClassFunds = [
      { ...fund, share_code: '000001', share_class: 'A' },
      { ...fund, share_code: '000002', share_class: 'C' },
      { ...fund, share_code: '000003', share_class: '现汇A' },
      { ...fund, share_code: '000004', share_class: 'unspecified' },
    ] as FundIndexItem[]

    expect(
      filterFunds(
        shareClassFunds,
        parseListUrlState(new URLSearchParams('class=A')),
      ).map((item) => item.share_code),
    ).toEqual(['000001'])

    expect(
      filterFunds(
        shareClassFunds,
        parseListUrlState(new URLSearchParams('class=other')),
      ).map((item) => item.share_code),
    ).toEqual(['000003', '000004'])
  })
})
