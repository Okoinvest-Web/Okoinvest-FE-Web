// src/app/nutzungsbedingungen/page.js
//
// Nutzungsbedingungen für Website, Portal und Projektbörse der ÖkoInvest GmbH.
//
// ENTWURF ZUR ANWALTLICHEN PRÜFUNG – der sichtbare Hinweis oben auf der Seite
// bleibt stehen, bis die Fassung freigegeben ist (ENTWURF = false setzen).
// Offene Punkte für die Prüfung:
//  - Umgehungsschutz: Dauer (hier 24 Monate) und Höhe mit der
//    Provisionsvereinbarung abstimmen.
//  - Aufsichtsrecht: Abgrenzung Vermittlung von Projektrechten/Gesellschafts-
//    anteilen gegenüber Wertpapier-/Anlagevermittlung (WAG 2018, AltFG,
//    KMG 2019; DE: KWG/WpIG, § 34c/§ 34f GewO) prüfen.
//  - Maklerrecht (MaklerG AT) und Gewerbeberechtigung prüfen.
//  - Gerichtsstand konkret benennen.

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import LegalShell from "@/components/Reusable/LegalShell";
import { GESELLSCHAFT, abs } from "@/data/site";
import { PROVISION } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";

const ENTWURF = true;

const PAGE_URL = abs("/nutzungsbedingungen");
const TITEL = "Nutzungsbedingungen Plattform & Projektbörse | ÖkoInvest";
const BESCHREIBUNG =
  "Nutzungsbedingungen der ÖkoInvest-Plattform: Registrierung, Rollen, Pflichten der Projektanbieter, NDA, Provision nur bei Abschluss, Haftung und anwendbares Recht.";

/** Datum der Fassung */
const STAND = "29. September 2026";

export const metadata = {
  title: TITEL,
  description: BESCHREIBUNG,
  alternates: { canonical: PAGE_URL },
  robots: { index: true, follow: true },
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

const G = GESELLSCHAFT;
const provVon = fmt(PROVISION.verkaeufer.min * 100, 1);
const provBis = fmt(PROVISION.verkaeufer.max * 100);

export default function NutzungsbedingungenPage() {
  return (
    <LegalShell
      titel="Nutzungsbedingungen"
      pfad="/nutzungsbedingungen"
      lead="Regeln für die Nutzung von Website, Portal und Projektbörse der ÖkoInvest GmbH – für Flächeneigentümer, Landwirte, Investoren, Projektanbieter und Unternehmen."
    >
      {ENTWURF && (
        <div role="note" className="mb-10 flex gap-4 rounded-2xl bg-sun-300/20 p-5 ring-1 ring-sun-300/60 md:p-6">
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
        </div>
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
        (3) Für einzelne Leistungen können gesonderte Vereinbarungen gelten, insbesondere die Vertraulichkeitsvereinbarung (NDA) und die
        Provisionsvereinbarung. Diese gehen den Nutzungsbedingungen im Widerspruchsfall vor.
      </p>

      <h2>§ 2 Leistungen der Plattform</h2>
      <p>(1) Die Plattform bietet insbesondere:</p>
      <ul>
        <li>allgemeine Informationen, Ratgeber, Lexikon, Rechner und Marktdaten,</li>
        <li>Anfragen, etwa zur Prüfung von Flächen (Flächencheck), zu Agri-PV, Reststrom, Energiegemeinschaften oder Genossenschaft,</li>
        <li>ein Portal mit rollenbezogenen Bereichen für Flächen, Projekte, Anfragen, Nachrichten und Dokumente,</li>
        <li>
          die <Link href="/projektboerse">Projektbörse</Link>, in der Anbieter Photovoltaik- und Speicherprojekte in unterschiedlichen
          Entwicklungsphasen vorstellen und Investoren passende Projekte finden können.
        </li>
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

      <h2>§ 4 Rollen und Berechtigungen</h2>
      <p>
        (1) Nutzer registrieren sich in einer Rolle, etwa als Flächeneigentümer, Landwirt, Investor, Projektanbieter, Unternehmen oder Mitglied.
        Die Rolle bestimmt, welche Bereiche und Informationen zugänglich sind. Eine Person kann mehrere Rollen haben, wenn wir dies freigeben.
      </p>
      <p>
        (2) Investoren können Suchprofile anlegen und erhalten nach Prüfung Zugang zu Exposés. Projektanbieter können Projekte einstellen, die
        vor Veröffentlichung von uns geprüft werden (§ 6). Wir können Rollen und Berechtigungen anpassen, wenn dies zur Sicherheit oder
        Vertraulichkeit erforderlich ist.
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
        <li>er Änderungen, die den Wert oder die Umsetzbarkeit des Projekts beeinflussen, unverzüglich im Portal nachträgt oder uns mitteilt.</li>
      </ul>
      <p>
        (2) Der Anbieter stellt ÖkoInvest von Ansprüchen Dritter frei, die auf unrichtigen Angaben oder fehlenden Rechten des Anbieters beruhen,
        einschließlich angemessener Kosten der Rechtsverteidigung, soweit er die Pflichtverletzung zu vertreten hat.
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

      <h2>§ 8 Keine Anlageberatung</h2>
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

      <h2>§ 9 Haftung</h2>
      <p>
        (1) Für Angaben, Unterlagen und Erklärungen Dritter, insbesondere der Projektanbieter, haften wir nicht. Wir machen uns solche Angaben
        nicht zu eigen.
      </p>
      <p>
        (2) Im Übrigen haften wir nur für Schäden, die wir vorsätzlich oder grob fahrlässig verursacht haben. Diese Beschränkung gilt nicht für
        Personenschäden, für die Verletzung wesentlicher Vertragspflichten im Rahmen des vorhersehbaren, typischen Schadens sowie, soweit
        zwingendes Recht (etwa zugunsten von Verbrauchern) eine weitergehende Haftung vorsieht.
      </p>
      <p>(3) Für Unterbrechungen der Verfügbarkeit, Datenverluste durch höhere Gewalt oder Handlungen Dritter haften wir nicht.</p>

      <h2>§ 10 Provision</h2>
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
        regelt eine <strong>gesonderte Provisionsvereinbarung</strong>, die vor Veröffentlichung eines Projekts abgeschlossen wird.
      </p>
      <p>
        (4) <strong>Umgehungsschutz:</strong> Der Provisionsanspruch besteht auch, wenn der Vertrag unter Umgehung der Plattform unmittelbar oder
        über verbundene Unternehmen, Treuhänder oder sonstige Dritte geschlossen wird, sofern der Investor dem Anbieter erstmals über die
        Plattform bekannt geworden ist und der Abschluss innerhalb von 24 Monaten nach Freischaltung der Projektdetails erfolgt. Investoren
        verpflichten sich, über die Plattform erlangte Kontakte nicht zur Umgehung zu nutzen. Näheres regelt die Provisionsvereinbarung.
      </p>

      <h2>§ 11 Inhalte der Nutzer</h2>
      <p>
        (1) Nutzer bleiben Inhaber der Rechte an ihren Inhalten. Sie räumen uns das einfache, auf die Dauer der Veröffentlichung beschränkte
        Recht ein, diese Inhalte zum Zweck der Plattform zu speichern, aufzubereiten (z. B. anonymisierte Teaser) und berechtigten Nutzern
        zugänglich zu machen.
      </p>
      <p>
        (2) Unzulässig sind insbesondere falsche Identitätsangaben, rechtswidrige oder irreführende Inhalte, Schadsoftware, das automatisierte
        Auslesen der Plattform (Scraping) und Versuche, Sicherheitsmechanismen zu umgehen.
      </p>

      <h2>§ 12 Laufzeit und Kündigung</h2>
      <p>
        (1) Der Nutzungsvertrag läuft auf unbestimmte Zeit. Nutzer können ihr Konto jederzeit ohne Frist kündigen, etwa über das Profil im
        Portal oder das <Link href="/kontakt">Kontaktformular</Link>. Wir können mit einer Frist von vier Wochen kündigen.
      </p>
      <p>
        (2) Das Recht zur Kündigung aus wichtigem Grund bleibt unberührt, insbesondere bei schwerwiegenden oder wiederholten Verstößen gegen
        diese Bedingungen oder ein NDA.
      </p>
      <p>
        (3) Vertraulichkeitspflichten, entstandene Provisionsansprüche und der Umgehungsschutz bestehen nach Beendigung fort. Gespeicherte Daten
        werden nach Maßgabe der <Link href="/datenschutz">Datenschutzerklärung</Link> gelöscht.
      </p>

      <h2>§ 13 Änderungen dieser Bedingungen</h2>
      <p>
        Wir können diese Bedingungen mit Wirkung für die Zukunft ändern, wenn dies aus rechtlichen, technischen oder geschäftlichen Gründen
        erforderlich ist. Registrierte Nutzer informieren wir mindestens vier Wochen vor Inkrafttreten. Widersprechen sie nicht bis zum
        Inkrafttreten, gelten die Änderungen als angenommen; auf diese Folge weisen wir in der Mitteilung hin. Im Fall des Widerspruchs kann
        jede Seite den Nutzungsvertrag kündigen.
      </p>

      <h2>§ 14 Anwendbares Recht und Gerichtsstand</h2>
      <p>
        (1) Es gilt <strong>österreichisches Recht</strong> unter Ausschluss der Verweisungsnormen des internationalen Privatrechts und des
        UN-Kaufrechts. Gegenüber Verbrauchern gilt diese Rechtswahl nur, soweit dadurch nicht der Schutz zwingender Bestimmungen des Staates
        entzogen wird, in dem sie ihren gewöhnlichen Aufenthalt haben.
      </p>
      <p>
        (2) Ausschließlicher Gerichtsstand für Streitigkeiten mit Unternehmern ist das für den Sitz der {G.name} in {G.ort} sachlich zuständige
        Gericht. Für Verbraucher gelten die gesetzlichen Gerichtsstände.
      </p>

      <h2>§ 15 Schlussbestimmungen</h2>
      <p>
        Sollte eine Bestimmung unwirksam sein oder werden, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt. Gegenüber Unternehmern
        tritt an ihre Stelle eine wirksame Regelung, die dem wirtschaftlichen Zweck möglichst nahekommt.
      </p>
      <p>Stand: {STAND}.</p>
    </LegalShell>
  );
}
