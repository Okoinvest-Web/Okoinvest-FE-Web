# Anwaltsdossier – Paket Verträge/Muster/Bedingungen/Lizenzen (Gesamtprüfung Oktober 2026)

Interne Vorprüfung der Rechtsabteilung (Anordnung des Inhabers vom 03.10.2026). KEINE Rechtsberatung –
alle Punkte sind durch die externen Kanzleien (Strang R) zu entscheiden. Geprüft wurden
/nutzungsbedingungen, /bedingungen/projektboerse|energiebeschaffung|lieferanten|banken,
/projektboerse/muster-nda, /kommunen/ratsvorlage, /partner/widgets samt Embed-Routen /widgets/*,
die Strang-R-Entwürfe (docs/strang-r), die Klick-NDA und Provisionsvereinbarung im Portal
(src/lib/plattform/konstanten.js) sowie alle Lizenz- und Attributionsangaben Dritter
(SMARD/Energy-Charts, opendata.swiss/ElCom, BKG/basemap.at/swisstopo/OSM, eigene CC-BY-Downloads,
Bildbestand) – jeweils im gerenderten Zustand (Dev-Server, DE/AT/CH- und EN-Fassungen) und im Quellcode.

Positivbefund vorab: Alle Bedingungs- und Musterseiten tragen sichtbar den Entwurfs-Hinweis
(DE und EN), stehen auf noindex, Platzhalter sind sichtbar markiert; die Länderfassungen des
Muster-NDA zeigen nur ihr Land (gemeinsame Seite alle drei Varianten beschriftet); die CH-Fassung
ist ß-frei; die Werte (Provision 1,5–3 %, 24 Monate Umgehungsschutz) sind zwischen Live-Seiten,
Strang-R-Entwürfen und src/lib/invest/markt.js konsistent; die Widgets sind script- und cookiefrei
mit fest eingebauter Attribution.

Direkt behobener Punkt (siehe Git-Diff): inkonsistente Firmierung „ÖkoInvest-Gruppe“ /
„ÖkoInvest group“ im Lead von /bedingungen/banken → „Finanzierungsanfragen von ÖkoInvest und ihren
Projektgesellschaften“ (deckungsgleich mit § 1 der Bedingungen und § 4 der Nutzungsbedingungen;
die Gruppe firmiert sonst durchgehend als „ÖKOVOLT Gruppe/Group“). Datei:
src/app/(stamm)/bedingungen/banken/page.js (DE- und EN-Lead).

Punkte je Risikostufe: **hoch 6 · mittel 7 · niedrig 4 = 17**

## Risiko HOCH

### V-H1. Entwurfs-AGB werden bei der Registrierung verbindlich akzeptiert, ohne Fassungs-/Zeitpunkt-Speicherung
- Fundstelle: src/components/Plattform/RegistrierFormular.js (Pflicht-Haken „Ich akzeptiere die Nutzungsbedingungen“), /nutzungsbedingungen (ENTWURF = true), docs/strang-r/ZUSTIMMUNGSPROTOKOLL.md (nur Fachvorgabe, nicht umgesetzt – im Code keine Speicherung von AGB-Fassung und Zeitpunkt bei der Registrierung gefunden; Klick-NDA und Beschaffungsvollmacht protokollieren dagegen Version/Zeitpunkt/IP).
- Problem: Einbeziehung von AGB im Entwurfsstatus; ohne Fassung+Zeitstempel kein Nachweis, welche Fassung vereinbart wurde (Masterplan S0 Nr. 6 bestätigt).
- Risiko: hoch. Vorschlag: Zustimmungsprotokoll nach ZUSTIMMUNGSPROTOKOLL.md umsetzen (Code-Paket), Freigabe der Bedingungen vor Produktivbetrieb; bis dahin Demo-/Staging-Betrieb ohne echte Nutzer.
- Rechtsgebiet: Vertragsrecht/AGB. Land: alle.

### V-H2. § 20 Nutzungsbedingungen (Änderungsklausel mit Zustimmungsfiktion) voraussichtlich unwirksam
- Fundstelle: /nutzungsbedingungen § 20; EN § 20 (NutzungsbedingungenEn.js).
- Problem: Zustimmungsfiktion ohne inhaltliche/umfängliche Begrenzung der änderbaren Punkte. AT: § 6 Abs. 1 Z 2, Abs. 2 Z 3 KSchG (Verbraucher: Mitglieder/Bürger, § 4); DE: BGH-Rechtsprechung zu Zustimmungsfiktionsklauseln; Masterplan S0 Nr. 6 stuft § 20 als unwirksam ein. Der Strang-R-Entwurf (00-kern.md) kündigt eine Neufassung an – die Live-Seite hat sie nicht.
- Risiko: hoch. Vorschlag: Kanzlei AT formuliert neu (Begrenzung auf benannte, zumutbare Änderungen; echtes Angebot bei Entgelt-/Leistungsänderungen); Verbraucher/Unternehmer trennen.
- Rechtsgebiet: AGB-Recht. Land: AT (Kern), Abstimmung DE/CH.

### V-H3. § 16 Abs. 3 Nutzungsbedingungen (Haftungsausschluss Verfügbarkeit/Datenverlust) zu weit
- Fundstelle: /nutzungsbedingungen § 16 Abs. 3 („Für Unterbrechungen der Verfügbarkeit, Datenverluste … haften wir nicht“).
- Problem: Pauschaler Ausschluss steht in Spannung zu Abs. 2 (Kardinalpflichten-Vorbehalt) und dürfte als überraschend/zu weit scheitern (AT § 6 Abs. 1 Z 9 KSchG, DE §§ 305c, 307 BGB, CH Art. 8 UWG / Art. 100 OR). Masterplan S0 Nr. 6 stuft Abs. 3 als unwirksam ein.
- Risiko: hoch. Vorschlag: auf „nur nach Abs. 2“ reduzieren oder Verfügbarkeits-/Backup-Zusage mit angemessener Begrenzung; CH-Konsumenten gesondert prüfen.
- Rechtsgebiet: AGB-/Haftungsrecht. Land: alle.

### V-H4. Live-Nutzungsbedingungen und Strang-R-Entwurf laufen auseinander (zwei Fassungen parallel)
- Fundstelle: /nutzungsbedingungen (Stand 30.09.2026, ohne Fassungs-ID) vs. docs/strang-r/nutzungsbedingungen/00-kern.md + Länderteile (03.10.2026, Fassungs-IDs NB-DE/AT/CH-ENTWURF-2026-10-03, konkreter Gerichtsstand, getrennte Verbraucher-/Unternehmerregeln, KI-Transparenzhinweis nach Art. 50 KI-VO, Zustimmungs-Speicherung § 3 Abs. 6).
- Problem: Die Kanzleien prüfen den Entwurf, Nutzer sehen (und akzeptieren, V-H1) die ältere Live-Fassung; der Länderteil fehlt live ganz – § 21 wählt pauschal österreichisches Recht ohne DE-/CH-Hinweise (Art. 6 Rom-I nur rudimentär, Art. 120 IPRG-CH gar nicht adressiert).
- Risiko: hoch (Konsistenz/Einbeziehung). Vorschlag: eine führende Fassung bestimmen; nach Kanzleifreigabe Kern+Länderteil in den Code übernehmen (zweite Prüfperson E6), Fassungs-ID sichtbar auf der Seite.
- Rechtsgebiet: Vertragsrecht/IPR. Land: alle.

### V-H5. Aufsichts- und Maklerrecht der Projektbörse/Provision ungeklärt (Blocker, bestehender P-56/P-60)
- Fundstelle: /nutzungsbedingungen §§ 15, 17; /bedingungen/projektboerse §§ 3–6 (Platzhalter Doppeltätigkeit, Vertragsstrafe, § 15 MaklerG, Bemessungsgrundlage Share Deal, Fälligkeit); Klick-Provisionsvereinbarung src/lib/plattform/konstanten.js.
- Problem: Abgrenzung Vermittlung von Projektrechten/GmbH-Anteilen zu Wertpapier-/Anlagevermittlung (AT: WAG 2018, KMG 2019, AltFG, GewO-Berechtigung Immobilientreuhänder/Vermittler; DE: § 34c GewO, KWG/WpIG; CH: FIDLEG/FINIG) sowie MaklerG-Konformität von Umgehungsschutz (24 Monate, Bindung des Investors ohne eigenen Provisionsvertrag) und optionaler Exklusivität. Ohne Klärung kein Livegang der Börse.
- Risiko: hoch. Vorschlag: Rechtsgutachten je Land vor Livegang (deckt sich mit PRUEFPUNKTE-ANWALT.md P-56, P-60, P-64); Ergebnis bestimmt auch die GwG-Fragen (Dossier Impressum/DSGVO H2).
- Rechtsgebiet: Aufsichtsrecht/Maklerrecht. Land: AT führend, DE/CH.

### V-H6. 18 Bilder ohne Lizenznachweis (Bestandsdokumentation)
- Fundstelle: public/img – 18 Dateien: dach-drohne, firmensitz, floating-pv-montage, floating-pv, freiflaeche-begehung, gewerbedach, investoren-vor-ort, module-raster, module-sonne, montage-freiflaeche, planer-tablet, pv-wind-abend, solarpark-baeume, solarpark-himmel, solarpark-reihen, speicher, team-praesentation, techniker (.jpg). Fünf davon sind og:image der Rechtstext-/Bedingungsseiten (investoren-vor-ort, team-praesentation, pv-wind-abend, solarpark-himmel, planer-tablet).
- Problem: Lizenz-/Urheberstatus offen (Masterplan S0 Nr. 14, UEBERGABE Abschn. 8 „Lizenznachweise für 18 Bilder“ beim Inhaber). Stockfotos als „eigene Parks“ wären zusätzlich UWG-relevant.
- Risiko: hoch (bei Livegang: Urheberrecht, Abmahnung). Vorschlag: Inhaber liefert Lizenz-/Kaufnachweise oder Eigenaufnahmen-Bestätigung je Datei; Nachweisliste ins Repo (ohne Rechnungen); ungeklärte Bilder vor Livegang tauschen. Auftragsgemäß hier nur Bestand dokumentiert, keine Änderung.
- Rechtsgebiet: Urheberrecht/UWG. Land: alle.

## Risiko MITTEL

### V-M1. Einbettungsbedingungen für Partner-Widgets fehlen (Entwurf unten)
- Fundstelle: /partner/widgets („Spielregeln der Einbettung“: Attribution „darf nicht entfernt werden“, Positivliste „auf Wunsch“, Partner-Kennung „nach schriftlicher Abstimmung“) – keine vertragliche Grundlage; Haftung, Verfügbarkeit, Änderungen und Kündigung/Widerruf der Einbettungserlaubnis sind ungeregelt; frame-ancestors * erlaubt derzeit jedermann die Einbettung.
- Problem: Die „Spielregeln“ sind Prosa ohne Bindung; bei Zahlen-/Fristenfehlern im Widget stellt sich die Haftungsfrage gegenüber Partner und dessen Besuchern; keine Handhabe gegen irreführende Einbettungskontexte.
- Risiko: mittel. Vorschlag (Entwurfsskelett für die Kanzlei, zur Ausformulierung):
  1. Gegenstand: unentgeltliche, einfache, widerrufliche Erlaubnis, die Widgets per iframe einzubetten; keine Markenlizenz darüber hinaus.
  2. Pflichten des Einbettenden: Attribution unverändert sichtbar; keine Einbettung in irreführende, rechtswidrige oder herabsetzende Kontexte; keine technische Veränderung/Überlagerung; Partner-Kennung nur nach Zuteilung.
  3. Verfügbarkeit: kein Anspruch; ÖkoInvest darf Widgets ändern oder einstellen (angemessene Vorankündigung bei zugeteilter Kennung).
  4. Inhalte: Orientierungswerte mit Quelle und Stand, keine Beratung; Haftung nur für Vorsatz/grobe Fahrlässigkeit, Freistellung bei Verstößen des Einbettenden.
  5. Beendigung: Widerruf jederzeit, insbesondere bei Verstoß; technische Sperre (Umstellung auf Domain-Positivliste) vorbehalten.
  6. Recht/Gerichtsstand: wie Nutzungsbedingungen (Länderteil).
- Rechtsgebiet: Vertragsrecht/IT. Land: alle.

### V-M2. Klick-NDA der Investoren ohne Entwurfs-Hinweis im Portal
- Fundstelle: src/lib/plattform/konstanten.js (NDA, Fassung „2026-09“; Entwurfsstatus nur als Code-Kommentar), src/components/Boerse/NdaAnfrage.js.
- Problem: Anders als alle Webseiten-Muster zeigt die Klick-NDA dem Nutzer keinen Entwurfs-Hinweis, wird aber verbindlich abgeschlossen (Version/Zeitpunkt/IP protokolliert – das ist gut). Wortlaut ungeprüft; Verhältnis zum ausführlichen Anbieter-Muster-NDA und zu § 7 f. Nutzungsbedingungen (Umgehungsschutz-Querverweis) ist zu bestätigen. Dauer „zwei Jahre ab Annahme“ vs. Anbieter-NDA „[zwei oder drei Jahre] nach Ende der Vermarktung“ – bewusst verschieden?
- Risiko: mittel (im Demo-Betrieb), hoch bei Produktivgang. Vorschlag: Kanzlei prüft Wortlaut; bis Freigabe Entwurfs-Hinweis auch im Portal-Dialog; Laufzeiten harmonisieren oder bewusst dokumentieren.
- Rechtsgebiet: Vertragsrecht. Land: alle.

### V-M3. Umgehungsschutz bindet Investoren ohne eigene Provisionsvereinbarung
- Fundstelle: /nutzungsbedingungen § 17 Abs. 4 Satz 2; /bedingungen/projektboerse § 5 (Schadensersatz des Investors, Vertragsstrafe als Platzhalter); Klick-NDA Punkt 3.
- Problem: Verpflichtung der (provisionsfreien) Investoren allein über AGB/Klick-NDA – überraschende Klausel? Durchsetzbarkeit und Höhe (Vertragsstrafe) offen (P-60).
- Risiko: mittel. Vorschlag: Kanzlei entscheidet Konstruktion (eigene kurze Investoren-Vereinbarung vs. AGB) und Vertragsstrafe ja/nein.
- Rechtsgebiet: AGB-/Maklerrecht. Land: alle.

### V-M4. Direktansprache-Verbot und Folgerunden-Informationen der Lieferanten-Bedingungen kartellrechtlich prüfen
- Fundstelle: /bedingungen/lieferanten § 5 (Ansprache-Verbot, Platzhalter 12 Monate), § 2 Abs. 3 (Rang/Abstand/Bestpreis in Folgerunden), § 6 (Absprachenverbot vorhanden).
- Problem: Dauer und Reichweite des Ansprache-Verbots (Kundenallokation?) sowie die zulässige Informationsweitergabe zwischen Bietern (Markttransparenz) sind kartellrechtlich einzuordnen (bestehender P-89).
- Risiko: mittel. Vorschlag: Kanzlei AT/DE mit Kartellrechtskompetenz; Dauer festlegen.
- Rechtsgebiet: Kartellrecht. Land: AT/DE (CH: Beschaffung noch nicht freigegeben).

### V-M5. Offene Platzhalter in allen Bedingungs-/Mustertexten (Entscheidung Inhaber + Kanzlei)
- Fundstelle (sichtbar markiert): Projektbörse (Bemessung Share Deal, Fälligkeit, Vertragsstrafe, Exklusivitätsdauer, § 15 MaklerG, Doppeltätigkeit), Energiebeschaffung (Servicefee, Erfolgshonorar, Mindestentgelt, Fälligkeit, Versorgerprovisions-Ausschluss, Haftungshöchstbetrag, Laufzeit), Lieferanten (Vergütung durch Versorger, Ansprache-Frist), Banken (Vertraulichkeitsdauer), Muster-NDA (Parteien, Projekt, Laufzeit, Vertragsstrafe, Gerichtsstand je Land).
- Problem: Ohne diese Festlegungen keine Freigabe; insbesondere Haftungshöchstbetrag (Energiebeschaffung § 8) und Versorgervergütung (Transparenz-/Neutralitätsversprechen der Website) sind geschäftsprägend.
- Risiko: mittel. Vorschlag: Entscheidungsliste an den Inhaber (liegt den Kanzlei-Briefings bei), danach Kanzleiformulierung.
- Rechtsgebiet: Vertragsrecht. Land: alle.

### V-M6. aWATTar-Fallback auf /energie-live ohne dokumentierte Lizenz
- Fundstelle: src/lib/energy.js (api.awattar.de als Preis-Fallback), /energie-live (FAQ und Quellenliste nennen aWATTar). Hauptquelle Energy-Charts (Fraunhofer ISE) ist korrekt mit CC BY 4.0 genannt.
- Problem: Für die kommerzielle Nutzung der aWATTar-API ist keine Lizenz/Nutzungsbedingung dokumentiert (Masterplan S2 „aWATTar hat keine Lizenz“ weiter offen).
- Risiko: mittel. Vorschlag: Nutzungsbedingungen der API einholen/dokumentieren oder Fallback auf eine lizenzklare Quelle (z. B. ENTSO-E Transparency, CC BY 4.0-kompatibel) umstellen.
- Rechtsgebiet: Urheber-/Vertragsrecht (Datenlizenzen). Land: DE/AT.

### V-M7. CC-BY-4.0-Vergabe eigener Downloads: Rechtekette an amtlichen Ausgangsdaten bestätigen
- Fundstelle: /quellen (Faktenregister), /marktdaten/ausschreibungen, /marktdaten/strompreise-schweiz (jeweils CSV/JSON mit Link-Header rel="license" CC BY 4.0; Lizenz ausdrücklich nur für die eigene Zusammenstellung, Primärquellen „behalten ihre Bedingungen“ – gut formuliert).
- Problem: Zu bestätigen bleibt, dass die Ausgangsdaten die Weitergabe tragen: BNetzA-Ausschreibungsergebnisse (keine ausdrückliche offene Lizenz; § 5 UrhG/amtliche Werke vs. Datenbankrecht §§ 87a ff. UrhG), EAG-Abwicklungsstelle (AT), ElCom via opendata.swiss „Open use“ (am Original geprüft 11.10.2026, kommerzielle Nutzung erlaubt, Quellenangabe empfohlen und geleistet – Wortlaut in src/data/strompreisatlasCh.js dokumentiert).
- Risiko: mittel (DE/AT), niedrig (CH). Vorschlag: Kanzlei bestätigt je Datensatz; ggf. Hinweis „Zahlenwerte amtlich, Schutz nur für die Zusammenstellung“ schärfen.
- Rechtsgebiet: Urheber-/Datenbankrecht. Land: DE/AT/CH.

## Risiko NIEDRIG

### V-N1. CC-BY-Nennungsformulierungen vereinheitlichen
- Fundstelle: „Bundesnetzagentur | SMARD.de (CC BY 4.0)“ (gewerbestrom-check), „Daten: Bundesnetzagentur | SMARD.de, Lizenz CC BY 4.0“ (GewerbestromCheck.js), „Quelle: Energy-Charts (Fraunhofer ISE), CC BY 4.0“ (ErzeugungChart.js); eigene Nennungstexte „Quelle: ÖkoInvest … (CC BY 4.0) auf Basis von …“ (Ausschreibungen/CH-Atlas) vs. Namensnennung „ÖkoInvest GmbH – Faktenregister“ (quellen).
- Problem: inhaltlich jeweils korrekt (SMARD-Pflichtnennung „Bundesnetzagentur | SMARD.de“ eingehalten), aber drei Formulierungsmuster; für eigene Datensätze ist die gewünschte Namensnennung nur beim Faktenregister ausdrücklich definiert.
- Risiko: niedrig. Vorschlag: einheitliches Muster „Quelle: <Urheber>, Lizenz CC BY 4.0 (Link)“ und je eigenem Datensatz eine definierte Zitier-Nennung; redaktionell nach Kanzleifreigabe.
- Rechtsgebiet: Lizenzrecht. Land: alle.

### V-N2. basemap.at-Attribution im Akquise-Cockpit ohne Lizenzangabe
- Fundstelle: src/components/Portal/Geodaten/AkquiseKarte.js (ATTRIBUTION: „Grundkarte: basemap.at“ ohne CC-BY-Zusatz) vs. Flächenpass-Karte („basemap.at (CC BY 4.0)“ – korrekt). BKG dl-de/by-2-0, OSM ODbL und swisstopo sind überall korrekt genannt.
- Problem: basemap.at (CC BY 4.0 AT) erwartet Namensnennung mit Lizenz; betrifft nur das interne Backoffice.
- Risiko: niedrig. Vorschlag: „(CC BY 4.0)“ ergänzen – kleine Code-Änderung, liegt im Paket Geodaten/Plattform (nicht hier geändert wegen Parallelarbeit, Datei gehört zum Portal-Paket).
- Rechtsgebiet: Lizenzrecht. Land: AT.

### V-N3. Ratsvorlage-Muster: Rechtsdienstleistungs-Abgrenzung bestätigen
- Fundstelle: /kommunen/ratsvorlage (FAQ „Muster ohne Rechtsberatung“, Hinweis auf Prüfung durch Verwaltung/Kommunalaufsicht vorhanden; noindex).
- Problem: Erstellen einer gemeindespezifisch befüllten Beschlussvorlage mit Landesrechts-Angaben könnte als Rechtsdienstleistung (DE RDG § 2) eingeordnet werden; Disclaimer vorhanden, Einordnung aber zu bestätigen.
- Risiko: niedrig. Vorschlag: Kanzlei DE bestätigt Zulässigkeit als standardisierte Information; Formulierung des Disclaimers ggf. schärfen.
- Rechtsgebiet: RDG/Berufsrecht. Land: DE (AT: Widmungskit analog, WTBG/RAO).

### V-N4. Stand-Datum der Nutzungsbedingungen vor Freigabe aktualisieren
- Fundstelle: /nutzungsbedingungen und /bedingungen/* („Stand: 30. September 2026“) vs. Strang-R-Entwürfe (3. Oktober 2026).
- Problem: Nur Hygiene – bei Übernahme der Kanzleifassung muss ein neues, einheitliches Stand-Datum plus Fassungs-ID gesetzt werden (hängt an V-H4/V-H1).
- Risiko: niedrig. Vorschlag: beim Freigabe-Commit erledigen.
- Rechtsgebiet: –. Land: alle.
