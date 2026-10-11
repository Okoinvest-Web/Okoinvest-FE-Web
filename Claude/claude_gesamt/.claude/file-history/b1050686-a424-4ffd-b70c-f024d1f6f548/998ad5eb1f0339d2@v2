---
name: heredoc-frisst-backslashes
description: "Bash-Tool: Heredocs verschlucken Backslashes, auch in Anführungszeichen"
metadata: 
  node_type: memory
  type: reference
  originSessionId: b1050686-a424-4ffd-b70c-f024d1f6f548
  modified: 2026-09-14T07:32:06.229Z
---

Im Bash-Tool dieser Umgebung verliert ein Heredoc einzelne Backslashes — auch
`<<'EOF'`, das sie eigentlich wörtlich durchreichen müsste. Aus `\+` wird `+`,
aus `\\n` wird `\n`. Außerdem scheitert `cat > datei.ts <<'EOF'` mit
TypeScript-Inhalt regelmäßig an einem `unexpected EOF`.

**Why:** Reguläre Ausdrücke und Zeilenumbrüche in JavaScript-Quelltext
(`/^UNA:\+/`, `.join("\n")`) kommen dadurch verstümmelt an. Der Fehler fällt
erst im Test auf, und die Ursache sieht dann nach einem Programmierfehler aus.

**How to apply:** TypeScript- und TSX-Dateien mit dem `Write`-Werkzeug
schreiben, nicht per Heredoc. Für Änderungen an bestehenden Dateien `Edit`
verwenden oder ein `python - <<'PYEOF'`-Snippet mit `str.replace` — dort gilt
dieselbe Falle, deshalb in Suchmustern keine Backslashes verwenden, sondern an
escape-freien Textstellen ankern. Siehe auch [[kein-git-repo]].
