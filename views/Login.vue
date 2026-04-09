<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getRedirectResult,
  signInWithEmailAndPassword,
  signInWithRedirect,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth'
import { auth, firebaseConfigured } from '@/lib/firebase'
import { upsertUserProfile } from '@/lib/profile'
import { disableDemoMode, enableDemoMode, isDemoMode } from '@/lib/demo'

const demoActive = ref(isDemoMode())

const router = useRouter()
const route = useRoute()
const mode = ref<'login' | 'register'>('login')

const name = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')

const error = ref('')
const success = ref('')

const isLikelyInAppBrowser = computed(() => {
  const ua = navigator.userAgent || ''
  return /FBAN|FBAV|Instagram|Line|TikTok|Snapchat|LinkedInApp|Twitter|wv\b/i.test(ua)
})

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
  name.value = ''
  email.value = ''
  password.value = ''
  confirmPassword.value = ''
}

function authErrorMessage(err: unknown) {
  const code = (err as { code?: string })?.code || ''
  const host =
    typeof window !== 'undefined' && window.location?.hostname ? window.location.hostname : ''
  switch (code) {
    case 'auth/invalid-api-key':
      return 'Firebase API key is invalid. Update soletrack/.env.local and redeploy.'
    case 'auth/unauthorized-domain':
      return `This domain${host ? ` (${host})` : ''} is not authorized for Google sign-in. Add it in Firebase Console → Authentication → Settings → Authorized domains.`
    case 'auth/operation-not-allowed':
      return 'This sign-in method is disabled in Firebase. Enable Email/Password and Google in Firebase Console → Authentication → Sign-in method.'
    case 'auth/invalid-email':
      return 'Enter a valid email address.'
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password.'
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.'
    case 'auth/weak-password':
      return 'Password is too weak. Use at least 6 characters.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a bit and try again.'
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.'
    case 'auth/popup-blocked':
      return 'Your browser blocked the sign-in popup. Try “Continue with Google (redirect)”.'
    case 'auth/popup-closed-by-user':
      return 'Sign-in popup was closed.'
    case 'auth/cancelled-popup-request':
      return 'Another sign-in popup is already open. Close it and try again.'
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with this email using a different sign-in method. Try signing in with the original method, then link Google from your account.'
    default:
      return `Something went wrong${code ? ` (${code})` : ''}. Please try again.`
  }
}

function nextPath() {
  return typeof route.query.next === 'string' && route.query.next ? route.query.next : '/account'
}

function enterDemoMode() {
  enableDemoMode()
  window.location.assign(nextPath())
}

function exitDemoMode() {
  disableDemoMode()
  window.location.assign('/login')
}

onMounted(async () => {
  if (!firebaseConfigured || !auth) return
  try {
    const result = await getRedirectResult(auth)
    if (!result?.user) return
    await upsertUserProfile(result.user)
    success.value = 'Login successful — redirecting...'
    setTimeout(() => router.push(nextPath()), 300)
  } catch (err) {
    error.value = authErrorMessage(err)
  }
})

async function register() {
  resetMessages()
  if (!firebaseConfigured || !auth) {
    error.value = 'Firebase is not configured yet. Add soletrack/.env.local to enable login.'
    return
  }
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

  try {
    const cred = await createUserWithEmailAndPassword(auth, email.value, password.value)
    await updateProfile(cred.user, { displayName: name.value.trim() })
    await upsertUserProfile(cred.user)
    success.value = 'Account created — redirecting...'
    setTimeout(() => router.push(nextPath()), 400)
  } catch (err) {
    error.value = authErrorMessage(err)
  }
}

async function login() {
  resetMessages()
  if (!firebaseConfigured || !auth) {
    error.value = 'Firebase is not configured yet. Add soletrack/.env.local to enable login.'
    return
  }
  if (!validateEmail(email.value)) {
    error.value = 'A valid email is required'
    return
  }
  if (!password.value) {
    error.value = 'Password is required'
    return
  }

  try {
    const cred = await signInWithEmailAndPassword(auth, email.value, password.value)
    await upsertUserProfile(cred.user)
    success.value = 'Login successful — redirecting to your account...'
    setTimeout(() => router.push(nextPath()), 400)
  } catch (err) {
    error.value = authErrorMessage(err)
  }
}

async function loginWithGoogle() {
  resetMessages()
  if (!firebaseConfigured || !auth) {
    error.value = 'Firebase is not configured yet. Add soletrack/.env.local to enable login.'
    return
  }
  try {
    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({ prompt: 'select_account' })
    const cred = await signInWithPopup(auth, provider)
    await upsertUserProfile(cred.user)
    success.value = 'Login successful — redirecting...'
    setTimeout(() => router.push(nextPath()), 300)
  } catch (err) {
    error.value = authErrorMessage(err)
  }
}
async function loginWithGoogleRedirect() {
  resetMessages()
  if (!firebaseConfigured || !auth) {
    error.value = 'Firebase is not configured yet. Add soletrack/.env.local to enable login.'
    return
  }
  try {
    success.value = 'Redirecting to Google...'
    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({ prompt: 'select_account' })
    await signInWithRedirect(auth, provider)
  } catch (err) {
    error.value = authErrorMessage(err)
  }
}
</script>

<template>
  <div class="auth-container">
    <div class="demo-callout">
      <div class="demo-copy">
        <strong>Presentation mode</strong>
        <span class="demo-sub">Use a fake user + mock data (no real email needed).</span>
      </div>
      <button v-if="!demoActive" class="btnDemo" type="button" @click="enterDemoMode">
        Continue as demo user
      </button>
      <button v-else class="btnDemo" type="button" @click="exitDemoMode">
        Exit demo mode
      </button>
    </div>

    <div class="tabs">
      <button :class="{active: mode === 'login'}" @click="switchMode('login')">Login</button>
      <button :class="{active: mode === 'register'}" @click="switchMode('register')">Register</button>
    </div>

    <form @submit.prevent="mode === 'login' ? login() : register()" class="auth-form">
      <h2 v-if="mode === 'login'">Sign in to your account</h2>
      <h2 v-else>Create a new account</h2>

      <button class="google-btn" type="button" @click="loginWithGoogle">Continue with Google</button>
      <p v-if="isLikelyInAppBrowser" class="hint">
        Google sign-in is blocked in some in-app browsers. Open this page in Chrome/Safari, or use redirect sign-in below.
      </p>
      <button class="google-btn secondary" type="button" @click="loginWithGoogleRedirect">
        Continue with Google (redirect)
      </button>
      <div class="divider"><span>or</span></div>

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
        <input id="password" v-model="password" type="password" :autocomplete="mode === 'login' ? 'current-password' : 'new-password'" />
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

<style scoped>
.demo-callout {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 12px;
  border-radius: 12px;
  border: 1px solid rgba(156, 255, 0, 0.14);
  background: rgba(156, 255, 0, 0.04);
  margin-bottom: 12px;
}
.demo-copy { display: grid; gap: 2px; }
.demo-sub { color: var(--muted); font-size: 0.85rem; }
.btnDemo {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(156, 255, 0, 0.22);
  background: rgba(156, 255, 0, 0.10);
  color: var(--text);
  cursor: pointer;
  font-weight: 800;
}
.btnDemo:hover { background: rgba(156, 255, 0, 0.14); }
.auth-container {
  max-width: 520px;
  margin: 0 auto;
  padding: 40px 16px 80px;
}

.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
}

.tabs button {
  flex: 1;
  background: transparent;
  border: 1px solid rgba(156, 255, 0, 0.15);
  color: var(--muted);
  padding: 10px 12px;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 700;
}

.tabs button.active {
  color: var(--text);
  border-color: rgba(156, 255, 0, 0.35);
  background: rgba(156, 255, 0, 0.06);
}

.auth-form {
  background: var(--card);
  border: 1px solid rgba(156, 255, 0, 0.14);
  border-radius: 16px;
  padding: 24px;
}

.auth-form h2 {
  margin: 0 0 14px;
  color: var(--text);
  font-size: 1.1rem;
}

.google-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid rgba(156, 255, 0, 0.25);
  background: rgba(156, 255, 0, 0.06);
  color: var(--text);
  font-weight: 800;
  cursor: pointer;
}
.google-btn.secondary {
  margin-top: 10px;
  background: transparent;
  border: 1px solid rgba(156, 255, 0, 0.2);
  color: var(--muted);
}
.google-btn:hover { opacity: 0.9; }
.hint { margin: 10px 0 0; color: var(--muted); font-size: 0.85rem; line-height: 1.5; }

.divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 14px 0;
  color: var(--muted);
  font-size: 0.8rem;
}
.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: rgba(156, 255, 0, 0.12);
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}

.form-row label {
  font-size: 0.8rem;
  color: var(--muted);
}

.form-row input {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text);
  font-size: 0.95rem;
}

.messages { min-height: 22px; }
.error { color: var(--danger); margin: 8px 0 0; font-size: 0.9rem; }
.success { color: var(--success); margin: 8px 0 0; font-size: 0.9rem; }

.actions { margin-top: 12px; }
.actions button {
  width: 100%;
  padding: 10px 14px;
  border-radius: 10px;
  border: none;
  background: var(--accent);
  color: #0b1205;
  font-weight: 900;
  cursor: pointer;
}
</style>
