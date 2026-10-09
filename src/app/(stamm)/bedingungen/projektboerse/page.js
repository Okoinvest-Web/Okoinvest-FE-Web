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
import { EntwurfHinweis, Platzhalter, WeitereBedingungen, bedingungenMetadata, bedingungenMetadataEn, STAND_BEDINGUNGEN } from "../_teile";
import { seitenLand, seitenMetadata, spracheDerAnfrage } from "@/lib/land/seite";
import { fmtZahl } from "@/lib/sprache/format";

const PFAD = "/bedingungen/projektboerse";

const metadata = bedingungenMetadata({
  pfad: PFAD,
  titel: "Besondere Bedingungen Projektbörse | ÖkoInvest",
  beschreibung:
    "Entwurf der Besonderen Bedingungen der Projektbörse: Rahmen der Provisionsvereinbarung, Entstehen und Fälligkeit, Umgehungsschutz und optionale Exklusivität.",
  bild: "/img/investoren-vor-ort.jpg",
  bildAlt: "Investoren bei einer Besichtigung vor Ort",
});

// Englisch (Sprachmodell): Übersetzung zur Information – maßgeblich ist die deutsche Fassung. ENTWURF.
const metadataEn = bedingungenMetadataEn({
  titel: "Special terms for the project exchange | ÖkoInvest",
  beschreibung: "Draft of the special terms for the project exchange: framework of the commission agreement, accrual and due date, protection against circumvention and optional exclusivity.",
  bildAlt: "Investors on a site visit",
});

const G = GESELLSCHAFT;
const provVon = fmt(PROVISION.verkaeufer.min * 100, 1);
const provBis = fmt(PROVISION.verkaeufer.max * 100);
const provVonEn = fmtZahl(PROVISION.verkaeufer.min * 100, 1, "en");
const provBisEn = fmtZahl(PROVISION.verkaeufer.max * 100, 0, "en");

export default async function BedingungenProjektboersePage({ params }) {
  await seitenLand(params);
  const en = spracheDerAnfrage() === "en";
  return (
    <LegalShell
      titel={en ? "Special terms for the project exchange" : "Besondere Bedingungen Projektbörse"}
      pfad={PFAD}
      stand={STAND_BEDINGUNGEN}
      lead={en ? "Framework for the commission agreement with project sellers, protection against circumvention vis-à-vis sellers and investors, and optional exclusivity." : "Rahmen für die Provisionsvereinbarung mit Projektanbietern, den Umgehungsschutz gegenüber Anbietern und Investoren und eine optionale Exklusivität."}
    >
      <EntwurfHinweis />
      {en ? (
        <>
      <h2>§ 1 Scope</h2>
      <p>
        (1) These terms apply to project sellers who offer a project via the project exchange of {G.name} (“ÖkoInvest”) and – insofar as they concern
        investors (§ 5) – to investors. They form the framework of the <strong>commission agreement</strong> that the seller concludes in the portal before a
        project is published. The values agreed in the individual case (in particular the commission rate) take precedence over these terms.
      </p>
      <p>
        (2) Use of the project exchange is free of charge for investors and landowners. ÖkoInvest acts on behalf of the seller.{" "}
        <Platzhalter>to be checked and regulated if necessary: notice of activity also in the interest of investors (dual capacity)</Platzhalter>
      </p>

      <h2>§ 2 Services of ÖkoInvest</h2>
      <ul>
        <li>review of the project for plausibility and completeness, anonymised teaser and confidential exposé,</li>
        <li>publication on the project exchange and notification of investors with a matching search profile,</li>
        <li>conclusion of non-disclosure agreements, release of data room stages, moderation of questions and answers,</li>
        <li>on request, conduct of a bidding process with sealed bids and support through to completion (closing room).</li>
      </ul>
      <p>
        ÖkoInvest owes the referral or brokerage of interested parties, not a successful sale. Legal, tax and technical advice are not part of the
        service.
      </p>

      <h2>§ 3 Commission</h2>
      <p>
        (1) If a contract relating to the project is concluded between the seller and an investor referred or introduced by ÖkoInvest, the seller owes the
        agreed commission. Depending on the project, the rate is between <strong>{provVonEn} and {provBisEn} %</strong> and is set when the project is
        released.
      </p>
      <p>
        (2) A <strong>contract relating to the project</strong> is any contract by which the investor acquires or economically takes over all or part of the
        project – in particular the purchase of project rights or the plant (asset deal), the acquisition of shares in the project company (share deal),
        co-development with a purchase option and equivalent arrangements.
      </p>
      <p>
        (3) The <strong>basis of assessment</strong> is the purchase price, including liabilities to the seller assumed or redeemed by the investor; in a
        share deal <Platzhalter>define equity value or enterprise value (EV)</Platzhalter>. Conditional and staggered payments (milestones, earn-out) are
        included as soon as they fall due.
      </p>
      <p>
        (4) <strong>Accrual and due date:</strong> the claim arises when the contract is validly concluded; if it is subject to conditions precedent, when
        these are fulfilled. The commission is due <Platzhalter>14 days after invoice</Platzhalter>, and in the case of staggered purchase price payments
        pro rata with each payment. Amounts are subject to VAT where applicable.
      </p>
      <p>
        (5) The seller notifies ÖkoInvest of the conclusion of the contract within five working days and discloses the information required for the
        calculation (purchase price, payment schedule, completion conditions).
      </p>

      <h2>§ 4 Referral and prior knowledge</h2>
      <p>
        (1) An investor is deemed to have been referred by ÖkoInvest if the project details were unlocked for them via the platform (NDA approval) or if
        they came into contact with the seller via the deal room.
      </p>
      <p>
        (2) If the investor was already known to the seller as an interested party for exactly this project, the seller must notify this, with evidence,
        within <strong>ten working days</strong> of the interested party being displayed to them (including pseudonymously with an identifier). Without
        timely notification, the referral by ÖkoInvest is deemed to have been made, insofar as permitted by law.
      </p>

      <h2>§ 5 Protection against circumvention</h2>
      <p>
        (1) The entitlement to commission also exists if the contract is concluded circumventing the platform – directly or via affiliated companies,
        shareholders, trustees or other third parties – provided that the investor first became known to the seller via the platform and the contract is
        concluded within <strong>24 months</strong> of the project details being unlocked. This also applies to contracts for other projects of the same
        seller that were referred via the platform in the same period.
      </p>
      <p>
        (2) Investors undertake not to contact the seller outside the platform until contact has been released and not to use contacts obtained via the
        platform for circumvention. If an investor breaches this obligation and ÖkoInvest loses the commission as a result, the investor is liable to
        compensate the amount lost.
      </p>
      <p>
        (3) If there is a well-founded suspicion of circumvention, the seller and investor will provide information on request about how a contract
        relating to the project came about and its terms. <Platzhalter>contractual penalty yes/no and amount</Platzhalter>
      </p>

      <h2>§ 6 Exclusivity (optional)</h2>
      <p>
        (1) The seller and ÖkoInvest may agree <strong>exclusivity</strong> for a project (sole brokerage mandate). It only applies if expressly agreed in
        the portal or in writing, for the agreed period of <Platzhalter>e.g. 6 months, thereafter terminable monthly</Platzhalter>.
      </p>
      <p>
        (2) During the exclusivity period, the seller does not offer the project via other brokers or platforms and forwards its own interested parties to
        ÖkoInvest. In return, ÖkoInvest undertakes to market the project actively, in particular by approaching suitable investors in a targeted manner
        and reporting regularly on access and interested parties.
      </p>
      <p>
        (3) Whether, and in what amount, a commission is payable if a contract is concluded during the exclusivity period without ÖkoInvest&apos;s
        involvement is governed by the exclusivity agreement within the limits permitted by law.{" "}
        <Platzhalter>provision under § 15 of the Austrian Brokers Act (MaklerG) or the applicable law</Platzhalter>
      </p>

      <h2>§ 7 Obligations of the seller</h2>
      <p>
        The obligations under § 5 of the terms of use apply (correct and complete information, power of disposal, rights of third parties, updating). In
        addition, the seller keeps the data room up to date, answers moderated questions on time and provides information equally to all admitted
        interested parties.
      </p>

      <h2>§ 8 Withdrawal and termination</h2>
      <p>
        (1) The seller can take its project off the exchange at any time; ÖkoInvest can end publication in accordance with § 6 of the terms of use. Ongoing
        binding bidding rounds must, as far as possible, be completed or cancelled in an orderly manner.
      </p>
      <p>
        (2) Claims relating to investors already referred and the protection against circumvention (§ 5) continue to apply after withdrawal or termination.
      </p>

      <h2>§ 9 Liability</h2>
      <p>
        ÖkoInvest is not liable for information provided by the seller or investors, for their creditworthiness and contractual compliance or for the
        conclusion and performance of contracts. Otherwise, the liability provisions of the terms of use (§ 16) apply.
      </p>
        </>
      ) : (
        <>

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

        </>
      )}

      <WeitereBedingungen pfad={PFAD} />
    </LegalShell>
  );
}

export const generateMetadata = seitenMetadata("/bedingungen/projektboerse", metadata, { en: metadataEn });
