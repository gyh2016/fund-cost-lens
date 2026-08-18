import type { MobileBatchState, PaginationState } from './types'
import styles from '../styles/catalog.module.css'

export interface PaginationProps {
  value: PaginationState
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: 25 | 50) => void
}

export function Pagination({ value, onPageChange, onPageSizeChange }: PaginationProps) {
  const start = value.totalItems === 0 ? 0 : (value.page - 1) * value.pageSize + 1
  const end = Math.min(value.page * value.pageSize, value.totalItems)
  return (
    <nav className={styles.pagination} aria-label="基金列表分页">
      <p>显示 {start}–{end}，共 {value.totalItems.toLocaleString('zh-CN')} 只基金</p>
      <label>
        每页
        <select
          value={value.pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value) as 25 | 50)}
        >
          <option value="25">25</option>
          <option value="50">50</option>
        </select>
      </label>
      <div>
        <button type="button" disabled={value.page <= 1} onClick={() => onPageChange(value.page - 1)}>上一页</button>
        <span>第 {value.page} / {Math.max(value.pageCount, 1)} 页</span>
        <button type="button" disabled={value.page >= value.pageCount} onClick={() => onPageChange(value.page + 1)}>下一页</button>
      </div>
    </nav>
  )
}

export interface MobileLoadMoreProps {
  value: MobileBatchState
  onLoadMore: () => void
}

export function MobileLoadMore({ value, onLoadMore }: MobileLoadMoreProps) {
  const hasMore = value.visibleItems < value.totalItems
  return (
    <div className={styles.mobileLoadMore}>
      <p>已显示 {Math.min(value.visibleItems, value.totalItems)} / {value.totalItems.toLocaleString('zh-CN')} 只基金</p>
      {hasMore ? (
        <button className={styles.primaryButton} type="button" aria-label="加载更多" onClick={onLoadMore}>
          再加载 {Math.min(value.batchSize, value.totalItems - value.visibleItems)} 只基金
        </button>
      ) : <span>已显示全部结果</span>}
    </div>
  )
}
