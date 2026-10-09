# Posteingang des Inhabers – Pflicht-Rekrutierungen für den Personalchef

Jeder Punkt muss in der nächsten Rekrutierungsrunde mit eigenen Experten besetzt werden (sofern nicht schon erledigt).

## ENTSCHEIDUNG DES INHABERS (verbindlich, keine offene Frage mehr)
**Alle Länder laufen auf EINER Domain mit Länderordnern: `/de`, `/at`, `/ch`.** Keine getrennten Domains, keine Subdomains.
Der Masterplan muss dafür ein sehr gutes Konzept liefern, damit jeder Besucher im richtigen Land landet, ohne SEO zu schaden. Rahmen (vom Architekten zu verfeinern):
- Jede Länderseite hat eigene Inhalte, Rechenlogik, Rechtstexte und Ansprechpartner; gemeinsame Komponenten, aber getrennte Länderdaten (z. B. Marktannahmen je Land).
- hreflang `de-DE` / `de-AT` / `de-CH` (+ `en`) und `x-default`; kanonische URLs je Land.
- Landerkennung beim ersten Besuch über Standort (Geo-Header des Hostings) und Browsersprache – als **Vorschlag** („Sie sind in Österreich? Zur österreichischen Seite“), **keine Zwangsweiterleitung**, Suchmaschinen-Crawler nie umleiten.
- Startseite `/` als Länderwahl bzw. intelligenter Einstieg; gewählte Länderwahl im Cookie merken; Länderwechsler in Kopf- und Fußzeile; jede Seite zeigt klar, für welches Land sie gilt.
- Migrationsplan der bestehenden URLs mit 301-Weiterleitungen ohne Rankingverlust.

## KLARSTELLUNG DES INHABERS ZUM LÄNDERMODELL (verbindlich, ersetzt Abweichendes)
- EINE Website: eine Hauptseite und dieselben Unterseiten mit IDENTISCHEM Design wie bisher (Stand vor Welle 2). Keine eigenen Länder-Übersichtsseiten, keine anders aussehenden Länderseiten.
- Das Land wird oben in der Top-Bar (DE · AT · CH) gewählt oder kommt aus der URL (www.oekoinvest.com/ch, /at, /de …). Dann zeigt die GANZE Seite die Inhalte dieses Landes (Recht, Zahlen, Rechner, Begriffe, Währung), sieht aber genauso aus.
- Die Wahl bleibt gespeichert, bis man sie ändert (nicht bei jeder Seite neu wählen).
- Ohne Wahl: die gemeinsame Seite wie bisher (alle Länder gemischt).
- Dasselbe für die Sprache: einmal EN gewählt → alle Seiten englisch, bis man zurückschaltet.

## Eingang 03.10.2026
- **GitHub-Ideen-Scouts:** Agenten, die GitHub (und ähnliche offene Quellen wie GitLab, Open-Data-Portale, Hugging Face) nach verwertbaren IDEEN im Geschäftsfeld durchsuchen – Open-Source-Projekte zu PV-Flächenanalyse, Ertragsprognose (pvlib, PVGIS), Netzanschluss, Energiegemeinschaften, Energy-Sharing, Strompreis-Daten, Agri-PV, Speicher-Optimierung, Geodaten/Flächenkulisse, Lead-/Marktplatz-Konzepten. Ziel: Ideen, Datenquellen, Methoden und Feature-Konzepte aufgreifen – NICHT Code kopieren. Lizenzen nur nennen, wenn eine spätere Nutzung denkbar wäre. Mehrere Scouts mit getrennten Themenfeldern.
- **Fachanalysten:** tiefe Fachanalysen je Geschäftsfeld (Freiflächen-PV, Agri-PV, Dach, Carport, Großspeicher, Projekthandel, Energiegemeinschaften, Gewerbestrom).
- **PV-Experten:** erfahrene PV-Planer und Betriebsführer (Planung, Bau, Betrieb, O&M, Monitoring, Degradation, Repowering) – was Website und Rechner fachlich zeigen müssen, Fehler im Bestand.
- **Projektentwickler-Experten:** erfahrene Solarpark- und Speicher-Projektentwickler je Land (DE, AT, CH): Ablauf von Flächensicherung bis RTB, typische Stolpersteine, Zeitachsen, Kosten, was Eigentümer/Gemeinden/Investoren wirklich wissen wollen, und wie die Website als Projektentwickler-Werkzeug überzeugt.
