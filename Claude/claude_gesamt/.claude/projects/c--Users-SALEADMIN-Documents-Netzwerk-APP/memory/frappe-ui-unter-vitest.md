---
name: frappe-ui-unter-vitest
description: Der frappeui-Vite-Plugin blockiert unter Vitest; Komponententests laufen deshalb gegen ein Testdouble.
metadata:
  type: project
---

Komponententests in ÖKOVOLT NetOps können frappe-ui nicht echt laden:

- Ohne Plugin scheitert der interne Import `~icons/lucide/x`.
- Mit `server.deps.inline: ['frappe-ui']` scheitert dieselbe Auflösung.
- Mit `frappeui({ lucideIcons: true })` in `vitest.config.js` **hängt der Lauf**
  (über 5 Minuten ohne Ausgabe) – der Plugin wartet offenbar auf eine
  Frappe-Site.

**Warum:** Der Plugin ist auf den Dev-Server ausgelegt, nicht auf einen
Testlauf ohne Backend.

**How to apply:** `vitest.config.js` mappt `frappe-ui` auf
`tests/doubles/frappe-ui.js`. Das heißt: Komponententests prüfen die eigenen
Komponenten, **nicht** frappe-ui. Eine API-Änderung von frappe-ui fällt erst im
Build und beim Durchklicken auf – siehe [[verifikation-im-browser]].
