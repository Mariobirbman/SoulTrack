export function priceColorClass(delta: number | null): string {
  if (delta === null) return ''
  if (delta <= -15) return 'price--great-deal'
  if (delta < -5) return 'price--deal'
  if (delta >= 15) return 'price--high'
  if (delta > 5) return 'price--premium'
  return ''
}

function formatDelta(value: number) {
  return Number.isInteger(value) ? String(value) : String(value)
}

export function deltaLabel(delta: number): string {
  if (delta === 0) return 'At market'
  const amount = formatDelta(Math.abs(delta))
  return delta < 0 ? `${amount}% below market` : `${amount}% above market`
}
