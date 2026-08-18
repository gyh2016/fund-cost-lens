import type { EmptyStateView, PageLoadState } from './types'
import styles from '../styles/catalog.module.css'

export interface LoadingSkeletonProps {
  rows?: number
  label?: string
}

export function LoadingSkeleton({ rows = 5, label = '正在加载基金费率' }: LoadingSkeletonProps) {
  return (
    <div className={styles.skeletonPanel} role="status" aria-label={label}>
      {Array.from({ length: rows }, (_, index) => (
        <div className={styles.skeletonRow} key={index} aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>
      ))}
      <span className={styles.srOnly}>{label}</span>
    </div>
  )
}

export interface StatePanelProps {
  state: PageLoadState
  errorMessage?: string
  empty?: EmptyStateView
  onRetry?: () => void
}

export function StatePanel({ state, errorMessage, empty, onRetry }: StatePanelProps) {
  if (state === 'loading') return <LoadingSkeleton />

  if (state === 'error') {
    return (
      <section className={`${styles.statePanel} ${styles.systemError}`} role="alert">
        <span className={styles.stateIcon} aria-hidden="true">×</span>
        <div>
          <h2>费率数据加载失败</h2>
          <p>{errorMessage || '请稍后重试。当前筛选条件会保留。'}</p>
          {onRetry ? (
            <button className={styles.primaryButton} type="button" onClick={onRetry}>重新加载</button>
          ) : null}
        </div>
      </section>
    )
  }

  if (!empty) return null

  return (
    <section className={styles.statePanel}>
      <span className={styles.stateIcon} aria-hidden="true">⌕</span>
      <div>
        <h2>{empty.title}</h2>
        <p>{empty.description}</p>
        {empty.action ? (
          <button className={styles.secondaryButton} type="button" onClick={empty.action.onClick}>
            {empty.action.label}
          </button>
        ) : null}
      </div>
    </section>
  )
}

export interface ScenarioResourceBannerProps {
  state: 'idle' | 'loading' | 'ready' | 'error'
  errorMessage?: string
  onRetry?: () => void
  context?: 'list' | 'detail'
}

export function ScenarioResourceBanner({ state, onRetry, context = 'list' }: ScenarioResourceBannerProps) {
  if (state === 'idle' || state === 'ready') return null

  const availableContent = context === 'list' ? '基金列表' : '基金详情'

  if (state === 'loading') {
    return (
      <p className={styles.inlineNotice} role="status">
        <span className={styles.spinner} aria-hidden="true" />
        正在准备场景计算，{availableContent}仍可查看。
      </p>
    )
  }

  return (
    <div className={`${styles.inlineNotice} ${styles.inlineError}`} role="alert">
      <span>场景计算暂不可用，{availableContent}仍可查看。</span>
      {onRetry ? <button type="button" onClick={onRetry}>重试</button> : null}
    </div>
  )
}
