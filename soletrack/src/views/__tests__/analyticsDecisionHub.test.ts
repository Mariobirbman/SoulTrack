import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import Analytics from '../Analytics.vue'

vi.mock('@/lib/salesDataset', () => ({
  loadSalesOrdersCsv: vi.fn().mockResolvedValue([
    {
      order_id: '1',
      order_date: '2026-01-01',
      brand: 'Nike',
      model_name: 'Dunk',
      category: 'Lifestyle',
      gender: 'Men',
      color: 'Black',
      country: 'US',
      sales_channel: 'Online',
      units_sold: 2,
      revenue_usd: 400,
      customer_rating: 4.5,
      customer_income_level: 'High',
      final_price_usd: 200,
      size_us: 10,
    },
  ]),
  aggregateShoes: vi.fn().mockReturnValue([]),
}))

vi.mock('@/lib/firebase', () => ({
  firebaseConfigured: false,
  db: null,
}))

vi.mock('@/lib/demo', () => ({
  isDemoBuyer: () => true,
}))

vi.mock('@/lib/demoMarketplace', () => ({
  demoProducts: [
    { id: 'p1', brand: 'Nike', price: 210, active: true, status: 'active', createdAt: '2026-01-15' },
    { id: 'p2', brand: 'Adidas', price: 190, active: true, status: 'active', createdAt: '2026-02-02' },
  ],
}))

describe('Analytics Decision Hub', () => {
  it('renders decision cards and deep dive collapsed by default', async () => {
    const wrapper = mount(Analytics, {
      global: {
        stubs: { RouterLink: { template: '<a><slot /></a>' } },
      },
    })

    await nextTick()
    await nextTick()

    expect(wrapper.text()).toContain('Decision Hub')
    expect(wrapper.findAll('.decision-card')).toHaveLength(3)
    expect(wrapper.text()).toContain('Open Deep Dive Data')
  })

  it('updates recommendations when switching mode', async () => {
    const wrapper = mount(Analytics, {
      global: {
        stubs: { RouterLink: { template: '<a><slot /></a>' } },
      },
    })

    await nextTick()
    await nextTick()

    expect(wrapper.text()).toContain('Buyer mode:')
    await wrapper.findAll('.role-btn')[1]!.trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('Seller mode:')
  })
})
