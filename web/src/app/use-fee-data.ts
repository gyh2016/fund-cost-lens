import { useCallback, useEffect, useRef, useState } from 'react'
import {
  clearDataCache,
  loadFundDetail,
  loadFundIndex,
  loadManifest,
  loadScenarioRules,
  loadSources,
  type FundDetail,
  type FundIndexItem,
  type Manifest,
  type ScenarioRules,
  type Sources,
} from '../data'

type DatasetState =
  | { status: 'loading'; manifest?: undefined; funds?: undefined }
  | { status: 'error'; error: Error; manifest?: undefined; funds?: undefined }
  | { status: 'ready'; manifest: Manifest; funds: FundIndexItem[] }

export function useFeeDataset() {
  const [state, setState] = useState<DatasetState>({ status: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    setState({ status: 'loading' })
    loadManifest()
      .then(async (manifest) => {
        const index = await loadFundIndex(manifest)
        if (index.funds.length !== manifest.counts.current_shares) {
          throw new Error('基金列表数量与版本清单不一致')
        }
        if (active) {
          setState({ status: 'ready', manifest, funds: index.funds })
        }
      })
      .catch((error: unknown) => {
        if (!active) return
        setState({
          status: 'error',
          error: error instanceof Error ? error : new Error(String(error)),
        })
      })
    return () => {
      active = false
    }
  }, [reloadKey])

  const retry = useCallback(() => {
    clearDataCache()
    setReloadKey((key) => key + 1)
  }, [])

  return { state, retry }
}

type AsyncState<T> =
  | { status: 'idle'; value?: undefined; error?: undefined }
  | { status: 'loading'; value?: undefined; error?: undefined }
  | { status: 'ready'; value: T; error?: undefined }
  | { status: 'error'; value?: undefined; error: Error }

export function useScenarioRules(
  manifest: Manifest | undefined,
  enabled: boolean,
) {
  const [state, setState] = useState<AsyncState<ScenarioRules>>({
    status: 'idle',
  })
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    if (!manifest || !enabled) {
      setState({ status: 'idle' })
      return
    }
    let active = true
    setState({ status: 'loading' })
    loadScenarioRules(manifest)
      .then((value) => {
        if (active) setState({ status: 'ready', value })
      })
      .catch((error: unknown) => {
        if (!active) return
        setState({
          status: 'error',
          error: error instanceof Error ? error : new Error(String(error)),
        })
      })
    return () => {
      active = false
    }
  }, [enabled, manifest, retryKey])

  return {
    state,
    retry: useCallback(() => setRetryKey((key) => key + 1), []),
  }
}

export function useFundDetailData(
  manifest: Manifest | undefined,
  fund: FundIndexItem | undefined,
) {
  const [state, setState] = useState<
    AsyncState<{ detail: FundDetail; sources: Sources }>
  >({ status: 'idle' })
  const requestRef = useRef(0)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    if (!manifest || !fund) {
      setState({ status: 'idle' })
      return
    }
    let active = true
    const request = ++requestRef.current
    setState({ status: 'loading' })
    Promise.all([
      loadFundDetail(
        manifest,
        fund.share_code,
        fund.detail_shard,
      ),
      loadSources(manifest),
    ])
      .then(([detail, sources]) => {
        if (active && request === requestRef.current) {
          setState({ status: 'ready', value: { detail, sources } })
        }
      })
      .catch((error: unknown) => {
        if (!active || request !== requestRef.current) return
        setState({
          status: 'error',
          error: error instanceof Error ? error : new Error(String(error)),
        })
      })
    return () => {
      active = false
    }
  }, [fund, manifest, retryKey])

  return {
    state,
    retry: useCallback(() => setRetryKey((key) => key + 1), []),
  }
}
