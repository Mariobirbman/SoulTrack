import { createRouter, createWebHistory } from 'vue-router'
import Home from '@/views/Home.vue'
import Browse from '@/views/Browse.vue'
import About from '@/views/About.vue'
import Login from '@/views/Login.vue'
import Account from '@/views/Account.vue'
import Vendors from '@/views/Vendors.vue'
import NotFound from '@/views/NotFound.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', component: Home },
    { path: '/browse', component: Browse },
    { path: '/about', component: About },
    { path: '/login', component: Login },
    { path: '/account', component: Account },
    { path: '/vendors', component: Vendors },
    { path: '/:pathMatch(.*)*', component: NotFound },
  ],
})

export default router
