---
name: automatisierung-ueber-frappe-workflow
description: "Automatisierung läuft nicht im Frontend, sondern über Frappe Scheduler und Frappe Workflow; Aktionen sind Dokumente mit Zuständen, keine RPC-Aufrufe."
metadata: 
  node_type: memory
  type: project
  originSessionId: 49607d79-0266-464d-b596-54bc6588fb9b
  modified: 2026-09-19T01:40:46.667Z
---

Benny hat am 2026-09-19 die Zielarchitektur für Automatisierung festgelegt:
**Die Automatisierung entsteht in Frappe, nicht im Frontend.**

- Die **API/Konnektoren** holen Zustände aus den Fremdsystemen (PBS, NAKIVO,
  Frappe Drive, S3, Firewalls, SIEM …). Getaktet über den **Frappe
  Scheduler** (`hooks.py` → `scheduler_events`), nicht über Timer im Browser.
- Was gesteuert werden soll, wird über **Frappe Workflow** eingestellt:
  Zustände, Übergänge, erlaubte Rollen. Das ist Konfiguration im laufenden
  System, kein Code.
- Eine Aktion (etwa „jetzt sichern") ist deshalb **kein direkter RPC**,
  sondern ein **Dokument mit Workflow-Zustand**, das Frappe weiterbewegt.
  Entwurf → beantragt → genehmigt → läuft → erledigt/fehlgeschlagen.

**Why:** Ein Knopf, der sofort ein Fremdsystem anfasst, lässt sich weder
genehmigen noch nachvollziehen noch ohne Codeänderung anders regeln. Als
Dokument mit Zustand bekommt jede Aktion Genehmigung, Protokoll und
Rollenprüfung geschenkt — und wer den Ablauf ändern will, stellt ihn in
Frappe ein, statt eine Datei zu ändern.

**How to apply:** Neue steuernde Funktionen als Antragsdokument mit
`workflow_state` modellieren, nicht als sofort ausführende Methode. Die
Übergänge als Daten halten (Zustände + erlaubte Rollen), damit sie später
1:1 einer Frappe-`Workflow`-Definition entsprechen. Der Mock muss diese
Semantik nachbilden, sonst ist die Portierung nach Python ein Umbau statt
einer Übersetzung. Siehe [[verifikation-im-browser]].
