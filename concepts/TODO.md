# `wlkclient` TODO

This file tracks the implementation of the GUI described in `IMPLEMENTATION_PLAN.md`.

**Progress tracking:** tick tasks off with `- [x]` as soon as they are finished (code merged, check/test run). Do not tick partially finished tasks; split them instead. Milestones are ordered, but the order may change if a dependency requires it.

**Documentation sync:** `IMPLEMENTATION_PLAN.md` is the target picture. Pages listed there as "Details to be specified" must be detailed in the plan *before* they are implemented. If implementation shows that the plan is wrong or incomplete, update the plan in the same change. Backend changes belong to `../../wlkserver`; keep `wlkserver/concepts/TODO.md` and `wlkserver/concepts/IMPLEMENTATION_PLAN.md` in sync when doing them.

**Rule:** business logic belongs in the API (`wlkserver`). The client only holds display state (cart rows as returned by the API), calls endpoints and renders. Anything that computes prices, taxes, discounts, Pfand relations or totals is a backend task.

## Milestone overview

| Milestone | Content |
|-----------|---------|
| M0 | Project foundations: app shell, colours/theme config, reusable components, API client |
| M1 | Backend prerequisites (`wlkserver`): `warenkorb` endpoints for adding articles, Pfand, discounts and totals |
| M2 | Kassieren: article search (barcode / Art.-Nr. / Art.-Name) and modes Normal/Leergut/Rückgabe |
| M3 | Kassieren: cart list, row component, quantities, selection, totals |
| M4 | Kassieren: articles with variable price |
| M5 | Kassieren: discounts (per article and per receipt) |
| M6 | Kassieren: Anzahlung (deposit) |
| M7 | Kassieren: payment and sale completion (TSE, voucher, cash change) |
| M8 | Profil, password change, theme persistence, Benutzer management |
| M9 | Rechnungen (today / old, Storno) |
| M10 | Abrechnungen (day/month/year, Zählprotokoll) |
| M11 | Kassenstand |
| M12 | Master data: Artikel, Produktgruppen, Lieferanten, MwSt, Rabattaktionen |
| M13 | Bestellen |
| M14 | Preisschilder |
| M15 | DB Import/Export |
| M16 | Quality assurance, tests, documentation |

---

## M0 – Project foundations

Already present (verified in `svelte-kit/`):

- [x] SvelteKit project with TypeScript, ESLint, Prettier, Vitest, Playwright
- [x] Login page and server-side session handling (`hooks.server.ts`, cookie `access_token`, `GET /auth/me` as authority)
- [x] Logout (`GET /auth/me` invalidated, cookie deleted, redirect to /login)
- [x] `/me` profile page (read-only)
- [x] Theme toggle (client-side, `localStorage`, `<body data-theme>`)
- [x] TSE pages (`/tse/status`, `/tse/init`, `/tse/unblock`, export downloads)
- [x] Basic `Alert`, `Sidebar` components

Open:

- [x] Create a JSON config file for all plan colours, thumbnail size and other appearance values; load it once and expose it as CSS custom properties (light and dark values)
- [x] Replace hardcoded colours (e.g. sidebar `#333`) with the config values
- [x] Button hover states: slightly darker background with CSS transition, centrally defined
- [x] App shell layout: fixed sidebar + content area offset by the sidebar width
- [x] Sidebar: collapsed (icons only) and expanded (icon + title) state, toggled by the top-most button with right/left arrow icon
- [x] Sidebar entry list in plan order with lucide icons and routes, extended as pages are implemented; hide admin-only entries (Benutzer, MwSt, Import/Export) for role `mitarbeiter`
- [x] Sidebar theme button label: "Dunkel" (moon) in light mode, "Hell" (sun) in dark mode
- [x] After login redirect to `/kassieren`; `/` redirects depending on session
- [x] Central API helper in `src/lib/server/`: authenticated fetch (`Authorization: Bearer`), consistent error → `Alert` mapping, optional thumbnail proxy
- [x] Reusable `TextInput` component with clear "x" button, disabled state and emitted `enter` event
- [x] Reusable `Thumbnail` component (configurable size, grey "N/A" placeholder, fetches `GET /artikel/{id}/bild`)
- [x] Reusable `Modal` component (greyed-out background, ESC/close)
- [x] Reusable pill/radio button group component (rounded left/right ends, primary colour when active)
- [x] Formatting helpers: Euro (de-DE), VAT rate badge text, number/quantity parsing (comma and dot)

## M1 – Backend prerequisites (`wlkserver`): cart endpoints

Motivation: building cart rows (Pfand expansion, discounts, variable prices) is business logic. Today only `POST /verkauf` expands them (`build_sale_details` in `python/business/sale_workflow.py`); a GUI needs the same result *before* the sale is committed. Add a `warenkorb` router that computes cart rows statelessly.

Contract sketch (agree and document in the server OpenAPI docs):

- A cart row (`WarenkorbPosition`) carries: `ref` (client-generated or returned, used to attach children), `parent_ref` (for Pfand/Rabatt rows), `kind` (`artikel`, `pfand`, `rabatt`, `preisanpassung`, `leergut`, `rueckgabe`, `rechnung_rabatt`, `gutschein`, `anzahlung`), `artikel_id`, `artikel_name`, `kurzname`, `lieferant_kurzname`, `artikel_nr`, `stueckzahl`, `einzelpreis`, `ges_preis`, `mwst_satz`, `variabler_preis`, `rabatt_id` (nullable)
- Price/tax/rounding rules are shared with `build_sale_details` (single source of truth, no duplicated logic)

- [x] Design and document the `WarenkorbPosition` schema and the endpoint request bodies (Python schemas + docstrings)
- [x] Refactor the row expansion in `business/sale_workflow.py` into a reusable function so cart preview and sale creation cannot diverge
- [x] `POST /warenkorb/hinzufuegen`: body `{artikel_id, stueckzahl?, preis?}`; returns the article row plus its Pfand child row (article without Pfand is returned alone); variable-price articles keep the given `preis`
- [x] `POST /warenkorb/leergut`: body `{artikel_id, stueckzahl?}`; returns only the corresponding Pfand row with negative price (returning empty bottles)
- [x] `POST /warenkorb/rabatt`: body `{positionen: [...], rabatt: {art: "relativ"|"absolut", wert: ...}}`; returns one negative Rabatt child row per article row with the same `stueckzahl` and the article's VAT rate; rounding half-up per row
- [x] `POST /warenkorb/summen`: body = list of cart rows; returns `zwischensumme`, VAT sums for 0/7/19 % (`inkl. … MwSt`), `rabatte` total and `zu_zahlen` (incl. receipt-level discount and voucher redemption, excl. deposit handling)
- [x] Receipt-level discount (`rechnung_rabatt`) rows per VAT rate, excluding articles that already carry an individual Rabatt; expose a preview endpoint call for the "Zur Zahlung" stage
- [x] Record decision: `POST /warenkorb/rueckgabe` is not implemented; the client negates the row itself (suggested by the plan, trivially derivable). Document in `IMPLEMENTATION_PLAN.md`
- [x] Confirm how quantity changes are re-synchronised: re-call `hinzufuegen` with the new `stueckzahl` for the parent row and replace its children in the client; no stateful cart on the server
- [x] Verify `GET /artikel` supports the needed searches: `artikel_name`/`kurzname` contains (≥3 chars), `artikel_nr` contains, barcode wildcard via the existing `q` contains search (matches name/nr/barcode) and `limit`
- [x] Verify `GET /artikel/{id}/bild` is reachable from the client (proxy through SvelteKit if cookies cannot be attached to `<img>` requests)
- [x] API tests for all new endpoints: full Pfand expansion, Leergut sign, discount sync, VAT split, rounding, variable price
- [x] Update `wlkserver/concepts/TODO.md` and `wlkserver/concepts/IMPLEMENTATION_PLAN.md` (required by the server AGENTS.md)

## M2 – Kassieren: article search and add modes

- [ ] Reusable `Suchfeld` component (input + dropdown with thumbnails, keyboard navigation, "Selection blue" highlight, single-match enter)
- [ ] Client-side cart store: ordered rows with stable refs, parent/child relations, selection state; no price/tax computation in the client
- [ ] Implement page layout: left selection column (33 %), right cart column (66 %), two flex rows
- [ ] Mode pill group "Normal" / "Leergut" / "Rückgabe" (radio semantics, default "Normal", primary background for active)
- [ ] Barcode field: query on Enter with wildcard `*<barcode>*`, dropdown with thumbnail + barcode
- [ ] Art.-Nr. field: query from 3 characters, re-query on each keystroke, dropdown with thumbnail + supplier short name (italic) + `artikel_nr`
- [ ] Art.-Name field: query from 3 characters, dropdown with thumbnail + supplier short name + `artikel_name` truncated to 100 chars with `…`
- [ ] Dropdown behaviour: viewport-height limit with scroll, mouse click adds, arrow-key navigation with "Selection blue" highlight, Enter adds the highlighted article; single match + Enter adds directly
- [ ] Add action calls the M1 endpoint according to the mode: Normal → `hinzufuegen`, Leergut → `leergut`, Rückgabe → `hinzufuegen` with negative row
- [ ] After adding: clear the active search field, clear its dropdown, return focus to the barcode field
- [ ] Empty-result feedback (no dropdown, short hint) and error handling (API unreachable, no Pfand configured for Leergut)
- [ ] Client-side tests for search debouncing, keyboard navigation and mode-dependent row creation

## M3 – Kassieren: cart list, quantities, selection, totals

- [ ] Cart header: "Warenkorb" with icon and red "Alles löschen" button; clearing also aborts the running TSE transaction (M7)
- [ ] Cart list container: fills available height, vertical overflow auto
- [ ] `KassierArtikel` row: 100×100 image, name in large bold, VAT badge with per-rate colour (0 % success, 7 % info, 19 % error), price `vk_preis × Stückzahl`, supplier short name (small bold), `artikel_nr` (small italic), `-`/`+` buttons, editable quantity input, red trash button, `ges_preis` in large bold
- [ ] Child rows (Pfand, "Rabatt auf Artikel"): no image, indented, correct colour per kind (Pfand blue, Rabatt error red, Leergut/Rückgabe success green)
- [ ] Receipt-level row ("Rabatt auf Rechnung") at the end: no image, not indented
- [ ] Quantity `-`/`+` and manual input (integer, ≥1) update the parent row and re-synchronise Pfand/Rabatt child rows via M1
- [ ] Remove row button deletes the row and all its children; "Alles löschen" empties the cart
- [ ] Selection toggle on row click, ignoring clicks on quantity controls, price input and buttons; selected rows use "Selection blue" background with readable text
- [ ] Only normal article rows are selectable; Pfand and Rabatt rows are not
- [ ] Totals panel: "Zwischensumme", "inkl. 0 %/7 %/19 % MwSt", "Rabatte", values from `POST /warenkorb/summen`
- [ ] Fixed-height (350 px) bottom area with totals left and payment buttons right
- [ ] Tests for quantity sync, child-row removal and selection state

## M4 – Kassieren: articles with variable price

- [ ] Section "Artikel mit var. Preis" with 2×2 button grid: "Sonstiges", "7% MwSt", "19% MwSt", "Gutschein verkaufen"
- [ ] "Sonstiges" fills the Art.-Name search with "Sonstiges" and triggers the search
- [ ] "7% MwSt" → `SONSTIGES1`, "19% MwSt" → `SONSTIGES2`, "Gutschein verkaufen" → `GUTSCHEIN`; add to cart via M1
- [ ] Price modal after adding a variable-price article (greyed background, price input, confirm/cancel; cancel removes the row)
- [ ] Editable unit price in the cart row for `variabler_preis` articles only; recompute the row total via the API
- [ ] Validation: price > 0, max two decimals, comma and dot accepted

## M5 – Kassieren: discounts

- [ ] Section "Rabatt auf ausgewählte Artikel" with buttons 5/10/15/20/25 %, "Mitarbeiter" and inputs for "individuell %", "individuell €", "Abweichender Preis"
- [ ] Enablement rules: with ≥1 selected article the percent buttons and "individuell %" are enabled; with exactly 1 selected article "individuell €" and "Abweichender Preis" are also enabled; otherwise disabled
- [ ] Discount actions call `POST /warenkorb/rabatt` and insert/replace the Rabatt child rows below each selected article (same `stueckzahl` as the article)
- [ ] "Abweichender Preis" sets the row's `ges_preis` (via the API) and hides the regular price display accordingly
- [ ] Recompute child rows when the parent quantity changes; never discount an article twice
- [ ] "Zur Zahlung" enables the receipt-level discounts (5–25 %, "individuell %", "Mitarbeiter"); they create "Rabatt auf Rechnung" rows at the end of the cart and skip already discounted articles
- [ ] Display the discount total in the totals panel
- [ ] Tests for rounding, double-discount prevention and receipt-discount exclusion

## M6 – Kassieren: Anzahlung

- [ ] Specify the deposit flow in `IMPLEMENTATION_PLAN.md` (new deposit during checkout, resolving an open deposit, interaction with cart and totals)
- [ ] "Neue Anzahlung" button: amount input, sets `anzahlung_betrag` for the sale, totals and cart preview reflect the split across VAT rates
- [ ] "Anzahlung auflösen" button: list open deposits (`GET /anzahlung/offen`, `GET /anzahlung/{id}/details`), select one, set `anzahlung_aufloesen_nr`
- [ ] Show the resulting Anzahlung/Anzahlungsauflösung rows in the cart preview
- [ ] Handle validation errors from the API (amount larger than cart, already resolved deposit)

## M7 – Kassieren: payment and sale completion

- [ ] "Zur Zahlung" button (Selection blue): stages the sale, enables receipt discount and payment controls; totals show "ZU ZAHLEN"
- [ ] TSE transaction: start with the first article (`POST /tse/transaction/start`), pass `tse_transaction_id` on completion, abort on "Alles löschen"
- [ ] Payment method pills "Bar" / "Karte" (default "Bar", primary colour when active)
- [ ] "Gutschein" button (FATAL colour) opens a modal: enter Gutschein-Nr. and amount, look up via `GET /gutschein/?gutschein_nr=`, show remaining/initial amount and purchase date, block amounts above the balance, add a `GUTSCHEINEINLOES` row on success
- [ ] Cash area (only for "Bar"): "KUNDE GIBT" input and read-only "Rückgeld" computed by the API
- [ ] "Buchung abschließen" (Weltladen green): map cart rows to `VerkaufCreate` (`verkauf_details` with `artikel_id`, `stueckzahl`, `ges_preis`, `rabatt_absolut`, `rabatt_id`) plus `rechnung_rabatt_relativ`, `gutschein_einloesung_nr/betrag`, `anzahlung_*`, `tse_transaction_id` and `POST /verkauf/`
- [ ] Handle response: `change` (cash return), `ec_warning`, API errors; on success clear cart, reset payment state, refocus barcode
- [ ] Tests for the cart → sale payload mapping (mocked API)

## M8 – Profil, password change, theme persistence, Benutzer management

Backend prerequisites (`wlkserver`):

- [ ] Add self-service endpoints: change own password (verifying the current one) and update own `pref_theme`; keep `PATCH /users/{id}` admin-only
- [ ] Sync server `TODO.md` and `IMPLEMENTATION_PLAN.md`

Client:

- [ ] `/me`: change-password form (current, new, repeat, validation, success/error alerts)
- [ ] Theme toggle writes `pref_theme` for the logged-in user and applies the stored preference after login and on page load (no flash)
- [ ] `/benutzer` (admin-only): heading, explanatory text, user table with the planned columns
- [ ] Table actions: reset password to random 10-char unambiguous password, display for hand-over; activate/deactivate toggle; delete account (with confirmation)
- [ ] Green circular "+" button top right of the table → `/benutzer/neu`
- [ ] `/benutzer/neu`: form (username, full name, role default `mitarbeiter`, theme default `light`), validation, redirect back to the list
- [ ] Route/page guards for admin routes (server-side redirect)

## M9 – Rechnungen

- [ ] Specify the page in `IMPLEMENTATION_PLAN.md`
- [ ] `/rechnungen/heute`: sales since the last completed `abrechnung_tag` (`GET /verkauf/`), columns per plan
- [ ] `/rechnungen/alt`: all other sales, read-only
- [ ] Sale details view (`GET /verkauf/{nr}/details`, `GET /verkauf/{nr}/mwst`)
- [ ] Storno action for today's sales only (`POST /verkauf/{nr}/storno`) with confirmation and error handling
- [ ] Route index redirect to `/rechnungen/heute`

## M10 – Abrechnungen

- [ ] Specify the three levels and the Zählprotokoll UI in `IMPLEMENTATION_PLAN.md`
- [ ] `/abrechnungen/tag`: list, details (`GET /abrechnung/tag/{id}`), preview (`GET /abrechnung/tag/vorschau`)
- [ ] Perform a daily settlement: count protocol form (Münzen/Scheine, Soll values), submit `POST /abrechnung/tag` with `zaehlprotokoll`, show result and warnings
- [ ] `/abrechnungen/monat` and `/abrechnungen/jahr`: list and details, read-only (created in the background)
- [ ] `/abrechnungen` index with navigation to the three levels
- [ ] Zählprotokoll history per settlement (`GET /zaehlprotokoll/abrechnung/{id}`)

## M11 – Kassenstand

- [ ] Specify the page in `IMPLEMENTATION_PLAN.md`
- [ ] Show current balance (`GET /kassenstand/aktuell`) and booking history (`GET /kassenstand/`)
- [ ] Manual balance change and withdrawal (`POST /kassenstand/`, `manuell`, `entnahme`, comment)
- [ ] Reset suggestion (`POST /kassenstand/zuruecksetzen/vorschau`) as a guided form

## M12 – Master data pages

- [ ] Specify all five pages in `IMPLEMENTATION_PLAN.md`
- [ ] `/artikel`: search/filter list (`GET /artikel/` with filters), create/edit (`POST`/`PATCH`), deactivate, picture upload/delete (`…/bild`)
- [ ] `/produktgruppen`: tree/list with VAT and Pfand assignment, create/edit
- [ ] `/lieferanten`: list, create/edit
- [ ] `/mwst`: admin-only list, create/edit/delete, DSFinV-K fields
- [ ] `/rabatt`: Rabattaktionen list, create/edit/delete (relative/absolute, quantity thresholds, validity period, article or product group)
- [ ] Sidebar entries and admin guard for `/mwst`

## M13 – Bestellen

- [ ] Specify the page in `IMPLEMENTATION_PLAN.md` (order types LM/KHW/IVT, position entry, status)
- [ ] List and filter orders (`GET /bestellung/`)
- [ ] Create and edit orders with positions embedded in the payload (`POST`/`PATCH /bestellung/`)
- [ ] Delete/cancel order (`DELETE /bestellung/{bestell_nr}`) with confirmation
- [ ] CSV import/export of orders (`/import_export/…/bestellung`)

## M14 – Preisschilder

- [ ] Specify the page in `IMPLEMENTATION_PLAN.md`: selection of articles/product groups, label layout, output format (ODT template or PDF/print)
- [ ] Article selection with thumbnails and filters
- [ ] Generate and download the price tags

## M15 – DB Import/Export (admin-only)

- [ ] Specify the page in `IMPLEMENTATION_PLAN.md`
- [ ] Export Artikel (`GET /import_export/export/artikel`), Abrechnung, Bestellung, Inventur, DSFinV-K
- [ ] Import Artikel and Bestellung with preview/dry-run and clear error reporting
- [ ] Sidebar entry visible for admins only

## M16 – Quality assurance and documentation

- [ ] Unit tests for all shared components and stores; API-mocked route tests
- [ ] Playwright end-to-end test of the full checkout flow against a test API/training instance
- [ ] `npm run check`, `npm run lint`, `npm run test` clean
- [ ] Accessibility pass: keyboard-only operation of search, dropdown, cart and modals; focus management; labels
- [ ] Responsive layout check (cashier screen and smaller windows)
- [ ] Dark/light theme check for all pages and badge/row colours
- [ ] `wlkclient` README: setup, config file, API_URL, theme/config documentation
- [ ] Final plan/TODO cross-check: every page listed in `IMPLEMENTATION_PLAN.md` exists at its route
