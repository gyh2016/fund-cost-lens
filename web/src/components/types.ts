import type { ReactNode } from 'react'

export type FundType = 'ordinary_index' | 'etf_feeder'

export type ReviewStatus = 'verified' | 'verified_with_issues'

export type FeeDisplayState =
  | 'known'
  | 'not_applicable'
  | 'source_missing'
  | 'unparsed'
  | 'not_listed'

export type SortToken =
  | 'share_code_asc'
  | 'share_name_asc'
  | 'index_name_asc'
  | 'management_rate_fraction_asc'
  | 'management_rate_fraction_desc'
  | 'custody_rate_fraction_asc'
  | 'custody_rate_fraction_desc'
  | 'flat_sales_service_rate_fraction_asc'
  | 'flat_sales_service_rate_fraction_desc'
  | 'ongoing_rate_fraction_asc'
  | 'ongoing_rate_fraction_desc'
  | 'scenario_total_rate_asc'
  | 'scenario_total_rate_desc'
  | 'review_status'
  | 'verified_at_desc'

export type ScenarioMode = 'unset' | 'preset' | 'custom'

export type ScenarioCurrency = 'CNY' | 'USD'

export type PurchasePriceMode = 'standard' | 'discounted'

export interface ScenarioControlValue {
  purchasePriceMode: PurchasePriceMode
  amountMode: ScenarioMode
  amountPreset: string
  amountCustom: string
  holdingMode: ScenarioMode
  holdingPreset: string
  holdingCustom: string
}

export interface FeeTierView {
  id: string
  condition: string
  charge: string
  note?: string
  isMatched?: boolean
  accessibleLabel?: string
}

export interface FeeDisplaySectionView {
  id: string
  label: string
  state: FeeDisplayState
  rows: readonly FeeTierView[]
  note?: string
}

export interface FeeCellView {
  mode: 'all_tiers' | 'matched'
  sections: readonly FeeDisplaySectionView[]
  caption?: string
}

export interface OngoingFeeView {
  management: string
  custody: string
  salesService: string
  salesServiceNote?: string
  total?: string
}

export type ScenarioFeeView =
  | { status: 'idle'; reason?: string }
  | { status: 'loading'; reason?: string }
  | {
      status: 'ready'
      total: string
      ongoing: string
      holdingDays: string
      purchase: string
      redemption: string
      accessibleLabel?: string
    }
  | { status: 'unavailable'; reason: string }
  | { status: 'error'; reason: string }

export interface FundListRow {
  shareCode: string
  shareName: string
  masterName?: string
  shareClass: string
  fundType: FundType
  fundTypeLabel: string
  index: {
    canonicalId: string
    name: string
    code: string
    matchStatusLabel: string
  }
  reviewStatus: ReviewStatus
  verifiedAt: string
  issueCount: number
  currencies: readonly ScenarioCurrency[]
  profile: {
    inceptionDate: string | null
    netAssetCny100m: string | null
    netAssetAsOf: string | null
  }
  purchaseDiscountAvailable: boolean
  ongoing: OngoingFeeView
  purchase: FeeCellView
  redemption: FeeCellView
  scenario: ScenarioFeeView
}

export interface FilterOption {
  value: string
  label: string
  description?: string
  count?: number
}

export interface FundFilterOptions {
  indices: readonly FilterOption[]
  fundTypes: readonly FilterOption[]
  shareClasses: readonly FilterOption[]
  managementRateBands: readonly FilterOption[]
  custodyRateBands: readonly FilterOption[]
  salesServiceStates: readonly FilterOption[]
}

export interface FundFilterState {
  query: string
  indexIds: readonly string[]
  fundTypes: readonly string[]
  shareClasses: readonly string[]
  managementRateBand: string
  custodyRateBand: string
  salesServiceStates: readonly string[]
  sort: SortToken
}

export interface DatasetOverview {
  datasetUpdatedAt: string
  releaseId: string
  currentShares: number
  verifiedShares: number
  sharesWithOpenIssues: number
  currentRules?: number
}

export type PageLoadState = 'loading' | 'ready' | 'error'

export interface PaginationState {
  page: number
  pageSize: 25 | 50
  pageCount: number
  totalItems: number
}

export interface MobileBatchState {
  visibleItems: number
  totalItems: number
  batchSize: number
}

export interface FeeIssueView {
  id: string
  title: string
  description: string
  affectedField?: string
  statusLabel: string
}

export interface FeeSourceView {
  documentId: string
  title: string
  site: string
  url: string
  retrievedAt: string
}

export interface FundDetailView {
  shareCode: string
  shareName: string
  masterName?: string
  shareClass: string
  fundTypeLabel: string
  strategyLabel: string
  reviewStatus: ReviewStatus
  verifiedAt: string
  currencies: readonly ScenarioCurrency[]
  index: {
    name: string
    code: string
    canonicalId: string
    matchStatusLabel: string
  }
  ongoing: OngoingFeeView
  salesServiceSections?: readonly FeeDisplaySectionView[]
  purchaseSections: readonly FeeDisplaySectionView[]
  redemptionSections: readonly FeeDisplaySectionView[]
  scenario: ScenarioFeeView
  scenarioDescription: string
  issues: readonly FeeIssueView[]
  sources: readonly FeeSourceView[]
  schedule: {
    scheduleId: string
    documentId?: string
    validFrom?: string | null
  }
  notes?: readonly string[]
}

export interface StateAction {
  label: string
  onClick: () => void
}

export interface EmptyStateView {
  kind: 'search' | 'filters' | 'dataset'
  title: string
  description: ReactNode
  action?: StateAction
}
