# Anwaltsdossier – Paket Impressum/DSGVO (Gesamtprüfung Oktober 2026)

Interne Vorprüfung der Rechtsabteilung (Anordnung des Inhabers vom 03.10.2026). KEINE Rechtsberatung –
alle Punkte sind durch die externen Kanzleien (Strang R) zu entscheiden. Geprüft wurden Impressum,
Datenschutzerklärung, Cookie-Banner/Google Analytics und die Erklärung zur Barrierefreiheit, jeweils im
gerenderten Zustand (Dev-Server, DE/AT/CH- und EN-Fassungen) und im Quellcode.

Direkt behobene Punkte (gleicher Stand, siehe Git-Diff): fehlende Abschnitte der Datenschutzerklärung zu
Bericht-Baustein (5a), Newsletter (5b), Karten im Flächenpass (9a) und Partner-Widgets (in Abschnitt 4),
drei neue Zeilen in der Speicherfristen-Tabelle, Korrektur der falschen Aussage zur Karten-Kategorie
„Funktional“ in Abschnitt 10, Geltungsbereich der Barrierefreiheitserklärung um die Welle-3/4-Werkzeuge
ergänzt – alles deutsch und englisch, neue Passagen als „[Entwurf · Prüfung Rechtsabteilung]“ markiert.

Punkte je Risikostufe: **hoch 3 · mittel 9 · niedrig 5 = 17**

## Risiko HOCH

### H1. Offene Platzhalter und fehlende AV-Verträge in der Datenschutzerklärung
- Fundstelle: /datenschutz (src/app/(stamm)/datenschutz/page.js, src/components/Rechtstexte/DatenschutzEn.js) – sichtbare Platzhalter: Hosting (Abschn. 3), ERP-Betreiber/Standort (12), Mailanbieter (6c/12), Backup (12), Videokonferenzdienst (6e/8b), Identitätsanbieter (8c), Auskunfteien (8d), Verrechnungsstellen Grundbuch/Firmenbuch (8e/8f), Messdaten-Server (8i), zwei Speicherfristen (13).
- Problem: Vor Livegang verletzen offene Empfänger-/Fristenangaben Art. 13/14 DSGVO; AV-Verträge (Art. 28) sind noch nicht geschlossen (bewusst nur als Pflicht formuliert).
- Risiko: hoch (bei Livegang). Vorschlag: Anbieterliste final festlegen, AVV schließen, Platzhalter ersetzen; bis dahin kein Livegang (deckt sich mit GO-LIVE.md).
- Rechtsgebiet: Datenschutz. Land: DE/AT/CH.

### H2. GwG-Verpflichtetenstellung und Rechtsgrundlage der KYC/KYB-Prüfung
- Fundstelle: /datenschutz Abschn. 8b („Art. 6 Abs. 1 lit. c … soweit wir dazu verpflichtet sind“), 5-Jahres-Frist in Abschn. 13.
- Problem: Ob die ÖkoInvest GmbH Verpflichtete nach FM-GwG (AT) bzw. GwG (DE) ist, ist ungeklärt (Hinweis auch im Dateikopf). Davon hängen Rechtsgrundlage, Umfang (PEP/Sanktionen) und die 5-Jahres-Speicherfrist ab; ohne Verpflichtetenstellung wäre lit. c unzutreffend und der Umfang an lit. b/f zu messen.
- Risiko: hoch. Vorschlag: Kanzlei-Gutachten zur Verpflichtetenstellung je Land; Text in 8b entsprechend festziehen.
- Rechtsgebiet: Geldwäscherecht/Datenschutz. Land: AT/DE (CH analog GwG-CH).

### H3. Biometrische Online-Identifizierung (Art. 9 DSGVO)
- Fundstelle: /datenschutz Abschn. 8c; Platzhalter Anbieter und Rollenverteilung.
- Problem: Gesichtsabgleich = biometrische Daten; Einwilligungs-Flow, Rollenverteilung (Art. 26/28), Drittlandtransfer und die Datenschutzhinweise des Anbieters sind offen. Falsche Einordnung wäre ein Art.-9-Verstoß.
- Risiko: hoch (sobald Funktion aktiv). Vorschlag: Anbieter wählen, Vertrag und Rollen klären, Einwilligungstext von Kanzlei freigeben; bis dahin Funktion nicht aktivieren.
- Rechtsgebiet: Datenschutz. Land: DE/AT/CH.

## Risiko MITTEL

### M1. ePrivacy-Zitate je Land (TKG 2021 vs. § 25 TDDDG vs. CH)
- Fundstelle: /datenschutz Abschn. 10 (nur § 165 Abs. 3 TKG 2021), Länder-/Sprachwahl zitiert zusätzlich § 25 Abs. 2 Nr. 2 TDDDG.
- Problem: Für Endgeräte in Deutschland gilt § 25 TDDDG (Marktort), für die Schweiz keines von beiden. Die Zitatlogik (welches Recht für welchen Besucher) muss die Kanzlei festlegen – auch für Consent-Cookie und Google Analytics.
- Vorschlag: einheitliche Formulierung „§ 165 Abs. 3 TKG 2021 bzw. § 25 TDDDG“ in Abschn. 10 oder landesspezifischer Text.
- Rechtsgebiet: Datenschutz/ePrivacy. Land: DE/AT/CH.

### M2. Schweizer revDSG nirgends erwähnt
- Fundstelle: /datenschutz gesamt (nur DSGVO und öst. DSG genannt); CH-Länderfassung /ch wird aktiv beworben.
- Problem: Bei Ausrichtung auf die Schweiz gilt das revDSG; Informationspflichten (Art. 19 ff.), ggf. Vertretung in der Schweiz (Art. 14 revDSG) und die Nennung des EDÖB als Behörde (bisher nur im Beschwerdeteil) sind zu prüfen. Masterplan S0 Punkt 5 nennt revDSG ausdrücklich als offen.
- Vorschlag: kurzer revDSG-Abschnitt bzw. Klammerzusätze; Prüfung Vertretungspflicht.
- Rechtsgebiet: Datenschutz. Land: CH.

### M3. § 25 MedienG: mittelbare Beteiligungen
- Fundstelle: /impressum „Offenlegung nach § 25 Mediengesetz“; src/data/site.js (Gesellschafter AW Holding GmbH, PV GmbH, Photonos GmbH, Ökovolt Solartechnik GmbH).
- Problem: § 25 Abs. 2 MedienG verlangt bei Beteiligungen auch Angaben zu mittelbaren Beteiligten (Gesellschafter der Gesellschafter, Treuhandverhältnisse). Ob die Kette offenzulegen ist, ist zu entscheiden; Daten liegen nicht vor.
- Vorschlag: Firmenbuchauszüge der vier Gesellschafter einholen, Offenlegung ggf. ergänzen.
- Rechtsgebiet: Medienrecht. Land: AT.

### M4. Verbraucherschlichtung (AStG) und OS-Plattform-Passus
- Fundstelle: /impressum „Online-Streitbeilegung und Verbraucherschlichtung“.
- Problem: Aussage „nicht verpflichtet … nehmen grundsätzlich nicht teil“ ist eine Entscheidung des Inhabers (offener Punkt UEBERGABE.md). B2C-Berührungen bestehen (Newsletter, Bericht-Baustein, Genossenschaft, private Flächeneigentümer/Investoren); Hinweispflichten nach AStG/VSBG (DE: § 36 VSBG ab 10 Beschäftigten) prüfen.
- Vorschlag: Teilnahmebereitschaft entscheiden; DE-Hinweis nach § 36/37 VSBG ergänzen oder verneinen.
- Rechtsgebiet: Verbraucherrecht. Land: AT/DE.

### M5. Impressumspflichten bei Ausrichtung auf DE und CH
- Fundstelle: /impressum (nur ECG/UGB/MedienG genannt).
- Problem: Für die DE-Ausrichtung stellt sich die Frage, ob das ECG-Herkunftslandprinzip genügt oder § 5 DDG zusätzliche Angaben verlangt; für die Schweiz Art. 3 Abs. 1 lit. s UWG (Angaben bei elektronischem Geschäftsverkehr – Portal/Registrierung könnten darunter fallen).
- Vorschlag: Kanzlei-Kurzprüfung je Land; Angaben sind inhaltlich weitgehend vorhanden, ggf. nur Zitate ergänzen.
- Rechtsgebiet: E-Commerce-/Lauterkeitsrecht. Land: DE/CH.

### M6. Kammer, Aufsichtsbehörde, Gewerbeberechtigungen unbestätigt
- Fundstelle: src/data/site.js (kammer, aufsichtsbehoerde, berufsrecht – „abgeleitet aus dem Sitz“); /impressum „Unternehmensangaben“.
- Problem: § 5 Abs. 1 Z 4–6 ECG verlangt zutreffende Angaben zu Aufsichtsbehörde, Kammer, Fachgruppe und anwendbaren gewerberechtlichen Vorschriften; derzeit Ableitung ohne Beleg, Fachgruppe fehlt ganz.
- Vorschlag: GISA-Auszug einholen, Fachgruppe und konkrete Gewerbeberechtigungen eintragen (offener Inhaberpunkt).
- Rechtsgebiet: E-Commerce-/Gewerberecht. Land: AT.

### M7. Neue Entwurfsabschnitte 5a/5b/9a und Widgets-Satz freigeben
- Fundstelle: /datenschutz Abschn. 4 (Widgets), 5a (Bericht), 5b (Newsletter), 9a (Karten), Speicherfristen-Zeilen; EN-Spiegelung.
- Problem: Von der internen Prüfung neu eingefügt (als Entwurf markiert). Offen insbesondere: Rechtsgrundlage der Kartenkachel-Ladung (Einwilligung durch Klick vs. lit. f), Aufbewahrung des Einwilligungs-/Abmeldeprotokolls „zuzüglich Verjährungsfristen“, Formulierung der Widget-Logdaten.
- Vorschlag: Wortlaut-Freigabe durch Kanzlei; Fristen im Löschkonzept (site_config „oekoinvest_loeschfristen“) nachziehen.
- Rechtsgebiet: Datenschutz. Land: DE/AT/CH.

### M8. Pflicht zur Bestellung eines Datenschutzbeauftragten prüfen
- Fundstelle: /datenschutz Abschn. 1 (Datenschutzkontakt = office@, kein DSB).
- Problem: Umfang der Plattform (KYC inkl. Ausweisdaten, Bonität, Monitoring, umfangreiche Protokollierung) könnte eine DSB-Pflicht nach Art. 37 DSGVO begründen; für DE-Niederlassungen gälte zudem § 38 BDSG.
- Vorschlag: Kanzlei-Einschätzung; ggf. DSB bestellen und Kontakt eintragen.
- Rechtsgebiet: Datenschutz. Land: AT (DE nachrangig).

### M9. Barrierefreiheitserklärung: Selbstbewertung und BaFG/BFSG-Konformität
- Fundstelle: /barrierefreiheit (STAND 3. Oktober 2026, „teilweise vereinbar“, nur automatisierter axe-Lauf auf 10 Kernseiten).
- Problem: Vollständige Selbstbewertung (manuelle Tests: Tastatur, Screenreader, 400 % Zoom) fehlt; die Welle-3/4-Seiten sind ungeprüft (Geltungsbereich wurde ergänzt, Bewertungsstand nicht). Formvorgaben der Erklärung nach BaFG-Durchführungsrecht bzw. BFSG prüfen.
- Vorschlag: Selbstbewertung vor Livegang; danach „Stand der Vereinbarkeit“, Einschränkungen und STAND aktualisieren.
- Rechtsgebiet: Barrierefreiheitsrecht. Land: AT/DE.

## Risiko NIEDRIG

### N1. KI-Assistent: Drittlandtransfer-Mechanismus offen
- /datenschutz Abschn. 8a: „[EU-US Data Privacy Framework bzw. Standardvertragsklauseln – wird juristisch festgelegt]“; Anthropic-AVV und DPF-Status vor Aktivierung prüfen. Datenschutz, alle Länder.

### N2. Google-Aussagen am Original verifizieren
- Cookie-Banner (src/components/Cookies/cookiecomponent.js) und /datenschutz Abschn. 11: „IP-Adressen werden nicht gespeichert“ (Quelle support.google.com, 03.10.2026) und aktive DPF-Zertifizierung von Google LLC vor Livegang erneut prüfen (Code-Kommentar vorhanden). Datenschutz, DE/AT/CH.

### N3. Laufzeit der Cookies „land“/„sprache“ (12 Monate)
- /datenschutz Abschn. 10/13, bereits „[Prüfung Rechtsabteilung]“ markiert: Angemessenheit der Laufzeit und Einordnung als „ausdrücklich gewünschte Funktion“ bestätigen. Datenschutz/ePrivacy, DE/AT/CH.

### N4. Abweichung Fließtext/Tabelle beim KI-Protokoll
- /datenschutz Abschn. 8a nennt die 12-Monats-Frist als „[wird festgelegt]“, die Tabelle in Abschn. 13 nennt sie fest (und aufbewahrung.py setzt 365 Tage um). Nach Festlegung Markierung in 8a entfernen. Datenschutz, alle Länder.

### N5. Bild „firmensitz.jpg“ im Impressum-OG
- src/app/(stamm)/impressum/page.js (openGraph): Bild zeigt das Gebäude der Muttergesellschaft in Türkheim (DE); Alt-Text ist korrekt, Dateiname/Verwendung als „Firmensitz“ dennoch prüfen (Irreführungs-Restrisiko). Lauterkeitsrecht, AT/DE.

## Abgleich Text ↔ tatsächliches Verhalten (geprüft, in Ordnung)

- Cookie-Banner: „Weiter ohne Einwilligung“ und „Nur notwendige“ rufen beide handleRejectAll auf; Ablehnen gleichwertig (zwei gleich große Buttons); Version (EINWILLIGUNG_VERSION 2026-10-w1b) und Zeitstempel werden gespeichert; nur Kategorien Essenziell/Statistik – deckt sich mit Masterplan-S0-Korrekturen.
- Google Analytics lädt erst nach Einwilligung (Consent Mode v2 default denied), Positivliste öffentlicher Seiten, Widerruf löscht _ga-Cookies – stimmt mit Abschn. 11 überein.
- Karten im Flächenpass: Zwei-Klick-Lösung real vorhanden (src/components/Flaeche/Flaechenpass/Karte.js), kein Cookie – Datenschutzerklärung jetzt angepasst.
- Newsletter und Bericht-Baustein: echtes Double-Opt-in serverseitig (POST-Bestätigung, Token nur als SHA-256, Antwort ohne Bestands-Auskunft, RFC-8058-Abmeldung) – jetzt in 5a/5b beschrieben.
- Speicherfristen-Tabelle gegen aufbewahrung.py: Benachrichtigungen 365/730 Tage, KI-Protokoll 365, Anfragen ohne Konto 1095 Tage (Anonymisierung) – konsistent; Sitzungen 30/Anmeldehistorie 180 Tage per sicherheit.aufraeumen – konsistent.
- Firmierung/UID/FN: überall aus src/data/site.js (FN 541505g, LG Ried im Innkreis, ATU76000505, Gewerbegebiet 10, 5121 Ostermiething); gerendert geprüft (Impressum DE/EN/AT) – konsistent, keine Abweichungen gefunden.
- EN-Rechtstexte tragen den LegalShell-Hinweis „translation provided for information only … Only the German version is legally binding“ (gerendert geprüft auf /en/impressum, /en/datenschutz, /en/barrierefreiheit).
