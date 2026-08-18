import type { FundIndexItem } from '../data'

export const amountPresets = [
  '100000',
  '500000',
  '1000000',
  '2000000',
  '5000000',
  '10000000',
] as const

export const holdingDayPresets = [
  '1',
  '7',
  '30',
  '90',
  '180',
  '365',
  '730',
  '1095',
  '1825',
  '3650',
] as const

export const sortTokens = [
  'share_code_asc',
  'share_name_asc',
  'index_name_asc',
  'management_rate_fraction_asc',
  'management_rate_fraction_desc',
  'custody_rate_fraction_asc',
  'custody_rate_fraction_desc',
  'flat_sales_service_rate_fraction_asc',
  'flat_sales_service_rate_fraction_desc',
  'ongoing_rate_fraction_asc',
  'ongoing_rate_fraction_desc',
  'scenario_total_rate_asc',
  'scenario_total_rate_desc',
  'review_status',
  'verified_at_desc',
] as const

export type SortToken = (typeof sortTokens)[number]
export type ScenarioMode = 'unset' | 'preset' | 'custom'
export type PurchasePriceMode = 'standard' | 'discounted'

export interface ListUrlState {
  q: string
  indices: string[]
  fundTypes: Array<FundIndexItem['fund_type']>
  shareClasses: string[]
  reviewStatuses: Array<FundIndexItem['review_status']>
  indexStatuses: string[]
  sourceTypes: Array<'eastmoney_standard_rate_page' | 'fund_legal_document'>
  salesServices: Array<'zero' | 'nonzero' | 'tiered' | 'source_missing'>
  purchaseBackend: string[]
  redemptionBackend: string[]
  managementMax: string
  custodyMax: string
  purchasePriceMode: PurchasePriceMode
  amountMode: ScenarioMode
  amount: string
  holdingMode: ScenarioMode
  holdingDays: string
  sort: SortToken
  page: number
  pageSize: 25 | 50
}

const oneOf = <T extends readonly string[]>(
  value: string | null,
  allowed: T,
): T[number] | undefined =>
  value && allowed.includes(value) ? (value as T[number]) : undefined

const list = (params: URLSearchParams, key: string): string[] =>
  params
    .getAll(key)
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter(Boolean)

const positiveInteger = (value: string | null): string =>
  value && /^[1-9]\d*$/.test(value) ? value : ''

export function parseListUrlState(params: URLSearchParams): ListUrlState {
  const amountMode = oneOf(params.get('amount_mode'), [
    'preset',
    'custom',
  ] as const)
  const amount = positiveInteger(params.get('amount'))
  const validPreset =
    amountMode !== 'preset' ||
    amountPresets.includes(amount as (typeof amountPresets)[number])
  const validAmount = Boolean(amountMode && amount && validPreset)
  const holdingDays = positiveInteger(params.get('holding_days'))

  return {
    q: params.get('q')?.trim() ?? '',
    indices: list(params, 'index'),
    fundTypes: list(params, 'type').filter(
      (value): value is FundIndexItem['fund_type'] =>
        value === 'ordinary_index' || value === 'etf_feeder',
    ),
    shareClasses: list(params, 'class'),
    reviewStatuses: list(params, 'status').filter(
      (value): value is FundIndexItem['review_status'] =>
        value === 'verified' || value === 'verified_with_issues',
    ),
    indexStatuses: list(params, 'index_status'),
    sourceTypes: list(params, 'source').filter(
      (
        value,
      ): value is
        | 'eastmoney_standard_rate_page'
        | 'fund_legal_document' =>
        value === 'eastmoney_standard_rate_page' ||
        value === 'fund_legal_document',
    ),
    salesServices: list(params, 'sales_service').filter(
      (
        value,
      ): value is 'zero' | 'nonzero' | 'tiered' | 'source_missing' =>
        value === 'zero' ||
        value === 'nonzero' ||
        value === 'tiered' ||
        value === 'source_missing',
    ),
    purchaseBackend: list(params, 'purchase_backend'),
    redemptionBackend: list(params, 'redemption_backend'),
    managementMax: params.get('management_max') ?? '',
    custodyMax: params.get('custody_max') ?? '',
    purchasePriceMode:
      params.get('purchase_price') === 'standard'
        ? 'standard'
        : 'discounted',
    amountMode: validAmount ? amountMode! : 'unset',
    amount: validAmount ? amount : '',
    holdingMode: holdingDays
      ? holdingDayPresets.includes(
          holdingDays as (typeof holdingDayPresets)[number],
        )
        ? 'preset'
        : 'custom'
      : 'unset',
    holdingDays,
    sort:
      oneOf(params.get('sort'), sortTokens) ??
      'share_code_asc',
    page: Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1),
    pageSize: params.get('page_size') === '50' ? 50 : 25,
  }
}

export function serializeListUrlState(state: ListUrlState): URLSearchParams {
  const params = new URLSearchParams()
  if (state.q) params.set('q', state.q)
  state.indices.forEach((value) => params.append('index', value))
  state.fundTypes.forEach((value) => params.append('type', value))
  state.shareClasses.forEach((value) => params.append('class', value))
  state.reviewStatuses.forEach((value) => params.append('status', value))
  state.indexStatuses.forEach((value) => params.append('index_status', value))
  state.sourceTypes.forEach((value) => params.append('source', value))
  state.salesServices.forEach((value) =>
    params.append('sales_service', value),
  )
  state.purchaseBackend.forEach((value) =>
    params.append('purchase_backend', value),
  )
  state.redemptionBackend.forEach((value) =>
    params.append('redemption_backend', value),
  )
  if (state.managementMax) params.set('management_max', state.managementMax)
  if (state.custodyMax) params.set('custody_max', state.custodyMax)
  if (state.purchasePriceMode === 'standard') {
    params.set('purchase_price', 'standard')
  }
  if (state.amountMode !== 'unset' && state.amount) {
    params.set('amount_mode', state.amountMode)
    params.set('amount', state.amount)
  }
  if (state.holdingMode !== 'unset' && state.holdingDays) {
    params.set('holding_days', state.holdingDays)
  }
  if (state.sort !== 'share_code_asc') params.set('sort', state.sort)
  if (state.page > 1) params.set('page', String(state.page))
  if (state.pageSize !== 25) params.set('page_size', String(state.pageSize))
  return params
}

export function hasCompleteScenario(state: ListUrlState): boolean {
  return Boolean(state.amount && state.holdingDays)
}

export function normalizeScenarioSort(state: ListUrlState): ListUrlState {
  if (
    !hasCompleteScenario(state) &&
    state.sort.startsWith('scenario_total_rate_')
  ) {
    return { ...state, sort: 'share_code_asc' }
  }
  return state
}
