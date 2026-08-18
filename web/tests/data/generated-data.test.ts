import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  detailShardSchema,
  fundIndexSchema,
  manifestSchema,
  scenarioRulesSchema,
  sourcesSchema,
} from '../../src/data/schemas'

const dataRoot = resolve(process.cwd(), 'public/data/fees')
const readJson = (path: string) =>
  JSON.parse(readFileSync(resolve(dataRoot, path), 'utf8')) as unknown

describe('生成的网页数据', () => {
  const manifest = manifestSchema.parse(readJson('manifest.json'))

  it('manifest 与列表和场景规则数量一致', () => {
    const index = fundIndexSchema.parse(readJson(manifest.assets.index.url))
    const scenario = scenarioRulesSchema.parse(
      readJson(manifest.assets.scenario_rules.url),
    )
    expect(index.funds).toHaveLength(manifest.counts.current_shares)
    expect(Object.keys(scenario.funds)).toHaveLength(
      manifest.counts.current_shares,
    )
  })

  it('来源和全部详情分片均可由前端 schema 解析', () => {
    const sources = sourcesSchema.parse(
      readJson(manifest.assets.sources.url),
    )
    expect(Object.keys(sources.sources)).toHaveLength(
      manifest.counts.current_documents +
        manifest.counts.current_profiles +
        manifest.counts.current_platform_offers,
    )
    let detailCount = 0
    for (const [shard, asset] of Object.entries(
      manifest.assets.detail_shards,
    )) {
      const detail = detailShardSchema.parse(readJson(asset.url))
      expect(detail.shard).toBe(shard)
      detailCount += Object.keys(detail.funds).length
    }
    expect(detailCount).toBe(manifest.counts.current_shares)
  })

  it('manifest 中所有资源哈希与文件一致', () => {
    const assets = [
      manifest.assets.index,
      manifest.assets.scenario_rules,
      manifest.assets.sources,
      ...Object.values(manifest.assets.detail_shards),
    ]
    for (const asset of assets) {
      const bytes = readFileSync(resolve(dataRoot, asset.url))
      expect(bytes.byteLength).toBe(asset.bytes)
      expect(createHash('sha256').update(bytes).digest('hex')).toBe(
        asset.sha256,
      )
    }
  })
})
