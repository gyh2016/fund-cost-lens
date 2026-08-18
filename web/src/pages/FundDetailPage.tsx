import type { FundDetailView, PageLoadState } from '../components/types'
import { FundDetailContent } from '../components/FundDetailContent'
import '../styles/global.css'
import styles from '../styles/catalog.module.css'

export interface FundDetailPageProps {
  state: PageLoadState
  detail?: FundDetailView
  errorMessage?: string
  releaseId?: string
  datasetUpdatedAt?: string
  fundTotal?: number
  onBack: () => void
  onRetry?: () => void
  scenarioResourceState?: 'idle' | 'loading' | 'ready' | 'error'
  scenarioErrorMessage?: string
  onRetryScenario?: () => void
}

export function FundDetailPage({
  state,
  detail,
  errorMessage,
  releaseId,
  datasetUpdatedAt,
  fundTotal,
  onBack,
  onRetry,
  scenarioResourceState,
  scenarioErrorMessage,
  onRetryScenario,
}: FundDetailPageProps) {
  return (
    <div className={styles.appShell}>
      <AppTopbar
        releaseId={releaseId}
        datasetUpdatedAt={datasetUpdatedAt}
        fundTotal={fundTotal}
      />
      <main className={`${styles.pageMain} ${styles.detailPageMain}`}>
        <button className={styles.backButton} type="button" onClick={onBack}>← 返回基金列表</button>
        <div className={styles.detailPageCard}>
          <FundDetailContent
            state={state}
            detail={detail}
            errorMessage={errorMessage}
            onRetry={onRetry}
            scenarioResourceState={scenarioResourceState}
            scenarioErrorMessage={scenarioErrorMessage}
            onRetryScenario={onRetryScenario}
            headingId="page-fund-detail-heading"
          />
        </div>
      </main>
    </div>
  )
}

export interface AppTopbarProps {
  releaseId?: string
  datasetUpdatedAt?: string
  fundTotal?: number
}

export function AppTopbar({
  releaseId,
  datasetUpdatedAt,
  fundTotal,
}: AppTopbarProps) {
  const hasOverview = Boolean(
    releaseId && datasetUpdatedAt && fundTotal !== undefined,
  )

  return (
    <nav className={styles.topbar} aria-label="应用导航">
      <div className={styles.brand}>
        <span className={styles.brandMark} aria-hidden="true">F</span>
        <span><strong>Fund Cost Lens</strong><small>基金费率对比</small></span>
      </div>
      {hasOverview ? (
        <dl className={styles.datasetMeta} aria-label="数据概览">
          <div>
            <dt>数据版本</dt>
            <dd>{releaseId}</dd>
          </div>
          <div>
            <dt>数据日期</dt>
            <dd>{datasetUpdatedAt}</dd>
          </div>
          <div>
            <dt>基金总数</dt>
            <dd>{fundTotal?.toLocaleString('zh-CN')}</dd>
          </div>
        </dl>
      ) : (
        <p className={styles.datasetMetaLoading}>正在读取数据</p>
      )}
    </nav>
  )
}
