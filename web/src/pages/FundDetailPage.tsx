import type { FundDetailView, PageLoadState } from '../components/types'
import type { ThemeMode } from '../app/theme'
import { FundDetailContent } from '../components/FundDetailContent'
import { ThemeToggle } from '../components/ThemeToggle'
import '../styles/global.css'
import styles from '../styles/catalog.module.css'

export interface FundDetailPageProps {
  state: PageLoadState
  theme: ThemeMode
  onThemeChange: (theme: ThemeMode) => void
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
  theme,
  onThemeChange,
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
        theme={theme}
        onThemeChange={onThemeChange}
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
  theme: ThemeMode
  onThemeChange: (theme: ThemeMode) => void
  releaseId?: string
  datasetUpdatedAt?: string
  fundTotal?: number
}

export function AppTopbar({
  theme,
  onThemeChange,
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
        <span><strong>基金费率对比</strong><small>Fund Cost Lens</small></span>
      </div>
      <div className={styles.topbarActions}>
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
        <ThemeToggle value={theme} onChange={onThemeChange} />
      </div>
    </nav>
  )
}
