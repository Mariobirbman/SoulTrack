export type DecisionConfidence = 'High' | 'Medium' | 'Low'
export type DecisionStatus = 'Fair' | 'Slightly High' | 'High Risk' | 'Favorable' | 'Neutral' | 'Wait' | 'Hot' | 'Stable' | 'Slow'

export type MarketDecisionCard = {
  title: 'Price' | 'Timing' | 'Demand'
  status: DecisionStatus
  reason: string
  recommendation: string
  confidence: DecisionConfidence
  metrics: Array<{ label: string; value: string }>
}

export type MarketDecisionSummary = {
  priceDecision: MarketDecisionCard
  timingDecision: MarketDecisionCard
  demandDecision: MarketDecisionCard
}

export type MarketDecisionInput = {
  roleView: 'buyer' | 'seller'
  listingCount: number
  sampledOrderCount: number
  marketplaceAvgPrice: number
  benchmarkAvgPrice: number
  trendChangePct: number
  topBrandSharePct: number
}

function toPctLabel(value: number) {
  const abs = Math.abs(value)
  return Number.isInteger(abs) ? `${abs}%` : `${abs.toFixed(1)}%`
}

export function confidenceFromCounts(listingCount: number, sampledOrderCount: number): DecisionConfidence {
  if (listingCount >= 20 && sampledOrderCount >= 500) return 'High'
  if (listingCount >= 8 && sampledOrderCount >= 150) return 'Medium'
  return 'Low'
}

export function bucketPriceDecision(deltaPct: number): Extract<DecisionStatus, 'Fair' | 'Slightly High' | 'High Risk'> {
  if (deltaPct >= 12) return 'High Risk'
  if (deltaPct >= 5) return 'Slightly High'
  return 'Fair'
}

export function bucketTimingDecision(trendChangePct: number): Extract<DecisionStatus, 'Favorable' | 'Neutral' | 'Wait'> {
  if (trendChangePct >= 10) return 'Favorable'
  if (trendChangePct <= -10) return 'Wait'
  return 'Neutral'
}

export function bucketDemandDecision(topBrandSharePct: number, trendChangePct: number): Extract<DecisionStatus, 'Hot' | 'Stable' | 'Slow'> {
  if (topBrandSharePct >= 35 && trendChangePct >= 5) return 'Hot'
  if (topBrandSharePct <= 15 && trendChangePct <= -5) return 'Slow'
  return 'Stable'
}

export function recommendationFor(
  roleView: 'buyer' | 'seller',
  type: 'Price' | 'Timing' | 'Demand',
  status: DecisionStatus,
): string {
  if (type === 'Price') {
    if (status === 'High Risk') return roleView === 'buyer' ? 'Skip this price unless condition is rare.' : 'Lower your ask or add stronger value proof.'
    if (status === 'Slightly High') return roleView === 'buyer' ? 'Try to negotiate before checkout.' : 'You can list, but expect slower conversion.'
    return roleView === 'buyer' ? 'This is within a fair range, safe to proceed.' : 'This is market-aligned, list at this range first.'
  }
  if (type === 'Timing') {
    if (status === 'Favorable') return roleView === 'buyer' ? 'Market activity is improving, good time to act.' : 'Momentum is strong, list now.'
    if (status === 'Wait') return roleView === 'buyer' ? 'Activity is cooling, wait for better entries.' : 'Demand is cooling, test lower starting prices.'
    return roleView === 'buyer' ? 'No strong edge either way, buy only if fit is right.' : 'No strong trend, use conservative pricing.'
  }
  if (status === 'Hot') return roleView === 'buyer' ? 'High demand means less room to negotiate.' : 'Prioritize fast-moving brands first.'
  if (status === 'Slow') return roleView === 'buyer' ? 'Use patience and wait for discounts.' : 'Move slowly, avoid overstocking weak demand.'
  return roleView === 'buyer' ? 'Demand is stable, compare options before buying.' : 'Demand is stable, keep inventory balanced.'
}

export function buildMarketDecisionSummary(input: MarketDecisionInput): MarketDecisionSummary {
  const confidence = confidenceFromCounts(input.listingCount, input.sampledOrderCount)
  const safeBenchmark = input.benchmarkAvgPrice > 0 ? input.benchmarkAvgPrice : 1
  const priceDeltaPct = ((input.marketplaceAvgPrice - safeBenchmark) / safeBenchmark) * 100
  const priceStatus = bucketPriceDecision(priceDeltaPct)
  const timingStatus = bucketTimingDecision(input.trendChangePct)
  const demandStatus = bucketDemandDecision(input.topBrandSharePct, input.trendChangePct)

  return {
    priceDecision: {
      title: 'Price',
      status: priceStatus,
      reason: `${priceDeltaPct >= 0 ? 'Listings are' : 'Listings are'} ${toPctLabel(priceDeltaPct)} ${priceDeltaPct >= 0 ? 'above' : 'below'} benchmark.`,
      recommendation: recommendationFor(input.roleView, 'Price', priceStatus),
      confidence,
      metrics: [
        { label: 'Listing Avg', value: `$${Math.round(input.marketplaceAvgPrice)}` },
        { label: 'Benchmark Avg', value: `$${Math.round(input.benchmarkAvgPrice)}` },
      ],
    },
    timingDecision: {
      title: 'Timing',
      status: timingStatus,
      reason: `Recent listing activity is ${input.trendChangePct >= 0 ? 'up' : 'down'} ${toPctLabel(input.trendChangePct)}.`,
      recommendation: recommendationFor(input.roleView, 'Timing', timingStatus),
      confidence,
      metrics: [
        { label: '6M Trend', value: `${input.trendChangePct >= 0 ? '+' : ''}${toPctLabel(input.trendChangePct)}` },
        { label: 'Active Listings', value: String(input.listingCount) },
      ],
    },
    demandDecision: {
      title: 'Demand',
      status: demandStatus,
      reason: `Top brands hold ${toPctLabel(input.topBrandSharePct)} of active listings.`,
      recommendation: recommendationFor(input.roleView, 'Demand', demandStatus),
      confidence,
      metrics: [
        { label: 'Top Brand Share', value: `${toPctLabel(input.topBrandSharePct)}` },
        { label: 'Sampled Orders', value: String(input.sampledOrderCount) },
      ],
    },
  }
}
