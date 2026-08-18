import { useEffect, useId, useRef } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import type { ScenarioControlValue, ScenarioMode } from './types'
import { parseIntegerInput } from '../domain/fees'
import styles from '../styles/catalog.module.css'

export const PURCHASE_AMOUNT_PRESETS = [
  { value: '100000', label: '10 万元' },
  { value: '500000', label: '50 万元' },
  { value: '1000000', label: '100 万元' },
  { value: '2000000', label: '200 万元' },
  { value: '5000000', label: '500 万元' },
  { value: '10000000', label: '1,000 万元' },
] as const

export const HOLDING_DAY_PRESETS = [
  '1',
  '7',
  '30',
  '90',
  '180',
  '365',
  '730',
  '1095',
  '1825',
  '3650',
] as const

const HOLDING_DAY_PRESET_LABELS: Record<
  (typeof HOLDING_DAY_PRESETS)[number],
  string
> = {
  '1': '1 日',
  '7': '7 日',
  '30': '30 日',
  '90': '90 日',
  '180': '180 日',
  '365': '365 日（1 年）',
  '730': '730 日（2 年）',
  '1095': '1,095 日（3 年）',
  '1825': '1,825 日（5 年）',
  '3650': '3,650 日（10 年）',
}

export const DEFAULT_SCENARIO_CONTROL_VALUE: ScenarioControlValue = {
  purchasePriceMode: 'discounted',
  amountMode: 'unset',
  amountPreset: '1000000',
  amountCustom: '',
  holdingMode: 'unset',
  holdingPreset: '30',
  holdingCustom: '',
}

export function isPositiveInteger(value: string) {
  return parseIntegerInput(value).kind === 'valid'
}

function normalizeScenarioValue(
  value: ScenarioControlValue,
): ScenarioControlValue {
  const amount = parseIntegerInput(value.amountCustom)
  const holding = parseIntegerInput(value.holdingCustom)
  return {
    ...value,
    amountCustom:
      amount.kind === 'valid' ? amount.normalized : value.amountCustom,
    holdingCustom:
      holding.kind === 'valid' ? holding.normalized : value.holdingCustom,
  }
}

export interface ScenarioFeeControlsProps {
  value: ScenarioControlValue
  onChange: (value: ScenarioControlValue) => void
  onCommit?: (value: ScenarioControlValue) => void
  disabled?: boolean
  commitDelay?: number
}

export function ScenarioFeeControls({
  value,
  onChange,
  onCommit,
  disabled = false,
  commitDelay = 300,
}: ScenarioFeeControlsProps) {
  const id = useId()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const amountError = value.amountMode === 'custom' && value.amountCustom !== '' && !isPositiveInteger(value.amountCustom)
  const holdingError = value.holdingMode === 'custom' && value.holdingCustom !== '' && !isPositiveInteger(value.holdingCustom)

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  const canCommit = (next: ScenarioControlValue) => {
    const amountValid = next.amountMode !== 'custom' || next.amountCustom === '' || isPositiveInteger(next.amountCustom)
    const holdingValid = next.holdingMode !== 'custom' || next.holdingCustom === '' || isPositiveInteger(next.holdingCustom)
    return amountValid && holdingValid
  }

  const commit = (next: ScenarioControlValue) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (canCommit(next)) onCommit?.(normalizeScenarioValue(next))
  }

  const changeImmediately = (next: ScenarioControlValue) => {
    onChange(next)
    commit(next)
  }

  const changeCustom = (key: 'amountCustom' | 'holdingCustom', input: string) => {
    const next = { ...value, [key]: input }
    onChange(next)
    if (timerRef.current) clearTimeout(timerRef.current)
    if (canCommit(next)) {
      timerRef.current = setTimeout(() => {
        timerRef.current = null
        onCommit?.(normalizeScenarioValue(next))
      }, commitDelay)
    }
  }

  const commitFromKeyboard = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      commit(value)
      event.currentTarget.blur()
    }
  }

  return (
    <section className={styles.scenarioPanel} aria-labelledby={`${id}-scenario-heading`}>
      <div className={styles.scenarioHeading}>
        <div>
          <p className={styles.eyebrow}>可选场景</p>
          <h2 id={`${id}-scenario-heading`}>按金额和持有时间查看适用费率</h2>
        </div>
        <p>金额和持有时间均可留空；填写后显示适用分档，两项齐全时计算总费率。</p>
      </div>

      <fieldset className={styles.scenarioFieldset} disabled={disabled}>
        <legend>申购费价格</legend>
        <div className={styles.priceModeOptions}>
          <label data-selected={value.purchasePriceMode === 'discounted' || undefined}>
            <input
              type="radio"
              name={`${id}-purchase-price`}
              value="discounted"
              checked={value.purchasePriceMode === 'discounted'}
              onChange={() => changeImmediately({ ...value, purchasePriceMode: 'discounted' })}
            />
            <span>
              <strong>优惠价</strong>
              <small>东方财富公开优惠价</small>
            </span>
          </label>
          <label data-selected={value.purchasePriceMode === 'standard' || undefined}>
            <input
              type="radio"
              name={`${id}-purchase-price`}
              value="standard"
              checked={value.purchasePriceMode === 'standard'}
              onChange={() => changeImmediately({ ...value, purchasePriceMode: 'standard' })}
            />
            <span>
              <strong>标准费率</strong>
              <small>基金公开标准费率</small>
            </span>
          </label>
        </div>
      </fieldset>

      <ScenarioFieldset
        legend="申购金额"
        name={`${id}-amount-mode`}
        mode={value.amountMode}
        disabled={disabled}
        onModeChange={(mode) => changeImmediately({ ...value, amountMode: mode })}
        unsetLabel="不设置金额"
        presetLabel="快捷金额"
        customLabel="自定义整数"
        presetControl={(
          <select
            className={styles.scenarioControl}
            aria-label="快捷申购金额"
            value={value.amountPreset}
            disabled={disabled || value.amountMode !== 'preset'}
            onChange={(event) => changeImmediately({ ...value, amountPreset: event.target.value })}
          >
            {PURCHASE_AMOUNT_PRESETS.map((preset) => (
              <option key={preset.value} value={preset.value}>
                {preset.label}
              </option>
            ))}
          </select>
        )}
        customControl={(
          <div className={styles.inputWithUnit}>
            <input
              className={styles.scenarioControl}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="例如 1250000"
              value={value.amountCustom}
              disabled={disabled || value.amountMode !== 'custom'}
              aria-invalid={amountError || undefined}
              aria-describedby={amountError ? `${id}-amount-help` : undefined}
              onChange={(event) => changeCustom('amountCustom', event.target.value)}
              onBlur={(event) => commit({ ...value, amountCustom: event.currentTarget.value })}
              onKeyDown={commitFromKeyboard}
            />
            <span>元</span>
          </div>
        )}
      >
        {amountError ? (
          <p id={`${id}-amount-help`} className={styles.scenarioHelp} data-error="true" aria-live="polite">
            请输入大于 0 的整数（不含小数或分隔符）。
          </p>
        ) : null}
      </ScenarioFieldset>

      <ScenarioFieldset
        legend="持有时间"
        name={`${id}-holding-mode`}
        mode={value.holdingMode}
        disabled={disabled}
        onModeChange={(mode) => changeImmediately({ ...value, holdingMode: mode })}
        unsetLabel="不设置时间"
        presetLabel="快捷天数"
        customLabel="自定义天数"
        presetControl={(
          <select
            className={styles.scenarioControl}
            aria-label="快捷持有天数"
            value={value.holdingPreset}
            disabled={disabled || value.holdingMode !== 'preset'}
            onChange={(event) => changeImmediately({ ...value, holdingPreset: event.target.value })}
          >
            {HOLDING_DAY_PRESETS.map((days) => (
              <option key={days} value={days}>
                {HOLDING_DAY_PRESET_LABELS[days]}
              </option>
            ))}
          </select>
        )}
        customControl={(
          <div className={styles.inputWithUnit}>
            <input
              className={styles.scenarioControl}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="例如 45"
              value={value.holdingCustom}
              disabled={disabled || value.holdingMode !== 'custom'}
              aria-invalid={holdingError || undefined}
              aria-describedby={holdingError ? `${id}-holding-help` : undefined}
              onChange={(event) => changeCustom('holdingCustom', event.target.value)}
              onBlur={(event) => commit({ ...value, holdingCustom: event.currentTarget.value })}
              onKeyDown={commitFromKeyboard}
            />
            <span>日</span>
          </div>
        )}
      >
        {holdingError ? (
          <p id={`${id}-holding-help`} className={styles.scenarioHelp} data-error="true" aria-live="polite">
            请输入不少于 1 天的整数。
          </p>
        ) : null}
      </ScenarioFieldset>

      <p className={styles.scenarioSummary} aria-live="polite">
        {scenarioSummary(value, amountError, holdingError)}
      </p>
      <p className={styles.scenarioPolicy}>
        未显示优惠的申购费档按标准费率展示。总费率 = 持有期持续费用 + 申购费 + 赎回费；持续费用按持有天数 ÷ 365 折算。
      </p>
    </section>
  )
}

interface ScenarioFieldsetProps {
  legend: string
  name: string
  mode: ScenarioMode
  disabled: boolean
  onModeChange: (mode: ScenarioMode) => void
  unsetLabel: string
  presetLabel: string
  customLabel: string
  presetControl: ReactNode
  customControl: ReactNode
  children: ReactNode
}

function ScenarioFieldset({
  legend,
  name,
  mode,
  disabled,
  onModeChange,
  unsetLabel,
  presetLabel,
  customLabel,
  presetControl,
  customControl,
  children,
}: ScenarioFieldsetProps) {
  return (
    <fieldset className={styles.scenarioFieldset} disabled={disabled}>
      <legend>{legend}</legend>
      <div className={styles.scenarioOptions}>
        <ScenarioModeRow
          name={name}
          value="unset"
          checked={mode === 'unset'}
          label={unsetLabel}
          onChange={onModeChange}
        />
        <ScenarioModeRow
          name={name}
          value="preset"
          checked={mode === 'preset'}
          label={presetLabel}
          onChange={onModeChange}
        >
          {presetControl}
        </ScenarioModeRow>
        <ScenarioModeRow
          name={name}
          value="custom"
          checked={mode === 'custom'}
          label={customLabel}
          onChange={onModeChange}
        >
          {customControl}
        </ScenarioModeRow>
      </div>
      {children}
    </fieldset>
  )
}

interface ScenarioModeRowProps {
  name: string
  value: ScenarioMode
  checked: boolean
  label: string
  onChange: (mode: ScenarioMode) => void
  children?: ReactNode
}

function ScenarioModeRow({ name, value, checked, label, onChange, children }: ScenarioModeRowProps) {
  const inputId = `${name}-${value}`
  return (
    <div className={styles.scenarioOption}>
      <input
        id={inputId}
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
      />
      <label htmlFor={inputId}>{label}</label>
      <span className={styles.scenarioOptionControl}>{children}</span>
    </div>
  )
}

function formatInteger(value: string) {
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function scenarioSummary(value: ScenarioControlValue, amountError: boolean, holdingError: boolean) {
  const parsedAmount = parseIntegerInput(value.amountCustom)
  const parsedHolding = parseIntegerInput(value.holdingCustom)
  const amount = value.amountMode === 'preset'
    ? value.amountPreset
    : value.amountMode === 'custom' && parsedAmount.kind === 'valid'
      ? parsedAmount.normalized
      : null
  const holding = value.holdingMode === 'preset'
    ? value.holdingPreset
    : value.holdingMode === 'custom' && parsedHolding.kind === 'valid'
      ? parsedHolding.normalized
      : null

  if (amountError || holdingError) return '请先修正输入后再计算。'
  if (!amount && !holding) return '当前显示全部申购费和赎回费分档。'
  if (amount && !holding) return '已显示适用申购费；再设置持有时间即可计算总费率。'
  if (!amount && holding) return '已显示适用赎回费；再设置申购金额即可计算总费率。'
  return `已按人民币 ${formatInteger(amount!)} 元、持有 ${formatInteger(holding!)} 日显示适用费率。`
}
