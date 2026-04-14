// Global test setup — runs before every test file.
// Provides a minimal localStorage mock so lib/demo.ts and lib/cart.ts work in jsdom.

import { vi } from 'vitest'

// jsdom ships with localStorage, but reset it between tests.
beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})
