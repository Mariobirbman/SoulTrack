import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import OrderDetail from '../OrderDetail.vue'

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { id: 'ord-1' } }),
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    user: { value: { uid: 'seller-1' } },
    ready: Promise.resolve(),
  }),
}))

vi.mock('@/lib/firebase', () => ({
  demoMode: true,
  firebaseConfigured: false,
  db: null,
}))

vi.mock('@/lib/demoStore', () => ({
  getDemoOrderById: () => ({
    checkoutId: 'CO-1',
    status: 'placed',
    buyerUid: 'buyer-1',
    vendorUid: 'seller-1',
    vendorName: 'KickVault',
    pickupName: 'Jane',
    pickupEmail: 'jane@example.com',
    pickupPreferredDateTime: '2026-05-02 11:00',
    notes: '',
    items: [{ productId: 'p1', nameSnapshot: 'Nike Dunk', priceSnapshot: 200, qty: 1 }],
    createdAt: '2026-05-02T10:00:00.000Z',
    subtotal: 200,
  }),
  getDemoMessages: () => [
    { id: 'm1', senderUid: 'buyer-1', text: 'Can I pick up at 5?', createdAt: '2026-05-02T10:00:00.000Z' },
    { id: 'm2', senderUid: 'seller-1', text: 'Yes that works.', createdAt: '2026-05-02T10:01:00.000Z' },
  ],
  addDemoMessage: (_id: string, payload: { senderUid: string; text: string }) => [
    { id: 'm1', senderUid: 'buyer-1', text: 'Can I pick up at 5?', createdAt: '2026-05-02T10:00:00.000Z' },
    { id: 'm2', senderUid: 'seller-1', text: 'Yes that works.', createdAt: '2026-05-02T10:01:00.000Z' },
    { id: 'm3', senderUid: payload.senderUid, text: payload.text, createdAt: '2026-05-02T10:02:00.000Z' },
  ],
  updateDemoOrderStatus: vi.fn(),
}))

describe('OrderDetail chat polish', () => {
  it('renders direct messages header and grouped messages', async () => {
    const wrapper = mount(OrderDetail, {
      global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } },
    })
    await nextTick()
    await nextTick()

    expect(wrapper.text()).toContain('Direct Messages')
    expect(wrapper.findAll('.msg').length).toBeGreaterThan(0)
    expect(wrapper.find('textarea').exists()).toBe(true)
  })

  it('sends on Enter key and updates message list', async () => {
    const wrapper = mount(OrderDetail, {
      global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } },
    })
    await nextTick()
    await nextTick()

    const textarea = wrapper.find('textarea')
    await textarea.setValue('Pickup is good')
    await textarea.trigger('keydown', { key: 'Enter', shiftKey: false })
    await nextTick()

    expect(wrapper.text()).toContain('Pickup is good')
  })
})
