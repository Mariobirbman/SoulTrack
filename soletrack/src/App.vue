<script setup lang="ts">
import { computed } from 'vue'
import { useAuth } from '@/lib/auth'
import FirebaseStatusBanner from '@/components/FirebaseStatusBanner.vue'
import { useCart } from '@/lib/cart'

const { user } = useAuth()
const isLoggedIn = computed(() => !!user.value)
const { totalCount } = useCart()
</script>

<template>
  <div>
    <FirebaseStatusBanner />
    <nav>
      <ul>
        <li><router-link to="/">Home</router-link></li>
        <li><router-link to="/browse">Browse</router-link></li>
        <li><router-link to="/vendors">Vendors</router-link></li>
        <li><router-link to="/analytics">Catalog</router-link></li>
        <li>
          <router-link to="/cart" class="cart-link">
            Cart <span v-if="totalCount" class="cart-badge">{{ totalCount }}</span>
          </router-link>
        </li>
        <li><router-link to="/about">About</router-link></li>
        <li v-if="isLoggedIn"><router-link to="/account">My Account</router-link></li>
        <li v-if="!isLoggedIn"><router-link to="/login">Login / Register</router-link></li>
      </ul>
    </nav>
    <main>
      <router-view />
    </main>
  </div>
</template>

<style scoped>
nav {
  position: sticky;
  top: 0;
  z-index: 999;
  background: rgba(6, 15, 7, 0.92);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(100, 200, 100, 0.08);
  padding: 0 24px;
}

nav ul {
  display: flex;
  gap: 4px;
  list-style: none;
  padding: 12px 0;
  margin: 0;
  align-items: center;
  max-width: 1100px;
  margin: 0 auto;
}

nav a {
  color: var(--muted);
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
  padding: 6px 12px;
  border-radius: 8px;
  transition: color 0.2s, background 0.2s;
}

nav a:hover,
nav a.router-link-active {
  color: var(--text);
  background: rgba(156, 255, 0, 0.07);
}

nav a.router-link-exact-active {
  color: var(--accent);
}

.cart-link { position: relative; }
.cart-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 6px;
  margin-left: 6px;
  border-radius: 999px;
  background: rgba(156, 255, 0, 0.18);
  border: 1px solid rgba(156, 255, 0, 0.35);
  color: var(--text);
  font-size: 0.75rem;
  font-weight: 900;
}
</style>
