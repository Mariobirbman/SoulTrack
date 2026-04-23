import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '@/lib/auth'

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
    { path: '/:pathMatch(.*)*', component: () => import('../views/NotFound.vue') },
  ],
})

router.beforeEach(async (to) => {
  const { user, ready } = useAuth()
  await ready

  if (to.path === '/login' && user.value) return (typeof to.query.next === 'string' ? to.query.next : '/account')
  if (to.meta.requiresAuth && !user.value) return { path: '/login', query: { next: to.fullPath } }
})

export default router
