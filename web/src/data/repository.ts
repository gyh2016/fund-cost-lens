import {
  detailShardSchema,
  fundIndexSchema,
  manifestSchema,
  scenarioRulesSchema,
  sourcesSchema,
  type FundDetail,
  type FundIndex,
  type DetailShard,
  type Manifest,
  type ScenarioRules,
  type Sources,
} from './schemas'

const manifestPath = `${import.meta.env.BASE_URL}data/fees/manifest.json`

export class DataLoadError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message)
    this.name = 'DataLoadError'
  }
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) {
    throw new DataLoadError(`数据请求失败（${response.status}）`)
  }
  return response.json()
}

function absoluteUrl(relativeUrl: string): string {
  const base = new URL(manifestPath, window.location.href)
  return new URL(relativeUrl, base).href
}

let manifestPromise: Promise<Manifest> | undefined
let indexCache: { releaseId: string; value: Promise<FundIndex> } | undefined
let scenarioCache:
  | { releaseId: string; value: Promise<ScenarioRules> }
  | undefined
let sourcesCache: { releaseId: string; value: Promise<Sources> } | undefined
const detailShardCache = new Map<string, Promise<DetailShard>>()

export function clearDataCache(): void {
  manifestPromise = undefined
  indexCache = undefined
  scenarioCache = undefined
  sourcesCache = undefined
  detailShardCache.clear()
}

export async function loadManifest(): Promise<Manifest> {
  manifestPromise ??= fetchJson(manifestPath)
    .then((value) => manifestSchema.parse(value))
    .catch((error) => {
      manifestPromise = undefined
      throw new DataLoadError('无法读取当前数据版本，请稍后重试。', error)
    })
  return manifestPromise
}

export async function loadFundIndex(
  manifest: Manifest,
): Promise<FundIndex> {
  if (indexCache?.releaseId !== manifest.release_id) {
    indexCache = {
      releaseId: manifest.release_id,
      value: fetchJson(absoluteUrl(manifest.assets.index.url))
        .then((value) => fundIndexSchema.parse(value))
        .catch((error) => {
          indexCache = undefined
          throw new DataLoadError('基金列表加载失败，请重试。', error)
        }),
    }
  }
  return indexCache.value
}

export async function loadScenarioRules(
  manifest: Manifest,
): Promise<ScenarioRules> {
  if (scenarioCache?.releaseId !== manifest.release_id) {
    scenarioCache = {
      releaseId: manifest.release_id,
      value: fetchJson(absoluteUrl(manifest.assets.scenario_rules.url))
        .then((value) => scenarioRulesSchema.parse(value))
        .then((value) => {
          if (value.release_id && value.release_id !== manifest.release_id) {
            throw new Error('场景规则版本与列表不一致')
          }
          return value
        })
        .catch((error) => {
          scenarioCache = undefined
          throw new DataLoadError('场景计算数据加载失败。', error)
        }),
    }
  }
  return scenarioCache.value
}

export async function loadSources(
  manifest: Manifest,
): Promise<Sources> {
  if (sourcesCache?.releaseId !== manifest.release_id) {
    sourcesCache = {
      releaseId: manifest.release_id,
      value: fetchJson(absoluteUrl(manifest.assets.sources.url))
        .then((value) => sourcesSchema.parse(value))
        .catch((error) => {
          sourcesCache = undefined
          throw new DataLoadError('来源信息加载失败。', error)
        }),
    }
  }
  return sourcesCache.value
}

export async function loadFundDetail(
  manifest: Manifest,
  shareCode: string,
  shard: string,
): Promise<FundDetail> {
  const key = `${manifest.release_id}:${shard}`

  const asset = manifest.assets.detail_shards[shard]
  if (!asset) {
    throw new DataLoadError('找不到该基金的详情分片。')
  }

  let promise = detailShardCache.get(key)
  if (!promise) {
    promise = fetchJson(absoluteUrl(asset.url))
      .then((value) => detailShardSchema.parse(value))
      .catch((error) => {
        detailShardCache.delete(key)
        throw new DataLoadError('基金详情加载失败。', error)
      })
    detailShardCache.set(key, promise)
  }
  const value = await promise
  const detail = value.funds[shareCode]
  if (!detail) {
    throw new DataLoadError('详情分片中没有该基金。')
  }
  return detail
}
