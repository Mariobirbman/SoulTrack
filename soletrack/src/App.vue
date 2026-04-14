<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from '@/lib/auth'
import { useRole } from '@/lib/role'
import FirebaseStatusBanner from '@/components/FirebaseStatusBanner.vue'
import Footer from '@/components/Footer.vue'
import { useCart } from '@/lib/cart'

const { user } = useAuth()
const { isAdmin } = useRole()
const isLoggedIn = computed(() => !!user.value)
const { totalCount } = useCart()

const route = useRoute()
const menuOpen = ref(false)
const accountOpen = ref(false)

function toggleMenu() { menuOpen.value = !menuOpen.value }

function closeMenu() {
  menuOpen.value = false
  accountOpen.value = false
}

function toggleAccount(e: Event) {
  e.stopPropagation()
  accountOpen.value = !accountOpen.value
}

// Close account dropdown on outside click
function onDocClick() { accountOpen.value = false }
onMounted(() => document.addEventListener('click', onDocClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))

watch(() => route.fullPath, () => closeMenu())
</script>

<template>
  <div>
    <FirebaseStatusBanner />
    <a class="skip-link" href="#main">Skip to content</a>

    <nav>
      <div class="nav-inner">
        <!-- Brand mark -->
        <router-link to="/" class="brand" @click="closeMenu">
          <span class="brand-mark">ST</span>
          <span class="brand-name">SoleTrack</span>
        </router-link>

        <button
          class="menu-btn"
          type="button"
          :aria-expanded="menuOpen"
          aria-controls="primary-nav"
          @click="toggleMenu"
        >
          <span class="menu-btn__bar"></span>
          <span class="menu-btn__bar"></span>
          <span class="menu-btn__bar"></span>
        </button>

        <ul id="primary-nav" :class="{ open: menuOpen }">
          <li><router-link to="/" @click="closeMenu">Home</router-link></li>
          <li><router-link to="/browse" @click="closeMenu">Browse</router-link></li>
          <li><router-link to="/vendors" @click="closeMenu">Vendors</router-link></li>
          <li><router-link to="/analytics" @click="closeMenu">Market Data</router-link></li>
          <li>
            <router-link to="/cart" class="cart-link" @click="closeMenu">
              Cart
              <span v-if="totalCount" class="cart-badge">{{ totalCount }}</span>
            </router-link>
          </li>
          <li><router-link to="/about" @click="closeMenu">About</router-link></li>

          <!-- Logged-out: single Login link -->
          <li v-if="!isLoggedIn">
            <router-link to="/login" class="nav-cta" @click="closeMenu">Login / Register</router-link>
          </li>

          <!-- Logged-in: Account dropdown (desktop) / flat links (mobile) -->
          <li v-if="isLoggedIn" class="account-wrap" @click.stop>
            <button class="account-btn" @click="toggleAccount" :aria-expanded="accountOpen">
              Account
              <svg class="chevron" :class="{ flipped: accountOpen }" viewBox="0 0 12 8" fill="none">
                <path d="M1 1l5 5 5-5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <ul class="account-dropdown" v-if="accountOpen">
              <li><router-link to="/account" @click="closeMenu">My Account</router-link></li>
              <li><router-link to="/sell" @click="closeMenu">Sell a Shoe</router-link></li>
              <li><router-link to="/orders" @click="closeMenu">My Orders</router-link></li>
              <li v-if="isAdmin"><router-link to="/admin" @click="closeMenu" class="admin-link">Admin Panel</router-link></li>
            </ul>
          </li>

          <!-- Mobile-only flat account links (visible when hamburger is open) -->
          <template v-if="isLoggedIn && menuOpen">
            <li class="mobile-account-link"><router-link to="/account" @click="closeMenu">My Account</router-link></li>
            <li class="mobile-account-link"><router-link to="/sell" @click="closeMenu">Sell a Shoe</router-link></li>
            <li class="mobile-account-link"><router-link to="/orders" @click="closeMenu">My Orders</router-link></li>
            <li v-if="isAdmin" class="mobile-account-link"><router-link to="/admin" @click="closeMenu">Admin Panel</router-link></li>
          </template>
        </ul>
      </div>
    </nav>

    <main id="main" tabindex="-1">
      <router-view />
    </main>

    <Footer />
  </div>
</template>

<style scoped>
.skip-link {
  position: absolute;
  left: -9999px;
  top: 8px;
  z-index: 1001;
  background: var(--card);
  border: 1px solid rgba(156, 255, 0, 0.25);
  color: var(--text);
  padding: 8px 12px;
  border-radius: 10px;
  text-decoration: none;
  font-weight: 700;
}
.skip-link:focus { left: 12px; }

nav {
  position: sticky;
  top: 0;
  z-index: 999;
  background: rgba(6, 15, 7, 0.94);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(100, 200, 100, 0.08);
}

.nav-inner {
  max-width: 1100px;
  margin: 0 auto;
  padding: 10px 16px;
  display: flex;
  align-items: center;
  gap: 10px;
}

/* ── Brand mark ─────────────────────────────────────── */
.brand {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  text-decoration: none;
  flex-shrink: 0;
}

.brand-mark {
  background: var(--accent);
  color: #0b1205;
  font-weight: 900;
  font-size: 0.68rem;
  letter-spacing: 0.04em;
  width: 28px;
  height: 28px;
  border-radius: 7px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: opacity 0.2s;
}

.brand:hover .brand-mark { opacity: 0.85; }

.brand-name {
  font-weight: 900;
  font-size: 0.95rem;
  color: var(--text);
  letter-spacing: -0.02em;
}

/* ── Hamburger button ───────────────────────────────── */
.menu-btn {
  display: none;
  margin-left: auto;
  background: transparent;
  border: 1px solid rgba(156, 255, 0, 0.18);
  color: var(--text);
  padding: 10px;
  border-radius: 10px;
  cursor: pointer;
  flex-direction: column;
  gap: 4px;
  width: 44px;
  height: 44px;
  align-items: center;
  justify-content: center;
}

.menu-btn__bar {
  display: block;
  width: 18px;
  height: 2px;
  background: var(--text);
  border-radius: 2px;
  transition: transform 0.2s, opacity 0.2s;
}

/* ── Nav list ───────────────────────────────────────── */
nav ul {
  display: flex;
  gap: 2px;
  list-style: none;
  padding: 0;
  margin: 0 0 0 auto;
  align-items: center;
}

nav a {
  color: var(--muted);
  text-decoration: none;
  font-size: 0.92rem;
  font-weight: 500;
  min-height: 42px;
  padding: 8px 12px;
  border-radius: 8px;
  transition: color 0.2s, background 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

nav a:hover { color: var(--text); background: rgba(156, 255, 0, 0.06); }
nav a.router-link-exact-active { color: var(--accent); }

/* Login CTA — slightly elevated */
.nav-cta {
  background: rgba(156, 255, 0, 0.08) !important;
  border: 1px solid rgba(156, 255, 0, 0.2);
  color: var(--text) !important;
  font-weight: 700 !important;
  padding: 8px 14px !important;
}
.nav-cta:hover { background: rgba(156, 255, 0, 0.14) !important; }

/* Cart badge */
.cart-link { position: relative; }
.cart-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--accent);
  color: #0b1205;
  font-size: 0.7rem;
  font-weight: 900;
}

/* ── Account dropdown ───────────────────────────────── */
.account-wrap {
  position: relative;
}

.account-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: 1px solid rgba(156, 255, 0, 0.18);
  color: var(--text);
  font-size: 0.92rem;
  font-weight: 700;
  min-height: 42px;
  padding: 8px 14px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
}

.account-btn:hover {
  background: rgba(156, 255, 0, 0.06);
  border-color: rgba(156, 255, 0, 0.3);
}

.chevron {
  width: 10px;
  height: 10px;
  color: var(--muted);
  transition: transform 0.2s;
}
.chevron.flipped { transform: rotate(180deg); }

.account-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 160px;
  background: rgba(6, 15, 7, 0.98);
  border: 1px solid rgba(156, 255, 0, 0.18);
  border-radius: 12px;
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(12px);
  z-index: 100;
  list-style: none;
  margin: 0;
}

.account-dropdown a {
  display: block;
  padding: 9px 14px;
  border-radius: 8px;
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--muted) !important;
  width: 100%;
}

.account-dropdown .admin-link { color: var(--accent) !important; }

.account-dropdown a:hover {
  color: var(--text) !important;
  background: rgba(156, 255, 0, 0.06) !important;
}

/* ── Mobile overrides ───────────────────────────────── */
.mobile-account-link { display: none !important; }

@media (max-width: 720px) {
  .menu-btn { display: inline-flex; }

  nav ul {
    display: none;
    position: absolute;
    left: 0;
    right: 0;
    top: 100%;
    margin: 0;
    padding: 10px 16px 16px;
    background: rgba(6, 15, 7, 0.99);
    border-bottom: 1px solid rgba(100, 200, 100, 0.08);
    flex-direction: column;
    align-items: stretch;
    gap: 4px;
  }
  nav ul.open { display: flex; }
  nav a { min-height: 46px; padding: 12px 14px; }

  /* Hide desktop account dropdown on mobile, show flat links instead */
  .account-wrap { display: none; }
  .mobile-account-link { display: flex !important; }
  .mobile-account-link a {
    padding-left: 20px;
    font-size: 0.9rem;
    color: var(--muted);
  }

  .nav-cta { text-align: center; justify-content: center; }
}
</style>
