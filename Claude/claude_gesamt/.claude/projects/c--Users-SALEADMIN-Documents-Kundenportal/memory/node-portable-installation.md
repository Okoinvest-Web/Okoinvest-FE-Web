---
name: node-portable-installation
description: Node.js liegt portabel unter ~/nodejs und ist im Bash-Tool nicht im PATH
metadata: 
  node_type: memory
  type: project
  originSessionId: b1050686-a424-4ffd-b70c-f024d1f6f548
  modified: 2026-09-13T15:29:24.195Z
---

Node.js v24.21.0 wurde am 2026-09-13 portabel nach `C:\Users\SALEADMIN\nodejs`
entpackt (kein Installer, kein winget/choco/scoop auf dieser Maschine verfügbar).

**Why:** Der User-PATH wurde dauerhaft ergänzt, sodass PowerShell `node`/`npm`
direkt findet. Das Bash-Tool erbt diesen PATH aber nicht — dort schlägt jeder
`npm`/`npx`-Aufruf mit "command not found" fehl.

**How to apply:** Vor Node-Befehlen im Bash-Tool immer
`export PATH="/c/Users/SALEADMIN/nodejs:$PATH"` voranstellen. In PowerShell
funktioniert `node`/`npm` ohne Zutun.
