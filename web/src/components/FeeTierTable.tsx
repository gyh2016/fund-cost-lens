import type { FeeDisplaySectionView, FeeDisplayState, FeeTierView } from './types'
import styles from '../styles/catalog.module.css'

const STATE_LABELS: Record<FeeDisplayState, string> = {
  known: '费率已显示',
  not_applicable: '不适用',
  source_missing: '公开来源未显示该费率',
  unparsed: '暂时无法读取该费率',
  not_listed: '公开来源未列出（不代表费率为 0）',
}

export function feeStateLabel(state: FeeDisplayState) {
  return STATE_LABELS[state]
}

export interface FeeTierTableProps {
  rows: readonly FeeTierView[]
  state?: FeeDisplayState
  caption?: string
  compact?: boolean
}

export function FeeTierTable({ rows, state = 'known', caption, compact = false }: FeeTierTableProps) {
  if (state !== 'known') {
    return <FeeStateMessage state={state} />
  }

  if (rows.length === 0) {
    return <p className={styles.muted}>暂无可展示的费率档位。</p>
  }

  const showNotes = rows.some((row) => Boolean(row.note))

  return (
    <div
      className={styles.tierTableWrap}
      role="region"
      aria-label={`${caption ?? '费率分档表'}，可横向滚动`}
      tabIndex={0}
    >
      <table
        className={styles.tierTable}
        data-compact={compact || undefined}
        data-has-notes={showNotes || undefined}
      >
        {caption ? <caption className={styles.srOnly}>{caption}</caption> : null}
        <thead>
          <tr>
            <th scope="col">适用条件</th>
            <th scope="col">费率或固定金额</th>
            {showNotes ? <th scope="col">备注</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} data-matched={row.isMatched || undefined}>
              <td>{row.condition}</td>
              <td aria-label={row.accessibleLabel}>{row.charge}</td>
              {showNotes ? <td>{row.note || '—'}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export interface FeeScheduleSectionProps {
  section: FeeDisplaySectionView
  headingLevel?: 3 | 4
}

export function FeeScheduleSection({ section, headingLevel = 3 }: FeeScheduleSectionProps) {
  const Heading: 'h3' | 'h4' = headingLevel === 3 ? 'h3' : 'h4'
  return (
    <section className={styles.feeScheduleSection} aria-labelledby={`${section.id}-heading`}>
      <Heading id={`${section.id}-heading`}>{section.label}</Heading>
      {section.note ? <p className={styles.sectionNote}>{section.note}</p> : null}
      <FeeTierTable rows={section.rows} state={section.state} caption={`${section.label}分档`} />
    </section>
  )
}

export interface FeeStateMessageProps {
  state: FeeDisplayState
  note?: string
}

export function FeeStateMessage({ state, note }: FeeStateMessageProps) {
  const attention = state === 'source_missing' || state === 'unparsed'
  return (
    <p className={attention ? styles.dataAttention : styles.muted}>
      {STATE_LABELS[state]}
      {note ? `：${note}` : ''}
    </p>
  )
}
