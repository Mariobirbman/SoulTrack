import {
  bucketDemandDecision,
  bucketPriceDecision,
  bucketTimingDecision,
  buildMarketDecisionSummary,
  confidenceFromCounts,
  recommendationFor,
} from '../marketDecisions'

describe('marketDecisions', () => {
  it('buckets price thresholds correctly', () => {
    expect(bucketPriceDecision(4.9)).toBe('Fair')
    expect(bucketPriceDecision(5)).toBe('Slightly High')
    expect(bucketPriceDecision(12)).toBe('High Risk')
  })

  it('scores confidence by data completeness', () => {
    expect(confidenceFromCounts(25, 800)).toBe('High')
    expect(confidenceFromCounts(10, 200)).toBe('Medium')
    expect(confidenceFromCounts(2, 30)).toBe('Low')
  })

  it('maps recommendations by role and status', () => {
    expect(recommendationFor('buyer', 'Price', 'High Risk')).toContain('Skip')
    expect(recommendationFor('seller', 'Timing', 'Favorable')).toContain('list now')
    expect(recommendationFor('seller', 'Demand', 'Slow')).toContain('overstocking')
  })

  it('builds a decision summary with three cards', () => {
    const result = buildMarketDecisionSummary({
      roleView: 'buyer',
      listingCount: 40,
      sampledOrderCount: 1200,
      marketplaceAvgPrice: 220,
      benchmarkAvgPrice: 180,
      trendChangePct: 14,
      topBrandSharePct: 38,
    })

    expect(result.priceDecision.title).toBe('Price')
    expect(result.timingDecision.title).toBe('Timing')
    expect(result.demandDecision.title).toBe('Demand')
    expect(bucketTimingDecision(14)).toBe('Favorable')
    expect(bucketDemandDecision(38, 14)).toBe('Hot')
  })

  it('handles zero benchmark without dividing by zero', () => {
    expect(() =>
      buildMarketDecisionSummary({
        roleView: 'buyer',
        listingCount: 5,
        sampledOrderCount: 50,
        marketplaceAvgPrice: 200,
        benchmarkAvgPrice: 0,
        trendChangePct: 0,
        topBrandSharePct: 20,
      })
    ).not.toThrow()
  })

  it('buyer and seller get different recommendation text for same data', () => {
    const input = {
      listingCount: 30,
      sampledOrderCount: 600,
      marketplaceAvgPrice: 240,
      benchmarkAvgPrice: 200,
      trendChangePct: 12,
      topBrandSharePct: 40,
    }
    const buyer = buildMarketDecisionSummary({ ...input, roleView: 'buyer' })
    const seller = buildMarketDecisionSummary({ ...input, roleView: 'seller' })

    expect(buyer.priceDecision.recommendation).not.toBe(seller.priceDecision.recommendation)
    expect(buyer.timingDecision.recommendation).not.toBe(seller.timingDecision.recommendation)
    expect(buyer.demandDecision.recommendation).not.toBe(seller.demandDecision.recommendation)
  })

  it('buckets negative timing (cooling market) as Wait', () => {
    expect(bucketTimingDecision(-15)).toBe('Wait')
    expect(bucketTimingDecision(-9)).toBe('Neutral')
  })

  it('buckets low brand share + negative trend as Slow demand', () => {
    expect(bucketDemandDecision(10, -8)).toBe('Slow')
    expect(bucketDemandDecision(10, 2)).toBe('Stable')
  })
})
