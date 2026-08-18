import type { FundListRow } from './types'
import { InlineFeeTiers, OngoingFeeStack, ScenarioFeeResult } from './FeeDisplay'
import { FundProfileMeta } from './FundProfileMeta'
import styles from '../styles/catalog.module.css'

export interface FundCardListProps {
  rows: readonly FundListRow[]
  onOpenFund: (shareCode: string) => void
}

export function FundCardList({ rows, onOpenFund }: FundCardListProps) {
  return (
    <div className={styles.cardList} aria-label="基金费率卡片列表">
      {rows.map((fund) => (
        <article className={styles.fundCard} key={fund.shareCode}>
          <header className={styles.cardHeader}>
            <div>
              <h2>{fund.shareName}</h2>
              <p className={styles.fundCode}>{fund.shareCode} · {fund.shareClass} 类</p>
              <FundProfileMeta profile={fund.profile} />
            </div>
          </header>

          <p className={styles.cardMeta}>
            <span>{fund.index.name}（{fund.index.code}）</span>
            <span>{fund.fundTypeLabel}</span>
          </p>

          <section className={styles.cardSection} aria-label="持续费用">
            <h3>持续费用（年）</h3>
            <OngoingFeeStack ongoing={fund.ongoing} />
          </section>

          <div className={styles.cardFeeGrid}>
            <section>
              <h3>申购费</h3>
              <InlineFeeTiers fee={fund.purchase} ariaLabel={`${fund.shareName}申购费`} />
            </section>
            <section>
              <h3>赎回费</h3>
              <InlineFeeTiers fee={fund.redemption} ariaLabel={`${fund.shareName}赎回费`} />
            </section>
            <section className={styles.cardScenario}>
              <h3>场景总费率</h3>
              <ScenarioFeeResult scenario={fund.scenario} />
            </section>
          </div>

          <footer className={styles.cardFooter}>
            <button className={styles.detailButton} type="button" data-fund-detail-trigger={`${fund.shareCode}:card`} onClick={() => onOpenFund(fund.shareCode)}>
              查看完整费率与来源
            </button>
          </footer>
        </article>
      ))}
    </div>
  )
}
