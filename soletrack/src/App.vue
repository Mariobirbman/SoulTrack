<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const isLoggedIn = ref(false)
const userName = ref('')

function checkAuth() {
  const raw = localStorage.getItem('soletrack_current')
  if (raw) {
    const user = JSON.parse(raw)
    isLoggedIn.value = true
    userName.value = user.name
  } else {
    isLoggedIn.value = false
    userName.value = ''
  }
}

onMounted(checkAuth)
watch(() => route.path, checkAuth)
</script>

<template>
  <div>
    <nav>
      <ul>
        <li><router-link to="/">Home</router-link></li>
        <li><router-link to="/browse">Browse</router-link></li>
        <li><router-link to="/vendors">Vendors</router-link></li>
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
</style>
