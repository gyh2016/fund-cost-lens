// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ScenarioResourceBanner } from '../../src/components/DataStatus'
import { FundDetailContent } from '../../src/components/FundDetailContent'
import { FeeStateMessage } from '../../src/components/FeeTierTable'

afterEach(cleanup)

describe('状态与错误提示文案', () => {
  it('使用面向用户的场景与费率状态说明', () => {
    render(
      <>
        <ScenarioResourceBanner state="loading" context="list" />
        <ScenarioResourceBanner
          state="error"
          context="detail"
          errorMessage="场景计算数据加载失败。"
          onRetry={vi.fn()}
        />
        <FeeStateMessage state="unparsed" />
        <FeeStateMessage state="not_listed" />
      </>,
    )

    expect(
      screen.getByText('正在准备场景计算，基金列表仍可查看。'),
    ).toBeTruthy()
    expect(
      screen.getByText('场景计算暂不可用，基金详情仍可查看。'),
    ).toBeTruthy()
    expect(screen.getByText('暂时无法读取该费率')).toBeTruthy()
    expect(screen.getByText('公开来源未列出（不代表费率为 0）')).toBeTruthy()
    expect(screen.queryByText('场景计算数据加载失败。')).toBeNull()
  })

  it('详情加载失败时保留可执行的说明', () => {
    render(<FundDetailContent state="error" />)

    expect(screen.getByRole('heading', { name: '暂时无法打开基金详情' })).toBeTruthy()
    expect(
      screen.getByText('请稍后重试，基金列表仍可正常查看。'),
    ).toBeTruthy()
  })
})
