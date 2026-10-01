// /energiegemeinschaften/rechner – öffentlicher Ersparnis-Rechner Energiegemeinschaft Österreich (WP6).
// Reine Funktion eg/interesse.js rechnerOeffentlich (Python-Spiegel eg_portal_kern.py, API POST /api/eg/rechner).

import Link from "next/link";
import RechnerSeite, { rechnerMetadata } from "@/components/Rechner/RechnerSeite";
import ErsparnisRechner from "@/components/Portal/EG/Mitglied/ErsparnisRechner";
import { InteresseFormular } from "@/components/Portal/EG/Mitglied/GemeinschaftFinden";
import { RECHNER_PROFILE, RECHNER_STANDARD } from "@/lib/plattform/eg/interesse";
import { fmt } from "@/lib/rechner/annahmen";

const PFAD = "/energiegemeinschaften/rechner";

export const metadata = rechnerMetadata({
  pfad: PFAD,
  title: "Energiegemeinschaft Rechner Österreich | ÖkoInvest",
  description: "Was bringt eine Energiegemeinschaft? Ersparnis aus Energiepreis, reduziertem Netzentgelt und Abgabe für EEG, BEG und GEA – mit den Regeln 2026 und ab 2027.",
  keywords: ["Energiegemeinschaft Rechner", "EEG Ersparnis", "Netzentgelt Energiegemeinschaft", "Bürgerenergiegemeinschaft Rechner", "ElWG"],
});

const FAQ = [
  { q: "Woraus setzt sich die Ersparnis zusammen?", a: "Aus drei Teilen: dem Unterschied zwischen dem Energiepreis Ihres Lieferanten und dem Preis in der Gemeinschaft, dem reduzierten Netznutzungs-Arbeitspreis (bei EEG) und der entfallenden Elektrizitätsabgabe (bei EEG). Erzeuger erhalten zusätzlich mehr für ihren Überschuss, wenn der Einspeisepreis der Gemeinschaft über dem Marktpreis liegt." },
  { q: "Warum bekommt eine BEG keine Netzentgelt-Reduktion?", a: "Nach der Systemnutzungsentgelte-Verordnung 2018 gilt der reduzierte Arbeitspreis nur für Erneuerbare-Energie-Gemeinschaften im Lokal- bzw. Regionalbereich. Ab 2027 soll die Reduktion am Nahebereich hängen – auch eine regional abgegrenzte BEG könnte dann profitieren (zu bestätigen)." },
  { q: "Wie genau ist das Ergebnis?", a: `Der Rechner ist eine Näherung: Wie viel Ihres Verbrauchs aus der Gemeinschaft kommt, schätzen wir aus Profil und Erzeugung in der Gemeinschaft (Obergrenze z. B. ${fmt(RECHNER_PROFILE.haushalt.max * 100)} % für Haushalte). Maßgeblich sind die Viertelstundenwerte, die Ihr Netzbetreiber liefert.` },
  { q: "Was passiert mit meinem übrigen Strom?", a: "Den Strom, den die Gemeinschaft nicht deckt, liefert weiterhin Ihr bisheriger Lieferant. Nicht genutzter Überschuss geht wie bisher an Ihren Abnehmer." },
];

export default function Page() {
  return (
    <RechnerSeite
      pfad={PFAD}
      toolId="eg-ersparnis"
      breadcrumb="Energiegemeinschaft"
      eyebrow="Für Haushalte, Landwirte, Betriebe und Gemeinden · Österreich"
      title={<>Was bringt mir eine <span className="ov-text-gradient-light">Energiegemeinschaft?</span></>}
      lead="Verbrauch oder PV-Anlage eingeben und sehen, was Gemeinschaftsstrom im Jahr bringt – mit den Netzentgelt-Regeln nach SNE-V 2018 und der gekennzeichneten Arbeitshypothese für 2027."
      chips={["EEG lokal, regional, BEG, GEA", "Netzentgelt nach Regeltabelle", "Ohne Anmeldung"]}
      app={{ name: "Ersparnis-Rechner Energiegemeinschaft", description: "Jahresersparnis eines Mitglieds einer Energiegemeinschaft in Österreich.", featureList: ["Energiepreis-, Netzentgelt- und Abgabenvorteil", "Erzeuger-Mehrerlös", "Regeln 2026 und ab 2027"] }}
      rechner={<ErsparnisRechner />}
      erklaerung={
        <div className="ov-prose">
          <h2>So rechnen wir</h2>
          <p>Geteilt wird nur, was in derselben Viertelstunde erzeugt und verbraucht wird. Den Anteil schätzen wir aus Ihrem Verbrauchsprofil und dem Verhältnis von Erzeugung zu Verbrauch in der Gemeinschaft. Auf diesen Gemeinschaftsstrom wirken der Preisunterschied, die Netzentgelt-Reduktion und – bei Erneuerbare-Energie-Gemeinschaften – die Befreiung von der Elektrizitätsabgabe.</p>
          <p>Bestehende Gemeinschaft gesucht? <Link href="/registrieren?rolle=mitglied&weiter=%2Fportal%2Feg%2Fbeitritt">Konto anlegen und Gemeinschaft finden</Link> oder unten Interesse hinterlegen. Für Vorstände und Gemeinden: <Link href="/energiegemeinschaften/software">Plattform und Betriebsführung</Link>.</p>
          <div className="not-prose mt-8 rounded-[2rem] bg-sand-50 p-6 ring-1 ring-ink-200/70">
            <p className="font-display text-[18px] font-bold text-ink-900">Interesse hinterlegen</p>
            <p className="mb-4 mt-1 text-[14px] text-ink-600">Wir melden uns, sobald eine Gemeinschaft in Ihrer Nähe Mitglieder aufnimmt.</p>
            <InteresseFormular oeffentlich herkunft="rechner" />
          </div>
        </div>
      }
      annahmen={[
        ["Energiepreis Lieferant (netto)", `${fmt(RECHNER_STANDARD.lieferantCt)} ct/kWh`],
        ["Preis in der Gemeinschaft", `${fmt(RECHNER_STANDARD.gemeinschaftCt)} ct/kWh`],
        ["Netznutzungs-Arbeitspreis", `${fmt(RECHNER_STANDARD.netzApCt)} ct/kWh`],
        ["Elektrizitätsabgabe (nur EEG befreit)", `${fmt(RECHNER_STANDARD.abgabenCt, 2)} ct/kWh`],
        ["Netzentgelt 2026 EEG lokal / regional", "−57 % / −28 %"],
        ["Netzentgelt ab 2027", "Arbeitshypothese"],
        ["PV-Ertrag Dachanlage", `${fmt(RECHNER_STANDARD.ertragKwhJeKwp)} kWh/kWp`],
        ["Gebühren und Beitrag", `${fmt(RECHNER_STANDARD.gebuehrenJahr)} €/Jahr`],
        ["Gemeinschaftsanteil", "Näherung aus Profilen"],
      ]}
      quellen={[
        { name: "SNE-V 2018 § 5 Abs. 1a", url: "https://www.ris.bka.gv.at/geltendefassung.wxe?abfrage=bundesnormen&gesetzesnummer=20010107" },
        { name: "Koordinationsstelle – FAQ zum ElWG", url: "https://energiegemeinschaften.gv.at/faqs-zum-elwg/" },
        { name: "Marktbeobachtung Preise in Gemeinschaften (AT, 2026)" },
      ]}
      faq={FAQ}
      querverweise={[
        { href: "/energiegemeinschaften", titel: "Energiegemeinschaften", text: "Modelle in DE, AT und CH im Vergleich." },
        { href: "/energiegemeinschaften/software", titel: "Plattform & Betrieb", text: "Software, Betriebsführung und Gründung für Gemeinschaften." },
        { href: "/rechner/energy-sharing", titel: "Energy-Sharing-Rechner", text: "Die ganze Gemeinschaft rechnen – DE, AT, CH." },
      ]}
      cta={{ eyebrow: "Mitmachen", title: "Strom aus der Nachbarschaft – für Sie.", text: "Finden Sie eine Gemeinschaft in Ihrer Nähe oder gründen Sie mit uns eine neue.", primary: { label: "Gemeinschaft finden", href: "/registrieren?rolle=mitglied&weiter=%2Fportal%2Feg%2Fbeitritt" }, secondary: { label: "Plattform & Betrieb", href: "/energiegemeinschaften/software" } }}
    />
  );
}
