import { z } from 'zod'

export const feeStateSchema = z.enum([
  'known',
  'not_applicable',
  'source_missing',
  'unparsed',
])

export const optionalFeeStateSchema = z.enum([
  ...feeStateSchema.options,
  'not_listed',
])

const decimalStringSchema = z.string().regex(/^-?\d+(?:\.\d+)?$/)
const nullableDecimalSchema = decimalStringSchema.nullable()

export const assetSchema = z.object({
  url: z.string().min(1),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  bytes: z.number().int().nonnegative(),
})

export const manifestSchema = z.object({
  manifest_version: z.literal(1),
  schema_version: z.string(),
  dataset_version: z.string().startsWith('sha256:'),
  release_id: z.string().regex(/^v1-[a-f0-9]{12}$/),
  dataset_updated_at: z.string(),
  generated_at: z.string(),
  source_policy: z.string(),
  counts: z.object({
    current_shares: z.number().int().nonnegative(),
    current_documents: z.number().int().nonnegative(),
    current_schedules: z.number().int().nonnegative(),
    current_rules: z.number().int().nonnegative(),
    current_shares_with_open_issues: z.number().int().nonnegative(),
    current_open_issues: z.number().int().nonnegative(),
    current_profiles: z.number().int().nonnegative(),
    current_platform_offers: z.number().int().nonnegative(),
    current_platform_offer_rules: z.number().int().nonnegative(),
    current_shares_with_purchase_discount: z.number().int().nonnegative(),
    input_rows: z.object({
      indices: z.number().int().nonnegative(),
      shares: z.number().int().nonnegative(),
      documents: z.number().int().nonnegative(),
      schedules: z.number().int().nonnegative(),
      rules: z.number().int().nonnegative(),
      issues: z.number().int().nonnegative(),
      profiles: z.number().int().nonnegative(),
      platform_offers: z.number().int().nonnegative(),
      platform_offer_rules: z.number().int().nonnegative(),
    }),
  }),
  review_status_counts: z.object({
    verified: z.number().int().nonnegative(),
    verified_with_issues: z.number().int().nonnegative(),
  }),
  assets: z.object({
    index: assetSchema,
    scenario_rules: assetSchema,
    sources: assetSchema,
    detail_shards: z.record(z.string(), assetSchema),
  }),
})

export const displayRowSchema = z.object({
  condition_text: z.string(),
  charge_text: z.string(),
})

export const tableFeeGroupSchema = z.object({
  state: optionalFeeStateSchema,
  rows: z.array(displayRowSchema),
  detail_only: z.boolean().optional(),
  rule_count: z.number().int().nonnegative().optional(),
})

export const fundIndexItemSchema = z.object({
  share_code: z.string().regex(/^\d{6}$/),
  share_name: z.string(),
  master_name: z.string(),
  share_class: z.string(),
  fund_type: z.enum(['ordinary_index', 'etf_feeder']),
  strategy: z.literal('passive'),
  search_terms: z.array(z.string()),
  index: z.object({
    canonical_id: z.string(),
    code: z.string(),
    name: z.string(),
    aliases: z.array(z.string()),
    match_status: z.string(),
  }),
  review_status: z.enum(['verified', 'verified_with_issues']),
  verified_at: z.string(),
  profile: z.object({
    inception_date: z.string().nullable(),
    net_asset_cny_100m: nullableDecimalSchema,
    net_asset_as_of: z.string().nullable(),
    source_id: z.string().min(1),
  }),
  source_types: z.array(
    z.enum(['eastmoney_standard_rate_page', 'fund_legal_document']),
  ),
  currencies: z.array(z.enum(['CNY', 'USD'])),
  fees: z.object({
    management: z.object({
      state: feeStateSchema,
      rate_fraction: nullableDecimalSchema.optional(),
      kind: z.string().nullable().optional(),
      rule_count: z.number().int().nonnegative().optional(),
    }),
    custody: z.object({
      state: feeStateSchema,
      rate_fraction: nullableDecimalSchema.optional(),
      kind: z.string().nullable().optional(),
      rule_count: z.number().int().nonnegative().optional(),
    }),
    sales_service: z.object({
      state: feeStateSchema,
      rate_fraction: nullableDecimalSchema.optional(),
      kind: z.string().nullable().optional(),
      rule_count: z.number().int().nonnegative().optional(),
    }),
    purchase: z.object({
      state: feeStateSchema,
      kind: z.string().nullable().optional(),
      rule_count: z.number().int().nonnegative().optional(),
    }),
    redemption: z.object({
      state: feeStateSchema,
      kind: z.string().nullable().optional(),
      rule_count: z.number().int().nonnegative().optional(),
    }),
  }),
  table_fees: z.object({
    purchase: z.object({
      frontend: tableFeeGroupSchema,
      discounted: tableFeeGroupSchema,
      backend: tableFeeGroupSchema,
    }),
    redemption: z.object({
      frontend: tableFeeGroupSchema,
      backend: tableFeeGroupSchema,
    }),
  }),
  flags: z.object({
    tiered_sales_service: z.boolean(),
    purchase_backend_state: optionalFeeStateSchema,
    redemption_backend_state: optionalFeeStateSchema,
    special_sales_service_policy: z.boolean().optional(),
    purchase_discount_available: z.boolean(),
  }),
  sort_values: z.object({
    management_rate_fraction: nullableDecimalSchema,
    custody_rate_fraction: nullableDecimalSchema,
    flat_sales_service_rate_fraction: nullableDecimalSchema,
    ongoing_rate_fraction: nullableDecimalSchema,
  }),
  issue_count: z.number().int().nonnegative(),
  detail_shard: z.string(),
})

export const fundIndexSchema = z.object({
  schema_version: z.string(),
  funds: z.array(fundIndexItemSchema),
})

export const tierRuleSchema = z.object({
  lower_bound: nullableDecimalSchema,
  lower_inclusive: z.boolean().nullable(),
  upper_bound: nullableDecimalSchema,
  upper_inclusive: z.boolean().nullable(),
  rate_fraction: nullableDecimalSchema,
  fixed_amount: nullableDecimalSchema.optional(),
  currency: z.enum(['CNY', 'USD']).nullable().optional(),
})

export const scenarioFundSchema = z.object({
  purchase_currency: z.enum(['CNY', 'USD']).nullable(),
  purchase_state: feeStateSchema,
  purchase: z.array(tierRuleSchema),
  purchase_discounted: z.array(tierRuleSchema),
  redemption_state: feeStateSchema,
  redemption: z.array(tierRuleSchema.omit({ fixed_amount: true, currency: true })),
  sales_service: z.object({
    state: feeStateSchema,
    rules: z.array(
      tierRuleSchema.extend({
        tier_metric: z.enum(['none', 'holding_days']),
        tier_unit: z.enum(['none', 'day']),
      }),
    ),
  }),
})

export const scenarioRulesSchema = z.object({
  schema_version: z.string(),
  release_id: z.string().optional(),
  funds: z.record(z.string().regex(/^\d{6}$/), scenarioFundSchema),
})

export const sourceSchema = z.object({
  document_id: z.string().optional(),
  type: z.string().optional(),
  title: z.string(),
  manager_name: z.string().nullable().optional(),
  compiled_date: z.string().nullable().optional(),
  published_date: z.string().nullable().optional(),
  site: z.string(),
  url: z.string().url(),
  retrieved_at: z.string(),
})

export const sourcesSchema = z.object({
  schema_version: z.string(),
  sources: z.record(z.string(), sourceSchema),
})

export const detailRuleSchema = z.object({
  document_id: z.string(),
  tier_no: z.number().int().positive(),
  tier_metric: z.string(),
  tier_unit: z.string(),
  lower_bound: nullableDecimalSchema,
  lower_inclusive: z.boolean().nullable(),
  upper_bound: nullableDecimalSchema,
  upper_inclusive: z.boolean().nullable(),
  formula_code: z.string(),
  rate_fraction: nullableDecimalSchema,
  fixed_amount: nullableDecimalSchema,
  currency: z.enum(['CNY', 'USD']).nullable(),
  secondary_tier_metric: z.string(),
  secondary_tier_unit: z.string(),
  secondary_lower_bound: nullableDecimalSchema,
  secondary_lower_inclusive: z.boolean().nullable(),
  secondary_upper_bound: nullableDecimalSchema,
  secondary_upper_inclusive: z.boolean().nullable(),
  source_locator: z.string(),
})

export const detailFeeSchema = z.object({
  state: feeStateSchema,
  rules: z.array(detailRuleSchema),
  issue_ids: z.array(z.string()),
})

export const issueSchema = z.object({
  issue_id: z.string(),
  fee_type: z.string(),
  issue_code: z.string(),
  status: z.enum(['open', 'resolved']),
  source_locator: z.string(),
  recorded_at: z.string(),
  resolved_at: z.string().nullable(),
  resolution_document_id: z.string().nullable(),
  resolution_note: z.string().nullable(),
})

export const detailFundSchema = z.object({
  profile_source_id: z.string().min(1),
  purchase_discount_source_id: z.string().nullable(),
  schedule: z.object({
    schedule_id: z.string(),
    document_id: z.string(),
    valid_from: z.string().nullable(),
    review_status: z.enum(['verified', 'verified_with_issues']),
    verified_at: z.string().optional(),
  }),
  fees: z.record(z.string(), detailFeeSchema),
  issues: z.array(issueSchema),
  document_ids: z.array(z.string()).optional(),
  source_document_ids: z.array(z.string()).optional(),
})

export const detailShardSchema = z.object({
  schema_version: z.string(),
  shard: z.string(),
  funds: z.record(z.string().regex(/^\d{6}$/), detailFundSchema),
})

export type FeeState = z.infer<typeof feeStateSchema>
export type OptionalFeeState = z.infer<typeof optionalFeeStateSchema>
export type Manifest = z.infer<typeof manifestSchema>
export type FundIndexItem = z.infer<typeof fundIndexItemSchema>
export type FundIndex = z.infer<typeof fundIndexSchema>
export type ScenarioFund = z.infer<typeof scenarioFundSchema>
export type ScenarioRules = z.infer<typeof scenarioRulesSchema>
export type FundDetail = z.infer<typeof detailFundSchema>
export type DetailShard = z.infer<typeof detailShardSchema>
export type Source = z.infer<typeof sourceSchema>
export type Sources = z.infer<typeof sourcesSchema>
