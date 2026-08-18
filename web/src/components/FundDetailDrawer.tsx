import { useEffect, useRef } from 'react'
import type { FundDetailView, PageLoadState } from './types'
import { FundDetailContent } from './FundDetailContent'
import styles from '../styles/catalog.module.css'

export interface FundDetailDrawerProps {
  open: boolean
  state: PageLoadState
  detail?: FundDetailView
  errorMessage?: string
  onClose: () => void
  onRetry?: () => void
  scenarioResourceState?: 'idle' | 'loading' | 'ready' | 'error'
  scenarioErrorMessage?: string
  onRetryScenario?: () => void
}

export function FundDetailDrawer({ open, state, detail, errorMessage, onClose, onRetry, scenarioResourceState, scenarioErrorMessage, onRetryScenario }: FundDetailDrawerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      closeButtonRef.current?.focus()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  const requestClose = () => {
    const dialog = dialogRef.current
    if (dialog?.open) dialog.close()
    onClose()
  }

  return (
    <dialog
      ref={dialogRef}
      className={styles.detailDrawer}
      aria-labelledby={state === 'ready' && detail ? 'drawer-fund-detail-heading' : undefined}
      aria-label={state === 'ready' && detail ? undefined : '基金费率详情'}
      onCancel={(event) => {
        event.preventDefault()
        requestClose()
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) requestClose()
      }}
    >
      <div className={styles.drawerToolbar}>
        <span>完整费率与来源</span>
        <button ref={closeButtonRef} className={styles.closeButton} type="button" onClick={requestClose} aria-label="关闭基金详情">
          关闭
        </button>
      </div>
      <FundDetailContent
        state={state}
        detail={detail}
        errorMessage={errorMessage}
        onRetry={onRetry}
        scenarioResourceState={scenarioResourceState}
        scenarioErrorMessage={scenarioErrorMessage}
        onRetryScenario={onRetryScenario}
        headingId="drawer-fund-detail-heading"
      />
    </dialog>
  )
}
