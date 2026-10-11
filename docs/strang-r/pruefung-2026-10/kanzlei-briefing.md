# Kanzlei-Briefing Strang R – Verträge, Muster, Bedingungen, Lizenzen (Oktober 2026)

Briefing der internen Rechtsabteilung für die externen Kanzleien in Österreich, Deutschland und der
Schweiz. KEINE Rechtsberatung; dieses Dokument beschreibt Prüfauftrag, Unterlagen und offene Fragen.
Es ergänzt docs/strang-r/PRUEFPUNKTE-ANWALT.md (P-Nummern) und die Paket-Dossiers unter
docs/strang-r/pruefung-2026-10/ (hier: vertraege.md, V-Nummern).

## Mandantin und Sachverhalt (für alle Kanzleien gleich)

- ÖkoInvest GmbH, Gewerbegebiet 10, 5121 Ostermiething, Österreich; FN 541505g, LG Ried im Innkreis,
  UID ATU76000505; Geschäftsführer Andreas Wegscheider und Manuel Thaler (je alleinvertretungsberechtigt).
  Registerangaben bitte am aktuellen Firmenbuchauszug verifizieren (P-02).
- Plattform (Website + Portal + Projektbörse) für Photovoltaik: Flächenpacht-Anbahnung, Projektbörse
  (Vermittlung von PV-Projekten/Projektgesellschaften gegen Verkäuferprovision 1,5–3 %, nur bei Abschluss),
  Energiebeschaffung für Unternehmen (Dienstleisterin, nicht Lieferantin), Rechner/Marktdaten, Kommunen-Werkzeuge.
- Eine Website für DE/AT/CH mit Länderfassungen (/de, /at, /ch) und informativer EN-Übersetzung
  (maßgeblich ist stets die deutsche Fassung – dieser Grundsatz ist auf den EN-Seiten vermerkt).
- Alle Rechts- und Bedingungstexte sind ENTWÜRFE, sichtbar gekennzeichnet, noindex; die Website ist nicht
  öffentlich. Ziel: schriftliche Freigabe je Land, danach Übernahme in den Code mit Fassungs-ID.

## Zu prüfende Texte (Live-Entwürfe und Strang-R-Dateien)

| Text | Live-Seite | Entwurfsdatei | Führend? |
|---|---|---|---|
| Nutzungsbedingungen (Kern) | /nutzungsbedingungen | docs/strang-r/nutzungsbedingungen/00-kern.md | Entwurf 03.10. ist aktueller – Fassungsfrage klären (V-H4) |
| Länderteile NB | fehlen live | 10-land-de.md / 20-land-at.md / 30-land-ch.md | Entwurf |
| Besondere Bedingungen Projektbörse | /bedingungen/projektboerse | docs/strang-r/bedingungen/projektboerse.md | inhaltlich deckungsgleich |
| Servicevertrag Energiebeschaffung | /bedingungen/energiebeschaffung | …/energiebeschaffung.md | deckungsgleich |
| Teilnahmebedingungen Energieversorger | /bedingungen/lieferanten | …/lieferanten.md | deckungsgleich |
| Vertraulichkeitsbedingungen Banken | /bedingungen/banken | …/banken.md | deckungsgleich |
| Muster-NDA Projektanbieter | /projektboerse/muster-nda | – (nur Live-Seite) | Live-Seite |
| Klick-NDA Investoren + Provisionsvereinbarung | Portal | src/lib/plattform/konstanten.js | Code |
| Beschaffungsvollmacht | Portal | – | Code (Wortlaut anfordern) |
| Einbettungsbedingungen Partner-Widgets | fehlen (nur „Spielregeln“ auf /partner/widgets) | Skelett in vertraege.md V-M1 | neu zu erstellen |
| Ratsvorlage-/Beschlussmuster Kommunen | /kommunen/ratsvorlage (Bericht-PDF) | – | Live-Werkzeug |

## Unterlagenliste (von der Mandantin bereitzustellen)

1. Aktueller Firmenbuchauszug und Gewerbeberechtigungen der ÖkoInvest GmbH (welche Gewerbe sind angemeldet?).
2. Gesellschafterliste/Organigramm der ÖKOVOLT Gruppe (für Informationsbarriere, Neutralitätszusagen, Doppeltätigkeit).
3. Entwurf der individuellen Provisionsvereinbarung (sofern vorhanden) und der Beschaffungsvollmacht (Wortlaut im Portal).
4. Entscheidungen des Inhabers zu allen Platzhaltern (Liste in vertraege.md V-M5: Vergütungssätze, Haftungshöchstbetrag, Laufzeiten/Fristen, Vertragsstrafen, Exklusivitätsdauer, Vertraulichkeitsdauern, Gerichtsstands-Präferenz).
5. Versicherungsbestätigung (Vermögensschadenhaftpflicht) – relevant für Haftungshöchstbeträge.
6. Lizenz-/Kaufnachweise der 18 Website-Bilder (public/img; Liste in vertraege.md V-H6).
7. Geplante Go-live-Reihenfolge je Land (CH startet ohne Projektbörse/Energiebeschaffung – Masterplan E11/E14).

---

## Briefing Kanzlei ÖSTERREICH (federführend)

Rolle: Kern aller Texte folgt österreichischem Recht (Sitzstaat); AT koordiniert die Länderteile.

Zu prüfen:
1. Nutzungsbedingungen Kern (00-kern.md) komplett; insbesondere § 16 Haftung (V-H3, § 6 KSchG), § 20 Änderungen (V-H2, § 6 Abs. 1 Z 2 / Abs. 2 Z 3 KSchG), § 21 Rechtswahl/Gerichtsstand (konkretes Gericht für 5121 Ostermiething benennen – P-71), Verbraucherbegriff (Mitglieder/Bürger) und FAGG-Rücktritt bei kostenfreier Registrierung (P-72).
2. Projektbörse: Gewerbeberechtigung (Immobilientreuhänder? Vermittler?), MaklerG (Doppeltätigkeit § 5, Alleinvermittlungsauftrag §§ 14 f., Entschädigung § 15), Abgrenzung WAG 2018/KMG 2019/AltFG bei Anteils-Deals (V-H5, P-56); Umgehungsschutz 24 Monate und Investorenbindung (V-M3, P-60); Entstehung/Fälligkeit der Provision (Signing/Closing, Share-Deal-Bemessung).
3. Energiebeschaffung: Gewerberechtliche Einordnung (Energieberatung/Vermittlung), Vollmachtskonstruktion, Transparenzpflicht bei Versorgervergütungen; Kartellrechtsfragen der Lieferanten-Bedingungen (V-M4, P-89).
4. Muster-NDA und Klick-NDA: Wortlaut, Laufzeiten, Informationsbarriere gegenüber der eigenen Projektentwicklung (Konzernprivileg?), Beweislastregel zugunsten des Anbieters.
5. Banken-Bedingungen: Annahme durch ersten Abruf (Einbeziehung), Vertraulichkeitsdauer, Verhältnis zu bankeigenen NDAs und BWG-Bankgeheimnis.
6. GwG: Verpflichtetenstellung der ÖkoInvest GmbH (GewO §§ 365m ff.; bestimmt KYC-Klauseln § 9 NB) – P-13, gemeinsam mit Datenschutz-Paket.
7. Verbraucherschlichtung nach AStG: Teilnahme ja/nein, Informationspflicht (P-74; Entscheidung Inhaber offen).
8. Widget-Einbettungsbedingungen neu formulieren (Skelett V-M1).

Offene Fragen an die Kanzlei: Rechtswahl AT für alle Länder sinnvoll oder je Land eigenes Recht (P-70)? Klick-Annahme (Checkbox/erster Abruf) als Einbeziehungsform ausreichend? Vertragsstrafen ja/nein und Höhe?

## Briefing Kanzlei DEUTSCHLAND

Rolle: Länderteil DE und deutsche Schutzstandards gegenüber DE-Nutzern (Rom-I/Brüssel-Ia).

Zu prüfen:
1. Länderteil 10-land-de.md: Wirkung der AT-Rechtswahl auf die AGB-Kontrolle gegenüber DE-Unternehmern und -Verbrauchern (P-70); Gerichtsstandsklausel; Widerrufsrecht bei kostenfreier Registrierung („Daten als Gegenleistung“, § 312 ff. BGB) samt Belehrung/Widerrufsfunktion (P-72); § 36 VSBG-Erklärung (P-74); OS-Plattform-Hinweis entfällt (VO (EU) 2024/3228 – Datum bestätigen).
2. §§ 305 ff. BGB-Kontrolle der Kernklauseln: Haftung (§ 16, Kardinalpflichten-Formel), Änderungsklausel (§ 20, BGH-Rechtsprechung Zustimmungsfiktion), Umgehungsschutz/Investorenbindung (§§ 305c, 307), Freistellungsklauseln (§ 5 Abs. 2 NB, Banken § 3).
3. Projektbörse DE: § 34c GewO (Erlaubnis für Vermittlung?), Abgrenzung KWG/WpIG bei GmbH-Anteilen; Maklerrecht §§ 652 ff. BGB (Vorkenntnis, Verflechtung).
4. Energiebeschaffung DE: Einordnung als entgeltliche Beschaffungsdienstleistung, Vergaberechts-Hinweise (§ 9) ausreichend? Kartellrecht der Bieterrunden-Informationen (V-M4).
5. Ratsvorlage-Muster: RDG-Abgrenzung (V-N3).
6. Datenlizenzen DE: Weitergabe von BNetzA-Ausschreibungsdaten und SMARD-basierten Werten unter eigener CC BY 4.0 (V-M7); aWATTar-API (V-M6); dl-de/by-2-0-Nennung BKG (erfüllt, Gegenprüfung).

## Briefing Kanzlei SCHWEIZ

Rolle: Länderteil CH; CH startet zunächst nur mit Daten-/Werkzeugseiten (keine Projektbörse, keine
Energiebeschaffung, kein Reststrom-Pool für CH bis gesonderte Freigabe).

Zu prüfen:
1. Länderteil 30-land-ch.md: Zulässigkeit der AT-Rechtswahl gegenüber CH-Konsumenten (Art. 120 IPRG – P-76); Gerichtsstand/LugÜ Art. 23 Formerfordernis (P-77); AGB-Kontrolle Art. 8 UWG (P-78) insbesondere für Haftungsklauseln (Art. 100 OR); Preisbekanntgabeverordnung, falls Entgelte für CH anfallen (P-79).
2. Muster-NDA, CH-Variante: Rechtswahl/Gerichtsstand und Datenschutzhinweis (revDSG) der CH-Fassung; ß-freie Schreibweise ist technisch umgesetzt.
3. Perspektivisch (vor CH-Freigabe der Börse): FIDLEG/FINIG-Abgrenzung der Vermittlung, Art. 412 ff. OR Mäklervertrag (P-56/CH-5).
4. Datenlizenzen CH: Nutzung der ElCom-Tarifdaten (LINDAS) unter opendata.swiss „Open use“ für den CH-Strompreis-Atlas einschließlich kommerzieller Nutzung und Weitergabe als CC BY 4.0-Zusammenstellung (Wortlaut und Prüfdatum 11.10.2026 dokumentiert in src/data/strompreisatlasCh.js) – Gegenprüfung; swisstopo-Kartennutzung (OGD, Attribution „© swisstopo“ vorhanden).

## Gewünschtes Arbeitsergebnis (alle Kanzleien)

1. Markup-Fassung je Text (Entwurfsdateien unter docs/strang-r sind maßgebliche Arbeitsgrundlage; Abweichungen der Live-Seiten sind in vertraege.md V-H4 beschrieben).
2. Beantwortung der P-/V-Punkte des eigenen Landes mit kurzer Begründung und konkretem Formulierungsvorschlag.
3. Schriftliche Freigabeerklärung je Text und Land („geeignet für Veröffentlichung ab Fassung X“).
4. Hinweis auf jede Stelle, an der eine Inhaberentscheidung fehlt (Platzhalterliste V-M5), statt stillschweigender Annahmen.

Zeitrahmen laut Masterplan: 4–8 Wochen ab Mandat. Bis zur Freigabe bleiben alle Texte noindex und die
Website nicht öffentlich. Rückfragen an die interne Rechtsabteilung über den Inhaber.
