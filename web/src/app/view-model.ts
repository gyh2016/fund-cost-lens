import Decimal from 'decimal.js'
import type {
  FeeDisplaySectionView,
  FeeTierView,
  FundDetailView,
  FundListRow,
  PurchasePriceMode,
  ScenarioControlValue,
  ScenarioFeeView,
} from '../components/types'
import type {
  FundDetail,
  FundIndexItem,
  ScenarioFund,
  Source,
} from '../data'
import {
  calculateScenario,
  formatMoney,
  formatPercent,
  matchesTier,
  parseIntegerInput,
  resolvePurchaseRate,
  resolveRedemptionRate,
  resolveSalesServiceRate,
  scenarioReasonLabels,
  type ComponentResult,
  type ScenarioCalculationResult,
  type ScenarioFeeRules,
  type TierRule,
} from '../domain/fees'

export interface ResolvedScenario {
  amount: string | null
  holdingDays: string | null
  currency: 'CNY'
  purchasePriceMode: PurchasePriceMode
}

type EnrichedFundIndexItem = FundIndexItem & {
  profile?: {
    inception_date: string | null
    net_asset_cny_100m: string | null
    net_asset_as_of: string | null
    source_id: string
  }
  flags: FundIndexItem['flags'] & {
    purchase_discount_available?: boolean
  }
  table_fees: FundIndexItem['table_fees'] & {
    purchase: FundIndexItem['table_fees']['purchase'] & {
      discounted?: FundIndexItem['table_fees']['purchase']['frontend']
    }
  }
}

type EnrichedScenarioFund = ScenarioFund & {
  purchase_discounted?: TierRule[]
}

export function resolveScenarioControls(
  value: ScenarioControlValue,
): ResolvedScenario {
  const parsedAmount = parseIntegerInput(value.amountCustom)
  const parsedHolding = parseIntegerInput(value.holdingCustom)
  const amount =
    value.amountMode === 'preset'
      ? value.amountPreset
      : value.amountMode === 'custom' && parsedAmount.kind === 'valid'
        ? parsedAmount.normalized
        : null
  const holdingDays =
    value.holdingMode === 'preset'
      ? value.holdingPreset
      : value.holdingMode === 'custom' && parsedHolding.kind === 'valid'
        ? parsedHolding.normalized
        : null
  return {
    amount,
    holdingDays,
    currency: 'CNY',
    purchasePriceMode: value.purchasePriceMode,
  }
}

function scenarioRulesFromData(rules: ScenarioFund): ScenarioFeeRules {
  return rules as EnrichedScenarioFund as ScenarioFeeRules
}

export function calculateFundScenario(
  fund: FundIndexItem,
  rules: ScenarioFund | undefined,
  scenario: ResolvedScenario,
): ScenarioCalculationResult | undefined {
  if (!rules) return undefined
  return calculateScenario({
    amount: scenario.amount,
    holdingDays: scenario.holdingDays,
    currency: scenario.currency,
    managementRateFraction:
      fund.sort_values.management_rate_fraction,
    custodyRateFraction: fund.sort_values.custody_rate_fraction,
    rules: scenarioRulesFromData(rules),
    purchasePriceMode: scenario.purchasePriceMode,
  })
}

function fundTypeLabel(type: FundIndexItem['fund_type']): string {
  return type === 'etf_feeder' ? 'ETF 联接基金' : '普通指数基金'
}

function matchStatusLabel(status: string): string {
  return status === 'official_index_directory'
    ? '指数目录确认'
    : status === 'name_candidate'
      ? '名称候选待核验'
      : status
}

type PurchasePriceDisplayMode = 'discounted' | 'standard_fallback'

function purchasePriceDisplay(
  chargeText: string,
  mode?: PurchasePriceDisplayMode,
): Pick<FeeTierView, 'charge' | 'note'> {
  const discountedSuffix = '（东方财富优惠）'
  const standardSuffix = '（标准费率）'

  if (!mode) return { charge: chargeText }
  if (chargeText.endsWith(discountedSuffix)) {
    return {
      charge: chargeText.slice(0, -discountedSuffix.length),
    }
  }
  if (chargeText.endsWith(standardSuffix)) {
    return {
      charge: chargeText.slice(0, -standardSuffix.length),
      note: '此档按标准费率展示',
    }
  }
  if (mode === 'discounted') {
    return { charge: chargeText }
  }
  if (mode === 'standard_fallback') {
    return { charge: chargeText, note: '此档按标准费率展示' }
  }
  return { charge: chargeText }
}

function displayStateRows(
  id: string,
  label: string,
  group: FundIndexItem['table_fees']['purchase']['frontend'],
  priceMode?: PurchasePriceDisplayMode,
): FeeDisplaySectionView {
  return {
    id,
    label,
    state: group.state,
    rows: group.rows.map((row, index) => ({
      id: `${id}-${index}`,
      condition: row.condition_text,
      ...purchasePriceDisplay(row.charge_text, priceMode),
    })),
    note: group.detail_only
      ? '费率同时取决于金额和持有时间，请在详情中查看全部分档。'
      : undefined,
  }
}

function resultToFeeCell(
  kind: 'purchase' | 'redemption',
  fund: FundIndexItem,
  result: ComponentResult | undefined,
  rules: ScenarioFund | undefined,
  scenario: ResolvedScenario,
) {
  const table = fund.table_fees[kind]
  const enrichedFund = fund as EnrichedFundIndexItem
  const frontend =
    kind === 'purchase' && scenario.purchasePriceMode === 'discounted'
      ? enrichedFund.table_fees.purchase.discounted ?? table.frontend
      : table.frontend
  const purchasePriceMode: PurchasePriceDisplayMode | undefined =
    kind === 'purchase' && scenario.purchasePriceMode === 'discounted'
      ? enrichedFund.flags.purchase_discount_available
        ? 'discounted'
        : 'standard_fallback'
      : undefined
  const caption =
    kind === 'purchase'
      ? scenario.purchasePriceMode === 'discounted'
        ? enrichedFund.flags.purchase_discount_available
          ? '优惠价'
          : '标准费率'
        : '标准费率'
      : undefined
  const input = kind === 'purchase' ? scenario.amount : scenario.holdingDays
  const primaryLabel = kind === 'purchase' ? '申购时收取' : '赎回时收取'
  if (!input || !result || !rules) {
    const sections = [
      displayStateRows(
        `${fund.share_code}-${kind}-front`,
        primaryLabel,
        frontend,
        purchasePriceMode,
      ),
    ]
    if (table.backend.state !== 'not_listed') {
      sections.push(
        displayStateRows(
          `${fund.share_code}-${kind}-back`,
          '后端收费',
          table.backend,
        ),
      )
    }
    return { mode: 'all_tiers' as const, sections, caption }
  }

  if (frontend.state === 'not_applicable') {
    return {
      mode: 'matched' as const,
      caption,
      sections: [
        displayStateRows(
          `${fund.share_code}-${kind}-front`,
          primaryLabel,
          frontend,
          purchasePriceMode,
        ),
      ],
    }
  }

  if (result.status !== 'ready') {
    const note =
      kind === 'purchase' && result.reason === 'currency_mismatch'
        ? `场景币种 ${scenario.currency}，规则币种 ${rules.purchase_currency ?? '未知'}`
        : scenarioReasonLabels[result.reason]
    return {
      mode: 'matched' as const,
      caption,
      sections: [
        {
          id: `${fund.share_code}-${kind}-result`,
          label: '适用费率',
          state:
            result.reason === 'source_missing'
              ? ('source_missing' as const)
              : result.reason === 'unparsed'
                ? ('unparsed' as const)
                : ('known' as const),
          rows: [],
          note,
        },
      ],
    }
  }

  const structuralRules = kind === 'purchase'
    ? scenario.purchasePriceMode === 'discounted'
      ? (rules as EnrichedScenarioFund).purchase_discounted ?? rules.purchase
      : rules.purchase
    : rules.redemption
  const ruleIndex = structuralRules.indexOf(result.rule as never)
  const originalRow = frontend.rows[ruleIndex]
  const priceDisplay = purchasePriceDisplay(
    originalRow?.charge_text ?? '',
    purchasePriceMode,
  )
  const charge =
    result.fixedAmount && kind === 'purchase'
      ? `${formatMoney(result.fixedAmount, scenario.currency)} / 笔（折算 ${formatPercent(result.rateFraction)}）`
      : formatPercent(result.rateFraction)
  const tier: FeeTierView = {
    id: `${fund.share_code}-${kind}-matched`,
    condition:
      originalRow?.condition_text ??
      (kind === 'purchase'
        ? `申购金额 ${scenario.amount}`
        : `持有 ${scenario.holdingDays} 日`),
    charge,
    note: priceDisplay.note,
    isMatched: true,
    accessibleLabel:
      result.fixedAmount && kind === 'purchase'
        ? `固定申购费 ${formatMoney(result.fixedAmount, scenario.currency)}，场景金额 ${scenario.currency === 'CNY' ? `人民币 ${scenario.amount?.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} 元` : `${scenario.amount?.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} 美元`}，折算费率 ${formatPercent(result.rateFraction)}`
        : undefined,
  }
  return {
    mode: 'matched' as const,
    caption,
    sections: [
      {
        id: `${fund.share_code}-${kind}-front`,
        label: '适用费率',
        state: 'known' as const,
        rows: [tier],
      },
    ],
  }
}

function scenarioView(
  result: ScenarioCalculationResult | undefined,
  scenarioRequested: boolean,
  scenarioLoading: boolean,
  holdingDays: string | null,
  purchasePriceMode: PurchasePriceMode,
): ScenarioFeeView {
  if (scenarioLoading) return { status: 'loading', reason: '正在计算' }
  if (!result) {
    return scenarioRequested
      ? { status: 'error', reason: '场景计算暂不可用' }
      : { status: 'idle' }
  }
  if (result.status === 'idle') {
    return { status: 'idle' }
  }
  if (result.status === 'unavailable') {
    return {
      status: 'unavailable',
      reason: scenarioReasonLabels[result.reason],
    }
  }
  const holdingDaysLabel = (holdingDays ?? '').replace(
    /\B(?=(\d{3})+(?!\d))/g,
    ',',
  )
  return {
    status: 'ready',
    total: formatPercent(result.totalRateFraction),
    ongoing: formatPercent(result.proratedOngoingRateFraction),
    holdingDays: holdingDaysLabel,
    purchase: formatPercent(result.purchaseRateFraction),
    redemption: formatPercent(result.redemptionRateFraction),
    accessibleLabel: `场景总费率 ${formatPercent(result.totalRateFraction)}，其中年度持续费率 ${formatPercent(result.annualOngoingRateFraction)} 按持有 ${holdingDaysLabel} 日折算为 ${formatPercent(result.proratedOngoingRateFraction)}、${purchasePriceMode === 'discounted' ? '优惠申购费' : '标准申购费'} ${formatPercent(result.purchaseRateFraction)}、赎回费 ${formatPercent(result.redemptionRateFraction)}`,
  }
}

export function toFundListRow(
  fund: FundIndexItem,
  rules: ScenarioFund | undefined,
  scenario: ResolvedScenario,
  calculation: ScenarioCalculationResult | undefined,
  scenarioLoading = false,
): FundListRow {
  const purchase = rules
    ? resolvePurchaseRate(
        scenarioRulesFromData(rules),
        scenario.amount,
        scenario.currency,
        scenario.purchasePriceMode,
      )
    : undefined
  const redemption = rules
    ? resolveRedemptionRate(
        scenarioRulesFromData(rules),
        scenario.holdingDays,
      )
    : undefined
  const salesService = rules
    ? resolveSalesServiceRate(
        scenarioRulesFromData(rules),
        scenario.holdingDays,
      )
    : undefined
  const requested = Boolean(scenario.amount || scenario.holdingDays)
  const scenarioOngoingRate =
    salesService?.status === 'ready' &&
    fund.sort_values.management_rate_fraction !== null &&
    fund.sort_values.custody_rate_fraction !== null
      ? new Decimal(fund.sort_values.management_rate_fraction)
          .plus(fund.sort_values.custody_rate_fraction)
          .plus(salesService.rateFraction)
          .toString()
      : null
  return {
    shareCode: fund.share_code,
    shareName: fund.share_name,
    masterName: fund.master_name,
    shareClass: fund.share_class,
    fundType: fund.fund_type,
    fundTypeLabel: fundTypeLabel(fund.fund_type),
    index: {
      canonicalId: fund.index.canonical_id,
      name: fund.index.name,
      code: fund.index.code,
      matchStatusLabel: matchStatusLabel(fund.index.match_status),
    },
    reviewStatus: fund.review_status,
    verifiedAt: fund.verified_at,
    issueCount: fund.issue_count,
    currencies: fund.currencies,
    profile: {
      inceptionDate:
        (fund as EnrichedFundIndexItem).profile?.inception_date ?? null,
      netAssetCny100m:
        (fund as EnrichedFundIndexItem).profile?.net_asset_cny_100m ?? null,
      netAssetAsOf:
        (fund as EnrichedFundIndexItem).profile?.net_asset_as_of ?? null,
    },
    purchaseDiscountAvailable:
      (fund as EnrichedFundIndexItem).flags.purchase_discount_available ?? false,
    ongoing: {
      management: formatPercent(fund.sort_values.management_rate_fraction),
      custody: formatPercent(fund.sort_values.custody_rate_fraction),
      salesService:
        fund.fees.sales_service.state === 'not_applicable'
          ? '不适用'
          : fund.fees.sales_service.state === 'source_missing'
            ? '公开来源未列出'
            : fund.fees.sales_service.state === 'unparsed'
              ? '暂时无法读取'
              : fund.fees.sales_service.kind === 'tiered'
                ? salesService?.status === 'ready'
                  ? formatPercent(salesService.rateFraction)
                  : '按持有期分档'
                : formatPercent(fund.fees.sales_service.rate_fraction),
      salesServiceNote: fund.flags.special_sales_service_policy
        ? '特殊销售服务费按非直销口径'
        : undefined,
      total:
        calculation?.status === 'ready'
          ? formatPercent(calculation.annualOngoingRateFraction)
          : formatPercent(
              scenarioOngoingRate ?? fund.sort_values.ongoing_rate_fraction,
            ),
    },
    purchase: resultToFeeCell(
      'purchase',
      fund,
      purchase,
      rules,
      scenario,
    ),
    redemption: resultToFeeCell(
      'redemption',
      fund,
      redemption,
      rules,
      scenario,
    ),
    scenario: scenarioView(
      calculation,
      requested,
      scenarioLoading,
      scenario.holdingDays,
      scenario.purchasePriceMode,
    ),
  }
}

function conditionPart(
  metric: string,
  unit: string,
  lower: string | null,
  lowerInclusive: boolean | null,
  upper: string | null,
  upperInclusive: boolean | null,
): string {
  if (metric === 'none') return '全部'
  const subject =
    metric === 'purchase_amount'
      ? '申购金额'
      : metric === 'holding_days'
        ? '持有天数'
        : metric === 'holding_years'
          ? '持有年限'
          : metric
  const unitText =
    unit === 'CNY' ? '元' : unit === 'USD' ? '美元' : unit === 'day' ? '日' : unit === 'year' ? '年' : ''
  if (lower === null && upper === null) return `全部${subject}`
  if (lower === null) return `${subject} ${upperInclusive ? '≤' : '<'} ${upper} ${unitText}`
  if (upper === null) return `${subject} ${lowerInclusive ? '≥' : '>'} ${lower} ${unitText}`
  return `${lower} ${unitText} ${lowerInclusive ? '≤' : '<'} ${subject} ${upperInclusive ? '≤' : '<'} ${upper} ${unitText}`
}

function detailTier(
  rule: FundDetail['fees'][string]['rules'][number],
  id: string,
  isMatched = false,
): FeeTierView {
  const primary = conditionPart(
    rule.tier_metric,
    rule.tier_unit,
    rule.lower_bound,
    rule.lower_inclusive,
    rule.upper_bound,
    rule.upper_inclusive,
  )
  const secondary =
    rule.secondary_tier_metric !== 'none'
      ? conditionPart(
          rule.secondary_tier_metric,
          rule.secondary_tier_unit,
          rule.secondary_lower_bound,
          rule.secondary_lower_inclusive,
          rule.secondary_upper_bound,
          rule.secondary_upper_inclusive,
        )
      : ''
  let charge = '—'
  if (rule.formula_code === 'not_applicable') charge = '不适用'
  else if (rule.formula_code === 'source_missing') charge = '来源未显示'
  else if (rule.rate_fraction !== null) charge = formatPercent(rule.rate_fraction)
  else if (rule.fixed_amount !== null && rule.currency) {
    charge = `${formatMoney(rule.fixed_amount, rule.currency)} / 笔`
  }
  return {
    id,
    condition: secondary ? `${primary}；${secondary}` : primary,
    charge,
    isMatched,
  }
}

function detailRuleMatchesScenario(
  rule: FundDetail['fees'][string]['rules'][number],
  type: string,
  scenario: ResolvedScenario,
): boolean {
  if (type === 'purchase') {
    if (!scenario.amount || rule.tier_metric !== 'purchase_amount') return false
    if (
      (rule.tier_unit === 'CNY' || rule.tier_unit === 'USD') &&
      rule.tier_unit !== scenario.currency
    ) {
      return false
    }
    return matchesTier(rule, scenario.amount)
  }
  if (type === 'redemption' || type === 'sales_service') {
    if (!scenario.holdingDays) return false
    if (
      rule.tier_metric !== 'holding_days' &&
      rule.tier_metric !== 'none'
    ) {
      return false
    }
    return matchesTier(rule, scenario.holdingDays)
  }
  return false
}

function detailSection(
  fundCode: string,
  type: string,
  label: string,
  detail: FundDetail,
  scenario?: ResolvedScenario,
): FeeDisplaySectionView | undefined {
  const fee = detail.fees[type]
  if (!fee) return undefined
  return {
    id: `${fundCode}-detail-${type}`,
    label,
    state: fee.state,
    rows: fee.rules.map((rule, index) =>
      detailTier(
        rule,
        `${fundCode}-${type}-${index}`,
        scenario ? detailRuleMatchesScenario(rule, type, scenario) : false,
      ),
    ),
  }
}

function discountedPurchaseDetailSection(
  fund: FundIndexItem,
  scenario: ResolvedScenario,
  rules: ScenarioFund | undefined,
): FeeDisplaySectionView {
  const enrichedFund = fund as EnrichedFundIndexItem
  const frontend =
    enrichedFund.table_fees.purchase.discounted ??
    fund.table_fees.purchase.frontend
  const structuralRules = rules
    ? (rules as EnrichedScenarioFund).purchase_discounted ?? rules.purchase
    : []
  const currencyMatches =
    !rules?.purchase_currency || rules.purchase_currency === scenario.currency
  const section = displayStateRows(
    `${fund.share_code}-detail-purchase-discounted`,
    enrichedFund.flags.purchase_discount_available
      ? '申购费（优惠价）'
      : '申购费（标准费率）',
    frontend,
    enrichedFund.flags.purchase_discount_available
      ? 'discounted'
      : 'standard_fallback',
  )

  return {
    ...section,
    note: enrichedFund.flags.purchase_discount_available
      ? '来源：东方财富公开页面。'
      : '未显示优惠，按标准费率展示。',
    rows: section.rows.map((row, index) => ({
      ...row,
      isMatched: Boolean(
        scenario.amount &&
          currencyMatches &&
          structuralRules[index] &&
          matchesTier(structuralRules[index], scenario.amount),
      ),
    })),
  }
}

function sourceValues(
  detail: FundDetail,
  sources: Record<string, Source>,
  purchasePriceMode: PurchasePriceMode,
) {
  const ids = new Set<string>([
    detail.schedule.document_id,
    detail.profile_source_id,
    ...(purchasePriceMode === 'discounted' && detail.purchase_discount_source_id
      ? [detail.purchase_discount_source_id]
      : []),
    ...(detail.document_ids ?? []),
    ...(detail.source_document_ids ?? []),
    ...Object.values(detail.fees).flatMap((fee) =>
      fee.rules.map((rule) => rule.document_id),
    ),
    ...detail.issues.flatMap((issue) =>
      issue.resolution_document_id ? [issue.resolution_document_id] : [],
    ),
  ])
  return [...ids]
    .map((id) => ({ id, source: sources[id] }))
    .filter(
      (item): item is { id: string; source: Source } => Boolean(item.source),
    )
    .map(({ id, source }) => ({
      documentId: id,
      title: source.title,
      site: source.site,
      url: source.url,
      retrievedAt: source.retrieved_at,
    }))
}

function describeScenario(scenario: ResolvedScenario): string {
  if (!scenario.amount && !scenario.holdingDays) {
    return '未设置金额和持有时间，以下显示全部费率分档。'
  }
  const amount = scenario.amount
    ? `人民币 ${scenario.amount.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} 元`
    : null
  const holding = scenario.holdingDays
    ? `持有 ${scenario.holdingDays.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} 日`
    : null
  if (amount && holding) return `${amount}，${holding}；适用档位已高亮。`
  if (amount) return `${amount}；申购费适用档位已高亮。`
  return `${holding}；赎回费适用档位已高亮。`
}

export function toFundDetailView(
  fund: FundIndexItem,
  detail: FundDetail,
  sources: Record<string, Source>,
  row: FundListRow,
  scenario: ResolvedScenario,
  rules?: ScenarioFund,
): FundDetailView {
  const purchaseSections = [
    scenario.purchasePriceMode === 'discounted'
      ? discountedPurchaseDetailSection(fund, scenario, rules)
      : detailSection(
          fund.share_code,
          'purchase',
          '申购费（标准费率）',
          detail,
          scenario,
        ),
    detailSection(fund.share_code, 'purchase_backend', '后端收费申购费', detail),
  ].filter((value): value is FeeDisplaySectionView => Boolean(value))
  const redemptionSections = [
    detailSection(
      fund.share_code,
      'redemption',
      '赎回费',
      detail,
      scenario,
    ),
    detailSection(fund.share_code, 'redemption_backend', '后端收费赎回费', detail),
  ].filter((value): value is FeeDisplaySectionView => Boolean(value))
  const salesService = detailSection(
    fund.share_code,
    'sales_service',
    '销售服务费',
    detail,
    scenario,
  )
  return {
    shareCode: fund.share_code,
    shareName: fund.share_name,
    masterName: fund.master_name,
    shareClass: fund.share_class,
    fundTypeLabel: fundTypeLabel(fund.fund_type),
    strategyLabel: '被动指数',
    reviewStatus: fund.review_status,
    verifiedAt: fund.verified_at,
    currencies: fund.currencies,
    index: {
      name: fund.index.name,
      code: fund.index.code,
      canonicalId: fund.index.canonical_id,
      matchStatusLabel: matchStatusLabel(fund.index.match_status),
    },
    ongoing: row.ongoing,
    salesServiceSections: salesService ? [salesService] : [],
    purchaseSections,
    redemptionSections,
    scenario: row.scenario,
    scenarioDescription: describeScenario(scenario),
    issues: detail.issues.map((issue) => ({
      id: issue.issue_id,
      title:
        issue.status === 'resolved' ? '历史问题（已解决）' : '数据问题',
      description: issue.resolution_note || issue.source_locator,
      affectedField: issue.fee_type,
      statusLabel: issue.status === 'resolved' ? '已解决' : '待处理',
    })),
    sources: sourceValues(detail, sources, scenario.purchasePriceMode),
    schedule: {
      scheduleId: detail.schedule.schedule_id,
      documentId: detail.schedule.document_id,
      validFrom: detail.schedule.valid_from,
    },
    notes: fund.flags.special_sales_service_policy
      ? ['特殊销售服务费的场景计算采用其他销售机构（非直销）口径。']
      : undefined,
  }
}
