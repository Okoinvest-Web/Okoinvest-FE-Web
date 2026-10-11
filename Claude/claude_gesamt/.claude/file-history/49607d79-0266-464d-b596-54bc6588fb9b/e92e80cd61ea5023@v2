---
name: verifikation-im-browser
description: "In diesem Projekt sind Build und Tests zweimal grün gewesen, während Seiten leer blieben – Rendern muss separat im Browser geprüft werden."
metadata: 
  node_type: memory
  type: project
  originSessionId: 49607d79-0266-464d-b596-54bc6588fb9b
  modified: 2026-09-18T20:34:17.265Z
---

Bei ÖKOVOLT NetOps reichen `vite build` und `vitest run` nicht als Nachweis.
Zweimal waren beide grün, während die Seite im Browser leer blieb – einmal ein
TDZ-Fehler in `DeviceDetail.vue` (ein `watch` mit `immediate: true` griff auf
ein später deklariertes `computed` zu), einmal eine fehlende Vorbündelung von
frappe-uis CJS-Abhängigkeiten im Dev-Server. Beide ohne Konsolenfehler.

**Warum:** Der Build prüft, ob Module auflösen; die Tests prüfen den Mock. Ob
Vue tatsächlich etwas zeichnet, prüft keines von beiden.

**How to apply:** Nach jeder größeren Änderung zusätzlich alle Routen headless
im Edge über CDP durchfahren (`scratchpad/allepages.mjs`) und bei
Oberflächenänderungen `scratchpad/audit.mjs` für schmales Fenster, Tastatur und
Beschriftungen. Beide Skripte **warten auf gerendeten Inhalt** statt fest zu
schlafen – ein festes `sleep` hat zweimal eine noch nicht fertige Seite als
„leer" bzw. fälschlich als „in Ordnung" gemessen. Der Dev-Server läuft unter
`http://localhost:8080` mit Router-Basis `/` (nicht `/netops`, das gilt nur im
Frappe-Build). Siehe auch [[frappe-ui-unter-vitest]].
