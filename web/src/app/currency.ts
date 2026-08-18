import type { FundIndexItem } from '../data'

export const USD_FUND_CODES = new Set([
  '000075',
  '000076',
  '110032',
  '110033',
])

export function isVisibleCnyFund(
  fund: Pick<FundIndexItem, 'share_code' | 'currencies'>,
): boolean {
  return fund.currencies.includes('CNY') && !USD_FUND_CODES.has(fund.share_code)
}
