export type Currency = 'CNY' | 'USD'
export type FeeDataState =
  | 'known'
  | 'not_applicable'
  | 'source_missing'
  | 'unparsed'

export interface TierRule {
  lower_bound: string | null
  lower_inclusive: boolean | null
  upper_bound: string | null
  upper_inclusive: boolean | null
  rate_fraction: string | null
  fixed_amount?: string | null
  currency?: Currency | null
}

export interface SalesServiceRule extends TierRule {
  tier_metric: 'none' | 'holding_days'
}

export interface ScenarioFeeRules {
  purchase_currency: Currency | null
  purchase: TierRule[]
  purchase_discounted?: TierRule[]
  redemption: TierRule[]
  purchase_state?: FeeDataState
  redemption_state?: FeeDataState
  sales_service: {
    state: FeeDataState
    rules: SalesServiceRule[]
  }
}

export type PurchasePriceMode = 'standard' | 'discounted'

export type MatchResult<T extends TierRule = TierRule> =
  | { status: 'matched'; rule: T }
  | { status: 'no_match' }
  | { status: 'multiple_matches'; count: number }

export type ScenarioUnavailableReason =
  | 'missing_amount'
  | 'missing_holding_days'
  | 'invalid_amount'
  | 'invalid_holding_days'
  | 'currency_mismatch'
  | 'source_missing'
  | 'unparsed'
  | 'no_unique_tier'
  | 'missing_ongoing_rate'

export type ComponentResult =
  | {
      status: 'ready'
      rateFraction: string
      rule: TierRule
      fixedAmount?: string
    }
  | {
      status: 'idle'
      reason: 'missing_amount' | 'missing_holding_days'
    }
  | {
      status: 'unavailable'
      reason: ScenarioUnavailableReason
    }

export type ScenarioCalculationResult =
  | {
      status: 'idle'
      reason: 'missing_amount' | 'missing_holding_days'
      purchase: ComponentResult
      redemption: ComponentResult
    }
  | {
      status: 'unavailable'
      reason: ScenarioUnavailableReason
      purchase: ComponentResult
      redemption: ComponentResult
    }
  | {
      status: 'ready'
      totalRateFraction: string
      annualOngoingRateFraction: string
      proratedOngoingRateFraction: string
      purchaseRateFraction: string
      redemptionRateFraction: string
      salesServiceRateFraction: string
      purchase: ComponentResult
      redemption: ComponentResult
    }
