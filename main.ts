import { createApp } from 'vue'
import './styles/styles.css'
import App from './App.vue'
import { createRouter, createWebHistory } from 'vue-router'
import Home from './views/Home.vue'
import Login from './views/Login.vue'
import Account from './views/Account.vue'
import Browse from './views/Browse.vue'
import About from './views/About.vue'
import NotFound from './views/NotFound.vue'

const routes = [
  { path: '/', name: 'Home', component: Home },
  { path: '/login', name: 'Login', component: Login },
  { path: '/account', name: 'Account', component: Account },
  { path: '/browse', name: 'Browse', component: Browse },
  { path: '/about', name: 'About', component: About },
  { path: '/:pathMatch(.*)*', name: 'NotFound', component: NotFound }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

const app = createApp(App)
app.use(router)
app.mount('#app')

export default router
