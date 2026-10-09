// src/app/nutzungsbedingungen/page.js
//
// Nutzungsbedingungen für Website, Portal und Projektbörse der ÖkoInvest GmbH.
//
// ENTWURF ZUR ANWALTLICHEN PRÜFUNG – der sichtbare Hinweis oben auf der Seite
// bleibt stehen, bis die Fassung freigegeben ist (ENTWURF = false setzen).
// Offene Punkte für die Prüfung:
//  - Umgehungsschutz: Dauer (hier 24 Monate) und Höhe mit der
//    Provisionsvereinbarung abstimmen (siehe /bedingungen/projektboerse).
//  - Aufsichtsrecht: Abgrenzung Vermittlung von Projektrechten/Gesellschafts-
//    anteilen gegenüber Wertpapier-/Anlagevermittlung (WAG 2018, AltFG,
//    KMG 2019; DE: KWG/WpIG, § 34c/§ 34f GewO) prüfen.
//  - Maklerrecht (MaklerG AT) und Gewerbeberechtigung prüfen; Energie-
//    beschaffung: Abgrenzung zu Energievermittlung/-beratung (Gewerbe,
//    ggf. Registrierung), Vergaberecht bei öffentlichen Auftraggebern.
//  - Geldwäsche: Verpflichtetenstellung (GwG DE, GewO/FM-GwG AT, GwG CH,
//    AMLR ab 10.07.2027) – bestimmt, ob KYC Pflicht oder Vertragsbedingung ist.
//  - Einfache elektronische Signatur: Beweiswert und Einsatzgrenzen (§ 10).
//  - Verbraucher: Mitglieder/Bürger können Verbraucher sein – Klauseln zu
//    Haftung, Änderungen und Gerichtsstand gegen KSchG/§§ 305 ff. BGB prüfen.
//  - Gerichtsstand konkret benennen.

import Link from "@/components/Land/Link";
import { AlertTriangle } from "lucide-react";
import LegalShell from "@/components/Reusable/LegalShell";
import { GESELLSCHAFT, abs } from "@/data/site";
import { PROVISION } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";
import { seitenLand, seitenMetadata, spracheDerAnfrage } from "@/lib/land/seite";
import { nutzungsbedingungenInhaltEn } from "@/components/Rechtstexte/NutzungsbedingungenEn";

const ENTWURF = true;

const PAGE_URL = abs("/nutzungsbedingungen");
const TITEL = "Nutzungsbedingungen Plattform & Projektbörse | ÖkoInvest";
const BESCHREIBUNG =
  "Nutzungsbedingungen der ÖkoInvest-Plattform: Rollen, Deal-Room, Bieterverfahren, Energiebeschaffung, Signatur, KYC, Provision nur bei Abschluss und Haftung.";

/** Datum der Fassung */
const STAND = "30. September 2026";

const metadata = {
  title: TITEL,
  description: BESCHREIBUNG,
  alternates: { canonical: PAGE_URL },
  // QM Welle 1: Rechtstext im ENTWURF (Strang R) – bis zur schriftlichen Freigabe noindex (Masterplan Abschnitt 11)
  robots: { index: false, follow: true },
  openGraph: {
    type: "website",
    locale: "de_AT",
    url: PAGE_URL,
    siteName: "ÖkoInvest",
    title: TITEL,
    description: BESCHREIBUNG,
    images: [{ url: abs("/img/investoren-vor-ort.jpg"), alt: "Investoren bei einer Besichtigung vor Ort" }],
  },
};

// Englisch (Sprachmodell): Übersetzung zur Information (src/components/Rechtstexte/NutzungsbedingungenEn.js) –
// maßgeblich ist die deutsche Fassung. ENTWURF, anwaltliche Prüfung.
const metadataEn = {
  title: "Terms of use for the platform & project exchange | ÖkoInvest",
  description: "Terms of use of the ÖkoInvest platform: roles, deal room, bidding process, energy procurement, signature, KYC, commission only on closing and liability.",
  openGraph: {
    locale: "en_GB",
    title: "Terms of use for the platform & project exchange | ÖkoInvest",
    description: "Terms of use of the ÖkoInvest platform: roles, deal room, bidding process, energy procurement, signature, KYC, commission only on closing and liability.",
    images: [{ alt: "Investors on a site visit" }],
  },
};

const G = GESELLSCHAFT;
const provVon = fmt(PROVISION.verkaeufer.min * 100, 1);
const provBis = fmt(PROVISION.verkaeufer.max * 100);

/** Besondere Bedingungen (Entwürfe, noindex bis zur Freigabe) */
const BESONDERE = [
  { href: "/bedingungen/projektboerse", titel: "Besondere Bedingungen Projektbörse", text: "Rahmen der Provisionsvereinbarung, Umgehungsschutz, optionale Exklusivität" },
  { href: "/bedingungen/energiebeschaffung", titel: "Servicevertrag Energiebeschaffung", text: "für Unternehmen, die ihren Strom über ÖkoInvest einkaufen" },
  { href: "/bedingungen/lieferanten", titel: "Teilnahmebedingungen für Energieversorger", text: "für eingeladene Versorger in Angebotsanfragen" },
  { href: "/bedingungen/banken", titel: "Vertraulichkeitsbedingungen für Banken", text: "für Banken im Bank-Portal (Bankenpaket)" },
];

export default async function NutzungsbedingungenPage({ params }) {
  await seitenLand(params);
  const en = spracheDerAnfrage() === "en";
  return (
    <LegalShell
      titel={en ? "Terms of use" : "Nutzungsbedingungen"}
      pfad="/nutzungsbedingungen"
      stand={STAND}
      lead={en ? "Rules for using the website, portal and project exchange of ÖkoInvest GmbH – for landowners, farmers, investors, project sellers, companies, municipalities and invited partners." : "Regeln für die Nutzung von Website, Portal und Projektbörse der ÖkoInvest GmbH – für Flächeneigentümer, Landwirte, Investoren, Projektanbieter, Unternehmen, Kommunen und eingeladene Partner."}
    >
      {en ? (
        nutzungsbedingungenInhaltEn({ entwurf: ENTWURF, stand: STAND })
      ) : (
        <>
      {ENTWURF && (
        <aside role="note" className="mb-10 flex gap-4 rounded-2xl bg-sun-300/20 p-5 ring-1 ring-sun-300/60 md:p-6">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sun-400 text-navy-950">
            <AlertTriangle aria-hidden="true" className="h-[18px] w-[18px]" />
          </span>
          <div>
            <p className="font-display text-[16.5px] font-bold text-ink-900">Entwurf – zur anwaltlichen Prüfung</p>
            <p className="mt-1.5 text-[15.5px] leading-relaxed text-ink-700">
              Diese Fassung ist ein Entwurf und noch nicht rechtlich freigegeben. Maßgeblich für die Projektbörse sind bis zur Freigabe die im
              Einzelfall geschlossenen Vereinbarungen (insbesondere Vertraulichkeitsvereinbarung und Provisionsvereinbarung).
            </p>
          </div>
        </aside>
      )}

      <h2>§ 1 Geltungsbereich und Anbieter</h2>
      <p>
        (1) Diese Nutzungsbedingungen gelten für die Nutzung der Website, des Portals und der Projektbörse (zusammen „Plattform“) der {G.name},{" "}
        {G.sitz}, {G.plz} {G.ort}, {G.land}, {G.register}, {G.gericht} („ÖkoInvest“, „wir“).
      </p>
      <p>
        (2) Die Plattform richtet sich in erster Linie an Unternehmer, Landwirte, Kommunen und institutionelle sowie private Investoren, die im
        Rahmen einer gewerblichen oder beruflichen Tätigkeit handeln. Abweichende Geschäftsbedingungen von Nutzern gelten nur, wenn wir ihnen
        schriftlich zustimmen.
      </p>
      <p>
        (3) Für einzelne Leistungen können gesonderte Vereinbarungen gelten, insbesondere die Vertraulichkeitsvereinbarung (NDA), die
        Provisionsvereinbarung, die Beschaffungsvollmacht und die folgenden besonderen Bedingungen. Diese gehen den Nutzungsbedingungen im
        Widerspruchsfall vor.
      </p>
      <ul>
        {BESONDERE.map((b) => (
          <li key={b.href}>
            <Link href={b.href}>{b.titel}</Link> – {b.text}
          </li>
        ))}
      </ul>

      <h2>§ 2 Leistungen der Plattform</h2>
      <p>(1) Die Plattform bietet insbesondere:</p>
      <ul>
        <li>allgemeine Informationen, Ratgeber, Lexikon, Rechner und Marktdaten,</li>
        <li>Anfragen, etwa zur Prüfung von Flächen (Flächencheck), zu Agri-PV, Reststrom, Energiegemeinschaften oder Genossenschaft,</li>
        <li>ein Portal mit rollenbezogenen Bereichen für Flächen, Projekte, Anfragen, Nachrichten, Dokumente, Termine und Support,</li>
        <li>
          die <Link href="/projektboerse">Projektbörse</Link>, in der Anbieter Photovoltaik- und Speicherprojekte in unterschiedlichen
          Entwicklungsphasen vorstellen und Investoren passende Projekte finden können, mit Deal-Room (Datenraum, Fragen und Antworten,
          Bieterverfahren) und Unterstützung beim Vertragsabschluss,
        </li>
        <li>die Einholung und Auswertung von Stromangeboten für Unternehmen (Energiebeschaffung, § 11),</li>
        <li>Werkzeuge für Bewertung und Finanzierung, einen KI-Assistenten (§ 14) und die elektronische Unterschrift (§ 10),</li>
        <li>für Contracting-Kunden die Übersicht über die Anlage vor Ort, Messwerte und Abrechnungen.</li>
      </ul>
      <p>
        (2) In der Projektbörse stellen wir den Kontakt zwischen Anbietern und Investoren her und begleiten die Anbahnung. Kauf-, Pacht- oder
        sonstige Verträge über Projekte kommen ausschließlich zwischen den jeweiligen Parteien zustande. Bietet ÖkoInvest oder eine Gesellschaft
        der ÖKOVOLT Gruppe ein eigenes Projekt an, wird dies im Exposé kenntlich gemacht.
      </p>
      <p>
        (3) Ein Anspruch auf eine bestimmte Verfügbarkeit der Plattform, auf die Veröffentlichung eines Projekts oder auf das Zustandekommen
        eines Vertrags besteht nicht. Wir dürfen Funktionen weiterentwickeln, ändern oder einstellen, soweit dies für Nutzer zumutbar ist.
      </p>

      <h2>§ 3 Registrierung und Konto</h2>
      <p>
        (1) Für das Portal und die Detailangaben der Projektbörse ist eine Registrierung erforderlich. Registrieren dürfen sich voll
        geschäftsfähige natürliche Personen sowie juristische Personen und Personengesellschaften, vertreten durch eine berechtigte Person.
      </p>
      <p>
        (2) Die Angaben bei der Registrierung müssen wahr, vollständig und aktuell sein; Änderungen sind im Profil nachzutragen. Zugangsdaten
        sind geheim zu halten und dürfen nicht an Dritte weitergegeben werden. Bei Verdacht auf Missbrauch ist uns unverzüglich Bescheid zu
        geben.
      </p>
      <p>
        (3) Ein Anspruch auf Freischaltung besteht nicht. Wir können die Registrierung insbesondere ablehnen oder ein Konto sperren, wenn Angaben
        unplausibel sind, eine Identitäts- oder Berechtigungsprüfung nicht möglich ist oder gegen diese Bedingungen verstoßen wird.
      </p>
      <p>
        (4) Für bestimmte Rollen oder Funktionen können wir eine Zwei-Faktor-Anmeldung verlangen. Persönliche Einmal-Links (z. B. Anmelde-,
        Einladungs- oder Terminlinks) sind wie Zugangsdaten zu behandeln und dürfen nicht weitergeleitet werden.
      </p>
      <p>
        (5) Nutzer können eine Organisation anlegen und weitere Personen einladen. Wer eine Organisation anlegt oder als Inhaber führt, versichert,
        sie vertreten zu dürfen, und ist dafür verantwortlich, dass nur berechtigte Personen Mitglied sind und ausgeschiedene Personen entfernt
        werden. Erklärungen, die Mitglieder im Rahmen ihrer Teamrolle über die Plattform abgeben, gelten als Erklärungen der Organisation, soweit
        die Person dazu bevollmächtigt ist.
      </p>

      <h2>§ 4 Rollen und Berechtigungen</h2>
      <p>
        (1) Nutzer registrieren sich in einer Rolle. Die Rolle bestimmt, welche Bereiche und Informationen zugänglich sind. Eine Person kann
        mehrere Rollen haben, wenn wir dies freigeben. Es gibt insbesondere folgende Rollen:
      </p>
      <ul>
        <li>
          <strong>Flächeneigentümer und Landwirte</strong> (auch Eigentümer von Dachflächen): bieten Flächen oder Dächer zur Nutzung an und
          verfolgen Prüfung, Pachtangebot, Vertrag, Grundbuch und Abrechnung.
        </li>
        <li>
          <strong>Investoren</strong>: legen Suchprofile an, erhalten nach NDA Zugang zu Exposés und Datenräumen und geben Absichtserklärungen
          und Gebote ab.
        </li>
        <li>
          <strong>Projektanbieter</strong> (Projektentwickler, Verkäufer von Projekten oder Bestandsanlagen): stellen Projekte ein, die vor
          Veröffentlichung von uns geprüft werden (§ 6).
        </li>
        <li>
          <strong>Unternehmen</strong>: stellen Anfragen zu Reststrom, Carport oder Speicher; als <strong>Contracting-Kunden</strong> beziehen
          sie Strom aus einer Anlage, die ÖkoInvest oder eine Projektgesellschaft bei ihnen betreibt; als <strong>Kunden der
          Energiebeschaffung</strong> lassen sie ihren Strom über uns einkaufen (§ 11).
        </li>
        <li>
          <strong>Mitglieder bzw. Bürger</strong>: interessieren sich für Genossenschaft und Energiegemeinschaften (§ 13).
        </li>
        <li>
          <strong>Kommunen</strong>: begleiten Projekte in ihrem Gemeindegebiet. Die Gemeinde-Sicht schalten wir erst nach Prüfung der
          Berechtigung frei; sie zeigt nur vereinfachte, nicht vertrauliche Projektangaben.
        </li>
        <li>
          <strong>Gutachter und Planer</strong> (nur auf Einladung): bearbeiten zugewiesene Aufträge in der Projektentwicklung (§ 12).
        </li>
        <li>
          <strong>Energieversorger</strong> (nur auf Einladung): geben Angebote in der Energiebeschaffung ab (§ 11 und besondere
          Teilnahmebedingungen).
        </li>
        <li>
          <strong>Banken</strong> (nur auf Einladung): prüfen Finanzierungsanfragen für eigene Projekte von ÖkoInvest bzw. deren
          Projektgesellschaften (§ 12 und besondere Vertraulichkeitsbedingungen).
        </li>
      </ul>
      <p>
        (2) Rollen, die nur auf Einladung vergeben werden, gelten ausschließlich für den Auftrag, die Ausschreibung bzw. die Finanzierungsanfrage,
        zu der eingeladen wurde. Wir können Rollen und Berechtigungen anpassen oder entziehen, wenn dies zur Sicherheit oder Vertraulichkeit
        erforderlich ist oder der Anlass entfallen ist.
      </p>

      <h2>§ 5 Pflichten der Projektanbieter</h2>
      <p>(1) Wer ein Projekt einstellt, sichert zu, dass</p>
      <ul>
        <li>
          alle Angaben und Unterlagen nach bestem Wissen <strong>richtig, vollständig und aktuell</strong> sind und wesentliche Risiken (z. B.
          fehlende Zusagen, Fristen, Einwendungen, Belastungen) nicht verschwiegen werden,
        </li>
        <li>
          er über das Projekt <strong>verfügungsbefugt</strong> ist oder vom Berechtigten zur Vermarktung beauftragt wurde, die erforderlichen
          Rechte (z. B. Flächensicherung, Netzanschlusszusage, Planungsrechte) im angegebenen Umfang bestehen und die Vermarktung keine Rechte
          Dritter oder vertraglichen Beschränkungen verletzt,
        </li>
        <li>
          er zum Einstellen personenbezogener Daten Dritter (etwa von Grundstückseigentümern) berechtigt ist und solche Daten, soweit möglich,
          schwärzt oder anonymisiert,
        </li>
        <li>er Änderungen, die den Wert oder die Umsetzbarkeit des Projekts beeinflussen, unverzüglich im Portal nachträgt oder uns mitteilt,</li>
        <li>
          er Fragen im Deal-Room innerhalb der gesetzten Frist sachlich und vollständig beantwortet und Antworten, die für alle Interessenten
          bestimmt sind, nicht nur einzelnen Investoren gibt.
        </li>
      </ul>
      <p>
        (2) Angaben zur Wirtschaftlichkeit (z. B. Rendite, Ertrag) sind Anbieterangaben und werden als solche gekennzeichnet. Der Anbieter stellt
        ÖkoInvest von Ansprüchen Dritter frei, die auf unrichtigen Angaben oder fehlenden Rechten des Anbieters beruhen, einschließlich
        angemessener Kosten der Rechtsverteidigung, soweit er die Pflichtverletzung zu vertreten hat.
      </p>

      <h2>§ 6 Prüfung und Freigabe durch ÖkoInvest</h2>
      <p>
        (1) Eingestellte Projekte prüfen wir vor Veröffentlichung auf <strong>Plausibilität und Vollständigkeit</strong>. Wir können Rückfragen
        stellen, Unterlagen anfordern, Angaben für den öffentlichen Teaser anonymisieren und die Veröffentlichung ohne Angabe von Gründen
        ablehnen oder beenden.
      </p>
      <p>
        (2) Die Prüfung ersetzt keine Due Diligence. Wir übernehmen keine Gewähr dafür, dass Projektangaben zutreffen, Genehmigungen erteilt
        werden, Netzanschlüsse zustande kommen oder Projekte wirtschaftlich erfolgreich sind. Investoren prüfen jedes Projekt eigenverantwortlich
        und mit eigenen Beratern.
      </p>

      <h2>§ 7 Vertraulichkeit und NDA</h2>
      <p>
        (1) Öffentlich sichtbar sind nur anonymisierte Exposé-Teaser. Detailangaben, Standort und Unterlagen im Datenraum werden erst nach
        Anmeldung und Abschluss einer Vertraulichkeitsvereinbarung (NDA) für das jeweilige Projekt freigeschaltet. Der Abschluss wird mit
        Zeitstempel und IP-Adresse protokolliert (siehe <Link href="/datenschutz">Datenschutzerklärung</Link>).
      </p>
      <p>
        (2) Vertrauliche Informationen dürfen ausschließlich zur Prüfung des jeweiligen Projekts verwendet und nur an eigene Organe, Mitarbeitende
        und zur Verschwiegenheit verpflichtete Berater und Finanzierer weitergegeben werden, soweit diese sie benötigen. Das Kopieren,
        Weiterleiten oder automatisierte Auslesen von Datenraum-Inhalten zu anderen Zwecken ist untersagt.
      </p>
      <p>(3) Die Pflichten aus einem NDA gelten auch nach Beendigung der Nutzung fort, für die dort vereinbarte Dauer.</p>

      <h2>§ 8 Deal-Room: Anonymität, Fragen und Antworten, Datenraum, Bieterverfahren</h2>
      <p>
        (1) <strong>Anonymität und Umgehungsverbot.</strong> Bis zur Kontaktfreigabe durch ÖkoInvest erscheinen Investoren gegenüber dem Anbieter
        nur unter einem Pseudonym und der Anbieter gegenüber Investoren nur als „Anbieter“. Es ist untersagt, die Identität der Gegenseite
        gezielt zu ermitteln, sie außerhalb der Plattform zu kontaktieren oder Kontaktdaten, Links oder Hinweise zur Identität in Fragen,
        Antworten, Dokumente oder Gebote aufzunehmen. Wir entfernen solche Angaben und können den Zugang bei Verstößen sperren. Der
        Umgehungsschutz nach § 17 Abs. 4 bleibt unberührt.
      </p>
      <p>
        (2) <strong>Fragen und Antworten.</strong> Fragen werden vor der Weitergabe an den Anbieter von uns moderiert; wir können sie
        zusammenfassen, zurückweisen oder Fristen für die Antwort setzen. Antworten prüfen wir vor der Veröffentlichung. Antworten, die für alle
        freigegeben sind, sehen alle Interessenten mit Datenraum-Zugang, ohne dass der Fragende genannt wird. Ein Anspruch auf Beantwortung
        besteht nicht.
      </p>
      <p>
        (3) <strong>Datenraum-Stufen.</strong> Unterlagen sind in Stufen freigegeben: Die erste Stufe steht nach NDA-Freigabe offen, die zweite
        in der Regel erst nach einer Absichtserklärung (LOI) oder der Zulassung zu einer verbindlichen Angebotsrunde. Welche Unterlage in welche
        Stufe gehört, bestimmt der Anbieter in Abstimmung mit uns.
      </p>
      <p>
        (4) <strong>Kennzeichnung und Protokoll.</strong> Vertrauliche Exposés und Downloads tragen den Namen des Empfängers und das Datum. Jeder
        Abruf wird protokolliert; der Anbieter sieht das Protokoll in pseudonymisierter Form. Das Entfernen oder Unkenntlichmachen der
        Kennzeichnung ist untersagt.
      </p>
      <p>
        (5) <strong>Bieterverfahren.</strong> Führen wir für ein Projekt ein Bieterverfahren durch, gelten die vorab mitgeteilten Regeln (Runden,
        Fristen, Pflichtangaben). Gebote sind <strong>verdeckt</strong>: Kein Bieter erfährt Gebote, Namen oder die Anzahl anderer Bieter; der
        Anbieter erhält die Übersicht erst nach unserer Freigabe und pseudonymisiert. Je Runde gilt das zuletzt abgegebene Gebot; nach
        Fristablauf sind Gebote gesperrt. Indikative Gebote sind unverbindlich; verbindliche Gebote binden den Bieter bis zum angegebenen
        Datum, soweit nicht anders vereinbart, und verlangen Angaben zu Finanzierung und Zeitplan.
      </p>
      <p>
        (6) Der Anbieter ist frei, einen Zuschlag zu erteilen oder das Verfahren ohne Zuschlag zu beenden. Ein <strong>Anspruch auf Zuschlag</strong>{" "}
        oder auf Abschluss eines Kaufvertrags besteht nicht. Ein Zuschlag reserviert das Projekt; der Kaufvertrag kommt erst mit Unterzeichnung
        in der gesetzlich vorgeschriebenen Form zustande (z. B. notarielle Beurkundung beim Anteilskauf).
      </p>

      <h2>§ 9 Identitätsprüfung (KYC/KYB) und Bonitätsprüfung</h2>
      <p>
        (1) Bestimmte Schritte – insbesondere Datenraum-Zugang, Absichtserklärungen und Gebote, Veröffentlichung von Projekten, Zuschläge,
        Vertragsabschluss, Auszahlungen und Contracting-Verträge – geben wir erst nach einer erfolgreichen Identitäts- bzw. Firmenprüfung frei.
        Nutzer verpflichten sich, dabei <strong>wahrheitsgemäß und vollständig mitzuwirken</strong>: gültige Ausweis- und Registerunterlagen
        vorzulegen, wirtschaftlich Berechtigte und Vertreter offenzulegen, Fragen zur Herkunft der Mittel zu beantworten und Änderungen (z. B.
        Gesellschafterwechsel, Ablauf des Ausweises) unverzüglich mitzuteilen. Wir können die Prüfung in angemessenen Abständen wiederholen.
      </p>
      <p>
        (2) Vor einer Absichtserklärung, einem verbindlichen Gebot oder einem Vertrag mit finanziellem Risiko können wir eine Bonitätsauskunft
        einholen; wir informieren vorher darüber. Die Entscheidung trifft ein Mitarbeitender; Nutzer können ihren Standpunkt darlegen und
        Unterlagen (z. B. Finanzierungsbestätigung) nachreichen.
      </p>
      <p>
        (3) Werden Angaben nicht gemacht, bestehen Treffer in Sanktionslisten, die nicht ausgeräumt werden können, oder ergeben sich Hinweise auf
        Geldwäsche oder Betrug, können wir die betroffenen Schritte verweigern, das Konto sperren und – soweit gesetzlich vorgeschrieben –
        Behörden informieren. Ein Anspruch auf Freigabe besteht nicht.
      </p>

      <h2>§ 10 Elektronische Unterschrift</h2>
      <p>
        (1) Dokumente können im Portal elektronisch unterschrieben werden. Es handelt sich um eine <strong>einfache elektronische Signatur</strong>{" "}
        im Sinne von Art. 3 Nr. 10 der eIDAS-Verordnung – ausdrücklich keine fortgeschrittene oder qualifizierte elektronische Signatur. Die
        Unterschrift wird mit einem Bestätigungscode per E-Mail, Zeitpunkt, IP-Adresse, Browser und Prüfsummen des Dokuments protokolliert; das
        signierte Dokument erhält eine Prüfseite.
      </p>
      <p>
        (2) Nutzer erklären sich damit einverstanden, dass Erklärungen, die sie auf diesem Weg abgeben, zwischen ihnen und ÖkoInvest bzw. den
        beteiligten Vertragsparteien als von ihnen abgegeben gelten, sofern nicht nachgewiesen wird, dass ein Unbefugter gehandelt hat. Sie
        unterschreiben nur für sich selbst oder im Rahmen einer bestehenden Vertretungsmacht.
      </p>
      <p>
        (3) <strong>Formvorschriften bleiben unberührt.</strong> Die einfache elektronische Signatur ersetzt weder die gesetzliche Schriftform noch
        eine Beglaubigung oder notarielle Beurkundung (z. B. Grundbucherklärungen, Abtretung von GmbH-Anteilen, Grundstückskaufverträge). Für
        solche Erklärungen dient das Portal nur der Vorbereitung.
      </p>

      <h2>§ 11 Energiebeschaffung und Angebotsanfragen unter Energieversorgern</h2>
      <p>
        (1) Unternehmen können ÖkoInvest beauftragen, Angebote von Energieversorgern für ihre Stromlieferung einzuholen, auch gebündelt mit anderen
        Kunden. Voraussetzung sind eine gültige Beschaffungsvollmacht und der Servicevertrag (siehe{" "}
        <Link href="/bedingungen/energiebeschaffung">Servicevertrag Energiebeschaffung</Link>). Kunden sind für die Richtigkeit ihrer Angaben
        (Abnahmestellen, Verbrauch, Lastgang, laufende Verträge und Kündigungsfristen) verantwortlich.
      </p>
      <p>
        (2) <strong>Teilnahme.</strong> An Angebotsanfragen nehmen nur Energieversorger teil, die wir einladen. Alle eingeladenen Versorger erhalten
        dieselben Unterlagen und Fristen; Antworten auf Fragen gehen anonymisiert an alle. Die Verbrauchsdaten sind anonymisiert und dürfen nur
        für das jeweilige Angebot genutzt werden.
      </p>
      <p>
        (3) <strong>Bindefrist.</strong> Angebote sind bis zu der im Angebot angegebenen Bindefrist verbindlich. Nach Ablauf der Angebotsfrist sind
        Angebote gesperrt; maßgeblich ist das zuletzt abgegebene Angebot je Runde.
      </p>
      <p>
        (4) <strong>Vertraulichkeit.</strong> Angebote sind verdeckt; kein Versorger erfährt Preise oder Namen anderer Versorger. In Folgerunden
        teilen wir höchstens die vorab angekündigte Information mit (z. B. Rang oder Abstand zum besten Angebot, nie Namen).
      </p>
      <p>
        (5) <strong>Kein Anspruch auf Zuschlag.</strong> Der Zuschlag erfolgt erst nach ausdrücklicher Freigabe durch den Kunden im Portal. Der
        Kunde ist frei, kein Angebot anzunehmen. Der Liefervertrag kommt ausschließlich zwischen Kunde und Versorger zustande; ÖkoInvest wird
        nicht Vertragspartei der Stromlieferung.
      </p>
      <p>
        (6) Öffentliche Auftraggeber unterliegen dem Vergaberecht. Die Angebotsanfrage ersetzt kein förmliches Vergabeverfahren; Kommunen nutzen
        sie nur zur Markterkundung oder zusammen mit einem Vergabeverfahren.
      </p>

      <h2>§ 12 Pflichten von Gutachtern, Planern und Banken</h2>
      <p>
        (1) <strong>Gutachter und Planer</strong> erhalten Zugang nur zu den ihnen zugewiesenen Aufträgen. Sie behandeln alle Projekt- und
        Eigentümerdaten vertraulich, nutzen sie nur für den Auftrag, geben sie nicht an Dritte weiter (ausgenommen zur Verschwiegenheit
        verpflichtete Hilfspersonen) und löschen oder übergeben sie nach Abschluss nach Weisung. Sie erbringen ihre Leistungen fachlich
        unabhängig und nach den anerkannten Regeln ihres Fachs; Inhalt, Vergütung und Haftung richten sich nach dem jeweiligen Auftrag.
        Qualifikationsnachweise sind auf Anfrage vorzulegen.
      </p>
      <p>
        (2) <strong>Banken</strong> sehen im Bank-Portal nur die Anfragen ihres Hauses und nur freigegebene Unterlagen. Sie behandeln das
        Bankenpaket als vertraulich, nutzen es ausschließlich für die Prüfung und Durchführung der jeweiligen Finanzierung und geben es nur an
        Organe, Mitarbeitende, Gremien, Aufsichtsbehörden sowie zur Verschwiegenheit verpflichtete Berater, Gutachter und Refinanzierer weiter.
        Einzelheiten regeln die <Link href="/bedingungen/banken">Vertraulichkeitsbedingungen für Banken</Link>. Das Bankgeheimnis und
        weitergehende Vereinbarungen bleiben unberührt.
      </p>
      <p>
        (3) <strong>Kommunen</strong> verwenden Informationen aus der Gemeinde-Sicht für ihre Aufgaben in Bauleitplanung und Beteiligung. Nicht
        öffentliche Projektangaben geben sie nur weiter, soweit sie gesetzlich dazu verpflichtet sind.
      </p>

      <h2>§ 13 Contracting-Kunden, Mitglieder und Energiegemeinschaften</h2>
      <p>
        (1) Contracting-Kunden sehen im Portal Messwerte und Abrechnungen der Anlage, die ÖkoInvest bzw. eine Projektgesellschaft bei ihnen
        betreibt. Die Anlage bleibt im Eigentum des Betreibers. Maßgeblich für die Abrechnung sind ausschließlich die Werte der geeichten Zähler;
        Monitoring-Werte dienen der Information. Rechte und Pflichten ergeben sich aus dem Contracting-Vertrag.
      </p>
      <p>
        (2) Die Genossenschaft ist im Aufbau. Vormerkungen und Interessensbekundungen im Portal sind unverbindlich und keine Zeichnung von
        Anteilen. Über die Plattform werden keine Genossenschaftsanteile oder Beteiligungen öffentlich angeboten; eine Beitrittserklärung erfolgt
        erst nach Gründung und auf Grundlage der dann geltenden Satzung. Für Energiegemeinschaften gelten die Bedingungen der jeweiligen
        Gemeinschaft.
      </p>

      <h2>§ 14 KI-Assistent</h2>
      <p>
        (1) Der optionale Assistent erstellt <strong>Entwürfe und Zusammenfassungen</strong> (z. B. Exposé-Texte, Antworten zu freigegebenen
        Unterlagen, Nachrichtenentwürfe). Ergebnisse können unvollständig oder falsch sein. Sie sind vor jeder Verwendung zu prüfen; übernommen,
        gespeichert oder versendet wird nur, was der Nutzer selbst bestätigt.
      </p>
      <p>
        (2) Der Assistent erbringt <strong>keine Rechts-, Steuer-, Anlage- oder technische Beratung</strong> und ersetzt keine Prüfung von
        Unterlagen durch Fachleute. Antworten beziehen sich nur auf die Daten, die dem Nutzer freigegeben sind. Für Nachfragen zum Projekt ist
        der Weg über Fragen und Antworten bzw. Nachrichten maßgeblich. Wir können die Nutzung begrenzen oder den KI-Modus abschalten.
      </p>

      <h2>§ 15 Keine Anlageberatung, Rechner und Bewertungen</h2>
      <p>
        (1) Inhalte der Plattform – einschließlich Ratgeber, Rechner, Marktdaten, Projektbewertungen und Exposés – dienen der allgemeinen
        Information. Sie stellen <strong>keine Anlage-, Rechts- oder Steuerberatung</strong> und keine Empfehlung zum Erwerb eines bestimmten
        Projekts dar.
      </p>
      <p>
        (2) Über die Plattform werden keine Finanzinstrumente, Vermögensanlagen oder Wertpapiere öffentlich angeboten. Rechenergebnisse beruhen auf
        vereinfachten Annahmen mit dem angegebenen Stand und sind keine Zusicherung künftiger Erträge. Investitionen in Energieprojekte sind mit
        Risiken bis hin zum Totalverlust des eingesetzten Kapitals verbunden.
      </p>
      <p>
        (3) Rechner, Bewertungswerkzeug, Finanzierungscockpit, Förder-Check, Flächenbewertung, Pachtangebot-Check, Due-Diligence-Index,
        Wechselanalyse und Netzanschluss-Schätzungen liefern eine <strong>Orientierung</strong>. Sie ersetzen weder die Prüfung durch eigene
        Berater noch verbindliche Auskünfte von Netzbetreibern, Behörden, Förderstellen oder Banken. Steuerliche Aussagen sind Näherungen und
        mit einer Steuerberatung zu prüfen. Förderhinweise sind keine Zusage.
      </p>

      <h2>§ 16 Haftung</h2>
      <p>
        (1) Für Angaben, Unterlagen und Erklärungen Dritter, insbesondere der Projektanbieter, Gutachter, Energieversorger und Banken, haften wir
        nicht. Wir machen uns solche Angaben nicht zu eigen.
      </p>
      <p>
        (2) Im Übrigen haften wir nur für Schäden, die wir vorsätzlich oder grob fahrlässig verursacht haben. Diese Beschränkung gilt nicht für
        Personenschäden, für die Verletzung wesentlicher Vertragspflichten im Rahmen des vorhersehbaren, typischen Schadens sowie, soweit
        zwingendes Recht (etwa zugunsten von Verbrauchern) eine weitergehende Haftung vorsieht.
      </p>
      <p>
        (3) Für Unterbrechungen der Verfügbarkeit, Datenverluste durch höhere Gewalt oder Handlungen Dritter haften wir nicht. Für Entscheidungen,
        die Nutzer auf Grundlage von Rechenergebnissen, Bewertungen oder Entwürfen des KI-Assistenten treffen (§§ 14, 15), haften wir nur nach
        Absatz 2.
      </p>

      <h2>§ 17 Provision</h2>
      <p>
        (1) Die Nutzung der Plattform ist für <strong>Investoren und Flächeneigentümer kostenfrei</strong>.
      </p>
      <p>
        (2) Kommt zwischen einem Projektanbieter und einem über die Plattform vermittelten oder nachgewiesenen Investor ein Vertrag über das
        Projekt zustande (etwa Kauf von Projektrechten, Anteilen an einer Projektgesellschaft oder der Anlage), schuldet der Anbieter eine{" "}
        <strong>
          Verkäuferprovision von {provVon} bis {provBis} % des Kaufpreises
        </strong>
        . Die Provision fällt <strong>nur bei Abschluss</strong> an; ohne Abschluss entstehen dem Anbieter keine Kosten.
      </p>
      <p>
        (3) Höhe, Bemessungsgrundlage, Fälligkeit (z. B. bei gestaffelten Kaufpreis- oder Meilensteinzahlungen) und alle weiteren Einzelheiten
        regelt eine <strong>gesonderte Provisionsvereinbarung</strong>, die vor Veröffentlichung eines Projekts abgeschlossen wird (Rahmen:{" "}
        <Link href="/bedingungen/projektboerse">Besondere Bedingungen Projektbörse</Link>). Leistungen in der Energiebeschaffung werden nach dem
        dortigen Servicevertrag vergütet.
      </p>
      <p>
        (4) <strong>Umgehungsschutz:</strong> Der Provisionsanspruch besteht auch, wenn der Vertrag unter Umgehung der Plattform unmittelbar oder
        über verbundene Unternehmen, Treuhänder oder sonstige Dritte geschlossen wird, sofern der Investor dem Anbieter erstmals über die
        Plattform bekannt geworden ist und der Abschluss innerhalb von 24 Monaten nach Freischaltung der Projektdetails erfolgt. Investoren
        verpflichten sich, über die Plattform erlangte Kontakte nicht zur Umgehung zu nutzen. Näheres regelt die Provisionsvereinbarung.
      </p>

      <h2>§ 18 Inhalte der Nutzer</h2>
      <p>
        (1) Nutzer bleiben Inhaber der Rechte an ihren Inhalten. Sie räumen uns das einfache, auf die Dauer der Veröffentlichung beschränkte
        Recht ein, diese Inhalte zum Zweck der Plattform zu speichern, aufzubereiten (z. B. anonymisierte Teaser) und berechtigten Nutzern
        zugänglich zu machen.
      </p>
      <p>
        (2) Unzulässig sind insbesondere falsche Identitätsangaben, rechtswidrige oder irreführende Inhalte, Schadsoftware, das automatisierte
        Auslesen der Plattform (Scraping) und Versuche, Sicherheitsmechanismen zu umgehen.
      </p>

      <h2>§ 19 Laufzeit und Kündigung</h2>
      <p>
        (1) Der Nutzungsvertrag läuft auf unbestimmte Zeit. Nutzer können ihr Konto jederzeit ohne Frist kündigen, etwa über das Profil im
        Portal oder das <Link href="/kontakt">Kontaktformular</Link>. Wir können mit einer Frist von vier Wochen kündigen.
      </p>
      <p>
        (2) Das Recht zur Kündigung aus wichtigem Grund bleibt unberührt, insbesondere bei schwerwiegenden oder wiederholten Verstößen gegen
        diese Bedingungen, ein NDA, das Umgehungsverbot oder die Mitwirkungspflichten nach § 9.
      </p>
      <p>
        (3) Vertraulichkeitspflichten, entstandene Provisionsansprüche, verbindliche Gebote und Angebote bis zum Ablauf ihrer Bindefrist und der
        Umgehungsschutz bestehen nach Beendigung fort. Gespeicherte Daten werden nach Maßgabe der{" "}
        <Link href="/datenschutz">Datenschutzerklärung</Link> gelöscht.
      </p>

      <h2>§ 20 Änderungen dieser Bedingungen</h2>
      <p>
        Wir können diese Bedingungen mit Wirkung für die Zukunft ändern, wenn dies aus rechtlichen, technischen oder geschäftlichen Gründen
        erforderlich ist. Registrierte Nutzer informieren wir mindestens vier Wochen vor Inkrafttreten. Widersprechen sie nicht bis zum
        Inkrafttreten, gelten die Änderungen als angenommen; auf diese Folge weisen wir in der Mitteilung hin. Im Fall des Widerspruchs kann
        jede Seite den Nutzungsvertrag kündigen.
      </p>

      <h2>§ 21 Anwendbares Recht und Gerichtsstand</h2>
      <p>
        (1) Es gilt <strong>österreichisches Recht</strong> unter Ausschluss der Verweisungsnormen des internationalen Privatrechts und des
        UN-Kaufrechts. Gegenüber Verbrauchern gilt diese Rechtswahl nur, soweit dadurch nicht der Schutz zwingender Bestimmungen des Staates
        entzogen wird, in dem sie ihren gewöhnlichen Aufenthalt haben.
      </p>
      <p>
        (2) Ausschließlicher Gerichtsstand für Streitigkeiten mit Unternehmern ist das für den Sitz der {G.name} in {G.ort} sachlich zuständige
        Gericht. Für Verbraucher gelten die gesetzlichen Gerichtsstände.
      </p>

      <h2>§ 22 Schlussbestimmungen</h2>
      <p>
        Sollte eine Bestimmung unwirksam sein oder werden, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt. Gegenüber Unternehmern
        tritt an ihre Stelle eine wirksame Regelung, die dem wirtschaftlichen Zweck möglichst nahekommt.
      </p>
      <p>Stand: {STAND}.</p>
        </>
      )}
    </LegalShell>
  );
}

export const generateMetadata = seitenMetadata("/nutzungsbedingungen", metadata, { en: metadataEn });
