import Decimal from 'decimal.js'
import type { FundIndexItem } from '../data'
import { isVisibleCnyFund } from './currency'
import { shareClassFilterValue } from './share-class'
import type { ListUrlState, SortToken } from './url-state'

const normalize = (value: string): string =>
  value
    .normalize('NFKC')
    .toLocaleLowerCase('zh-CN')
    .replace(/\s+/g, '')

export function searchRank(fund: FundIndexItem, query: string): number {
  if (!query) return 0
  const needle = normalize(query)
  if (normalize(fund.share_code) === needle) return 0
  if (normalize(fund.share_code).startsWith(needle)) return 1
  if (normalize(fund.share_name).includes(needle)) return 2
  if (normalize(fund.master_name).includes(needle)) return 3
  if (
    [fund.index.name, fund.index.code, ...fund.index.aliases].some((value) =>
      normalize(value).includes(needle),
    )
  )
    return 4
  if (fund.search_terms.some((value) => normalize(value).includes(needle)))
    return 5
  return Number.POSITIVE_INFINITY
}

function decimalAtMost(value: string | null, limit: string): boolean {
  if (!limit) return true
  if (value === null || !/^\d+(?:\.\d+)?$/.test(limit)) return false
  try {
    const normalizedLimit = new Decimal(limit).div(100)
    return new Decimal(value).lte(normalizedLimit)
  } catch {
    return false
  }
}

export function filterFunds(
  funds: FundIndexItem[],
  state: ListUrlState,
): FundIndexItem[] {
  return funds
    .map((fund) => ({ fund, rank: searchRank(fund, state.q) }))
    .filter(({ fund, rank }) => {
      if (!Number.isFinite(rank)) return false
      if (!isVisibleCnyFund(fund)) return false
      if (
        state.indices.length &&
        !state.indices.includes(fund.index.canonical_id)
      )
        return false
      if (
        state.fundTypes.length &&
        !state.fundTypes.includes(fund.fund_type)
      )
        return false
      if (
        state.shareClasses.length &&
        !state.shareClasses.includes(shareClassFilterValue(fund.share_class))
      )
        return false
      if (
        state.reviewStatuses.length &&
        !state.reviewStatuses.includes(fund.review_status)
      )
        return false
      if (
        !decimalAtMost(
          fund.sort_values.management_rate_fraction,
          state.managementMax,
        )
      )
        return false
      if (
        !decimalAtMost(
          fund.sort_values.custody_rate_fraction,
          state.custodyMax,
        )
      )
        return false

      const sales = fund.fees.sales_service
      if (state.salesServices.length) {
        const matchedSales = state.salesServices.some((selected) => {
          if (selected === 'source_missing') return sales.state === 'source_missing'
          if (selected === 'tiered') return sales.kind === 'tiered'
          if (selected === 'zero') {
            return (
              sales.state === 'not_applicable' ||
              (sales.state === 'known' &&
                sales.kind !== 'tiered' &&
                sales.rate_fraction === '0')
            )
          }
          return (
            sales.state === 'known' &&
            sales.kind !== 'tiered' &&
            sales.rate_fraction !== null &&
            sales.rate_fraction !== undefined &&
            new Decimal(sales.rate_fraction).gt(0)
          )
        })
        if (!matchedSales) return false
      }
      return true
    })
    .sort((a, b) => a.rank - b.rank)
    .map(({ fund }) => fund)
}

export interface ScenarioSortable {
  fund: FundIndexItem
  scenarioRate: string | null
}

function compareNullableDecimal(
  a: string | null | undefined,
  b: string | null | undefined,
  direction: 'asc' | 'desc',
): number {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  const comparison = new Decimal(a).cmp(new Decimal(b))
  return direction === 'asc' ? comparison : -comparison
}

export function sortFunds<T extends ScenarioSortable>(
  rows: T[],
  token: SortToken,
): T[] {
  const direction = token.endsWith('_desc') ? 'desc' : 'asc'
  return [...rows].sort((a, b) => {
    let compared = 0
    switch (token) {
      case 'share_name_asc':
        compared = a.fund.share_name.localeCompare(b.fund.share_name, 'zh-CN')
        break
      case 'index_name_asc':
        compared = a.fund.index.name.localeCompare(b.fund.index.name, 'zh-CN')
        break
      case 'management_rate_fraction_asc':
      case 'management_rate_fraction_desc':
        compared = compareNullableDecimal(
          a.fund.sort_values.management_rate_fraction,
          b.fund.sort_values.management_rate_fraction,
          direction,
        )
        break
      case 'custody_rate_fraction_asc':
      case 'custody_rate_fraction_desc':
        compared = compareNullableDecimal(
          a.fund.sort_values.custody_rate_fraction,
          b.fund.sort_values.custody_rate_fraction,
          direction,
        )
        break
      case 'flat_sales_service_rate_fraction_asc':
      case 'flat_sales_service_rate_fraction_desc':
        compared = compareNullableDecimal(
          a.fund.sort_values.flat_sales_service_rate_fraction,
          b.fund.sort_values.flat_sales_service_rate_fraction,
          direction,
        )
        break
      case 'ongoing_rate_fraction_asc':
      case 'ongoing_rate_fraction_desc':
        compared = compareNullableDecimal(
          a.fund.sort_values.ongoing_rate_fraction,
          b.fund.sort_values.ongoing_rate_fraction,
          direction,
        )
        break
      case 'scenario_total_rate_asc':
      case 'scenario_total_rate_desc':
        compared = compareNullableDecimal(
          a.scenarioRate,
          b.scenarioRate,
          direction,
        )
        break
      case 'review_status':
        compared = a.fund.review_status.localeCompare(b.fund.review_status)
        break
      case 'verified_at_desc':
        compared = b.fund.verified_at.localeCompare(a.fund.verified_at)
        break
      case 'share_code_asc':
      default:
        compared = a.fund.share_code.localeCompare(b.fund.share_code)
    }
    return compared || a.fund.share_code.localeCompare(b.fund.share_code)
  })
}
