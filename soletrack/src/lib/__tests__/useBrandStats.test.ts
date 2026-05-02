import { describe, expect, it, vi, beforeEach } from 'vitest'
import { getBrandStat, getDelta, __resetBrandStatsForTests } from '../useBrandStats'

const MOCK_STATS = {
  nike: { avgPrice: 187, totalOrders: 100, topCategory: 'Running' },
  adidas: { avgPrice: 150, totalOrders: 80, topCategory: 'Lifestyle' },
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

  it('Jordan alias resolves to Nike stats', async () => {
    await expect(getBrandStat('Jordan')).resolves.toEqual(MOCK_STATS.nike)
  })

  it('Yeezy alias resolves to Adidas stats', async () => {
    await expect(getBrandStat('Yeezy')).resolves.toEqual(MOCK_STATS.adidas)
  })

  it('Converse alias resolves to Nike stats', async () => {
    await expect(getBrandStat('Converse')).resolves.toEqual(MOCK_STATS.nike)
  })

  it('getDelta works for aliased brand Jordan', async () => {
    // Jordan maps to Nike avg 187, 220 is 17.6% above
    await expect(getDelta(220, 'Jordan')).resolves.toBe(17.6)
  })
})
