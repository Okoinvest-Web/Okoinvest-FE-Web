# Copyright (c) 2026, ÖkoInvest GmbH
#
# Whitelisted Methoden für die Next.js-Website: oekoinvest_app.plattform.api.<modul>.<funktion>
# Vertrag: docs/API.md der Website, Adapter: src/lib/plattform/backend/frappe.js (Tabelle METHODEN).
#
# Regeln für alle Methoden in diesem Paket:
#  - nie allow_guest; nur POST; Aufrufer braucht die Rolle „ÖkoInvest API“ (kern.api_pruefen bzw. kern.nutzer)
#  - Argumente in camelCase exakt wie vom Adapter gesendet, `als_benutzer` = Konto-ID des Website-Nutzers
#  - jede Aktion prüft Rolle UND Eigentum des genannten Nutzers selbst
#  - Rückgaben in camelCase wie das Demo-Backend (src/lib/plattform/backend/demo.js)
