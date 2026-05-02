import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '@/lib/auth'
import { isDemoMode, isDemoAdmin } from '@/lib/demo'
import { isAuthBypassEnabled } from '@/lib/runtimeFlags'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', component: () => import('../views/Home.vue') },
    // Public routes
    { path: '/login', component: () => import('../views/Login.vue') },
    { path: '/terms', component: () => import('../views/Terms.vue') },
    // Login required for the rest of the site, including demo entry
    { path: '/browse', component: () => import('../views/Browse.vue'), meta: { requiresAuth: true } },
    { path: '/about', component: () => import('../views/About.vue'), meta: { requiresAuth: true } },
    { path: '/vendors', component: () => import('../views/Vendors.vue'), meta: { requiresAuth: true } },
    { path: '/vendor/:uid', component: () => import('../views/VendorShop.vue'), meta: { requiresAuth: true } },
    { path: '/item/:id', component: () => import('../views/ItemDetail.vue'), meta: { requiresAuth: true } },
    { path: '/analytics', component: () => import('../views/Analytics.vue'), meta: { requiresAuth: true } },
    { path: '/account', component: () => import('../views/Account.vue'), meta: { requiresAuth: true } },
    { path: '/cart', component: () => import('../views/Cart.vue'), meta: { requiresAuth: true } },
    { path: '/checkout', component: () => import('../views/Checkout.vue'), meta: { requiresAuth: true } },
    { path: '/orders', component: () => import('../views/Orders.vue'), meta: { requiresAuth: true } },
    { path: '/order/:id', component: () => import('../views/OrderDetail.vue'), meta: { requiresAuth: true } },
    { path: '/sell', component: () => import('../views/Sell.vue'), meta: { requiresAuth: true } },
    { path: '/vendor-orders', component: () => import('../views/VendorOrders.vue'), meta: { requiresAuth: true } },
    { path: '/admin', component: () => import('../views/Admin.vue'), meta: { requiresAuth: true, requiresAdmin: true } },
    { path: '/:pathMatch(.*)*', component: () => import('../views/NotFound.vue') },
  ],
})

router.beforeEach(async (to) => {
  if (isAuthBypassEnabled()) return

  const { user, ready } = useAuth()
  await ready

  if (to.path === '/login' && user.value) return (typeof to.query.next === 'string' ? to.query.next : '/account')
  if (to.meta.requiresAuth && !user.value) return { path: '/login', query: { next: to.fullPath } }
  if (to.meta.requiresAdmin) {
    if (isDemoMode()) {
      if (!isDemoAdmin()) return '/'
    } else {
      const adminUid = import.meta.env.VITE_ADMIN_UID as string | undefined
      const isAdmin = adminUid
        ? user.value?.uid === adminUid
        : (user.value as any)?.role === 'admin'
      if (!isAdmin) return '/'
    }
  }
})

export default router
