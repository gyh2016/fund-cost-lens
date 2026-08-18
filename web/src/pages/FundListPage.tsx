import type { ReactNode } from 'react'
import type {
  DatasetOverview,
  EmptyStateView,
  FundFilterOptions,
  FundFilterState,
  FundListRow,
  MobileBatchState,
  PageLoadState,
  PaginationState,
  ScenarioControlValue,
  SortToken,
} from '../components/types'
import { AppTopbar } from './FundDetailPage'
import { ScenarioResourceBanner, StatePanel } from '../components/DataStatus'
import { ScenarioFeeControls } from '../components/ScenarioFeeControls'
import { FundFilters } from '../components/FundFilters'
import { FundTable } from '../components/FundTable'
import { FundCardList } from '../components/FundCardList'
import { MobileLoadMore, Pagination } from '../components/Pagination'
import styles from '../styles/catalog.module.css'

export interface FundListPageProps {
  state: PageLoadState
  overview?: DatasetOverview
  errorMessage?: string
  desktopRows: readonly FundListRow[]
  mobileRows: readonly FundListRow[]
  resultCount: number
  totalCount: number
  filters: FundFilterState
  filterOptions: FundFilterOptions
  scenario: ScenarioControlValue
  scenarioControlRevision?: number
  scenarioComplete: boolean
  scenarioResourceState: 'idle' | 'loading' | 'ready' | 'error'
  scenarioErrorMessage?: string
  pagination: PaginationState
  mobileBatch: MobileBatchState
  emptyState?: EmptyStateView
  announcement?: string
  overlay?: ReactNode
  onRetry: () => void
  onRetryScenario?: () => void
  onFiltersChange: (value: FundFilterState) => void
  onClearFilters: () => void
  onScenarioChange: (value: ScenarioControlValue) => void
  onScenarioCommit?: (value: ScenarioControlValue) => void
  onSortChange: (sort: SortToken) => void
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: 25 | 50) => void
  onLoadMore: () => void
  onOpenFund: (shareCode: string) => void
}

export function FundListPage({
  state,
  overview,
  errorMessage,
  desktopRows,
  mobileRows,
  resultCount,
  totalCount,
  filters,
  filterOptions,
  scenario,
  scenarioControlRevision = 0,
  scenarioComplete,
  scenarioResourceState,
  scenarioErrorMessage,
  pagination,
  mobileBatch,
  emptyState,
  announcement,
  overlay,
  onRetry,
  onRetryScenario,
  onFiltersChange,
  onClearFilters,
  onScenarioChange,
  onScenarioCommit,
  onSortChange,
  onPageChange,
  onPageSizeChange,
  onLoadMore,
  onOpenFund,
}: FundListPageProps) {
  const hasResults = state === 'ready' && resultCount > 0
  return (
    <div className={styles.appShell}>
      <AppTopbar
        releaseId={overview?.releaseId}
        datasetUpdatedAt={overview?.datasetUpdatedAt}
        fundTotal={overview?.currentShares}
      />
      <main className={styles.pageMain}>
        <header className={styles.pageIntro}>
          <p className={styles.eyebrow}>基金费率对比</p>
          <h1>Fund Cost Lens</h1>
          <p>仅比较人民币计价的普通指数基金和 ETF 联接基金，不含指数增强基金和纯场内 ETF。</p>
        </header>

        {state === 'ready' && overview ? (
          <>
            <ScenarioFeeControls
              key={scenarioControlRevision}
              value={scenario}
              onChange={onScenarioChange}
              onCommit={onScenarioCommit}
            />
            <ScenarioResourceBanner
              state={scenarioResourceState}
              errorMessage={scenarioErrorMessage}
              onRetry={onRetryScenario}
            />
            <FundFilters
              value={filters}
              options={filterOptions}
              resultCount={resultCount}
              totalCount={totalCount}
              scenarioComplete={scenarioComplete}
              onChange={onFiltersChange}
              onClearAll={onClearFilters}
            />
          </>
        ) : null}

        <p className={styles.srOnly} aria-live="polite" aria-atomic="true">{announcement}</p>

        {state !== 'ready' || !hasResults ? (
          <StatePanel state={state} errorMessage={errorMessage} empty={state === 'ready' ? emptyState : undefined} onRetry={onRetry} />
        ) : (
          <section className={styles.listSection} aria-label="基金费率列表">
            <FundTable
              rows={desktopRows}
              sort={filters.sort}
              scenarioComplete={scenarioComplete}
              onSortChange={onSortChange}
              onOpenFund={onOpenFund}
            />
            <FundCardList rows={mobileRows} onOpenFund={onOpenFund} />
            <Pagination value={pagination} onPageChange={onPageChange} onPageSizeChange={onPageSizeChange} />
            <MobileLoadMore value={mobileBatch} onLoadMore={onLoadMore} />
          </section>
        )}

        <footer className={styles.pageFooter}>
          <p>费率仅供比较，请以基金最新公告及销售平台展示为准。</p>
        </footer>
      </main>
      {overlay}
    </div>
  )
}
