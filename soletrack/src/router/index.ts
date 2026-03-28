import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/views/Home.vue'
import Browse from '@/views/Browse.vue'
import About from '@/views/About.vue'
import Login from '@/views/Login.vue'
import Account from '@/views/Account.vue'
import Vendors from '@/views/Vendors.vue'
import Analytics from '@/views/Analytics.vue'
import Cart from '@/views/Cart.vue'
import NotFound from '@/views/NotFound.vue'
import { useAuth } from '@/lib/auth'
import { firebaseConfigured } from '@/lib/firebase'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', component: Home },
    { path: '/browse', component: Browse },
    { path: '/about', component: About },
    { path: '/login', component: Login },
    { path: '/account', component: Account, meta: { requiresAuth: true } },
    { path: '/vendors', component: Vendors },
    { path: '/analytics', component: Analytics },
    { path: '/cart', component: Cart },
    { path: '/:pathMatch(.*)*', component: NotFound },
  ],
})

router.beforeEach(async (to) => {
  if (!firebaseConfigured) return

  const { user, ready } = useAuth()
  await ready

  if (to.path === '/login' && user.value) return '/account'
  if (to.meta.requiresAuth && !user.value) return '/login'
})

export default router
