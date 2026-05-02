import { describe, expect, it, vi, beforeEach } from 'vitest'
import { getBrandStat, getDelta, __resetBrandStatsForTests } from '../useBrandStats'

const MOCK_STATS = {
  nike: {
    avgPrice: 187,
    totalOrders: 100,
    topCategory: 'Running',
    byType: {
      running: { avgPrice: 220, totalOrders: 50 },
      basketball: { avgPrice: 170, totalOrders: 30 },
      lifestyle: { avgPrice: 150, totalOrders: 20 },
    },
  },
  adidas: { avgPrice: 150, totalOrders: 80, topCategory: 'Lifestyle', byType: { lifestyle: { avgPrice: 150, totalOrders: 80 } } },
  jordan: { avgPrice: 285, totalOrders: 4103, topCategory: 'Basketball', byType: { basketball: { avgPrice: 285, totalOrders: 4103 } } },
  yeezy: { avgPrice: 312, totalOrders: 2847, topCategory: 'Lifestyle', byType: { lifestyle: { avgPrice: 312, totalOrders: 2847 } } },
  converse: { avgPrice: 72, totalOrders: 3614, topCategory: 'Lifestyle', byType: { lifestyle: { avgPrice: 72, totalOrders: 3614 } } },
}

describe('useBrandStats', () => {
  beforeEach(() => {
    __resetBrandStatsForTests()
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => MOCK_STATS })))
  })

  it('getBrandStat returns null for unknown brand', async () => {
    await expect(getBrandStat('Unknown')).resolves.toBeNull()
  })

  it('getBrandStat returns stat for exact brand name match', async () => {
    await expect(getBrandStat('nike')).resolves.toEqual(MOCK_STATS.nike)
  })

  it('getBrandStat matches case-insensitively', async () => {
    await expect(getBrandStat('Nike')).resolves.toEqual(MOCK_STATS.nike)
  })

  it('getDelta returns null when brand not found', async () => {
    await expect(getDelta(220, 'Unknown')).resolves.toBeNull()
  })

  it('getDelta returns correct percent rounded to one decimal', async () => {
    await expect(getDelta(220, 'Nike')).resolves.toBe(17.6)
  })

  it('getDelta returns negative percent when listing below avg', async () => {
    await expect(getDelta(150, 'Nike')).resolves.toBe(-19.8)
  })

  it('singleton: fetch called only once across multiple calls', async () => {
    await getBrandStat('Nike')
    await getBrandStat('Adidas')
    await getDelta(160, 'Nike')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('getBrandStat returns Jordan stat directly', async () => {
    await expect(getBrandStat('Jordan')).resolves.toEqual(MOCK_STATS.jordan)
  })

  it('getBrandStat returns Yeezy stat directly', async () => {
    await expect(getBrandStat('Yeezy')).resolves.toEqual(MOCK_STATS.yeezy)
  })

  it('getBrandStat returns Converse stat directly', async () => {
    await expect(getBrandStat('Converse')).resolves.toEqual(MOCK_STATS.converse)
  })

  it('getDelta works for Jordan using Jordan avg price', async () => {
    // Jordan avg 285, listing 350 => 22.8% above
    await expect(getDelta(350, 'Jordan')).resolves.toBe(22.8)
  })

  it('getBrandStat uses type-specific data when type is provided', async () => {
    await expect(getBrandStat('Nike', 'Running')).resolves.toEqual({
      avgPrice: 220,
      totalOrders: 50,
      topCategory: 'running',
      byType: MOCK_STATS.nike.byType,
    })
  })

  it('getDelta uses type-specific avg when type is provided', async () => {
    // Running avg 220, listing 220 => 0%
    await expect(getDelta(220, 'Nike', 'Running')).resolves.toBe(0)
  })
})
