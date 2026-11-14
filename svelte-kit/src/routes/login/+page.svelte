<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  let username: string = $state('');
  let password: string = $state('');

  const handleSubmit = async (event: Event) => {
    event.preventDefault();

    // Here you would typically send a request to your backend to authenticate the user
    // For demonstration purposes, we'll just log the username and password
    console.log('Username:', username);
    console.log('Password:', password);

    // And here we send it for real
    fetch("http://localhost:8000/auth/login", {
      method: "POST",
      body: JSON.stringify({
        username: username,
        password: password
      }),
      headers: {
        "Content-type": "application/json; charset=UTF-8"
      }
    })
      .then((response) => response.json())
      .then((json) => console.log(json));

    // After successful login, you might want to redirect the user
    // goto('/dashboard'); // Uncomment this line to redirect after login
  };
</script>

<main>
  <form on:submit={handleSubmit}>
    <div class="grid">
      <label for="username">Benutzername:</label>
      <input id="username" type="text" bind:value={username}>
      <label for="password">Passwort:</label>
      <input id="password" type="password" bind:value={password}>
    </div>
    <button type="submit">Login</button>
  </form>
</main>

<style>
  main {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    font-size: 1.2rem;
    font: sans-serif;
  }
  
  form > div.grid {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 1rem;
  }

  button {
    margin-top: 1rem;
    width: 100%;
    padding: 0.5rem;
    border-radius: 0.5rem;
    border: none;
    background-color: #4CAF50;
    color: white;
    cursor: pointer;
    font-size: 1.2rem;
  }
</style>