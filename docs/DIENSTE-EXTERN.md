# Externe Dienste – Identität, Bonität, Register, Gründung, Fristen

Stand der Recherche: 30.09.2026. Gilt für die ÖkoInvest-Plattform (Projektbörse für PV-Projekte in DE, AT und CH, Sitz in Österreich).

Alle Angaben sind mit Quellen belegt (Nummern in eckigen Klammern verweisen auf die Quellenliste am Ende). Angaben mit dem Zusatz **„prüfen“** waren öffentlich nicht eindeutig belegbar oder ändern sich häufig. Klären Sie diese Punkte vor Vertragsschluss beziehungsweise vor dem Livegang mit dem Anbieter oder einer Anwältin bzw. einem Anwalt.

---

## 1. Kurzüberblick und Empfehlung

| Thema | Ergebnis in einem Satz |
|---|---|
| Identitätsprüfung | Veriff, Sumsub und Onfido (Entrust) dokumentieren ihre Webhook-Signatur öffentlich (jeweils HMAC-SHA256, hex, über den Roh-Body). Bei IDnow und WebID ist das Signaturverfahren nicht öffentlich dokumentiert. |
| Rechtsrahmen Identität | Ob ÖkoInvest überhaupt geldwäscherechtlich verpflichtet ist, ist offen. Ab 10.07.2027 gilt die EU-Geldwäscheverordnung (AMLR) unmittelbar; sie erfasst ausdrücklich Schwarmfinanzierungsdienstleister [30]. |
| Bonität | KSV1870 (AT), Creditreform (DE), CRIF (AT/DE/CH) und D&B bieten API-Zugänge an. Alle setzen einen Vertrag voraus; Preise sind überwiegend „auf Anfrage“. |
| Register | Zefix (CH) bietet eine offizielle REST-API (kostenlos, Basic Auth, Zugang per E-Mail beim Bundesamt für Justiz). Firmenbuch AT: kostenlose HVD-SOAP-API mit Token über JustizOnline. Handelsregister DE: keine offizielle API, 60 Abrufe pro Stunde. |
| Gründung | AT GmbH: 10.000 EUR Mindeststammkapital, davon 5.000 EUR bar. Die Gründungsprivilegierung ist seit 01.01.2024 abgeschafft. DE GmbH: 25.000 / 12.500 EUR. CH GmbH: CHF 20.000, voll einzubezahlen. |
| Fristen | AT: Einreichung beim Firmenbuch 9 Monate nach dem Bilanzstichtag. DE: Offenlegung im Unternehmensregister 12 Monate danach. CH: keine allgemeine Offenlegung, Gesellschafterversammlung binnen 6 Monaten. |

### Empfehlung Identitätsanbieter

**Veriff als Standard, IDnow als Option für streng regulierte GwG-Fälle.**

Veriff hat seinen Sitz in der EU (Tallinn), veröffentlicht Preise (Self-Serve ab 0,80 USD je Prüfung, Mindestumsatz 49 USD pro Monat) und dokumentiert das Webhook-Schema vollständig (`X-HMAC-SIGNATURE`, HMAC-SHA256, hex, Roh-Body) [1][2][3][6]. Damit lässt sich die Integration ohne Vorvertrag testen. Sumsub ist technisch gleichwertig und speichert Daten auf Servern in Deutschland beziehungsweise in der EU [4][5][13], hat seinen Hauptsitz aber in Zypern und ist teurer (ab 1,35 USD je Prüfung) [7]. Sollte ÖkoInvest (oder ein Partner wie eine Bank oder ein Crowdfunding-Dienstleister) geldwäscherechtlich verpflichtet sein und eine deutsche Video-Identifizierung oder die eID benötigen, ist IDnow (Sitz München) mit VideoIdent und eID das naheliegende Zusatzmodul. Preise und Signaturschema müssen dort im Vertrag geklärt werden.

---

## 2. Identitätsprüfung

### 2.1 Anbieter, API und Webhooks

| Anbieter | API / Ablauf | Webhook-Signatur | Verfahren | Kosten / Vertrag | Sitz / Daten | Quelle |
|---|---|---|---|---|---|---|
| **Veriff** | `POST https://stationapi.veriff.com/v1/sessions` mit Header `X-AUTH-CLIENT: <API-Key>`. Die Antwort enthält `verification.id` und `verification.url` (Redirect oder SDK). Das Ergebnis kommt per Decision-Webhook. | Header `X-HMAC-SIGNATURE`: HMAC-SHA256, **hex**, über den **Roh-Body**, Schlüssel ist der Shared Secret Key. Zusätzlich kommt `X-AUTH-CLIENT` (API-Key). Zustellung mindestens einmal, HTTP 200 innerhalb von 5 s erwartet, Wiederholungen bis zu einer Woche. | Dokument und Selfie automatisiert, NFC und Datenbankabgleich je Tarif (prüfen) | Self-Serve: Essential 0,80 USD (min. 49 USD/Monat), Plus 1,39 USD (min. 99 USD), Premium 1,89 USD (min. 209 USD); Enterprise individuell; 15 Tage Test | Tallinn (EE) | [1][2][3][6][13] |
| **Sumsub** | API-Authentifizierung mit `X-App-Token`, `X-App-Access-Ts` (Unix-Sekunden) und `X-App-Access-Sig` (HMAC-SHA256 hex über ts + Methode + Pfad inkl. Query + Body). Den WebSDK-Link liefert `POST /resources/sdkIntegrations/levels/-/websdkLink`. | Header `X-Payload-Digest`: HMAC über den **Roh-Body**, **hex**. Der Algorithmus steht in `X-Payload-Digest-Alg`: `HMAC_SHA256_HEX` (Standard), `HMAC_SHA512_HEX`, `HMAC_SHA1_HEX` (veraltet). | Dokument und Liveness, weitere Stufen konfigurierbar („Levels“) | Basic 1,35 USD (min. 149 USD/Monat), Compliance 1,85 USD (min. 299 USD); Custom auf Anfrage; nur erfolgreiche Prüfungen werden berechnet | Sitz Limassol (CY); personenbezogene Daten auf Servern in DE bzw. in der EU | [4][5][7][13] |
| **Onfido (Entrust)** | `POST https://api.eu.onfido.com/v3.6/workflow_runs`; die Antwort enthält `link.url` (Format `https://eu.onfido.app/l/<id>`). Für EU-Datenhaltung die EU-Basis-URL verwenden. | Header `X-SHA2-Signature`: HMAC-SHA256, **hex**, über den **Roh-Body**, Schlüssel ist der Webhook-Token. Ein Zeitstempel ist nicht dokumentiert. | Dokument und Biometrie, NFC (prüfen) | Preise nicht öffentlich, **auf Anfrage** | EU-Region verfügbar | [8][9] |
| **IDnow** | REST-API; Authentifizierung per Login-Token im Header `X-API-LOGIN-TOKEN` (60 Minuten gültig). Statusänderungen werden per Webhook an eine konfigurierte URL gemeldet (laut Dokumentation standardmäßig per GET mit Platzhalter `[statusCode]`). | **Nicht öffentlich dokumentiert, prüfen.** Empfehlung: den Webhook nur als Auslöser behandeln und das Ergebnis anschließend per authentifiziertem API-Abruf holen. | VideoIdent, AutoIdent, eID (Online-Ausweisfunktion), eSign (QES) | **Auf Anfrage** | München (DE) | [10][11][12] |
| **WebID** | REST-API, Redirect-URLs für Erfolg, Abbruch und Ablehnung; Ergebnis per Callback | **Nicht öffentlich dokumentiert, prüfen.** Wie bei IDnow: Ergebnis per API abrufen. | VideoID, AutoID, eID, AccountID (Konto-Ident) | **Auf Anfrage** | Berlin (DE) | [12][14][31] |

**Einheitliches Muster für die Umsetzung (Veriff, Sumsub, Onfido):**

1. Den Roh-Body als Bytes lesen, **nicht** vorher als JSON parsen und neu serialisieren.
2. `HMAC(secret, body)` mit SHA-256 berechnen und hex kodieren (Kleinbuchstaben).
3. Das Ergebnis mit dem Header-Wert zeitkonstant vergleichen, zum Beispiel mit `crypto.timingSafeEqual` oder `hmac.compare_digest`.
4. Bei Sumsub zusätzlich `X-Payload-Digest-Alg` auswerten und nur SHA256 oder SHA512 akzeptieren.
5. Einen Wiederholungsschutz über die Sitzungs- bzw. Ereignis-ID einbauen (Zustellung ist „at-least-once“ [3]).

### 2.2 Rechtsrahmen Identifizierung

| Land | Norm / Aufsicht | Kernaussage | Status | Quelle |
|---|---|---|---|---|
| DE | § 12 Abs. 1 Nr. 2 GwG i. V. m. § 18 PAuswG | Der elektronische Identitätsnachweis (Online-Ausweisfunktion, eID-Karte, eAT) ist ein anerkanntes Verfahren. | geltend | [15][16] |
| DE | BaFin-Rundschreiben 3/2017 (GW) Videoidentifizierung | Gilt für Kredit-, Finanzdienstleistungs-, Zahlungs- und E-Geld-Institute, KVGen u. a. Seit 15.06.2017 in Kraft; eine Evaluierung war vorgesehen. | Formell nicht aufgehoben; ein Entwurf der GwVideoIdentV (BMF, April 2024) soll die Videoidentifizierung für alle Verpflichteten regeln. **Inkrafttreten prüfen.** Für Verpflichtete außerhalb der BaFin-Aufsicht (z. B. in Bayern) war die Videoidentifizierung nach RS 3/2017 laut Landeshinweisen 2025 nicht zulässig. | [17][18][19] |
| DE | § 2 GwG (Verpflichtete) | ÖkoInvest wäre nur verpflichtet, wenn eine Kategorie aus § 2 Abs. 1 GwG erfüllt ist, etwa als Finanzunternehmen, Immobilienmakler oder Güterhändler. **Offen, anwaltlich prüfen.** | – | [15] |
| AT | FM-GwG § 6 Abs. 4 und Online-Identifikationsverordnung (Online-IDV) der FMA | Videogestützte Online-Identifikation ist zulässig; seit der Novelle 2021 auch rein biometrische (automatisierte) Verfahren auf dem Stand der Technik mit Einwilligung nach DSGVO. ID Austria ist als elektronischer Identitätsnachweis nutzbar. | geltend für FMA-beaufsichtigte Verpflichtete | [20][21][22] |
| AT | GewO §§ 365m1 ff. | Gilt nur für bestimmte Gewerbe: Büro- und Sitzdienstleister, Handelsgewerbe bei Barzahlungen ab 10.000 EUR, Kunsthandel ab 10.000 EUR, Immobilienmakler. Unternehmensberater sind grundsätzlich nicht erfasst. **Ob ÖkoInvest darunter fällt, prüfen.** | geltend | [23][24] |
| CH | GwG und FINMA-Rundschreiben 2016/7 „Video- und Online-Identifizierung“ | Erlaubt Finanzintermediären die rein digitale Identifizierung; 2021 kam das Auslesen des Passchips (NFC) hinzu. Eine Teilrevision für die staatliche E-ID wurde vom 16.12.2025 bis 27.02.2026 konsultiert; das E-ID-Gesetz sollte Mitte 2026 in Kraft treten. **Aktuelle Fassung prüfen.** | geltend, Revision läuft | [25][26] |
| EU | AMLR (Verordnung (EU) 2024/1624) | Gilt ab 10.07.2027 unmittelbar und ersetzt weitgehend das nationale GwG und FM-GwG. Der Kreis der Verpflichteten wird um Schwarmfinanzierungsdienstleister und -vermittler erweitert. Die Fernidentifizierung soll vorrangig über eIDAS-Mittel (Sicherheitsniveau „substanziell“ oder „hoch“) erfolgen. | beschlossen | [27][30] |

**Hinweis zur Verpflichtetenstellung:** Solange ÖkoInvest nur Projekte vermittelt, ohne Zahlungen abzuwickeln oder als Finanzintermediär aufzutreten, dürfte keine geldwäscherechtliche Identifizierungspflicht bestehen. Die Identitätsprüfung ist dann eine freiwillige Vertrauensmaßnahme; Rechtsgrundlage ist Art. 6 Abs. 1 lit. b oder f DSGVO, bei biometrischen Daten Art. 9 Abs. 2 lit. a DSGVO (ausdrückliche Einwilligung). Das ist **offen und muss anwaltlich bewertet werden**, spätestens mit Blick auf die AMLR ab Juli 2027.

---

## 3. Bonität

| Anbieter | Land | API / Zugang | Kosten / Vertrag | Quelle |
|---|---|---|---|---|
| **KSV1870** | AT | Integration über „SmartServices“ und Partnerschnittstellen, etwa Salesforce oder Dynamics 365; KSV1870-Rating auf einer Skala von 100 bis 700. Eine öffentliche Entwicklerdokumentation wurde nicht gefunden (**auf Anfrage**). | Einzelauskunft über Verrechnungsstellen: UnternehmensProfil Compact 46,80 EUR, Standard 81,60 EUR, Professional 104,88 EUR (brutto). Mitgliedschaft mit Jahresbeitrag nach Mitarbeiterzahl. API-Zugang nur mit Vertrag. | [32][33][34] |
| **Creditreform** | DE (auch AT/CH) | „Creditreform API-Plattform“ mit englischsprachigem Developer-Portal | Einzelabruf etwa 10–25 EUR (Sekundärquelle, **prüfen**); in der Regel Mitgliedschaft bei einem regionalen Verein Creditreform nötig | [35][36] |
| **CRIF** | AT, DE, CH | Web-Oberfläche und API; für DE und CH einheitliche Schnittstelle | **Auf Anfrage**, Vertrag nötig | [37][38] |
| **Dun & Bradstreet** | international | Direct+ REST-API, OAuth2 Client Credentials (Client-ID und Secret, dann Bearer-Token) | Keine öffentliche Preisliste; Abrechnung über Credits (je Datensatz oder Liste). Als Anhaltspunkt US-Bundesrahmenvertrag 2024: 0,24 USD je Identitätsabgleich, 2,95 USD je Company Search. | [39][40] |

### Datenschutz bei Bonitätsabfragen (vor einem LOI)

| Aspekt | Einordnung | Quelle |
|---|---|---|
| Rechtsgrundlage | Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse): Es braucht ein berechtigtes Interesse, die Abfrage muss erforderlich sein und die Interessen der betroffenen Person dürfen nicht überwiegen. Laut DSK besteht ein berechtigtes Interesse typischerweise bei einem **finanziellen Ausfallrisiko** (Vorleistung, Kredit, Miete usw.). Vor einem unverbindlichen LOI ist dieses Risiko begründungsbedürftig. Empfehlung: Abfrage erst bei konkreter Vertragsanbahnung mit wirtschaftlichem Risiko (lit. b oder f) und dokumentierte Interessenabwägung. | [41][43] |
| Juristische Personen | Unternehmensdaten einer GmbH sind keine personenbezogenen Daten; bei Einzelunternehmen, Personengesellschaften und Geschäftsführern gilt die DSGVO. | allgemeiner Grundsatz, prüfen |
| AT | Auskunfteien stützen sich auf § 152 GewO i. V. m. Art. 6 Abs. 1 lit. f DSGVO; die DSB nennt als berechtigtes Interesse Vorleistungen und finanzielle Risiken. | [43][44] |
| Informationspflicht | Art. 13/14 DSGVO: In der Datenschutzerklärung und im Ablauf vor der Abfrage auf Auskunftei, Zweck und Rechtsgrundlage hinweisen. | DSGVO |
| Art. 22 DSGVO | Laut EuGH (C-634/21, 07.12.2023, „SCHUFA“) ist schon der Score eine automatisierte Entscheidung, wenn der Vertragsschluss **maßgeblich** davon abhängt. Deshalb auf der Plattform keine automatische Ablehnung allein aufgrund des Scores; es braucht eine menschliche Prüfung. Das österreichische BVwG hat 2026 entschieden, dass eine Bonitätsbewertung ohne Auswirkung keine automatisierte Entscheidung ist. | [42][45] |

---

## 4. Register

| Register | Land | Zugang / API | Auth | Kosten | Quelle |
|---|---|---|---|---|---|
| **Zefix PublicREST** | CH | Produktion: `https://www.zefix.admin.ch/ZefixPublicREST/api/v1`; Test: `https://www.zefixintg.admin.ch/ZefixPublicREST/api/v1`. Die API sendet keine CORS-Header, deshalb nur serverseitig nutzbar. | **HTTP Basic Auth**; Zugang per E-Mail an zefix@bj.admin.ch (Bundesamt für Justiz, EHRA) | kostenlos | [46][47][48][49] |
| UID-Register (BFS) | CH | SOAP-Webservice `uid-wse.admin.ch`; öffentliche Dienste wie `GetByUID` ohne Login | keine für Public Services | kostenlos; max. 20 Anfragen pro Minute | [50][51] |
| **Firmenbuch HVD** | AT | Kostenlose HVD-API des BMJ (FBW-WebServices, **SOAP**, Schnittstellenbeschreibung v1.3 vom 22.05.2025). Enthält Name, Status, Sitz, Rechtsform, FN, Jahresabschlüsse und Dokumente. Lizenz CC BY 4.0. | Token: Antrag mit ID Austria bzw. EU-eID unter justizonline.gv.at/jop/web/iwg/register; der Token steht danach im Profil unter „Informationsweiterverwendung“ | HVD kostenlos (seit 2025) | [52][53][54][55] |
| Firmenbuch (klassisch) | AT | Abfrage über Verrechnungsstellen (z. B. BRZ-Verrechnungsstellen, auszug.at, firmenbuchgrundbuch.at) | Kundenkonto bei der Verrechnungsstelle | Gerichtsgebühr nach GGG TP 10 (Stand 01.04.2025): aktueller Auszug 4,63 EUR, mit historischen Daten 7,80 EUR, zuzüglich Aufschlag der Verrechnungsstelle (z. B. 0,36–0,52 EUR) und USt. Für den Gesamtbezug der Daten: 90 EUR einmalig und 90 EUR pro Monat. | [53][56][57] |
| **Handelsregister** | DE | handelsregister.de, Abruf seit 01.08.2022 kostenlos (DiRUG). **Keine offizielle API.** Laut Nutzungsbedingungen höchstens 60 Abrufe pro Stunde; automatisierte Massenabrufe sind unzulässig. Ein Antrag auf Zugang mit registrierter IP-Adresse ist beim AG Hagen (Servicestelle Registerportal) möglich. | – | kostenlos | [58][59] |
| Unternehmensregister | DE | unternehmensregister.de, u. a. mit Jahresabschlüssen. Die HVD-Pflicht (API und kostenloser Massen-Download) gilt seit 09.06.2024. **Ob eine offizielle HVD-API für das Handelsregister existiert, war nicht belegbar; prüfen.** Drittanbieter (z. B. OpenRegister, North Data) bieten APIs. | – | überwiegend kostenlos | [58][60][61] |
| **Transparenzregister** | DE | Nach EuGH C-37/20 und C-601/20 (22.11.2022) ist die Einsicht der Öffentlichkeit seit 12.12.2022 nur mit dargelegtem **berechtigtem Interesse** möglich. Verpflichtete nach § 2 GwG und Behörden haben eigene Einsichtsrechte (§ 23 GwG). | Registrierung | gebührenpflichtig (Höhe **prüfen**) | [62][63] |
| **WiEReG-Register** | AT | Einsicht für Verpflichtete, einschließlich erweitertem Auszug mit Compliance-Package | Portal des BMF (USP) | erweiterter Auszug 5,00 EUR; kleinste Pauschale 15 Auszüge für 75 EUR | [64][65] |

### Zefix-Endpunkte (für den Code)

| Zweck | Methode / Pfad | Antwort |
|---|---|---|
| Firmensuche nach Name | `POST /api/v1/company/search`, JSON-Body `{"name": "...", "activeOnly": true, "canton": "ZH", "legalFormId": 4, ...}` | Array von `CompanyShort` |
| Abruf per UID | `GET /api/v1/company/uid/{id}` mit `{id}` im Format `CHE107721785` (ohne Punkte und Bindestrich) | **Array** von `CompanyFull` |
| Weitere | `GET /company/ehraid/{id}`, `/company/chid/{id}`, `/sogc/{id}`, `/sogc/bydate/{date}`, `/legalForm`, `/community`, `/registryOfCommerce` | – |

- **`CompanyShort`:** `name`, `ehraid`, `uid`, `chid`, `legalSeatId`, `legalSeat`, `registryOfCommerceId`, `legalForm`, `status` (`ACTIVE` | `CANCELLED` | `BEING_CANCELLED`), `sogcDate`, `deletionDate`.
- **`CompanyFull`:** alle Felder von `CompanyShort`, zusätzlich `translation`, `purpose`, `sogcPub`, `address`, `canton`, `capitalNominal`, `capitalCurrency`, `headOffices`, `furtherHeadOffices`, `branchOffices`, `hasTakenOver`, `wasTakenOverBy`, `auditCompanies`, `oldNames`, `cantonalExcerptWeb`, `zefixDetailWeb`.
- **`address`:** `organisation`, `careOf`, `street`, `houseNumber`, `addon`, `poBox`, `city`, `swissZipCode`.
- **`legalForm`:** `id`, `uid`, `name`, `shortName`; `name` und `shortName` sind Objekte mit den Sprachschlüsseln `de`, `fr`, `it` und `en`.

Die Web-Oberfläche von zefix.ch nutzt eine eigene, nicht dokumentierte Schnittstelle. Deren Nutzung ohne Zugangsdaten ist nicht als offizielle Schnittstelle freigegeben; für die Plattform ausschließlich die PublicREST-API mit Zugangsdaten verwenden.

---

## 5. Gründung von Projektgesellschaften

### 5.1 Österreich

| Punkt | Inhalt | Quelle |
|---|---|---|
| Mindeststammkapital GmbH | **10.000 EUR** seit 01.01.2024 (GesRÄG 2023), davon **5.000 EUR bar** einzuzahlen | [66][67][68] |
| Gründungsprivilegierung | **Abgeschafft** (aus dem GmbHG entfernt). Bestehende gründungsprivilegierte GmbHs dürfen den Status weiterführen. | [66][67] |
| Form | Gesellschaftsvertrag als **Notariatsakt**; seit 01.01.2019 auch per Videokonferenz mit dem Notar (§ 69b NO, „elektronischer Notariatsakt“) | [68][69][70] |
| Vereinfachte Gründung § 9a GmbHG | Ohne Notar: nur für eine **Ein-Personen-GmbH**, deren einziger Gesellschafter eine natürliche Person und zugleich einziger Geschäftsführer ist. Die Bank prüft die Identität, nimmt die Musterzeichnung ab und übermittelt die Bestätigung nach § 10 Abs. 3 GmbHG elektronisch an das Firmenbuchgericht. | [71][72] |
| Einzahlungsbestätigung | Bankbestätigung nach § 10 Abs. 3 GmbHG | [71] |
| Firmenbuchanmeldung | Die GmbH entsteht erst mit der Eintragung. Die Gerichtsgebühren lagen zuletzt bei etwa 493 EUR (Eintragung 449 EUR + Eingabe 44 EUR, elektronisch). Laut einer Kanzleiquelle wurden sie zum 01.08.2026 angehoben (Angabe „47 plus 475 Euro“). **Aktuellen Tarif prüfen.** Eine Befreiung nach NeuFöG ist möglich. | [73][68] |
| Gesellschaftsteuer | Seit 01.01.2016 **abgeschafft** | [74] |
| Finanzamt | Steuernummer und UID beim Finanzamt beantragen (Formular Verf 15 bzw. über FinanzOnline, Bezeichnung **prüfen**). Mindest-KöSt 500 EUR pro Jahr. | [68] |
| WiEReG | Meldung der wirtschaftlichen Eigentümer **binnen 4 Wochen** nach der Eintragung (soweit keine Befreiung) | [73][75] |
| Wirtschaftskammer | Mit Gewerbeberechtigung Pflichtmitgliedschaft in der WKO (Grundsatz, **prüfen** für reine Besitz-SPVs) | – |
| **FlexCo** (FlexKapG) | Seit 2024. Mindeststammkapital ebenfalls 10.000 EUR. Unternehmenswert-Anteile bis 24,99 % des Stammkapitals. Übertragung von Geschäftsanteilen per Privaturkunde unter Mitwirkung von Anwalt oder Notar; Unternehmenswert-Anteile in Schriftform. | [76][77] |

### 5.2 Deutschland

| Punkt | Inhalt | Quelle |
|---|---|---|
| GmbH | Mindeststammkapital **25.000 EUR** (§ 5 GmbHG). Vor der Anmeldung müssen mindestens **12.500 EUR** eingezahlt sein, je Geschäftsanteil mindestens ein Viertel (§ 7 Abs. 2 GmbHG). | [78][79] |
| UG (haftungsbeschränkt) | Ab 1 EUR (§ 5a GmbHG). Stammkapital **voll bar** einzuzahlen, **keine Sacheinlagen**. 25 % des Jahresüberschusses gehen in eine gesetzliche Rücklage, bis 25.000 EUR erreicht sind. | [78], § 5a GmbHG |
| GmbH & Co. KG (typisch für Solarpark-SPVs) | Komplementär-GmbH (HRB, 25.000 / 12.500 EUR) und KG (HRA). Die **Kommanditeinlage ist frei wählbar**; die Haftsumme wird im Handelsregister eingetragen (§§ 171, 172 HGB). | HGB, prüfen |
| Musterprotokoll | § 2 Abs. 1a GmbHG: höchstens **3 Gesellschafter** und **1 Geschäftsführer**; senkt die Notarkosten | § 2 Abs. 1a GmbHG |
| Beurkundung | Notarielle Beurkundung (§ 2 GmbHG). **Online** über das Videokommunikationssystem der Bundesnotarkammer: seit 01.08.2022 GmbH/UG als Bargründung (DiRUG), seit 01.08.2023 auch **Sachgründung** (ohne Grundstücke und GmbH-Anteile), einstimmige Satzungsänderungen und Kapitalmaßnahmen (DiREG). Seit 08/2023 sind auch Online-Beglaubigungen von Registeranmeldungen möglich, also auch die KG-Anmeldung (**Einzelfall mit dem Notar prüfen**). | [80][81][82] |
| Transparenzregister | Die Mitteilungsfiktion ist mit dem TraFinG zum 01.08.2021 **entfallen**; jede GmbH und KG muss ihre wirtschaftlich Berechtigten aktiv melden. | [83][84] |
| Gewerbeanmeldung | § 14 GewO. Ob der Betrieb einer PV-Anlage ein Gewerbe ist, hängt vom Einzelfall ab (Kommune bzw. Steuerberatung, **prüfen**). GmbH und GmbH & Co. KG sind steuerlich gewerblich. | [85] |
| Steuerliche Erfassung | Fragebogen zur steuerlichen Erfassung über ELSTER **binnen 1 Monat** nach Betriebseröffnung (§ 138 Abs. 1b AO) | [85][86] |
| Marktstammdatenregister | PV-Anlagen und ihre Betreiber sind bei der Bundesnetzagentur im MaStR zu registrieren (Frist nach MaStRV, **prüfen**) | prüfen |

### 5.3 Schweiz

| Punkt | Inhalt | Quelle |
|---|---|---|
| Stammkapital GmbH | **CHF 20.000**, bei der Gründung **voll zu liberieren** | [87][88] |
| Form | Öffentliche Urkunde (Notariat); darin werden die Statuten, die Geschäftsführung und die Revisionsstelle (bzw. das Opting-out) festgelegt | [87][88] |
| Kapitaleinzahlungskonto | Sperrkonto bei einer Bank, auf das das gesamte Stammkapital eingezahlt wird | [88] |
| Handelsregister | Die GmbH entsteht mit der Eintragung. Die Gebühr beträgt etwa CHF 600 bei einem Kapital bis CHF 200.000; dazu kommen Notarkosten von etwa CHF 700–2.000. | [88] |
| EasyGov | Das Online-Portal des Bundes (easygov.swiss) für Anmeldungen, darunter Handelsregister, AHV und MWST. Die öffentliche Beurkundung bleibt beim Notariat. | [89], prüfen |

### 5.4 Notariate und APIs

Öffentliche APIs von Notariaten für die Gründung wurden in keinem der drei Länder gefunden. Die Online-Verfahren laufen über geschlossene Systeme: die Videoplattform der Bundesnotarkammer in DE [80], die Videokonferenz nach § 69b NO in AT [69], und die Registereinreichung über den Elektronischen Rechtsverkehr (ERV). Realistischer Ablauf für die Plattform:

1. Die Plattform sammelt die strukturierten Gründungsdaten (Gesellschafter, Kapital, Geschäftsführung, wirtschaftlich Berechtigte).
2. Die Plattform erstellt ein PDF- bzw. JSON-Datenblatt für das Notariat.
3. Das Notariat beurkundet (vor Ort oder per Video) und reicht beim Register ein.
4. Die Plattform überwacht die Eintragung über die Register-APIs (Zefix, Firmenbuch HVD) bzw. über den manuellen Abgleich (Handelsregister DE).
5. Folgepflichten werden als Aufgaben mit Frist angelegt: WiEReG oder Transparenzregister, Steuer, MaStR.

---

## 6. Fristen Jahresabschluss und Offenlegung

| Land | Pflicht | Frist | Sanktion | Quelle |
|---|---|---|---|---|
| AT | Einreichung von Jahresabschluss und ggf. Lagebericht beim Firmenbuchgericht (Kapitalgesellschaften, FlexCo, GmbH & Co KG) | **9 Monate** nach dem Bilanzstichtag (§ 277 UGB) | Automatische Zwangsstrafe ab 700 EUR je Geschäftsführer und Gesellschaft, wiederholbar (§ 283 UGB) | [90][91] |
| DE | Offenlegung im **Unternehmensregister** (seit DiRUG für Geschäftsjahre ab 2022 statt Bundesanzeiger) | **12 Monate** nach dem Abschlussstichtag (§ 325 HGB) | Ordnungsgeld ab 2.500 EUR durch das Bundesamt für Justiz (§ 335 HGB) | [92][93] |
| CH | Genehmigung der Jahresrechnung durch die Gesellschafterversammlung | **6 Monate** nach Ende des Geschäftsjahres (Art. 805 OR) | – | [94] |
| CH | Offenlegung | Keine allgemeine Offenlegungspflicht für die GmbH. Nach Art. 958e OR nur bei Anleihen oder Kotierung; sonst Einsicht für Gläubiger mit schutzwürdigem Interesse. | – | [95] |

---

## 7. Was davon ist in der Plattform umgesetzt

Kurzfassung (Details: docs/API.md, Abschnitt „Dienste“, und docs/PLATTFORM.md, Abschnitt „Dienste“):

| Baustein | Umsetzung | Ohne Vertrag/Zugang |
|---|---|---|
| Identitätsprüfung | Anbieter-neutrale Schnittstelle (`src/lib/plattform/dienste/identitaet/anbieter.js`, Frappe `plattform/dienste_kern.py`): Sitzung starten → Redirect-URL → Webhook `/api/dienste/identitaet/webhook/<anbieter>` bzw. Frappe `dienste.webhook_identitaet` (einzige `allow_guest`-Methode, HMAC über den Roh-Body, zeitkonstant, Rate-Limit, idempotent). Start-Aufrufe für Veriff, Sumsub und Onfido umgesetzt; IDnow/WebID vorbereitet (Vertrag nötig). | Demo-Simulator mit signiertem Webhook (nur Entwicklung bzw. `PLATTFORM_DEMO=1`) |
| MRZ-Vorprüfung | ICAO 9303 (TD1/TD2/TD3): Prüfziffern, Ablauf, Abgleich Name/Geburtsdatum/Ausweisnummer mit dem KYC-Fall; Ergebnis als Hinweis im KYC-Fall. Eingabe per Abtippen (keine OCR – `tesseract.js` ist nicht installiert, keine neuen Pakete). | läuft immer (keine externe Abhängigkeit) |
| Register | Zefix-PublicREST (Basic Auth) live, sobald `ZEFIX_BENUTZER`/`ZEFIX_PASSWORT` gesetzt sind; AT/DE über einen neutralen JSON-Vertrag (`/suche`, `/firma`) für Verrechnungsstelle bzw. Dienstleister. Abruf mit Abrufdatum, Quelle, Zweck; PDF-Zusammenfassung; Ablage im KYC-Fall nur durch die Compliance. | Demo-Register (ÖkoInvest-Gruppe mit öffentlichen Registerdaten + fiktive Firmen „(Demo)“) |
| Bonität | Neutraler Vertrag `POST {BONITAET_API_URL}/auskunft` (Übersetzer je Auskunftei), Ampel je Skala, Pflicht vor LOI/Gebot (konfigurierbar: alle/firmen/pilot/aus), manuelle Freigabe mit Begründung, Information des Betroffenen ohne Ergebnis, Einsicht protokolliert. | deterministischer Simulator |
| SPV-Gründung | Assistent AT GmbH, DE GmbH/UG/GmbH & Co. KG, CH GmbH mit Mindestkapital, Namensprüfung, Dokumentenpaket (PDF bzw. Jinja-Druckformat, MUSTER), Checkliste mit Reihenfolge, Fristen, Organigramm; ERPNext-Company optional. Notariate: kein API-Zugriff, Termin/Beurkundung als Checklistenschritt. | vollständig nutzbar |

In Frappe heißen die Schlüssel in der `site_config` `oekoinvest_ident_*`, `oekoinvest_zefix_*`, `oekoinvest_firmenbuch_api_*`, `oekoinvest_handelsregister_api_*`, `oekoinvest_bonitaet_*` (Liste im Kopf von `plattform/api/dienste.py`).

---

## 8. Umgebungsvariablen

Zugangsdaten gehören ausschließlich in Umgebungsvariablen bzw. einen Secret-Store, nie ins Repository, in Logs oder in Fehlermeldungen.

| Variable | Zweck | Beispiel / Hinweis |
|---|---|---|
| `IDENT_ANBIETER` | Gewählter Identitätsanbieter | `veriff` \| `sumsub` \| `onfido` \| `idnow` \| `webid` |
| `IDENT_API_URL` | Basis-URL | Veriff `https://stationapi.veriff.com`, Onfido EU `https://api.eu.onfido.com` |
| `IDENT_API_KEY` | API-Key bzw. App-Token | Veriff `X-AUTH-CLIENT`, Sumsub `X-App-Token` |
| `IDENT_WEBHOOK_SECRET` | Schlüssel für die HMAC-Prüfung eingehender Webhooks | Veriff Shared Secret, Sumsub Webhook-Secret, Onfido Webhook-Token |
| `BONITAET_ANBIETER` | Auskunftei | `ksv1870` \| `creditreform` \| `crif` \| `dnb` |
| `BONITAET_API_URL` | Basis-URL der Auskunftei | laut Vertrag |
| `BONITAET_API_KEY` | Zugangsdaten bzw. Token | Bei D&B OAuth2 Client-ID/Secret, ggf. zwei Werte |
| `ZEFIX_BENUTZER` | Benutzername für Zefix PublicREST (Basic Auth) | vom BJ vergeben (E-Mail-Adresse) |
| `ZEFIX_PASSWORT` | Passwort für Zefix PublicREST | – |
| `FIRMENBUCH_API_URL` / `FIRMENBUCH_API_KEY` | Firmenbuch-HVD (SOAP) bzw. Verrechnungsstelle | Token aus JustizOnline „Informationsweiterverwendung“ |
| `HANDELSREGISTER_API_URL` / `HANDELSREGISTER_API_KEY` | Drittanbieter-API für das Handelsregister DE (keine offizielle API) | laut Vertrag |
| `IDENT_API_SECRET`, `IDENT_STUFE` | Zweites Geheimnis (Sumsub-Anfragesignatur) bzw. Prüfprofil (Sumsub levelName, Onfido workflow_id) | optional |
| `BONITAET_PRODUKT` | Produkt der Auskunftei (z. B. Kompakt-/Vollauskunft) | optional |
| `ZEFIX_API_URL` | abweichende Zefix-Basis-URL (Test: `https://www.zefixintg.admin.ch/ZefixPublicREST/api/v1`) | optional |
| `PLATTFORM_BONITAET_VOR_LOI` | Pflicht der Bonitätsauskunft vor LOI/Gebot: `alle` \| `firmen` \| `pilot` \| `aus` (Standard: Produktion `firmen`, Entwicklung `pilot`) | Einstellung im Backoffice hat Vorrang |

---

## 9. Rechtshinweise

- Dieses Dokument ist **keine Rechtsberatung**. Es fasst öffentlich zugängliche Informationen mit Stand 30.09.2026 zusammen.
- Lassen Sie vor dem Livegang anwaltlich prüfen: die geldwäscherechtliche Verpflichtetenstellung (GwG DE, FM-GwG und GewO AT, GwG CH, AMLR ab 10.07.2027), die Rechtsgrundlage und Informationstexte für Identitäts- und Bonitätsprüfungen (Art. 6, 9, 13/14, 22 DSGVO), Auftragsverarbeitungsverträge (Art. 28 DSGVO) mit allen Anbietern sowie Drittlandübermittlungen.
- Preise, Gebühren und API-Details ändern sich. Prüfen Sie diese vor Vertragsschluss beim Anbieter bzw. im aktuellen Gebührentarif.
- Die Nutzungsbedingungen der Register sind einzuhalten, insbesondere die Abrufgrenzen von handelsregister.de und die Lizenzbedingungen (CC BY 4.0) der Firmenbuch-HVD.

---

## 10. Quellen

1. Veriff – Webhooks Guide: https://devdocs.veriff.com/docs/webhooks-guide
2. Veriff – HMAC Authentication and Endpoint Security: https://devdocs.veriff.com/docs/hmac-authentication-and-endpoint-security
3. Veriff – /v1/sessions: https://devdocs.veriff.com/apidocs/v1sessions ; Create verification session: https://devdocs.veriff.com/docs/how-to-generate-sessions-manually
4. Sumsub – Webhook manager: https://docs.sumsub.com/docs/webhook-manager
5. Sumsub – Authentication: https://docs.sumsub.com/reference/authentication ; Generate WebSDK link: https://docs.sumsub.com/reference/generate-websdk-external-link
6. Veriff – Pricing: https://www.veriff.com/pricing
7. Sumsub – Pricing: https://sumsub.com/pricing/
8. Entrust/Onfido – Manual webhook signature verification: https://documentation.identity.entrust.com/api/manual-webhook-signature-verification/
9. Entrust/Onfido – API v3.6: https://documentation.identity.entrust.com/api/latest/ ; Quick start: https://documentation.identity.entrust.com/getting-started/quick-start-guide/
10. IDnow – VideoIdent/eSign/eID API: https://docs-videoident.idnow.io/ ; Developer Hub: https://idnow.io/developers/
11. IDnow – API Overview (DocIDV): https://doc.idnow.de/resources/api/overview/
12. IDnow – Produkte: https://idnow.io/solutions/identity-verification/ ; Preise auf Anfrage (Sekundärquelle): https://micobo.medium.com/videoidentifizierung-in-deutschland-regulatorik-und-anbieter-48a49e58ac7d
13. Sumsub – Privacy Notice (Service): https://sumsub.com/privacy-notice-service/ ; Veriff (Sitz Tallinn): https://en.wikipedia.org/wiki/Veriff
14. WebID Solutions: https://webid-solutions.com/en/
15. § 12 GwG: https://www.gesetze-im-internet.de/gwg_2017/__12.html
16. § 18 PAuswG: https://www.buzer.de/18_PAuswG.htm
17. BaFin-Rundschreiben 3/2017 (GW): https://www.bafin.de/SharedDocs/Veroeffentlichungen/DE/Rundschreiben/2017/rs_1703_gw_videoident.html
18. Bird & Bird – Entwurf GwVideoIdentV (2024): https://www.twobirds.com/de/insights/2024/germany/videoident-for-all-draft-german-aml-video-identification-ordinance
19. StMI Bayern – Hinweise für Verpflichtete 2025: https://www.stmi.bayern.de/media/a-z/geldwaesche/anlage1-zu-auslegungs-und-anwendungshinweisen-2025-2.pdf
20. RIS – Online-IDV: https://www.ris.bka.gv.at/geltendefassung/bundesnormen/20009774/online-idv,%20fassung%20vom%2013.08.2021.pdf
21. FMA/OTS – biometrische Verfahren (2021): https://www.ots.at/presseaussendung/OTS_20211102_OTS0093/fma-ermoeglicht-rein-biometrische-verfahren-zur-geldwaescherechtlichen-kundenidentifikation
22. FMA – Rundschreiben Sorgfaltspflichten: https://www.fma.gv.at/wp-content/plugins/dw-fma/download.php?d=5596 ; ID Austria: https://www.id-austria.gv.at/de
23. § 365m1 GewO: https://www.jusline.at/gesetz/gewo/paragraf/365m1
24. BMWET – Verpflichtete Gewerbetreibende: https://www.bmwet.gv.at/Themen/Unternehmen/Bekaempfung_Geldwaesche_und_Terrorismusfinanzierung/Betroffene-Gewerbetreibende.html
25. FINMA – Konsultation Teilrevision RS 2016/7 (16.12.2025): https://www.finma.ch/en/news/2025/12/20251216-mm-video-online-id/
26. FINMA – Revision 2021 (NFC): https://www.finma.ch/de/news/2021/05/20210517-mm-rs-16-07-online-identifizierung/
27. Deloitte – EU-AML-Paket: https://www.deloitte.com/de/de/issues/regulation-security/eu-aml-paket.html
28. (entfällt)
29. (entfällt)
30. RP Darmstadt – Erstinformation EU-Recht (2026): https://rp-darmstadt.hessen.de/sites/rp-darmstadt.hessen.de/files/2026-07/hp_erstinformation_eu-recht.pdf ; IDnow – AMLR 2027: https://idnow.io/future-of-amlr-identification-2027/
31. WebID – AMLR Compliance Guide: https://webid-solutions.com/en/resources/blog/achieving-amlr-compliance/
32. KSV1870 – SmartServices: https://www.ksv.at/en/companies/smartservices
33. auszug.at – Kosten KSV1870-Produkte: https://ksv1870.auszug.at/faq/was-kostet-die-abfrage-von-ksv1870-produkten
34. commitly – KSV1870-Integration: https://help.commitly.com/de/articles/2507692-integration-mit-ksv1870
35. Creditreform – API-Plattform: https://www.creditreform.de/creditreform-api
36. wirtschaftswissen.de – Kosten Wirtschaftsauskunft: https://www.wirtschaftswissen.de/finanzen-steuern/rechnungsstellung/rechnungen-mahnungen/pruefen-sie-eine-neue-geschaeftsverbindung-indem-sie-eine-wirtschaftsauskunft-einholen/
37. CRIF Deutschland – Bonitätsprüfung B2B: https://www.crif.de/fuer-unternehmen/loesungen/risikomanagement-bonitaetsinformationen/bonitaetspruefung-b2b-national/
38. CRIF Österreich: https://www.crif.at/ ; CRIF Schweiz: https://www.crif.ch/handel-schweiz/
39. D&B – Authentication: https://www.dnb.com/en-gb/developers/authentication/
40. D&B Direct+ (Preisangaben Sekundärquelle): https://savvyiq.ai/compare/dun-bradstreet ; https://www.dnb.com/en-us/products/dnb-direct-plus.html
41. DSK-Beschluss vom 23.03.2018: https://www.datenschutzkonferenz-online.de/media/dskb/20180323_dskb_bonitaetsauskunfte_an_versandhandel.pdf
42. EuGH C-634/21 (Übersicht): https://www.noerr.com/de/insights/eugh-urteil-zum-schufa-score---was-unternehmen-jetzt-beachten-muessen
43. DSB Österreich – Gläubigerschutz & Kreditauskunfteien: https://dsb.gv.at/faqs/glaeubigerschutz-kreditauskunfteien
44. DSB-Bescheid KSV1870 (noyb): https://noyb.eu/sites/default/files/2023-02/DSB_KSV1870_Redacted.pdf
45. dataprotect.at – BVwG zu Art. 22 (06/2026): https://www.dataprotect.at/2026/06/05/kreditauskunftei-scoring-art-22-dsgvo-bvwg-bonit%C3%A4tsbewertung-ohne-auswirkung-ist-keine-automatisierte-entscheidung-isd-art-22/
46. Zefix PublicREST – OpenAPI: https://www.zefix.admin.ch/ZefixPublicREST/v3/api-docs ; Swagger: https://www.zefix.admin.ch/ZefixPublicREST/swagger-ui/index.html
47. I14Y – Zefix REST API: https://www.i14y.admin.ch/en/catalog/dataservices/6ef8f5d2-3d6a-4d84-bf60-5e65fde98a87
48. zefix-php (Zugang per E-Mail): https://github.com/jschwendener/zefix-php
49. TenderLift zefix-client (CORS-Hinweis): https://github.com/TenderLift/zefix-client
50. BFS – UID-Schnittstellen: https://www.bfs.admin.ch/bfs/de/home/register/unternehmensregister/unternehmens-identifikationsnummer/uid-register/uid-schnittstellen.html
51. BK – UID-Webservice: https://www.bk.admin.ch/bk/de/home/digitale-transformation-ikt-lenkung/e-services-bund/services/uid-webservice.html
52. data.gv.at – HVD Firmenbuch: https://mastodon.social/@datagvat/114178323089123738
53. BMJ – Weiterverwendung von Informationen: https://www.bmj.gv.at/service/weiterverwendung-von-informationen.html
54. firmenbuch-HVD (Postman, Token-Antrag): https://github.com/Lukhers-dev/firmenbuch-HVD
55. mcp-austrian-firmenbuch (FBW-WebServices v1.3): https://glama.ai/mcp/servers/fat-operator/mcp-austrian-firmenbuch
56. auszug.at – Gebühren Firmenbuch: https://portal.auszug.at/faq/gebuehren-firmenbuch
57. firmenbuchgrundbuch.at – Preise: https://www.firmenbuchgrundbuch.at/de/preise
58. Übersicht Handelsregister/Unternehmensregister: https://zephira.ai/germany-handelsregister-the-complete-guide-to-german-company-registry-data-in-2026/
59. IHK Köln – Freier Datenabruf im Handelsregister: https://www.ihk.de/koeln/hauptnavigation/recht-steuern/gefahr-missbrauch-registerdaten-5644100 ; bundesAPI: https://github.com/bundesAPI/handelsregister
60. Durchführungsverordnung (EU) 2023/138: https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=uriserv:OJ.L_.2023.019.01.0043.01.DEU
61. FragDenStaat – IFG-Anfrage HVD Unternehmensregister: https://fragdenstaat.de/anfrage/antrag-nach-ss-1-informationsfreiheitsgesetz-ifg-umsetzung-von-ss-9-dng-vo-eu-2023-138-fuer-das-unternehmensregister/
62. CMS – Einsicht Transparenzregister nach EuGH: https://cms.law/de/deu/publication/deutschland-schraenkt-nach-eugh-urteil-die-einsicht-in-das-transparenzregister-ein
63. BfDI – Transparenzregister: https://www.bfdi.bund.de/DE/Buerger/Inhalte/Finanzen-Steuern/ABC_Transparenzregister.html
64. ICON – WiEReG Compliance-Package: https://www.icon.at/news/detail/wiereg-jaehrliche-meldepflichten-und-compliance-package
65. BMF – FAQs Register der wirtschaftlichen Eigentümer (02/2025): https://www.bmf.gv.at/dam/jcr:3951345b-3dcf-4c3b-bc14-c1d4ae64def9/2025-02-12_FAQs_zum_Register_der_wirtschaftlichen_Eigent%C3%BCmer.pdf
66. LBG – Mindeststammkapital 10.000 EUR: https://www.lbg.at/servicecenter/lbg_steuertipps_praxis/herabsetzung_des_mindeststammkapitals_der_gmbh_auf_10_000_ab_2024/index_ger.html
67. Deloitte AT – Änderung Mindeststammkapital: https://www.deloitte.com/at/de/services/tax/blogs/2024/aenderung-des-mindeststammkapitals-bei-der-gmbh.html
68. Brandauer Rechtsanwälte – GmbH gründen 2026: https://brandauer-rechtsanwaelte.at/2026/03/09/gmbh-gruenden-oesterreich/
69. § 69b NO: https://www.jusline.at/gesetz/no/paragraf/69b
70. ms legal – ENG / Videokonferenz: https://mslegal.at/elektronische-notariatsform-gruendungsgesetz-eng-errichtung-einer-gmbh-auch-mit-elektronischer-kommunikation-videokonferenz/
71. § 9a GmbHG (AT): https://www.jusline.at/gesetz/gmbhg/paragraf/9a
72. rechtdirekt – Vereinfachte Gründung: https://www.rechtdirekt.at/vereinfachte-gmbh-gruendung-nach-9a-gmbhg/
73. Brandauer Rechtsanwälte – Gründungskosten 2026: https://brandauer-rechtsanwaelte.at/2026/04/19/gruendungskosten-gmbh-oesterreich-2026-flexco-vergleich/
74. Forum Media – Aufhebung Gesellschaftsteuer: https://www.forum-media.at/gesellschaftsrecht/News/Aufhebung-der-Gesellschaftsteuer-tritt-in-Kraft
75. BMF – Erlass WiEReG September 2024: https://www.bmf.gv.at/dam/jcr:7ba9c9cd-4439-4ed9-a856-ad4376421fcf/Erlass%20WIEReG%20September%202024.pdf
76. WKO – Flexible Kapitalgesellschaft: https://www.wko.at/gruendung/flexible-kapitalgesellschaft-flexkapg-
77. CMS – Flexible Kapitalgesellschaft: https://cms.law/de/aut/publication/flexible-kapitalgesellschaft-publikationen-von-johannes-reich-rohrwig/flexible-kapitalgesellschaft
78. Haufe – GmbH-Bargründung: https://www.haufe.de/id/beitrag/gmbh-bargruendung-4-das-mindeststammkapital-der-gmbh-betraegt-25000eur-HI2048068.html
79. Existenzgründungsportal BMWK – GmbH mit 6.250 EUR: https://www.existenzgruendungsportal.de/Redaktion/DE/BMWK-Infopool/Antworten/Recht/Rechtsformen/GmbH/GmbH-Gruendung-mit-6250-Euro-Stammkapital
80. notar.de – Online-Gründung einer GmbH: https://www.notar.de/aktuelles/details/online-gruendung-einer-gmbh-digitalisierung-notarieller-verfahren
81. BMJV – DiREG/DiRUG: https://www.bmjv.de/SharedDocs/Pressemitteilungen/DE/2022/0729_DIREG_DIRUG.html
82. BRAK – Notare können mehr online beurkunden: https://www.brak.de/newsroom/news/notare-koennen-jetzt-noch-mehr-online-beurkunden/
83. PwC Legal – TraFinG: https://pwclegal.de/blog/transparenzregister-und-finanzinformationsgesetz-trafing-tritt-am-01-august-2021-in-kraft
84. IHK Berlin – Mitteilungspflicht Transparenzregister: https://www.ihk.de/berlin/service-und-beratung/recht-und-steuern/kaufmaennische-pflichten/mitteilungspflicht-transparenzregister-3948492
85. selbststaendigkeit.de – Fragebogen steuerliche Erfassung: https://selbststaendigkeit.de/gewerbe-anmelden/fragebogen-steuerliche-erfassung/
86. ELSTER – Fragebogen Kapitalgesellschaft: https://www.elster.de/eportal/formulare-leistungen/alleformulare/fsekapg
87. KMU-Portal Bund – GmbH: https://www.kmu.admin.ch/kmu/de/home/praktisches-wissen/kmu-gruenden/uebersicht-rechtsformen/gesellschaft-mit-beschraenkter-haftung.html
88. KMU-Portal – GmbH: Haftung, Stammkapital, Gründung: https://www.kmu.admin.ch/de/gmbh-haftung-stammkapital-gruendung
89. EasyGov: https://www.easygov.swiss/
90. § 277 UGB: https://www.jusline.at/gesetz/ugb/paragraf/277
91. § 283 UGB: https://www.jusline.at/gesetz/ugb/paragraf/283 ; BDO – Offenlegung: https://www.bdo.at/de-at/blog/accounting-news/die-offenlegung-des-jahresabschlusses-beim-firmenbuch
92. § 325 HGB: https://dejure.org/gesetze/HGB/325.html
93. BfJ – Offenlegungspflichten: https://www.bundesjustizamt.de/DE/Themen/OrdnungsgeldVollstreckung/Jahresabschluesse/Offenlegung/Pflichten/Pflichten_node.html
94. Haufe – Schweiz Gesellschafterversammlung (Art. 805 OR): https://www.haufe.de/id/beitrag/schweiz-1-gesellschafterversammlung-HI14963244.html
95. Art. 958e OR (Fedlex): https://www.fedlex.admin.ch/eli/cc/27/317_321_377/de#art_958_e
