# Besondere Bedingungen Projektbörse

> **ENTWURF zur anwaltlichen Prüfung – nicht freigegeben.** Fassung `BB-PB-ENTWURF-2026-10-03`.
> Ersetzt nach Freigabe `src/app/bedingungen/projektboerse/page.js`. Bis dahin `noindex` (bereits so: `_teile.js`, `FREIGEGEBEN = false`).
> **Vor Livegang zwingend:** aufsichtsrechtliches Gutachten je Land zur Vermittlung von Projektrechten und Gesellschaftsanteilen (P-56).
>
> Änderungen gegenüber der Live-Fassung: Doppeltätigkeit offengelegt (§ 1 Abs. 3), Nachweisfiktion entschärft (§ 4 Abs. 2),
> Schadenersatz des Investors auf Verschulden gestellt (§ 5 Abs. 2), Länderhinweise ergänzt, offene Platzhalter als Entscheidungen benannt.

## § 1 Geltung und Rolle von ÖkoInvest

(1) Diese Bedingungen gelten für Projektanbieter, die ein Projekt über die Projektbörse der ÖkoInvest GmbH („ÖkoInvest“) anbieten, und –
soweit sie Investoren betreffen (§ 5) – für Investoren. Sie sind der Rahmen der **Provisionsvereinbarung**, die der Anbieter vor der
Veröffentlichung abschließt; dort vereinbarte Werte gehen vor.

(2) Für Investoren und Flächeneigentümer ist die Projektbörse kostenfrei. ÖkoInvest wird im Auftrag des Anbieters tätig.

(3) **Offenlegung:** ÖkoInvest begleitet auch Investoren (Suchprofile, Datenraum, Deal-Room), erhält von ihnen aber keine Vergütung.
[[INHABER: Ist eine Käuferprovision ausgeschlossen? Wenn ja, so lassen. Wenn nein: Doppeltätigkeit beiden Seiten offenlegen.]]
Bietet ÖkoInvest oder eine Gesellschaft der ÖKOVOLT Gruppe ein eigenes Projekt an oder ist daran beteiligt, steht das im Exposé.
[[PRÜFEN P-80: Doppeltätigkeit und Interessenkonflikt – AT MaklerG, DE § 654 BGB, CH Art. 415 OR; Normen nicht am Original geprüft]]

## § 2 Leistungen

ÖkoInvest prüft das Projekt auf Plausibilität und Vollständigkeit, erstellt Teaser und vertrauliches Exposé, veröffentlicht das Projekt,
informiert Investoren mit passendem Suchprofil, schließt NDAs, gibt Datenraum-Stufen frei, moderiert Fragen und Antworten und führt auf
Wunsch ein Bieterverfahren bis zum Closing. ÖkoInvest schuldet den Nachweis bzw. die Vermittlung von Interessenten, **keinen Verkaufserfolg**.
Rechts-, Steuer- und technische Beratung sind nicht enthalten.

## § 3 Provision

(1) Kommt zwischen dem Anbieter und einem von ÖkoInvest nachgewiesenen oder vermittelten Investor ein Vertrag über das Projekt zustande,
schuldet der Anbieter die vereinbarte Provision. Der Satz liegt je nach Projekt zwischen [[TECHNIK: PROVISION.verkaeufer min–max aus `src/lib/invest/markt.js`, derzeit 1,5 und 3 %]]
und wird bei der Freigabe des Projekts festgelegt.

(2) Vertrag über das Projekt ist jeder Vertrag, durch den der Investor das Projekt ganz oder teilweise erwirbt oder wirtschaftlich übernimmt –
insbesondere Asset Deal, Share Deal, Co-Entwicklung mit Erwerbsoption und gleichwertige Gestaltungen.

(3) Bemessungsgrundlage ist der Kaufpreis einschließlich übernommener oder abgelöster Verbindlichkeiten gegenüber dem Anbieter; beim Share
Deal [[INHABER: Eigenkapitalwert (Kaufpreis der Anteile) **oder** Unternehmenswert (EV) – Entscheidung]]. Bedingte und gestaffelte Zahlungen
(Meilensteine, Earn-out) zählen, sobald sie fällig werden.

(4) Der Anspruch entsteht mit wirksamem Abschluss, bei aufschiebenden Bedingungen mit deren Eintritt [[PRÜFEN P-81: Signing oder Closing als Entstehungszeitpunkt; Wegfall bei Rücktritt]].
Fälligkeit: [[INHABER: z. B. 14 Tage nach Rechnung]], bei gestaffelten Zahlungen anteilig. Beträge zuzüglich Umsatzsteuer, soweit sie anfällt.

(5) Der Anbieter teilt den Abschluss innerhalb von fünf Werktagen mit und legt die Berechnungsgrundlagen offen.

## § 4 Nachweis und Vorkenntnis

(1) Als nachgewiesen gilt ein Investor, dem die Projektdetails über die Plattform freigeschaltet wurden (NDA-Freigabe) oder der über den
Deal-Room mit dem Anbieter in Kontakt kam.

(2) War dem Anbieter der Investor als Interessent für dieses Projekt bereits bekannt, teilt er das mit Nachweis innerhalb von zehn Werktagen
mit, nachdem ihm der Interessent (auch pseudonym) angezeigt wurde. Der spätere Nachweis der Vorkenntnis bleibt dem Anbieter möglich; die
Frist dient der Klärung. [[PRÜFEN P-82: Die Live-Fassung fingiert den Nachweis bei Fristversäumnis – zulässig je Land?]]

## § 5 Umgehungsschutz

(1) Der Provisionsanspruch besteht auch, wenn der Vertrag unter Umgehung der Plattform geschlossen wird – unmittelbar oder über verbundene
Unternehmen, Gesellschafter, Treuhänder oder Dritte –, sofern der Investor dem Anbieter erstmals über die Plattform bekannt wurde und der
Abschluss innerhalb von **24 Monaten** nach Freischaltung der Projektdetails erfolgt. [[PRÜFEN P-60: Dauer]]

(2) Investoren kontaktieren den Anbieter bis zur Kontaktfreigabe nicht außerhalb der Plattform und nutzen erlangte Kontakte nicht zur
Umgehung. Verletzt ein Investor diese Pflicht schuldhaft und entgeht ÖkoInvest dadurch die Provision, ersetzt er den Schaden.
[[PRÜFEN P-60: Grundlage der Bindung des Investors (Nutzungsbedingungen/NDA)]]

(3) Bei begründetem Verdacht auf Umgehung erteilen Anbieter und Investor Auskunft über Zustandekommen und Bedingungen des Vertrags.

(4) Vertragsstrafe: [[INHABER/PRÜFEN P-83: ja/nein; falls ja Höhe und Obergrenze; richterliches Mäßigungsrecht AT § 1336 ABGB, DE § 343 BGB (nicht bei Kaufleuten, § 348 HGB), CH Art. 163 OR]]

## § 6 Exklusivität (optional)

(1) Eine Exklusivität (Alleinvermittlungsauftrag) gilt nur, wenn sie ausdrücklich vereinbart ist, für [[INHABER: Dauer, z. B. 6 Monate, danach monatlich kündbar]].

(2) Während der Exklusivität bietet der Anbieter das Projekt nicht über andere Vermittler an und leitet eigene Interessenten weiter.
ÖkoInvest vermarktet aktiv (gezielte Ansprache, regelmäßige Berichte).

(3) Ob bei einem Abschluss ohne Mitwirkung von ÖkoInvest während der Exklusivität eine Provision anfällt, regelt die
Exklusivitätsvereinbarung im gesetzlichen Rahmen. [[PRÜFEN P-84: AT §§ 14, 15 MaklerG; DE Alleinauftrag; CH Art. 412 ff. OR]]

## § 7 Pflichten des Anbieters

Es gelten § 5 der Nutzungsbedingungen sowie: Datenraum aktuell halten, moderierte Fragen fristgerecht beantworten, Informationen allen
zugelassenen Interessenten gleich geben.

## § 8 Rückzug und Beendigung

(1) Der Anbieter kann sein Projekt jederzeit zurückziehen; laufende verbindliche Runden sind geordnet abzuschließen oder abzubrechen.

(2) Ansprüche aus bereits nachgewiesenen Investoren und der Umgehungsschutz bestehen fort.

## § 9 Haftung

ÖkoInvest steht nicht ein für Angaben, Bonität oder Vertragstreue von Anbieter und Investoren und nicht für Zustandekommen oder Erfüllung von
Verträgen. Im Übrigen gilt § 16 der Nutzungsbedingungen.

## Länderhinweise (zur Prüfung)

| Land | Maklerrecht | Aufsichtsrecht (Abgrenzung) | Besonderheit |
|---|---|---|---|
| AT | MaklerG (Provision, Doppeltätigkeit, Alleinvermittlung) | WAG 2018, AltFG, KMG 2019, GewO | Gewerbeberechtigung für Vermittlung prüfen |
| DE | §§ 652 ff. BGB, § 654 BGB | KWG, WpIG, § 34c/§ 34f GewO | Anteilskauf GmbH: notarielle Beurkundung (§ 15 GmbHG) |
| CH | Art. 412 ff. OR, Art. 415 OR | FIDLEG, FINIG | CH-Projektbörse erst nach Freigabe (E14) |

Alle Normangaben dieser Tabelle stammen aus den Expertenbefunden und sind **nicht am Original geprüft** (P-56, P-80, P-84).
