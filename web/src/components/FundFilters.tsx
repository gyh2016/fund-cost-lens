import { useEffect, useId, useRef, useState } from 'react'
import type { FilterOption, FundFilterOptions, FundFilterState, SortToken } from './types'
import styles from '../styles/catalog.module.css'

const SORT_OPTIONS: readonly FilterOption[] = [
  { value: 'share_code_asc', label: '基金代码升序' },
  { value: 'share_name_asc', label: '基金名称升序' },
  { value: 'index_name_asc', label: '指数名称升序' },
  { value: 'management_rate_fraction_asc', label: '管理费从低到高' },
  { value: 'management_rate_fraction_desc', label: '管理费从高到低' },
  { value: 'custody_rate_fraction_asc', label: '托管费从低到高' },
  { value: 'custody_rate_fraction_desc', label: '托管费从高到低' },
  { value: 'flat_sales_service_rate_fraction_asc', label: '固定销售服务费从低到高' },
  { value: 'flat_sales_service_rate_fraction_desc', label: '固定销售服务费从高到低' },
  { value: 'ongoing_rate_fraction_asc', label: '持续费率从低到高' },
  { value: 'ongoing_rate_fraction_desc', label: '持续费率从高到低' },
  { value: 'scenario_total_rate_asc', label: '场景总费率从低到高' },
  { value: 'scenario_total_rate_desc', label: '场景总费率从高到低' },
  { value: 'verified_at_desc', label: '核验日期从新到旧' },
]

export interface FundFiltersProps {
  value: FundFilterState
  options: FundFilterOptions
  resultCount: number
  totalCount: number
  scenarioComplete: boolean
  onChange: (value: FundFilterState) => void
  onClearAll: () => void
}

export function FundFilters({
  value,
  options,
  resultCount,
  totalCount,
  scenarioComplete,
  onChange,
  onClearAll,
}: FundFiltersProps) {
  const id = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const isSearchComposingRef = useRef(false)
  const [searchDraft, setSearchDraft] = useState(value.query)
  const activeCount = countActiveFilters(value)
  const update = <K extends keyof FundFilterState>(key: K, next: FundFilterState[K]) => {
    onChange({ ...value, [key]: next })
  }

  useEffect(() => {
    if (!isSearchComposingRef.current) setSearchDraft(value.query)
  }, [value.query])

  const clearSearch = () => {
    isSearchComposingRef.current = false
    setSearchDraft('')
    update('query', '')
  }

  const openMobileFilters = () => {
    if (!dialogRef.current?.open) dialogRef.current?.showModal()
  }

  const closeMobileFilters = () => dialogRef.current?.close()

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const mobileViewport = window.matchMedia('(max-width: 639px)')
    const closeAcrossDesktopBreakpoint = (event: MediaQueryListEvent) => {
      if (!event.matches && dialogRef.current?.open) {
        dialogRef.current.close()
      }
    }
    mobileViewport.addEventListener('change', closeAcrossDesktopBreakpoint)
    return () => {
      mobileViewport.removeEventListener('change', closeAcrossDesktopBreakpoint)
    }
  }, [])

  return (
    <section className={styles.filtersSection} aria-labelledby={`${id}-filters-title`}>
      <h2 id={`${id}-filters-title`} className={styles.srOnly}>搜索、筛选和排序</h2>
      <div className={styles.desktopFilters}>
        <div className={styles.desktopPrimaryRow}>
          <label className={styles.searchField}>
            <span>搜索基金或指数</span>
            <span className={styles.searchShell}>
              <span className={styles.searchIcon} aria-hidden="true">⌕</span>
              <input
                type="text"
                role="searchbox"
                enterKeyHint="search"
                value={searchDraft}
                placeholder="输入代码、基金名称、指数名称或代码"
                onCompositionStart={() => {
                  isSearchComposingRef.current = true
                }}
                onCompositionEnd={(event) => {
                  isSearchComposingRef.current = false
                  const next = event.currentTarget.value
                  setSearchDraft(next)
                  update('query', next)
                }}
                onChange={(event) => {
                  const next = event.target.value
                  setSearchDraft(next)
                  if (!isSearchComposingRef.current) {
                    update('query', next)
                  }
                }}
              />
              {searchDraft ? (
                <button type="button" aria-label="清除搜索" onClick={clearSearch}>×</button>
              ) : null}
            </span>
          </label>
          <FilterControlGrid
            idPrefix={`${id}-desktop`}
            value={value}
            options={options}
            scenarioComplete={scenarioComplete}
            onChange={update}
          />
        </div>
      </div>

      <div className={styles.filterResultBar}>
        <p aria-live="polite" aria-atomic="true">
          {resultCount === totalCount ? (
            <>共 <strong>{totalCount.toLocaleString('zh-CN')}</strong> 只基金</>
          ) : (
            <>找到 <strong>{resultCount.toLocaleString('zh-CN')}</strong> 只基金<span>（共 {totalCount.toLocaleString('zh-CN')} 只）</span></>
          )}
        </p>
        <div>
          <button className={styles.mobileFilterButton} type="button" onClick={openMobileFilters}>
            筛选和排序{activeCount > 0 ? `（${activeCount}）` : ''}
          </button>
          {(activeCount > 0 || value.query) ? (
            <button className={styles.quietButton} type="button" onClick={onClearAll}>清除条件</button>
          ) : null}
        </div>
      </div>

      <dialog
        ref={dialogRef}
        className={styles.mobileFilterDialog}
        aria-labelledby={`${id}-mobile-filter-title`}
        onCancel={(event) => {
          event.preventDefault()
          closeMobileFilters()
        }}
        onClick={(event) => {
          if (event.target === dialogRef.current) closeMobileFilters()
        }}
      >
        <div className={styles.dialogHeader}>
          <div>
            <h2 id={`${id}-mobile-filter-title`}>筛选和排序</h2>
          </div>
          <button className={styles.closeButton} type="button" onClick={closeMobileFilters}>关闭</button>
        </div>
        <FilterControlGrid
          idPrefix={`${id}-mobile`}
          value={value}
          options={options}
          scenarioComplete={scenarioComplete}
          onChange={update}
          mobile
        />
        <div className={styles.mobileFilterActions}>
          <button className={styles.secondaryButton} type="button" onClick={onClearAll}>清除全部</button>
          <button className={styles.primaryButton} type="button" onClick={closeMobileFilters}>
            查看 {resultCount.toLocaleString('zh-CN')} 只基金
          </button>
        </div>
      </dialog>
    </section>
  )
}

interface FilterControlGridProps {
  idPrefix: string
  value: FundFilterState
  options: FundFilterOptions
  scenarioComplete: boolean
  onChange: <K extends keyof FundFilterState>(key: K, next: FundFilterState[K]) => void
  mobile?: boolean
}

function FilterControlGrid({ idPrefix, value, options, scenarioComplete, onChange, mobile = false }: FilterControlGridProps) {
  const hasMoreFilters =
    options.managementRateBands.length > 0 ||
    options.custodyRateBands.length > 0 ||
    options.salesServiceStates.length > 0

  return (
    <div className={mobile ? styles.mobileFilterContent : styles.filterControls}>
      <div className={styles.primaryFilterGrid}>
        {options.indices.length > 0 ? (
          <MultiSelectMenu
            id={`${idPrefix}-index`}
            label="跟踪指数"
            placeholder="全部指数"
            options={options.indices}
            selected={value.indexIds}
            onChange={(selected) => onChange('indexIds', selected)}
            searchable
          />
        ) : null}
        {options.fundTypes.length > 0 ? (
          <MultiSelectMenu
            id={`${idPrefix}-type`}
            label="基金类型"
            placeholder="全部类型"
            options={options.fundTypes}
            selected={value.fundTypes}
            onChange={(selected) => onChange('fundTypes', selected)}
          />
        ) : null}
        {options.shareClasses.length > 0 ? (
          <MultiSelectMenu
            id={`${idPrefix}-share-class`}
            label="类别"
            placeholder="全部类别"
            options={options.shareClasses}
            selected={value.shareClasses}
            onChange={(selected) => onChange('shareClasses', selected)}
          />
        ) : null}
        <SelectFilter
          id={`${idPrefix}-sort`}
          label="排序"
          options={SORT_OPTIONS}
          value={value.sort}
          onChange={(next) => onChange('sort', next as SortToken)}
          disabledValues={scenarioComplete ? [] : ['scenario_total_rate_asc', 'scenario_total_rate_desc']}
        />
      </div>

      {hasMoreFilters ? (
        <details className={styles.moreFilters} open={mobile || undefined}>
          <summary>更多筛选</summary>
          <div className={styles.moreFilterGrid}>
            {options.managementRateBands.length > 0 ? (
              <SelectFilter
                id={`${idPrefix}-management`}
                label="管理费"
                options={options.managementRateBands}
                value={value.managementRateBand}
                placeholder="不限"
                onChange={(next) => onChange('managementRateBand', next)}
              />
            ) : null}
            {options.custodyRateBands.length > 0 ? (
              <SelectFilter
                id={`${idPrefix}-custody`}
                label="托管费"
                options={options.custodyRateBands}
                value={value.custodyRateBand}
                placeholder="不限"
                onChange={(next) => onChange('custodyRateBand', next)}
              />
            ) : null}
            {options.salesServiceStates.length > 0 ? (
              <MultiSelectMenu
                id={`${idPrefix}-sales`}
                label="销售服务费"
                placeholder="全部状态"
                options={options.salesServiceStates}
                selected={value.salesServiceStates}
                onChange={(selected) => onChange('salesServiceStates', selected)}
                inline={mobile}
              />
            ) : null}
          </div>
        </details>
      ) : null}
    </div>
  )
}

interface SelectFilterProps {
  id: string
  label: string
  options: readonly FilterOption[]
  value: string
  placeholder?: string
  disabledValues?: readonly string[]
  onChange: (value: string) => void
}

function SelectFilter({ id, label, options, value, placeholder, disabledValues = [], onChange }: SelectFilterProps) {
  return (
    <label className={styles.filterField} htmlFor={id}>
      <span>{label}</span>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
        {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={disabledValues.includes(option.value)}>
            {option.label}{option.count !== undefined ? `（${option.count}）` : ''}
          </option>
        ))}
      </select>
    </label>
  )
}

interface MultiSelectMenuProps {
  id: string
  label: string
  placeholder: string
  options: readonly FilterOption[]
  selected: readonly string[]
  searchable?: boolean
  inline?: boolean
  onChange: (selected: readonly string[]) => void
}

function MultiSelectMenu({ id, label, placeholder, options, selected, searchable = false, inline = false, onChange }: MultiSelectMenuProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null)
  const [optionQuery, setOptionQuery] = useState('')
  const normalizedQuery = optionQuery.trim().toLocaleLowerCase('zh-CN')
  const visibleOptions = normalizedQuery
    ? options.filter((option) =>
        [option.label, option.description, option.value]
          .filter((value): value is string => Boolean(value))
          .some((value) =>
            value.toLocaleLowerCase('zh-CN').includes(normalizedQuery),
          ),
      )
    : options
  const toggle = (optionValue: string, checked: boolean) => {
    onChange(checked
      ? [...selected, optionValue]
      : selected.filter((current) => current !== optionValue))
  }
  const selectedLabels = options.filter((option) => selected.includes(option.value)).map((option) => option.label)

  useEffect(() => {
    const closeFromOutside = (event: PointerEvent) => {
      const details = detailsRef.current
      if (
        details?.open &&
        event.target instanceof Node &&
        !details.contains(event.target)
      ) {
        details.open = false
      }
    }
    const closeFromKeyboard = (event: KeyboardEvent) => {
      const details = detailsRef.current
      if (event.key !== 'Escape' || !details?.open) return
      event.preventDefault()
      details.open = false
      details.querySelector<HTMLElement>('summary')?.focus()
    }
    document.addEventListener('pointerdown', closeFromOutside)
    document.addEventListener('keydown', closeFromKeyboard)
    return () => {
      document.removeEventListener('pointerdown', closeFromOutside)
      document.removeEventListener('keydown', closeFromKeyboard)
    }
  }, [])

  return (
    <div className={styles.filterField}>
      <span id={`${id}-label`}>{label}</span>
      <details
        ref={detailsRef}
        className={styles.multiSelect}
        data-inline={inline || undefined}
        onToggle={(event) => {
          if (event.currentTarget.open) {
            document
              .querySelectorAll<HTMLDetailsElement>('details[data-filter-menu][open]')
              .forEach((details) => {
                if (details !== event.currentTarget) details.open = false
              })
          } else {
            setOptionQuery('')
          }
        }}
        data-filter-menu
      >
        <summary aria-labelledby={`${id}-label ${id}-summary`} id={`${id}-summary`}>
          <span>{selectedLabels.length === 0 ? placeholder : selectedLabels.length === 1 ? selectedLabels[0] : `已选 ${selectedLabels.length} 项`}</span>
        </summary>
        <div className={styles.multiSelectPanel}>
          {searchable && options.length > 8 ? (
            <input
              className={styles.optionSearch}
              type="search"
              value={optionQuery}
              placeholder={`搜索${label}`}
              aria-label={`搜索${label}`}
              onChange={(event) => setOptionQuery(event.target.value)}
            />
          ) : null}
          <div className={styles.optionList}>
            {visibleOptions.map((option) => (
              <label key={option.value}>
                <input
                  type="checkbox"
                  value={option.value}
                  checked={selected.includes(option.value)}
                  onChange={(event) => toggle(option.value, event.target.checked)}
                />
                <span>
                  {option.label}
                  {option.description ? <small>{option.description}</small> : null}
                </span>
                {option.count !== undefined ? <output>{option.count}</output> : null}
              </label>
            ))}
            {visibleOptions.length === 0 ? (
              <p className={styles.noOptionMatches}>没有匹配的选项</p>
            ) : null}
          </div>
          {selected.length > 0 ? (
            <button className={styles.clearSelection} type="button" onClick={() => onChange([])}>清除选择</button>
          ) : null}
        </div>
      </details>
    </div>
  )
}

export function countActiveFilters(value: FundFilterState) {
  return value.indexIds.length
    + value.fundTypes.length
    + value.shareClasses.length
    + Number(Boolean(value.managementRateBand))
    + Number(Boolean(value.custodyRateBand))
    + value.salesServiceStates.length
}
