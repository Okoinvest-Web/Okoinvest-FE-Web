---
name: kein-git-repo
description: Kundenportal steht nicht unter Versionskontrolle; Wiederherstellung nur aus .next-Sourcemaps
metadata: 
  node_type: memory
  type: project
  originSessionId: b1050686-a424-4ffd-b70c-f024d1f6f548
  modified: 2026-09-14T07:31:54.769Z
---

`C:\Users\SALEADMIN\Documents\Kundenportal` ist **kein Git-Repository**. Es gibt
keinen Stand, auf den man zurücksetzen kann.

**Why:** Ein `Write` auf eine bestehende Datei löscht ihren bisherigen Inhalt
unwiederbringlich. In dieser Sitzung traf es
`src/app/portal/alarme/aktionen.ts` — die drei Serveraktionen `quittiere`,
`behebe` und `erzeugeTicket` waren weg, und nur der Zufall, dass der
Entwicklungsserver lief, hat sie gerettet.

**How to apply:** Vor jedem `Write` auf einen Pfad, der existieren könnte, erst
lesen oder `ls` prüfen; für Ergänzungen `Edit` oder ein Python-Snippet mit
`str.replace` verwenden. Ist doch etwas überschrieben worden: Der Quelltext
steckt in den Sourcemaps unter `.next/` (auch `.next/dev/`). Alle `*.map`-Dateien
durchsuchen, `sections[].map.sources` nach dem Dateipfad absuchen und den
passenden Eintrag aus `sourcesContent` herausschreiben. Siehe auch
[[energieportal-projektziel]].
