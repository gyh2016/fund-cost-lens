import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BrowserRouter,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
  type Location,
} from 'react-router-dom'
import {
  DEFAULT_SCENARIO_CONTROL_VALUE,
  FundDetailDrawer,
  type DatasetOverview,
  type FundFilterOptions,
  type FundListRow,
  type ScenarioControlValue,
} from '../components'
import { FundDetailPage, FundListPage } from '../pages'
import type { FundIndexItem } from '../data'
import { isVisibleCnyFund } from './currency'
import { filterFunds, sortFunds } from './list-filter'
import {
  buildFilterOptions,
  filtersToUrlState,
  normalizeFilterUrlState,
  urlStateToFilters,
} from './filter-options'
import {
  hasCompleteScenario,
  normalizeScenarioSort,
  parseListUrlState,
  serializeListUrlState,
  type ListUrlState,
} from './url-state'
import { useTheme, type ThemeMode } from './theme'
import {
  calculateFundScenario,
  resolveScenarioControls,
  toFundDetailView,
  toFundListRow,
} from './view-model'
import {
  useFeeDataset,
  useFundDetailData,
  useScenarioRules,
} from './use-fee-data'

const emptyFilterOptions: FundFilterOptions = {
  indices: [],
  fundTypes: [],
  shareClasses: [],
  managementRateBands: [],
  custodyRateBands: [],
  salesServiceStates: [],
}

const LIST_SNAPSHOT_KEY = 'fundCostLensList'

interface ListHistorySnapshot {
  visibleItems: number
  scrollY: number
}

function currentHistoryUserState(): Record<string, unknown> {
  const state = window.history.state as { usr?: unknown } | null
  return state?.usr && typeof state.usr === 'object'
    ? { ...(state.usr as Record<string, unknown>) }
    : {}
}

function readListHistorySnapshot(): ListHistorySnapshot | undefined {
  const value = currentHistoryUserState()[LIST_SNAPSHOT_KEY]
  if (!value || typeof value !== 'object') return undefined
  const snapshot = value as Partial<ListHistorySnapshot>
  if (
    !Number.isFinite(snapshot.visibleItems) ||
    !Number.isFinite(snapshot.scrollY)
  ) {
    return undefined
  }
  return {
    visibleItems: Math.max(30, Math.floor(snapshot.visibleItems!)),
    scrollY: Math.max(0, snapshot.scrollY!),
  }
}

function historyUserStateWithSnapshot(
  visibleItems: number,
  scrollY: number,
): Record<string, unknown> {
  return {
    ...currentHistoryUserState(),
    [LIST_SNAPSHOT_KEY]: {
      visibleItems: Math.max(30, Math.floor(visibleItems)),
      scrollY: Math.max(0, scrollY),
    } satisfies ListHistorySnapshot,
  }
}

function persistListHistorySnapshot(
  visibleItems: number,
  scrollY: number,
): void {
  const state =
    window.history.state && typeof window.history.state === 'object'
      ? window.history.state
      : {}
  window.history.replaceState(
    {
      ...state,
      usr: historyUserStateWithSnapshot(visibleItems, scrollY),
    },
    '',
  )
}

function controlsFromUrl(state: ListUrlState): ScenarioControlValue {
  return {
    ...DEFAULT_SCENARIO_CONTROL_VALUE,
    purchasePriceMode: state.purchasePriceMode,
    amountMode: state.amountMode,
    amountPreset:
      state.amountMode === 'preset'
        ? state.amount
        : DEFAULT_SCENARIO_CONTROL_VALUE.amountPreset,
    amountCustom: state.amountMode === 'custom' ? state.amount : '',
    holdingMode: state.holdingMode,
    holdingPreset:
      state.holdingMode === 'preset'
        ? state.holdingDays
        : DEFAULT_SCENARIO_CONTROL_VALUE.holdingPreset,
    holdingCustom: state.holdingMode === 'custom' ? state.holdingDays : '',
  }
}

function scenarioToUrl(
  controls: ScenarioControlValue,
  previous: ListUrlState,
): ListUrlState {
  const resolved = resolveScenarioControls(controls)
  const next: ListUrlState = {
    ...previous,
    purchasePriceMode: controls.purchasePriceMode,
    amountMode: resolved.amount ? controls.amountMode : 'unset',
    amount: resolved.amount ?? '',
    holdingMode: resolved.holdingDays ? controls.holdingMode : 'unset',
    holdingDays: resolved.holdingDays ?? '',
    page: 1,
  }
  return normalizeScenarioSort(next)
}

function overviewFor(
  manifest: Extract<
    ReturnType<typeof useFeeDataset>['state'],
    { status: 'ready' }
  >['manifest'],
  funds: FundIndexItem[],
): DatasetOverview {
  return {
    datasetUpdatedAt: manifest.dataset_updated_at,
    releaseId: manifest.release_id,
    currentShares: funds.length,
    verifiedShares: funds.filter(
      (fund) => fund.review_status === 'verified',
    ).length,
    sharesWithOpenIssues: funds.filter((fund) => fund.issue_count > 0).length,
  }
}

function FundListController({
  dataset,
  retryDataset,
  theme,
  onThemeChange,
  captureReturnFocus,
}: {
  dataset: ReturnType<typeof useFeeDataset>['state']
  retryDataset: () => void
  theme: ThemeMode
  onThemeChange: (theme: ThemeMode) => void
  captureReturnFocus: (shareCode: string) => void
}) {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const urlState = useMemo(
    () => parseListUrlState(searchParams),
    [searchParams],
  )
  const [scenarioDraft, setScenarioDraft] = useState(() =>
    controlsFromUrl(urlState),
  )
  const initialListSnapshot = useRef(readListHistorySnapshot())
  const [mobileVisible, setMobileVisible] = useState(
    initialListSnapshot.current?.visibleItems ?? 30,
  )
  const [announcement, setAnnouncement] = useState('')
  const [scenarioControlRevision, setScenarioControlRevision] = useState(0)
  const latestUrlStateRef = useRef(urlState)
  const lastUrlWriteRef = useRef(searchParams.toString())
  const listLocationKeyRef = useRef(location.key)
  const mobileVisibleRef = useRef(mobileVisible)
  const pendingScrollRestoreRef = useRef<number | null>(
    initialListSnapshot.current?.scrollY ?? null,
  )
  const ownNavigationSearchesRef = useRef(new Set<string>())
  latestUrlStateRef.current = urlState
  mobileVisibleRef.current = mobileVisible
  const scenario = resolveScenarioControls(scenarioDraft)
  const scenarioEnabled = Boolean(scenario.amount || scenario.holdingDays)
  const scenarioComplete = Boolean(scenario.amount && scenario.holdingDays)
  const manifest = dataset.status === 'ready' ? dataset.manifest : undefined
  const scenarioResource = useScenarioRules(manifest, scenarioEnabled)

  useEffect(() => {
    const ownNavigation = ownNavigationSearchesRef.current.delete(
      location.search,
    )
    if (
      !ownNavigation &&
      listLocationKeyRef.current !== location.key
    ) {
      setScenarioDraft(controlsFromUrl(urlState))
      setScenarioControlRevision((value) => value + 1)
      const snapshot = readListHistorySnapshot()
      setMobileVisible(snapshot?.visibleItems ?? 30)
      pendingScrollRestoreRef.current = snapshot?.scrollY ?? 0
    }
    listLocationKeyRef.current = location.key
    lastUrlWriteRef.current = searchParams.toString()
  }, [
    location.key,
    location.search,
    searchParams,
    urlState.amount,
    urlState.amountMode,
    urlState.holdingDays,
    urlState.holdingMode,
    urlState.purchasePriceMode,
  ])

  useEffect(() => {
    persistListHistorySnapshot(
      mobileVisible,
      pendingScrollRestoreRef.current ?? window.scrollY,
    )
  }, [mobileVisible])

  useEffect(() => {
    if (dataset.status !== 'ready' || pendingScrollRestoreRef.current === null) {
      return
    }
    const scrollY = pendingScrollRestoreRef.current
    pendingScrollRestoreRef.current = null
    const timer = window.setTimeout(() => window.scrollTo(0, scrollY), 0)
    return () => window.clearTimeout(timer)
  }, [dataset.status, location.key, mobileVisible])

  useEffect(() => {
    let timer: number | undefined
    const rememberScroll = () => {
      if (timer !== undefined) return
      timer = window.setTimeout(() => {
        timer = undefined
        persistListHistorySnapshot(mobileVisibleRef.current, window.scrollY)
      }, 80)
    }
    window.addEventListener('scroll', rememberScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', rememberScroll)
      if (timer !== undefined) window.clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    if (
      !hasCompleteScenario(urlState) &&
      urlState.sort.startsWith('scenario_total_rate_')
    ) {
      const normalized = serializeListUrlState(normalizeScenarioSort(urlState))
      ownNavigationSearchesRef.current.add(
        normalized.size ? `?${normalized.toString()}` : '',
      )
      setSearchParams(normalized, {
        replace: true,
        state: historyUserStateWithSnapshot(mobileVisible, window.scrollY),
      })
    }
  }, [setSearchParams, urlState])

  const funds = dataset.status === 'ready' ? dataset.funds : []
  const cnyFunds = useMemo(
    () => funds.filter(isVisibleCnyFund),
    [funds],
  )
  const filterOptions = useMemo(
    () => buildFilterOptions(cnyFunds),
    [cnyFunds],
  )

  useEffect(() => {
    if (dataset.status !== 'ready') return
    const normalizedState = normalizeFilterUrlState(urlState, filterOptions)
    const normalizedParams = serializeListUrlState(normalizedState)
    const serialized = normalizedParams.toString()
    if (serialized === searchParams.toString()) return
    latestUrlStateRef.current = normalizedState
    lastUrlWriteRef.current = serialized
    ownNavigationSearchesRef.current.add(serialized ? `?${serialized}` : '')
    setMobileVisible(30)
    setSearchParams(normalizedParams, {
      replace: true,
      state: historyUserStateWithSnapshot(30, window.scrollY),
    })
  }, [
    dataset.status,
    filterOptions,
    searchParams,
    setSearchParams,
    urlState,
  ])

  const filters = useMemo(() => urlStateToFilters(urlState), [urlState])
  const filtered = useMemo(
    () => filterFunds(cnyFunds, urlState),
    [cnyFunds, urlState],
  )
  const scenarioFunds =
    scenarioResource.state.status === 'ready'
      ? scenarioResource.state.value.funds
      : undefined

  const sorted = useMemo(() => {
    const values = filtered.map((fund) => {
      const calculation = calculateFundScenario(
        fund,
        scenarioFunds?.[fund.share_code],
        scenario,
      )
      return {
        fund,
        calculation,
        scenarioRate:
          calculation?.status === 'ready'
            ? calculation.totalRateFraction
            : null,
      }
    })
    return sortFunds(values, urlState.sort)
  }, [filtered, scenario, scenarioFunds, urlState.sort])

  const pageCount = Math.max(1, Math.ceil(sorted.length / urlState.pageSize))
  const currentPage = Math.min(urlState.page, pageCount)
  const scenarioLoading =
    scenarioEnabled &&
    (scenarioResource.state.status === 'idle' ||
      scenarioResource.state.status === 'loading')

  useEffect(() => {
    if (urlState.page !== currentPage) {
      const normalized = serializeListUrlState({
        ...urlState,
        page: currentPage,
      })
      ownNavigationSearchesRef.current.add(
        normalized.size ? `?${normalized.toString()}` : '',
      )
      setSearchParams(
        normalized,
        {
          replace: true,
          state: historyUserStateWithSnapshot(mobileVisible, window.scrollY),
        },
      )
    }
  }, [currentPage, setSearchParams, urlState])

  const toRow = (entry: (typeof sorted)[number]): FundListRow =>
    toFundListRow(
      entry.fund,
      scenarioFunds?.[entry.fund.share_code],
      scenario,
      entry.calculation,
      scenarioLoading,
    )
  const pageStart = (currentPage - 1) * urlState.pageSize
  const desktopRows = sorted
    .slice(pageStart, pageStart + urlState.pageSize)
    .map(toRow)
  const mobileRows = sorted.slice(0, mobileVisible).map(toRow)

  const updateUrl = (next: ListUrlState, replace = true) => {
    const params = serializeListUrlState(next)
    const serialized = params.toString()
    latestUrlStateRef.current = next
    if (serialized === lastUrlWriteRef.current) return
    lastUrlWriteRef.current = serialized
    ownNavigationSearchesRef.current.add(
      serialized ? `?${serialized}` : '',
    )
    setMobileVisible(30)
    setSearchParams(params, {
      replace,
      state: historyUserStateWithSnapshot(30, window.scrollY),
    })
  }

  const onScenarioCommit = (value: ScenarioControlValue) => {
    setScenarioDraft(value)
    updateUrl(scenarioToUrl(value, latestUrlStateRef.current), false)
  }

  const emptyState =
    cnyFunds.length === 0
      ? {
          kind: 'dataset' as const,
          title: '暂未发布费率数据',
          description: '当前版本没有可展示的基金。',
        }
      : urlState.q && filtered.length === 0
        ? {
            kind: 'search' as const,
            title: `没有找到“${urlState.q}”`,
            description: '请尝试基金代码、名称、指数名称或指数代码。',
            action: {
              label: '清除搜索',
              onClick: () => updateUrl({ ...urlState, q: '', page: 1 }),
            },
          }
        : {
            kind: 'filters' as const,
            title: '没有符合当前筛选的基金',
            description: '可以放宽一个或多个筛选条件后重试。',
            action: {
              label: '清除全部筛选',
              onClick: () => {
                const clean = parseListUrlState(new URLSearchParams())
                updateUrl({
                  ...clean,
                  purchasePriceMode: urlState.purchasePriceMode,
                  amountMode: urlState.amountMode,
                  amount: urlState.amount,
                  holdingMode: urlState.holdingMode,
                  holdingDays: urlState.holdingDays,
                })
              },
            },
          }

  const state =
    dataset.status === 'loading'
      ? ('loading' as const)
      : dataset.status === 'error'
        ? ('error' as const)
        : ('ready' as const)
  const resourceState = !scenarioEnabled
    ? ('idle' as const)
    : scenarioResource.state.status

  return (
    <FundListPage
      state={state}
      theme={theme}
      onThemeChange={onThemeChange}
      overview={
        dataset.status === 'ready'
          ? overviewFor(dataset.manifest, cnyFunds)
          : undefined
      }
      errorMessage={
        dataset.status === 'error' ? dataset.error.message : undefined
      }
      desktopRows={desktopRows}
      mobileRows={mobileRows}
      resultCount={sorted.length}
      totalCount={cnyFunds.length}
      filters={filters}
      filterOptions={
        dataset.status === 'ready' ? filterOptions : emptyFilterOptions
      }
      scenario={scenarioDraft}
      scenarioControlRevision={scenarioControlRevision}
      scenarioComplete={scenarioComplete}
      scenarioResourceState={resourceState}
      scenarioErrorMessage={
        scenarioResource.state.status === 'error'
          ? scenarioResource.state.error.message
          : undefined
      }
      pagination={{
        page: currentPage,
        pageSize: urlState.pageSize,
        pageCount,
        totalItems: sorted.length,
      }}
      mobileBatch={{
        visibleItems: Math.min(mobileVisible, sorted.length),
        totalItems: sorted.length,
        batchSize: 30,
      }}
      emptyState={emptyState}
      announcement={
        announcement || `当前显示 ${sorted.length} 只基金`
      }
      onRetry={retryDataset}
      onRetryScenario={scenarioResource.retry}
      onFiltersChange={(value) =>
        updateUrl(filtersToUrlState(value, urlState))
      }
      onClearFilters={() => {
        const clean = parseListUrlState(new URLSearchParams())
        updateUrl({
          ...clean,
          purchasePriceMode: urlState.purchasePriceMode,
          amountMode: urlState.amountMode,
          amount: urlState.amount,
          holdingMode: urlState.holdingMode,
          holdingDays: urlState.holdingDays,
        })
      }}
      onScenarioChange={(value) => {
        setScenarioDraft(value)
        const draftScenario = resolveScenarioControls(value)
        if (
          (!draftScenario.amount || !draftScenario.holdingDays) &&
          urlState.sort.startsWith('scenario_total_rate_')
        ) {
          updateUrl({ ...urlState, sort: 'share_code_asc', page: 1 })
          setAnnouncement(
            '场景输入不完整，已将排序恢复为基金代码升序。',
          )
        } else {
          setAnnouncement(
            `当前显示 ${sorted.length} 只基金`,
          )
        }
      }}
      onScenarioCommit={onScenarioCommit}
      onSortChange={(sort) =>
        updateUrl({ ...urlState, sort, page: 1 }, false)
      }
      onPageChange={(page) =>
        updateUrl({ ...urlState, page }, false)
      }
      onPageSizeChange={(pageSize) =>
        updateUrl({ ...urlState, pageSize, page: 1 }, false)
      }
      onLoadMore={() =>
        setMobileVisible((value) => {
          const next = value + 30
          persistListHistorySnapshot(next, window.scrollY)
          return next
        })
      }
      onOpenFund={(shareCode) => {
        persistListHistorySnapshot(mobileVisible, window.scrollY)
        captureReturnFocus(shareCode)
        navigate(
          {
            pathname: `/fund/${shareCode}`,
            search: location.search,
          },
          { state: { backgroundLocation: location } },
        )
      }}
    />
  )
}

interface DetailControllerProps {
  dataset: ReturnType<typeof useFeeDataset>['state']
  retryDataset: () => void
  standalone: boolean
  theme: ThemeMode
  onThemeChange: (theme: ThemeMode) => void
  onClose?: () => void
}

function DetailController({
  dataset,
  retryDataset,
  standalone,
  theme,
  onThemeChange,
  onClose,
}: DetailControllerProps) {
  const { shareCode = '' } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const fund =
    dataset.status === 'ready'
      ? dataset.funds.find(
          (item) =>
            item.share_code === shareCode && isVisibleCnyFund(item),
        )
      : undefined
  const manifest = dataset.status === 'ready' ? dataset.manifest : undefined
  const detailResource = useFundDetailData(manifest, fund)
  const listState = useMemo(
    () => parseListUrlState(new URLSearchParams(location.search)),
    [location.search],
  )
  const controls = controlsFromUrl(listState)
  const scenario = resolveScenarioControls(controls)
  const scenarioResource = useScenarioRules(
    manifest,
    Boolean(scenario.amount || scenario.holdingDays),
  )
  const scenarioRequested = Boolean(scenario.amount || scenario.holdingDays)
  const scenarioResourceState = !scenarioRequested
    ? ('idle' as const)
    : scenarioResource.state.status === 'idle'
      ? ('loading' as const)
      : scenarioResource.state.status
  const rules =
    scenarioResource.state.status === 'ready' && fund
      ? scenarioResource.state.value.funds[fund.share_code]
      : undefined
  const calculation = fund
    ? calculateFundScenario(fund, rules, scenario)
    : undefined
  const row =
    fund &&
    toFundListRow(
      fund,
      rules,
      scenario,
      calculation,
      Boolean(scenario.amount || scenario.holdingDays) &&
        (scenarioResource.state.status === 'idle' ||
          scenarioResource.state.status === 'loading'),
    )
  const detail =
    fund &&
    row &&
    detailResource.state.status === 'ready'
      ? toFundDetailView(
          fund,
          detailResource.state.value.detail,
          detailResource.state.value.sources.sources,
          row,
          scenario,
          rules,
        )
      : undefined
  const state =
    dataset.status === 'loading' ||
    (fund &&
      (detailResource.state.status === 'idle' ||
        detailResource.state.status === 'loading'))
      ? ('loading' as const)
      : dataset.status === 'error' ||
          !fund ||
          detailResource.state.status === 'error'
        ? ('error' as const)
        : ('ready' as const)
  const errorMessage =
    dataset.status === 'error'
      ? dataset.error.message
      : !fund && dataset.status === 'ready'
        ? '没有找到该基金。'
        : detailResource.state.status === 'error'
          ? detailResource.state.error.message
          : undefined
  const retry =
    dataset.status === 'error'
      ? retryDataset
      : fund && detailResource.state.status === 'error'
        ? detailResource.retry
        : undefined
  const back = () =>
    onClose
      ? onClose()
      : navigate({ pathname: '/', search: location.search })

  if (standalone) {
    return (
      <FundDetailPage
        state={state}
        theme={theme}
        onThemeChange={onThemeChange}
        detail={detail}
        errorMessage={errorMessage}
        releaseId={
          dataset.status === 'ready'
            ? dataset.manifest.release_id
            : undefined
        }
        datasetUpdatedAt={
          dataset.status === 'ready'
            ? dataset.manifest.dataset_updated_at
            : undefined
        }
        fundTotal={
          dataset.status === 'ready'
            ? dataset.funds.filter(isVisibleCnyFund).length
            : undefined
        }
        onBack={back}
        onRetry={retry}
        scenarioResourceState={scenarioResourceState}
        scenarioErrorMessage={
          scenarioResource.state.status === 'error'
            ? scenarioResource.state.error.message
            : undefined
        }
        onRetryScenario={scenarioResource.retry}
      />
    )
  }
  return (
    <FundDetailDrawer
      open
      state={state}
      detail={detail}
      errorMessage={errorMessage}
      onClose={back}
      onRetry={retry}
      scenarioResourceState={scenarioResourceState}
      scenarioErrorMessage={
        scenarioResource.state.status === 'error'
          ? scenarioResource.state.error.message
          : undefined
      }
      onRetryScenario={scenarioResource.retry}
    />
  )
}

function RoutedApp() {
  const dataset = useFeeDataset()
  const { theme, setTheme } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const returnFocusRef = useRef<{
    element: HTMLElement | null
    token: string
  } | null>(null)
  const routeState = location.state as
    | { backgroundLocation?: Location }
    | null
  const backgroundLocation = routeState?.backgroundLocation

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (!params.has('currency')) return
    params.delete('currency')
    const search = params.toString()
    navigate(
      {
        pathname: location.pathname,
        search: search ? `?${search}` : '',
        hash: location.hash,
      },
      { replace: true, state: location.state },
    )
  }, [location.hash, location.pathname, location.search, location.state, navigate])

  return (
    <>
      <Routes location={backgroundLocation}>
        <Route
          path="/"
          element={
            <FundListController
              dataset={dataset.state}
              retryDataset={dataset.retry}
              theme={theme}
              onThemeChange={setTheme}
              captureReturnFocus={(shareCode) => {
                const element =
                  document.activeElement instanceof HTMLElement
                    ? document.activeElement
                    : null
                returnFocusRef.current = {
                  element,
                  token:
                    element?.dataset.fundDetailTrigger ??
                    `${shareCode}:table`,
                }
              }}
            />
          }
        />
        <Route
          path="/fund/:shareCode"
          element={
            <DetailController
              dataset={dataset.state}
              retryDataset={dataset.retry}
              standalone
              theme={theme}
              onThemeChange={setTheme}
            />
          }
        />
        <Route
          path="*"
          element={
            <FundListController
              dataset={dataset.state}
              retryDataset={dataset.retry}
              theme={theme}
              onThemeChange={setTheme}
              captureReturnFocus={() => undefined}
            />
          }
        />
      </Routes>
      {backgroundLocation ? (
        <Routes>
          <Route
            path="/fund/:shareCode"
            element={
              <DetailController
                dataset={dataset.state}
                retryDataset={dataset.retry}
                standalone={false}
                theme={theme}
                onThemeChange={setTheme}
                onClose={() => {
                  const returnTarget = returnFocusRef.current
                  navigate(-1)
                  window.setTimeout(() => {
                    const target = returnTarget?.element?.isConnected
                      ? returnTarget.element
                      : Array.from(
                          document.querySelectorAll<HTMLElement>(
                            '[data-fund-detail-trigger]',
                          ),
                        ).find(
                          (element) =>
                            element.dataset.fundDetailTrigger ===
                            returnTarget?.token,
                        )
                    target?.focus()
                  }, 0)
                }}
              />
            }
          />
        </Routes>
      ) : null}
    </>
  )
}

export function App() {
  return (
    <BrowserRouter>
      <RoutedApp />
    </BrowserRouter>
  )
}
