import Decimal from 'decimal.js'
import { matchTier } from './match-tier'
import type {
  ComponentResult,
  Currency,
  FeeDataState,
  SalesServiceRule,
  ScenarioCalculationResult,
  ScenarioFeeRules,
  ScenarioUnavailableReason,
  PurchasePriceMode,
  TierRule,
} from './types'

interface ScenarioInput {
  amount?: string | null
  holdingDays?: string | null
  currency: Currency
  managementRateFraction: string | null
  custodyRateFraction: string | null
  rules: ScenarioFeeRules
  purchasePriceMode?: PurchasePriceMode
}

function stateReason(
  state: FeeDataState | undefined,
): ScenarioUnavailableReason | undefined {
  if (state === 'source_missing') return 'source_missing'
  if (state === 'unparsed') return 'unparsed'
  return undefined
}

function fromMatchedRule(rule: TierRule, amount?: string): ComponentResult {
  if (rule.rate_fraction !== null) {
    return { status: 'ready', rateFraction: rule.rate_fraction, rule }
  }
  if (rule.fixed_amount !== null && rule.fixed_amount !== undefined && amount) {
    return {
      status: 'ready',
      rateFraction: new Decimal(rule.fixed_amount).div(amount).toString(),
      fixedAmount: rule.fixed_amount,
      rule,
    }
  }
  return { status: 'unavailable', reason: 'no_unique_tier' }
}

export function resolvePurchaseRate(
  rules: ScenarioFeeRules,
  amount: string | null | undefined,
  currency: Currency,
  priceMode: PurchasePriceMode = 'standard',
): ComponentResult {
  if (!amount) return { status: 'idle', reason: 'missing_amount' }
  const unavailable = stateReason(rules.purchase_state)
  if (unavailable) return { status: 'unavailable', reason: unavailable }
  if (rules.purchase_state === 'not_applicable') {
    return {
      status: 'ready',
      rateFraction: '0',
      rule: {
        lower_bound: null,
        lower_inclusive: null,
        upper_bound: null,
        upper_inclusive: null,
        rate_fraction: '0',
      },
    }
  }
  if (rules.purchase_currency && rules.purchase_currency !== currency) {
    return { status: 'unavailable', reason: 'currency_mismatch' }
  }
  const purchaseRules =
    priceMode === 'discounted' && rules.purchase_discounted?.length
      ? rules.purchase_discounted
      : rules.purchase
  const matched = matchTier(purchaseRules, amount)
  if (matched.status !== 'matched') {
    return { status: 'unavailable', reason: 'no_unique_tier' }
  }
  return fromMatchedRule(matched.rule, amount)
}

export function resolveRedemptionRate(
  rules: ScenarioFeeRules,
  holdingDays: string | null | undefined,
): ComponentResult {
  if (!holdingDays) return { status: 'idle', reason: 'missing_holding_days' }
  const unavailable = stateReason(rules.redemption_state)
  if (unavailable) return { status: 'unavailable', reason: unavailable }
  if (rules.redemption_state === 'not_applicable') {
    return {
      status: 'ready',
      rateFraction: '0',
      rule: {
        lower_bound: null,
        lower_inclusive: null,
        upper_bound: null,
        upper_inclusive: null,
        rate_fraction: '0',
      },
    }
  }
  const matched = matchTier(rules.redemption, holdingDays)
  if (matched.status !== 'matched') {
    return { status: 'unavailable', reason: 'no_unique_tier' }
  }
  return fromMatchedRule(matched.rule)
}

export function resolveSalesServiceRate(
  rules: ScenarioFeeRules,
  holdingDays: string | null | undefined,
): ComponentResult {
  if (!holdingDays) {
    return { status: 'idle', reason: 'missing_holding_days' }
  }
  if (rules.sales_service.state === 'not_applicable') {
    return {
      status: 'ready',
      rateFraction: '0',
      rule: {
        lower_bound: null,
        lower_inclusive: null,
        upper_bound: null,
        upper_inclusive: null,
        rate_fraction: '0',
      },
    }
  }
  const unavailable = stateReason(rules.sales_service.state)
  if (unavailable) return { status: 'unavailable', reason: unavailable }

  const allRules = rules.sales_service.rules
  if (!allRules.length) {
    return { status: 'unavailable', reason: 'no_unique_tier' }
  }
  const flat = allRules.filter((rule) => rule.tier_metric === 'none')
  const tiered = allRules.filter(
    (rule): rule is SalesServiceRule => rule.tier_metric === 'holding_days',
  )
  const matched =
    tiered.length > 0
      ? matchTier(tiered, holdingDays)
      : flat.length === 1
        ? { status: 'matched' as const, rule: flat[0] }
        : { status: 'multiple_matches' as const, count: flat.length }
  if (matched.status !== 'matched' || matched.rule.rate_fraction === null) {
    return { status: 'unavailable', reason: 'no_unique_tier' }
  }
  return {
    status: 'ready',
    rateFraction: matched.rule.rate_fraction,
    rule: matched.rule,
  }
}

export function calculateScenario(
  input: ScenarioInput,
): ScenarioCalculationResult {
  const purchase = resolvePurchaseRate(
    input.rules,
    input.amount,
    input.currency,
    input.purchasePriceMode,
  )
  const redemption = resolveRedemptionRate(input.rules, input.holdingDays)

  if (!input.amount) {
    return { status: 'idle', reason: 'missing_amount', purchase, redemption }
  }
  if (!input.holdingDays) {
    return {
      status: 'idle',
      reason: 'missing_holding_days',
      purchase,
      redemption,
    }
  }
  if (purchase.status === 'unavailable') {
    return { status: 'unavailable', reason: purchase.reason, purchase, redemption }
  }
  if (redemption.status === 'unavailable') {
    return {
      status: 'unavailable',
      reason: redemption.reason,
      purchase,
      redemption,
    }
  }
  if (purchase.status !== 'ready' || redemption.status !== 'ready') {
    return {
      status: 'unavailable',
      reason: 'no_unique_tier',
      purchase,
      redemption,
    }
  }
  if (
    input.managementRateFraction === null ||
    input.custodyRateFraction === null
  ) {
    return {
      status: 'unavailable',
      reason: 'missing_ongoing_rate',
      purchase,
      redemption,
    }
  }
  const sales = resolveSalesServiceRate(input.rules, input.holdingDays)
  if (sales.status !== 'ready') {
    return {
      status: 'unavailable',
      reason:
        sales.status === 'unavailable'
          ? sales.reason
          : 'missing_holding_days',
      purchase,
      redemption,
    }
  }

  const annualOngoing = new Decimal(input.managementRateFraction)
    .plus(input.custodyRateFraction)
    .plus(sales.rateFraction)
  const proratedOngoing = annualOngoing
    .mul(input.holdingDays)
    .div(365)
  const total = proratedOngoing
    .plus(purchase.rateFraction)
    .plus(redemption.rateFraction)
  return {
    status: 'ready',
    totalRateFraction: total.toString(),
    annualOngoingRateFraction: annualOngoing.toString(),
    proratedOngoingRateFraction: proratedOngoing.toString(),
    purchaseRateFraction: purchase.rateFraction,
    redemptionRateFraction: redemption.rateFraction,
    salesServiceRateFraction: sales.rateFraction,
    purchase,
    redemption,
  }
}
