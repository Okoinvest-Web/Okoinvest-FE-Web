# Fachkonzept Energiegemeinschaften Österreich (EEG, BEG, GEA, P2P)

Stand: 01.10.2026, dem Tag, an dem §§ 65 Abs. 1 Z 6 und Abs. 2 sowie §§ 66–72 ElWG in Kraft treten. Erstellt von Rechercheteam B („Fachkonzept“).
Geltungsbereich: Österreich. DE (Energy Sharing § 42c EnWG) und CH (LEG/ZEV) bleiben im Bestandscode erhalten, sind hier aber nicht Gegenstand.
Kennzeichnung: **[zu bestätigen]** heißt: Sekundärquelle, Entwurf oder Auslegung. Vor dem Livegang juristisch bzw. steuerlich prüfen lassen. Wo eine Regel eine Primärquelle hat, steht sie in eckigen Klammern dahinter, z. B. [ElWG § 71 Abs. 4]. Die Linkliste steht in Abschnitt 10.

---

## 0. Kurzfassung für Entscheider

1. **Rechtsrahmen im Umbruch.** Die §§ 16a–16e ElWOG 2010 (GEA, BEG, EEG, gemeinsame Bestimmungen) sind am 30.09.2026 außer Kraft getreten [ElWG § 188 Abs. 1]. Seit 01.10.2026 gelten die §§ 65–72 ElWG [§ 188 Abs. 3]. Bestehende GEA, EEG und BEG werden **ohne Zutun der Teilnehmer** übergeführt [§ 189 Abs. 17]. Für EEG gilt materiell weiter § 79 Abs. 1, 2 und 4 EAG [ElWG § 66 Abs. 1].
2. **Netzentgelt hängt künftig am Nahebereich, nicht mehr an der Form.** Ab 01.01.2027 soll eine neue SNE-VO den reduzierten Netzarbeitspreis nach **Nahebereich (Zonelevel 1–7)** festlegen. Bis 31.12.2026 gilt weiter: nur lokale bzw. regionale **EEG** erhalten −57 % bzw. −28 %/−64 % [SNE-V 2018 § 5 Abs. 1a; Koordinationsstelle]. Die Höhe ab 2027 ist **[zu bestätigen]**.
3. **EDA bleibt das Rückgrat.** Anmeldung `EC_REQ_ONL`, Teilnahmefaktor `EC_PRTFACT_CHG`, Zählpunktliste `EC_PODLIST`, Abmeldung `CM_REV_SP/CUS/IMP`, Energiedaten `CR_MSG`/`DATEN_CRMSG`, Nachforderung `CR_REQ_PT`. Ab 05.10.2026 (Phase 1) sollen **neu aktivierte Gemeinschaften nur noch das dynamische Modell** bekommen. Pro Gemeinschafts-ID gibt es höchstens 2 Berechnungsläufe pro Tag, und Organisatoren werden in Standardprozessen geführt [ebUtilities-Konzept 17.04.2026, **zu bestätigen** in den finalen Sonstigen Marktregeln].
4. **Neue Pflichten ab 100 kW.** EEG und BEG mit Erzeugungsanlagen **über 100 kW** (Haushalte mit über 30 kW) brauchen AGB, ein Informationsblatt, Rechnungen nach § 42 ElWG und die Wahl zwischen Monats- und Jahresrechnung [§ 69]. Diese Pflichten kann ein **Organisator** übernehmen [§ 68 Abs. 2, § 69 Abs. 4]. **Für ÖkoInvest ist das der Kern des Geschäftsmodells:** Die Plattform wird das Werkzeug des Organisators.
5. **Mehrfachteilnahme.** Ein Zählpunkt darf an bis zu **5** gemeinsamen Energienutzungen teilnehmen [§ 71 Abs. 5]. Der Teilnahmefaktor ist ganzzahlig, beträgt mindestens 1 % und in Summe höchstens 100 %. Derzeit ist **eine Änderung pro Tag** je EG und Zählpunkt möglich, ab **01.04.2028 mehrmals täglich** [§ 71 Abs. 5; Handlungsanweisung II].
6. **Der Bestandscode ist ein Prototyp.** Er bildet Monatssummen ab, kennt weder Teilnahmefaktor noch USt-Logik noch EDA-Prozesse und speichert Stammdaten als JSON. Er wird durch ein eigenes Modul `eg/` ersetzt (Abschnitt 7). Die Arbeitspakete stehen in Abschnitt 8.

---

## 1. Begriffe und Typen

### 1.1 Begriffe

| Begriff | Bedeutung | Quelle |
|---|---|---|
| Aktiver Kunde | Endkunde, der eigenerzeugten bzw. gemeinsam erzeugten Strom verbraucht, speichert, verkauft oder an Flexibilitätsprogrammen teilnimmt, sofern das nicht seine Haupttätigkeit ist | ElWG § 6, § 65 |
| Gemeinsame Energienutzung | Verbrauch, Speicherung und Verkauf von Strom aus erneuerbaren Quellen, entweder innerhalb derselben juristischen Person (EEG, BEG) oder zwischen Vertragspartnern (Peer-to-Peer, P2P) | ElWG § 68 Abs. 1 |
| Teilnehmender Netzbenutzer | Zählpunktinhaber, der an einer gemeinsamen Energienutzung teilnimmt | ElWG § 70 |
| Organisator | Vom aktiven Kunden per Vertrag oder Vollmacht bestellt. Übernimmt die Kommunikation mit dem Netzbetreiber, Verträge und Abrechnung, Aggregierung sowie Betrieb und Wartung der Anlagen. Ist dem Netzbetreiber anzuzeigen. Ist **kein** eigener Marktteilnehmer | ElWG § 68 Abs. 2 |
| Nahebereich | Netztopologische Nähe in 4 Stufen: Hauptleitung (GEA), Standortbereich, Lokalbereich (NS-Netz und NS-Teil der Trafostation), Regionalbereich (MS-Netz und MS-Sammelschiene im UW). Netzbetreiber müssen binnen **14 Tagen** Auskunft geben, an welchem Netzteil eine Anlage hängt | ElWG § 70 Abs. 6 |
| Nahebereichs-ID / Zonelevel | Marktprozess-Kennung 1–7 je Gemeinschafts-ID, siehe 1.3 | ebUtilities-Konzept 04/2026 [zu bestätigen] |
| Teilnahmefaktor (TF) | Prozentualer Anteil der gemessenen Erzeugung bzw. des gemessenen Verbrauchs eines Zählpunkts, mit dem er an *einer* Gemeinschaft teilnimmt | Handlungsanweisung II, 2.2; ElWG § 70 Abs. 3 |
| Aufteilungsschlüssel | Nur im statischen Modell: fester Anteil der Erzeugung, der einer Verbrauchsanlage zugewiesen wird. Ist **nicht** dasselbe wie der Teilnahmefaktor | Handlungsanweisung II, 2.2 und 12.2 |
| Eigendeckung | Der einem Verbrauchszählpunkt je Viertelstunde zugeordnete Anteil der Gemeinschaftserzeugung, begrenzt durch seinen Verbrauch | ElWG § 71 Abs. 4; HA II 12 |
| Restüberschuss | Erzeugung je Viertelstunde, die keinem Teilnehmer zugeordnet wurde. Gilt als ins öffentliche Netz eingespeist und geht an den Energieabnehmer bzw. die Bilanzgruppe | ElWG § 71 Abs. 3 |
| Gemeinschafts-ID | 33-stellige Kennung der Gemeinschaft beim Netzbetreiber, Format siehe 3.4 | HA II 7.1 |
| Marktpartner-ID | Kennung auf ebUtilities, z. B. `RC100015` (EEG) oder `CC123456` (BEG) | HA II 7, 11 |
| Zählpunktnummer | 33 Zeichen: `AT` + 6-stellige Netzbetreibernummer + 5-stellige PLZ + 20 Zeichen | bereits geprüft in `fach/energie.js` |
| VEZ | Verteilernetzübergreifender Energiezuweiser. Teilt für netzgebietsübergreifende BEG zu, ist eine reine „Rechenmaschine“ ohne Kundendaten | HA II 2.3 |

### 1.2 Typen im Vergleich (Stand 01.10.2026)

| Merkmal | GEA (gemeinschaftliche Erzeugungsanlage) | EEG lokal | EEG regional | BEG | P2P / Eigenversorgung (neu) |
|---|---|---|---|---|---|
| Rechtsgrundlage | ElWG §§ 68, 70 Abs. 6 Z 1 (früher § 16a ElWOG) | ElWG § 66 + EAG § 79 Abs. 1, 2, 4 | wie lokal | ElWG § 67 | ElWG § 68 Abs. 1 (P2P); § 65 Abs. 2 (Eigenversorgung an anderem Standort) |
| Nahebereich | Hauptleitung im selben Objekt (Zonelevel 1) | **Pflicht:** Lokalbereich (Z 3) | **Pflicht:** Regionalbereich (Z 4) | beliebig, auch österreichweit | beliebig, Netzentgeltvorteil nur im Nahebereich |
| Netzebene | hinter dem Netzanschluss | NE 6–7 | NE 4–7 (MS bis Sammelschiene UW) | alle | alle |
| Teilnehmerkreis | Teilnehmer im selben Gebäude bzw. an derselben Hauptleitung | natürliche Personen, Gemeinden, lokale Behörden, sonstige jur. Personen öffentl. Rechts, **KMU**. **Keine Großunternehmen**. Bei Privatunternehmen darf die Teilnahme nicht die Haupttätigkeit sein | wie lokal | natürliche und juristische Personen, Gebietskörperschaften, auch Großunternehmen (max. 6 MW Erzeugungsleistung je Zählpunkt, Ansiedlung in der Gebotszone) | aktive Kunden; Großunternehmen max. 6 MW |
| Rechtsform | keine eigene Rechtsperson nötig (Betreibervertrag mit dem Netzbetreiber) | Verein, Genossenschaft, Personen- oder Kapitalgesellschaft oder ähnliche Vereinigung mit Rechtspersönlichkeit; mind. 2 Mitglieder | wie lokal | wie EEG; mind. 2 Mitglieder | keine (Vertrag) |
| Kontrolle | – | keine ausdrückliche Kontrollregel im ElWG; Mitgliederkreis wie oben [EAG § 79 Abs. 2] | wie lokal | **Kontrolle nur** durch natürliche Personen, Gebietskörperschaften und kleine Unternehmen, die nicht als Elektrizitätsunternehmen tätig sind. Kontrolle liegt jedenfalls vor, wenn diese Gruppe die satzungsändernde Mehrheit hält [§ 67 Abs. 3] | – |
| Zweck und Gewinn | – | Hauptzweck **nicht** finanzieller Gewinn (in der Satzung festhalten). Vorrangig ökologische, wirtschaftliche oder sozialgemeinschaftliche Vorteile. Freiwillig und offen | wie lokal | wie EEG [§ 67 Abs. 2] | – |
| Energieträger | erneuerbar | nur erneuerbar | nur erneuerbar | gemeinsame Energienutzung nur erneuerbar [§ 68] | erneuerbar |
| Netzentgelt bis 31.12.2026 | Eigendeckung hinter dem Zähler ohne Netznutzung | −57 % Netznutzungs-AP (NE 6, 7) | −28 % (NE 6, 7) bzw. −64 % (NE 4, 5) | **keine** Reduktion | keine |
| Netzentgelt ab 01.01.2027 | nach Zonelevel, Arbeitshypothese „keine Netzkosten für Eigendeckung“ | nach Zonelevel 3 (Arbeitshypothese −57 %) | Zonelevel 4/5 (−28 % bzw. −64 %) | **neu** nach Zonelevel, wenn die BEG lokal bzw. regional abgegrenzt ist | nach Zonelevel |
| Elektrizitätsabgabe und Erneuerbaren-Förderbeitrag | Befreiung für selbst verbrauchten erneuerbaren Strom | **befreit** für Eigendeckung | befreit | **nicht** befreit | nicht befreit (Koordinationsstelle: Befreiung nur EEG) |
| Förderung | EAG-Investzuschuss | EAG-Investzuschuss; Marktprämie für max. 50 % der Erzeugung (nur eingespeister, nicht in der EEG verbrauchter Strom) | wie lokal | EAG-Förderung; Marktprämie nur für nicht in der BEG verbrauchte Mengen | – |
| GewO | – | nicht anwendbar | nicht anwendbar | nicht anwendbar | – |
| Lieferantenpflichten § 69 | ab > 30 kW (Haushalt) bzw. > 100 kW | ab > 100 kW Erzeugungsleistung | dto. | dto. | dto. |

Quellen: ElWG §§ 6 Z 19 und 45, 65–72; EAG §§ 75 Abs. 5, 79, 80; SNE-V 2018 § 5 Abs. 1a; Koordinationsstelle (FAQ ElWG, Änderungen für bestehende EG); ebUtilities-Konzept 17.04.2026.

### 1.3 Nahebereich und Zonelevel (Marktprozesse ab 05.10.2026)

| Zonelevel | Netztechnische Verbindung | Feldinhalt der Nahebereichs-ID | Netzentgelt (Arbeitshypothese bis zur neuen SNE-VO) | zulässig für |
|---|---|---|---|---|
| 1 | Hauptleitung | ID Anschlussobjekt | keine Netzkosten für Eigendeckung | GEA, Eigenversorgung, P2P, BEG |
| 2 | Standortbereich (ab Phase 2, 05.04.2027) | ID Anschlussobjekt (zwei Anschlüsse) | keine Netzkosten für Eigendeckung | GEA, Eigenversorgung, P2P, BEG |
| 3 | Lokalbereich | ID der Trafostation | −57 % | Eigenversorgung, P2P, EEG, BEG |
| 4 | Regionalbereich, ein Netzgebiet | ID des Umspannwerks | −28 % bzw. −64 % | Eigenversorgung, P2P, EEG, BEG |
| 5 | Regionalbereich, mehrere Netzgebiete (ab Phase 2) | ID des Umspannwerks | −28 % bzw. −64 % | Eigenversorgung, P2P, EEG, BEG |
| 6 | keine Verbindung, ein Netzgebiet | NONE | keine | Eigenversorgung, P2P, BEG |
| 7 | keine Verbindung, mehrere Netzgebiete (ab Phase 2) | NONE | keine | Eigenversorgung, P2P, BEG |

**Fahrplan Marktprozesse** [ebUtilities-Konzept, zu bestätigen]:

| Phase | Termin | Inhalt |
|---|---|---|
| 1 | 05.10.2026 | P2P und Eigenversorgung innerhalb eines Netzgebiets (Zonelevel 1, 3, 4, 6); Nahebereichs-ID je Gemeinschafts-ID; neue Modelle nur dynamisch; Organisator-Verwaltung; max. 2 Berechnungen je Tag; Toleranz bzw. monetärer Ausgleich bei Abweichungen |
| 2 | 05.04.2027 | Zonelevel 2 und 5; netzgebietsübergreifend für P2P, Eigenversorgung und EEG (5, 6, 7) |
| 3 | 04.10.2027 | Wechsel des Nahebereichs ohne Neuanmeldung; gleichzeitige Teilnahme am Flex-Markt |
| 4 | offen, spätestens 01.04.2028 | Teilnahmefaktor mehrmals täglich änderbar |

**Konsequenz für das Datenmodell:** Netzentgeltregeln sind **datums- und zonenabhängige Tabellen**, nicht hart codierte Formen. Die Gemeinschaft speichert `modell` (GEA/EEG/BEG/P2P/EV) **und** `zonelevel` getrennt.

---

## 2. Lebenszyklus Ende zu Ende

Phasenmodell nach HA II 1: Phase 1 Konzept, Phase 2 Gründung, Phase 3 Realisierung (EDA), Phase 4 Betrieb. ÖkoInvest bietet jede Phase als Dienstleistung an (Gründungsauftrag, siehe 3.13).

### 2.1 Interesse
- Erfassen kann man über öffentliche Formulare, eine Kampagne der Gemeinde oder ÖKOVOLT-PV-Kunden. Die Daten bleiben dabei schmal: Name, Kontakt, PLZ und Rolle (Verbraucher/Erzeuger/Prosumer). Zählpunkt und Jahresverbrauch sind optional. Einwilligung nach DSGVO Art. 6 Abs. 1 lit. a ist Pflicht.
- Danach folgt eine Clusterbildung nach PLZ und Netzbetreiber. Die Zuordnung zur Trafostation bzw. zum UW ist erst über die Netzbetreiber-Auskunft möglich (siehe 2.2).

### 2.2 Machbarkeit
1. **Netzgebiet bestimmen.** Den Netzbetreiber liefern die PLZ-Liste der Koordinationsstelle (Excel) und die Ziffern 3–8 der Zählpunktnummer.
2. **Nahebereich klären.** Netzbetreiber müssen binnen 14 Tagen auskunftspflichtig sein, an welchem Teil des Netzes eine Anlage angeschlossen ist [ElWG § 70 Abs. 6]. Für EEG ist die Auskunft (Trafostation bzw. UW) Teil des Betreibervertrags. Der Netzbetreiber prüft den Anschluss **nur bei der Anmeldung**. Spätere Netzumbauten schaden einer aktiven EEG nicht, Neuanmeldungen werden aber gegen die hinterlegte Trafostation geprüft [HA II 10].
3. **Zählpunkte und Smart Meter prüfen.** Voraussetzung ist ein Smart Meter mit Viertelstundenwerten (oder ein Lastprofilzähler). Der Einbau kann bis zu 2 Monate dauern [HA II 5.1.1, Verweis auf die frühere § 16e-Regel; die Nachfolgeregel ist **zu bestätigen**].
4. **Simulation.** Erzeugungsprofile (PV, Wind, Wasser) und Lastprofile (Standardlastprofile H0/G0–G6/L0–L2 oder echte Viertelstundenwerte der Interessenten per Datenfreigabe) werden zu Eigendeckungsquote, Autarkie, Überschuss und Ersparnis je Teilnehmer verrechnet (Algorithmus siehe 4.5).
5. **Ergebnis:** ein Machbarkeitsbericht (PDF) mit Empfehlung für Typ, Zonelevel, Rechtsform, Tarifkorridor und Mindestteilnehmerzahl sowie ein Risiko-Hinweis bei Schwellen (> 100 kW, siehe § 69).

### 2.3 Gründung
| Schritt | Inhalt | Primärquelle bzw. Vorgabe |
|---|---|---|
| Rechtsform wählen | **Verein** (häufigste Form, gebührenfreie Anzeige, E/A-Rechnung bis 1 Mio. €) oder **Genossenschaft** (Firmenbuch, Revisionsverband, Haftung über Geschäftsanteile, besser für Investitionen) oder GmbH/Personengesellschaft | VerG 2002; GenG; EAG § 79 Abs. 2 |
| Statuten | Zweck „kein Hauptzweck finanzieller Gewinn“ und Vorteile für Mitglieder bzw. Gebiet, Mitgliederkreis nach Typ, offene und freiwillige Teilnahme, Organe, Beitritt und Austritt, Kontrolle (BEG § 67 Abs. 3), Vermögensbindung bei Auflösung, ggf. Online-GV. Muster der Koordinationsstelle verwenden | EAG § 79 Abs. 2; ElWG § 67 Abs. 2–3 |
| Organe Verein | Mitgliederversammlung (mind. alle 5 Jahre), Leitungsorgan (mind. 2 Personen: Obmann/Obfrau, Kassier, Schriftführer), **2 Rechnungsprüfer** | VerG §§ 5, 21 [Details zu bestätigen] |
| Organe Genossenschaft | Generalversammlung, Vorstand (mind. 2), Aufsichtsrat nach GenG, Revision durch den Revisionsverband | GenG, GenRevG [zu bestätigen] |
| Behörde | Verein: Errichtungsanzeige bei der Vereinsbehörde (BH bzw. LPD). Die Behörde hat 4 Wochen (verlängerbar auf 6) Zeit, danach entsteht der Verein, und er bekommt eine ZVR-Zahl. Genossenschaft: Firmenbuch-Eintragung (FN) | VerG § 13 [zu bestätigen] |
| Bankkonto | Konto auf die Rechtsperson, SEPA-Creditor-ID für Lastschriften (bei der OeNB) | – |
| Finanzamt | binnen 1 Monat nach Beginn: **Verf 15a** (Verein) bzw. **Verf 15** (Genossenschaft) und **Verf 26**. Optional **U 12** (Verzicht auf die Kleinunternehmerbefreiung) und **U 15** (UID). Bei Elektrizitätsabgabe-Befreiung: Meldung der Inbetriebnahme binnen **4 Wochen**. Bei Pacht der Anlage: Geb 1 (Rechtsgeschäftsgebühr) | EEG-Ratgeber Steuern 2024 |
| ebUtilities | Registrierung als Marktpartner in der Rolle EEG/BEG/GEA (Upload Identitätsnachweis, Vereinsregister- bzw. Firmenbuchauszug) → Marktpartner-ID `RCxxxxxx` bzw. `CCxxxxxx`. Ab 05.10.2026 optimierter Ablauf, auch für P2P und Eigenversorger | HA II 11; ebUtilities 04/2026 |
| Betreibervertrag | „Vertrag über den Betrieb einer EEG/BEG/GEA“ mit dem Netzbetreiber. Angaben: Marktpartner-ID, Stammdaten, Verteilmodell, Nahebereich (Trafo/UW), **ab 10/2026 Nahebereichs-ID und Organisator**. Der Netzbetreiber vergibt die **Gemeinschafts-ID** (EEG, GEA), bei BEG vergibt sie ebUtilities | HA II 7.1; Koordinationsstelle Schritt 5 |
| EDA-Zugang | EDA-Anwenderportal (kostenlos bis **50 Zählpunkte** je Marktteilnehmer, darüber kostenpflichtig) oder E-Mail-Anbindung (bis ca. 200 ZP) oder KEP (unbegrenzt) mit **EDA-Plattformvertrag**. Ein Dienstleister arbeitet immer **mit der Marktpartner-ID der Gemeinschaft**, entweder als Benutzer im Portal oder bevollmächtigt im Plattformvertrag | HA II 6, 11; Koordinationsstelle Schritt 6 [Preise zu bestätigen] |
| Organisator-Anzeige | Wenn ÖkoInvest Organisator ist: Anzeige an den Netzbetreiber [§ 68 Abs. 2 letzter Satz]. Der Netzbetreiber wird dann **nur vom Organisator** informiert [§ 70 Abs. 2] | ElWG |

**Netzbetreiber-spezifischer Ablauf (Betreibervertrag)**, laut Koordinationsstelle und Netzbetreiberseiten. Fristen und Formulare je Netzbetreiber sind **zu bestätigen**:

| Netzbetreiber | Weg |
|---|---|
| Wiener Netze | Daten bzw. Vertrag per E-Mail an `energiegemeinschaften@wienernetze.at` |
| Netz Niederösterreich | Datenübermittlung per E-Mail nach Schritt-für-Schritt-Anleitung; eigene Seiten für EEG/BEG/GEA auf netz-noe.at |
| Netz Oberösterreich | Online-Formular „Anmeldung Ihrer Energiegemeinschaft beim Netzbetreiber“; LINZ NETZ mit eigener Seite |
| Netz Burgenland | Vertragsvorlage herunterladen, an `info.energiegemeinschaften@netzburgenland.at` |
| Energienetze Steiermark | RC-Nummer und Partnerdaten an `energiegemeinschaften@e-netze.at` |
| Salzburg Netz | Formular zur Anforderung des Vertrags |
| TINETZ | unterschriebenen Vertrag „Betrieb einer EEG“ an `netzanschluss@tinetz.at` (Formular-PDF auf tinetz.at) |
| KNG-Kärnten Netz | Antrag im Portal „Mein Portal“, Vertrag wird zugesandt |
| Vorarlberg Netz | Vorlage herunterladen, per Post (Weidachstraße 10, 6900 Bregenz) oder an `energiegemeinschaft@vorarlbergnetz.at` |
| ca. 120 kleinere VNB (Stadtwerke) | einzeln; Stammdatenpflege in der Plattform (siehe 3.1 `Netzbetreiber`) |

### 2.4 Mitgliedergewinnung und Beitritt
1. **Beitrittsantrag** im Portal: Identität (eID/KYC light), Mitgliedsart (Privat, Landwirt, Unternehmen KMU/groß, Gemeinde, Verein), Prüfung der Zulässigkeit (z. B. kein Großunternehmen in einer EEG), Zählpunkt(e) mit Richtung, steuerlicher Status des Erzeugers (siehe 4.3).
2. **Verträge** (Muster der Koordinationsstelle): Beitrittserklärung bzw. Statuten-Anerkennung, Bezugs- und Leistungsvereinbarung (Verbraucher), Vereinbarung Überschuss- bzw. Volleinspeiser (Erzeuger), ggf. Pacht- oder Nutzungsvertrag der Anlage, Preisblatt, SEPA-Mandat, Datenschutzinformation (Art. 13 DSGVO; Rechtsgrundlage Art. 6 Abs. 1 lit. b für Viertelstundenwerte). Kündigungsfristen laut Koordinationsstelle üblich **3–7 Wochen**. Ab > 100 kW: **AGB nach § 20 und Informationsblatt vor Vertragsschluss** [§ 69 Abs. 1 Z 1–2].
3. **EDA-Anmeldung** `EC_REQ_ONL` mit Zählpunkt, Gemeinschafts-ID, Marktpartner-ID, Energierichtung, Teilnahmefaktor und (statisch) Aufteilungsschlüssel. Der Netzbetreiber prüft sofort nach dem Prinzip *first come, first served*: Anzahl der Teilnahmen (≤ 5), laufende Prozesse, TF-Summe (≤ 100 %, inkl. künftiger Prozessdaten).
4. **Zustimmung des Mitglieds im Netzbetreiber-Portal** binnen **30 Tagen**, sonst wird der Prozess abgelehnt. Mit der Zustimmung kommt die Zusatzvereinbarung zum Netzzugangsvertrag zustande. Offline-Variante `EC_REQ_OFF`: QR-Code vom Netzbetreiber (30 Tage gültig), danach 5 Tage Widerrufsfrist.
5. **Aktivierung**: Der Netzbetreiber baut ggf. den Smart Meter ein, ordnet zu und bestätigt das Aktivierungsdatum (`ABSCHLUSS_ECON`). Ab dann wird der Zählpunkt bei der Zuweisung und bei `CR_MSG` berücksichtigt.

### 2.5 Betrieb
| Aufgabe | Regel | Quelle |
|---|---|---|
| Datenempfang | `CR_MSG` (Nachricht `DATEN_CRMSG`) je Zählpunkt; bisher täglich, ab 10/2026 max. 2 Läufe pro Tag. Inhalt für Verbrauch: Verbrauch laut Messung, Verbrauch × TF, Anteil an der Erzeugung, Eigendeckung, (BEG) Eigendeckung aus Erneuerbaren; für Erzeugung: Erzeugung laut Messung, Erzeugung × TF, Restüberschuss | HA II 13 |
| Datenqualität | Metering Method **L1** (Echtwert), **L2** (belastbarer Ersatzwert), **L3** (nicht belastbar, **nicht für die Abrechnung**; spätestens nach 60 Tagen durch L1/L2 ersetzt; bei BEG/VEZ binnen 15 Kalendertagen, sonst Bewertung mit 0) | HA II 2.3.1, 13.1 |
| Nachforderung | `CR_REQ_PT` (ANFORDERUNG_PT/ANTWORT_PT) bei Lücken | eegfaktura-Doku |
| Abgleich | `EC_PODLIST` (SENDEN_ECP: Zählpunkte, Verteilmodell, Art, Consent-ID, TF – nur die eigene Teilnahme) | HA II 5.5 |
| Plausibilisierung | Lücken, L3-Anteil, Summen (Σ Eigendeckung ≤ Σ Erzeugung × TF), Abweichung eigene Zuteilung ↔ Netzbetreiber, negative Werte, Sprünge. Ab 2026 Toleranzgrenze bzw. monetärer Ausgleich statt Aufrollung | ebUtilities-Konzept [zu bestätigen] |
| Abrechnungszeitpunkt | monatlich, **frühestens ab dem 20. des Folgemonats** (nach dem Clearing des Netzbetreibers) | Koordinationsstelle Schritt 7 |
| Tarife | Preis innerhalb der EEG frei wählbar; Bezugspreis (Gemeinschaft → Verbraucher) und Einspeisepreis (Erzeuger → Gemeinschaft), netto ohne Netzentgelte und Abgaben. Bei Gemeinden ist ein fremdüblicher Preis nötig (Beihilferecht) | Ratgeber Steuern; Koordinationsstelle |
| Rechnung und Gutschrift | Verbraucher: Rechnung der EG über die Eigendeckung. Erzeuger: Gutschrift der EG über die eingebrachte Menge. Restbezug bzw. -überschuss rechnet weiter der Lieferant bzw. Energieabnehmer ab. Netzentgelt-Reduktion und Abgabenbefreiung **zieht der Netzbetreiber bereits auf der Netzrechnung ab** | HA II 4 |
| Rechnungsinhalt (ab > 100 kW Pflicht) | Rechnungsbetrag, Fälligkeit, Energiewerte, Name und Anschrift des Vertragspartners mit Kontaktadresse, **Zählpunktbezeichnungen**; Erläuterung auf Verlangen; mind. jährlich kostenlos; Wahl zwischen Monats- und Jahresrechnung | ElWG § 69 Abs. 1 Z 4–6, Abs. 3 |
| Zahlungsverkehr | SEPA-Lastschrift (pain.008, Mandat) bzw. Überweisung (pain.001) für Gutschriften; Abgleich über camt.053; Mahnwesen | – |
| USt und Steuern | siehe 4.3; UVA monatlich, bei Umsatz ≤ 100.000 € vierteljährlich; KÖSt-Erklärung (K2) | Ratgeber Steuern |
| Elektrizitätsabgabe (EEG) | jährliche Erklärung, bilanzielle Aufzeichnungen der EEG genügen (BMF-Anfragebeantwortung 03.11.2023) | Ratgeber Steuern |
| Jahresabschluss | Verein: E/A-Rechnung mit Vermögensübersicht; bei > 1 Mio. € Einnahmen oder Ausgaben in 2 Folgejahren Bilanz/GuV, > 3 Mio. € erweiterter Abschluss (VerG § 22). Genossenschaft: Jahresabschluss. Rechnungsprüfung | VerG §§ 21–22; GenG § 22 |
| GV bzw. Mitgliederversammlung | Einladung, Tagesordnung, Beschlüsse (Tarife, Entlastung, Wahl), Protokoll. Bestehendes GV-Modul wiederverwenden | – |
| Behördenauskunft | Daten auf Verlangen an E-Control bzw. Abgabenbehörde | ElWG § 70 Abs. 4 |
| Änderungen beim Netzbetreiber | TF ändern (`EC_PRTFACT_CHG`, 1× täglich), Aufteilungsschlüssel (`EC_PRT_CHANGE`, nur statisch, Normierung durch den Netzbetreiber über 100 %); **Wechsel des Verteilmodells oder lokal↔regional = neuer Vertrag + neue Gemeinschafts-ID + alle abmelden und neu anmelden** | HA II 5.6, 8, 9 |

### 2.6 Wechsel einer bestehenden Gemeinschaft zu ÖkoInvest
Ziel: Eine bestehende EEG/BEG/GEA wechselt vom bisherigen Dienstleister (Excel-Tool, eegfaktura u. a.) zu ÖkoInvest, ohne Unterbrechung der Zuweisung.

1. **Mandat**: Vorstandsbeschluss, Dienstleistungsvertrag, Auftragsverarbeitungsvertrag (DSGVO Art. 28), Bestellung als Organisator (§ 68 Abs. 2) und Anzeige an den Netzbetreiber.
2. **Die EDA-Rolle bleibt bei der Gemeinschaft.** Die Marktpartner-ID gehört der EG. ÖkoInvest bekommt entweder (a) einen Benutzer im EDA-Anwenderportal der EG oder (b) eine Bevollmächtigung im EDA-Plattformvertrag (E-Mail/KEP). Den bisherigen Dienstleister trägt man aus bzw. widerruft ihn. **Keine Ab- und Neuanmeldung der Zählpunkte nötig** (Consent-IDs bleiben).
3. **Datenmigration**: Import von Mitgliedern, Zählpunkten, Tarifen und offenen Posten (CSV/XLSX-Vorlage). Danach `EC_PODLIST` anfordern und Ist mit Soll abgleichen (Consent-IDs, TF, Verteilmodell). Historische Viertelstundenwerte holt `CR_REQ_PT` nach (Rückgriff nach Netzbetreiber-Vorgabe, **zu bestätigen**). Für Altzuordnungen vor dem 03.10.2022 lautet die Consent-ID **„Migration“** [HA II 7.2].
4. **Stichtag**: Abrechnungen bis Monat M beim Altdienstleister, ab M+1 bei ÖkoInvest. Saldovortrag offener Posten. Nummernkreis der Belege neu oder fortgeführt (UStG: fortlaufend je Aussteller).
5. **Parallellauf** über einen Monat: eigene Zuteilung gegen die Netzbetreiber-Werte vergleichen, Abweichungsbericht.
6. **ElWG-Anpassungspaket** (für alle Bestandskunden): Statuten und Verträge prüfen (Mustervorlagen des Beratungsservice Erneuerbare Energie Wien bzw. der Koordinationsstelle), § 69-Schwelle prüfen, Organisator-Anzeige, Nahebereichs-ID im Betreibervertrag.

### 2.7 Austritt, Ausschluss, Auflösung
- **Austritt Mitglied**: Kündigung nach Vertrag bzw. Statuten → `CM_REV_SP` mit Prozessdatum = letzter Tag der Zuordnung (frühestens heute, **nicht rückwirkend**) → Schlussabrechnung → Austritt aus dem Verein oder Kündigung des Geschäftsanteils (bestehendes Genossenschaftsmodul).
- **Widerruf durch das Mitglied im Netzbetreiber-Portal**: Eingang `CM_REV_CUS` (die EG ist gezwungen zu folgen) → Status „widerrufen“, Vertragsende prüfen.
- **Auszug bzw. vertragsloser Zustand**: `CM_REV_IMP` (Prozessdatum = Abmeldedatum). Die EG erfährt nicht, wer nachfolgt. Der Nachmieter muss sich neu anmelden.
- **Umwandlung** (lokal↔regional, statisch↔dynamisch): neue Gemeinschafts-ID, alle per `CM_REV_SP` abmelden und neu anmelden. Die Plattform führt das als Massenvorgang mit Fristenplanung durch.
- **Auflösung der Gemeinschaft**: Beschluss → alle Zählpunkte abmelden → Betreibervertrag kündigen → Schlussabrechnung → Vermögensverwendung laut Statuten → Liquidation bzw. Anzeige an die Vereinsbehörde (VerG §§ 28–30), Löschung im Firmenbuch (eGen) → Abmeldung beim Finanzamt → Deregistrierung auf ebUtilities → Aufbewahrung der Belege **7 Jahre** (BAO § 132).

---

## 3. Datenmodell

Konvention wie im Bestand: Frappe-DocTypes `Plattform EG …` (Präfix `plattform_eg_`) mit **normalisierten Feldern**, nicht mehr als JSON-Blob in `daten`. Reine Regeln in `src/lib/plattform/eg/*.js` mit 1:1-Spiegel in `plattform/eg_*_kern.py`. Alle Entitäten haben `id`, `erstellt_am/von`, `geaendert_am/von` und Änderungsverfolgung (Frappe `track_changes`). Relevante Zustandswechsel kommen in die Hashkette (`hashkette.js`).

### 3.1 Übersicht (Beziehungen)

```
Netzbetreiber 1─n Gemeinschaft 1─n Organ(Funktion)
                     │ 1─n Mitglied 1─n Zaehlpunkt-Teilnahme n─1 Zaehlpunkt n─1 Anlage(Erzeugung|Speicher|Verbrauch)
                     │ 1─n Tarif(versioniert)          Zaehlpunkt 1─n Messreihe(15 min)
                     │ 1─n Verteilschluessel(nur statisch, versioniert)
                     │ 1─n Abrechnungsperiode 1─n Beleg(Rechnung|Gutschrift|Storno) 1─n Belegposition
                     │ 1─n EDA-Prozess 1─n EDA-Nachricht
                     └ 0─1 Gruendungsauftrag 1─n Gruendungsschritt
Mitglied n─1 Person/Organisation (Konto) · Zaehlpunkt max. 5 aktive Teilnahmen (Σ TF ≤ 100)
```

### 3.2 Netzbetreiber (Stammdaten)
| Feld | Typ | Bemerkung |
|---|---|---|
| `nb_nummer` | Text(6) | Ziffern 3–8 der Zählpunktnummer, z. B. `003000` = Netz OÖ |
| `name`, `kurzname`, `bundesland[]` | | |
| `marktpartner_id` | Text | EDA-Adressierung |
| `vertragsweg` | Auswahl | email/portal/formular/post |
| `kontakt_email`, `portal_url`, `formular_url` | | aus 2.3 |
| `plz_liste` | Kind-Tabelle | Import aus der Excel-Liste der Koordinationsstelle |
| `netzentgelt_ap` | Kind-Tabelle (gueltig_ab, netzebene, ct_kwh) | aus der SNE-VO je Netzbereich |
| `besonderheiten` | Text | Fristen, Formularstände [zu bestätigen] |

### 3.3 Netzentgelt-Regel (versioniert, netzbetreiberübergreifend)
| Feld | Bemerkung |
|---|---|
| `gueltig_ab`, `gueltig_bis` | 2026: SNE-V 2018 § 5 Abs. 1a; ab 01.01.2027: neue SNE-VO |
| `bezug` | `modell` (bis 2026) bzw. `zonelevel` (ab 2027) |
| `netzebene` | 4, 5, 6, 7 |
| `reduktion_pct` | z. B. 57, 28, 64; 100 für Zonelevel 1/2 (Hypothese) |
| `abgaben_befreit` | Elektrizitätsabgabe, Erneuerbaren-Förderbeitrag (nur EEG) |
| `quelle_url`, `status` | `gesichert` / `entwurf` |

### 3.4 Gemeinschaft
| Feld | Typ | Validierung / Bemerkung |
|---|---|---|
| `name`, `kurzname` | Text | |
| `modell` | Auswahl `gea`, `eeg`, `beg`, `p2p`, `eigenversorgung` | |
| `zonelevel` | 1–7 | EEG nur 3 oder 4/5 |
| `nahebereich_ref` | Text | Trafostations- bzw. UW-ID oder Anschlussobjekt |
| `rechtsform` | `verein`, `egen`, `gmbh`, `og_kg`, `keine` (GEA/P2P) | `keine` nur bei GEA/P2P |
| `zvr_zahl` / `firmenbuchnummer` | Text | je nach Rechtsform Pflicht |
| `sitz_adresse`, `email`, `telefon` | | |
| `uid`, `steuernummer`, `finanzamt` | | UID nur bei Regelbesteuerung |
| `ust_status` | `kleinunternehmer`, `regelbesteuert` | mit `ust_option_seit` (U 12, 5 Jahre bindend) |
| `iban`, `bic`, `creditor_id` | | SEPA |
| `netzbetreiber[]` | Link-Liste | BEG und Zonelevel 5/7: mehrere |
| `marktpartner_id` | Text `^(RC|CC|GC|…)\d{6}$` | Präfixe für P2P/EV **zu bestätigen** |
| `gemeinschafts_id` | Text(33) | EEG: `AT` + NB(6) + PLZ(5, optional `00000`) + `RC` + 6 Ziffern + 12 Zeichen; GEA mit `GC`; BEG: `AT` + `CC9999` + `DYNAM`/`STATI` + `CC` + 6 + 12 |
| `verteilmodell` | `dynamisch`, `statisch` | neu ab 10/2026 nur dynamisch; ein Wechsel erzeugt eine neue Gemeinschaft (Nachfolger-Link) |
| `vorgaenger_id` | Link | Umwandlung |
| `eda_anbindung` | `anwenderportal`, `email`, `kep` | Portal kostenlos bis 50 ZP |
| `organisator` | Link Organisation (ÖkoInvest) | `organisator_angezeigt_am` |
| `erzeugungsleistung_kw` | berechnet | Σ aktive Erzeugungsanlagen; > 100 kW (bzw. > 30 kW Haushalt) → `lieferantenpflichten = true` |
| `abrechnungsrhythmus` | `monat`, `quartal`, `jahr` | je Mitglied wählbar, wenn § 69 greift |
| `status` | siehe unten | |
| `statuten_version`, `betreibervertrag_datum` | Link Dokument | |

**Status Gemeinschaft:** `interesse` → `machbarkeit` → `in_gruendung` → `rechtsperson` (ZVR/FN) → `marktpartner` (ebUtilities) → `vertrag_nb` (Gemeinschafts-ID) → `eda_bereit` → `aktiv` ⇄ `aufnahmestopp` → `in_aufloesung` → `aufgeloest`. Zusätzlich gibt es `umgewandelt` (mit Nachfolger).

### 3.5 Organ und Funktion
| Feld | Bemerkung |
|---|---|
| `gemeinschaft`, `person` (Konto) | |
| `funktion` | `obmann`, `obmann_stv`, `kassier`, `schriftfuehrer`, `rechnungspruefer`, `vorstand`, `aufsichtsrat`, `geschaeftsfuehrer` |
| `von`, `bis`, `gewaehlt_in` (GV-Link) | Funktionsperiode |
| `zeichnungsberechtigt` | bool (Vier-Augen-Freigaben) |

Regeln: Verein ≥ 2 Personen im Leitungsorgan und 2 Rechnungsprüfer, die nicht dem Leitungsorgan angehören [VerG § 5, zu bestätigen].

### 3.6 Mitglied
| Feld | Bemerkung |
|---|---|
| `gemeinschaft`, `konto` | |
| `mitgliedsnummer` | fortlaufend je Gemeinschaft |
| `art` | `privat`, `landwirt`, `kmu`, `grossunternehmen`, `gemeinde`, `oeffentlich`, `verein` |
| `unternehmensgroesse_nachweis` | Großunternehmen nach ElWG § 6 Abs. 1 Z 61: ≥ 250 MA oder > 50 Mio. € Umsatz bzw. > 43 Mio. € Bilanzsumme → EEG unzulässig |
| `steuerstatus_erzeuger` | `nicht_unternehmerisch`, `kleinunternehmer`, `pauschalierter_landwirt` (§ 22 UStG, 13 %), `regelbesteuert` (Reverse Charge), `gemeinde_bga` |
| `uid` | Pflicht bei `regelbesteuert` |
| `schutzbeduerftiger_haushalt` | bool + Nachweis (für die 10-%-Regel, § 68 Abs. 6) |
| `iban`, `sepa_mandat` (Referenz, Datum, Status) | |
| `rechnungsweg` | Portal, E-Mail, Post |
| `abrechnungsrhythmus` | wenn § 69 greift |
| `vertraege[]` | Links (Beitritt, Bezug, Einspeisung, Pacht, Datenschutz, AGB-Version, Info-Blatt-Version) |
| `status` | `interessent` → `antrag` → `geprueft` → `aufgenommen` → `aktiv` → `gekuendigt` → `ausgeschieden`; Nebenpfade `abgelehnt`, `ausgeschlossen` |

### 3.7 Zählpunkt
| Feld | Bemerkung |
|---|---|
| `zaehlpunktnummer` | 33 Zeichen, Prüfung `zaehlpunktPruefen` (Bestand); daraus `netzbetreiber` und `plz` ableiten |
| `richtung` | `verbrauch` (CONSUMPTION), `erzeugung` (GENERATION) |
| `anlage` | Link (Verbrauchs-, Erzeugungs- oder Speicheranlage) |
| `inhaber` | Konto (kann vom Mitglied abweichen, z. B. Pächter) |
| `smart_meter` | ja, nein, unbekannt; `qh_aktiv` |
| `nahebereich_ref` | Trafo/UW laut Auskunft, `auskunft_am` |
| `netzebene` | 4–7 |
| `lieferant` / `energieabnehmer` | Text (Info, keine Pflicht) |

### 3.8 Zählpunkt-Teilnahme (Kern der EDA-Abbildung)
| Feld | Bemerkung |
|---|---|
| `zaehlpunkt`, `gemeinschaft`, `mitglied` | |
| `teilnahmefaktor` | Ganzzahl 1–100; Σ über alle *aktiven und geplanten* Teilnahmen des Zählpunkts ≤ 100 (soweit bekannt; fremde EGs sieht nur der Netzbetreiber) |
| `aufteilungsschluessel_pct` | nur statisch, eine Nachkommastelle zulässig [Format **zu bestätigen**] |
| `consent_id` | aus `ZUSTIMMUNG_ECON` bzw. `SENDEN_ECP`; „Migration“ bei Altfällen |
| `gueltig_ab`, `gueltig_bis` | Aktivierungsdatum laut `ABSCHLUSS_ECON`; Ende = letzter Zuordnungstag |
| `tf_historie` | Kind-Tabelle (gültig_ab, TF, Prozess-ID) |
| `status` | siehe Automat |

**Zustandsautomat Teilnahme** (Spiegel der EDA-Prozesse):

```
entwurf ──senden EC_REQ_ONL──▶ angefragt ──ANFORDERUNG_ECON (NB akzeptiert)──▶ zustimmung_offen (30 Tage)
   │                              └─ABLEHNUNG_ECON──▶ abgelehnt(grund=responsecode)
zustimmung_offen ──ZUSTIMMUNG_ECON──▶ zugestimmt ──ANTWORT_ECON (z. B. kein Smart Meter)──▶ wartet_technik
zustimmung_offen ──Frist 30 T / Ablehnung──▶ abgelaufen
zugestimmt|wartet_technik ──ABSCHLUSS_ECON(datum)──▶ aktiv
aktiv ──EC_PRTFACT_CHG ok──▶ aktiv (neuer TF ab Datum)      aktiv ──CM_REV_SP──▶ abmeldung_angefragt ──ok──▶ beendet
aktiv ──CM_REV_CUS (Mitglied widerruft)──▶ beendet(widerruf)   aktiv ──CM_REV_IMP (Auszug/VZ)──▶ beendet(implizit)
```

### 3.9 Anlage (Erzeugung, Speicher)
| Feld | Bemerkung |
|---|---|
| `art` | `pv`, `wind`, `wasser`, `biomasse`, `speicher`, `verbrauch` |
| `engpassleistung_kw`, `kwp`, `ausrichtung`, `neigung`, `standort` (Geo) | für Simulation und § 69-Schwelle |
| `eigentuemer`, `betreiber`, `betriebsfuehrung` | Dritte zulässig, wenn weisungsgebunden [§ 66 Abs. 2, § 67 Abs. 7] |
| `nutzungsmodell` | `ueberschuss`, `volleinspeisung`, `pacht`, `eigenanlage_eg` |
| `foerderung` | EAG-Investzuschuss / Marktprämie (EEG: max. 50 % der Erzeugung) |
| `inbetriebnahme`, `hkn_registriert` (EAG § 81) | |
| `speicher_kwh`, `speicher_ladequelle` | Gemeinschaftsspeicher derzeit nur bei Beladung aus *einer* Erzeugungstechnologie; Messkonzepte nach § 111 ElWG sind offen [Koordinationsstelle] |
| `iot_quelle` | Verweis auf ÖKOVOLT-Monitoring (`ANLAGEN-IOT.md`) für die Echtzeitansicht |

### 3.10 Tarif (versioniert)
| Feld | Bemerkung |
|---|---|
| `gemeinschaft`, `gueltig_ab`, `gueltig_bis`, `beschluss` (GV/Vorstand) | |
| `bezugspreis_ct` | netto, bis 4 Nachkommastellen |
| `einspeisepreis_ct` | netto |
| `zeitfenster[]` | optional: TOU (z. B. Mittag günstiger, Saisonbänder). Jede Viertelstunde wird mit dem zu ihrer Zeit gültigen Preis bewertet |
| `grundgebuehr_monat`, `zaehlpunktgebuehr_monat`, `einmalgebuehr_beitritt` | |
| `mitgliedsbeitrag_jahr` | „unechter“ Mitgliedsbeitrag ist USt-pflichtig (Leistungsaustausch) [Ratgeber Steuern, VereinsR] |
| `sozialtarif` | Preis bzw. Kontingent für schutzbedürftige Haushalte (Gemeinde-Erzeugung, mind. 10 %) |
| `individuell[]` | Abweichungen je Mitglied (dokumentierter Grund) |

### 3.11 Verteilschlüssel (statisch, versioniert)
`gemeinschaft`, `gueltig_ab`, Positionen (`teilnahme`, `pct`), `eda_prozess` (`EC_PRT_CHANGE`), `summe_pct` (Warnung ≠ 100; der Netzbetreiber normiert erst über 100 %).

### 3.12 Messwertreihe (15 Minuten)
Nicht in MariaDB-Zeilen je Viertelstunde (35.040 Werte je ZP und Jahr). Stattdessen **Tagesblöcke** (96 bzw. 92/100 Werte bei Zeitumstellung, UTC-basiert):

| Feld | Bemerkung |
|---|---|
| `zaehlpunkt`, `gemeinschaft` (bei EG-bezogenen Größen), `tag` (Lokaldatum), `beginn_utc` | |
| `groesse` | `verbrauch_gemessen`, `verbrauch_tf`, `anteil_erzeugung`, `eigendeckung`, `eigendeckung_ee` (BEG), `erzeugung_gemessen`, `erzeugung_tf`, `restueberschuss` |
| `werte` | Array kWh (Float64, volle Präzision wie geliefert) |
| `qualitaet` | Array `L1`, `L2`, `L3` |
| `quelle` | EDA-Nachricht-ID, Version (spätere Lieferungen ersetzen, Historie bleibt) |
| `summe_kwh`, `anteil_l3`, `vollstaendig` | berechnet |

Monatsaggregat `plattform_eg_messmonat` (je ZP, Größe, Monat) für schnelle Listen. Rohnachrichten (XML) als Datei mit SHA-256 ablegen (Beweissicherung).

### 3.13 Abrechnungsperiode, Beleg, Zahlung
**Abrechnungsperiode:** `gemeinschaft`, `von`, `bis`, `art` (`monat`, `quartal`, `jahr`, `schluss`), `status` `offen` → `daten_vollstaendig` (keine L3, alle ZP) → `vorschau` → `freigegeben` (Vier-Augen: Kassier + Obmann bzw. Organisator) → `versendet` → `abgeschlossen`. Dazu `storniert` (nur über Stornobelege). Kennzahlen: Σ Erzeugung, Σ Eigendeckung, Restüberschuss, Abweichung zum NB, Anzahl Schätzwerte.

**Beleg:** `typ` (`rechnung`, `gutschrift`, `storno`, `schlussrechnung`), `nummer` (fortlaufend je Gemeinschaft und Jahr, lückenlos), `periode`, `mitglied`, `empfaenger_adresse`, `ust_regel` (siehe 4.3), `netto`, `ust_satz`, `ust_betrag`, `brutto`, `hinweistext` (Kleinunternehmer / Reverse Charge / § 22), `faellig_am`, `zahlweg`, `pdf` (+ Hash), `status` (`entwurf`, `final`, `versendet`, `bezahlt`, `teilbezahlt`, `gemahnt`, `storniert`), `bezug_storno`. **Positionen:** Zählpunkt, Größe, kWh, Preis, Zeitfenster, netto, ggf. TF-Hinweis; separat und *informativ*: Netzentgelt-Ersparnis, Abgabenersparnis.

**Zahlung bzw. Lastschrift:** Mandatsreferenz, Ausführungsdatum, pain.008/pain.001-Datei, camt.053-Abgleich, Rücklastschrift mit Gebühr, Mahnstufe. Bestehendes `finanzen/sepa.js` und `buchhaltung/{op,mahnwesen,zahlungsimport}.js` wiederverwenden.

### 3.14 EDA-Prozess und EDA-Nachricht
**Prozess:** `prozesscode` (`EC_REQ_ONL`, `EC_REQ_OFF`, `EC_PRTFACT_CHG`, `EC_PRT_CHANGE`, `EC_PODLIST`, `CM_REV_SP`, `CM_REV_CUS`, `CM_REV_IMP`, `CR_REQ_PT`, `CR_MSG`, später neue ElWG-Prozesse), `version` (Schema, z. B. CMRequest 01.30, ECMPList 01.10, CPRequest 01.12, CMRevoke 01.10 laut eegfaktura-Doku, **vor Einsatz gegen ebutilities.at prüfen**), `conversation_id`, `gemeinschaft`, `teilnahme`, `zaehlpunkt`, `prozessdatum`, `status` (`entwurf`, `gesendet`, `bestaetigt`, `abgelehnt`, `abgeschlossen`, `fehler`, `zeitueberschreitung`), `responsecode`, `frist_bis`.
**Nachricht:** `richtung` (aus/ein), `nachrichtencode` (`ANFORDERUNG_ECON`, `ANTWORT_ECON`, `ABLEHNUNG_ECON`, `ZUSTIMMUNG_ECON`, `ABSCHLUSS_ECON`, `ANFORDERUNG_CPF`, `ANTWORT_CPF`, `ABLEHNUNG_CPF`, `AUFHEBUNG_CCMS`, `ANTWORT_CCMS`, `ABLEHNUNG_CCMS`, `ANFORDERUNG_PT`, `ANTWORT_PT`, `ABLEHNUNG_PT`, `SENDEN_ECP`, `DATEN_CRMSG`, `ABLEHNUNG_CRMSG`, `EDASendError`), `message_id`, `zeitpunkt`, `xml` (Datei + SHA-256), `verarbeitet`, `fehler`. Eingänge sind **idempotent** (Message-ID), Verarbeitung im Hintergrund-Job, Wiederholung mit Backoff.

### 3.15 Gründungsauftrag (Dienstleistung ÖkoInvest)
| Feld | Bemerkung |
|---|---|
| `auftraggeber` (Konto: Gemeinde, Initiative, Unternehmen), `ansprechpartner` | |
| `paket` | `check` (Machbarkeit), `gruendung` (bis EDA-bereit), `komplett` (inkl. Mitgliederaufnahme und erstes Betriebsjahr), `wechsel` (Bestands-EG) |
| `angebot` (Betrag, Gültigkeit), `auftrag_am`, `vollmachten[]` | Vollmachten für Behördenwege und ebUtilities |
| `schritte[]` | Kind-Tabelle wie `plattform_gruendungsschritt` (schluessel, reihenfolge, pflicht, frist, status, nachweis) |
| `gemeinschaft` | Link, sobald angelegt |
| `status` | `anfrage` → `angebot` → `beauftragt` → `machbarkeit` → `rechtsform_statuten` → `konstituierung` → `behoerde` → `finanzamt_bank` → `marktpartner` → `nb_vertrag` → `eda` → `mitgliederaufnahme` → `betriebsbereit` → `uebergeben`; `abgebrochen` |

Standard-Schritte (Vorlage): Interessentenliste, Netzbetreiber-Auskunft (Nahebereich), Simulation, Rechtsformentscheidung, Statuten aus Vorlage, Gründungsversammlung (Protokoll, Wahl der Organe), Vereinsanzeige bzw. Firmenbuch, ZVR/FN erhalten, Bankkonto und Creditor-ID, Verf 15a/15 + Verf 26 (+ U 12/U 15), ElAbg-Meldung (4 Wochen nach Inbetriebnahme), ebUtilities-Registrierung, Betreibervertrag, Organisator-Anzeige, EDA-Zugang, Verträge und Preisblatt, AGB und Info-Blatt (falls § 69), Datenschutz (VVT, AVV), Erstanmeldung der Zählpunkte, erste Abrechnung.

---

## 4. Algorithmen

Notation je Viertelstunde *q*: gemessene Erzeugung `E_j,q` (Erzeugungs-ZP *j*), gemessener Verbrauch `V_i,q` (Verbrauchs-ZP *i*), Teilnahmefaktoren `TF_j`, `TF_i` (in %), statischer Schlüssel `s_i`.

### 4.1 Vorverarbeitung (beide Modelle)
```
E'_j,q = E_j,q · TF_j/100        V'_i,q = V_i,q · TF_i/100        (HA II 12, ab 08.04.2024)
E'_q   = Σ_j E'_j,q             (mehrere Anlagen: zuerst je Viertelstunde summieren, ElWG § 71 Abs. 4)
```

### 4.2 Dynamisches Modell
```
V'_q   = Σ_i V'_i,q
A_i,q  = E'_q · V'_i,q / V'_q            falls V'_q > 0, sonst 0         (Anteil an der Erzeugung)
ED_i,q = min(A_i,q, V'_i,q)                                              (Eigendeckung)
       = V'_i,q                     wenn E'_q ≥ V'_q
       = E'_q · V'_i,q / V'_q       wenn E'_q < V'_q
R_q    = max(0, E'_q − V'_q)                                             (Restüberschuss der EG)
R_j,q  = R_q · E'_j,q / E'_q                                             (Rückverteilung auf Erzeuger)
```
Weil die Zuteilung proportional zum Verbrauch erfolgt, ist **keine Iteration** nötig. Die Bestandsfunktion `verteilen()` iteriert und kommt auf dasselbe Ergebnis, ist aber unnötig komplex. Prüfwert aus HA II (18:00–18:15): `E'=0,50`, `V'_1=0,25`, `V'_2=0,80` → `A_1=0,119`, `A_2=0,381`, `ED_1=0,119`, `ED_2=0,381` (die Tabelle in HA II zeigt 0,12 und 0,38). Das gehört als Testfall in die Testsuite.

### 4.3 Statisches Modell
```
Σs = Σ_i s_i ;  s*_i = s_i / Σs  wenn Σs > 100 %, sonst s*_i = s_i       (Normierung nur über 100 %, HA II 12.2)
A_i,q  = E'_q · s*_i
ED_i,q = min(A_i,q, V'_i,q)
R_q    = E'_q − Σ_i ED_i,q       (nicht genutzte Anteile werden NICHT umverteilt, sie gelten als Überschuss)
```
Prüfwert HA II (14:30): `E'=1,90`, `s=40/90 %` → `s*=30,77/69,23 %`, `A=0,585/1,315`, `V'=0,50/0,80` → `ED=0,50/0,80`, `R=0,60`. (HA II weist 2,5 kWh Restmenge laut Messung *inkl.* des nicht teilnehmenden Anteils 1,9 kWh aus.) Bei neuen Gemeinschaften ab 10/2026 ist das statische Modell voraussichtlich nicht mehr verfügbar und wird nur noch für Bestands-EG gepflegt.

### 4.4 Rundung und Maßgeblichkeit
- **Maßgeblich für die Abrechnung sind die vom Netzbetreiber gelieferten Werte** (`eigendeckung`, `restueberschuss`) [ElWG § 71 Abs. 1 und 4]. Die eigene Berechnung dient der Simulation, Plausibilisierung und Echtzeit-Vorschau.
- Energiewerte: volle Präzision speichern (wie in `CR_MSG` geliefert, Nachkommastellen laut Schema **[zu bestätigen]**). Summen erst auf Periodenebene runden. Anzeige auf 3 Nachkommastellen (kWh).
- Reduzierter Netzarbeitspreis: **in ct/kWh auf zwei Kommastellen kaufmännisch runden** [SNE-V 2018 § 5 Abs. 1a letzter Satz].
- Geld: Positionsbetrag = kWh (ungerundet, Periodensumme) × Preis, kaufmännisch auf 0,01 € runden; USt je Steuersatz auf die Netto-Summe des Belegs; Summe = Σ gerundete Positionen. Das entspricht der Rundung in `rund2` des Bestands (JS-Rundung `_js_round` ist im Python-Spiegel schon vorhanden, Parität erhalten).
- Abweichung eigene ↔ NB-Zuteilung: Toleranz z. B. 0,5 % bzw. 0,1 kWh je ZP und Monat konfigurierbar. Darüber entsteht ein Klärfall (`plattform_klaerfall` wiederverwenden). Für die künftige Toleranz bzw. den monetären Ausgleich der Netzbetreiber gibt es noch keine Festlegung [zu bestätigen].

### 4.5 Abrechnungsformeln je Periode P
```
Bezugsrechnung Mitglied m (Verbrauchs-ZP i ∈ m):
  Netto_m = Σ_i Σ_q∈P ED_i,q · p_bezug(q)          (TOU: Preis zum Zeitpunkt q; sonst konstant)
          + Grundgebühr · Monate + Zählpunktgebühr · #ZP · Monate + Mitgliedsbeitrag (falls verrechnet)
Gutschrift Erzeuger m (Erzeugungs-ZP j ∈ m):
  G_j     = Σ_q∈P (E'_j,q − R_j,q)                  (in die EG eingebrachte und verbrauchte Menge)
  Netto_m = Σ_j G_j · p_einspeis(q)
Prosumer: getrennte Belege (Rechnung + Gutschrift), Verrechnung im OP (Aufrechnungsvereinbarung im Vertrag).
Kontrolle: Σ_m Σ_i ED = Σ_m Σ_j G  (Toleranz durch Rundung)
```
**USt-Logik** (Ratgeber Steuern 2024, BMF-Anfragebeantwortung 03.11.2023; Kleinunternehmergrenze ab 2025):

| Fall | Ausgangsrechnung der EG an Verbraucher | Gutschrift der EG an Erzeuger |
|---|---|---|
| EG ist **Kleinunternehmer** (Jahresumsatz ≤ 55.000 € **brutto**, Toleranz bis 60.500 € im laufenden Jahr; § 6 Abs. 1 Z 27 UStG) | 0 % mit Hinweis „Umsatzsteuerbefreit – Kleinunternehmer gem. § 6 Abs. 1 Z 27 UStG“; kein Vorsteuerabzug | siehe Erzeuger-Spalte; **Achtung:** Reverse-Charge-Steuer schuldet die EG auch als Kleinunternehmer, dann UVA bzw. Erklärung ohne Vorsteuerabzug |
| EG **regelbesteuert** (Option U 12, 5 Jahre bindend) | 20 % USt | |
| Erzeuger **nicht unternehmerisch** (Schenkung bzw. unentgeltlich) | – | keine Gutschrift bzw. 0 €, umsatzsteuerlich nicht relevant |
| Erzeuger **Kleinunternehmer** (typisch Privat-PV) | – | 0 %, Hinweis Kleinunternehmer, **kein** Reverse Charge |
| Erzeuger **pauschalierter Landwirt** (§ 22 UStG) | – | **13 %** USt auf der Gutschrift, kein Reverse Charge; Vorsteuer für die regelbesteuerte EG |
| Erzeuger **regelbesteuerter Unternehmer** bzw. **Gemeinde mit BgA** | – | **Reverse Charge** (§ 19 Abs. 1c UStG, Lieferung von Strom an einen Wiederverkäufer): 0 % mit Hinweis „Übergang der Steuerschuld“, UID beider Seiten; die EG führt 20 % ab und zieht sie als Vorsteuer ab (bei Regelbesteuerung) |
| Mitgliedsbeitrag | „unecht“ (Leistungsaustausch) → USt-pflichtig wie die Lieferung; echter Beitrag nicht steuerbar | – |

Weitere Regeln:
- **Gutschriftverfahren** (§ 11 Abs. 7 UStG): Die Gutschrift gilt als Rechnung, wenn das vereinbart ist und der Empfänger nicht widerspricht. Pflichtangaben wie bei einer Rechnung, inkl. UID des Leistenden bei RC und „Gutschrift“. Die Klausel kommt in die Einspeisevereinbarung.
- **Kleinunternehmer-Monitor**: Laufender Brutto-Umsatz der EG gegen 55.000 € bzw. 60.500 € mit Warnung ab 80 %. Die Plattform schlägt die Option U 12 vor, wenn Vorsteuer aus Investitionen überwiegt.
- **Ertragsteuer der Erzeuger** (Hinweis, keine Berechnung): Einspeiseerlöse natürlicher Personen bis **12.500 kWh/Jahr** sind steuerfrei, wenn die Anlage ≤ 35 kWp und ≤ 25 kW Anschlussleistung hat (§ 3 Abs. 1 Z 39 EStG). Das gilt auch für die Lieferung an Energiegemeinschaften (BMF). Die Plattform liefert eine **Jahresbescheinigung kWh/€** je Erzeuger.
- **KÖSt** der EG (Verein bzw. eGen, keine Mindest-KÖSt) auf den Gewinn: Vorbereitung der E/A-Rechnung bzw. des Jahresabschlusses, Export an den Steuerberater (DATEV/BMD-CSV).

### 4.6 Netzentgelt- und Abgabenersparnis (Ausweis, informativ)
```
Ersparnis_i,P ≈ Σ_q ED_i,q · [ AP_NNE(NB, NE_i, q) · r(Regel, q)            (reduzierter Netznutzungs-AP, r = 0,57 / 0,28 / 0,64 …)
                              + ElAbg(q, Kundengruppe) · befreit(EEG)        (2026: 0,1 ct Haushalt / 0,82 ct sonst [zu bestätigen]; 2027: 1,5 ct [zu bestätigen])
                              + EFB_AP(NB, q) · befreit(EEG) ]               (Erneuerbaren-Förderbeitrag, arbeitsbezogener Teil, EAG § 75 Abs. 5)
Energiepreisvorteil_i,P ≈ Σ_q ED_i,q · (p_lieferant,i − p_bezug(q))          (p_lieferant vom Mitglied angegeben oder Tarifkalkulator)
Erzeugervorteil_j,P   ≈ Σ_q G_j,q · (p_einspeis(q) − p_markt_ueberschuss)     (Vergleich mit OeMAG/Marktwert bzw. Abnahmevertrag)
```
Die Ersparnis steht **separat** auf dem Beleg als „Ihr Vorteil durch die Energiegemeinschaft (Schätzung, die Abrechnung erfolgt durch Ihren Netzbetreiber)“. Der reduzierte AP wird gerundet wie in 4.4. Regeln kommen aus der Tabelle 3.3 (Datum, Zonelevel, Netzebene). Ab 2027 hängen sie nicht mehr an der Form.

### 4.7 Simulation vor der Gründung
1. **Erzeugung**: stündliche bzw. viertelstündliche PV-Erträge aus PVGIS (JRC, je Standort, kWp, Ausrichtung, Neigung, typisches meteorologisches Jahr), auf 15 min interpoliert. Wind und Wasser über Jahresenergie und Profil. Bestandswerte als Fallback (`ALLGEMEIN.pvMonatsanteile`).
2. **Verbrauch**: echte 15-min-Werte (Datenfreigabe der Interessenten über den Netzbetreiber bzw. CSV-Upload aus dem Netzbetreiber-Portal) oder synthetische Standardlastprofile (H0, G0–G6, L0–L2, skaliert auf den Jahresverbrauch; Quelle: APCS/E-Control-Profile **[Lizenz und Bezug zu bestätigen]**). Wärmepumpe und E-Auto als Zusatzprofile.
3. **Eigenverbrauch hinter dem Zähler** vorziehen: Überschuss_j = max(0, Erz_j − EigenVerbr_j) je q. Nur der Überschuss steht der EG zur Verfügung (bei Überschusseinspeisern).
4. Zuteilung nach 4.2 bzw. 4.3, inkl. TF-Szenarien.
5. **Kennzahlen**: Eigendeckungsquote (Σ ED/Σ V), Nutzungsgrad (Σ ED/Σ E'), Restüberschuss, Ersparnis je Mitglied (4.6), EG-Deckungsbeitrag (Bezugspreis − Einspeisepreis) · Σ ED − Fixkosten, Kleinunternehmerprognose, § 69-Schwelle.
6. **Sensitivität**: Teilnehmerzahl, Preise, zusätzliche Anlage bzw. Speicher, Tarifspreizung. Monte-Carlo über Wetterjahre (optional).
7. **Speicher (Empfehlung)**: Greedy je q: Laden bei R_q > 0, Entladen bei V'_q > E'_q (Wirkungsgrad, SOC-Grenzen). Rechtlicher Hinweis zur Speicherbeladung (3.9).

### 4.8 Prognose im Betrieb
- PV-Day-Ahead aus der Wettervorhersage (z. B. Open-Meteo bzw. GeoSphere Austria, **Lizenz prüfen**) × Anlagenmodell, kalibriert mit dem gemessenen `E'` der letzten 30 Tage. Verbrauch über das gleitende Wochentagsprofil.
- Ergebnis: „Grüne Stunden“ morgen (E'_q > V'_q) als Empfehlung für Lastverschiebung bzw. Wallbox, nur als Empfehlung, keine Steuerung in Phase 1.

### 4.9 Mehrfachteilnahme-Optimierung (Empfehlung an Mitglied bzw. Vorstand)
Für einen Zählpunkt mit Kandidaten-Gemeinschaften k = 1..K (K ≤ 5):
```
maximiere  Σ_k Wert_k(TF_k)      mit Wert_k = erwartete ED bzw. G × Preisvorteil_k (inkl. Netzentgeltvorteil nach Zonelevel)
unter      Σ_k TF_k ≤ 100,  TF_k ∈ {0} ∪ {1..100} ganzzahlig,  #k mit TF_k>0 ≤ 5
```
Weil `Wert_k` je EG in TF etwa konkav ist (die Eigendeckung sättigt), genügt ein Greedy-Verfahren in 1-%-Schritten mit Grenznutzen bzw. Wasserfüllung. Restriktionen: Wechsel nur 1× täglich (bis 2028), fremde EGs sieht nur der Mitglieds-Nutzer selbst (Daten aus dem eigenen Netzbetreiber-Portal bzw. von Eingaben, nicht per EDA).

### 4.10 Sozialquote (§ 68 Abs. 6)
Wenn eine Gebietskörperschaft mit eigener Anlage teilnimmt: Σ_Jahr G an schutzbedürftige Haushalte bzw. Einrichtungen ≥ 10 % · Σ_Jahr (für die gemeinsame Nutzung erzeugt und eingespeist). Laufender Monitor, Warnung und Steuerung über TF bzw. Sozialtarif.

---

## 5. Rollen und Rechte

Umsetzung über die bestehende Rechte-Matrix (`rechte.js` / `plattform/rechte.py`) mit dem neuen Bereich `energiegemeinschaft`. Rollen sind **je Gemeinschaft** zugeordnet (Kontext-Rolle), nicht global.

| Recht \ Rolle | Interessent | Mitglied Verbraucher | Mitglied Erzeuger / Prosumer | Gemeinde (als Mitglied) | Obmann / Vorstand | Kassier | Schriftführer | Rechnungsprüfer | ÖkoInvest-Betriebsführung (Organisator) | ÖkoInvest-Gründungsberatung |
|---|---|---|---|---|---|---|---|---|---|---|
| Eigene Daten, Zählpunkte, Belege, Dashboard | eigene Anfrage | ✔ | ✔ | ✔ (alle eigenen ZP) | ✔ | ✔ | ✔ | ✔ | – | – |
| Beitritt beantragen, TF-Wunsch, Kündigung | ✔ (Antrag) | ✔ | ✔ | ✔ | – | – | – | – | – | – |
| Mitgliederliste (Name, Status) | – | – | – | – | ✔ | ✔ | ✔ | lesen | ✔ | im Auftrag |
| Mitglied aufnehmen bzw. ablehnen | – | – | – | – | ✔ (Beschluss) | – | – | – | vorbereiten, ausführen nach Freigabe | – |
| EDA-Prozesse auslösen (Anmeldung, TF, Abmeldung) | – | – | – | – | freigeben | – | – | – | ✔ | in der Gründung ✔ |
| Viertelstundenwerte aller Mitglieder | – | – | – | – | aggregiert; einzeln nur bei Bedarf (Zweckbindung) | aggregiert | – | Stichprobe | ✔ (Auftragsverarbeitung) | – |
| Tarife und Preisblatt ändern | – | – | – | – | ✔ (nach Satzung GV/Vorstand) | Vorschlag | – | – | vorbereiten | – |
| Abrechnungslauf: Vorschau / Freigabe / Versand | – | – | – | – | Freigabe (2. Auge) | Freigabe (1. Auge) | – | lesen | Vorschau, Versand | – |
| SEPA-Dateien erzeugen, Zahlungen abgleichen | – | – | – | – | – | ✔ | – | lesen | ✔ (wenn beauftragt) | – |
| Buchhaltung, UVA-Vorbereitung, Jahresabschluss | – | – | – | – | lesen | ✔ | – | ✔ prüfen | ✔ | – |
| GV einberufen, Protokoll | – | Teilnahme und Stimme | Teilnahme und Stimme | Stimme | ✔ | – | ✔ Protokoll | Bericht | Unterstützung | – |
| Statuten, Organe, Stammdaten der EG | – | lesen (Statuten) | lesen | lesen | ✔ | – | ✔ | – | vorbereiten | ✔ in der Gründung |
| Gründungsauftrag | eigener Auftrag (als Auftraggeber) | – | – | ✔ als Auftraggeber | ✔ als Auftraggeber | – | – | – | – | ✔ |
| Audit-Log der EG | – | – | – | – | ✔ | ✔ | – | ✔ | ✔ | – |

Grundsätze: **Vier-Augen-Prinzip** für Abrechnungsfreigabe, Zahlungsdateien und Massenabmeldungen; **Zweckbindung** der 15-min-Daten (DSGVO Art. 5 Abs. 1 lit. b): Vorstände sehen standardmäßig Aggregate; jede Einzeleinsicht wird protokolliert. Gemeinde-Mitglieder bekommen eine Sammelansicht aller Gemeinde-Zählpunkte (Gemeindeamt, Schule, Kläranlage …). ÖkoInvest-Rollen sind Backoffice-Rollen und wirken nur für Gemeinschaften mit aktivem Dienstleistungs- bzw. AV-Vertrag.

---

## 6. Pflicht- und Kür-Funktionen

### 6.1 Pflicht (ohne das kein Betrieb)
1. Stammdaten von EG, Organen, Mitgliedern, Zählpunkten und Anlagen mit Validierung (ZP-Format, Gemeinschafts-ID, Zulässigkeit nach Typ, Großunternehmen, 6 MW).
2. EDA-Prozesse vollständig: `EC_REQ_ONL/OFF`, `EC_PRTFACT_CHG`, `EC_PRT_CHANGE`, `EC_PODLIST`, `CM_REV_SP/CUS/IMP`, `CR_REQ_PT`, Empfang `CR_MSG`; Fristenüberwachung (30 Tage Zustimmung), Responsecodes im Klartext, Massenvorgänge.
3. Viertelstunden-Datenhaltung mit Qualitätskennzeichen, Versionen, Lückenerkennung, Nachforderung.
4. Abrechnung je Periode mit TOU, Gebühren, Rechnung, Gutschrift und Storno, vollständiger USt-Logik (4.5), § 69-konformen Inhalten, PDF und E-Rechnung (ebInterface/ZUGFeRD optional).
5. SEPA-Lastschrift und Überweisung, camt-Abgleich, Mahnwesen, OP-Liste.
6. Mitgliederportal mit Belegen, Energiedaten, Verträgen, Kündigung, Datenauskunft (Art. 15 DSGVO).
7. Audit-Log (Hashkette), Rechte je Gemeinschaft, Datenexport (CSV/XLSX), Aufbewahrung 7 Jahre.
8. Lieferantenpflichten-Paket bei > 100 kW bzw. > 30 kW: AGB-Generator, Info-Blatt, Änderungsinformation (§ 21), Wahl des Rechnungsrhythmus, Rechnungserläuterung.
9. ElWG-Übergang: Nahebereichs-ID/Zonelevel, Organisator, neue Modelle (P2P/EV) zumindest als Datenmodell.

### 6.2 Kür (Differenzierung gegenüber Wettbewerbern wie eegfaktura, Excel-Tool der Koordinationsstelle, Netzbetreiber-Portalen, regionalen Dienstleistern) [Wettbewerbsvergleich zu bestätigen]
1. **Simulation vor der Gründung** mit echten Lastgängen und PVGIS, inkl. Zonelevel-Vergleich (lokal, regional, BEG, P2P) und Business Case je Mitglied.
2. **Gründung auf Knopfdruck**: geführter Gründungsauftrag, Statuten- und Vertragsgenerator aus Mustern, Gründungsversammlung online (bestehendes GV-Modul), Formular-Ausfüllhilfe (Verf 15a/26, U 12/15, ElAbg-Meldung, ebUtilities, Betreibervertrag je Netzbetreiber), Fristenwecker.
3. **Wechsel-Assistent** für Bestands-EG: Import, `EC_PODLIST`-Abgleich, Parallellauf, Abweichungsbericht.
4. **Echtzeit-Dashboard**: Live-Erzeugung aus dem ÖKOVOLT-Monitoring bzw. den Wechselrichter-APIs, Prognose „grüne Stunden“, Ampel für Datenqualität (L1/L2/L3), Vergleich Vortag. Die offiziellen EDA-Werte (D+1) ersetzen die Livewerte.
5. **Anreize und Lastverschiebung**: TOU-Tarife („Mittagsstrom“), Gamification (Eigendeckungs-Rang, CO₂), Push-Hinweise. **Speicher- und Wallbox-Empfehlungen** (keine Steuerung in Phase 1; später Aggregierung nach § 68 Abs. 2 Z 3 und § 63).
6. **Mehrfachteilnahme-Optimierer** (4.9) mit TF-Vorschlag und automatischem `EC_PRTFACT_CHG` nach Zustimmung.
7. **Förder-Check**: EAG-Investitionszuschuss (Calls 2026, Kategorien, EG-Obergrenze **[zu bestätigen]**), Marktprämie (EEG max. 50 %), Landesförderungen, Klima- und Energiefonds-Programme; Fristenkalender.
8. **Gemeinde-Paket**: Gemeinde als Gründerin und Mitglied, Sammelansicht der Gemeindegebäude, Sozialquote 10 % (§ 68 Abs. 6) mit Monitor, beihilferechtlich fremdüblicher Preis (Dokumentation), Bürgerinformation (Bestand Kommune-Cockpit), Gemeinderatsbeschluss-Vorlage.
9. **Vereinsbuchhaltung integriert**: E/A-Rechnung, Kontenplan EG, UVA-Vorbereitung, K2-Vorbereitung, Rechnungsprüfer-Zugang mit Prüfpfad, Jahresbericht für die GV.
10. **Haftungs- und Steuerhinweise im Kontext** (z. B. Kleinunternehmer-Monitor, Reverse-Charge-Erkennung beim Erzeuger, § 69-Schwelle, Großunternehmen-Sperre in der EEG, Gewinnverbot bei Überschüssen → Vorschlag Preissenkung bzw. Rückvergütung), jeweils mit Quellenlink und „keine Steuerberatung“-Hinweis.
11. **Transparenz**: Jede Zahl auf dem Beleg ist bis zur Viertelstunde und zur EDA-Nachricht rückverfolgbar (Hash), mit Erläuterungsseite nach § 69 Abs. 1 Z 5.
12. **Mandantenfähiger Organisator-Betrieb**: viele Gemeinschaften, ein Team, Massenläufe, SLA-Monitor (Datenlücken je Netzbetreiber).

---

## 7. Abgrenzung zum bestehenden Code

### 7.1 Bestand (gelesen)
| Datei | Inhalt | Bewertung |
|---|---|---|
| `src/lib/plattform/mitglied/gemeinschaft.js` | EG-Stammdaten (`gemeinschaftBereinigen`), Teilnahme-Hindernisse, Beitritt, `verteilen()` (dynamisch iterativ / statisch), `schaetzung()`, `monatsabrechnung()` auf **Monatssummen**, `messwerteBereinigen`, `rabattFuer` (Form → Rabatt) | Prototyp: AT/DE/CH gemischt, kein TF, keine Viertelstunden, keine USt, keine EDA-Zustände |
| `src/lib/plattform/backend/demo/mitglied.js` | Demo-Backend: `egBeitreten`, `egTeilnahmeAktion` (Kündigung zum Monatsende), `boEg*`, `boTeilnahmeAktion` (anmelden → aktivieren → ablehnen → beenden, manuell), `boEgAbrechnen` (Monatslauf mit manuellen Messwerten, Schätzung als Fallback), PDF-Abrechnung | manuelle Statuswechsel statt EDA; Abrechnungen als Monatsposition ohne Belegnummer |
| `Backend-Import/.../plattform/mitglied_kern.py` (Abschnitt Energiegemeinschaft) | 1:1-Spiegel der JS-Regeln (`EG_FORMEN`, `rabatt_fuer`, `verteilen`, `monatsabrechnung` …) | Parität vorhanden, muss mitwandern |
| DocTypes `plattform_energiegemeinschaft`, `plattform_eg_teilnahme`, `plattform_eg_abrechnung` | Felder: titel/land/form/status + **JSON `daten`** | nicht abfragbar, nicht skalierbar |
| `src/lib/plattform/fach/energie.js` | `EG_FORMEN`, `EG_ROLLEN`, `zaehlpunktPruefen` (33 Zeichen DE/AT/CH), `egTeilnahmeBereinigen`, `egHinweise` | brauchbar |
| `/portal/beteiligung/energiegemeinschaft` | Mitgliedsseite: Stammdaten, Beitritt, Status, Preise, Abrechnungen (PDF), Kündigung | UI-Rahmen gut, Inhalte veraltet (Opt-in-Text, Rabatt nach Form) |
| `/portal/admin/energiegemeinschaften` + `/api/admin/energiegemeinschaften` | Backoffice: Stammdaten, Teilnehmer-Aktionen, Monatslauf | wird durch das EG-Backoffice ersetzt |
| `src/lib/invest/markt.js` `GEMEINSCHAFTEN.rechner.at` | Rabatte 57/28/0 %, ElAbg 0,82 ct, Standardpreise | in die versionierte Netzentgelt-Regel (3.3) überführen; 64 % (NE 4/5) fehlt; ElAbg Haushalt 2026 = 0,1 ct |

### 7.2 Wiederverwenden
- `zaehlpunktPruefen`, `zaehlpunktFormatiert` (fach/energie.js), unverändert.
- Validierungsbausteine `mitglied/basis.js` (`text`, `zahl`, `auswahl`, `rund2`, `monat`, …) und der Python-Spiegel `basis.py` / `_js_round`.
- `verteilen()` als **Referenz für Tests** und als Basis der Simulation, erweitert um TF, Viertelstunden-Vektoren, Normierung > 100 % und den Restüberschuss je Erzeuger.
- Genossenschafts- und GV-Modul (`mitglied/genossenschaft.js`, `versammlung.js`, Protokoll mit SHA-256) für die eGen-Variante und Mitgliederversammlungen.
- Querschnitt: `finanzen/sepa.js`, `buchhaltung/{op,mahnwesen,zahlungsimport,export,abschluss}.js`, `server/pdf.js`, `hashkette.js`, `checkliste.js`, `plattform_gruendungsschritt` (als Vorlage), Signatur-Modul, KYC/eID, Benachrichtigungen, Aufgaben, Klärfälle, Postausgang, `csv.js`.
- `gemeinde/cockpit.js` (Gemeinde-Paket), `plattform_lastgang` (Lastgang-Upload, für die Simulation).
- UI-Bausteine `components/Portal/ui`, `Mitglied/teile.js`.

### 7.3 Ersetzen bzw. erweitern
| Bestand | Neu |
|---|---|
| `rabattFuer(land, form)` | `eg/netzentgelt.js` mit datums-, zonen- und netzebenenabhängiger Regel-Tabelle (3.3) |
| `TEILNAHME_STATUS` (5 manuelle Stati) | EDA-Zustandsautomat (3.8) |
| `GEMEINSCHAFT_STATUS` (3) | Lebenszyklus (3.4) |
| `monatsabrechnung()` (Monatssummen, Schätzung) | `eg/abrechnung.js` auf Basis der NB-Viertelstundenwerte; die Schätzung gibt es nur noch als *Vorschau*, nie als Beleg |
| JSON-`daten`-DocTypes | normalisierte DocTypes `plattform_eg_*` + **Migration** (Skript liest `daten`, legt neue Datensätze an, alte DocTypes nur lesbar, nach dem Release entfernen) |
| `boTeilnahmeAktion` manuell | wird zu EDA-Prozessen; manuelles Setzen nur noch als dokumentierte Korrektur (Rolle Organisator, Begründung, Audit) |
| Kündigung „zum Monatsende“ (`teilnahmeEnde`) | Frist laut Vertrag (3–7 Wochen Muster) → `CM_REV_SP` mit Prozessdatum |
| Opt-in-Hinweis im Portal | Status-genaue Hinweise (30-Tage-Frist, Smart-Meter-Einbau, Widerruf) |
| `/portal/admin/energiegemeinschaften` | `/portal/admin/eg/**` (Liste, Gemeinschaft, Mitglieder, EDA, Energiedaten, Abrechnung, Buchhaltung, Gründung); alte Route leitet weiter |
| `/portal/beteiligung/energiegemeinschaft` | `/portal/eg/**` (Mitglied) bzw. die bisherige Seite als Einstieg mit Weiterleitung |
| DE/CH-Formen | bleiben im alten Modul `mitglied/gemeinschaft.js`, als „international, vereinfacht“ eingefroren; das neue Modul `eg/` ist AT-spezifisch und wird später um ein Länder-Plugin erweitert |

---

## 8. Bau in 6 parallelen Arbeitspaketen

**Regeln für alle Pakete**
- Neue Codebasis `src/lib/plattform/eg/` (reine Funktionen, keine Imports aus `backend/`), Backend-Adapter `src/lib/plattform/backend/{demo,frappe}/eg-<paket>.js`, Frappe `plattform/eg_<paket>_kern.py` (1:1-Parität, gleiche Testvektoren als JSON in `src/lib/plattform/eg/testdaten/<paket>/*.json`, die **beide** Testsuiten lesen) und `plattform/api/eg_<paket>.py`, DocTypes `plattform_eg_<paket>_*`.
- Jedes Paket besitzt **nur** seine Präfixe. Gemeinsame Dateien (siehe WP1) ändert ausschließlich WP1. Andere Pakete liefern Patches als Abschnitt in `docs/eg/<paket>.md`, die WP1 übernimmt.
- Schnittstellen werden vorab im Abschnitt „Energiegemeinschaften“ in `docs/API.md` festgehalten (Woche 1, Owner WP1, Review durch alle). Danach wird gegen Stubs entwickelt.
- Tests: `src/lib/plattform/eg/<paket>.test.mjs`, `plattform/tests/test_eg_<paket>_kern.py` (ohne Frappe) und `test_eg_<paket>.py` (mit Frappe), E2E `scripts/plattform-test-eg-<paket>.mjs`.

| WP | Name | Verantwortet (Dateien/Präfixe) | Inhalt | Liefert an | Abhängig von |
|---|---|---|---|---|---|
| **WP1** | Kern-Stammdaten, Rechte und Integration *(Integrator)* | `src/lib/plattform/eg/{stamm,mitglied,zaehlpunkt,anlage,tarif,netzbetreiber,netzentgelt,rechte,status}.js`, `eg/index.js`; `backend/{demo,frappe}/eg-stamm.js`, `backend/eg.js` (Fassade); Frappe `eg_stamm_kern.py`, `api/eg_stamm.py`; DocTypes `plattform_eg_gemeinschaft`, `_organ`, `_mitglied`, `_zaehlpunkt`, `_teilnahme`, `_anlage`, `_tarif`, `_verteilschluessel`, `_netzbetreiber`, `_netzentgelt_regel`; Migration `plattform/patches/eg_migration_*.py` + `scripts/eg-migration.mjs`; **gemeinsame Dateien**: `rechte.js`/`rechte.py` (Bereich `energiegemeinschaft`), Portal-Navigation, `docs/API.md` (EG-Abschnitt), `docs/PLATTFORM.md`, Weiterleitungen der alten Routen; Seiten `/portal/admin/eg` (Liste), `/portal/admin/eg/[id]/stammdaten`, `/[id]/mitglieder`; `src/components/Portal/EG/Stamm/**` | Datenmodell 3.2–3.11, Validierungen (ZP, Gemeinschafts-ID, Zulässigkeit, § 69-Schwelle, Großunternehmen, 6 MW), Rollen je Gemeinschaft (Abschnitt 5), Netzentgelt-Regeltabelle inkl. 2026er Werten, Migration aus den JSON-DocTypes, Seed der Demo-EG | Entitäten und Lese-APIs für WP2–WP6 | – (startet zuerst; Woche 1 Schema-Freeze) |
| **WP2** | EDA-Marktkommunikation | `src/lib/plattform/eg/eda/**` (Schemas CMRequest, CMNotification, CMRevoke, ECMPList, CPRequest, ConsumptionRecord; Builder, Parser, Prozessautomat, Responsecodes); `backend/{demo,frappe}/eg-eda.js`; Frappe `eg_eda_kern.py`, `api/eg_eda.py`, Scheduler `eg_eda_jobs.py`; DocTypes `plattform_eg_eda_prozess`, `plattform_eg_eda_nachricht`; Gateway-Dienst `dienste/eda-gateway/**` (E-Mail-/KEP-Anbindung, Zertifikate über Secrets, Simulator für Tests); Seiten `/portal/admin/eg/[id]/eda/**`; `src/components/Portal/EG/Eda/**` | Prozesse 2.4–2.7, Zustandsautomat 3.8 (schreibt **nur** über die WP1-Funktion `teilnahmeUebergang()`), Fristen, Massenvorgänge (Umwandlung), Wechsel der EDA-Bevollmächtigung, `EC_PODLIST`-Abgleich, Ablage der Rohnachrichten mit Hash; liefert `CR_MSG`-Payloads an WP3 per Ereignis `eg.energiedaten.empfangen` | Teilnahme-Status (WP1), Rohdaten (WP3) | WP1-Schema |
| **WP3** | Energiedaten, Verteilung, Simulation und Prognose | `src/lib/plattform/eg/{messwerte,qualitaet,verteilung,simulation,prognose,optimierung,speicher}.js`; `backend/{demo,frappe}/eg-energie.js`; Frappe `eg_energie_kern.py`, `api/eg_energie.py`; DocTypes `plattform_eg_messreihe`, `plattform_eg_messmonat`, `plattform_eg_simulation`; Seiten `/portal/admin/eg/[id]/energiedaten`, `/portal/admin/eg/simulation`; `src/components/Portal/EG/Energie/**` (Charts) | Tagesblock-Speicher 3.12, Plausibilisierung und Lücken (→ Nachforderung über ein WP2-API), Algorithmen 4.1–4.3 mit HA-II-Testvektoren, Abweichungsbericht NB ↔ eigene Zuteilung, Simulation 4.7 (PVGIS, Lastprofile, `plattform_lastgang`), Prognose 4.8, TF-Optimierer 4.9, Sozialquote 4.10; liefert der Abrechnung (WP4) **Periodensummen je ZP und Größe** über `periodenwerte(egId, von, bis)` | Werte an WP4, Charts an WP6 | WP1; Ereignis von WP2 (vorher Simulator bzw. CSV-Import) |
| **WP4** | Abrechnung, Steuer, Zahlung, Vereinsbuchhaltung | `src/lib/plattform/eg/{abrechnung,ust,belege,ersparnis,zahlung,buchhaltung}.js`, `eg/beleg-pdf.js`; `backend/{demo,frappe}/eg-abrechnung.js`; Frappe `eg_abrechnung_kern.py`, `api/eg_abrechnung.py`; DocTypes `plattform_eg_periode`, `plattform_eg_beleg`, `plattform_eg_beleg_position`, `plattform_eg_zahlung`, `plattform_eg_buchung`; Seiten `/portal/admin/eg/[id]/abrechnung/**`, `/[id]/buchhaltung/**`; `src/components/Portal/EG/Abrechnung/**` | Periodenlauf mit Vier-Augen-Freigabe, TOU, Gebühren, Rechnung, Gutschrift und Storno, Nummernkreise, USt-Matrix 4.5 inkl. Reverse Charge, § 22, Kleinunternehmer-Monitor, § 69-Pflichtinhalte und Rechnungsrhythmus, Ersparnisausweis 4.6, SEPA (über `finanzen/sepa.js`), camt-Abgleich und Mahnwesen (über `buchhaltung/*`), E/A-Rechnung, UVA- und K2-Vorbereitung, Export für den Steuerberater, Jahresbescheinigung für Erzeuger | Belege an WP6 (Mitgliedsportal) | WP1, WP3 (Periodenwerte; vorher Fixtures) |
| **WP5** | Gründungsdienstleistung, Wechsel, Vereinsorganisation, Förder-Check | `src/lib/plattform/eg/{gruendung,wechsel,verein,statuten,vertraege,foerder,lieferantenpflichten}.js`; Vorlagen `src/lib/plattform/eg/vorlagen/**` (Statuten Verein/eGen, Beitritt, Bezug, Einspeisung, Pacht, AGB, Info-Blatt, Datenschutz, Vollmacht Organisator); `backend/{demo,frappe}/eg-gruendung.js`; Frappe `eg_gruendung_kern.py`, `api/eg_gruendung.py`; DocTypes `plattform_eg_gruendungsauftrag`, `plattform_eg_gruendungsschritt`, `plattform_eg_import`, `plattform_eg_foerdercheck`; Seiten `/portal/eg/gruendung/**` (Auftraggeber), `/portal/admin/eg/gruendung/**`, `/portal/admin/eg/[id]/organe`, `/[id]/versammlungen`; `src/components/Portal/EG/Gruendung/**` | Gründungsauftrag 3.15 mit Schrittvorlage und Fristen, Machbarkeitsbericht-PDF (nutzt die WP3-Simulation), Dokumentgenerator mit Versionierung und Signatur, Formular-Ausfüllhilfen (Verf 15a/15/26, U 12/15, ElAbg-Meldung, ebUtilities-Daten, Betreibervertrag je Netzbetreiber), Organe und Funktionsperioden (Organ-DocType von WP1, UI und Regeln hier), GV über das bestehende Versammlungsmodul, Wechsel-Assistent 2.6 (Import CSV/XLSX → WP1-APIs, Abgleich über WP2), Auflösungs-Checkliste 2.7, Förder-Check, ElWG-Anpassungspaket für Bestands-EG | Gemeinschaft im Status `eda_bereit` an WP1/WP2 | WP1; WP3 (Simulation), WP2 (Abgleich) |
| **WP6** | Portale: Mitglied, Interessent, Gemeinde, öffentlicher Rechner, Anreize | `src/app/portal/eg/**` (außer `gruendung`), `src/app/(oeffentlich)/energiegemeinschaften/rechner/**` bzw. die bestehende `/energiegemeinschaften`-Seite (nur Rechner-Teil), `src/components/Portal/EG/Mitglied/**`, `src/components/Portal/EG/Gemeinde/**`, `src/lib/plattform/eg/{dashboard,anreize,empfehlung,interesse}.js`; `backend/{demo,frappe}/eg-portal.js`; Frappe `eg_portal_kern.py`, `api/eg_portal.py`; DocType `plattform_eg_interesse`; E2E `scripts/plattform-test-eg-portal.mjs` | Interessenten-Funnel (Formular, Einwilligung, Cluster), Beitrittsstrecke (Antrag → Verträge → Signatur → Hinweis auf Netzbetreiber-Zustimmung mit Countdown), Mitglieds-Dashboard (Eigendeckung, Ersparnis, Belege, Live-Erzeugung, grüne Stunden), Kündigung bzw. TF-Wunsch, Mehrfachteilnahme-Ansicht, Gamification und TOU-Hinweise, Speicher- und Wallbox-Empfehlung, Gemeinde-Sammelansicht und Sozialquote, Datenauskunft Art. 15; nur Lese- und Antrags-APIs der anderen Pakete, **keine** eigene Fachlogik zu EDA bzw. Abrechnung | – | WP1 (früh), WP3/WP4 (Lese-APIs, vorher Mocks aus `eg/testdaten`) |

**Zeitplan-Vorschlag** (Wellen):
- **Woche 1:** WP1 Schema und API-Vertrag; alle anderen schreiben Testvektoren und Stubs.
- **Wochen 2–5:** alle parallel.
- **Woche 6:** Integration (WP1), E2E gegen den EDA-Simulator (WP2), Migration der Demo-Daten, Abnahme mit einer Pilot-EG (Wechsel-Assistent) im Parallellauf.

**Abnahmekriterien je Paket:** grüne JS- und Python-Paritätstests mit identischen Vektoren (u. a. HA-II-Beispiele aus 4.2 und 4.3), E2E-Skript grün, keine Fachlogik in Komponenten, alle Regeln mit Quellen-Konstante (`quelle`, `stand`) versehen.

---

## 9. Offene Punkte (zu bestätigen)

1. Höhe der Netzentgeltreduktion je Zonelevel ab 01.01.2027 (neue SNE-VO; Begutachtung lief bis 24.07.2026).
2. Ob „nur dynamisch“ für Neuaktivierungen ab 05.10.2026 verbindlich in den Sonstigen Marktregeln steht.
3. Neue Prozessversionen bzw. Schemas (ECON, CPF, CCMS, CRMSG) zum 05.10.2026, Organisator-Prozess, Marktpartner-Präfixe für P2P und Eigenversorger.
4. Toleranzgrenze bzw. monetärer Ausgleich bei Abweichungen (Schwellen, steuerliche Behandlung).
5. Elektrizitätsabgabe 2027 (1,5 ct?) und die Befreiungsreichweite unter dem ElWG (EEG; BEG und GEA im Standortbereich unklar).
6. Speicher in Gemeinschaften (Messkonzepte § 111 ElWG).
7. EDA-Kosten ab 50 Zählpunkten und Bedingungen des Plattformvertrags für Dienstleister (Preisliste EDA GmbH).
8. VerG- und GenG-Details (Fristen, Organe) in den finalen Statutenvorlagen anwaltlich prüfen lassen; Umfang der § 69-Pflichten für den Organisator (§§ 25, 26 ElWG: Wechselrechte und -verfahren).
9. USt: Reverse Charge bei Gemeinde-BgA, Behandlung „unechter“ Mitgliedsbeiträge, Kleinunternehmergrenze bei EG mit Reverse-Charge-Bezug: mit Steuerberatung bestätigen (der Ratgeber Steuern stammt von 2024 und enthält noch die Grenze von 35.000 € netto).
10. Lizenz der Standardlastprofile und Wetterdaten für die Simulation bzw. Prognose.
11. Förderobergrenze für EG im EAG-Investitionszuschuss 2026 (Sekundärquelle).

---

## 10. Quellen

**Gesetze und Verordnungen (RIS)**
- ElWG, BGBl. I Nr. 91/2025 (Günstiger-Strom-Gesetz, Art. 1), authentische Fassung: https://www.ris.bka.gv.at/Dokumente/BgblAuth/BGBLA_2025_I_91/BGBLA_2025_I_91.html. Daraus: § 6 Z 19 und 45, §§ 65–72, § 188 Abs. 1 und 3, § 189 Abs. 17.
- ElWG, geltende Fassung: https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=20013066
- EAG (§§ 75 Abs. 5, 79, 80, 81): https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=20011619
- ElWOG 2010 (§§ 16a–16e außer Kraft seit 30.09.2026): https://www.ris.bka.gv.at/geltendefassung.wxe?abfrage=bundesnormen&gesetzesnummer=20007045
- SNE-V 2018 (§ 5 Abs. 1a: 57 % / 28 % / 64 %, Rundung auf 2 Kommastellen): https://www.ris.bka.gv.at/geltendefassung.wxe?abfrage=bundesnormen&gesetzesnummer=20010107
- SNE-G-V Begutachtungsentwurf (E-Control): https://www.e-control.at/documents/1785851/0/V+SNE+01_26+SNE-G-V+Begutachtungsentwurf+samt+Erl%C3%A4uterungen.pdf/1425ce2f-897d-bea7-b8e6-e84f67f978ab
- Elektrizitätsabgabe-Eigenstrombefreiungsverordnung: https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=20011479
- VerG 2002: https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=20001917 · GenG: https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=10001680 · UStG 1994 (§§ 6 Abs. 1 Z 27, 11, 19 Abs. 1c, 22): https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=10004873 · EStG (§ 3 Abs. 1 Z 39): https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=10004570

**Marktregeln, EDA, ebUtilities**
- Oesterreichs Energie, Handlungsanweisung für die Umsetzung von Energiegemeinschaften, Version II (04/2023). Mehrfachteilnahme, TF, Prozesse, Gemeinschafts-ID, Verteilmodelle, CR_MSG, L1–L3: https://www.ebutilities.at/fileadmin/user_upload/20230430_Handlungsanweisung_EAG_Version_II_final.pdf
- ebUtilities/Oesterreichs Energie, Webinar „Konzept zur Umsetzung von Bürgerenergiemodellen gem. ElWG“ (17.04.2026). Zonelevel, Phasen, nur dynamisch, max. 2 Läufe pro Tag: https://www.ebutilities.at/fileadmin/user_upload/Veranstaltungen/Webinar_Konzept_zur_Umsetzung_von_B%C3%BCrgerenergiemodellen_gem._ElWG.pdf
- ebUtilities, Prozesse (EC_REQ_ONL u. a.): https://www.ebutilities.at/prozesse/597 · EC_PODLIST: https://www.ebutilities.at/prozesse/396 · Schema ECMPList: https://www.ebutilities.at/schemas/160 · Konsultationen: https://www.ebutilities.at/konsultationen/50
- EDA GmbH, Anwenderportal: https://www.eda.at/portal · Anbindungsmöglichkeiten: https://www.ebutilities.at/fileadmin/user_upload/11_1_M%C3%B6glichkeiten_Anbindung_EDA.pdf
- Nachrichtencodes (Sekundärquelle, Wettbewerber-Doku): https://docs.eegfaktura.at/books/workflowprozesse/page/prozess-history · https://github.com/lutzerb/eegabrechnung-public

**Koordinationsstelle und Behörden**
- Energiegemeinschaften (EEG/BEG): https://energiegemeinschaften.gv.at/energiegemeinschaften-eeg-beg/
- FAQs zum ElWG: https://energiegemeinschaften.gv.at/faqs-zum-elwg/ · Änderungen für bestehende EG: https://energiegemeinschaften.gv.at/aenderungen-fuer-bestehende-energiegemeinschaften/ · Detailwissen ElWG: https://energiegemeinschaften.gv.at/rechtliche-grundlagen-elwg/ · Bürgerenergie-Modelle: https://energiegemeinschaften.gv.at/gemeinsame-energienutzung/
- Gründungsschritte EEG: 1 https://energiegemeinschaften.gv.at/1-erste-ueberlegungen-konzept/ · 2 https://energiegemeinschaften.gv.at/vereinsgruendung/ · 3 https://energiegemeinschaften.gv.at/3-interne-vereinbarungen/ · 4 https://energiegemeinschaften.gv.at/4-registrierung-als-marktpartner/ · 5 https://energiegemeinschaften.gv.at/5-vertrag-mit-dem-netzbetreiber/ · 6 https://energiegemeinschaften.gv.at/6-registrierung-in-der-eda-infrastruktur/ · 7 https://energiegemeinschaften.gv.at/7-laufender-betrieb/ · BEG: https://energiegemeinschaften.gv.at/5-vertrag-mit-dem-netzbetreiber-beg/ · GEA: https://energiegemeinschaften.gv.at/4-vertrag-mit-dem-netzbetreiber-gea/
- EEG-Ratgeber Steuern & Abgaben (2024): https://energiegemeinschaften.gv.at/wp-content/uploads/sites/19/2023/05/EEG-Ratgeber-Steuern-Abgaben-21.02.2024-1.pdf
- BMF, EEG und PV-Steuerfragen: https://www.bmf.gv.at/themen/klimapolitik/steuerliche-aspekte-bei-photovoltaikanlagen-von-privatpersonen/erneuerbare-energie-gemeinschaften.html
- USP, Kleinunternehmerregelung ab 2025: https://www.usp.gv.at/aktuelles/newsliste/kleinunternehmerregelung-ab-2025.html
- Beratungsservice Erneuerbare Energie Wien, Mustervorlagen ElWG: https://www.erneuerbare-energie.wien/bestehende-energiegemeinschaften-und-das-neue-elwg-handlungsempfehlung-mustervorlagen/
- EAG-Abwicklungsstelle, Investitionszuschuss: https://www.eag-abwicklungsstelle.at/wissen/investitionszuschuss-photovoltaik-und-speicher/

**Netzbetreiber**
- Netz NÖ EEG: https://netz-noe.at/strom/energiegemeinschaften/eeg-erneuerbare-energie-gemeinschaft · BEG: https://netz-noe.at/strom/energiegemeinschaften/beg-buergerenergiegemeinschaft
- LINZ NETZ: https://www.linznetz.at/portal/de/home/strom/mein_stromanschluss/erzeugungsanlage_anschliessen/energiegemeinschaften/umsetzung
- Energienetze Steiermark: https://www.e-netze.at/Strom/Energiegemeinschaften/Default.aspx
- TINETZ Vertrag EEG (PDF): https://www.tinetz.at/uploads/tx_bh/334/formular-tinetz-vertrag_vnb-mit-betreiber-eeg.pdf
- Übrige (Wiener Netze, Netz OÖ, Netz Burgenland, Salzburg Netz, KNG-Kärnten Netz, Vorarlberg Netz): Wege laut Koordinationsstelle Schritt 5; aktuelle Formulare **vor Einsatz prüfen**.

**Sekundärquellen (nur zur Orientierung)**
- CMS, ElWG gemeinsame Energienutzung: https://cms.law/de/aut/legal-updates/gemeinsame-energienutzung-welche-moeglichkeiten-schafft-das-elwg
- Stromliste, Änderungen 01.10.2026: https://stromliste.at/aktuelles/energiegemeinschaft-neue-regeln-oktober-2026
- EY, Senkung der Elektrizitätsabgabe 2026: https://www.ey.com/de_at/technical/steuernachrichten/senkung-elektrizitaetsabgabe-2026
- WKO, EAG-Investitionszuschuss 2026: https://www.wko.at/foerderungen/eag-investitionszuschuss-2026-photovoltaik-stromspeicher
