# Fachvorgabe Zustimmungsprotokoll (Fassung und Zeitpunkt)

> **ENTWURF – Fachvorgabe für das Code-Paket, keine Rechtsfreigabe.** Strang R ändert keinen Code. Diese Vorgabe beschreibt, was
> gespeichert werden muss, damit Zustimmungen später belegbar sind (Masterplan S0 Nr. 6, Strang R „Zustimmungsprotokoll bei der Registrierung“).

## Ist-Stand (geprüft 03.10.2026)

| Stelle | Heute | Lücke |
|---|---|---|
| `src/app/api/auth/registrieren/route.js` Z. 11 | prüft nur `body.agb === true` | Fassung, Hash, Zeitpunkt, Text werden nicht gespeichert; Fehlermeldung verlangt fälschlich „Datenschutzerklärung akzeptieren“ |
| `src/components/Plattform/RegistrierFormular.js` | eine Checkbox für Nutzungsbedingungen **und** Datenschutzerklärung | Datenschutzerklärung ist Kenntnisnahme, keine Zustimmung → nur Hinweis mit Link |
| `src/lib/anfrage/hinweise.js` (Paket C) | Hinweis und Einwilligungen mit `version` und `textHash` | Version `ENTWURF-2026-10-03` → nach Freigabe auf freigegebene Fassung umstellen |
| `src/lib/ereignis/einwilligung.js` | Cookie-Auswahl mit Version `2026-10-w1b` und Zeit | erfüllt die Vorgabe im Browser; serverseitiger Nachweis nicht vorgesehen [[PRÜFEN P-24: nötig?]] |
| Versorger- und Bank-Portal | Annahme durch erste Handlung | ausdrückliche Annahme mit Protokoll (siehe `bedingungen/lieferanten.md` § 1, `banken.md` § 1) |

## Was je Zustimmung gespeichert wird

| Feld | Inhalt | Beispiel |
|---|---|---|
| `dokument` | Kennung des Textes | `nutzungsbedingungen`, `bb-projektboerse`, `einwilligung-werbeanruf` |
| `fassung` | Fassungskennung des freigegebenen Textes | `NB-AT-2026-11-15` |
| `land` | Länderteil, der angezeigt wurde | `AT` |
| `sprache` | `de` / `en` | `de` |
| `textHash` | SHA-256 über den angezeigten Volltext (bei Bedingungen) bzw. den Checkbox-Text (bei Einwilligungen) | `9f2c…` |
| `checkboxText` | angezeigter Satz an der Checkbox | „Ich stimme den Nutzungsbedingungen (Fassung vom …) zu.“ |
| `zeitpunkt` | Serverzeit ISO 8601 | `2026-11-20T09:14:03Z` |
| `kanal` | `registrierung`, `relogin`, `anfrage`, `portal`, `einladung` | `registrierung` |
| `konto` / `vorgang` | Bezug | Konto-ID |
| `ip` | **gekürzt** [[PRÜFEN P-24: gekürzt oder voll? Beweiswert vs. Datensparsamkeit]] | `203.0.113.0/24` |
| `widerruf` | Zeitpunkt eines Widerrufs (append-only, nie überschreiben) | – |

## Regeln

1. **Append-only:** Zustimmungen und Widerrufe werden nur angehängt, nie geändert. Speicherung analog zur Hash-Kette des Aktivitätsprotokolls,
   aber mit Löschfrist (siehe Datenschutzerklärung, Abschnitt 15). [[PRÜFEN P-14]]
2. **Getrennt vom Vorgang:** Der Nachweis überlebt die Löschung des Leads als Minimaldatensatz (DE: § 7a UWG, 5 Jahre ab Erteilung und nach
   jeder Verwendung für Telefonwerbung).
3. **Fassungsarchiv:** Jeder freigegebene Text wird mit Fassung, Hash und Inkrafttreten archiviert und ist öffentlich abrufbar; nur so ist der
   Hash später prüfbar.
4. **Neue Fassung:** Verbraucher müssen aktiv zustimmen (Banner beim nächsten Login); Unternehmer erhalten die Mitteilung nach § 20 Abs. 3
   Nutzungsbedingungen. Die Zustimmung zur neuen Fassung ist ein neuer Eintrag.
5. **Export:** Nutzer können ihren Zustimmungsauszug im Profil herunterladen.
6. **Bis zur Freigabe** wird bei der Registrierung keine verbindliche Zustimmung zu Entwurfstexten eingeholt (Masterplan: noindex, kein
   öffentlicher Livegang). [[INHABER: Registrierung auf Staging beschränken oder Checkbox-Text „Entwurf – zur Kenntnis“]]

## Abnahme (für das Code-Paket)

- Registrierung ohne Zustimmung → 422; mit Zustimmung → Eintrag mit allen Feldern oben.
- Zwei Registrierungen mit verschiedenen Fassungen → zwei unterschiedliche `fassung`/`textHash`.
- Konto löschen → Zustimmungseintrag bleibt als Minimaldatensatz bis Fristende; danach gelöscht.
