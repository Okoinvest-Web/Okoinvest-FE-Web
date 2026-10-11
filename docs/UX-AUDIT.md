# UX-Audit ÖkoInvest-Plattform – 12 Kernwege

Stand: 01.10.2026 · Team UX-Research (Senior UX Researcher + Interaction Designer)
Maßstab: Nielsen-Heuristiken (H1–H10), WCAG 2.2 AA, Formular-Best-Practices, Baymard (Formulare/Checkout-artige Abläufe).
Methode: rund 30 Minuten statische Code-Analyse aller beteiligten Komponenten, danach kurze Playwright-Läufe mit Demo-Konten bei 390 px und 1440 px (Viewport-Aufnahmen, automatische Messung: Überlauf, Seitenhöhe, Ziele < 24 px, Felder ohne Label, Bilder ohne `alt`), dazu interaktive Läufe für Flächencheck und Solarpark-Rechner.

**Screenshots** (Zitat-Belege) liegen unter
`{SHOTS}` = `C:\Users\SALEAD~1\AppData\Local\Temp\claude\c--Users-SALEADMIN-Downloads-Oekovolt-Web-DE-Oekovolt-Web-DE\6ac8640b-bab4-4de9-9c07-3a24f91b0e42\scratchpad\pw\shots\`
Skripte: `ux_lauf.mjs`, `ux_fc.mjs`, `ux_rechner.mjs`, `ux_ueberlauf.mjs` im Ordner `pw`.

**Einschränkungen:** Ladezeiten stammen vom geteilten Dev-Server (4–84 s) und sind nicht repräsentativ. Während des Audits wurde der Server von außen neu gestartet; einige 1440-px-Aufnahmen (Exposé, Verifizierung) fehlen deshalb und sind statisch bewertet. In den Demo-Daten stecken Testdatensätze anderer Teams („Test mup…“, ein Kontakt namens `=HYPERLINK(...)`) – das verfälscht den Eindruck in Börse und Vorgängen (der CSV-Export neutralisiert Formeln korrekt, `src/lib/plattform/csv.js:30`).

---

## Gesamtbild

**Stärken (bitte erhalten):** durchgängig deutsche Microcopy in Sie-Form, Ladezustände an fast allen Knöpfen („Anmeldung läuft …“, „Wird geprüft …“), Doppelabsendeschutz, Fokus-Management in Assistenten (`kopfRef.focus()`), Skip-Links, `prefers-reduced-motion`, keine sichtbaren horizontalen Überläufe bei 390 px, alle Felder mit Label (0 Funde in allen Läufen), Vier-Augen-Prinzip und Prüfprotokolle im Fachkern. Viele Stellen sind fachlich klar besser als bei Wettbewerbern (Eignungscheck beim EG-Beitritt, MRZ-Prüfziffern live, Netzbetreiber-Anleitung direkt nach dem Beitritt).

**Querschnittsprobleme (wirken auf alle Wege):**

| # | Befund | Beleg |
|---|---|---|
| Q1 | **Kontrast:** `text-ink-400` (#97a0b0) auf Weiß = **2,63 : 1** (190 Fundstellen), weiße Schrift auf `bg-ov-500` = **3,40 : 1** (56 Fundstellen), Feldrahmen `ring-ink-200` auf Weiß = **1,29 : 1** (WCAG 1.4.11 verlangt 3 : 1 für Feldgrenzen). | `src/app/globals.css:33–62`, z. B. `BeitrittAssistent.js` Schrittleiste, `Portal/felder.js` `eingabe` |
| Q2 | **51× `confirm()` und 13× `window.prompt()`** für Freigaben, Abbrüche, Begründungen – Browser-Dialoge ohne Marke, ohne Kontext (Betrag, Empfänger), Sprache je Browser, mobil hässlich. | z. B. `Dealroom/BieterBereich.js:185,238`, `EG/Gruendung/Verein.js:72,175,284`, `Planung/Planliste.js:107` |
| Q3 | **Formularbausteine mehrfach erfunden:** 7 lokale `Feld`-Komponenten, 8 lokale `feld`-Klassen, 19 lokale Knopf-Definitionen. Folge: Fehler mal als Banner, mal inline, mal als native Blase; Hinweise mal verknüpft, mal nicht. | `BeitrittAssistent.js:305`, `AnfrageFormular.js:74`, `KommuneAnfrage.js:15`, `Gemeinschaft/AnfrageMitDaten.js:23` |
| Q4 | **Fehler/Hinweise nicht programmatisch verknüpft:** `aria-invalid` nur 5×, `aria-describedby` 12× im ganzen Code; `Feld` in `Portal/felder.js` erzeugt die Hinweis-ID, setzt sie aber nicht am Eingabefeld. | `src/components/Portal/felder.js:13–25` |
| Q5 | **Native Validierungsblasen** im öffentlichen Anfrageformular (Test: „Please fill out this field.“ im englischsprachigen Browser) – bricht Design und Sprache. | `AnfrageFormular.js:102`, Lauf `ux_fc.mjs` |
| Q6 | **Tipp-Banner auf jeder Portalseite** (ca. 250 px über dem Seitentitel bei 390 px) – verdrängt die eigentliche Aufgabe; teils falscher Kontext (Akquise-Karte zeigt „j/k blättern, a/b/c Priorität“ der Pipeline). | `{SHOTS}ux_inv_03__portal_verifizierung_390.png`, `{SHOTS}ux_adm_05__portal_admin_akquise_karte_1440.png` |
| Q7 | **Benachrichtigungs-Überlast:** Admin sieht Badges 212 / 59 / 99+, Investor 48 – Alarmmüdigkeit, nichts priorisiert. | `{SHOTS}ux_adm_01__portal_admin_1440.png`, `{SHOTS}ux_inv_02__portal_boerse_P_26_GVUVTQ_390.png` |
| Q8 | **Orientierung mobil:** Brotkrumen unter `md` ausgeblendet; am Desktop zeigen sie IDs statt Namen und werden zu „P… / Energiegem… / EGG-26-… / Abre…“ abgeschnitten. | `PortalRahmen.js:361`, `{SHOTS}ux_kas_01__portal_eg_EGG_26_K4MD9U_abrechnung_1440.png` |
| Q9 | **Startseiten zeigen Pflege statt nächster Aktion:** Onboarding-Checkliste und Tipps belegen den ersten Bildschirm, die wichtigste offene Aufgabe (z. B. „Pachtangebot liegt vor“) ist nicht sichtbar. | `{SHOTS}ux_fl_01__portal_390.png`, `{SHOTS}ux_adm_01__portal_admin_1440.png` |
| Q10 | **Kleine Ziele:** viele interaktive Elemente unter 24 × 24 px (WCAG 2.5.8), z. B. 56 auf „Fläche hinzufügen“, 62 in „Alle Vorgänge“. | Messwerte Anhang |
| Q11 | **Entwickler-Hinweise für Endkunden sichtbar:** „Entwicklungsbetrieb: … PLATTFORM_KYC_SCHLUESSEL setzen“ auf der Verifizierungsseite eines Investors. | `{SHOTS}ux_inv_03__portal_verifizierung_390.png` |

---

## (a) Bewertung je Weg

Ampel: **Grün** = funktioniert gut, nur Feinschliff · **Gelb** = spürbare Reibung, Abbruchrisiko · **Rot** = falsches Ergebnis oder Blocker.

| # | Weg | Ampel | Schritte / Interaktionen | Hauptproblem |
|---|---|---|---|---|
| 1 | Startseite → Flächencheck → Anfrage | **Rot** | 1 Klick Hero + 9 Klicks Assistent (gemessen) + 4 Pflichtangaben + Absenden ≈ 15 | Zahlenfeld verfälscht die Flächengröße („25“ wird zu 0,125 ha) → falsche Ampel |
| 2 | Investor: Börse → Projekt → NDA → Datenraum → LOI/Gebot | Gelb | 3 Klicks bis Exposé, NDA 2 Klicks, Wartezeit ≤ 2 Werktage, LOI 9 Pflichtfelder | NDA-Karte mobil ganz unten; LOI ohne Prüfschritt; 6 gleichrangige Kopf-Aktionen |
| 3 | Registrierung + Onboarding (investor, flaeche) | Gelb | Registrierung 8 Interaktionen; Onboarding 9–10 Schritte | Vorgewählte Rolle zeigt trotzdem 7 Rollenkarten; Flächencheck-Daten werden nicht übernommen (Doppelerfassung) |
| 4 | Login inkl. 2FA-Einrichtung | **Grün** | Login 3; 2FA-Einrichtung 4–5 | Kleinigkeiten: Tabs ohne Pfeiltasten, kein Auto-Absenden bei 6 Ziffern |
| 5 | KYC (Methodenwahl, MRZ) | Gelb | 6–9 Schritte | Schrittleiste mobil abgeschnitten ohne „Schritt x von y“; Zähler-`aria-live` je Tastendruck; Entwickler-Hinweis sichtbar |
| 6 | Eigentümer: Fläche → Pachtangebot → Pachtakte | Gelb | Angebot annehmen 3 Klicks | Angebot nicht auf der Übersicht; Annahme ohne Zusammenfassung der Eckdaten; generische Erfolgsmeldung |
| 7 | Backoffice: Cockpit → Vorgänge → Projekt freigeben | Gelb | Cockpit-Kachel → Projekt-Freigabe → Aktion → Bestätigen = 4 | Cockpit-Erstbild = Onboarding-Checkliste; Kundenmenü vor Backoffice-Menü; Prüfliste nur als Text |
| 8 | Akquise-Karte & Kampagne | Gelb | Filter → Liste → „Kampagne bilden“ → Name → Anlegen = 5 | Leere graue Karte ohne Ladezustand; Reglerfüllung passt nicht zum Wert; Ampel nur über Farbe |
| 9 | Energiegemeinschaft: Mitglied-Dashboard + Beitritt | Gelb | Beitritt 5 Schritte (Versprechen „rund 5 Minuten“) | Ersparnis in € fehlt auf der Übersicht; Schrittleiste mobil abgeschnitten; Fehler erst nach „Weiter“ als Sammelbanner |
| 10 | EG-Kassier: Abrechnungslauf | Gelb | Portal → EG → Dashboard → Verwaltung → Reiter „Abrechnung“ = 4 Klicks bis zum Lauf | Destruktive Aktionen ohne Rückfrage (Zahlungslauf „Verwerfen“), Status-Chips sehen aus wie Knöpfe |
| 11 | Rechner Solarpark-Rendite | **Grün** | 13 Regler, Ergebnis live | Vollständiges Ergebnis bei 390 px erst bei y ≈ 3.700 px; kein Szenario speichern/teilen/übergeben |
| 12 | Leitungs-Cockpit | Gelb | 0 Klicks bis Überblick | Kennzahlen ohne Vergleich (Vormonat/Ziel); Farbcodierung COD ohne Legende |

### Weg 1 – Startseite → Flächencheck → Anfrage (Rot)

- **Gefundener Fehler (P0, H5 Fehlervermeidung):** Im Feld „Genau eingeben“ setzt `onChange` jeden leeren Zwischenstand auf 0,1. Wer das Feld leert und „25“ tippt, erhält **0,125 ha**; das Ergebnis lautet dann „Eher schwierig · 10 von 100 Punkten · 0,1 MWp“. Gemessen: `nach Leeren: 0.1, nach Tippen 25: 0.125`. `src/components/Flaeche/FlaechenWizard.js:180`. Belege: `{SHOTS}ux_fc_2_flaeche_390.png`, `{SHOTS}ux_fc_5_ergebnis_390.png`.
- Regler endet bei 150 ha, das Zahlenfeld erlaubt 2.000 ha – größere Werte stellen den Regler stumm auf Anschlag (H1 Sichtbarkeit).
- Fortschritt mobil nur als Zahlenkreise, Schrittnamen erst ab 1280 px (`xl:block`); „Schritt 1 von 4“ steht nur auf Schritt 1 (H1). `{SHOTS}ux_fc_2_flaeche_390.png`
- „Weiter“ ist ohne Auswahl deaktiviert, ohne Hinweis, was fehlt (H9).
- **Eingaben gehen beim Neuladen verloren** (gemessen), obwohl das FAQ „bleiben in Ihrem Browser“ verspricht.
- Assistent beginnt bei 390 px erst bei y ≈ 600 px; mit Cookie-Banner beim Erstbesuch ist er komplett verdeckt. `{SHOTS}ux_pub_02__flaechencheck_390.png`
- Ergebnis stark: Tacho, Begründung je Punkt, Chips „ändern“, Agri-PV-Alternative, Vertrauenspunkte. Aber: Anfrageformular nutzt native Validierungsblasen (Q5) und rot-schwarze Fehlerbox im Grün-Design; Erfolgszustand verschiebt den Fokus nicht; „Status im Portal verfolgen“ übernimmt die E-Mail nicht in die Registrierung.
- Startseite: CTA „Fläche kostenlos prüfen“ im Hero gut sichtbar; Seite ist bei 390 px **21.600 px** lang (1440 px: 12.200 px). `{SHOTS}ux_pub_01___390.png`

### Weg 2 – Investor: Börse → Projekt → NDA → Datenraum → LOI/Gebot (Gelb)

- Exposé-Kopf zeigt nach Freigabe 6 gleichrangige Aktionen (Merken, Deal-Room, Bewerten, Finanzierung, Exposé-PDF, Öffentlich); „Bewerten“ und „Finanzierung“ haben dasselbe Icon (`Calculator`) – H4 Konsistenz. `src/app/portal/boerse/[id]/page.js:52–66`
- **Mobil liegt die Karte „Datenraum anfragen“ in der rechten Spalte und damit unter Beschreibung, Kennzahlen, vertraulichen Angaben und KI-Frage** – der Hauptschritt des Wegs ist mehrere Bildschirme entfernt. `page.js:79` (Grid) und `:154`.
- Klick-NDA solide (lesbarer Text, Checkbox, Protokoll-Hinweis), aber ohne PDF-Download des NDA-Texts und ohne Angabe, wie man über die Freigabe informiert wird.
- Wartezustand „in der Regel innerhalb von zwei Werktagen“ – gut; es fehlt eine sichtbare Benachrichtigungs-Zusage („Wir melden uns per E-Mail und in der Glocke“).
- LOI: 9 Pflichtfelder, Geldbeträge als Freitext ohne Tausendertrennung, **kein Prüfschritt vor dem Absenden** (Baymard: Review-Step vor bindungsnaher Abgabe), Hinweise nicht per `aria-describedby` verknüpft. `src/components/Portal/Fach/LoiFormular.js:86–152`
- Gebot zurückziehen und Zuschlag über `confirm()` (Q2). `Dealroom/BieterBereich.js:185,238`
- Deal-Room-Reiter mobil horizontal scrollbar ohne Scroll-Hinweis. `Dealroom/Tabs.js:8`
- Belege: `{SHOTS}ux_inv_01__portal_boerse_390.png`, `{SHOTS}ux_inv_02__portal_boerse_P_26_GVUVTQ_390.png`

### Weg 3 – Registrierung + Onboarding (Gelb)

- Mit `?rolle=flaeche` ist die Rolle vorgewählt, trotzdem stehen **7 Rollenkarten vor den Eingabefeldern** – die Felder rutschen unter die Falz (1440 px) bzw. auf Seite 2–3 (390 px, Seitenhöhe 5.839 px). `{SHOTS}ux_pub_02__registrieren_rolle_flaeche_1440.png`, `{SHOTS}ux_pub_05__registrieren_rolle_investor_390.png`
- Passwort: Stärkebalken `aria-hidden` ohne Textstufe; der Hinweis wird schon beim ersten Zeichen zur Fehlermeldung (vorzeitige Validierung). `RegistrierFormular.js:118–131`
- Fehler „Bitte wählen Sie mindestens eine Rolle“ erscheint unten am Knopf statt an der Rollenauswahl.
- Aus der Anfrage kommend wird nur die Vorgangsnummer übergeben, nicht Name/E-Mail – Doppelerfassung. `AnfrageFormular.js:81`
- **Onboarding Fläche:** Schritt „Fläche anlegen“ (3) fragt Ort/Größe/Nutzung neu ab, obwohl der Flächencheck sie bereits kennt; „Flächencheck übernehmen“ kommt erst danach (5). `src/lib/plattform/onboarding/pfade/flaeche.js:19–45`
- Mobil belegen 10 Schritt-Pillen ca. 250 px vor dem Inhalt; Titel „Erste Schritte · Flächen- und Dacheigentümer (Flächeneigentümer)“ doppelt. `{SHOTS}ux_fl_05__portal_willkommen_390.png`, `{SHOTS}ux_fl_01__portal_390.png`
- Positiv: „Später fortsetzen“, Pflicht-Kennzeichnung mit Screenreader-Text, Fortschrittsbalken, Fokus auf Schritttitel.

### Weg 4 – Login inkl. 2FA-Einrichtung (Grün)

- Login klar: Passwort/E-Mail-Link, Passwort anzeigen, Ladezustand, Hinweise nach Abmeldung. `{SHOTS}ux_pub_04__login_390.png`
- 2FA-Einrichtung vorbildlich (QR, Schlüssel in 4er-Gruppen, Deep-Link mobil, Codes kopieren/speichern). Lücken: kein „Ich habe die Codes gesichert“-Gate vor dem Schließen; Schlüssel ohne Kopierknopf; keine App-Empfehlung. `src/components/Portal/Sicherheit/ZweiFaktor.js:22–66,160–196`
- Anmelde-Code: kein Auto-Absenden nach 6 Ziffern; Tabs `role="tab"` ohne Pfeiltasten-Bedienung. `ZweiFaktorSchritt.js`, `LoginFormular.js:102`
- Cookie-Banner verdeckt bei 390 px beim Erstbesuch Passwortfeld und Anmeldeknopf (≈ 270 px).

### Weg 5 – KYC-Verifizierung (Gelb)

- Schrittleiste (bis 9 Schritte) ist mobil horizontal scrollbar **ohne Scrollleiste und ohne „Schritt x von y“** – Nutzer sehen „Einreichen“ nicht. `KycAssistent.js:296`
- Methodenwahl speichert sofort beim Klick (gut), `role="radio"` ohne Pfeiltasten; nicht wählbare Wege nur mit `opacity-70`.
- MRZ-Eingabe stark (Live-Prüfziffern, Einfügen mehrerer Zeilen, Hilfegrafik). Aber: **`aria-live` am Zeichenzähler** liest bei jedem Tastendruck „17 von 30“ vor; Prüfung startet erst, wenn alle Zeilen voll sind (keine Zeilen-Ampel). `MrzEingabe.js:178`
- Entwickler-Hinweis zum Schlüssel für Endkunden sichtbar (Q11). `{SHOTS}ux_inv_03__portal_verifizierung_390.png`
- Dokument-`scrollWidth` 1.038 px bei 390 px (vom `overflow-x: clip` des Body kaschiert, nicht sichtbar) – beim nächsten Layoutumbau prüfen.

### Weg 6 – Eigentümer: Fläche → Pachtangebot → Pachtakte (Gelb)

- **Übersicht zeigt das offene Pachtangebot nicht im ersten Bildschirm**; dort stehen Tipp-Banner und Checkliste. `{SHOTS}ux_fl_01__portal_390.png`
- Annehmen über `StatusAktionen`: Klick „Pachtangebot annehmen“ öffnet ein generisches Formular mit Knopf „Bestätigen“ – **ohne Zusammenfassung** (Pacht €/ha, Laufzeit, Indexierung, Rückbausicherheit) und ohne Hinweis, was danach passiert. Erfolg: „Erledigt: Pachtangebot annehmen.“ `src/components/Portal/StatusAktionen.js:58,140–160`
- „Fläche hinzufügen“: 27 Felder, 56 Ziele < 24 px; keine Gliederung in Muss/Kann. `{SHOTS}ux_fl_03__portal_flaechen_neu_390.png`
- Benennung uneinheitlich: Menü „Pachtverträge“, Doku „Pachtakte“.
- Positiv: Stepper mit Statustext, Pipeline-Erklärung, „Rückfrage stellen“ direkt am Angebot, Fristen und Jahresbescheinigungen in der Akte. `{SHOTS}ux_fl_04__portal_pachtvertraege_390.png`

### Weg 7 – Backoffice: Cockpit → Vorgänge → Projekt freigeben (Gelb)

- Cockpit-Erstbild (1440 px) = Tipp + Onboarding-Checkliste mit 8 Karten; Kennzahlen und „Zu erledigen“ erst unter der Falz. `{SHOTS}ux_adm_01__portal_admin_1440.png`
- Seitenleiste beginnt mit „Mein Portal“ (Meine Anfragen, Gemeinschaft gründen …), der Backoffice-Bereich liegt unterhalb des sichtbaren Bereichs.
- „Projekte in Prüfung“ ist als Kachel im Cockpit verlinkt (gut). Auf „Projekt-Freigabe“ stehen fehlende Pflichtangaben, fehlende Provisionsvereinbarung und Preis-Ausreißer **nur als Fließtext**, ohne Ampel und ohne Sperre des Knopfs „Veröffentlichen“. `src/app/portal/admin/projekte/page.js:52–56`
- „Alle Vorgänge“: gute Filter, Ansichten, Spaltenwahl, Massenauswahl. `{SHOTS}ux_adm_02__portal_admin_vorgaenge_1440.png`

### Weg 8 – Akquise-Karte & Kampagne (Gelb)

- Karte bleibt nach dem Laden grau, „Liste (0)“ – **kein Ladezustand, keine Leermeldung**. `{SHOTS}ux_adm_05__portal_admin_akquise_karte_1440.png`
- Regler-Füllung passt nicht zum Wert (Mindest-Score 0, Füllung bis zur Mitte).
- Ampel grün/gelb/rot auf der Karte nur über Farbe (WCAG 1.4.1); Suchfeld nur mit Platzhalter.
- Kampagne aus der aktuellen Liste: Mini-Formular inline (gut), aber ohne Vorschau der Empfänger und ohne Hinweis auf die Sperrliste; Sperrliste-Aufheben per `window.prompt`. `Akquise2/Sperrliste.js:62`
- `{SHOTS}ux_adm_06__portal_admin_akquise_kampagnen_1440.png`

### Weg 9 – Energiegemeinschaft: Mitglied-Dashboard + Beitritt (Gelb)

- **Übersicht zeigt Tarif und Teilnahmefaktor, aber nicht „So viel haben Sie gespart“** – genau die häufigste Mitgliederfrage (EG-MARKT 4.3). Der 6-teilige Balken unter dem Zählpunkt ist unbeschriftet. `{SHOTS}ux_eg_01__portal_eg_390.png`
- Gemeinschafts-Dashboard mobil: erledigte 5-Schritte-Liste füllt den ersten Bildschirm. `{SHOTS}ux_egm_01__portal_eg_EGG_26_K4MD9U_390.png`
- Beitritt: Versprechen „rund 5 Minuten · keine Kaution“ (sehr gut). Aber: Schrittleiste mobil abgeschnitten (4./5. Schritt unsichtbar), „0 Mitglieder“ als Vertrauenssignal kontraproduktiv, **Platzhalter mit voller Beispiel-Zählpunktnummer sieht wie ein vorausgefüllter Wert aus**, kein Zeichenzähler/Gruppierung für 33 Zeichen, IBAN ohne Live-Prüfung (obwohl `ibanPruefen` im KYC existiert), Fehler erst nach „Weiter“ als Sammelbanner, beim Schrittwechsel kein Fokus/Scroll nach oben. `{SHOTS}ux_egm_02__portal_eg_EGG_26_G79B3B_beitritt_390.png`, `src/components/Portal/EG/Mitglied/BeitrittAssistent.js:53–75,98–107,118,187`
- Erfolgsseite vorbildlich: Schrittfolge plus Anleitung für genau den eigenen Netzbetreiber.

### Weg 10 – EG-Kassier: Abrechnungslauf (Gelb)

- Weg zum Lauf: 4 Klicks über Karte → Dashboard → Verwaltung → Reiter. `{SHOTS}ux_kas_01__portal_eg_1440.png`
- Brotkrumen mit ID und abgeschnitten (Q8). Status-Chips „Angelegt · Vorschau · 1. Freigabe …“ sehen aus wie Knöpfe. „Verwerfen“ (rot) steht direkt neben „Vorschau berechnen“. `{SHOTS}ux_kas_01__portal_eg_EGG_26_K4MD9U_abrechnung_1440.png`
- **„Belege versenden“, „Abschließen“ und Zahlungslauf „Verwerfen“ wirken mit einem Klick, ohne Rückfrage mit Anzahl/Betrag**; „Freigeben“ ist bei Fehlern deaktiviert, die Begründung steht nur im `title` (auf Touch unsichtbar). `src/components/Portal/EG/Abrechnung/Aktionen.js:59–66,141–145`
- Positiv: Vier-Augen-Freigabe an Vorschau-Fingerabdruck, Prüfungen vor Freigabe, Kleinunternehmergrenze als Kennzahl.

### Weg 11 – Rechner Solarpark-Rendite (Grün)

- Mitlaufende Ergebniszeile mobil (`MobilKurz`) reagiert sofort auf Tastatur am Regler (gemessen: EK-IRR 5,0 → 5,1 %), Fokusring gut sichtbar. `{SHOTS}ux_sp_2_eingaben_390.png`
- Vollständiges Ergebnis bei 390 px erst bei y ≈ 3.716 px; 13 Regler ohne „Experten-Einstellungen“-Gruppierung.
- Kein Szenario speichern, teilen (URL), vergleichen oder in „Bewerten“/Anfrage übernehmen. Wertänderungen ohne visuelle Rückmeldung (Delta).

### Weg 12 – Leitungs-Cockpit (Gelb)

- „Worauf die Leitung heute schauen sollte“ ist hervorragend (verlinkte Handlungspunkte), Stand-Zeitstempel vorhanden. `{SHOTS}ux_adm_04__portal_admin_leitung_1440.png`
- Kennzahlen ohne Vergleich zu Vormonat/Ziel, ohne Trend; COD-Balken färbt „Ziel erreicht“ grün/navy ohne Legende und ohne Ziellinie. `src/app/portal/admin/leitung/page.js:22–41,89–97`
- Monatswahl neben „Management-Bericht PDF“ – unklar, ob die Wahl die Seite oder nur das PDF betrifft.

---

## (b) Maßnahmen

Teams: T1 Website/Landingpages · T2 Rechner · T3 Portal-Rahmen/Navigation/Dashboards · T4 Datenvisualisierung · T5 Formulare/Assistenten/Onboarding/Login · T6 Energiegemeinschaften · T7 Illustration/Grafik

### P0 – sofort (falsches Ergebnis, Blocker, Rechts-/Vertrauensrisiko)

| ID | Problem | Lösung (Datei · Soll-Verhalten · Microcopy) | Team |
|---|---|---|---|
| P0-1 | Zahlenfeld Flächengröße verfälscht Eingaben (25 → 0,125 ha) | `Flaeche/FlaechenWizard.js:173–181`: Rohtext als eigener State; beim Tippen nicht klemmen, erst `onBlur` auf 0,1–2.000 begrenzen; Komma akzeptieren (`"25,5"`). Regler über 150 ha als „150+ ha“ beschriften. Fehlertext bei leerem Feld: „Bitte geben Sie die Fläche in Hektar an, z. B. 12,5.“ Regressionstest in eigener Testdatei. | T5 (T2 prüft) |
| P0-2 | Entwickler-Hinweise für Endkunden sichtbar | Verifizierung: Hinweis „Entwicklungsbetrieb … PLATTFORM_KYC_SCHLUESSEL“ nur für Backoffice rendern (`/portal/verifizierung` bzw. KYC-Komponenten). Regel: Konfigurationshinweise nie für externe Rollen. | T5 |
| P0-3 | Destruktive Einklick-Aktionen in der EG-Abrechnung | `EG/Abrechnung/Aktionen.js`: „Belege versenden“, „Abschließen“, Zahlungslauf „Verwerfen“ über Bestätigungsdialog mit Inhalt: „31 Belege an 25 Mitglieder versenden? Gesamt 1.234,56 €. Das lässt sich nicht rückgängig machen.“ Knöpfe „Ja, versenden“ / „Abbrechen“. Gefahr-Knöpfe räumlich vom Primärknopf trennen. | T6 |
| P0-4 | Pachtangebot-Annahme ohne Zusammenfassung | `StatusAktionen.js` + `Flaeche/Fachanzeige.js` (`Angebotsbogen`): bei Übergang `pachtangebot → vertrag` Prüfschritt mit Eckdaten (Pacht €/ha und €/Jahr, Laufzeit, Indexierung, Rückbausicherheit, Dienstbarkeit) und Checkbox „Ich habe das Angebot geprüft.“ Knopf „Pachtangebot verbindlich annehmen“. Erfolg: „Angebot angenommen. Als Nächstes erhalten Sie den Vertragsentwurf zur Unterschrift im Portal – in der Regel innerhalb von 10 Werktagen.“ | T5 |
| P0-5 | Kontrast Text/Feldrahmen unter WCAG AA | Tokens nicht ändern, Verwendung ändern: Fließ-/Hilfstext nie `text-ink-400` (→ `text-ink-500`); weiße Schrift nur auf `ov-600`+ (nicht `ov-500`); Feldrahmen `ring-ink-300` + `bg-sand-50`-Feld oder 1,5-px-Rahmen `ink-400`. Zentral in `Portal/felder.js` (`eingabe`) und `AnfrageFormular.js` (`feld`), dann Suchen/Ersetzen der 190 + 56 Stellen. | T3 (T5 Felder) |
| P0-6 | Mobil liegt der Hauptschritt NDA/LOI unter dem Inhalt | `portal/boerse/[id]/page.js`: auf `< lg` eine Aktionskarte direkt unter dem Seitenkopf („Datenraum anfragen“ bzw. Status „NDA wird geprüft“ bzw. „LOI abgeben“) mit Sprung zur Karte; alternativ `order-first` für die Aktionsspalte mobil. | T3 |

### P1 – nächster Sprint (Reibung, Abbruchrisiko, Barrierefreiheit)

| ID | Problem | Lösung | Team |
|---|---|---|---|
| P1-1 | `confirm()`/`prompt()` an 64 Stellen | Eine Komponente `Portal/Bedienung/Rueckfrage.js` (nativer `<dialog>`, Fokusfalle, Esc, Titel, Kontextzeilen, Pflicht-Begründungsfeld mit Mindestlänge, Gefahr-Variante). Schrittweise ersetzen, zuerst Zuschlag, Gebot zurückziehen, Storno, Abbruch Gründung. Microcopy-Muster: Titel als Frage („Zuschlag an Bieter B erteilen?“), Folge in einem Satz, Knopf mit Verb („Zuschlag erteilen“). | T5 |
| P1-2 | Fehler nicht verknüpft, uneinheitliche Fehlerdarstellung | `Portal/felder.js` `Feld`: per `cloneElement` `aria-describedby` (Hinweis/Fehler) und `aria-invalid` am Kind setzen; Fehler inline rot mit Icon. Lokale `Feld`-Kopien (`BeitrittAssistent.js:305` u. a.) auf `Feld` umstellen. Öffentliches `AnfrageFormular` mit `noValidate` und eigener Inline-Validierung beim Verlassen des Feldes; Fokus auf erstes fehlerhaftes Feld; Fehlerzusammenfassung oben mit Sprungankern. Texte: „Bitte geben Sie Ihre E-Mail-Adresse an, z. B. name@firma.de.“ | T5 |
| P1-3 | Nächste Aktion fehlt auf Übersichten | `portal/page.js` (Rollen-Dashboard) und `portal/admin/page.js`: oberste Karte „Als Nächstes“ aus offenen Status (Pachtangebot, NDA-Freigabe, LOI, Unterschrift, KYC-Nachforderung) mit einem Primärknopf, z. B. „Ihr Pachtangebot für ‚Acker am Mühlweg‘ liegt vor – jetzt prüfen“. Onboarding-Checkliste darunter und nach 3 Besuchen einklappen. | T3 |
| P1-4 | Tipp-Banner verdrängen Inhalte | `TourHinweis`: nur beim ersten Besuch je Bereich, mobil als einzeiliger Chip „Tipp“ neben dem Seitentitel (aufklappbar), Kontext je Route prüfen (Akquise-Karte eigener Text). | T3 |
| P1-5 | Benachrichtigungs-Überlast | Glocke trennt „Handeln“ (rot, zählt) von „Info“ (zählt nicht); Badge ab 9 als „9+“; Sammelaktion „Alle Infos als gelesen“; Backoffice-Digest statt Einzelmeldungen. | T3 |
| P1-6 | Orientierung mobil / Brotkrumen | `PortalRahmen.js:361`: mobil eine Zurück-Zeile „‹ Energiegemeinschaft“ unter der Kopfzeile; Desktop-Brotkrumen mit Objektnamen statt IDs (Seiten liefern `titel` an den Rahmen), mittlere Ebenen bei Platzmangel als „…“-Menü statt Abschneiden. Schrittleisten (KYC, Beitritt, Flächencheck) mobil zusätzlich als Text „Schritt 3 von 7 · Ausweis“. | T3 (T5/T6) |
| P1-7 | Registrierung mit vorgewählter Rolle | `RegistrierFormular.js`: bei `rolleStart` Rollen als Zeile „Sie registrieren sich als: Flächeneigentümer · ändern“; Felder sofort sichtbar. Name/E-Mail aus der Anfrage übernehmen (Erfolgsseite `AnfrageFormular` übergibt `email`, `vorname`, `nachname`). Passwort: Hinweis erst nach Verlassen des Feldes als Fehler, Stärke als Text „Stärke: gut“. | T5 |
| P1-8 | Doppelerfassung Flächencheck → Fläche | Onboarding-Pfad Fläche: Schritt „Flächencheck übernehmen“ vor „Fläche anlegen“; vorhandene Anfrage (`quelle: flaechencheck`) legt per Knopf „Aus Flächencheck übernehmen (12 ha Acker, Unterallgäu)“ den Flächen-Entwurf an. `lib/plattform/onboarding/pfade/flaeche.js` | T5 |
| P1-9 | EG-Beitritt: Feldhilfen | `BeitrittAssistent.js`: Zählpunkt mit Zähler „17/33“, Gruppierung in der Anzeige, Präfix „AT“ fest, Platzhalter nur „AT00…“; IBAN-Live-Prüfung mit `ibanPruefen` und Bankname; Fehler je Feld inline; nach „Weiter“ Fokus auf Schritttitel; „0 Mitglieder“ ersetzen durch „Neu in Gründung – Sie gehören zu den Ersten“. | T6 (T5) |
| P1-10 | EG-Übersicht ohne Ersparnis | Mitglied-Karte und Dashboard: Kennzahl „Ersparnis seit Beitritt: 84,20 €“ plus „letzter Monat“; Prozessbalken beschriften („Aktiv seit 18.08.2025“) und erledigte Schrittliste einklappen. | T6 (T4) |
| P1-11 | Kassier-Weg zu tief | Direkter Menüpunkt bzw. Kachel „Abrechnung“ für Konten mit Organ-Rolle; Status-Chips als nicht klickbare Stepper-Optik (`Stepper` aus `Portal/ui`); deaktivierte Knöpfe mit sichtbarem Grund darunter („Freigabe gesperrt: 2 Prüfungen offen – ansehen“). | T6 (T3) |
| P1-12 | Akquise-Karte ohne Ladezustand | `Geodaten/AkquiseKarte.js`: Skeleton/„Kandidaten werden geladen …“, Leermeldung „Keine Kandidaten im Ausschnitt – Filter lockern oder Karte verschieben“; Reglerfüllung über `--wert` korrekt setzen; Ampel zusätzlich mit Form/Muster (Kreis/Dreieck/Quadrat) und Legende. | T4 |
| P1-13 | Projekt-Freigabe-Prüfliste nur Text | `portal/admin/projekte/page.js`: Checkliste mit Ampel je Punkt (Pflichtangaben, Provision, Dokumente, Preisplausibilität); „Veröffentlichen“ sperren, solange Pflicht offen, mit sichtbarem Grund. | T3 |
| P1-14 | LOI ohne Prüfschritt | `Fach/LoiFormular.js`: Beträge mit Tausendertrennung beim Verlassen formatieren, Live-Umrechnung €/kWp ↔ Gesamt; vor Absenden Zusammenfassung „Ihre Absichtserklärung: 7,2 Mio. € (900 €/kWp), Share Deal, 8 Wochen Exklusivität, gültig bis 15.11.2026“ mit „Ändern“ / „Verbindlich abgeben“. | T5 |
| P1-15 | Flächencheck-Eingaben gehen verloren | `FlaechenWizard.js`: Zustand in `sessionStorage` (try/catch), Hinweis „Ihre Angaben bleiben auf diesem Gerät, bis Sie neu starten“. Fortschritt mobil mit Schrittname. „Weiter“ deaktiviert → Hinweis darunter „Bitte wählen Sie die Nutzung.“ | T5 |
| P1-16 | Admin-Seitenleiste | Für Backoffice-Konten Backoffice-Gruppe zuerst, „Mein Portal“ einklappbar unten. `PortalRahmen.js` | T3 |
| P1-17 | KYC-Live-Region | `MrzEingabe.js:178`: `aria-live` vom Zähler entfernen, nur Ergebnis „Zeile 2 vollständig, Prüfziffer korrekt“ ankündigen; Prüfziffern je Zeile sofort prüfen. | T5 |

### P2 – Feinschliff und Differenzierung

| ID | Problem | Lösung | Team |
|---|---|---|---|
| P2-1 | Formular-Bausteine mehrfach | Ein Satz `Feld`, `Eingabe`, `Auswahl`, `Knopf` in `components/Portal/felder.js` bzw. `components/ui`; Lint-Regel/Review-Checkliste gegen lokale Kopien. | T5 |
| P2-2 | Kleine Ziele < 24 px | Info-Icons, Chips und Tabellen-Aktionen auf min. 24 × 24 px Trefferfläche (`p-1` + `-m-1`), mobil 44 px. | T3 |
| P2-3 | Exposé-Kopf mit 6 Aktionen | Primär „Deal-Room öffnen“, Rest in „Weitere Aktionen ▾“; eigene Icons für Bewerten (`Calculator`) und Finanzierung (`Landmark`). | T3 |
| P2-4 | 2FA-Feinschliff | Kopierknopf für Schlüssel, Gate „Ich habe die Codes sicher gespeichert“, Auto-Absenden bei 6 Ziffern, Pfeiltasten in Login-Tabs. | T5 |
| P2-5 | Leitungs-Cockpit ohne Vergleich | Kennzahl-Karten mit Delta zum Vormonat und Sparkline, COD-Balken mit Ziellinie und Legende; Monatswahl beschriften („Bericht für“). | T4 |
| P2-6 | Rechner ohne Weitergabe | Szenario in URL kodieren („Link kopieren“), „Szenario merken“ (localStorage), „In Projektbewertung übernehmen“, „Ergebnis an Investment-Team senden“ (AnfrageFormular `typ="investor"` mit `daten`). Fortgeschrittene Regler in „Finanzierung & Betrieb (Experten)“ einklappen. | T2 |
| P2-7 | Startseite sehr lang (21.600 px mobil) | Abschnitte priorisieren, mobil Sprungnavigation „Für Eigentümer · Investoren · Gemeinden“. | T1 |
| P2-8 | Leere/Wartezustände ohne Bild | Illustrationen für Wartezustände (NDA in Prüfung, Netzbetreiber-Zustimmung, leere Karte, Erfolg Beitritt) im Markenstil. | T7 |
| P2-9 | Seitentitel uneinheitlich | Dashboard-Titel „Übersicht | Portal ÖkoInvest“ wie alle anderen. | T3 |
| P2-10 | Testdaten im Demo | Testkonten/-objekte anderer Teams („Test mup…“) im Demo-Betrieb ausblenden oder nach Testlauf aufräumen. | T3 (Koordination) |

---

## (c) 10 Wow-Momente

1. **Live-Ampel beim Tippen (Flächencheck):** Ab Schritt 2 läuft oben ein Mini-Tacho mit, der sich bei jeder Auswahl bewegt („+8 Punkte: Randstreifen an der A 96“). Der Nutzer sieht, *warum* sich der Wert ändert, statt erst am Ende eine Blackbox zu bekommen. (T5, T4)
2. **Flurstück auf der Karte antippen statt Hektar schätzen:** Im Flächencheck eine Karte, auf der man die Fläche umfährt; Größe, Region und Netzentfernung zum nächsten Umspannwerk werden automatisch gesetzt (nutzt die vorhandene Geodaten-Logik). (T5, T4)
3. **Pacht-Uhr:** Im Ergebnis und im Pachtangebot zählt eine Zahl hoch: „Über 30 Jahre: 612.000 € – das sind 56 € pro Tag“, mit sanfter Count-up-Animation (`CountUp`, `prefers-reduced-motion` beachten). (T4)
4. **Erfolgs-Choreografie nach Meilensteinen:** Nach NDA-Freigabe, Pachtannahme oder EG-Beitritt ein ruhiger, markengerechter Moment: Häkchen zeichnet sich, Stepper rückt sichtbar vor, darunter genau eine nächste Aktion („Datenraum öffnen“). Kein Konfetti, sondern „Fortschritt fühlt sich echt an“. (T7, T3)
5. **Ersparnis-Zähler in der Energiegemeinschaft:** Auf dem Mitglied-Dashboard „Heute bisher 1,84 € gespart – 62 % Ihres Stroms kamen aus der Gemeinschaft“, aktualisiert mit den Viertelstundenwerten, plus „Morgen 11–15 Uhr viel Sonnenstrom – jetzt Waschmaschine planen“. Beantwortet die häufigste Mitgliederfrage, bevor sie gestellt wird. (T6, T4)
6. **Netzbetreiber-Countdown mit Erinnerung:** Nach dem Beitritt ein Fortschrittsring „Zustimmung beim Netzbetreiber: noch 7 von 10 Werktagen“ mit Ein-Klick-Erinnerung per E-Mail/Kalender und Schritt-für-Schritt-Bildern genau für *diesen* Netzbetreiber. Adressiert Schmerzpunkt Nr. 1 des Markts. (T6, T7)
7. **Sofortige Validierung mit Erklärung:** IBAN zeigt beim Tippen den Banknamen („Raiffeisenbank Innviertel ✓“), Zählpunkt prüft Länge und Netzbetreiber-Präfix („Netz Oberösterreich erkannt“), MRZ meldet je Zeile „Prüfziffer korrekt“. Das Formular fühlt sich an, als würde es mitdenken. (T5, T6)
8. **Rechner mit Delta-Feedback und Szenario-Vergleich:** Jede Reglerbewegung lässt die betroffene Kennzahl kurz aufleuchten („EK-IRR +0,3 %-Pkt.“); „Szenario A/B“ nebeneinander, als Link teilbar und mit einem Klick ins Bewertungswerkzeug eines Exposés übernehmbar. (T2, T4)
9. **„Als Nächstes“-Karte, die die Plattform erklärt:** Jede Startseite beginnt mit genau einer Aufgabe, einer realistischen Dauer und dem Wer („ÖkoInvest prüft Ihre NDA – üblich 2 Werktage, Sie werden per E-Mail informiert“). Dazu eine Zeitleiste mit erledigten und kommenden Schritten. Transparenz als Produktmerkmal. (T3)
10. **Kassier-Abrechnung als geführter Ablauf mit Vorschau-Diff:** „Vorschau berechnen“ zeigt die Änderung gegenüber dem Vormonat je Mitglied („3 Mitglieder +12 % – Grund: neuer Zählpunkt“), dann Vier-Augen-Freigabe mit Bestätigungsdialog und am Ende „31 Belege versendet, Lastschrift am 05.11. – alles erledigt für Oktober“. Macht aus der gefürchtetsten Ehrenamtsaufgabe eine 5-Minuten-Routine. (T6, T4)

---

## Anhang: Messwerte (Playwright, Viewport-Aufnahmen)

| Seite | Breite | Status | Seitenhöhe | Ziele < 24 px | Felder ohne Label | Hinweis |
|---|---|---|---|---|---|---|
| `/` | 390 / 1440 | 200 | 21.600 / 12.219 | 3 / 4 | 0 | |
| `/flaechencheck` | 390 | 200 | 8.313 | 6 | 0 | Assistent ab y ≈ 600; 9 Klicks bis Ergebnis |
| `/rechner/solarpark` | 390 | 200 | 14.821 | 22 | 0 | 13 Regler; Ergebnis bei y ≈ 3.716 |
| `/login` | 390 | 200 | 5.176 | 4 | 0 | Cookie-Banner verdeckt Formular |
| `/registrieren?rolle=investor` | 390 | 200 | 5.839 | 13 | 0 | |
| `/portal/boerse` | 390 | 200 | 8.048 | 4 | 0 | |
| `/portal/boerse/P-26-GVUVTQ` | 390 | 200 | 2.201 | 8 | 0 | Testprojekt eines anderen Teams |
| `/portal/verifizierung` | 390 | 200 | 3.854 | 7 | 0 | scrollWidth 1.038 (kaschiert) |
| `/portal/sicherheit` | 390 | 200 | 7.347 | 4 | 0 | |
| `/portal` (flaeche) | 390 | 200 | 3.939 | 12 | 0 | |
| `/portal/flaechen/neu` | 390 | 200 | 3.370 | 56 | 0 | 27 Felder |
| `/portal/pachtvertraege` | 390 | 200 | 6.827 | 10 | 0 | |
| `/portal/willkommen` | 390 | 200 | 1.580 | 5 | 0 | |
| `/portal/admin` | 1440 | 200 | 3.348 | 12 | 0 | |
| `/portal/admin/vorgaenge` | 1440 | 200 | 2.907 | 62 | 0 | |
| `/portal/admin/projekte` | 1440 | 200 | 3.658 | 31 | 0 | |
| `/portal/admin/leitung` | 1440 | 200 | 2.067 | 10 | 0 | Ladezeit 65 s (Dev) |
| `/portal/admin/akquise/karte` | 1440 | 200 | 1.180 | 13 | 0 | Karte grau, Liste (0) |
| `/portal/eg` (mitglied / kassier) | 390 / 1440 | 200 | 1.086 / 900 | 4 | 0 | |
| `/portal/eg/EGG-26-K4MD9U` | 390 | 200 | 5.159 | 8 | 0 | |
| `/portal/eg/EGG-26-G79B3B/beitritt` | 390 | 200 | 1.426 | 5 | 0 | |
| `/portal/eg/EGG-26-K4MD9U/abrechnung` | 1440 | 200 | 1.424 | 5 | 0 | |

Kontrastwerte (WCAG-Formel, gerechnet): ink-400/Weiß 2,63 · ink-500/Weiß 4,70 · Weiß/ov-500 3,40 · Weiß/ov-600 4,56 · ov-700/ov-50 6,21 · ink-200-Rahmen/Weiß 1,29 · ink-500 auf ink-200 (deaktivierter Knopf) 3,65.

---

## Nachtrag 11.10.2026 – Plattform-Armee, Paket UIUX

Viele Befunde dieses Audits sind inzwischen behoben (Kontrast-Token ink-400/500 in `globals.css`, `Feld` verknüpft Hinweis/Fehler per `aria-describedby`/`aria-invalid`, keine `confirm()`/`prompt()`-Dialoge mehr im Portal, Entwicklungshinweis der Verifizierung nur noch fürs Backoffice, Glocke mit ruhigem Zähler, Rollen-Dashboards mit „Als Nächstes“-Karte, zentrales `loading.js` und Leerzustände).

**Neu: Portal-Barrierefreiheits-Gate** `npm run qa:axe-portal` (`qa/axe-portal.mjs`): axe (WCAG 2.0/2.1/2.2 A+AA) auf den Kernseiten **aller 10 Rollen mit Demo-Login**, 1440 px und 390 px, plus Strukturprüfung (genau eine h1, `main`-Landmark, kein horizontaler Überlauf). Ratsche gegen `qa/axe-portal-baseline.json`, Screenshots je Prüfung per `--shots`.

Im Erstlauf gefunden und behoben (alle übrigen 70+ Prüfungen waren ohne Verstoß):
- Terminbuchung `SlotAuswahl.js`: Lade-Dimmung `opacity-50` drückte Tagesbeschriftungen auf ~2,5:1 → Dimmung entfernt (Spinner + `aria-busy` + Klicksperre zeigen den Ladezustand). Die Baseline `qa/axe-portal-baseline.json` ist damit **leer** (0 Altlasten über alle 75 Prüfungen).
- Lead-Desk `Leads/Anzeige.js` und Deal-Room `Dealroom/Countdown.js`: Deckkraft-Abstufungen (`opacity-80`/`opacity-70`) unter 4,5:1 → entfernt.
- Scrollbare Tabellen ohne Tastaturzugriff (axe `scrollable-region-focusable`): `Portal/ui.js` (`Tabelle`), `Energie/teile.js`, Dealroom-Bietertabelle, Zugriffsprotokoll, EDA-Aktionen, Anlagen-Detail, Rechte-Matrix → `tabIndex` + `role="region"` + sichtbarer Fokusring.
- Vier Tablisten ohne Pfeiltasten-Bedienung (WAI-ARIA-Tabs) → gemeinsamer Helfer `Portal/Bedienung/tabTasten.js`, verdrahtet in Buchhaltung-Werkzeuge, EG-Verein, Entwicklungs-Portfolio, Akquise-Karte.

Prüfer-Nachtrag (gleicher Tag): Gate um drei gefixte, aber bisher ungeprüfte Admin-Seiten erweitert (`/portal/admin/rechte`, `/portal/admin/finanzen/buchhaltung`, `/portal/admin/akquise/karte`, jetzt 78 Baseline-Schlüssel). Dabei gefunden und behoben: Karten-Attributionslinks (basemap.at/BKG/OSM) waren nur farblich vom Text unterscheidbar (axe `link-in-text-block`, WCAG 1.4.1) → unterstrichen (`Geodaten/AkquiseKarte.js`). Danach 0 Verstöße.
