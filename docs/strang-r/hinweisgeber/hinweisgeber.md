# Hinweisgebersystem – Seite `/hinweisgeber` (neu)

> **ENTWURF zur anwaltlichen Prüfung – nicht freigegeben.** Fassung `HG-ENTWURF-2026-10-03`. Neue Seite `src/app/hinweisgeber/page.js`
> (Anlage durch das Code-Paket nach Freigabe; Strang R liefert nur den Text).
>
> **Vorbedingungen (Inhaber, Masterplan E13):**
> 1. Beschäftigtenzahl je Gesellschaft der Gruppe (DE/AT/CH) feststellen – davon hängt die gesetzliche Pflicht ab (DE und AT: ab 50).
> 2. Meldekanal festlegen: empfohlen ein **externer Anbieter** mit EU/CH-Hosting, anonymem Postfach und Rückfragecode, dazu eine externe
>    Ombudsperson. **Kein Eigenbau im Portal** (Admin-Zugriff und unlöschbare Hash-Kette widersprechen Vertraulichkeit und Löschpflicht).
> 3. Bis der Anbieter steht: Übergangslösung mit Ombudsperson (Post/Telefon) und Hinweis auf die externen Meldestellen.
>
> **Abgrenzung:** Das Portal-Werkzeug „Hinweis an Compliance“ (`/portal/admin/hinweis`) ist eine interne Geldwäsche-Verdachtsmeldung für das
> Backoffice – **kein** Hinweisgebersystem. Es soll im Menü „GwG-Verdacht melden“ heißen (Code-Paket, `src/components/Portal/PortalRahmen.js`).
>
> **Seitenregeln:** keine Statistik, kein Google Analytics, keine Herkunftsdaten, keine Formulare im eigenen Stack (nur Link zum Kanal).
> Die Seite darf indexiert werden, sobald sie freigegeben ist (Pflichtinformationen müssen leicht zugänglich sein, § 7 Abs. 3 HinSchG).
> Footer-Link neben Impressum und Datenschutz.

---

## Hinweise geben – vertraulich und geschützt

Sie haben in Ihrer Arbeit mit der ÖKOVOLT Gruppe oder der ÖkoInvest GmbH einen Rechtsverstoß bemerkt? Dann können Sie uns das melden –
auf Wunsch anonym. Wer in gutem Glauben meldet, ist gesetzlich vor Benachteiligung geschützt.

### Wer kann melden?

Beschäftigte, Bewerberinnen und Bewerber, ehemalige Mitarbeitende, Leiharbeitskräfte, Selbstständige, Lieferanten und deren Beschäftigte
sowie alle, die beruflich mit uns zu tun haben – zum Beispiel als Flächeneigentümer, Gemeinde, Investor oder Partner.
[[PRÜFEN P-100: Persönlicher Anwendungsbereich je Land (§ 1 HinSchG; § 2 HSchG); Öffnung für Nicht-Beschäftigte freiwillig?]]

### Was kann gemeldet werden?

Verstöße gegen Gesetze, insbesondere in den Bereichen, die das Hinweisgeberschutzrecht nennt – zum Beispiel Korruption, Geldwäsche,
Betrug, Umwelt- und Datenschutz, Produktsicherheit, Wettbewerbsrecht, Arbeitsschutz. Für reine Beschwerden über Produkte oder Service nutzen
Sie bitte das [Kontaktformular](/kontakt).
[[PRÜFEN P-101: Sachlicher Anwendungsbereich (§ 2 HinSchG; § 3 HSchG) – Liste kürzen auf zulässige Beispiele; Verhaltenskodex vorhanden?]]

### So melden Sie intern

| Weg | Wie |
|---|---|
| Online, auch anonym | [[INHABER: Link zum Meldekanal des Anbieters]] – Sie erhalten einen Code, mit dem Sie Rückfragen lesen und beantworten können. |
| Telefonisch oder persönlich | [[INHABER: Ombudsperson bzw. interne Meldestelle – Name, Telefon, Zeiten; persönliches Treffen auf Wunsch]] |
| Per Post | [[INHABER: Anschrift der Ombudsperson, Vermerk „Vertraulich – Hinweisgebersystem“]] |

Ihre Meldung bearbeiten nur die dafür benannten, unabhängigen Personen [[INHABER: wer – z. B. externe Ombudsperson und benannte Stelle; nicht Vertrieb, nicht die Geschäftsführung allein]].

### Was danach passiert

1. **Eingangsbestätigung spätestens nach 7 Tagen** (DE § 17 Abs. 1 HinSchG; AT § 9 Abs. 1 HSchG – schriftliche Hinweise).
2. Wir prüfen, ob der Hinweis zutrifft, und fragen bei Bedarf nach.
3. **Rückmeldung innerhalb von 3 Monaten** nach der Bestätigung über ergriffene oder geplante Folgemaßnahmen, soweit das die Ermittlungen und
   die Rechte anderer nicht beeinträchtigt (DE § 17 Abs. 2 HinSchG; AT [[PRÜFEN P-102: Paragraf Rückmeldefrist HSchG für interne Stellen]]).

### Vertraulichkeit und Schutz

Ihre Identität und die Identität der in der Meldung genannten Personen behandeln wir vertraulich. Benachteiligungen wegen einer Meldung
(z. B. Kündigung, Versetzung, schlechtere Bewertung) sind verboten. Wer wissentlich falsche Meldungen macht, ist nicht geschützt.
[[PRÜFEN P-103: Formulierung Repressalienschutz und Beweislast (DE § 36 HinSchG; AT §§ 20 ff. HSchG); Haftung bei Falschmeldung]]

### Externe Meldestellen

Sie können sich auch direkt an eine Behörde wenden; Sie müssen nicht zuerst intern melden. Wir empfehlen die interne Meldung, wenn intern
wirksam abgeholfen werden kann und Sie keine Nachteile befürchten.

**Deutschland** (Wahlrecht: § 7 Abs. 1 HinSchG)
- Externe Meldestelle des Bundes beim **Bundesamt für Justiz** (§ 19 Abs. 1 HinSchG) – [[INHABER: Link zum Meldeportal auf bundesjustizamt.de prüfen und einsetzen]]
- **Bundesanstalt für Finanzdienstleistungsaufsicht (BaFin)** für Finanzdienstleistungen und bestimmte Geldwäsche-Verstöße (§ 21 HinSchG)
- **Bundeskartellamt** für Verstöße gegen das Wettbewerbsrecht [[PRÜFEN P-104: § 22 HinSchG nicht am Original abgerufen]]
- Externe Meldestellen der Länder, soweit eingerichtet

**Österreich**
- **Bundesamt zur Korruptionsprävention und Korruptionsbekämpfung (BAK)** als allgemeine externe Stelle (§ 15 Abs. 1 HSchG) –
  https://www.bak.gv.at/701/start.html [[PRÜFEN P-104: Link aktuell?]]
- Für bestimmte Bereiche andere externe Stellen (§ 15 Abs. 2 HSchG), u. a. Finanzmarktaufsicht, Bundeswettbewerbsbehörde,
  Geldwäschemeldestelle, Abschlussprüferaufsicht. [[PRÜFEN P-104: Liste vollständig und Bezeichnungen exakt]]

**Schweiz**
- Für private Unternehmen besteht derzeit **keine allgemeine gesetzliche Regelung** zu Hinweisgebersystemen und keine allgemeine externe
  Meldestelle. Je nach Thema sind Behörden zuständig (z. B. Strafverfolgungsbehörden). Unser interner Kanal steht auch Personen in der
  Schweiz offen. [[PRÜFEN P-105: Rechtslage CH (OR-Revision Whistleblowing gescheitert?), zuständige Stellen je Thema, arbeitsrechtliche Treuepflicht Art. 321a OR]]

### Für welche Gesellschaften gilt dieser Kanal?

[[INHABER: Liste der Gesellschaften der ÖKOVOLT Gruppe, die den Kanal nutzen – mit Sitzland. Bei gemeinsamer Meldestelle: Hinweis, dass die Verantwortung für Folgemaßnahmen bei jeder Gesellschaft bleibt.]]
[[PRÜFEN P-106: Konzernlösung zulässig? DE § 14 HinSchG (gemeinsame Stelle 50–249 Beschäftigte, Dritte als Meldestelle); AT HSchG gesondert]]

### Datenschutz

Wie wir Daten im Hinweisgebersystem verarbeiten, steht im [Datenschutzhinweis zum Meldekanal](datenschutzhinweis-meldekanal.md).

---

Quellen (Abruf 03.10.2026): HinSchG §§ 7, 12, 17, 19, 21 – https://www.gesetze-im-internet.de/hinschg/ ·
HSchG §§ 9, 11, 15 – https://ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=20012184 ·
BKA: https://www.bundeskanzleramt.gv.at/themen/compliance/hinweisgeberinnenschutzgesetz.html
