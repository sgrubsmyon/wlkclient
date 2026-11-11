<main>
  <form>
    <div class="grid">
      <label for="username">Benutzername:</label>
      <input id="username" type="text">
      <label for="password">Passwort:</label>
      <input id="password" type="password">
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