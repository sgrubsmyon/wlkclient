<form>
  <label for="username">Benutzername:</label>
  <input id="username" type="text">
  <label for="password">Passwort:</label>
  <input id="password" type="password">
</form>

<style>
  form {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 1rem;
    max-width: fit-content;
    margin: auto;
  }
</style>