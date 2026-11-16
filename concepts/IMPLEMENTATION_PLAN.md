## Pages

The wlkclient is supposed to consist of the following pages, linked with one icon each in the sidebar, in the same order as listed here (from top to bottom):

### Profil

- Route: /ich
- Implemented, but missing:
	- Method to change own password
### Logout

- Route: /ausloggen (dies ist eben need a route?)
- Just a button, no extra page. Redirect to /einloggen route after logout. Implemented.
### Benutzer (admin-only)

- Route: /benutzer
- Sidebar icon: lucide 'users'
- User management page
- At top: heading with page name (in this case "Benutzer")
- Then explanatory text "Hier können die Benutzer der Kasse verwaltet werden."
- Then table listing all registered users
	- columns:
		- user_id
		- username
		- Full name
		- role (mitarbeiter or admin)
		- preferred theme (dark or light)
		- button to reset password to a random one with 10 chars (only numbers, large and small letters, no ambiguous chars)
			- new random password is displayed for admin to take note and securely deliver to user
		- button to deactivate/activate account (toggle)
		- button to delete account
- At top right corner of table: green circular button with centered '+' for adding new user
	- opens user add page, route: /benutzer/neu
	- form with fields:
		- username
		- full name
		- role (default user already set)
		- preferred theme (default light already set)
### Toggle dark/light theme

Just a button, no extra page. Implemented.
Missing:
- changing theme updates 'pref_theme' in user DB table, so preferred theme is remembered and applied after login

### Kassieren

- Route: /kassieren
- Sidebar icon: lucide euro
- main page of the app
- opened automatically after login
- General structure:
	- two horizontal divs in a row (left one 33%, right one 66% of width)
	- left div for selection of products
	- right div for list of products added to cart
- Left selection div structure:
	- 
- Right cart div structure:
- 
### Bestellen

### Rechnungen

### Abrechnungen

### Kassenstand

### Artikelliste

### Preisschilder

### Produktgruppen

### Lieferanten

### MwSt (admin-only)

### Rabattaktionen

### TSE

Status page for TSE with export functions already implemented.

### DB Import/Export (admin-only)