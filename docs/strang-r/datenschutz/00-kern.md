# Datenschutzerklärung – Kern (gilt für alle Länder)

> **ENTWURF zur anwaltlichen Prüfung – nicht freigegeben, keine Rechtsberatung.**
> Fassung: `DSE-ENTWURF-2026-10-03` · Ersetzt nach Freigabe `src/app/datenschutz/page.js`.
> Ergänzend gilt je Land: `10-land-de.md`, `20-land-at.md`, `30-land-ch.md`.
> Platzhalter: `[[INHABER: …]]` = Angabe fehlt · `[[PRÜFEN P-xx]]` = Rechtsfrage (siehe `../PRUEFPUNKTE-ANWALT.md`) ·
> `[[TECHNIK: …]]` = mit dem Ist-Stand im Code abgleichen.
>
> **Hinweis für die Live-Seite bis zur Freigabe:** sichtbares Banner „Entwurf – wird derzeit rechtlich geprüft“ und `robots: noindex`.

---

## Das Wichtigste in Kürze

*(Kurzfassung – nicht abschließend; maßgeblich ist der Volltext. [[PRÜFEN P-10: Kurzfassung zulässig und deckungsgleich?]])*

- Verantwortlich ist die ÖkoInvest GmbH in Ostermiething, Österreich.
- Die Website können Sie ohne Angabe von Daten nutzen. Rechner laufen in Ihrem Browser.
- Statistik (Google Analytics) läuft nur, wenn Sie im Cookie-Banner zustimmen.
- Schicken Sie uns eine Anfrage, nutzen wir Ihre Angaben, um sie zu beantworten. Dafür brauchen wir keine Einwilligung.
- Werbeanrufe und Newsletter gibt es nur, wenn Sie das gesondert ankreuzen. Sie können das jederzeit widerrufen.
- Sie haben Rechte auf Auskunft, Berichtigung, Löschung, Widerspruch und Beschwerde.

---

## 1. Verantwortlicher und Kontakt

Verantwortlich für die Verarbeitung auf dieser Website und im Portal ist:

**ÖkoInvest GmbH**
Gewerbegebiet 10, 5121 Ostermiething, Österreich
Firmenbuch FN 541505g, Landesgericht Ried im Innkreis
Geschäftsführung: Andreas Wegscheider, Manuel Thaler
[[PRÜFEN P-02: Registerangaben aus `src/data/site.js` am aktuellen Firmenbuchauszug prüfen]]

**Datenschutzkontakt:** [[INHABER: Funktionspostfach für Datenschutz, z. B. datenschutz@… – noch nicht freigegeben]]
Postanschrift wie oben, Betreff „Datenschutz“.

**Datenschutzbeauftragter:** [[PRÜFEN P-11: Pflicht zur Benennung nach Art. 37 DSGVO prüfen (Kerntätigkeit umfangreiche Überwachung? KYC, Monitoring, Akquise). Falls benannt: Name bzw. Stelle und Kontakt einsetzen; falls nicht: Satz streichen.]]

**Gesellschaften der ÖKOVOLT Gruppe und Projektgesellschaften:** Schließt eine andere Gesellschaft mit Ihnen einen Vertrag – etwa
als Pächterin einer Fläche oder als Rechnungsausstellerin im Contracting –, ist sie für die Verarbeitung im Rahmen dieses Vertrags
selbst verantwortlich. Welche Gesellschaft das ist, steht im Vertrag bzw. auf dem Beleg. Die ÖkoInvest GmbH betreibt die Plattform
dann für diese Gesellschaft als Auftragsverarbeiterin. [[PRÜFEN P-12: Rollenmodell Gruppe – Auftragsverarbeitung oder gemeinsame Verantwortung (Art. 26 DSGVO)? Vereinbarungen vorhanden?]]

## 2. Rechtsgrundlagen

Wir verarbeiten personenbezogene Daten nach der Datenschutz-Grundverordnung (DSGVO) und dem österreichischen Datenschutzgesetz (DSG).
Für Personen in Deutschland und der Schweiz gelten zusätzlich die Länderteile dieser Erklärung. Rechtsgrundlagen sind:

| Grundlage | Wofür (Beispiele) |
|---|---|
| Art. 6 Abs. 1 lit. a DSGVO – Einwilligung | Statistik-Cookies, Werbeanrufe, Newsletter, Weitergabe an benannte Partner, Gesichtsabgleich (mit Art. 9 Abs. 2 lit. a) |
| Art. 6 Abs. 1 lit. b DSGVO – Vertrag und vorvertragliche Maßnahmen | Anfragen, Rückruf zur Anfrage, Portal-Konto, Projektbörse, Energiebeschaffung, Abrechnung |
| Art. 6 Abs. 1 lit. c DSGVO – rechtliche Pflicht | Aufbewahrung nach Unternehmens- und Steuerrecht; Sorgfaltspflichten gegen Geldwäsche, **soweit** sie für uns gelten [[PRÜFEN P-13: GwG-Verpflichtetenstellung AT/DE/CH]] |
| Art. 6 Abs. 1 lit. f DSGVO – berechtigte Interessen | sicherer Betrieb, Missbrauchsabwehr, Nachweis von Zustimmungen und Unterschriften, Flächensuche, Finanzierung eigener Projekte |

Wo wir uns auf berechtigte Interessen stützen, haben wir eine Abwägung vorgenommen. Sie können widersprechen (Abschnitt 15).
Einwilligungen sind freiwillig und jederzeit mit Wirkung für die Zukunft widerrufbar; der Widerruf ändert nichts an der Bearbeitung
Ihrer Anfrage.

## 3. Hosting und Server-Logdaten

Die Website wird bei [[INHABER: Hosting-Anbieter, Sitz, Serverstandort (Masterplan E8: EU)]] betrieben. Der Anbieter verarbeitet die
Daten in unserem Auftrag nach Art. 28 DSGVO. [[TECHNIK: AV-Vertrag muss vor Livegang unterzeichnet sein – Satz erst dann veröffentlichen.]]

Bei jedem Aufruf speichert der Server: IP-Adresse, Zeitpunkt, aufgerufene Adresse, übertragene Datenmenge, Statuscode, verweisende
Seite, Browser und Betriebssystem. Zweck: Auslieferung, Fehleranalyse, Abwehr von Angriffen (Art. 6 Abs. 1 lit. f DSGVO).
Speicherdauer: [[INHABER: z. B. 14 Tage – mit der tatsächlichen Log-Konfiguration abgleichen]], bei Sicherheitsvorfällen bis zur Klärung.

**Geteilte Rechner-Links:** Teilen Sie ein Rechnerergebnis per Link, stehen Ihre Eingaben in der Adresse. Ruft jemand den Link auf,
erscheinen die Eingaben in den Server-Logdaten. [[TECHNIK: `src/components/Rechner/kontext.js` – Verhalten bestätigen]]

## 4. Anfragen über Formulare

Senden Sie uns eine Anfrage (z. B. Flächencheck, Agri-PV, Projekt, Investor, Reststrom, Energiegemeinschaft, Termin), verarbeiten
wir Ihre Kontaktdaten (Anrede, Name, ggf. Firma, E-Mail, ggf. Telefon, PLZ, Ort, Land) und Ihre Angaben zum Anliegen. Die Anfrage wird
als Vorgang mit Vorgangsnummer in unserem ERP-System gespeichert.

**Rechtsgrundlage** ist Art. 6 Abs. 1 lit. b DSGVO (Bearbeitung Ihrer Anfrage). **Eine Einwilligung verlangen wir dafür nicht.**
Pflichtfelder sind markiert; ohne sie können wir die Anfrage nicht bearbeiten.

**Rückruf:** Kreuzen Sie „Bitte rufen Sie mich zu dieser Anfrage zurück“ an, nutzen wir Ihre Telefonnummer **nur für diese Anfrage**
(lit. b). Ohne dieses Häkchen ist die Telefonnummer freiwillig und dient nur Rückfragen zu Ihrer Anfrage.
[[PRÜFEN P-20: Reicht lit. b für den Rückruf zur eigenen Anfrage in AT (§ 174 TKG 2021) und DE (§ 7 UWG) – oder ist der Rückruf als Einwilligung zu behandeln?]]

**Freiwillige Einwilligungen** (getrennt, nie vorangekreuzt, keine Voraussetzung für die Anfrage):

| Häkchen | Was erlaubt es | Widerruf |
|---|---|---|
| Werbeanruf | dass wir Sie später telefonisch zu passenden eigenen Angeboten ansprechen | jederzeit, formlos |
| Newsletter | Fachinformationen und Fristen für Ihr Land per E-Mail; erst nach Bestätigung per E-Mail (Double-Opt-in) | Abmeldelink in jeder Mail |
| Weitergabe an Partner | Weitergabe der Anfrage an namentlich genannte Partner | jederzeit |

[[INHABER: Partner namentlich benennen – solange keine benannt sind, ist das Häkchen ausgeblendet (`src/lib/anfrage/hinweise.js`, `aktiv: false`).]]
[[TECHNIK: Newsletter-Versand erst, wenn die Double-Opt-in-Strecke steht; bis dahin wird nur der Wunsch gespeichert.]]

**Nachweis:** Zu jedem Hinweis und jeder Einwilligung speichern wir die Textfassung, eine Prüfsumme (SHA-256) des angezeigten Textes,
die Sprache und den Zeitpunkt (Art. 7 Abs. 1 DSGVO). Speicherdauer siehe Abschnitt 14.

**Herkunft der Anfrage:** Mit der Anfrage senden wir, **ohne Cookies**, über welchen Weg Sie auf die Website kamen (Kampagnen-Parameter
`utm_*`, verweisende Domain, Einstiegs- und Absendeseite). Persönliche Codes und Tokens aus Adressen übernehmen wir dabei nicht.
Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (Auswertung unserer Kontaktwege).
[[TECHNIK: `herkunft.js` speichert laut Masterplan S0 Nr. 1 Codes im Klartext – Aussage erst nach Behebung (Paket A/B) veröffentlichen.]]

Registrieren Sie sich später mit derselben E-Mail-Adresse, ordnen wir den Vorgang Ihrem Konto zu.

## 5. Portal-Konto, Anmeldung und Teams

**Konto:** Name, E-Mail, ggf. Firma, Telefon, Anschrift, Rolle (z. B. Flächeneigentümer, Investor, Projektanbieter, Unternehmen,
Kommune), Passwort nur als Hash, Anmeldezeitpunkte und die Inhalte, die Sie hinterlegen (Flächen, Projekte, Suchprofile, Nachrichten,
Dokumente). Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.

**Zustimmung zu den Nutzungsbedingungen:** Bei der Registrierung speichern wir, welcher Fassung der Nutzungsbedingungen Sie zugestimmt
haben (Fassungskennung, Prüfsumme), wann und über welchen Weg. Die Datenschutzerklärung nehmen Sie nur zur Kenntnis; das ist keine
Einwilligung. Rechtsgrundlage: Art. 6 Abs. 1 lit. b und f DSGVO (Nachweis des Vertragsinhalts).
[[TECHNIK: `src/app/api/auth/registrieren/route.js` speichert das heute nicht – siehe `../ZUSTIMMUNGSPROTOKOLL.md`.]]

**Eingeladene Rollen:** Gutachter und Planer, Energieversorger und Banken erhalten Zugang nur auf Einladung zu einem konkreten Auftrag.
Wir speichern Einladung (E-Mail, Zeitpunkt, einladende Person) und Zuordnung. Kommunen erhalten die Gemeinde-Sicht erst nach Prüfung;
dort gibt es keine Eigentümer, Flurstücke oder Pachtkonditionen.

**Sicherheit:** Bei Anmeldung und aktiver Sitzung verarbeiten wir Zeitpunkt, IP-Adresse, Browser und Betriebssystem, Anmeldeart, Erfolg
oder Fehlversuch und die letzte Aktivität. Bekannte Geräte erkennen wir über eine zufällige Kennung im Cookie (bei uns nur als Hash).
Das Geheimnis der Zwei-Faktor-Anmeldung speichern wir verschlüsselt, Wiederherstellungscodes als Hash. Ist die Passwortprüfung aktiv,
verlassen nur die ersten fünf Zeichen eines Hash-Werts unseren Server („Have I Been Pwned“). Rechtsgrundlage: Art. 6 Abs. 1 lit. b und f
DSGVO. Sicherheitsmeldungen (neues Gerät, Sperre) lassen sich nicht abbestellen.

**Organisationen und Teams:** eingeladene E-Mail, Teamrolle, Zeitpunkt, einladende Person, Annahme oder Austritt
(Art. 6 Abs. 1 lit. b DSGVO gegenüber der Organisation, lit. f gegenüber eingeladenen Personen).

**Benachrichtigungen:** Hinweise im Portal und – je nach Einstellung – per E-Mail. E-Mails enthalten keine Nachrichtentexte und keine
vertraulichen Projektdaten. Pflicht-E-Mails (Adressbestätigung, Passwort, Anmelde-Link, Sicherheit, Signatur-Codes) versenden wir immer
(lit. b). Versand über [[INHABER: Mailanbieter, Sitz, Standort; AV-Vertrag]].

**Kundenverwaltung und Aktivitätsprotokoll:** Kontakte aus Anfragen, Registrierungen, Veranstaltungen oder öffentlichen Quellen
(Gemeinden, Behörden, Netzbetreiber) führen wir mit Aktivitäten und Wiedervorlagen. Regeln helfen bei der Priorisierung; sie entscheiden
nicht über Sie. Wichtige Aktionen (Statuswechsel, Freigaben, Downloads, Exporte) speichern wir in einem gegen Veränderung gesicherten
Protokoll (Hash-Kette). Rechtsgrundlage: Art. 6 Abs. 1 lit. b und f DSGVO.
[[PRÜFEN P-14: Verhältnis unveränderliche Hash-Kette ↔ Löschpflicht (Art. 17) – Pseudonymisierung der Personenbezüge im Protokoll?]]

**Termine:** Name, E-Mail, ggf. Telefon (beim Rückruf), Firma bzw. Gemeinde, PLZ, Ort, Terminart, Zeitpunkt, Nachricht, zuständige Person.
Sie erhalten Bestätigung, Kalenderdatei und Erinnerung. Der persönliche Verwaltungslink wirkt wie ein Schlüssel – bitte nicht weiterleiten.
Videotermine über [[INHABER: Videokonferenzdienst, Anbieter, Standort]]. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.

**Support:** Tickets mit Betreff, Beschreibung, Anhängen, Verlauf, Zuständigkeit und internen Notizen (lit. b).

**Dokumente:** Uploads speichern wir außerhalb des öffentlich erreichbaren Bereichs; der Dateityp wird geprüft. Unterlagen der
Identitätsprüfung liegen verschlüsselt und getrennt.

**Export und Löschung:** Im Profil können Sie Ihre Daten als Datei (JSON) exportieren und Ihr Konto löschen. Die Löschung anonymisiert
Ihre Angaben; Unterlagen mit Aufbewahrungspflicht bleiben gesperrt, bis die Frist abläuft.

## 6. Projektbörse, Vertraulichkeit, Signatur und Closing

Öffentlich sind nur anonymisierte Exposé-Teaser. Details gibt es nach Anmeldung und Vertraulichkeitsvereinbarung (NDA).

- **NDA- und Provisionsprotokoll:** Name, Firma, E-Mail, Projekt, Fassung des Textes, Zeitpunkt, IP-Adresse (lit. b und f – Nachweis).
- **Datenraum:** welches Konto wann welche Unterlage aufgerufen oder heruntergeladen hat (lit. f – Schutz vertraulicher Unterlagen).
- **Kennzeichnung:** vertrauliche Exposés und Downloads tragen Empfänger und Datum.
- **Deal-Room:** Fragen, Antworten und Gebote moderiert das Backoffice. Bis zur Kontaktfreigabe erscheinen Investoren pseudonym.
  E-Mail-Adressen, Links und Telefonnummern entfernen wir automatisch aus Freitexten; das Original sieht nur das Backoffice.
  Gebote sind verdeckt.
- **Weitergabe:** Nach Interesse bzw. NDA erfährt der Anbieter Name, Firma und Kontaktdaten des Investors, soweit für die Anbahnung nötig –
  im Deal-Room erst mit Kontaktfreigabe (lit. b).
- **Daten Dritter in Projektunterlagen** (z. B. Grundstückseigentümer): Anbieter dürfen sie nur einstellen, wenn sie dazu berechtigt sind,
  und schwärzen sie soweit möglich.

**Elektronische Unterschrift (einfache elektronische Signatur, kein externer Dienst):** Name und E-Mail der Unterzeichnenden,
Unterschriftsbild oder getippter Name, Bestätigungscode per E-Mail, Zustimmungstext, Zeitpunkt, IP-Adresse, Browser, Prüfsummen (SHA-256)
des Dokuments vor und nach jeder Unterschrift. Das signierte Dokument erhält eine Prüfseite mit diesen Angaben, die alle Unterzeichnenden
und rechtmäßige spätere Empfänger (z. B. Notar, Bank) sehen (lit. b und f).

**Closing, Grundbuch, Dienstbarkeiten:** Closing-Raum mit Kaufpreis, Meilensteinen, Bedingungen, Nachweisen und Notartermin; Grundbuch-Akte
je Grundstück bzw. Dach mit Eigentümern, Belastungen und Vertragsstand. Empfänger: andere Vertragspartei, Notar bzw. Urkundsperson,
Treuhänder, Grundbuchgericht bzw. -amt, betroffene Pfandgläubiger, finanzierende Bank (lit. b und c).

## 7. Rechner und Werkzeuge

Die Rechner rechnen **in Ihrem Browser**; Ihre Eingaben werden nicht an uns übertragen. Ausnahme: Sie senden ein Ergebnis ausdrücklich mit
einer Anfrage (Abschnitt 4) oder teilen es per Link (Abschnitt 3). Im Portal gespeicherte Bewertungen und Finanzierungsszenarien sind nur
Ihrem Konto zugeordnet (lit. b).

## 8. KI-Assistent im Portal

> **Stand dieses Entwurfs:** Der KI-Modus mit personenbezogenen Daten ist **abgeschaltet**, bis Auftragsverarbeitungsvertrag und
> Drittlandgrundlage feststehen (Masterplan S0 Nr. 5). Bis dahin arbeitet der Assistent regelbasiert; Ihre Angaben verlassen die
> Plattform nicht. Den folgenden Text erst mit der Aktivierung veröffentlichen. [[TECHNIK: Abschaltung im Code belegen, z. B. Fall `triage` ohne API-Schlüssel.]]

*Text für den Fall der Aktivierung:*

Im Portal können Sie optional einen Assistenten nutzen (Exposé-Entwurf, Zusammenfassung, Fragen zu freigegebenen Unterlagen,
Erläuterungen zu Ihrer Fläche, Nachrichtenentwurf). **Sie arbeiten dabei mit einem KI-System;** Ergebnisse sind als KI-Entwurf
gekennzeichnet und werden von einem Menschen geprüft. [[PRÜFEN P-15: Transparenzpflichten Art. 50 KI-VO – Geltungsbeginn und Umfang für diese Fälle]]

Für die gewählte Aufgabe übermitteln wir die nötigen, für Sie freigegebenen Angaben (Projektdaten, Flächenangaben, Nachrichtenverlauf
zum Vorgang, Ihre Frage) an Anthropic ([[INHABER/PRÜFEN P-16: vertragschließende Gesellschaft und Anschrift laut AV-Vertrag]]) als Auftragsverarbeiter.
[[PRÜFEN P-16: Vertragspartner bei Anthropic für EU-Kunden (ggf. EU-Gesellschaft), Anschrift und AV-Vertrag am Original prüfen]]

- **Verarbeitungsort:** Die Verarbeitung kann in den USA und in anderen Staaten stattfinden. [[INHABER/TECHNIK: Ist eine Datenresidenz (z. B. EU) vertraglich bzw. per Einstellung festgelegt? Sonst Satz so lassen.]]
- **Drittlandgrundlage:** [[PRÜFEN P-17: Nach einer Sekundärquelle ist Anthropic nicht unter dem EU-US Data Privacy Framework zertifiziert und stützt sich auf Standardvertragsklauseln. DPF-Liste und DPA am Original prüfen; dann „Standardvertragsklauseln nach Art. 46 Abs. 2 lit. c DSGVO“ oder „Angemessenheitsbeschluss Art. 45 DSGVO“ einsetzen; Transfer-Folgenabschätzung dokumentieren.]]
- **Kontaktdaten:** Wir übermitteln keine E-Mail-Adressen, Telefonnummern oder IP-Adressen aus Ihrem Konto. **Stehen solche Angaben in
  einem Freitext** (z. B. in einer Nachricht), können sie mit übermittelt werden, sofern sie nicht vorher automatisch entfernt werden.
  [[TECHNIK: Maskierung für E-Mail, Telefon, IBAN in `src/lib/plattform/ki/kontext.js` umsetzen; dann Satz entsprechend anpassen.]]
- **Rechtsgrundlage:** Art. 6 Abs. 1 lit. b DSGVO (gewünschte Funktion). [[PRÜFEN P-18: Für die Triage von Anfragen durch das Backoffice eher lit. f – oder Einwilligung? Triage mit Lead-Daten nur nach Freigabe.]]
- **Keine automatisierte Entscheidung** im Sinne von Art. 22 DSGVO.
- **Protokoll:** Konto, Zeitpunkt, Funktion, Objekt, Verbrauchswerte – keine Fragen, Eingaben oder Antworten. Zweck: Missbrauchsschutz,
  Kontingent, Kosten. Speicherdauer: [[INHABER: z. B. 12 Monate]].

## 9. Identitäts-, Firmen- und Bonitätsprüfung

**KYC/KYB:** Vor Datenraum, Absichtserklärung, Gebot, Veröffentlichung, Auszahlung oder Contracting prüfen wir Identität bzw. Unternehmen,
wirtschaftlich Berechtigte, Stellung als politisch exponierte Person und Sanktionslisten. Verarbeitet werden Name, Geburtsdatum und -ort,
Staatsangehörigkeit, Anschrift, Ausweisdaten und -kopie (bitte nicht benötigte Angaben schwärzen), Registerauszüge, Angaben zu
Berechtigten und Vertretern, Mittelherkunft, Bankverbindung, Eigentumsnachweise. Bei der maschinenlesbaren Zone (MRZ) prüfen wir
Prüfziffern, Gültigkeit und Volljährigkeit; es gibt keine Bilderkennung. Beim Videogespräch mit der Compliance zeichnen wir weder Bild
noch Ton auf; wir protokollieren die Prüfschritte. Videodienst: [[INHABER: Werkzeug, Anbieter, Speicherort]].

Rechtsgrundlage: Art. 6 Abs. 1 lit. c DSGVO, soweit wir geldwäscherechtlich verpflichtet sind [[PRÜFEN P-13]]; sonst lit. b
(Vertragsanbahnung, Auszahlung) und lit. f (Betrugs- und Geldwäscheprävention auf der Plattform). Empfänger: Compliance-Mitarbeitende,
technischer Dienstleister, ggf. Identifizierungsanbieter, bei gesetzlicher Pflicht Behörden. Speicherung verschlüsselt, Zugriffe
protokolliert. Der Sanktionsabgleich liefert nur Hinweise; es entscheidet ein Mensch.

**Online-Identifizierung (falls angeboten):** über [[INHABER: Identifizierungsanbieter, Sitz, Speicherort, Link zu dessen Datenschutzhinweisen]].
Der Gesichtsabgleich verarbeitet **biometrische Daten** und findet nur mit Ihrer **ausdrücklichen Einwilligung** statt
(Art. 9 Abs. 2 lit. a DSGVO); ohne Einwilligung bleibt die Prüfung mit Ausweiskopie. [[PRÜFEN P-19: Rolle des Anbieters (Auftragsverarbeiter / eigener Verantwortlicher) und Drittlandbezug]]

**Bonität:** Vor Absichtserklärung, verbindlichem Gebot oder Vertrag mit Ausfallrisiko kann das Backoffice eine Auskunft einholen
(Firma, Anschrift, Registernummer; bei Einzelunternehmen auch Name, Anschrift, Geburtsdatum). Auskunfteien: [[INHABER: z. B. KSV1870 (AT), Creditreform (DE), CRIF (DACH) – festlegen]].
Wir informieren Sie vorher. Es entscheidet ein Mensch mit Begründung; Sie können Ihren Standpunkt darlegen (lit. f bzw. b; keine
Entscheidung nach Art. 22 DSGVO).

**Register:** Abrufe aus Firmenbuch (AT), Handels- und Unternehmensregister (DE), Zefix/UID-Register (CH) und – soweit berechtigt –
Registern der wirtschaftlichen Eigentümer (lit. c bzw. f; Herkunft Art. 14 Abs. 2 lit. f DSGVO). Verrechnungsstelle: [[INHABER]].

## 10. Flächenakquise: Geodaten, Grundbuch, Brief

Wir werten **öffentliche Geodaten ohne Personenbezug** aus (Kataster ohne Eigentümer, Schläge, Gelände, Schutzgebiete, Abstände,
Netzentfernung). Ist eine Fläche geeignet, ermitteln wir die Eigentümer über eine **Grundbuchabfrage nach dem Grundstück**, nie nach
einer Person, nur über den amtlichen Zugang bzw. eine Verrechnungsstelle ([[INHABER: Zugangsweg je Land]]) und nur soweit das Recht des
Landes die Einsicht erlaubt (siehe Länderteile). Jede Abfrage protokollieren wir mit Zweck, Person und Grundstück.

**Zweck:** ein einmaliger Brief mit dem Angebot, die Fläche für eine Solaranlage zu nutzen. **Rechtsgrundlage:** Art. 6 Abs. 1 lit. f DSGVO
(Standortsuche für erneuerbare Energie, Direktansprache). [[PRÜFEN P-21: Interessenabwägung je Land dokumentiert?]]
Der Brief enthält die Angaben nach Art. 14 DSGVO einschließlich der **Herkunft (Grundbuch)** und einen deutlichen Hinweis auf Ihr
Widerspruchsrecht.

- Wir schreiben **einmal per Brief**; ohne Rückmeldung folgt nichts.
- Anrufe, E-Mails oder SMS nur mit Ihrer **vorherigen Einwilligung**.
- **Widerspruch** jederzeit ohne Begründung (Art. 21 Abs. 2 DSGVO), formlos. Dann Sperrliste mit nur Name, Anschrift, Grundstücksbezug, Datum.
- Ohne Rückmeldung löschen wir die Eigentümerdaten 12 Monate nach dem Brief.

## 11. Energiebeschaffung, Finanzierung, Monitoring, Abrechnung, Projektentwicklung

**Energiebeschaffung:** Abnahmestellen (Anschrift, Markt- bzw. Messlokation/Zählpunkt, Netzbetreiber, Spannungsebene, Messart), Verbrauch,
Lastgang, eigene PV und Speicher, laufende Verträge, Angebote, Freigaben. Die Beschaffungsvollmacht speichern wir mit Fassung, Zeitpunkt,
IP-Adresse und Browser. Versorger erhalten in der Angebotsphase **nur anonymisierte Kennzahlen** (Los, gerundete Werte, normiertes Profil,
Land, Spannungsebene, Messart); Firma, Anschrift und Lokations-IDs erhält nur der bezuschlagte Versorger nach Ihrer Freigabe (lit. b).

**Finanzierung eigener Projekte:** Das Bankenpaket an die angefragten Banken kann Daten von Flächen- und Dacheigentümern und
Vertragspartnern enthalten; wir geben nur weiter, was für Kreditentscheidung und Besicherung nötig ist, und schwärzen den Rest
(lit. f bzw. b). Banken sind eigene Verantwortliche.

**Monitoring im Contracting:** Erzeugung, Zählerstände, Verbrauch vor Ort, Speicherwerte, Störungen; Abrechnung nur aus geeichten Zählern
(lit. b). Messdaten-Server: [[INHABER: Betreiber und Standort]].

**Abrechnung und Auszahlung:** Name bzw. Firma, Anschrift, UID, Vertragsdaten, Beträge, Zahlungsstatus, Bankverbindung (nur aus der
geprüften Verifizierung). Auszahlungen als SEPA-Datei über unsere Bank (lit. b und c).

**Projektentwicklung:** Projektakten mit Daten von Eigentümern, Behörden, Gemeinden, Netzbetreibern, Gutachtern und Planern (lit. b und f).

## 12. Live-Strommarktdaten

Marktdaten (z. B. „Energie live“) laden wir **serverseitig**. Ihr Browser verbindet sich dafür nicht mit den Datenquellen; es gehen keine
Daten von Ihnen an diese Quellen. [[TECHNIK: Quellen laut Paket zu `/energie-live` (SMARD/Energy-Charts) aktuell halten.]]

## 13. Cookies, Einwilligungsverwaltung und Statistik

**Technisch notwendig (ohne Einwilligung):** Sitzung (`oi_sitzung`, bis 7 Tage bzw. Abmeldung), Zwei-Faktor-Zwischenschritt (`oi_2fa`,
5 Minuten), Gerätekennung (`oi_geraet`, höchstens 400 Tage), gespeicherte Cookie-Auswahl (12 Monate). Im Betrieb tragen die Portal-Cookies
das Präfix `__Host-`. Rechtsgrundlage für den Zugriff auf Ihr Endgerät siehe Länderteil; für die Verarbeitung Art. 6 Abs. 1 lit. b bzw. f
DSGVO. [[TECHNIK: Namen, Laufzeiten und Speicherort der Cookie-Auswahl mit `src/components/Cookies` und `src/lib/ereignis/einwilligung.js` abgleichen.]]

**Ihre Auswahl:** Wir speichern Fassung und Zeitpunkt Ihrer Auswahl (derzeit Fassung `2026-10-w1b`). Ändern oder widerrufen können Sie
sie jederzeit über „Privatsphäre-Einstellungen“ im Fußbereich.

**Statistik (nur mit Einwilligung):** Google Analytics 4 der Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland.
Vor Ihrer Einwilligung lädt kein Skript. Erfasst werden aufgerufene öffentliche Seiten, Verweildauer, Herkunft (z. B. Kampagne), Gerät,
Browser, ungefährer Standort und Ereignisse wie „Rechnerergebnis angezeigt“ oder „Anfrage gesendet“ (ohne Inhalte). **Gemessen werden
nur öffentliche Seiten** – nie Portal, Anmeldung, Einladungen oder persönliche Links. Von Adressparametern übernehmen wir nur `utm_*`.
Google Signals und Werbefunktionen sind aus. Cookies `_ga`, `_ga_*` bis 2 Jahre; Ereignisdaten in Google Analytics höchstens
[[INHABER: 2 oder 14 Monate – Einstellung in GA4 prüfen]]. Beim Widerruf stoppen wir die Messung und löschen die Cookies.
Eine Übermittlung an Google LLC in den USA ist möglich; Google LLC ist nach dem EU-US Data Privacy Framework zertifiziert (Art. 45 DSGVO).
[[PRÜFEN P-22: DPF-Zertifizierung Google LLC am Tag der Freigabe prüfen; Masterplan E12 sieht Wechsel zu Matomo vor – dann Abschnitt neu fassen.]]

Eine Kategorie „Karten“ gibt es derzeit nicht; Kartendienste Dritter sind nicht eingebunden. [[TECHNIK: bestätigen]]

## 14. Empfänger, Auftragsverarbeiter, Drittländer

Daten erhalten nur Stellen, die sie für den Zweck brauchen. Auftragsverarbeiter setzen wir nur mit Vertrag nach Art. 28 DSGVO ein.

| Kategorie | Anbieter | Rolle |
|---|---|---|
| ERP- und Portalsystem (Frappe) | [[INHABER: Betreiber, Standort]] | Auftragsverarbeiter |
| Website-Hosting | [[INHABER]] | Auftragsverarbeiter |
| E-Mail-Versand | [[INHABER]] | Auftragsverarbeiter |
| Datensicherung | [[INHABER: Anbieter, Standort, verschlüsselt]] | Auftragsverarbeiter |
| Geodaten- und Messdaten-Dienst | [[INHABER]] | Auftragsverarbeiter |
| KI-Assistent | Anthropic (nur bei aktivem KI-Modus, Abschnitt 8) | Auftragsverarbeiter |
| Online-Identifizierung | [[INHABER]] | [[PRÜFEN P-19]] |
| Videokonferenz | [[INHABER]] | Auftragsverarbeiter |
| Statistik | Google Ireland Limited (nur mit Einwilligung) | [[PRÜFEN P-22: Auftragsverarbeiter oder eigene Verantwortung?]] |

**Eigenständig Verantwortliche:** Gesellschaften der ÖKOVOLT Gruppe und Projektgesellschaften (soweit beteiligt), Anbieter und Investoren
der Projektbörse, bezuschlagte Energieversorger, Banken, Gutachter und Planer, Auskunfteien, Registerstellen, Notare, Treuhänder,
Grundbuchgerichte, Netz- und Messstellenbetreiber, Förderstellen, Steuerberatung, Wirtschaftsprüfung, Rechtsberatung, Behörden.

**Drittländer:** Übermittlungen außerhalb des EWR nur wie beschrieben (Statistik, KI-Assistent, ggf. Identifizierungsanbieter).
Für die Schweiz besteht ein Angemessenheitsbeschluss der EU-Kommission. Hinweise für Personen in der Schweiz: `30-land-ch.md`.

## 15. Speicherdauer

| Daten | Speicherdauer |
|---|---|
| Server-Logdaten | [[INHABER: z. B. 14 Tage]]; bei Sicherheitsvorfällen bis zur Klärung |
| Anfragen ohne Vertrag | bis 3 Jahre nach der letzten Kommunikation, sofern Sie nicht früher Löschung verlangen [[PRÜFEN P-23: Frist begründen]] |
| **Nachweis eines Hinweises oder einer Einwilligung** (Fassung, Prüfsumme, Zeitpunkt, Kanal – ohne Anfrageinhalt) | getrennt vom Vorgang: Einwilligung in Telefonwerbung in DE **5 Jahre ab Erteilung und nach jeder Verwendung** (§ 7a UWG); sonst [[PRÜFEN P-24: bis 3 Jahre nach Widerruf bzw. Ende der Nutzung?]] |
| Portal-Konto | Dauer der Registrierung; nach Löschung binnen 30 Tagen, soweit keine Aufbewahrungspflicht |
| Zustimmung zu Nutzungsbedingungen (Fassung, Zeitpunkt) | Dauer des Nutzungsvertrags zzgl. Verjährungsfristen [[PRÜFEN P-24]] |
| Beendete Sitzungen, nicht angenommene Einladungen | 30 Tage |
| Anmeldehistorie | 180 Tage |
| Benachrichtigungen | gelesen 12 Monate, sonst höchstens 24 Monate |
| NDA-Protokolle, Datenraum-Zugriffe | Dauer der Vertraulichkeitspflicht zzgl. Verjährungsfristen |
| Signaturprotokolle, signierte Dokumente | solange das Dokument aufzubewahren ist |
| Termine | 12 Monate nach dem Termin, soweit kein Vorgang entsteht |
| Support-Tickets | 3 Jahre nach Abschluss, soweit nicht vertragsbezogen |
| KI-Protokoll (ohne Inhalte) | [[INHABER: z. B. 12 Monate]] |
| KYC/KYB | 5 Jahre ab Ende der Geschäftsbeziehung [[PRÜFEN P-13: je Land und Verpflichtetenstellung]] |
| Bonitätsauskünfte | [[INHABER: Frist im Löschkonzept]] |
| Akquise ohne Rückmeldung / Sperrliste | 12 Monate nach dem Brief / solange zur Beachtung des Widerspruchs nötig |
| Energiebeschaffung, Bankenpaket | Dauer des Auftrags bzw. der Finanzierung zzgl. Verjährungsfristen |
| Messdaten | [[INHABER: z. B. hochaufgelöst 24 Monate, verdichtet Vertragslaufzeit]] |
| Buchhaltung, Rechnungen, Verträge | AT 7 Jahre (§ 132 BAO, § 212 UGB), bei Grundstücksbezug länger; DE bis 10 Jahre (§ 147 AO, § 257 HGB); CH 10 Jahre (Art. 958f OR) [[PRÜFEN P-25: Fristen und Geltung für die AT-Gesellschaft gegenüber DE/CH-Partnern]] |
| Cookie-Auswahl | 12 Monate |
| Google-Analytics-Cookies | bis 2 Jahre bzw. bis zum Widerruf |

[[TECHNIK: Werte mit `site_config` „oekoinvest_loeschfristen“ und `src/lib/plattform/compliance/vvt.js` abgleichen.]]

## 16. Ihre Rechte

Sie haben das Recht auf Auskunft (Art. 15), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung (Art. 18), Datenübertragbarkeit
(Art. 20), **Widerspruch** gegen Verarbeitungen aus berechtigtem Interesse (Art. 21 Abs. 1) und **jederzeit gegen Direktwerbung**,
auch gegen den Akquisebrief (Art. 21 Abs. 2), sowie auf Widerruf von Einwilligungen (Art. 7 Abs. 3 DSGVO). Wir antworten innerhalb eines
Monats (Art. 12 Abs. 3 DSGVO). Schreiben Sie an den Datenschutzkontakt (Abschnitt 1). Zur Prüfung Ihrer Identität können wir Nachweise
verlangen. Im Portal können Sie Daten selbst exportieren und Ihr Konto löschen.

## 17. Beschwerde bei einer Aufsichtsbehörde

Für uns zuständig ist die **Österreichische Datenschutzbehörde**, Barichgasse 40–42, 1030 Wien, dsb@dsb.gv.at, www.dsb.gv.at.
Sie können sich auch an die Aufsichtsbehörde Ihres Aufenthaltsorts, Arbeitsplatzes oder des Orts des Verstoßes wenden (Art. 77 DSGVO);
siehe Länderteile.

## 18. Pflicht zur Bereitstellung, keine automatisierten Entscheidungen

Die Website können Sie ohne Angaben nutzen. Für Anfragen, Portal und Projektbörse brauchen wir die Pflichtfelder. Automatisierte
Entscheidungen einschließlich Profiling nach Art. 22 DSGVO finden nicht statt. Werte wie Passungswert, Flächenbewertung, Priorität,
Sanktionstreffer, Bonitätsindex oder Wechselempfehlung sind Hinweise für Menschen; Entscheidungen mit rechtlicher oder ähnlich
erheblicher Wirkung trifft stets ein Mitarbeitender.

## 19. Hinweisgebersystem

Für Meldungen nach dem Hinweisgeberschutzrecht gilt ein eigener Datenschutzhinweis (siehe `/hinweisgeber`).

## 20. Änderungen und Fassungen

Wir passen diese Erklärung an, wenn sich Angebote oder Recht ändern. Jede Fassung hat eine Kennung und ein Datum; frühere Fassungen
stellen wir im Archiv bereit. [[TECHNIK: Archiv früherer Fassungen anlegen (Masterplan, Initiative „Rechtstexte-Zentrale“).]]

Fassung: `DSE-ENTWURF-2026-10-03` · Stand: [[INHABER: Datum der Freigabe]]
