import type { FundDetailView, PageLoadState } from './types'
import { LoadingSkeleton, ScenarioResourceBanner } from './DataStatus'
import { FeeScheduleSection } from './FeeTierTable'
import { OngoingFeeStack, ScenarioFeeResult } from './FeeDisplay'
import styles from '../styles/catalog.module.css'

export interface FundDetailContentProps {
  state: PageLoadState
  detail?: FundDetailView
  errorMessage?: string
  onRetry?: () => void
  scenarioResourceState?: 'idle' | 'loading' | 'ready' | 'error'
  scenarioErrorMessage?: string
  onRetryScenario?: () => void
  headingId?: string
}

export function FundDetailContent({
  state,
  detail,
  errorMessage,
  onRetry,
  scenarioResourceState = 'idle',
  scenarioErrorMessage,
  onRetryScenario,
  headingId = 'fund-detail-heading',
}: FundDetailContentProps) {
  if (state === 'loading') {
    return <div className={styles.detailLoading}><LoadingSkeleton rows={7} label="正在加载基金详情" /></div>
  }

  if (state === 'error' || !detail) {
    return (
      <section className={`${styles.statePanel} ${styles.systemError}`} role="alert">
        <span className={styles.stateIcon} aria-hidden="true">×</span>
        <div>
          <h2>暂时无法打开基金详情</h2>
          <p>{errorMessage || '请稍后重试，基金列表仍可正常查看。'}</p>
          {onRetry ? <button className={styles.primaryButton} type="button" onClick={onRetry}>重新加载</button> : null}
        </div>
      </section>
    )
  }

  return (
    <article className={styles.detailContent}>
      <header className={styles.detailHero}>
        <h1 id={headingId}>{detail.shareName}</h1>
        <p className={styles.fundCode}>{detail.shareCode} · {detail.shareClass} 类</p>
      </header>

      <section className={styles.detailSection} aria-labelledby={`${headingId}-identity`}>
        <h2 id={`${headingId}-identity`}>基金与指数</h2>
        <dl className={styles.identityGrid}>
          <div><dt>跟踪指数</dt><dd>{detail.index.name}<small>{detail.index.code}</small></dd></div>
          <div><dt>基金类型</dt><dd>{detail.fundTypeLabel}<small>{detail.strategyLabel}</small></dd></div>
          <div><dt>费率核验日期</dt><dd>{detail.verifiedAt}</dd></div>
        </dl>
      </section>

      <section className={styles.detailSection} aria-labelledby={`${headingId}-scenario`}>
        <div className={styles.detailSectionHeading}>
          <div>
            <p className={styles.eyebrow}>当前输入</p>
            <h2 id={`${headingId}-scenario`}>场景适用费率</h2>
          </div>
          <p>{detail.scenarioDescription}</p>
        </div>
        <ScenarioResourceBanner
          state={scenarioResourceState}
          errorMessage={scenarioErrorMessage}
          onRetry={onRetryScenario}
          context="detail"
        />
        <ScenarioFeeResult scenario={detail.scenario} />
      </section>

      <section className={styles.detailSection} aria-labelledby={`${headingId}-ongoing`}>
        <h2 id={`${headingId}-ongoing`}>持续费用（年）</h2>
        <div className={styles.detailOngoing}><OngoingFeeStack ongoing={detail.ongoing} /></div>
        {detail.salesServiceSections?.map((section) => (
          <FeeScheduleSection key={section.id} section={section} headingLevel={3} />
        ))}
      </section>

      <section className={styles.detailSection} aria-labelledby={`${headingId}-purchase`}>
        <h2 id={`${headingId}-purchase`}>申购费</h2>
        {detail.purchaseSections.map((section) => (
          <FeeScheduleSection key={section.id} section={section} headingLevel={3} />
        ))}
      </section>

      <section className={styles.detailSection} aria-labelledby={`${headingId}-redemption`}>
        <h2 id={`${headingId}-redemption`}>赎回费</h2>
        {detail.redemptionSections.map((section) => (
          <FeeScheduleSection key={section.id} section={section} headingLevel={3} />
        ))}
      </section>

      {detail.issues.length > 0 ? (
        <section className={styles.detailSection} aria-labelledby={`${headingId}-issues`}>
          <h2 id={`${headingId}-issues`}>数据说明</h2>
          <div className={styles.issueList}>
            {detail.issues.map((issue) => (
              <article key={issue.id}>
                <strong>{issue.statusLabel === '已解决' ? '历史说明' : '需要注意'}</strong>
                <p>{issue.description}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {detail.notes && detail.notes.length > 0 ? (
        <section className={styles.detailSection} aria-labelledby={`${headingId}-notes`}>
          <h2 id={`${headingId}-notes`}>补充说明</h2>
          <ul className={styles.noteList}>
            {detail.notes.map((note, index) => <li key={`${index}-${note}`}>{note}</li>)}
          </ul>
        </section>
      ) : null}

      <section className={styles.detailSection} aria-labelledby={`${headingId}-sources`}>
        <h2 id={`${headingId}-sources`}>数据来源</h2>
        {detail.schedule.validFrom ? (
          <dl className={styles.versionGrid}>
            <div><dt>费率生效日期</dt><dd>{detail.schedule.validFrom}</dd></div>
          </dl>
        ) : null}
        <ul className={styles.sourceList}>
          {detail.sources.map((source) => (
            <li key={source.documentId}>
              <div>
                <strong>{source.title}</strong>
                <span>{source.site} · 采集于 {source.retrievedAt}</span>
              </div>
              <a href={source.url} target="_blank" rel="noreferrer">打开来源<span className={styles.srOnly}>（在新窗口打开）</span> ↗</a>
            </li>
          ))}
        </ul>
      </section>
    </article>
  )
}
