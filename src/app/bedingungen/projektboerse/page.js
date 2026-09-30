// src/app/bedingungen/projektboerse/page.js
//
// Besondere Bedingungen Projektbörse (Rahmen der Provisionsvereinbarung,
// Umgehungsschutz, optionale Exklusivität) – ENTWURF zur anwaltlichen
// Prüfung, noindex bis zur Freigabe (siehe ../_teile.js).
// Provisionsspanne ausschließlich aus src/lib/invest/markt.js (PROVISION).
// Offene Punkte: Doppeltätigkeit/Interessenwahrung nach MaklerG (AT) bzw.
// §§ 652 ff. BGB (DE), Entstehungszeitpunkt (Signing/Closing), Bemessungs-
// grundlage bei Share Deals (Eigenkapitalwert/EV, Earn-out), Vertragsstrafe,
// Alleinvermittlungsauftrag (§ 14 f. MaklerG), Aufsichtsrecht (siehe
// Kopfkommentar der Nutzungsbedingungen).

import LegalShell from "@/components/Reusable/LegalShell";
import { GESELLSCHAFT } from "@/data/site";
import { PROVISION } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";
import { EntwurfHinweis, Platzhalter, WeitereBedingungen, bedingungenMetadata } from "../_teile";

const PFAD = "/bedingungen/projektboerse";

export const metadata = bedingungenMetadata({
  pfad: PFAD,
  titel: "Besondere Bedingungen Projektbörse | ÖkoInvest",
  beschreibung:
    "Entwurf der Besonderen Bedingungen der Projektbörse: Rahmen der Provisionsvereinbarung, Entstehen und Fälligkeit, Umgehungsschutz und optionale Exklusivität.",
  bild: "/img/investoren-vor-ort.jpg",
  bildAlt: "Investoren bei einer Besichtigung vor Ort",
});

const G = GESELLSCHAFT;
const provVon = fmt(PROVISION.verkaeufer.min * 100, 1);
const provBis = fmt(PROVISION.verkaeufer.max * 100);

export default function BedingungenProjektboersePage() {
  return (
    <LegalShell
      titel="Besondere Bedingungen Projektbörse"
      pfad={PFAD}
      lead="Rahmen für die Provisionsvereinbarung mit Projektanbietern, den Umgehungsschutz gegenüber Anbietern und Investoren und eine optionale Exklusivität."
    >
      <EntwurfHinweis />

      <h2>§ 1 Geltung</h2>
      <p>
        (1) Diese Bedingungen gelten für Projektanbieter, die ein Projekt über die Projektbörse der {G.name} („ÖkoInvest“) anbieten, und – soweit
        sie Investoren betreffen (§ 5) – für Investoren. Sie bilden den Rahmen der <strong>Provisionsvereinbarung</strong>, die der Anbieter vor
        der Veröffentlichung eines Projekts im Portal abschließt. Die im Einzelfall vereinbarten Werte (insbesondere der Provisionssatz) gehen
        diesen Bedingungen vor.
      </p>
      <p>
        (2) Für Investoren und Flächeneigentümer ist die Nutzung der Projektbörse kostenfrei. ÖkoInvest wird im Auftrag des Anbieters tätig.{" "}
        <Platzhalter>Prüfen und ggf. regeln: Hinweis auf Tätigkeit auch im Interesse der Investoren (Doppeltätigkeit)</Platzhalter>
      </p>

      <h2>§ 2 Leistungen von ÖkoInvest</h2>
      <ul>
        <li>Prüfung des Projekts auf Plausibilität und Vollständigkeit, anonymisierter Teaser und vertrauliches Exposé,</li>
        <li>Veröffentlichung in der Projektbörse und Hinweis an Investoren mit passendem Suchprofil,</li>
        <li>Abschluss der Vertraulichkeitsvereinbarungen, Freigabe von Datenraum-Stufen, Moderation von Fragen und Antworten,</li>
        <li>auf Wunsch Durchführung eines Bieterverfahrens mit verdeckten Geboten und Unterstützung bis zum Abschluss (Closing-Raum).</li>
      </ul>
      <p>
        ÖkoInvest schuldet den Nachweis bzw. die Vermittlung von Interessenten, keinen Verkaufserfolg. Rechts-, Steuer- und technische
        Beratung sind nicht Teil der Leistung.
      </p>

      <h2>§ 3 Provision</h2>
      <p>
        (1) Kommt zwischen dem Anbieter und einem von ÖkoInvest nachgewiesenen oder vermittelten Investor ein Vertrag über das Projekt zustande,
        schuldet der Anbieter die vereinbarte Provision. Der Satz liegt je nach Projekt zwischen <strong>{provVon} und {provBis} %</strong> und
        wird bei der Freigabe des Projekts festgelegt.
      </p>
      <p>
        (2) <strong>Vertrag über das Projekt</strong> ist jeder Vertrag, durch den der Investor das Projekt ganz oder teilweise erwirbt oder
        wirtschaftlich übernimmt – insbesondere Kauf von Projektrechten oder der Anlage (Asset Deal), Erwerb von Anteilen an der
        Projektgesellschaft (Share Deal), Co-Entwicklung mit Erwerbsoption sowie gleichwertige Gestaltungen.
      </p>
      <p>
        (3) <strong>Bemessungsgrundlage</strong> ist der Kaufpreis einschließlich vom Investor übernommener oder abgelöster Verbindlichkeiten
        gegenüber dem Anbieter; beim Share Deal <Platzhalter>Eigenkapitalwert oder Unternehmenswert (EV) festlegen</Platzhalter>. Bedingte und
        gestaffelte Zahlungen (Meilensteine, Earn-out) gehören dazu, sobald sie fällig werden.
      </p>
      <p>
        (4) <strong>Entstehen und Fälligkeit:</strong> Der Anspruch entsteht mit wirksamem Abschluss des Vertrags; hängt dieser von
        aufschiebenden Bedingungen ab, mit deren Eintritt. Die Provision ist <Platzhalter>14 Tage nach Rechnung</Platzhalter> fällig, bei
        gestaffelten Kaufpreiszahlungen anteilig mit jeder Zahlung. Beträge verstehen sich zuzüglich Umsatzsteuer, soweit diese anfällt.
      </p>
      <p>
        (5) Der Anbieter teilt ÖkoInvest den Vertragsabschluss innerhalb von fünf Werktagen mit und legt die für die Berechnung erforderlichen
        Angaben (Kaufpreis, Zahlungsplan, Vollzugsbedingungen) offen.
      </p>

      <h2>§ 4 Nachweis und Vorkenntnis</h2>
      <p>
        (1) Als von ÖkoInvest nachgewiesen gilt ein Investor, dem die Projektdetails über die Plattform freigeschaltet wurden (NDA-Freigabe)
        oder der über den Deal-Room mit dem Anbieter in Kontakt gekommen ist.
      </p>
      <p>
        (2) War dem Anbieter der Investor als Interessent für genau dieses Projekt bereits bekannt, teilt er dies unter Nachweis innerhalb von{" "}
        <strong>zehn Werktagen</strong> mit, nachdem ihm der Interessent (auch pseudonym mit Kennzeichen) angezeigt wurde. Ohne rechtzeitige
        Mitteilung gilt der Nachweis durch ÖkoInvest als erbracht, soweit gesetzlich zulässig.
      </p>

      <h2>§ 5 Umgehungsschutz</h2>
      <p>
        (1) Der Provisionsanspruch besteht auch, wenn der Vertrag unter Umgehung der Plattform geschlossen wird – unmittelbar oder über
        verbundene Unternehmen, Gesellschafter, Treuhänder oder sonstige Dritte –, sofern der Investor dem Anbieter erstmals über die Plattform
        bekannt geworden ist und der Abschluss innerhalb von <strong>24 Monaten</strong> nach Freischaltung der Projektdetails erfolgt. Das gilt
        auch für Verträge über andere Projekte desselben Anbieters, die im selben Zeitraum über die Plattform nachgewiesen wurden.
      </p>
      <p>
        (2) Investoren verpflichten sich, den Anbieter bis zur Kontaktfreigabe nicht außerhalb der Plattform zu kontaktieren und über die
        Plattform erlangte Kontakte nicht zur Umgehung zu nutzen. Verletzt ein Investor diese Pflicht und entgeht ÖkoInvest dadurch die
        Provision, haftet er auf Ersatz des entgangenen Betrags.
      </p>
      <p>
        (3) Besteht ein begründeter Verdacht auf Umgehung, erteilen Anbieter und Investor auf Anfrage Auskunft über Zustandekommen und
        Bedingungen eines Vertrags über das Projekt. <Platzhalter>Vertragsstrafe ja/nein und Höhe</Platzhalter>
      </p>

      <h2>§ 6 Exklusivität (optional)</h2>
      <p>
        (1) Anbieter und ÖkoInvest können für ein Projekt eine <strong>Exklusivität</strong> vereinbaren (Alleinvermittlungsauftrag). Sie gilt nur,
        wenn sie im Portal oder schriftlich ausdrücklich vereinbart ist, für die vereinbarte Dauer von{" "}
        <Platzhalter>z. B. 6 Monaten, danach monatlich kündbar</Platzhalter>.
      </p>
      <p>
        (2) Während der Exklusivität bietet der Anbieter das Projekt nicht über andere Vermittler oder Plattformen an und leitet eigene
        Interessenten an ÖkoInvest weiter. ÖkoInvest verpflichtet sich im Gegenzug zu aktiver Vermarktung, insbesondere gezielter Ansprache
        passender Investoren und regelmäßigen Berichten über Zugriffe und Interessenten.
      </p>
      <p>
        (3) Ob und in welcher Höhe bei einem Abschluss ohne Mitwirkung von ÖkoInvest während der Exklusivität eine Provision anfällt, regelt die
        Exklusivitätsvereinbarung im Rahmen des gesetzlich Zulässigen. <Platzhalter>Regelung nach § 15 MaklerG bzw. dem anwendbaren Recht</Platzhalter>
      </p>

      <h2>§ 7 Pflichten des Anbieters</h2>
      <p>
        Es gelten die Pflichten nach § 5 der Nutzungsbedingungen (richtige und vollständige Angaben, Verfügungsbefugnis, Rechte Dritter,
        Aktualisierung). Zusätzlich hält der Anbieter den Datenraum aktuell, beantwortet moderierte Fragen fristgerecht und gibt Informationen
        allen zugelassenen Interessenten gleichermaßen.
      </p>

      <h2>§ 8 Rückzug und Beendigung</h2>
      <p>
        (1) Der Anbieter kann sein Projekt jederzeit von der Börse nehmen; ÖkoInvest kann die Veröffentlichung nach § 6 der Nutzungsbedingungen
        beenden. Laufende verbindliche Bieterrunden sind, soweit möglich, geordnet abzuschließen oder abzubrechen.
      </p>
      <p>
        (2) Ansprüche aus bereits nachgewiesenen Investoren und der Umgehungsschutz (§ 5) bestehen nach Rückzug oder Beendigung fort.
      </p>

      <h2>§ 9 Haftung</h2>
      <p>
        ÖkoInvest haftet nicht für Angaben des Anbieters oder der Investoren, für deren Bonität und Vertragstreue oder für das Zustandekommen und
        die Erfüllung von Verträgen. Im Übrigen gilt die Haftungsregelung der Nutzungsbedingungen (§ 16).
      </p>

      <WeitereBedingungen pfad={PFAD} />
    </LegalShell>
  );
}
