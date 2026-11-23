# `wlkclient` (GUI of `wlkserver`) implementation plan

This document describes what we want to build, i.e. how the product shall turn out in the end.

## Colours

Colours inspired of https://www.weltladen-bonn.org.

- Primary colour: #f4b03f
- Secondary colour: #14bac9
- Weltladen green: #80ca2c
- Selection blue: #0000ad
- Background colour light mode: #eeeeee
- Text colour light mode: #46403C
- Background colour dark mode: #333333
- Text colour dark mode: #cccccc
- Sidebar background colour: #46403c
- Sidebar text colour: #98918a
- Alert colours:
	- SUCCESS: #1b5e20
	- INFO: #0d47a1
	- WARN: #b45309
	- ERROR: #b71c1c
	- FATAL: #6a1b9a

Buttons of a colour, when hovered with the mouse, change to a slightly darker colour with a CSS transition.

All colours shall be configurable in a config JSON file.

## Pages

The wlkclient is supposed to consist of the following pages, linked with one icon each in the sidebar, in the same order as listed here (from top to bottom):

### Profil

- Route: /me (sidebar entry "Profil")
- Implemented incl. changing the own password

### Ausloggen

- Route: /ausloggen (dies ist eben need a route?)
- Just a button, no extra page. Redirect to /einloggen route after logout. Implemented.

### Benutzer (admin-only)

- Route: /benutzer
- Sidebar lucide icon: 'users'
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
- At top right corner of table: green circular button ("Weltladen green") with centered '+' for adding new user
	- opens user add page, route: /benutzer/neu
	- form with fields:
		- username
		- full name
		- role (default user already set)
		- preferred theme (default light already set)

### Dunkel/hell (Toggle dark/light theme)

Just a button, no extra page. Implemented.
Changing the theme updates `pref_theme` in the user table and a `theme` cookie, so the preferred theme is remembered and applied after login without a flash.

### Kassieren

- Route: /kassieren
- Sidebar lucide icon: 'euro'
- main page of the app
- opened automatically after login
- General structure:
	- two horizontal divs in a row, flex box with flex direction row (left one 33%, right one 66% of width)
	- left div for selection of products and discounts
	- right div for list of products added to cart and for checkout
- Left selection div structure:
	- holds 4 vertical divs (flex box with flex direction column)
		- div 1 content (flex direction column):
			- h3 with title: "plus" icon and text "Artikel hinzufügen"
			- form with content (flex direction column):
				- div with 3 horizontally aligned pill buttons that are radio buttons (exactly one must be selected): "Normal", "Leergut", and "Rückgabe". Default selected: "Normal". First pill button has rounded corners on the left, last pill button has rounded corners on the right. When selected (clicked), then the background of the button turns into "primary colour" (text colour might need to adjust to stay readable). Deselected buttons have transparent background (or no colour).
					- Selecting "Normal" means the next Artikel selected via barcode, artikel_nr oder artikel_name box will be added normally to cart
					- Selecting "Leergut" means the corresponding Pfand article of the next selected Artikel will be added to cart with negative price (for returning empty bottles)
					- Selecting "Rückgabe" means the next selected Artikel will be added with negative price (for returning bought products)
				- div (flex row): barcode icon, text "Barcode", input text box
					- when enter is pressed while focus is in barcode text box, a DB query is initiated searching for products matching the currently entered barcode (using wild cards, so "\*<entered barcode>\*")
					- a drop down list with all the matching Artikel is displayed, comfortable height of perhaps 30% viewport height, with vertical overflow auto so that it can be scrolled when list does not fit
					- each item in the list shows: "<thumbnail_picture_for_artikel_id> `artikel.barcode`"
					- Thumbnail size 40px x 40px (configurable in a json config file)
					- If no picture available, shows grey placeholder square (e.g. with small text "N/A")
					- clicking on an item in the drop down list adds the Artikel behind it to the cart
					- also, up/down arrows on the keyboard can be used to navigate in the drop down list, currently selected Artikel is highlighted with blue background. Pressing enter adds the currently highlighted Artikel to the cart.
					- when there is only a single match, pressing enter adds the Artikel to the cart
					- input text box has a small "x" icon at the right edge, clicking it clears the text box (a reusable component with this feature shall be made, since the other text boxes also have that)
				- div (flex row): 123 icon, text "Art.-Nr.", input text box
					- also has small "x" icon at right edge to clear content
					- when at least 3 characters have been entered, a DB query is initiated, searching for Artikel matching the entered `artikel_nr`
					- the DB query is updated upon each character type
					- result of the query is displayed in a drop down list of all matching Artikel
					- each list item shows: "<thumbnail_picture_for_artikel_id> *`lieferant.lieferant_kurzname`* `artikel.artikel_nr`"
					- Thumbnail size 40px x 40px (configurable in a json config file)
					- If no picture available, shows grey placeholder square (e.g. with small text "N/A")
					- clicking on an item in the drop down list adds the Artikel behind it to the cart
					- also, up/down arrows on the keyboard can be used to navigate in the drop down list, currently selected Artikel is highlighted with blue background. Pressing enter adds the currently highlighted Artikel to the cart.
					- when there is only a single match, pressing enter adds the Artikel to the cart
				- div (flex row): abc icon, text "Art.-Name", input text box
					- also has small "x" icon at right edge to clear content
					- when at least 3 characters have been entered, a DB query is initiated, searching for Artikel matching the entered `artikel_name`
					- the DB query is updated upon each character type
					- result of the query is displayed in a drop down list of all matching Artikel
					- each list item shows: "<thumbnail_picture_for_artikel_id> *`lieferant.lieferant_kurzname`* `artikel.artikel_name` (shortened to, say, 100 chars if longer, with ellipsis '...')"
					- Thumbnail size 40px x 40px (configurable in a json config file)
					- If no picture available, shows grey placeholder square (e.g. with small text "N/A")
					- clicking on an item in the drop down list adds the Artikel behind it to the cart
					- also, up/down arrows on the keyboard can be used to navigate in the drop down list, currently selected Artikel is highlighted with blue background. Pressing enter adds the currently highlighted Artikel to the cart.
					- when there is only a single match, pressing enter adds the Artikel to the cart
		- div 2 content (flex direction column):
			- h3 with lucide icon "circle-question-mark" and title "Artikel mit var. Preis"
			- CSS grid with two rows, two columns, holding four buttons:
				```
				------------------------
				| Sonstiges | 7% MwSt  |
				|-----------|----------|
				| Gutschein | 19% MwSt |
				| verkaufen |          |
				------------------------
				```
				- Clicking "Sonstiges" inserts "Sonstiges" into the artikel_name search box which leads to all "Sonstiges" Artikel of variable price being put into the dropdown list
				- Clicking "7% MwSt" selects the Artikel with name "Variabler Preis 7% MwSt, Sonstige" (artikel_nummer "SONSTIGES1") and adds it to cart
				- Clicking "19% MwSt" selects the Artikel with name "Variabler Preis 19% MwSt, Sonstige" (artikel_nummer "SONSTIGES2") and adds it to cart
				- Clicking "Gutschein verkaufen" selects Artikel with artikel_nummer "GUTSCHEIN" and adds it to cart
			- When an Artikel with variable price is added to cart, a small modal opens (rest of page greyed out) with box for entering the price. After price is entered, it is put into the cart, where price can also be changed after Artikel has been added (only for variable price Artikel, Artikel with no variable price do not have editable price)
		- div 3 content (flex direction column):
			- h3 with lucide icon "circle-percent" and title "Rabatt auf ausgewählte Artikel"
			- div with flex row
				- 5 buttons labelled "5%", "10%", "15%", "20%", "25%"
				- Button labelled "Mitarbeiter"
				- div (flex row): "individuell:", input text box, "%"
				- div (flex row): "individuell", input text box, "€"
				- div (flex row): "Abweichender Preis:", input text box, "€"
			- when at least one Artikel in cart is selected: 5 buttons and "individuell %" are enabled, else disabled
				- the selected Artikels get individual Rabatt rows below each of them in the cart ("Rabatt auf Artikel")
			- when exactly one Artikel in cart is selected: 5 buttons, "individuell %", "individuell €" and "Abweichender Preis" are all enabled
				- selected Artikel gets individual Rabatt row below it in the cart ("Rabatt auf Artikel")
			- when button "Zur Zahlung" is pressed, then 5 buttons, "individuell %" and Mitarbeiter button are enabled (Mitarbeiterrabatt only on entire cart)
				- They all then lead to "Rabatt auf Rechnung", an extra row at the end of the cart, which is calculated for all articles in the cart, except those that already have had Rabatt on the individual Artikel (disounted products are not discounted twice)
		- div 4 content (flex direction column):
			- h3 with lucide icon "piggy-bank" and title "Anzahlung"
			- div (flex row) with:
				- button with lucide icon "banknote-arrow-up" and text "Neue Anzahlung"
				- button with lucide icon "banknote-arrow-down" and text "Anzahlung auflösen"
- Right cart div structure:
	- holds two vertical divs (flex column)
		- second div has fixed height of 350px, first div fills remaining height
		- div 1 content (flex column):
			- This div holds the items in the cart
			- div (flex row, justify-content: space-between) with:
				- span with:
					- lucide icon "shopping-cart"
					- text "Warenkorb"
				- button (red background, maybe alert colour ERROR?) with:
					- lucide icon "trash"
					- text "Alles löschen"
						- clicking this button clears the cart and aborts the TSE transaction
			- div (flex column) with height filling all the remaining avilable space in this div and vertical overflow auto, so scrollbar appears if content needs more height
				- contains any number of "KassierArtikel" components (one for each Artikel added to cart)
					- each KassierArtikel component is a div (flex row) consisting of:
						- a 100px x 100px picture of the Artikel, derived from artikel_id
						- a div (flex column) with two divs:
							- a div (flex row) with:
								- a div containing `artikel_name` in large bold font taking up all available space not taken by the following that are aligned to the right edge
								- a coloured badge with the MwSt (VAT) of the Artikel, e.g. "7% MwSt" or "19% MwSt"
									- badge means that the text is surrounded by a rounded corner rectangle of a certain background colour
									- background colour is different for each VAT rate (e.g. 0% VAT is alert SUCESS green, 7% VAT is alert INFO blue, 19% VAT is alert ERROR red)
								- div (flex row) containing span with small font text: "`artikel.vk_preis` × `Stückzahl`"
									- special case Artikel with variable price: in that case, content of div is:
										- input text box for setting/editing single price of Artikel
										- span with small font text "× `Stückzahl`"
							- a div (flex row) with:
								- a span containing `lieferant.lieferant_kurzname` in small bold font
								- a span containing `artikel.artikel_nr` in small italic font
								- a div (flex row) with:
									- a square button with "-" that reduces `Stückzahl` by one
									- an input text box with the `Stückzahl` (number of Artikels to be bought)
									- a square button with "+" that increases `Stückzahl by one
								- a red (ERROR?) square button with lucide icon "trash" that removes the Artikel from the cart
								- a span with the `ges_preis` of this Artikel (`vk_preis` × `Stückzahl`) in large bold font
					- if the KassierArtikel is a special row referring to the row above (as shall be the case for Pfand or "Rabatt auf Artikel"), it shall not have a picture and its text (e.g. "Pfand" or "Rabatt auf Artikel") be indented to make clear that it belongs to the Artikel above it
					- the "Rabatt auf Rechnung" row that will be added at the end of the cart shall also have no product picture, but not be indented
					- Pfand rows shall have blue font ("Selection blue") to set them apart
					- Rabatt rows shall have red font (alert colour ERROR?) to set them apart
					- Rows for "Leergut" and "Rückgabe" shall have green font (alert colour SUCCESS) to set them apart
					- Artikels can be selected/deselected (toggle) by clicking on them (on the div's "background" or "inactive" elements like text; clicking on the +/- buttons for changing amount or on the price text box for variable price shall not select/deselect)
						- Selection is used for setting Rabatt
						- When selected, Artikel has "Selection blue" as background colour, font colour must be changed to "Dark mode text colour" or white to remain readable
						- Only "normal" Artikel rows can be selected, not Pfand/Rabatt
		- div 2 content (flex row): two divs, each taking 50% of available width
			- a div (flex column) with info on the payment amounts
				- this div has a rounded corner 1px solid border (in text colour of theme) around it to set it visually apart
				- it contains 4 flex row divs (justify-content: space-between) with the following contents:
					- "Zwischensumme:", current total price of cart items, "€"
					- "inkl. 0% MwSt:", current total sum of 0% VAT amounts, "€"
					- "inkl. 7% MwSt:", current total sum of 7% VAT amounts, "€"
					- "inkl. 19% MwSt:", current total sum of 19% VAT amounts, "€"
					- "Rabatte:", current total sum of discounts, "€"
			- a div (flex column) with buttons for payment process, containing 5 elements:
				- 1. a button with background colour "Selection blue" containing lucide icon "credit-card-reader" and text "Zur Zahlung"
					- clicking this button "stages" the sale in a pre-commit stage
					- "Rabatt" now becomes "Rabatt auf Rechnung"
					- Total amount to be paid ("ZU ZAHLEN:") and "KUNDE GIBT:" (see below) are now enabled
				- 2. a div (flex row) with:
					- label with text "ZU ZAHLEN:"
					- uneditable large font input text box with the grand total to be paid by customer (only filled after "Zur Zahlung" has been clicked, otherwise empty)
				- 3. a div (flex row) with three buttons:
					- two pill buttons of type radio button with text "Bar" and "Karte"
						- only one can of them must be active, default is "Bar"
						- active button has "primary colour" as background colour
						- they determine the payment method: whether customer pays in cash ("Bar") or with a credit/debit/EC card ("Karte")
					- third button is labelled "Gutschein" and has background colour "alert FATAL"
						- clicking it opens a modal for selecting a Gutschein (voucher) to be redeemed
						- Gutschein-Nr. and amount to be redeemed must be entered in the modal
						- The modal looks up the voucher via the API and displays info about it:
							- How much money is left on the voucher
							- How much money was on the voucher initially
							- When the voucher was initially bought
						- When entered amount to be redeemed is larger that what is avilable on the voucher, then an error message is displayed and the modal refuses to close
						- When modal closes successfully, the special Artikel "GUTSCHEINEINLOES" is added to the cart and voucher is redeemed accordingly when transaction is finished ("Buchung abschließen" is clicked)
				- 4. a div (flex row), only enabled when payment method is "Bar", with:
					- "KUNDE GIBT:"
					- input text box for entering amount of cash presented by customer
					- "Rückgeld:"
					- uneditable input text box showing the amount of return money paid back to the customer
				- 5. a button with background colour "Weltladen green" with:
					- lucide icon "check"
					- text "Buchung abschließen"
					- clicking the button creates new entries in the `verkauf*` and `tse_transaction` tables, finishes the TSE transaction and redeems voucher(s) if need be


### Bestellen

- Route: /bestellen
- Sidebar lucide icon: 'clipboard-list'
- Die Seite zum Erstellen und Bearbeiten von Bestellungen (Einkauf von Ware für den Laden).
- Details müssen noch spezifiziert werden

### Verkäufe

- Route: /verkaeufe
- Sidebar lucide icon: 'table-of-contents'
- Die Seite zum Anzeigen abgeschlossener Verkäufe (DB-Tabelle `verkauf`)
- Aufgeteilt in "Heutige Verkäufe" (Route /verkaeufe/heute, alle Verkäufe seit der letzten `abrechnung_tag`, die noch nicht in eine Abrechnung eingeflossen sind) und "Alte Verkäufe" (Route /verkaeufe/alt, für alle anderen älteren Verkäufe)
- Verkäufe in "Heutige Verkäufe" können storniert werden, die anderen nicht
- Allgemeine Struktur:
	- h1 mit Titel "Verkäufe"
	- 2 Tabs: "Heutige Verkäufe" und "Alte Verkäufe"
		- Tab "Heutige Verkäufe": div (flex row) mit Inhalt:
			- Tabelle mit Übersicht über die Verkäufe
				- Bitte JS-Bibliothek zur Formatierung verwenden, z.B. https://datatables.net/ (npm-Paket 'datatables.net-dt')
				- Spalten:
					- `rechnungs_nr` (Überschrift "Nr.")
					- `verkaufsdatum` (Überschrift "Datum")
					- Summe über `verkauf_details.ges_preis` für diese `rechnungs_nr` in Fettdruck (Überschrift "Summe"), formatiert mit `euro()`
					- Summe über `verkauf_details.mwst_betrag` für diese `rechnungs_nr` und `mwst_satz = 0.07` (Überschrift "7% MwSt"), formatiert mit `euro()`
					- Summe über `verkauf_details.mwst_betrag` für diese `rechnungs_nr` und `mwst_satz = 0.19` (Überschrift "19% MwSt"), formatiert mit `euro()`
					- "Bar" if `ec_zahlung` is False else "Karte" (Überschrift "Zahlungsart")
					- `kunde_gibt` (Überschrift "Kunde gibt")
					- `storno_von` (Überschrift "Storniert Nr.")
					- `username` zu der verbuchten `user_id` (Überschrift "User")
					- Button mit svelte icon "trash" zum Stornieren des Verkaufs (Tooltip/title: "Stornieren", Überschrift der Spalte: "Storno")
						- Klick auf Button öffnet Modal mit Frage "Verkauf Nr. `rechnungs_nr` über `<Eintrag aus Spalte "Summe">` wirklich stornieren?", Ja/Nein
						- Bei Klick auf Ja wird rechnung storniert, d.h. neue Zeile mit `storno_von = rechnungs_nr` wird in `verkauf` eingefügt
				- Angeklickte Tabellenzeile wird blau markiert (Hintergrundfarbe "Selection blue", Schriftfarbe hell/weiß)
				- Details des angeklickten Verkaufs werden rechts angezeigt im Detail-div
			- div mit Details zum angeklickten Verkauf
				- oben dieselbe Ansicht wie im Warenkorb (`section.liste`) von "Kassieren", aber: ohne Auswahl der Stückzahl (`+`, Stückzahl-Textfeld, `-`) und ohne "Löschen"-Button
				- darunter dieselbe Ansicht wie `div.zahlen`, aber nur so hoch wie benötigt

### Abrechnungen

- Route: /abrechnungen
- Sidebar lucide icon: 'grid-3x3'
- The page for looking at details from the three levels of Abrechnung:
	- `abrechnung_tag` (route /abrechnungen/tag) (daily settlements)
	- `abrechnung_monat` (route /abrechnungen/monat) (monthly settlements)
	- `abrechnung_jahr` (route /abrechnungen/jahr) (yearly settlements)
- The `abrechnung_tag` can be performed here, including `zaehlprotokoll`
- The others (month/year) are created automatically in the background
- Allgemeine Struktur:
	- Es gibt drei Tabs: (like the tabs in "Verkäufe")
		- "Tagesabrechnungen" (SQL table `abrechnung_tag`, route `/abrechnungen/tag`)
		- "Monatsabrechnungen" (SQL table `abrechnung_monat`, route `/abrechnungen/monat`)
		- "Jahresabrechnungen" (SQL table `abrechnung_jahr`, route `/abrechnungen/jahr`)
	- Jeder Tab zeigt alle Daten aus der jeweiligen `abrechnung_*`-SQL-Tabelle in einem vertikalen Layout, z.B. einer Tabelle (via `datatables.net-dt`):
		- Jede Zeile zeigt den Wert einer anderen Spalte der `abrechnung_*`-Tabelle
		- Die erste Spalte enthält die Zeilenüberschriften mit den Namen der Felder: "Laufende Nr. (Z_NR)" (`abrechnung_tag.id`), "Gesamt Brutto" (`SELECT SUM(ges_preis) FROM verkauf_details WHERE rechnungs_nr >= abrechnung_tag.rechnungs_nr_von AND rechnungs_nr <= abrechnung_tag.rechnungs_nr_bis`), "Gesamt Bar Brutto", "Gesamt Karte Brutto", "7% MwSt Brutto", "7% MwSt Netto" etc.
			- Für die Auswahl und Berechnung der angezeigten Werte bitte in JavaPOS in `Abrechnungen.java` oder `AbrechnungenTag.java` etc. schauen und die Logik kopieren
			- Ggf. Business-Logik zur Berechnung der Abrechnungswerte in API packen
		- Die Spalten nach der ersten Spalte enthalten je eine Abrechnung, mit der jüngsten links
		- Standardmäßig werden 7 Abrechnungen pro Seite angezeigt (konfigurerbar)
		- Umsetzung: einfache HTML-Tabelle statt DataTables, da die Pagination über Spalten (Abrechnungen) statt Zeilen läuft; Konfiguration `abrechnungenProSeite` in `src/lib/config.json`
		- Unter den Werten gibt es in jeder Spalte, also jür jede Abrechnung, einen Button "Exportieren", um die Tagesabrechnung in eine ODS-Datei zu enxportieren.
	- Über der Tabelle mit den Abrechnungsdaten ist oben links ein Datumsfilter mit Eingabe von Start- und Enddatum
	- Im Tab "Tabesabrechnungen" ist zusätzlich oben rechts über der Tabelle ein Button "Tagesabrechnung machen" mit dem Hinweis "Zahlen in rot werden als neue Tagesabrechnung gespeichert"
		- Nach Klick auf "Tagesabrechnungen" öffnet sich ein Modal zur Eingabe des "Zählprotokolls"
			- Das Zählprotokoll ist ein Formular, in dem für jede Münz- und Scheinart ein Inputfeld zur Zahleneingabe existiert (mit +/- Buttons und Defaultwert 0)
			- Unter der Eingabemaske wird die Kassendifferenz berechnet: Summe aller angegebenen Münzen/Scheine, Soll-Kassenstand laut DB und Differenzbetrag (sollte möglichst 0 sein)
			- Darunter ist eine Textarea zur Eingabe eines Kommentars mit Hinweis 'Bitte eingeben: Was ist der Grund für die Differenz? Wenn die Differenz 0,00 € ist, dann einfach "Kasse stimmt", "passt" o.ä. eintragen'



### Kassenstand

- Route: /kassenstand
- Sidebar lucide icon: 'coins'
- The page where Kassenstand (cashier balance) changes can be viewed and Kassenstand can be actively changed
- Details to be specified

### Artikel

- Route: /artikel
- Sidebar lucide icon: 'package-search'
- The page where Artikels can be viewed, created and edited
- Details to be specified

### Preisschilder

- Route: /preisschilder
- Sidebar lucide icon: 'tag'
- The page where price tags can be printed
- Details to be specified

### Produktgruppen

- Route: /produktgruppen
- Sidebar lucide icon: 'boxes'
- The page where product groups can be viewed, created and edited
- Details to be specified

### Lieferanten

- Route: /lieferanten
- Sidebar lucide icon: 'truck'
- The page where suppliers can be viewed, created and edited
- Details to be specified

### MwSt (admin-only)

- Route: /mwst
- Sidebar lucide icon: 'percent'
- The page where VAT rates can be viewed, created and edited
- Details to be specified

### Rabatt

- Route: /rabatt
- Sidebar lucide icon: 'circle-percent'
- The page where discount campaigns ("Rabattaktionen") can be viewed, created and edited
- Details to be specified

### TSE

- Route: /tse
- Sidebar lucide icon: 'card-sim'
- Status page for TSE with export functions already implemented.

### DB Import/Export (admin-only)

- Route: /import_export
- Sidebar lucide icon: 'tag'
- The page where data can be exported from/imported into the DB
- Mostly for exporting and importing Artikel data
- Details to be specified

## General goals and improvements

### Warenkorb-API

The cart itself is client state, but all price, Pfand, discount and VAT rules live in the API
(`POST /warenkorb/hinzufuegen|leergut|rabatt|summen`). The client posts the current context and
renders the returned rows. Quantity changes re-call `hinzufuegen` for the edited row and replace its
children, so Pfand and Rabatt rows always follow the article. "Rückgabe" does not need an endpoint:
the client negates the returned article rows itself. The cart is mirrored to `localStorage` (dropped
when the day changes, on "Alles löschen" and after the sale), so a reload, an app switch or leaving
the page does not lose it.

### Sidebar

The sidebar shall have a collapsed and an expanded state, togglable via the top-most button (above button for "Profil"). The toggle button has a "right arrow" icon when collapsed and a "left arrow" icon when expanded. In collapsed state, the sidebar shows only the square buttons and is narrow (only a little wider than the buttons themselves). When expanded, the buttons are rectangular and hold the page title right to the icon, i.e. "Profil", "Ausloggen", "Kassieren" etc. The theme toggle button shows text "Dunkel" (with moon icon) when current theme is light and "Hell" (sun icon) when current theme is dark.
