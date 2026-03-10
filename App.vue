<script setup lang="ts">
</script>

<template>
  <div>
    <nav>
      <ul>
        <li><router-link to="/">Home</router-link></li>
        <li><router-link to="/login">Login/Register</router-link></li>
        <li><router-link to="/account">Account</router-link></li>
        <li><router-link to="/browse">Browse</router-link></li>
        <li><router-link to="/about">About</router-link></li>
        <div class="search-container">
          <label for="searchInput">Know what you want? </label>
          <input id="searchInput" type="text" placeholder="Search..." />
          <button>Search</button>
        </div>
      </ul>
    </nav>

    <main>
      <router-view />
    </main>
  </div>
</template>

<style scoped>
nav ul {
  display: flex;
  gap: 12px;
  list-style: none;
  padding: 0;
}
</style>
