import Decimal from 'decimal.js'
import type { Currency, ScenarioUnavailableReason } from './types'

const trimZeros = (value: string): string =>
  value.replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0+$/, '')

export function formatPercent(
  rateFraction: string | null | undefined,
  maximumFractionDigits = 4,
): string {
  if (rateFraction == null) return '—'
  return `${trimZeros(
    new Decimal(rateFraction).mul(100).toFixed(maximumFractionDigits),
  )}%`
}

export function formatMoney(value: string, currency: Currency): string {
  const symbol = currency === 'CNY' ? '¥' : '$'
  return `${symbol}${new Intl.NumberFormat('zh-CN', {
    maximumFractionDigits: 2,
  }).format(new Decimal(value).toNumber())}`
}

export const scenarioReasonLabels: Record<ScenarioUnavailableReason, string> = {
  missing_amount: '请设置申购金额',
  missing_holding_days: '请设置持有天数',
  invalid_amount: '申购金额格式无效',
  invalid_holding_days: '持有天数格式无效',
  currency_mismatch: '币种不匹配',
  source_missing: '公开来源未列出该费率',
  unparsed: '暂时无法读取该费率',
  no_unique_tier: '未找到适用费率档',
  missing_ongoing_rate: '持续费用信息不完整',
}
