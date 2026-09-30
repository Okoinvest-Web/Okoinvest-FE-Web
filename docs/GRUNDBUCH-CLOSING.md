# Grundbuch & Dienstbarkeiten · Deal-Abschluss (Closing) – Recherche und Umsetzung

Team B0b/B4 · Stand 30.09.2026 · **Keine Rechtsberatung.** Alles hier ist eine fachliche Orientierung für Produkt und Backoffice. Sämtliche Vorlagen (Dienstbarkeits-/Servitutsvertrag, Dachnutzungsvertrag, Rangrücktritts-Ersuchen, Löschungshinweis, Kaufvertrag SPA/APA) sind **Muster zur anwaltlichen bzw. notariellen Prüfung** und im Portal, in den PDFs und in den Frappe-Druckformaten so gekennzeichnet. Rechtsgrundlagen sind nach bestem Wissen angegeben, Gebührensätze als Näherung – vor Einsatz gegen den aktuellen Gesetzes- und Tarifstand prüfen.

Code: `src/lib/plattform/closing/{grundbuch,closing,muster,pdfSatz}.js`, Demo `backend/demo/closing.js`, Frappe `plattform/api/closing.py` + `plattform/closing_kern.py` (Regeln) + `plattform/closing_vorlagen.json` (aus den JS-Modulen generiert). Vertrag: `docs/API.md`, Abschnitt „Grundbuch & Closing“.

---

## 1. Warum Dienstbarkeit? (alle Länder)

Ein Pacht- oder Dachnutzungsvertrag wirkt nur zwischen den Vertragsparteien. Bei Verkauf, Zwangsversteigerung oder Insolvenz des Eigentümers ist die Anlage ohne dingliche Sicherung gefährdet – z. B. hat in Deutschland der Ersteher in der Zwangsversteigerung ein Sonderkündigungsrecht für Miet- und Pachtverhältnisse (§ 57a ZVG). Finanzierende Banken verlangen daher in der Regel eine im Grundbuch eingetragene Dienstbarkeit **im Rang vor den Grundpfandrechten** (sonst kann sie bei der Verwertung ausfallen). Dazu kommt die Frage, wem die Anlage auf fremdem Grund bzw. Dach gehört (Akzession).

## 2. Deutschland

| Thema | Einordnung | Quelle |
|---|---|---|
| Rechtsform | **Beschränkte persönliche Dienstbarkeit** zugunsten des Betreibers (§§ 1090–1093 BGB), alternativ Grunddienstbarkeit zugunsten des jeweiligen Eigentümers eines herrschenden Grundstücks (§§ 1018 ff. BGB). | BGB |
| Übertragbarkeit | bpD grundsätzlich **nicht übertragbar** (§ 1092 Abs. 1 S. 1 BGB), Ausübung kann Dritten überlassen werden, wenn gestattet (§ 1092 Abs. 1 S. 2). Ausnahme für juristische Personen/rechtsfähige Personengesellschaften bei bestimmten Anlagen (§ 1092 Abs. 3 BGB) – Reichweite für Erzeugungsanlagen im Einzelfall prüfen. Praxis: Eintrittsrechte bzw. Pflicht zur Neubestellung zugunsten Käufer/Bank. | BGB |
| Eintragungsvoraussetzung | Bewilligung des Betroffenen (§ 19 GBO) in **öffentlich beglaubigter Form** (§ 29 GBO, § 129 BGB → Notar); Antrag (§ 13 GBO), meist durch den Notar gestellt. | GBO |
| Rang | Reihenfolge des Eingangs (§§ 17, 45 GBO, § 879 BGB). **Rangrücktritt** der Grundpfandgläubiger = Rangänderung (§ 880 BGB): Erklärung des zurücktretenden Gläubigers in Form des § 29 GBO; bei Grundpfandrechten Zustimmung des Eigentümers. | BGB, GBO |
| Eigentum an der Anlage | **Scheinbestandteil** (§ 95 BGB), wenn nur zu vorübergehendem Zweck oder in Ausübung eines Rechts (Dienstbarkeit) verbunden → kein wesentlicher Bestandteil, Eigentum bleibt beim Betreiber. | BGB |
| Kosten | Notar/Grundbuchamt nach **GNotKG** (Tabelle B). Eintragung einer Dienstbarkeit 1,0 Gebühr (KV 14121), Rangänderung 0,5 (KV 14130), Entwurf + Beglaubigung Bewilligung i. d. R. 0,5, reine Unterschriftsbeglaubigung 0,2 (mind. 20 €, höchstens 70 €, KV 25100). Geschäftswert wiederkehrender Leistungen § 52 GNotKG (bei bestimmter Dauer höchstens 20 Jahreswerte). Die Tabellen wurden 2025 angehoben (Kostenrechtsänderungsgesetz 2025) – der Schätzer arbeitet mit den Stufen der Fassung 2013 und einem pauschalen Aufschlag (≈ 8 %) und ist damit **nur eine Näherung**. | GNotKG |
| Erbengemeinschaft / Miteigentum | Verfügung nur gemeinschaftlich (§ 2040, § 747 S. 2 BGB) – alle unterschreiben (Feld „Anzahl Unterschriften“). | BGB |
| Löschung | Löschungsbewilligung des Berechtigten (§ 19, § 29 GBO) nach Rückbau; Pflicht dazu im Vertrag regeln, auch für Nichtbau. | GBO |

## 3. Österreich

| Thema | Einordnung | Quelle |
|---|---|---|
| Rechtsform | **Dienstbarkeit/Servitut** (§§ 472 ff. ABGB) – Grunddienstbarkeit oder persönliche (auch „unregelmäßige“, § 479 ABGB) Dienstbarkeit zugunsten des Betreibers. Übertragbarkeit persönlicher Servituten ist eingeschränkt bzw. in der Lehre unterschiedlich beurteilt → vertraglich (Pflicht zur Neueinräumung) absichern. | ABGB |
| Eintragung | Einverleibung auf Grund einer Urkunde mit **Aufsandungserklärung** (ausdrückliche Einwilligung des Eigentümers, § 32 Abs. 1 lit. b GBG) und **gerichtlich oder notariell beglaubigter Unterschrift** (§ 31 GBG). Grundbuchsgesuch beim Bezirksgericht, üblicherweise elektronisch (ERV) durch Notar oder Rechtsanwalt. | GBG 1955 |
| Rang | Zeitpunkt des Einlangens, dokumentiert durch die **Tagebuchzahl (TZ)** (§ 29 GBG). **Vorrangseinräumung** durch die Pfandgläubiger (Rangänderung, § 30 GBG). Die Anmerkung der Rangordnung (§ 53 GBG) betrifft nach dem Wortlaut beabsichtigte Veräußerung bzw. Verpfändung – ob und wie für eine Dienstbarkeit ein Rang vorab gesichert werden kann, im Einzelfall mit dem Notar klären. | GBG |
| Superädifikat | Bauwerk auf fremdem Grund, errichtet in der Absicht, dass es nicht stets dort bleiben soll (§ 435 ABGB) – eigenes Eigentum; Erwerb/Verpfändung über **Urkundenhinterlegung** (UHG). Für Dach-PV oft zusätzlich zur Servitut geprüft; alternativ Baurecht (BauRG). | ABGB, UHG |
| Kosten | **Rechtsgeschäftsgebühr** 2 % des Entgelts bei entgeltlicher Einräumung einer Dienstbarkeit (§ 33 TP 9 GebG), Selbstberechnung durch den Parteienvertreter; bei Bestandverträgen ggf. § 33 TP 5 GebG prüfen. **Eintragungsgebühr** nach TP 9 lit. b GGG (wertabhängig – Satz und Bemessungsgrundlage für Dienstbarkeiten vorab bestätigen lassen; der Schätzer setzt 1,1 % an) plus Eingabengebühr (TP 9 lit. a GGG). Beglaubigung nach NTG bzw. GGG. | GebG, GGG, NTG |

## 4. Schweiz

| Thema | Einordnung | Quelle |
|---|---|---|
| Rechtsform | Grunddienstbarkeit (Art. 730 ff. ZGB), andere/irreguläre Personaldienstbarkeit (Art. 781 ZGB), **Baurecht** (Art. 675, 779 ff. ZGB); selbständiges und dauerndes Baurecht (≥ 30 Jahre) kann als Grundstück aufgenommen werden (Art. 779 Abs. 3 ZGB), Höchstdauer 100 Jahre (Art. 779l). | ZGB |
| Form & Eintragung | **Öffentliche Beurkundung** für Grunddienstbarkeiten (Art. 732 ZGB) und Baurechte (Art. 779a ZGB); Eintragung konstitutiv (Art. 731 ZGB); Anmeldung durch die Urkundsperson, Rang nach Tagebucheintrag (Art. 948, 972 ZGB). Verfahren kantonal. | ZGB |
| Rang | Nachrangige Dienstbarkeiten können bei einer Pfandverwertung gelöscht werden, wenn sie den vorgehenden Pfandgläubiger schädigen (Art. 812 Abs. 2 ZGB) → **Rangrücktritt** der Grundpfandgläubiger einholen. | ZGB |
| Eigentum an der Anlage | **Akzessionsprinzip** (Art. 667, 671 ZGB) – ohne Baurecht bzw. Dienstbarkeit würde die Anlage Bestandteil; Fahrnisbaute (Art. 677 ZGB) nur nach Prüfung. | ZGB |
| Kosten | Beurkundungs- und Grundbuchgebühren **kantonal** sehr unterschiedlich (Promille bzw. Pauschalen) → Offerte einholen. | kantonale Tarife |

## 5. Schrittfolge im Portal (je Land)

| Schritt | DE | AT | CH | Nachweis |
|---|---|---|---|---|
| Vertrag erstellt | Vertrag + Entwurf Bewilligung | Servitutsvertrag mit Aufsandung | Entwurf mit Urkundsperson | – |
| Unterschrift | Signatur-Modul oder Upload | Signatur-Modul oder Upload | (bei der Beurkundung) | – |
| Beglaubigung / Beurkundung | Notar (§ 29 GBO) | Notar/Gericht (§ 31 GBG) | öffentliche Beurkundung | – |
| Rangrücktritt / Vorrangseinräumung | § 880 BGB | § 30 GBG | Art. 812 ZGB | Erklärung oder Dokument (entfällt ohne Pfandrechte) |
| Antrag / Gesuch / Anmeldung | § 13 GBO | Grundbuchsgesuch, TZ | Anmeldung, Tagebuch | Aktenzeichen / TZ |
| Eintragung bestätigt | Abt. II | C-Blatt, Beschluss | Grundbuchauszug | lfd. Nr./TZ oder Auszug |

Regeln (serverseitig, `schrittPruefen` bzw. `schritt_pruefen`): Erledigt nur, wenn die Voraussetzungen erledigt sind (409); Pflichtschritte können nicht entfallen, Nachweise sind Pflicht (422); Zurücksetzen nur ohne erledigten Nachfolger. Fristen ab Erledigung der Voraussetzung (bzw. Anlage der Akte), manuell überschreibbar; täglicher Frist-Lauf meldet Überfälliges. Der Status wirkt auf die Anlage (`dienstbarkeitStatus` vorbereitung/beantragt/eingetragen). Die elektronische Unterschrift (EES) ersetzt **nicht** die Beglaubigung – das steht in Schritt und Portaltext.

## 6. Dach-PV auf fremdem Gebäude

- **Eigentum an der Anlage:** DE Scheinbestandteil (§ 95 BGB) über Dienstbarkeit/vorübergehenden Zweck; AT Superädifikat/Servitut; CH Baurecht bzw. Dienstbarkeit wegen Akzession.
- **Kündigung:** Vertrag über die Laufzeit der Anlage, ordentliche Kündigung ausschließen; Dienstbarkeit sichert gegen Kündigung durch Erwerber (DE § 57a ZVG in der Versteigerung).
- **Insolvenzfestigkeit:** Dingliches Recht mit gutem Rang übersteht Eigentümerwechsel und Verwertung; die schuldrechtliche Abrede allein nicht verlässlich.
- **Contracting:** Beim Dach-Contracting ist der Kunde (Stromabnehmer) oft zugleich Dachgeber – die Akte hängt dann an der Anlage, der Kunde sieht sie im Portal.

## 7. Deal-Abschluss (Closing) von PV-Transaktionen

**Asset vs. Share Deal**
- *Asset Deal:* Kauf von Anlage/Projektrechten – jeder Vertrag wird einzeln übertragen (Zustimmung der Vertragspartner, z. B. Grundstückseigentümer, Netzbetreiber, Direktvermarkter). Dienstbarkeiten: Übertragbarkeit bzw. Neubestellung (DE § 1092 BGB). Gehört ein Grundstück dazu: Beurkundung (DE § 311b BGB) und Grunderwerbsteuer. Förderung/Registrierungen umschreiben (DE Marktstammdatenregister, AT EAG-Förderabwicklung/OeMAG, CH Pronovo).
- *Share Deal:* Kauf der Anteile an der Projektgesellschaft (SPV) – Verträge bleiben bei der Gesellschaft; **Change-of-Control-Klauseln** prüfen.

**Form der Anteilsübertragung**
- DE GmbH: Verpflichtung und Abtretung **notariell beurkundet** (§ 15 Abs. 3, 4 GmbHG); Gesellschafterliste durch den Notar (§ 40 GmbHG). GmbH & Co. KG: KG-Anteile formfrei, Handelsregister (Sonderrechtsnachfolge); wird die Komplementär-GmbH mitverkauft, kann das Gesamtgeschäft beurkundungspflichtig sein (Einheitlichkeit).
- AT GmbH: **Notariatsakt** für Verpflichtung und Übertragung (§ 76 Abs. 2 GmbHG); Firmenbuch. KG-Anteile nach Gesellschaftsvertrag, Firmenbuch.
- CH GmbH: **Schriftform** (Art. 785 OR) und Zustimmung der Gesellschafterversammlung (Art. 786 OR); Handelsregister.

**SPA-Struktur (Muster im Portal)** – Kaufgegenstand, Kaufpreis (Locked Box bzw. Completion Accounts), Meilenstein-/Earn-out-Zahlungen (z. B. RTB, COD), **Signing vs. Closing**, **Closing Conditions** (Zustimmungen, Rangrücktritte/Dienstbarkeiten, Bankfreigaben, Genehmigungen, Netz, ggf. Fusionskontrolle/Investitionsprüfung), Garantien (Titel, Projektrechte, Genehmigungen, Verträge, Steuern, Disclosure), Haftung (De minimis, Basket, Cap, Verjährung, optional W&I), **MAC-Klausel**, Longstop Date.

**Treuhand / Notaranderkonto** – DE: nur bei berechtigtem Sicherungsinteresse (§ 57 BeurkG) mit schriftlicher Verwahrungsanweisung; AT: Treuhandschaft durch Notar/Rechtsanwalt (Treuhandbuch der Kammer); CH: Hinterlegung beim Notariat bzw. Bank-Escrow. Auszahlung gegen Nachweis der CPs.

**Grunderwerbsteuer beim Share Deal (vorsichtig)** – nur relevant, wenn die Gesellschaft Grundstücke (bzw. grundstücksgleiche Rechte) hält: DE Anteilsübergänge/-vereinigung ab 90 % (§ 1 Abs. 2b, 3 GrEStG, 10-Jahres-Fristen), AT Anteilsvereinigung ab 95 % (§ 1 Abs. 3 GrEStG), CH kantonale Handänderungssteuer bei wirtschaftlicher Handänderung. Reine Pacht-/Dienstbarkeitsmodelle lösen das in der Regel nicht aus – steuerlich prüfen lassen.

**Kartell / FDI (nur Hinweis)** – DE GWB-Fusionskontrolle und AWV-Investitionsprüfung (Energie als kritische Infrastruktur), AT KartG und InvKG, CH KG. Schwellen und Sektorregeln im Einzelfall prüfen; im Portal als CP aus der LOI übernehmbar.

## 8. Umsetzung Closing im Portal

- **Closing-Raum** aus Zuschlag (Bieterverfahren) bzw. angenommener LOI; Kaufpreis vorbelegt (Zuschlag vor LOI), Struktur aus der LOI.
- **Signing-Checkliste:** KYC/KYB **beider** Seiten (automatisch aus dem KYC-Modul, immer Pflicht – Geldwäscheprävention), Bonität, Finanzierungsnachweis, Gremien, Due Diligence, SPA endverhandelt; zusätzlich **Kontaktfreigabe** (Anonymität bis dahin).
- **CPs** mit Verantwortlichen (Käufer/Verkäufer/ÖkoInvest/Notar/Dritte), Fristen und Nachweisen; Beteiligte melden eigene CPs, das Backoffice bestätigt.
- **Closing** nur mit: Status „signed“, alle CPs erfüllt/verzichtet, Zahlungseingang bestätigt (Treuhand optional), Notartermin beim Share Deal, KYC beider Seiten weiterhin verifiziert → Projekt „verkauft“ über den Zustandsautomaten → **Provision** → **Provisionsrechnung** über das Finanzen-Modul (Demo: Abrechnungslauf „provision“; Frappe: Hook `Plattform Provision after_insert`).
- **Übergabe-Checkliste** (Unterlagen, Zugänge, Verträge, Anzeigen an Netzbetreiber/Direktvermarkter/Behörden, Grundbuch), **Abschlussbericht** (PDF), Notartermin als .ics.

## 9. Offene Punkte vor dem Einsatz

- [ ] Muster (alle sechs) durch Rechtsanwalt/Notar je Land prüfen und freigeben lassen; Textbausteine danach in `closing/muster.js` und den Druckformaten nachziehen.
- [ ] Gebührenschätzer gegen aktuelle Tabellen abgleichen (GNotKG nach KostBRÄG 2025, GGG/GebG-Stand, kantonale Tarife).
- [ ] Übertragbarkeit der Dienstbarkeit (DE § 1092 Abs. 3 BGB, AT persönliche Servitut) für das eigene Vertragsmodell klären.
- [ ] Notariate haben keine offene API: Termine werden im Closing-Raum erfasst und als .ics verteilt.
- [ ] Generator der Frappe-Stammdaten: nach Änderungen an `closing/grundbuch.js` bzw. `closing/closing.js` `closing_vorlagen.json` neu erzeugen (Skript siehe Abschlussbericht des Teams; Inhalt = JSON-Export der Konstanten).
