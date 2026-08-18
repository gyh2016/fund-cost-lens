import Decimal from 'decimal.js'
import type { MatchResult, TierRule } from './types'

function meetsLower(value: Decimal, rule: TierRule): boolean {
  if (rule.lower_bound === null) return true
  const boundary = new Decimal(rule.lower_bound)
  return rule.lower_inclusive ? value.gte(boundary) : value.gt(boundary)
}

function meetsUpper(value: Decimal, rule: TierRule): boolean {
  if (rule.upper_bound === null) return true
  const boundary = new Decimal(rule.upper_bound)
  return rule.upper_inclusive ? value.lte(boundary) : value.lt(boundary)
}

export function matchesTier(rule: TierRule, value: string): boolean {
  const decimal = new Decimal(value)
  return meetsLower(decimal, rule) && meetsUpper(decimal, rule)
}

export function matchTier<T extends TierRule>(
  rules: T[],
  value: string,
): MatchResult<T> {
  const matches = rules.filter((rule) => matchesTier(rule, value))
  if (matches.length === 0) return { status: 'no_match' }
  if (matches.length > 1) {
    return { status: 'multiple_matches', count: matches.length }
  }
  return { status: 'matched', rule: matches[0] }
}
