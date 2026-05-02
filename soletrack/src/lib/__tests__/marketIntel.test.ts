import { describe, expect, it } from 'vitest'
import { priceColorClass, deltaLabel } from '../marketIntel'

describe('priceColorClass', () => {
  it("returns 'price--great-deal' when delta <= -15%", () => {
    expect(priceColorClass(-20)).toBe('price--great-deal')
  })

  it("returns 'price--deal' when delta is between -15% and -5%", () => {
    expect(priceColorClass(-10)).toBe('price--deal')
  })

  it("returns '' when delta is between -5% and +5%", () => {
    expect(priceColorClass(-5)).toBe('')
    expect(priceColorClass(0)).toBe('')
    expect(priceColorClass(5)).toBe('')
  })

  it("returns 'price--premium' when delta is between +5% and +15%", () => {
    expect(priceColorClass(10)).toBe('price--premium')
  })

  it("returns 'price--high' when delta >= +15%", () => {
    expect(priceColorClass(18)).toBe('price--high')
  })

  it("returns '' when brand not in stats (null delta)", () => {
    expect(priceColorClass(null)).toBe('')
  })
})

describe('deltaLabel', () => {
  it('returns below-market label', () => {
    expect(deltaLabel(-20)).toBe('20% below market')
  })

  it('returns above-market label', () => {
    expect(deltaLabel(17.6)).toBe('17.6% above market')
  })

  it('returns at-market label for zero', () => {
    expect(deltaLabel(0)).toBe('At market')
  })
})
