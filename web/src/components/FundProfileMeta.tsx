import type { FundListRow } from './types'
import styles from '../styles/catalog.module.css'

export function FundProfileMeta({
  profile,
}: {
  profile: FundListRow['profile']
}) {
  const scale = profile.netAssetCny100m
    ? `规模 ${profile.netAssetCny100m} 亿元${profile.netAssetAsOf ? `（${profile.netAssetAsOf}）` : ''}`
    : null
  const inception = profile.inceptionDate ? `成立 ${profile.inceptionDate}` : null
  const items = [inception, scale].filter((item): item is string => Boolean(item))

  if (items.length === 0) return null

  return (
    <span className={styles.fundProfileMeta}>
      {items.map((item) => <span key={item}>{item}</span>)}
    </span>
  )
}
