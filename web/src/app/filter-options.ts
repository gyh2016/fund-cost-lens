import type {
  FilterOption,
  FundFilterOptions,
  FundFilterState,
} from '../components/types'
import type { FundIndexItem } from '../data'
import type { ListUrlState } from './url-state'
import {
  OTHER_SHARE_CLASS,
  shareClassFilterLabel,
  shareClassFilterValue,
} from './share-class'

function countedOptions(
  funds: FundIndexItem[],
  valueOf: (fund: FundIndexItem) => string | string[],
  labelOf: (value: string) => string = (value) => value,
): FilterOption[] {
  const counts = new Map<string, number>()
  funds.forEach((fund) => {
    const values = valueOf(fund)
    ;new Set(Array.isArray(values) ? values : [values]).forEach((value) =>
      counts.set(value, (counts.get(value) ?? 0) + 1),
    )
  })
  return [...counts]
    .map(([value, count]) => ({ value, label: labelOf(value), count }))
    .sort((a, b) => a.label.localeCompare(b.label, 'zh-CN'))
}

function usefulOptions(
  options: readonly FilterOption[],
  totalFunds: number,
): FilterOption[] {
  return options.filter(
    (option) =>
      option.count !== undefined &&
      option.count > 0 &&
      option.count < totalFunds,
  )
}

function thresholdOptions(
  funds: FundIndexItem[],
  field: 'management_rate_fraction' | 'custody_rate_fraction',
  definitions: readonly { value: string; label: string }[],
): FilterOption[] {
  const seenCounts = new Set<number>()
  return definitions.flatMap((definition) => {
    const limit = Number(definition.value) / 100
    const count = funds.filter((fund) => {
      const value = fund.sort_values[field]
      return value !== null && Number(value) <= limit
    }).length
    if (count === 0 || count === funds.length || seenCounts.has(count)) return []
    seenCounts.add(count)
    return [{ ...definition, count }]
  })
}

function salesServiceState(fund: FundIndexItem): string[] {
  const sales = fund.fees.sales_service
  if (sales.state === 'source_missing') return ['source_missing']
  if (sales.kind === 'tiered') return ['tiered']
  if (
    sales.state === 'not_applicable' ||
    (sales.state === 'known' && sales.rate_fraction === '0')
  ) {
    return ['zero']
  }
  if (
    sales.state === 'known' &&
    sales.rate_fraction !== null &&
    sales.rate_fraction !== undefined &&
    Number(sales.rate_fraction) > 0
  ) {
    return ['nonzero']
  }
  return []
}

export function buildFilterOptions(funds: FundIndexItem[]): FundFilterOptions {
  const indices = new Map<
    string,
    { value: string; label: string; count: number; description: string }
  >()
  funds.forEach((fund) => {
    const current = indices.get(fund.index.canonical_id)
    if (current) current.count += 1
    else {
      indices.set(fund.index.canonical_id, {
        value: fund.index.canonical_id,
        label: fund.index.name,
        description: fund.index.code,
        count: 1,
      })
    }
  })

  const totalFunds = funds.length

  return {
    indices: usefulOptions(
      [...indices.values()].sort((a, b) =>
        a.label.localeCompare(b.label, 'zh-CN'),
      ),
      totalFunds,
    ),
    fundTypes: usefulOptions(
      countedOptions(
        funds,
        (fund) => fund.fund_type,
        (value) =>
          value === 'etf_feeder' ? 'ETF 联接基金' : '普通指数基金',
      ),
      totalFunds,
    ),
    shareClasses: usefulOptions(
      countedOptions(
        funds,
        (fund) => shareClassFilterValue(fund.share_class),
        shareClassFilterLabel,
      ).sort((a, b) => {
        if (a.value === OTHER_SHARE_CLASS) return 1
        if (b.value === OTHER_SHARE_CLASS) return -1
        return a.label.localeCompare(b.label, 'en')
      }),
      totalFunds,
    ),
    managementRateBands: thresholdOptions(
      funds,
      'management_rate_fraction',
      [
        { value: '0.15', label: '不高于 0.15%' },
        { value: '0.30', label: '不高于 0.30%' },
        { value: '0.50', label: '不高于 0.50%' },
      ],
    ),
    custodyRateBands: thresholdOptions(funds, 'custody_rate_fraction', [
      { value: '0.05', label: '不高于 0.05%' },
      { value: '0.10', label: '不高于 0.10%' },
      { value: '0.20', label: '不高于 0.20%' },
    ]),
    salesServiceStates: usefulOptions(
      countedOptions(funds, salesServiceState, (value) =>
        value === 'zero'
          ? '零费率'
          : value === 'nonzero'
            ? '非零费率'
            : value === 'tiered'
              ? '按持有期分档'
              : '来源缺失',
      ),
      totalFunds,
    ),
  }
}

function valuesInOptions<T extends string>(
  values: readonly T[],
  options: readonly FilterOption[],
): T[] {
  const allowed = new Set(options.map((option) => option.value))
  return values.filter((value) => allowed.has(value))
}

function valueInOptions(
  value: string,
  options: readonly FilterOption[],
): string {
  return options.some((option) => option.value === value) ? value : ''
}

export function normalizeFilterUrlState(
  state: ListUrlState,
  options: FundFilterOptions,
): ListUrlState {
  return {
    ...state,
    indices: valuesInOptions(state.indices, options.indices),
    fundTypes: valuesInOptions(state.fundTypes, options.fundTypes),
    shareClasses: valuesInOptions(state.shareClasses, options.shareClasses),
    reviewStatuses: [],
    indexStatuses: [],
    managementMax: valueInOptions(
      state.managementMax,
      options.managementRateBands,
    ),
    custodyMax: valueInOptions(state.custodyMax, options.custodyRateBands),
    salesServices: valuesInOptions(
      state.salesServices,
      options.salesServiceStates,
    ),
    purchaseBackend: [],
    redemptionBackend: [],
    sourceTypes: [],
    sort: state.sort === 'review_status' ? 'share_code_asc' : state.sort,
  }
}

export function urlStateToFilters(state: ListUrlState): FundFilterState {
  return {
    query: state.q,
    indexIds: state.indices,
    fundTypes: state.fundTypes,
    shareClasses: state.shareClasses,
    managementRateBand: state.managementMax,
    custodyRateBand: state.custodyMax,
    salesServiceStates: state.salesServices,
    sort: state.sort,
  }
}

export function filtersToUrlState(
  filters: FundFilterState,
  previous: ListUrlState,
): ListUrlState {
  return {
    ...previous,
    q: filters.query,
    indices: [...filters.indexIds],
    fundTypes: filters.fundTypes.filter(
      (value): value is FundIndexItem['fund_type'] =>
        value === 'ordinary_index' || value === 'etf_feeder',
    ),
    shareClasses: [...filters.shareClasses],
    reviewStatuses: [],
    indexStatuses: [],
    managementMax: filters.managementRateBand,
    custodyMax: filters.custodyRateBand,
    salesServices: filters.salesServiceStates.filter(
      (
        value,
      ): value is 'zero' | 'nonzero' | 'tiered' | 'source_missing' =>
        value === 'zero' ||
        value === 'nonzero' ||
        value === 'tiered' ||
        value === 'source_missing',
    ),
    purchaseBackend: [],
    redemptionBackend: [],
    sourceTypes: [],
    sort: filters.sort,
    page: 1,
  }
}
