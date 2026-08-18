import type { AriaAttributes } from 'react'
import type { FundListRow, SortToken } from './types'
import { InlineFeeTiers, OngoingFeeStack, ScenarioFeeResult } from './FeeDisplay'
import { FundProfileMeta } from './FundProfileMeta'
import styles from '../styles/catalog.module.css'

export interface FundTableProps {
  rows: readonly FundListRow[]
  sort: SortToken
  scenarioComplete: boolean
  onSortChange: (sort: SortToken) => void
  onOpenFund: (shareCode: string) => void
}

export function FundTable({ rows, sort, scenarioComplete, onSortChange, onOpenFund }: FundTableProps) {
  return (
    <div
      className={styles.tableWrap}
      role="region"
      aria-label="基金费率表，可横向滚动"
      tabIndex={0}
    >
      <table className={styles.fundTable}>
        <caption className={styles.srOnly}>人民币指数基金费率列表</caption>
        <thead>
          <tr>
            <SortableHeader
              className={styles.fundColumn}
              label="基金"
              description="按基金代码排序"
              activeSort={sort}
              activeTokens={['share_code_asc', 'share_name_asc']}
              nextSort="share_code_asc"
              onSortChange={onSortChange}
            />
            <SortableHeader
              className={`${styles.indexColumn} ${styles.desktopIndexColumn}`}
              label="指数 / 类型"
              activeSort={sort}
              activeTokens={['index_name_asc']}
              nextSort="index_name_asc"
              onSortChange={onSortChange}
            />
            <SortableHeader
              className={styles.ongoingColumn}
              label="持续费用（年）"
              description="按持续费率排序"
              activeSort={sort}
              activeTokens={['ongoing_rate_fraction_asc', 'ongoing_rate_fraction_desc']}
              nextSort={sort === 'ongoing_rate_fraction_asc' ? 'ongoing_rate_fraction_desc' : 'ongoing_rate_fraction_asc'}
              onSortChange={onSortChange}
            />
            <th className={styles.purchaseColumn} scope="col">申购费</th>
            <th className={styles.redemptionColumn} scope="col">赎回费</th>
            <SortableHeader
              className={styles.totalColumn}
              label="场景总费率"
              activeSort={sort}
              activeTokens={['scenario_total_rate_asc', 'scenario_total_rate_desc']}
              nextSort={sort === 'scenario_total_rate_asc' ? 'scenario_total_rate_desc' : 'scenario_total_rate_asc'}
              disabled={!scenarioComplete}
              onSortChange={onSortChange}
            />
            <th className={styles.statusColumn} scope="col">操作</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((fund) => (
            <tr key={fund.shareCode}>
              <td className={styles.fundColumn}>
                <strong className={styles.fundName}>{fund.shareName}</strong>
                <span className={styles.fundCode}>{fund.shareCode} · {fund.shareClass} 类</span>
                <FundProfileMeta profile={fund.profile} />
                <span className={styles.compactFundMeta}>
                  {fund.index.name}（{fund.index.code}）<br />{fund.fundTypeLabel}
                </span>
              </td>
              <td className={`${styles.indexColumn} ${styles.desktopIndexColumn}`}>
                <strong className={styles.indexName}>{fund.index.name}</strong>
                <span className={styles.secondaryText}>{fund.index.code} · {fund.fundTypeLabel}</span>
              </td>
              <td className={styles.ongoingColumn}><OngoingFeeStack ongoing={fund.ongoing} /></td>
              <td className={styles.purchaseColumn}>
                <InlineFeeTiers fee={fund.purchase} ariaLabel={`${fund.shareName}申购费`} />
              </td>
              <td className={styles.redemptionColumn}>
                <InlineFeeTiers fee={fund.redemption} ariaLabel={`${fund.shareName}赎回费`} />
              </td>
              <td className={styles.totalColumn}><ScenarioFeeResult scenario={fund.scenario} /></td>
              <td className={styles.statusColumn}>
                <div className={styles.rowActions}>
                  <button className={styles.detailButton} type="button" data-fund-detail-trigger={`${fund.shareCode}:table`} onClick={() => onOpenFund(fund.shareCode)}>
                    查看详情
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

interface SortableHeaderProps {
  className?: string
  label: string
  description?: string
  activeSort: SortToken
  activeTokens: readonly SortToken[]
  nextSort: SortToken
  disabled?: boolean
  onSortChange: (sort: SortToken) => void
}

function SortableHeader({
  className,
  label,
  description,
  activeSort,
  activeTokens,
  nextSort,
  disabled = false,
  onSortChange,
}: SortableHeaderProps) {
  const isActive = activeTokens.includes(activeSort)
  const ariaSort: AriaAttributes['aria-sort'] = isActive
    ? activeSort.endsWith('_desc') ? 'descending' : 'ascending'
    : 'none'
  return (
    <th className={className} scope="col" aria-sort={ariaSort}>
      <button
        className={styles.sortHeaderButton}
        type="button"
        disabled={disabled}
        title={disabled ? '设置申购金额和持有天数后可排序' : description}
        onClick={() => onSortChange(nextSort)}
      >
        <span>{label}</span>
        <span className={styles.sortIndicator} aria-hidden="true">{isActive ? (ariaSort === 'descending' ? '↓' : '↑') : '↕'}</span>
      </button>
    </th>
  )
}
