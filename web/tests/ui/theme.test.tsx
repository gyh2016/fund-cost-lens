// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeToggle } from '../../src/components/ThemeToggle'
import {
  applyTheme,
  initializeTheme,
  THEME_STORAGE_KEY,
} from '../../src/app/theme'

describe('色彩模式', () => {
  beforeEach(() => {
    window.localStorage.clear()
    delete document.documentElement.dataset.theme
    document.documentElement.removeAttribute('style')
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('首次访问跟随系统深色偏好', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({ matches: true }),
    )

    expect(initializeTheme()).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(document.documentElement.style.colorScheme).toBe('dark')
  })

  it('优先恢复用户保存的模式', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'light')
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({ matches: true }),
    )

    expect(initializeTheme()).toBe('light')
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('切换控件准确表达当前模式并交由应用保存', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn((theme: 'light' | 'dark') => {
      applyTheme(theme, { persist: true })
    })

    render(<ThemeToggle value="light" onChange={onChange} />)

    expect(
      screen
        .getByRole('button', { name: '浅色模式' })
        .getAttribute('aria-pressed'),
    ).toBe('true')
    await user.click(screen.getByRole('button', { name: '深色模式' }))

    expect(onChange).toHaveBeenCalledWith('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    expect(screen.getByText('已切换到深色模式')).toBeTruthy()
  })
})
