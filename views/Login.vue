
<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const mode = ref<'login' | 'register'>('login')

const name = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')

const error = ref('')
const success = ref('')

function resetMessages() {
  error.value = ''
  success.value = ''
}

function validateEmail(e: string) {
  return /\S+@\S+\.\S+/.test(e)
}

function switchMode(m: 'login' | 'register') {
  mode.value = m
  resetMessages()
  // clear fields when switching
  name.value = ''
  email.value = ''
  password.value = ''
  confirmPassword.value = ''
}

function register() {
  resetMessages()
  if (!name.value.trim()) {
    error.value = 'Name is required'
    return
  }
  if (!validateEmail(email.value)) {
    error.value = 'A valid email is required'
    return
  }
  if (password.value.length < 6) {
    error.value = 'Password must be at least 6 characters'
    return
  }
  if (password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match'
    return
  }

  const usersRaw = localStorage.getItem('soletrack_users') || '{}'
  const users = JSON.parse(usersRaw)
  if (users[email.value]) {
    error.value = 'An account with this email already exists'
    return
  }

  users[email.value] = { name: name.value, password: password.value }
  localStorage.setItem('soletrack_users', JSON.stringify(users))
  success.value = 'Registration successful. You can now log in.'
  // switch to login after registration
  mode.value = 'login'
  // prefill email
  password.value = ''
  confirmPassword.value = ''
}

function login() {
  resetMessages()
  if (!validateEmail(email.value)) {
    error.value = 'A valid email is required'
    return
  }
  if (!password.value) {
    error.value = 'Password is required'
    return
  }

  const usersRaw = localStorage.getItem('soletrack_users') || '{}'
  const users = JSON.parse(usersRaw)
  const user = users[email.value]
  if (!user || user.password !== password.value) {
    error.value = 'Invalid email or password'
    return
  }

  // set a simple current user marker
  localStorage.setItem('soletrack_current', JSON.stringify({ email: email.value, name: user.name }))
  success.value = 'Login successful — redirecting to your account...'
  setTimeout(() => router.push('/account'), 700)
}
</script>

<template>
  <div class="auth-container">
    <div class="tabs">
      <button :class="{active: mode === 'login'}" @click="switchMode('login')">Login</button>
      <button :class="{active: mode === 'register'}" @click="switchMode('register')">Register</button>
    </div>

    <form @submit.prevent="mode === 'login' ? login() : register()" class="auth-form">
      <h2 v-if="mode === 'login'">Sign in to your account</h2>
      <h2 v-else>Create a new account</h2>

      <div v-if="mode === 'register'" class="form-row">
        <label for="name">Name</label>
        <input id="name" v-model="name" type="text" autocomplete="name" />
      </div>

      <div class="form-row">
        <label for="email">Email</label>
        <input id="email" v-model="email" type="email" autocomplete="username" />
      </div>

      <div class="form-row">
        <label for="password">Password</label>
        <input id="password" v-model="password" type="password" autocomplete="current-password" />
      </div>

      <div v-if="mode === 'register'" class="form-row">
        <label for="confirm">Confirm Password</label>
        <input id="confirm" v-model="confirmPassword" type="password" autocomplete="new-password" />
      </div>

      <div class="messages">
        <p class="error" v-if="error">{{ error }}</p>
        <p class="success" v-if="success">{{ success }}</p>
      </div>

      <div class="actions">
        <button type="submit">{{ mode === 'login' ? 'Login' : 'Register' }}</button>
      </div>
    </form>
  </div>
</template>

