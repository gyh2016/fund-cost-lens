// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FundCardList } from '../../src/components/FundCardList'
import { FundTable } from '../../src/components/FundTable'
import type { FundListRow } from '../../src/components'

const row = {
  shareCode: '000008',
  shareName: '测试宽基 A',
  shareClass: 'A',
  fundType: 'ordinary_index',
  fundTypeLabel: '普通指数基金',
  index: {
    canonicalId: 'IDX_TEST',
    name: '测试指数',
    code: '000001',
    matchStatusLabel: '指数目录确认',
  },
  reviewStatus: 'verified',
  verifiedAt: '2026-08-15',
  issueCount: 0,
  currencies: ['CNY'],
  profile: {
    inceptionDate: '2013-03-28',
    netAssetCny100m: '42.68',
    netAssetAsOf: '2026-06-30',
  },
  purchaseDiscountAvailable: true,
  ongoing: {
    management: '0.5%',
    custody: '0.1%',
    salesService: '0%',
    total: '0.6%',
  },
  purchase: {
    mode: 'all_tiers',
    caption: '优惠价',
    sections: [
      {
        id: 'purchase',
        label: '申购时收取',
        state: 'known',
        rows: [
          {
            id: 'purchase-1',
            condition: '申购金额 < 100 万元',
            charge: '0.12%',
          },
        ],
      },
    ],
  },
  redemption: {
    mode: 'all_tiers',
    sections: [],
  },
  scenario: { status: 'idle' },
} satisfies FundListRow

afterEach(cleanup)

describe('基金列表补充信息', () => {
  it('桌面表格和移动卡片都在基金名称区显示资料与优惠价', () => {
    const onOpenFund = vi.fn()
    render(
      <>
        <FundTable
          rows={[row]}
          sort="share_code_asc"
          scenarioComplete={false}
          onSortChange={vi.fn()}
          onOpenFund={onOpenFund}
        />
        <FundCardList rows={[row]} onOpenFund={onOpenFund} />
      </>,
    )

    expect(screen.getAllByText('成立 2013-03-28')).toHaveLength(2)
    expect(
      screen.getAllByText('规模 42.68 亿元（2026-06-30）'),
    ).toHaveLength(2)
    expect(screen.getAllByText('优惠价')).toHaveLength(2)
    expect(screen.queryByText('东方财富优惠价')).toBeNull()
    expect(screen.getAllByText('0.12%')).toHaveLength(2)
    expect(screen.getAllByText('尚未计算')).toHaveLength(2)
    expect(screen.queryByText('设置金额和持有时间后显示')).toBeNull()
  })
})
