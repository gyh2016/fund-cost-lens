import type { FeeCellView, FeeDisplaySectionView, OngoingFeeView, ScenarioFeeView } from './types'
import { FeeStateMessage } from './FeeTierTable'
import styles from '../styles/catalog.module.css'

export interface InlineFeeTiersProps {
  fee: FeeCellView
  ariaLabel: string
}

export function InlineFeeTiers({ fee, ariaLabel }: InlineFeeTiersProps) {
  const visibleSections = fee.sections.filter((section) => section.state !== 'not_listed' || section.rows.length > 0)

  return (
    <div className={styles.feeCell} aria-label={ariaLabel}>
      {fee.caption ? <span className={styles.feeCaption}>{fee.caption}</span> : null}
      {visibleSections.length === 0 ? <FeeStateMessage state="not_listed" /> : null}
      {visibleSections.map((section) => (
        <InlineFeeSection
          key={section.id}
          section={section}
          showHeading={visibleSections.length > 1 || section.label !== '申购时收取'}
        />
      ))}
    </div>
  )
}

function InlineFeeSection({ section, showHeading }: { section: FeeDisplaySectionView; showHeading: boolean }) {
  return (
    <div className={styles.inlineFeeSection}>
      {showHeading ? <span className={styles.inlineGroupLabel}>{section.label}</span> : null}
      {section.state !== 'known' ? (
        <FeeStateMessage state={section.state} note={section.note} />
      ) : section.rows.length === 0 ? (
        <p className={styles.dataAttention}>{section.note || '暂未找到唯一适用的费率档位'}</p>
      ) : (
        <div className={styles.inlineTiers}>
          {section.rows.map((row) => (
            <div className={styles.inlineTier} key={row.id} data-matched={row.isMatched || undefined}>
              <span className={styles.tierCondition}>{row.condition}</span>
              <span className={styles.tierCharge} aria-label={row.accessibleLabel}>{row.charge}</span>
              {row.note ? <small className={styles.tierNote}>{row.note}</small> : null}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function OngoingFeeStack({ ongoing }: { ongoing: OngoingFeeView }) {
  return (
    <dl className={styles.ongoingStack}>
      <div><dt>管理</dt><dd>{ongoing.management}</dd></div>
      <div><dt>托管</dt><dd>{ongoing.custody}</dd></div>
      <div>
        <dt>销售</dt>
        <dd>
          {ongoing.salesService}
          {ongoing.salesServiceNote ? <small>{ongoing.salesServiceNote}</small> : null}
        </dd>
      </div>
      {ongoing.total ? <div className={styles.ongoingTotal}><dt>合计</dt><dd>{ongoing.total}</dd></div> : null}
    </dl>
  )
}

const scenarioFallback: Record<'idle' | 'loading' | 'unavailable' | 'error', string> = {
  idle: '尚未计算',
  loading: '正在计算',
  unavailable: '暂无法计算',
  error: '计算失败',
}

export function ScenarioFeeResult({ scenario }: { scenario: ScenarioFeeView }) {
  if (scenario.status === 'ready') {
    return (
      <div className={styles.scenarioResult} aria-label={scenario.accessibleLabel}>
        <strong>{scenario.total}</strong>
        <span>持续费用 {scenario.ongoing} + 申购费 {scenario.purchase} + 赎回费 {scenario.redemption}（持有 {scenario.holdingDays} 日）</span>
      </div>
    )
  }

  return (
    <div className={styles.scenarioResult} data-state={scenario.status}>
      <strong>{scenarioFallback[scenario.status]}</strong>
      {scenario.status !== 'idle' && scenario.reason ? <span>{scenario.reason}</span> : null}
    </div>
  )
}
