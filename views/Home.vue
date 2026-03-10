<template>
  <header><router-link to="/login">Login/Register</router-link></header>

  <h1><strong>SoleTrack</strong></h1>

  <p>Welcome to the SoleTrack!</p>

  <p><router-link to="/login">Register</router-link> to start making <strong>money!</strong></p>

  <router-link to="/browse">Browse Available Products</router-link>

  <br>

  <label for="searchInput">Search</label>
  <input id="searchInput" type="text" placeholder="Search..." />
  <button>Search</button>

  <div class="browser-scroll-menu">
    <img src="/src/assets/thumbnail.jpg" alt="thumbnail">
    <img src="/src/assets/thumbnail.jpg" alt="thumbnail">
    <img src="/src/assets/thumbnail.jpg" alt="thumbnail">
    <img src="/src/assets/thumbnail.jpg" alt="thumbnail">
    <img src="/src/assets/thumbnail.jpg" alt="thumbnail">
    <img src="/src/assets/thumbnail.jpg" alt="thumbnail">
    <img src="/src/assets/thumbnail.jpg" alt="thumbnail">
    <img src="/src/assets/thumbnail.jpg" alt="thumbnail">
    <img src="/src/assets/thumbnail.jpg" alt="thumbnail">
    <img src="/src/assets/thumbnail.jpg" alt="thumbnail">
    <img src="/src/assets/thumbnail.jpg" alt="thumbnail">
    <img src="/src/assets/thumbnail.jpg" alt="thumbnail">
    <img src="/src/assets/thumbnail.jpg" alt="thumbnail">
  </div>
  <footer><router-link to="/about">About Us</router-link></footer>
</template>

<style scoped></style>
