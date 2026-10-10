# MASTERPLAN ÖkoInvest DACH

Strategie-Rat, finale Fassung vom 03.10.2026. Sie ist nach der Red-Team-Prüfung überarbeitet.

**Grundlage:**
- 13 Teamberichte
- 6 Unicorn-Experten
- 11 Experten für Finanzen und Recht
- 24 Wettbewerbsanalysen
- 5 Verstärkungsrunden mit 96 Experten
- Red-Team-Prüfung

**Status:** Entwurf zur Entscheidung durch den Inhaber. Im Code wurde nichts geändert, diese Datei ist das einzige neue Dokument.

**Stichproben im Code (03.10.2026 nachgeprüft):**

| Befund | Stelle |
|---|---|
| Telefon, E-Mail und UID fehlen | `KONTAKT.telefon/email = null`, `uid: null` |
| Fremde Domain als Standard | `site.js:18` mit Fallback `https://www.oekoinvest.com` |
| Version passt nicht zum Changelog | `package.json` 0.1.0, CHANGELOG 0.4.0 |
| Keine Testinfrastruktur | kein `test/`, `qa/`, `.github/`, keine `.env` |
| KI-Crawler gesperrt | `robots.js:30` sperrt GPTBot, CCBot, Bytespider, Google-Extended, Meta-ExternalAgent, cohere-ai |
| JSON-LD verstreut | 45 Dateien mit `application/ld+json` |
| Altcode ohne Verwendung | `hreflang.js` und `baseUrl.js` werden nirgends importiert |
| Arbeitsdatei im Projekt | `armee-fortsetzung.tmp.js` liegt im Projekt, `.gitignore` hat kein `*.tmp.js` |

**Domain-Prüfung vom 03.10.2026:**
- `http://oekoinvest.com` liefert einen Parking-Server (Kestrel, 404 bzw. Weiterleitung zu HugeDomains).
- RDAP: registriert am 12.03.2012, läuft ab am 12.03.2027, zuletzt geändert am 13.03.2026.
- `https://oekoinvest.de` zeigt „zum Verkauf“.

---

## Wie das Red Team eingearbeitet wurde

| Kritik | Entscheidung des Rats |
|---|---|
| **K1 Domain gehört nicht dem Unternehmen** | **Übernommen.** Die Aussage „Glücksfall, keine Rankings“ ist gestrichen. Marke und Domain sind jetzt Blocker Nr. 1 (Welle 0). Ausnahme: Gehört die Domain doch der Gruppe, bitte belegen. Die Prüfung oben spricht dagegen. |
| **K2 Burggraben auf wechselndem Namen** | **Übernommen.** Bis zur Namensentscheidung gibt es keine Pressemeldung und keine Datensätze unter „ÖkoInvest“. Fristanlässe 2026 laufen über bestehende Gruppenkanäle. |
| **K3 Betrieb fehlt** | **Übernommen** als W0-4 „Betrieb“, mit Kostenzeile. |
| **K4 Welle 1 nicht machbar und widersprüchlich** | **Übernommen.** Welle 1 heißt jetzt „Eindämmung“. Die Rechtstexte sind ein eigener Strang mit eigenem Termin. Das Vier-Augen-Prinzip wird über eine benannte zweite Person gelöst (Entscheidung E6). |
| **K5 Zahlen ohne Sicherheitsnetz** | **Übernommen.** Charakterisierungstests (Paket F) kommen **vor** den Zahlenkorrekturen (Paket E). |
| **K6 Vollmigration verzögert Leads** | **Übernommen.** Präfixe ab Tag 1. Live gehen nur `/de` und `/at` mit fertigen Seiten, `/ch` zunächst nur mit Daten- und Werkzeugseiten. |
| **H1 Gruppenreichweite fehlt** | **Übernommen** als eigener Kanal (Abschnitt 7) und eigenes Paket in Welle 2. |
| **H2 Atlas DE ist ein Pflegegrab** | **Übernommen.** Zuerst kommt ein Rechnungs-Check mit den Zahlen des Nutzers. VNB-Preisblätter folgen später, nur für die größten Netzbetreiber. |
| **H3 AT-Daten ändern sich zum 01.01.2027** | **Übernommen.** Der AT-Atlas folgt erst nach der SNE-VO 2027. Der ElWG-Check weist die Netzbetreiber-Einschränkung bis ca. April 2027 aus. |
| **H4 CH-Atlas zuerst passt nicht zum Lead-Ziel** | **Übernommen.** Der CH-Atlas kommt nach den Lead-Werkzeugen. Die Lizenz wird am Original geprüft. |
| **H5 Telefon zu streng** | **Teilweise übernommen** (siehe Abschnitt 5). |
| **H6 Hash-Kette gegen Art. 17 DSGVO** | **Übernommen** als verbindliche Regel im Datenmodell von B3. |
| **H7 Build-Abbruch durch Datum** | **Übernommen**, mit Präzisierung (siehe B1). |
| **H8 KI-Crawler-Sperre widerspricht GEO** | **Übernommen.** Die Entscheidung fällt in Welle 0 (E5). |
| **H9 Kosten fehlen** | **Übernommen** als Budgetrahmen in Abschnitt 9. Alle Werte sind Schätzungen, Angebote müssen eingeholt werden. |
| **M1 Programmatisches SEO** | **Übernommen.** Eine Seite wird nur mit eigener Datenreihe und redaktioneller Freigabe indexiert. Die Schwelle 0,7 bleibt als technischer Vorfilter, ist aber kein Freigabekriterium. |
| **M2 Pacht-Barometer** | **Übernommen:** für 12 Monate gestrichen, Wiedervorlage im Monat 12. |
| **M3 PDF/UA zu viel** | **Übernommen.** Der Bericht ist zuerst eine barrierearme HTML-Seite mit Druck-CSS. Ein einfaches PDF mit Druckfunktion und Download ist möglich, wird aber nicht als „PDF/UA“ beworben. Hash und Verifikationsseite kommen später. |
| **M4 Entscheidungsflut** | **Übernommen.** Abschnitt 10 trennt 3 Sofort-Entscheidungen von späteren. |
| **M5 Zahlen im Plan** | **Übernommen.** Codemod-Umfang: ca. 800 statische `href` plus dynamische Links. Paket F hebt `package.json` auf 0.4.0 an. |
| **M6 Arbeitsdateien und Repo-Regeln** | **Übernommen** in W0-1. |

**Widersprochen bzw. präzisiert:**
- **H5:** Die „mutmaßliche Einwilligung“ im B2B-Bereich (§ 7 Abs. 2 Nr. 1 UWG) ist eng auszulegen und im Streitfall vom Anrufer zu beweisen. Der Rat nutzt sie **nicht** als Standard für Werbeanrufe. Übernommen wird: Wer ausdrücklich „Rückruf“ oder „Vor-Ort-Termin“ wählt, gibt das Telefon als Pflichtfeld an. Grundlage ist Art. 6 Abs. 1 lit. b, eine Einwilligung ist dafür nicht nötig. In AT gilt § 174 TKG unverändert streng.
- **H7:** Keine Build-Sperre. Ein abgelaufener Wert der Klasse A (Förderfrist, Umlage, Rechtslage) wird aber auf der Seite **nicht als aktuell ausgespielt**: Er erscheint mit dem Hinweis „Stand veraltet, wird geprüft“, und der Rechner zeigt einen Warnhinweis. So blockiert ein Datum keinen Sicherheitsfix, und es wird trotzdem keine falsche Zahl als aktuell gezeigt.
- **H4 und M2:** Der CH-Atlas bleibt im Plan, als günstige Daten- und Presse-Präsenz **nach** der Markenentscheidung, nicht als Lead-Kanal.

---

## 0. Die drei Sätze, die alles tragen

1. **Erst Name, Domain und Betrieb, dann ehrlich und korrekt, dann laut.**
   - Heute fehlt eine eigene Domain, und der Name kollidiert mit älteren Inhabern.
   - Die Website rechnet für AT und CH mit deutschem Recht und misst keine Conversion.
   - Sie weist AT- und CH-Postleitzahlen ab und hat Rechtstexte im Entwurf.
   - Hinter dem Formular läuft noch kein produktives Backend.
2. **Der Burggraben entsteht aus belegten Zahlen, die mit der Zeit wachsen:** Faktenregister mit Quelle und Stand, Rechenlogik je Land, Zeitreihen, eigene Parks, Partnernetz, und das alles unter einem Namen, der bleiben darf.
3. **Die Website ist das Werkzeug, mit dem Eigentümer, Gemeinden, Mittelstand und Investoren ihre eigene Zahl bekommen.** Das Ergebnis ist immer frei. Der ausführliche, belegte Bericht ist der ehrliche Tausch gegen Kontaktdaten. Hinter jedem Lead steht eine Person, die zurückruft.

---

## 1. Strategische Leitidee und Positionierung je Land

**Leitidee:** ÖkoInvest ist die **offene Kraftwerksentwicklung im DACH-Raum**.
- Jede Zahl hat Quelle, Stand und Rechenweg.
- Jedes Land hat sein eigenes Recht.
- Jede Rolle (Entwickler, Vermittler, Pächter) wird offengelegt.
- Aus Flächen werden Kraftwerke, wenn Eigentümer, Gemeinde, Kapital und Abnehmer dieselben Zahlen sehen.
- Der Gegner ist Black-Box-Projektierung: Lockpacht, verdeckte Provisionen, unklarer Projektstand.

Öffentlich gibt es **keine** Unicorn- oder Renditeerzählung (WpPG/VermAnlG, KMG/AltFG, FIDLEG). Die Investorenerzählung läuft bilateral.

**Marke:** „Offene Kraftwerksentwicklung“ ist ein Arbeitsbegriff. „ÖkoInvest“ ist **bis zur Markenentscheidung ein Arbeitsname**:
- Konflikt mit der ÖKO Invest GmbH (DE) und dem Öko-Invest-Verlag in Wien.
- Die Domains oekoinvest.com und .de sind in fremder Hand.
- „Fairpacht“ ist ausgeschlossen (NABU).

| Land | Positionierung | Kernprodukte | Ehrliche Einordnung |
|---|---|---|---|
| **DE** | „Der Entwickler, der rechnet und betreibt“: realistische Pacht statt Lockangebot, Speicherfläche, Kommunal-Einnahmen nach Landesrecht | Flächen- und Speicherflächen-Check, Pachtangebot-Zweitmeinung (mit Offenlegung), Kommunal-Rechner 2.0, Rechnungs-Check Gewerbestrom, Reststrom-Pool (nach Rollenklärung) | Größter Markt, stärkster Wettbewerb. Gewinnen über Werkzeuge, Daten und Gruppenreichweite |
| **AT** | „Gemeinschaftskraftwerk“: Projektentwicklung plus EG-Software nach ElWG aus einer Hand; Sitz in Oberösterreich | ElWG-Navigator, EG-Software mit öffentlichem Preis je Zählpunkt, Flächencheck mit Widmungslogik der 9 Länder, Gemeinde-Paket | Zeitfenster jetzt. Die ElWG-Regeln gelten seit 01.10.2026; die Netzbetreiber-Einschränkung läuft bis ca. April 2027. Gegenwind: viele EG-Anbieter, kostenlose Konkurrenz. Gewinnen über Service, eigene Erzeugung und Stadtwerke als White-Label |
| **CH** | „Infrastruktur- und LEG-Kraftwerk“: Carport, Dach, vorbelastete Flächen, alles in CHF | zunächst nur Daten- und Werkzeugseiten (Parzellen-Vorprüfung, Marktzugang-Check), später Gewerbestrom- und LEG-Atlas | Kleiner Markt, Belastung durch die Ökovolt Schweiz AG. Ziel ist Präsenz und Glaubwürdigkeit, nicht Leadvolumen. Keine CH-EG-Software, keine CHF-Pacht ohne Datenbasis |

---

## 2. Die Burggraben-Initiativen (neu priorisiert)

**B0 ist neu und kommt vor allem anderen.** B1–B3 bilden das Fundament.

| # | Initiative | Begründung (Burggraben) | Abhängig von | Aufwand | Messgröße |
|---|---|---|---|---|---|
| **B0** | **Marke, Domain, Betrieb**: Markenrecherche DE/AT/CH/EU, Domains sichern (oder neuer Name bzw. Gruppendomain), Hosting EU, Frappe produktiv, Mail-Versand, Backup, Monitoring | Ohne eigenen Namen und eigene Domain sammelt sich jeder Backlink, jedes Zitat und jeder Abonnent auf fremdem Grund | Inhaber | klein (Entscheidung) bis mittel (Betrieb) | Domain im Besitz; Marke angemeldet; Staging und Produktion mit Backup und Monitoring |
| **B1** | **Faktenregister und Länder-Engine**: `src/lib/fakten` mit `{wert, einheit, land, quelle, abruf, gueltigBis, status, pruefer, klasse}`; `marktFuer(land)`; `markt.js` bleibt Fassade (Strangler-Muster); CHF für CH; Erlösmodelle je Land | Rechenlogik für drei Rechtsordnungen ist die Grundlage für Bericht, Werkzeuge und KI-Sichtbarkeit | B0 (Name egal, aber Betrieb), Rechtsprüfer | groß (Kern 15–20 PT, danach laufend) | 0 Werte ohne Quelle/Stand; abgelaufene Klasse-A-Werte nie als aktuell gezeigt (Build-Warnung, Seitenhinweis); Abweichung Rechner zu Regionsseite unter 3 % |
| **B2** | **Prüf-Gate `npm run verify`**: **zuerst Charakterisierungstests** (heutige Ausgaben aller Rechner), dann Golden-Vektoren je Land, die 13 vorhandenen `selbsttest()`, Claim-Lint, axe, Funnel-E2E mit abgefangenen POSTs | Jede Zahlenänderung bekommt einen Vorher-Nachher-Nachweis. Schutz vor Rückfällen bei vielen Agenten | Git-Sicherung | mittel (3–5 PT) | Gate grün vor jedem Merge; jede Abweichung im PR begründet |
| **B3** | **Lead-Kette mit Einwilligungsprotokoll**, Länder-Routing, SLA, Lead-Score. **Datenmodell:** Die append-only-Hash-Kette enthält nur Pseudonyme und Hashes. Personendaten (Name, Mail, Telefon, IP) liegen in einer getrennten, löschbaren Tabelle (Art. 17 DSGVO) | Schnelle, rechtssichere Reaktion | B0 (Frappe produktiv), Vertriebskapazität | mittel | Median und P90 bis Erstkontakt; 100 % Leads mit Land und zuständiger Person |
| **B4** | **Bericht-Baustein**, gestuft: Server rechnet neu (`/api/rechner/bericht`), Link per Double-Opt-in-Mail auf eine barrierearme HTML-Berichtsseite mit Druck-CSS und Annahmenbuch. Später ein PDF mit Prüf-ID und Hash | Fachrechner mit belegtem Rechenweg statt Kontaktformular | B1 (Teil), B2, B3 | mittel (Stufe 1 klein) | Berichte je 100 Ergebnisse (Ziel 8–15 %), DOI-Quote, Bericht → Erstgespräch |
| **B5** | **Gewerbestrom-Werkzeuge**, umgestellt auf diese Reihenfolge: (1) **Rechnungs-Check DE** mit den eigenen Zahlen des Nutzers plus amtlichen Umlagen und Steuern, Lastgang lokal im Browser; (2) Netzentgelte nur für die größten VNB; (3) AT nach SNE-VO 2027; (4) CH-Atlas als Daten-PR | Ehrliche Antwort statt Schätzvergleich. Die Zeitreihe wächst trotzdem | B1, Reststrom-Rolle geklärt | Rechnungs-Check 5–8 PT; Rest gestuft | Check → Bericht → Lead; „marktgerecht“-Quote offen ausgewiesen |
| **B6** | **Geo-Plattform „Flächenpass“**: Fläche einzeichnen, Restriktionen je Land, Speicherflächen-Check, AT-Widmungslogik, CH-Parzelle; der vorhandene `scoring.js` wird öffentlich | Die Scoring-Engine existiert intern, öffentlich hat das im DACH-Raum niemand | B1, PVGIS-Proxy | mittel bis groß, gestuft | Leads mit Geometrie und ha; Anteil A-Leads |
| **B7** | **AT-Speerspitze EG-Software und ElWG**: öffentliches Preisblatt, Wechsel-Check mit ehrlichem Hinweis zur Netzbetreiber-Einschränkung bis ca. April 2027, White-Label für Stadtwerke, Eintrag im Dienstleisterverzeichnis | Einziges Software-Geschäft mit SaaS-Kennzahlen | EDA-Produktivbetrieb, B0 | mittel | Zählpunkte, ARR, Abwanderung |
| **B8** | **Gemeinde-Werkzeuge**: Kommunal-Rechner 2.0 mit Landespflichten, Ratsvorlage (HTML/Druck), AT-Widmungskit | Gemeinden sind der Engpass bei der Genehmigung | B1 | mittel | Gemeinde-Leads je Land |
| **B9** | **Datenzentrum `/marktdaten`**: Ausschreibungs-Monitor DE/AT/CH, CSV/JSON unter CC BY. **Pacht-Barometer für 12 Monate gestrichen** | Backlinks, KI-Zitate, Newsletter-Anlass | B0 (Name!), B1 | mittel | Zitate, Backlinks, Downloads |
| **B10** | **Neutrale Projektbörse**: Badges, Informationsbarriere, ehrlicher Bestand ohne Testdaten; „keine Börse im Sinne von BörsG/BörseG/FinfraG“ | Fremdentwickler stellen nur mit Neutralität ein | B3, Rechtsgutachten je Land | mittel | Anteil Fremdinserate, Tage bis zur ersten NDA |
| **B11** | **Echtheit, Gruppe und Partner**: eigene Bildwelt und Parkdaten, benannte Fachprüfer, **Gruppenreichweite** (ÖKOVOLT-Websites, Bestandskunden, Installateurnetz, offengelegt), Kammern, Maschinenringe, Stadtwerke | Bestandsparks, Gruppe und Partnerschaften lassen sich nicht kaufen | Kontaktdaten, Rechteregister, Abstimmung in der Gruppe | mittel, laufend | Leads je Gruppen- und Partnerkanal mit Kennung |

**Später (Welle 4 und danach):**
- Netzanschluss 2.0
- Gebäudestrom
- Parkplatz-Hub
- Lastgang-Röntgen (falls nicht schon in B5)
- Agri-PV-Lichtlabor
- Rückbau-Rechner
- Gläserner Solarpark
- Fakten-Assistent (RAG): erst nach B1, mit EU-Inferenz und PII-Schwärzung; die KI rechnet nie selbst.

---

## 3. Sofort zu behebende Fehler im Bestand

Die Liste aus dem Entwurf bleibt fachlich bestehen. Das Red Team hat die Kernbefunde bestätigt (M7). Neu ist **S-Minus**: Diese Fehler blockieren alles andere.

### S-Minus: Fundament (vor jeder Veröffentlichung)
- **Domain und Marke:**
  - `site.js:18` fällt auf die fremde Domain `www.oekoinvest.com` zurück.
  - Canonical, Sitemap, Schema und `sameAs` würden auf eine Parkingseite zeigen.
  - Bis zur Entscheidung `NEXT_PUBLIC_SITE_URL` in jeder Umgebung zwingend setzen. Ohne den Wert soll der Build abbrechen; das ist die einzige erlaubte Build-Sperre dieser Art.
- **Kein produktives Backend:**
  - Ohne `PLATTFORM_BACKEND=frappe` landen Anfragen im Demo-Backend (`backend/index.js:59`).
  - `Backend-Import/GO-LIVE.md` ist offen.
- **Nicht öffentlich schalten**, solange S0 offen ist: Staging nur hinter Basic-Auth bzw. noindex, auf Hosting-Ebene und nicht über den Middleware-Matcher.

### S0: Recht, Datenschutz, Sicherheit
1. **Token-Leck an Google:** `GoogleAnalytics.js:20` schließt /einladung, /portal und /login/link nicht aus. Ersetzen durch eine Positivliste. `herkunft.js` speichert Codes im Klartext.
2. **Cookie-Banner:** „Weiter ohne Einwilligung“ ruft `handleAcceptSelected` auf (`cookiecomponent.js:301–304`). Außerdem: Maps-Kategorie ohne Dienst, keine Version und kein Zeitstempel, falsche Behauptung zur Formularzählung.
3. **Pflicht-„Einwilligung“** für eine Verarbeitung nach lit. b in Anfrageformularen. Ersetzen durch einen Hinweis plus optionale, getrennte Häkchen.
4. **Impressum:** Telefon, E-Mail und UID sind null; `mailto:null`; der Bildtext „Firmensitz“ ist falsch.
5. **Datenschutzerklärung:**
   - Platzhalter offen.
   - § 25 TDDDG und revDSG fehlen.
   - Die Angaben zum KI-Dienst sind falsch.
   - **KI-Triage bis zur Klärung abschalten oder schwärzen.**
6. **Nutzungsbedingungen:**
   - Sie stehen auf ENTWURF, sind aber indexiert und werden verbindlich akzeptiert.
   - Fassung und Zeitpunkt werden nicht gespeichert.
   - § 20 und § 16 Abs. 3 sind unwirksam.
7. **Gespeichertes XSS** über JSON-LD ohne `<`-Escaping (45 Dateien). Lösung: eine zentrale `JsonLd`-Komponente.
8. **Weitere Sicherheitsfehler:**
   - `ipAdresse.js:8` übernimmt X-Forwarded-For[0].
   - `rechte.js:5` vergibt standardmäßig „leitung“.
   - Demo-Guard fehlt.
   - Keine CSP und kein HSTS.
   - `energy.js` ruft ohne Timeout ab.
   - Open Redirect ist plausibel.
9. **GwG-Meldung:** `nutzerId` steht im allgemeinen Protokoll, dazu ein Tipping-off-Risiko.
10. **§ 6 EEG falsch dargestellt:** Bei Freiflächen gilt die Vereinbarung erst nach dem Beschluss des Bebauungsplans. Dazu fehlen Bundesländer in der Tabelle.

### S0: Irreführung (§ 5/§ 5a UWG, EmpCo)
11. Testprojekte sind live; „Live · 13 Projekte“; JSON-LD mit Offer und InStock.
12. Claims wie „garantiert“, „immer der günstigste“, „Pionier“, „geprüfte Projekte“, „3 Länder“ u. a.
13. Umweltaussagen ohne Beleg; CO₂-Faktor 0,65 für alle Länder.
14. Stockfotos als eigene Parks; 18 Bilder ohne Lizenznachweis.
15. „Beliebt“ und „meistgelesen“ ohne Grundlage; 37 von 38 Ratgebern mit Datum 2026-09-29; `dateModified = new Date()`; SLA-Versprechen bei inaktiven Regeln.
16. Pachtangebot-Check ohne Offenlegung; Reststrom „kostenlos“ und Tranchen-Aussage; CH-Hinweis „einmal frei, immer frei“ fehlt.
17. Genossenschaft im Präsens; Entwicklungsbeteiligung ohne Zielgruppe; falsche Barrierefreiheitserklärung; EDA als fertig beworben.

### S1: Lead-Lecks
18. **AT/CH-PLZ wird abgelehnt:** Standard `land:"DE"` (`AnfrageFormular.js:68/70`) plus 5-Ziffern-Prüfung. Das Backend setzt das Land zurück auf DE.
19. **Flächencheck verliert die Eingaben** (`daten.eingaben` wird nicht gelesen). Dazu: Rollen- und Chip-Fehler, „Flurstück“ auf AT/CH-Seiten.
20. **Keine Messung:** `ereignis()` wird nirgends aufgerufen; die KI-Herkunft wird falsch zugeordnet.

### S1: Falsche Zahlen und Ländermischung
Die Korrekturtabelle aus dem Entwurf gilt unverändert. Betroffen sind:
- Umlagen DE
- Pacht DE/AT/CH
- Zuschläge
- CH-Ertrag, Ost/West-Faktor, Capture Rate
- § 51 EEG
- AT-Abgaben, CH-Energiepreis
- DSCR, KfW
- GAP, CO₂

Jeder Wert wird vor Übernahme am Original geprüft, weil das Suchkontingent bei vielen Teams erschöpft war. Die Fehler in den Rechenkernen (Bestandsanlage, Großspeicher, Solarpark, Kommune, Flächencheck) gelten ebenfalls.

**Länder-Sperre bis B1:** Bei `land ≠ DE` werden EEG-Modell, €-Pacht, GAP und DE-Strompreis gesperrt. Stattdessen erscheint „Rechenlogik für Österreich/Schweiz in Vorbereitung“.

**Recht AT/CH:**
- AT-Widmungstabelle korrigieren.
- UVP-Aussagen vereinheitlichen.
- Art. 24ter RPG gilt seit 01.01.2026.
- Solarexpress ist für neue Projekte geschlossen.
- Lexikon „keine laufende Vergütung CH“ ist falsch (GMP).

### S2: Technik, Hygiene, Barrierefreiheit
- **Git:** gitleaks laufen lassen, thematische Commits, privates Remote.
- **Altcode:** `hreflang.js` und `baseUrl.js` löschen (ohne Importe). `lang` und `og:locale` je Sprache setzen.
- **/energie-live:** SMARD-Pflichtnennung fehlt, „alle 5 Minuten“ ist falsch, aWATTar hat keine Lizenz.
- **Barrierefreiheit:** Fokus unter dem Banner, ungültige dl-Strukturen, Kontrast.

---

## 4. Architekturentscheidung Ländertrennung (ADR-L1, gestuft)

**Entscheidung des Inhabers (verbindlich):** eine Domain mit `/de`, `/at` und `/ch`. Der Rat bestätigt sie. **Welche Domain das ist, entscheidet B0.**

**Korrektur zum Entwurf:** Die Aussage „Glücksfall, keine Rankings“ ist gestrichen. oekoinvest.com ist eine fremde Parking-Domain mit Archivinhalten Dritter. Neu daran ist nur, dass **wir** dort keine Rankings verlieren können, weil wir sie nie hatten. Welcher Domain-Weg auch gewählt wird (Kauf, neuer Name, Gruppendomain): Die Präfix-Struktur gehört vor den ersten Livegang.

### Zonenmodell (unverändert)
- **Länderzonen `/de/…`, `/at/…`, `/ch/…`:** alles, was rechtlich, rechnerisch oder sprachlich je Land abweicht.
- **Neutraler Stamm (geschlossene Liste):** `/`, `/wissen`, `/projektboerse`, `/investoren`, `/unternehmen`, `/referenzen`, `/kontakt`, `/impressum`, `/datenschutz` (mit Länderabschnitten), `/presse`, `/hinweisgeber`, `/quellen`, `/sicherheit`.
- **Ohne Präfix:** `/en`, Portal, Login, Einladungen, API.

### Gestufter Start (neu, nach K6)
| Stufe | Inhalt | Bedingung |
|---|---|---|
| **Start** | `/de` vollständig; `/at` nur mit fertigen, fachgeprüften Seiten (Regionen AT, Energiegemeinschaften, Flächencheck AT); `/ch` nur Einstieg, Marktzugang-Check, Parzellen-Vorprüfung | Präfix-Routing, Zonenregister, hreflang-Test grün |
| **Ausbau** | weitere AT-Seiten je Fachfreigabe | eigene Datenreihe plus redaktionelle Freigabe |
| **CH-Ausbau** | Kantonsseiten mit echtem Bezug, CH-Atlas | Markenentscheidung, Klarstellung zur Ökovolt Schweiz AG |

Fehlende Länderseiten verlinken sichtbar auf die DE-Seite mit dem Hinweis „(gilt für Deutschland)“ oder zeigen „in Vorbereitung“. Es gibt keine geklonten Seiten und keine Massen-PLZ-Seiten (M1).

### Technik (unverändert, gekürzt)
- Routengruppe `app/(laender)/[land]/…` mit `generateStaticParams`; `lang` je Zone.
- `src/lib/land` ist die einzige Quelle für `pfad()`, `alternates()`, hreflang (bidirektional, getestet), Sitemaps je Land, Länderwechsler und Navigation.
- **Länderhinweis:**
  - keine IP-Weiterleitung und kein `Vary` auf Geo
  - kein Ländervorschlag per Kopfzeilen: `/api/land` und das Banner sind entfallen (Ländermodell, W3-0); das Land wählt der Besucher in der Kopfleiste oder über die Adresse
  - ein Cookie nur nach aktiver Wahl
- Der Middleware-Matcher wird **nicht** erweitert (er setzt `no-store`).
- **Migration:**
  - `umzug.js` als Redirect-Tabelle mit 308, ohne Ketten
  - Codemod für ca. 800 statische und die dynamischen Links
  - Crawl-Diff gegen einen Produktions-Build, nicht auf dem 8-GB-Rechner
- **Aufwand:** Technik 15–20 PT. Der Engpass sind die AT/CH-Texte und deren Fachprüfung.

---

## 5. Lead-System end-to-end (rechtskonform)

**1. Magneten (Ergebnis immer frei):**
- Rechner mit Bericht-Baustein (B4)
- Flächenpass (B6)
- Pachtangebot-Zweitmeinung mit Offenlegung
- Kommunal-Ratsvorlage (B8)
- Rechnungs-Check Gewerbestrom (B5)
- ElWG-Wechsel-Check (B7)
- Förder- und Fristen-Navigator
- Projektbörse-Suchauftrag

**2. Formular und Einwilligung (Telefonregel nach H5 präzisiert):**
- Das Land kommt immer aus dem Kontext. Die PLZ-Regel gilt je Land.
- Rechnerdaten gehen strukturiert mit.
- **Bericht:** Name und E-Mail sind Pflicht, der Link kommt per Double-Opt-in. **Telefon ist freiwillig.**
- **Rückruf oder Vor-Ort-Termin ausdrücklich gewählt:** Telefon ist Pflichtfeld (Art. 6 Abs. 1 lit. b, Erfüllung der Anfrage). Es wird nur für diesen Zweck genutzt, nicht für spätere Werbeanrufe.
- **Spätere Werbeanrufe:** nur mit eigener, nicht vorbelegter Einwilligung. In AT gilt § 174 TKG auch im B2B-Bereich. In DE wird die mutmaßliche B2B-Einwilligung nicht als Standard genutzt.
- Damit kommt der Inhaber seinem Wunsch „Name, E-Mail, Telefon“ so nahe, wie es rechtssicher geht: Wer zurückgerufen werden will, gibt die Nummer an.
- Drei getrennte, nicht vorbelegte Häkchen: Rückruf/Werbeanruf, Newsletter/Alarm, Weitergabe an benannte Partner.
- **Bot-Schutz:** signiertes Token mit Mindestzeit, ALTCHA nur bei Risiko, kein reCAPTCHA.

**3. Einwilligungsprotokoll (H6):**
- Die append-only-Kette speichert nur Textversions-Hash, Zeit, Kanal, Land und ein Pseudonym.
- Personendaten und gekürzte IP liegen getrennt und löschbar. IPs werden nach 30 Tagen gelöscht.
- Widerruf als eigener Eintrag. Für den Nachweis bleibt ein Minimaldatensatz über die Dauer der Nachweispflicht.
- **Kanal-Ampel:** Ohne Einwilligung werden Werbeanrufe und Werbe-Mails technisch gesperrt.

**4. CRM, Routing, Score:**
- Routing-Matrix Land × Typ × Größe, Lead-Desk je Land, Vertretung, Feiertage.
- Regelbasierter Score A/B/C mit Begründung, kein Machine Learning vor ca. 300 Abschlüssen je Segment.

**5. Vertrieb (neu: Kapazität):**
- Die SLA gilt nur, wenn Personen dafür eingeplant sind (Entscheidung E7).
- **Zielwerte intern:**
  - A-Lead mit Rückrufwunsch unter 1 Geschäftsstunde
  - Großspeicher, Investor und Kommune 4 Geschäftsstunden
  - Fläche ab 20 ha am selben Tag
  - Rest 2 Werktage
- Absagecodes mit Begründung an den Interessenten.
- **Öffentlich** gibt es erst nach 4 Wochen gemessenem Nachweis eine Zeitangabe.

**6. Messung (vor jeder Reichweite):**
- Server-Zähler ohne Kennung in `/api/anfrage` und `/api/rechner/bericht`.
- `ereignis()` nur nach Einwilligung.
- Die KI-Herkunft wird vor der Suchmaschinen-Herkunft geprüft.
- Mittelfristig Matomo selbst gehostet.

**7. Nachfassen:**
- Newsletter je Land mit Double-Opt-in.
- Ergebnis-, Preis- und Fristen-Wecker.
- SPF, DKIM und DMARC auf der **endgültigen** Domain.
- **Kein Versand unter „ÖkoInvest“ vor der Markenentscheidung.**

**Nordstern:** qualifizierte Anfragen je 1.000 Besuche, je Land und Zielgruppe, wöchentlich. Dazu Median und P90 bis zum Erstkontakt.

---

## 6. Preisradar Gewerbestrom: was legal machbar ist (neu geordnet)

**Prinzip (unverändert):**
- Gezeigt werden Preisbestandteile aus amtlichen bzw. offen lizenzierten Quellen.
- Drei sichtbare Qualitätsstufen: amtlich, berechnet, Schätzung.
- Keine Versorgermarken, keine Rangliste „günstigster Anbieter“.
- Sprünge über 30 % gehen in eine Prüfaufgabe.

| Schritt | Was | Quelle | Wann |
|---|---|---|---|
| **1 Rechnungs-Check DE** | Der Nutzer gibt Arbeitspreis, Grundpreis, Verbrauch und PLZ ein oder lädt einen Lastgang **lokal im Browser** hoch. Gezeigt werden: amtliche Umlagen und Steuern, Börsenanteil (SMARD, CC BY 4.0, mit Nennung) und die **eigene** Zerlegung. Ergebnis ehrlich, auch „Ihr Vertrag ist marktgerecht“ | netztransparenz.de, Stromsteuer, KAV, SMARD | Welle 2–3, 5–8 PT. Die Umlagen 2027 (bis 25.10.) einpflegen |
| **2 Netzentgelte DE** | Preisblätter der größten 50–100 VNB, manuell mit URL, Hash und Vier-Augen-Prüfung; Zuordnung PLZ→VNB aus MaStR (dl-de/by-2.0). Für den Rest: „Netzentgelt Ihres Netzbetreibers bitte aus der Rechnung übernehmen“ | VNB-Preisblätter (§ 20 EnWG) | Welle 3, nach Schritt 1 |
| **3 AT** | SNE-VO aus dem RIS, erst **nach dem Inkrafttreten der Fassung zum 01.01.2027** | ris.bka.gv.at | Q1 2027 |
| **4 CH-Atlas** | ElCom-Tarife über LINDAS. **Die Lizenz wird vor dem Bau am Original geprüft** (das Red Team konnte sie nicht bestätigen) | ElCom/LINDAS | nach der Markenentscheidung, als Daten-PR |

**Nicht machbar (unverändert):**
- kein Scraping von Vergleichsportalen, E-Control-Kalkulator, VNBdigital, ene't oder preisblaetter.de
- keine EEX/EPEX-Daten ohne Lizenz
- keine Liefer-Leads in AT/CH ohne lizenzierten Lieferanten

**Voraussetzungen:**
- Die Reststrom-Rolle ist entschieden und offengelegt.
- Die Umlagen sind korrigiert.
- Die Abgrenzung zum BDEW-Wert ist dokumentiert.

**Versorger-Reichweite, legitim:**
- Widgets und White-Label für Stadtwerke
- Versorger als Bieter im Pool und als Käufer in der Börse
- Datenpartnerschaften
- Marken nur beschreibend im Fließtext

---

## 7. Reichweite je Land

**Gemeinsam für alle Kanäle:**
- Keine bezahlte Reichweite vor Lead-Kette, Einwilligungsprotokoll, 4 Wochen SLA-Messung und freigegebenen Rechtstexten.
- Keine Fremdmarken, kein Brand-Bidding.
- Keine Umweltaussagen wie „grün“ oder „klimaneutral“.
- **Keine Presse und keine Datensätze unter „ÖkoInvest“ vor der Namensentscheidung (K2).**

**Neuer Kanal 1: Gruppenreichweite (H1).** Das ist der schnellste ehrliche Kanal:
- ÖKOVOLT-Websites (oekovolt.de, oekovolt.com) mit offengelegten Verweisen „Projektentwicklung der Gruppe“.
- Bestandskunden mit Einwilligung bzw. als Bestandskundenwerbung im Rahmen von § 7 Abs. 3 UWG, rechtlich prüfen.
- Installateurnetz mit Partnerkennung.
- Gewerbedächer aus dem Bestand.

Vorbedingung: Abstimmung in der Gruppe und die Klarstellung zur Ökovolt Schweiz AG für CH-Bezüge.

| Kanal | DE | AT | CH |
|---|---|---|---|
| **Gruppe** | Verweise von oekovolt.de, Bestandskunden, Installateure | Gruppe in AT, falls vorhanden | erst nach der Klarstellung zur Ökovolt Schweiz AG |
| **SEO** | Werkzeug-Cluster; Landkreis-Seiten nur mit eigener Datenreihe und Freigabe, sonst noindex | mindestens 15 eigenständige AT-Beiträge | nur Werkzeug- und Datenseiten |
| **GEO (KI-Suche)** | Faktenregister → `/quellen`; benannte Fachprüfer; Dataset-Schema; `llms.txt`. **Voraussetzung: Crawler-Entscheidung E5** | gleich | gleich |
| **SEM** | erst nach Messung, nur generische Begriffe | ebenso | kleines Budget |
| **PR** | **Fristanlässe 2026** (Netzentgelte 15.10., Umlagen 25.10., BNetzA 01.12.) als Fachbeiträge über die Gruppenkanäle bzw. LinkedIn der Geschäftsführung. Eigener Newsroom erst mit dem endgültigen Namen | EAG- und ElWG-Erklärstücke ebenso | Pronovo und ElCom 2027 ebenso |
| **Partner** | Stadtwerke, BSW, bne, Maschinenringe, Kammern | Dienstleisterverzeichnis energiegemeinschaften.gv.at, LK, KEM/LEADER, Stadtwerke | Swissolar, VSE (später) |
| **Lokal** | nur besetzte Standorte | Google-Profil Ostermiething | keine Scheinpräsenz |

---

## 8. Umsetzungswellen

**Rahmen:**
- höchstens 2 Code-Ströme an Kernbereichen gleichzeitig
- **genau eine** Änderung an `markt.js` zur selben Zeit
- Build, Playwright und Lighthouse nur seriell (8 GB RAM)
- Commits und Remote macht der Mensch; Agenten liefern Branch bzw. Patch
- Klasse-A-Änderungen (Recht, Zahlen, Leads, Sicherheit) brauchen die benannte zweite Person (E6)

### Welle 0: Tage 0–5 (Blocker)
- **W0-0 Marke und Domain (Inhaber):**
  - Entscheidung zwischen (a) Markenrecherche plus Kaufanfrage oekoinvest.com/.de und Sicherung .at/.ch, (b) neuer eintragbarer Name, (c) Start unter einer Gruppendomain bzw. einem Gruppenpfad.
  - Bis zur Entscheidung keine Presse, kein Newsletter, kein Datensatz unter dem Namen.
- **W0-1 Sicherung (Mensch):**
  - gitleaks
  - thematische Commits (`robots.js` und `public/robots.txt` gemeinsam)
  - privates Remote, `master` → `main`
  - `.gitignore` um `*.tmp.js` ergänzen, `.env.example` anlegen
  - `armee-fortsetzung.tmp.js` nach dem Lauf löschen
  - eigene Repo-`CLAUDE.md` statt der geerbten NetOps-Regeln
- **W0-2 Fristenkästen (nur Text):**
  - EAG-Call bis 07.10. auf `/energiegemeinschaften`, `/agri-pv` und AT-Regionsdateien
  - CH-Marktzugang 31.10. auf `/reststrom`
  - Pronovo bis 17.10. in `schweiz.js`
  - Rein informativ, ohne Markenauftritt.
- **W0-3 Kontaktdaten:** Freigabe von Telefon, Funktionspostfach und UID, dann `site.js`.
- **W0-4 Betrieb (neu, K3):**
  - Hosting-Entscheidung (EU)
  - Staging hinter Basic-Auth
  - Frappe produktiv mit `PLATTFORM_BACKEND=frappe`
  - Abarbeitung von `GO-LIVE.md`
  - Mail-Versand (Dienstleister mit AVV)
  - Backup und Restore-Test
  - Uptime-Monitoring
- **W0-5 Crawler-Entscheidung (E5)** und Benennung der zweiten Prüfperson (E6).

### Welle 1: Wochen 1–3 („Eindämmung“, Arbeitspakete siehe Abschnitt 11)
- **Ziel:** Nichts Falsches, Unsicheres oder Irreführendes mehr ausliefern. AT/CH-Leads gehen durch. Messung und Sicherheitsnetz stehen.
- **Rechtstexte** laufen parallel als **Strang R** mit eigenem Termin (Anwälte, 4–8 Wochen). Bis dahin bleibt die Seite nicht öffentlich bzw. auf noindex.

### Welle 2: Wochen 4–10 (Fundament)
- **B1 Register und Länder-Engine:** Strangler-Muster, Rechner einzeln je PR.
- **Länderrouting** (Strom 2, getrennte Dateien): Start `/de` plus AT-Pilot.
- **B3** Einwilligungsprotokoll mit getrennter Personendaten-Tabelle, Routing, SLA-Messung.
- **B4 Stufe 1:** HTML-Bericht für Pacht, Pachtangebot-Check, Flächencheck und Kommune.
- **Gruppenkanal:** Verweise und Partnerkennungen.
- **Fristen 2026:** Umlagen 2027 und Netzentgelte 2027 ins Register (als Daten, ohne Pressearbeit unter dem Namen).
- **Organisatorisch:** Anwaltsmandate, Eintrag energiegemeinschaften.gv.at, Hinweisgeber-Anbieter, Fotoshooting.
- **Livegang** frühestens am Ende von Welle 2, wenn alle Bedingungen erfüllt sind:
  - Strang R freigegeben
  - B0 erledigt
  - `verify` grün
  - Vertrieb besetzt

### Welle 3: Monate 3–6
- B5 Rechnungs-Check DE, danach Netzentgelte der größten VNB
- B6 Flächenpass Stufe 1
- B7 EG-Preisblatt und White-Label AT
- B8 Kommunal 2.0
- B9 Ausschreibungs-Monitor
- B10 Neutralität der Börse
- Newsletter je Land, Newsroom (mit endgültigem Namen)
- Search Console und Bing
- danach Paid Media im Test

### Welle 4: Monate 6–12
- AT-Gewerbestrom nach SNE-VO 2027
- CH-Atlas
- Widgets für Partner
- Video-Reihe
- Netzanschluss 2.0
- Gebäudestrom
- Parkplatz-Hub
- Fakten-Assistent
- Gläserner Solarpark
- Börsen-Launch mit echten Kennzahlen
- Wiedervorlage Pacht-Barometer

---

## 9. Was ausdrücklich NICHT gemacht wird, und Budgetrahmen

### Stop-Liste (12 Monate)
Die Liste aus dem Entwurf gilt weiter, mit diesen Ergänzungen:
- keine Presse, kein Newsletter, kein Datensatz unter „ÖkoInvest“ vor der Namensentscheidung
- keine fremde Domain als Standard im Code
- kein Pacht-Barometer
- keine VNB-Vollabdeckung DE
- kein AT-Atlas vor der SNE-VO 2027
- keine Bewerbung von PDF/UA
- keine Komplettmigration als Bedingung für den Livegang
- keine mutmaßliche B2B-Einwilligung als Standard für Werbeanrufe

**Weiter gültig:**
- kein Scraping, keine Fremdmarken, keine erfundenen Zahlen, Zähler oder Testimonials
- keine Stockbilder als eigene Projekte, keine Countdowns
- kein Telefon-Pflichtfeld für den Bericht, kein gesperrtes Ergebnis
- kein Eigenbau-Hinweisgebersystem
- keine CH-EG-Software
- kein ML-Scoring
- kein AGPL-Code in der App
- keine Provisionen vor Klärung der Erlaubnisse
- keine Vorteile an Amtsträger
- keine Scans und kein Schreibzugriff an Parks

### Budgetrahmen
Alle Werte sind Schätzungen des Rats und **keine Angebote**. Angebote müssen eingeholt werden.

| Posten | Größenordnung | Bemerkung |
|---|---|---|
| Domains | offen | Kaufpreis bei HugeDomains bzw. Verkäufer .de **erfragen**; .at/.ch, falls frei, geringe Jahresgebühren |
| Marke | amtlich ca. 850 € (EUIPO, 1 Klasse) bzw. 290 € (DPMA, bis 3 Klassen), dazu CH (IGE) und Anwalt | Gebühren am Amt prüfen; Recherche und Anmeldung mit Anwalt ca. 2–6 T€ |
| Anwälte DE/AT/CH | ca. 15–40 T€ für das Erstpaket | Datenschutz, AGB, Börse, Kapitalmarkt, Energierecht |
| Hosting EU (Next, Frappe, Matomo, Backup) | ca. 100–400 €/Monat | je Anbieter |
| Mail-Versand | ca. 20–100 €/Monat | mit AVV |
| Hinweisgeber-Dienst | ca. 1–5 T€/Jahr | EU/CH-Hosting, Ombudsperson optional |
| Zweite Prüfperson | ca. 0,5 VZÄ | Vier-Augen-Prinzip |
| Vertriebskapazität | je Land mindestens 1 benannte Person mit Vertretung | Voraussetzung für die SLA |
| Fotoshooting | ca. 10–15 T€ | eigene Parks |

---

## 10. Entscheidungen für den Inhaber (Ja/Nein, mit Empfehlung)

### Sofort (Welle 0), ohne sie geht nichts weiter
| # | Frage | Empfehlung |
|---|---|---|
| **E1** | Gehört oekoinvest.com oder .de der Gruppe? Wenn **nein**: Sollen wir (a) Kauf und Markenrecherche für „ÖkoInvest“ angehen, statt (b) einen neuen Namen oder (c) einen Gruppenauftritt zu wählen? | **Nein zu (a) als Erstweg.** Zwei ältere Namensinhaber plus ein unbekannter Kaufpreis sind ein hohes Risiko. **Empfehlung: (b) mit Markenrecherche, Übergang über (c).** Entscheidung bis Ende Welle 0 |
| **E2** | Telefon, Funktionspostfach und UID für Impressum und Kontakt freigeben? | **Ja** |
| **E3** | Rolle im Reststrom-Pool: Vermittler (ja) oder Lieferant (nein)? Vergütung offenlegen? | **Vermittler, Vergütung offengelegt: ja.** Ohne diese Entscheidung wird der Pool nicht beworben |

### Bis Ende Welle 1
| # | Frage | Empfehlung |
|---|---|---|
| **E4** | Telefon: Pflicht nur bei gewähltem Rückruf oder Vor-Ort-Termin, freiwillig beim Bericht, Werbeanrufe nur mit Einwilligung? | **Ja** |
| **E5** | KI-Crawler: Such- und Abrufbots (OAI-SearchBot, ChatGPT-User, PerplexityBot, Claude-SearchBot, Bingbot) erlauben? GPTBot und Google-Extended für öffentliche Wissensseiten öffnen? CCBot und Bytespider gesperrt lassen? | **Ja / Ja / Ja.** Sonst ist die GEO-Strategie widersprüchlich. Portal und Einladungen bleiben gesperrt |
| **E6** | Eine zweite Prüfperson (ca. 0,5 VZÄ, intern oder extern) für Klasse-A-Änderungen benennen? | **Ja.** Sonst gilt die Freigaberegel nur auf dem Papier |
| **E7** | Je Land eine benannte Vertriebsperson mit Vertretung für die SLA einplanen? | **Ja.** Ohne diese Person keine Reichweite |
| **E8** | Hosting EU und Frappe produktiv beauftragen (W0-4)? | **Ja** |
| **E9** | Gruppenkanal: Dürfen oekovolt.de und oekovolt.com offengelegt auf die Projektentwicklung verweisen und Bestandskunden (rechtlich geprüft) informiert werden? | **Ja** |
| **E10** | Neutraler Stamm wie in Abschnitt 4? | **Ja** |
| **E11** | Gestufter Start: `/de` plus fertiges `/at`, `/ch` nur mit Daten- und Werkzeugseiten? | **Ja** |

### Bis Welle 2
| # | Frage | Empfehlung |
|---|---|---|
| **E12** | GA4 durch Matomo (selbst gehostet) ersetzen? | **Ja** |
| **E13** | Externer Hinweisgeber-Anbieter mit EU/CH-Hosting? Bitte Beschäftigtenzahlen je Gesellschaft liefern | **Ja** |
| **E14** | Schweiz zunächst nur als Daten- und Werkzeugpräsenz, mit juristisch freigegebener Klarstellung zur Ökovolt Schweiz AG? | **Ja** |
| **E15** | Genossenschaft und Beteiligungen überall auf „in Vorbereitung“, Entwicklungsbeteiligung nur für Profis ab 200.000 €? | **Ja** |
| **E16** | Pacht-Barometer für 12 Monate streichen? | **Ja** |
| **E17** | Eigene Repo-`CLAUDE.md` anlegen statt der NetOps-Regeln? | **Ja** |

**Rückfrage:** „ImmMV“ taucht in einem Auftrag auf, ist aber nirgends belegt. Was ist gemeint?

---

## 11. Welle 1: Arbeitspakete für die Agenten-Teams

**Regeln:**
- Jede Datei gehört genau einem Paket. Neue gemeinsame Bausteine legt nur das genannte Paket an, die anderen nutzen sie danach.
- Agenten liefern einen Patch bzw. Branch, der Mensch committet.
- Build und Tests laufen seriell.
- **Reihenfolge:** A1 (JsonLd-Komponente) und F (Charakterisierung) am Tag 1–2. E startet erst, wenn F grün ist. Alle anderen Pakete laufen parallel.

### Paket A: Sicherheit
- **Ziel:** keine ausnutzbaren Lücken auf öffentlichen Seiten und in den Lead-Endpunkten.
- **Dateien (exklusiv):**
  - `src/components/JsonLd.js` (neu, A1, Tag 1)
  - JSON-LD-Stellen in allen Dateien **außer** denen von D und G
  - `src/lib/ipAdresse.js`, `next.config.mjs` (nur `headers`), `src/lib/energy.js`
  - `src/app/api/auth/*`, `public/.well-known/security.txt`
  - `src/lib/plattform/rechte.js` (erst nach dem Konteninventar)
- **Inhalt:**
  - zentrales `<`-Escaping
  - vertrauenswürdiger Proxy-Header (letzter Hop bzw. Konfiguration)
  - HSTS, CSP Report-Only
  - Demo-Guard (Demo-Zugang in Produktion aus)
  - Timeout und Retry
  - Open-Redirect-Prüfung
  - Rate-Limit beim Passwort-Reset
- **Abnahme:**
  - Test mit `</script>` in Projekttitel bzw. Beschreibung rendert sicher.
  - Ein gefälschter X-Forwarded-For umgeht das Rate-Limit nicht.
  - Header vorhanden.
  - `/%09/evil.com` leitet nicht weiter.
  - Demo-Login in Produktion nicht möglich.
- **Abhängigkeiten:** keine (A1 zuerst).
- **Rechtliche Prüfpunkte:** IP-Speicherung für Rate-Limit und Nachweis (Zweck, Frist) mit Strang R abstimmen.

### Paket B: Datenschutz und Messung
- **Ziel:** keine Datenabflüsse ohne Einwilligung, Messung technisch bereit.
- **Dateien:** `src/components/Statistik/*`, `src/components/Cookies/*`, `src/lib/herkunft.js`, `src/lib/statistik.js`, `src/lib/plattform/ki/kontext.js`, neu `src/lib/ereignis/*` (Hook).
- **Inhalt:**
  - GA nur über eine Positivliste öffentlicher Pfade
  - Banner: „Weiter ohne“ lehnt wirklich ab; Version und Zeitstempel; Maps-Kategorie raus; ehrliche Texte
  - Codes nicht im Klartext ins CRM, sondern gehasht
  - KI-Herkunft vor Suchmaschinen-Herkunft
  - Klick-IDs nur im Arbeitsspeicher
  - PII-Schwärzung vor dem KI-Aufruf oder KI-Triage aus (Schalter, Standard **aus**)
- **Abnahme:**
  - Auf /einladung, /portal und /login/link lädt kein GA-Skript (Netzwerkprotokoll).
  - Ablehnen setzt keine Analytics-Cookies.
  - Testfreitext mit E-Mail und Telefon kommt geschwärzt beim KI-Aufruf an.
  - `ereignis()` feuert ohne Einwilligung nicht.
- **Abhängigkeiten:** keine. Der Anschluss an die Formulare folgt in Paket C.
- **Rechtliche Prüfpunkte:** § 25 TDDDG, Banner-Texte durch Strang R, Drittland beim KI-Dienst.

### Paket C: Lead-Lecks
- **Ziel:** Jede AT/CH-Anfrage kommt vollständig, mit Land und richtiger Rolle an.
- **Dateien:**
  - `src/components/Plattform/AnfrageFormular.js`, `src/components/Portal/Bedienung/pruefung.js`, `src/app/api/anfrage/route.js`
  - `src/components/Flaeche/FlaechenWizard.js`, `KommuneAnfrage.js`, `InvestorAnfrage.js`, `ReststromAnfrage.js`
  - `src/lib/plattform/backend/demo.js`
  - Frappe `anfrage.py` (im Backend-Import-Ordner)
  - `En/ContactForm.js`
- **Inhalt:**
  - `land`-Prop aus dem Kontext, PLZ-Regel je Land (DE 5, AT 4, CH 4 Ziffern)
  - Backend übernimmt das Land
  - Wizard-Eingaben werden gelesen
  - Rollen- und Chip-Fixes, Begriff „Grundstücksnummer/Parzelle“
  - Pflicht-Haken ersetzt durch Hinweis plus optionale Häkchen (Platzhaltertexte, finaler Text aus Strang R)
  - Telefon als Pflicht nur bei Rückruf- oder Terminwahl
  - Server-Zähler ohne Kennung
  - Hook aus B anschließen
  - Seed-Regeln aktiv
  - Routing „Team-Postfach je Land“
- **Abnahme:**
  - E2E: Anfragen mit PLZ 5020 (AT) und 8001 (CH) werden angenommen, das Land bleibt im Backend erhalten.
  - Flächencheck mit 12 ha ergibt ha = 12 und einen plausiblen Score.
  - Kein vorbelegtes Häkchen.
  - Ohne Rückrufwahl ist Telefon optional.
- **Abhängigkeiten:** B (Hook), W0-4 für den Echtbetrieb (Tests laufen gegen das Demo-Backend).
- **Rechtliche Prüfpunkte:** Art. 6 Abs. 1 lit. b vs. Einwilligung, § 7a UWG, § 174 TKG (AT), revDSG.

### Paket D: Ehrlichkeit und Claims
- **Ziel:** keine irreführenden Aussagen, kein erfundener Social Proof.
- **Dateien:**
  - `src/app/freiflaeche`, `landwirte`, `investoren`, `en/*`, `projektboerse/page.js` und `[slug]`
  - `src/components/Home/*`, `src/components/Reststrom/Seite/*`
  - `src/data/unternehmen.js`, `src/data/referenzen.js`
  - `src/app/impressum`, `src/app/barrierefreiheit`, `src/app/genossenschaft`
  - JSON-LD in diesen Dateien über `JsonLd` aus A1
- **Inhalt:**
  - Testdaten filtern, „Live“ nur ohne Demo, kein Offer und kein InStock
  - Badge „Eigenprojekt“
  - Claims und Umweltaussagen aus S0 Punkte 11–17
  - Stockbild-Texte, Barrierefreiheitserklärung
  - Genossenschaft „in Vorbereitung“
  - Pachtangebot-Offenlegung, Reststrom-Texte
- **Abnahme:**
  - Claim-Lint (aus F) findet 0 Reizwörter in diesen Dateien.
  - Ohne Demo-Modus werden 0 Testprojekte gerendert.
  - JSON-LD validiert ohne Offer.
- **Abhängigkeiten:** A1, F (Claim-Lint), E3 für die Reststrom-Texte.
- **Rechtliche Prüfpunkte:** §§ 5, 5a, 5b UWG, EmpCo, Bildrechte, § 654 BGB (Reststrom).

### Paket E: Zahlen-Sofortkorrektur (einziger Strom an `markt.js`)
- **Ziel:** keine falschen Zahlen und keine Ländermischung.
- **Dateien:** `src/lib/invest/markt.js`, `src/lib/rechner/*`, `src/components/Rechner/*`.
- **Inhalt:**
  - Werte aus der S1-Tabelle, jeder **am Original geprüft**, mit Quelle als Kommentar
  - Länder-Sperre für AT/CH
  - § 51-Parameter
  - Bugs in Großspeicher, Bestandsanlage und Kommune
  - `zuschlagsHistorie` zusammenführen
  - CO₂ DE 0,69, für AT/CH ausgeblendet
  - `dateModified` in `RechnerSeite.js` aus dem Stand der Rechenlogik statt `new Date()`
- **Abnahme:**
  - Jede Abweichung gegenüber den Charakterisierungstests ist im PR begründet.
  - Bei `land=AT/CH` erscheint kein €-Pachtwert und kein EEG-Wert.
  - `selbsttest()` grün.
  - Der Vertrieb ist über sinkende Renditen informiert.
- **Abhängigkeiten:** **F muss grün sein**; zweite Prüfperson (E6).
- **Rechtliche Prüfpunkte:** EEG §§ 6/51, EAG, CH-Normen; Darstellung von Renditen (keine Anlagewerbung).

### Paket F: Sicherheitsnetz und Gate
- **Ziel:** Vorher-Nachher-Nachweis für jede Änderung.
- **Dateien:** `package.json` (nur `scripts`, `version` → 0.4.0), neu `test/**`, `qa/**`, `.github/workflows/**`.
- **Inhalt:**
  - **Tag 1–2:** Charakterisierungstests mit den heutigen Ausgaben aller Rechner (Standardeingaben plus Randfälle)
  - danach `npm run verify`: node:test, `selbsttest()`, Claim-Lint (Reizwörter, Platzhalter, Testdaten, ß in CH-Texten), axe auf 10 Kernseiten, Funnel-E2E mit abgefangenen POSTs
- **Abnahme:**
  - `npm run verify` läuft lokal seriell in unter 10 Minuten.
  - Die Charakterisierungs-Snapshots sind eingecheckt, bevor E beginnt.
- **Abhängigkeiten:** W0-1 (Git).
- **Rechtliche Prüfpunkte:** keine (die Lint-Liste stimmt Strang R ab).

### Paket G: Recht-Text-Fixes in Inhalten
- **Ziel:** keine falschen Rechtsaussagen in Ratgebern, Lexikon und Regionen.
- **Dateien:**
  - `src/content/ratgeber/*` (nur die betroffenen Dateien), `src/data/lexikon.js`, `src/data/faq.js`
  - `src/data/regionen/{bayern,saarland,tirol,vorarlberg,schweiz}.js` sowie die AT-Regionsdateien mit Widmungsaussagen
  - `src/app/kommunen`, `src/app/rechner/kommune/page.js`
  - JSON-LD in diesen Dateien über `JsonLd`
- **Inhalt:**
  - § 6 EEG (zeitliche Reihenfolge, Länderpflichten)
  - AT-Widmungstabelle
  - Art. 24ter RPG, Solarexpress, UVP
  - GMP CH
  - `aktualisiert` nur bei echter Änderung. Die Korrektur von `dateModified = new Date()` in `src/components/Rechner/RechnerSeite.js` macht **Paket E**, weil die Datei dort liegt
- **Abnahme:**
  - Fachprüfer hat jede geänderte Aussage gegen die Quelle abgehakt (Liste im PR).
  - Datumsfelder sind unterschiedlich und begründet.
- **Abhängigkeiten:** A1; W0-2 ist vorher abgeschlossen (dieselben Regionsdateien).
- **Rechtliche Prüfpunkte:** §§ 331 ff. StGB-Nähe bei § 6 EEG, Landesrecht AT, RPG.

### Paket I: Indexsteuerung und Altcode
- **Ziel:** Nichts wird zu früh oder auf der falschen Domain indexiert.
- **Dateien:** `src/app/robots.js`, `src/app/sitemap.js`, `src/lib/hreflang.js` und `src/lib/baseUrl.js` (löschen), `src/app/layout.js` (nur `lang`/`og:locale`), `src/data/site.js` (nur die URL-Logik, Kontaktdaten aus W0-3).
- **Inhalt:**
  - Crawler-Regeln nach E5
  - noindex für Entwürfe und Nicht-Produktion
  - Build-Abbruch, wenn `NEXT_PUBLIC_SITE_URL` in Produktion fehlt
  - `lang="en"` auf /en
- **Abnahme:**
  - Ein Produktions-Build ohne URL schlägt fehl.
  - Ein Staging-Build liefert `noindex`.
  - Die Sitemap enthält keine Entwurfsseiten.
- **Abhängigkeiten:** E1 (Domain), E5.
- **Rechtliche Prüfpunkte:** keine.

### Strang R: Rechtstexte (Mensch und Anwalt; der Agent liefert nur Entwürfe)
- **Dateien:** `src/app/datenschutz`, `nutzungsbedingungen`, `bedingungen/*`, neu `src/app/hinweisgeber`.
- **Inhalt:**
  - Platzhalter schließen
  - TDDDG, revDSG, Drittland KI
  - Zustimmungsprotokoll bei der Registrierung (Fassung und Zeitpunkt)
  - unwirksame Klauseln streichen
  - Hinweisgeber-Seite mit externen Meldestellen
  - Portal-Menü umbenennen in „GwG-Verdacht melden“
- **Abnahme:** schriftliche Freigabe je Land. Bis dahin noindex und kein öffentlicher Livegang.
- **Termin:** eigener Termin, 4–8 Wochen ab Mandat.

**Abschluss Welle 1 (realistisch):**
- `verify` grün mit Charakterisierung.
- AT/CH-Testleads gehen durch.
- Technische S0-Punkte behoben.
- Rechtliche S0-Punkte entweder behoben oder durch noindex bzw. nicht öffentliches Staging eingedämmt.
- Messung bereit.
- Strang R terminiert.

---

## 12. Realistische Erwartung

Keine Platz-1- und keine Umsatzgarantie. Die Zahlen sind Größenordnungen.

**Nach 3 Monaten:**
- Name und Domain entschieden, Betrieb steht.
- Live mit `/de` und einem fertigen Teil von `/at` (sofern Strang R freigegeben ist).
- AT/CH-Leads funktionieren, das Einwilligungsprotokoll läuft.
- Erste echte Messwerte.
- Die ersten Leads kommen vor allem über **Gruppenkanäle**, Partnerverzeichnisse und Bericht-Bausteine.
- Organisch noch wenig, weil eine neue Domain 6–12 Monate braucht.
- Rechnerergebnisse werden durch die Korrekturen schlechter, und das wird offen kommuniziert.

**Nach 12 Monaten:**
- Rechnungs-Check DE mit Netzentgelten der größten VNB, AT-Daten nach SNE-VO 2027, eventuell CH-Atlas.
- Ausschreibungs-Analysen je Land.
- Flächenpass Stufe 1, Kommunal 2.0, EG-Preisblatt AT.
- Erste Backlinks und KI-Zitate **auf dem eigenen Namen**.
- Kleine, echte Projektbörse.

**Nach 24 Monaten:**
- Zeitreihen, Partnernetz, eigene Parkdaten und namentliche Fachautoren, unter einer Marke, die bleibt.
- **Hauptrisiken:**
  - (1) Namens- oder Domainwechsel nach dem Aufbau
  - (2) fehlende Pflege von Register und Daten
  - (3) Leads ohne besetzten Vertrieb

**Quellen:**
- Teamberichte in `C:/Users/SALEADMIN/claude-browser/armee/dossier-teams.md`
- RDAP: https://rdap.verisign.com/com/v1/domain/oekoinvest.com
- https://oekoinvest.de/de
- https://www.gesetze-im-internet.de/eeg_2014/__6.html
- https://energiegemeinschaften.gv.at/
- https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites
- Lizenzen von LINDAS/ElCom, SMARD und MaStR: **vor Nutzung am Original prüfen.**
