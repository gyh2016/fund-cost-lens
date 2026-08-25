import { useState } from 'react'
import type { ThemeMode } from '../app/theme'
import styles from '../styles/catalog.module.css'

const OPTIONS: readonly {
  value: ThemeMode
  label: string
  symbol: string
}[] = [
  { value: 'light', label: '浅色', symbol: '☀' },
  { value: 'dark', label: '深色', symbol: '☾' },
]

export interface ThemeToggleProps {
  value: ThemeMode
  onChange: (theme: ThemeMode) => void
}

export function ThemeToggle({ value, onChange }: ThemeToggleProps) {
  const [announcement, setAnnouncement] = useState('')

  const selectTheme = (nextTheme: ThemeMode) => {
    if (nextTheme === value) return
    onChange(nextTheme)
    setAnnouncement(
      nextTheme === 'dark' ? '已切换到深色模式' : '已切换到浅色模式',
    )
  }

  return (
    <>
      <div
        className={styles.themeSwitch}
        role="group"
        aria-label="色彩模式"
      >
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            aria-label={`${option.label}模式`}
            onClick={() => selectTheme(option.value)}
          >
            <span aria-hidden="true">{option.symbol}</span>
            <span>{option.label}</span>
          </button>
        ))}
      </div>
      <span className={styles.srOnly} aria-live="polite">
        {announcement}
      </span>
    </>
  )
}
