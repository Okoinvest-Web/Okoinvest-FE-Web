// /energiegemeinschaften/rechner – öffentlicher Ersparnis-Rechner Energiegemeinschaft Österreich (WP6).
// Reine Funktion eg/interesse.js rechnerOeffentlich (Python-Spiegel eg_portal_kern.py, API POST /api/eg/rechner).

import Link from "next/link";
import { ArrowRight, BellRing, Landmark, Percent, Scale } from "lucide-react";
import RechnerSeite, { rechnerMetadata } from "@/components/Rechner/RechnerSeite";
import Stagger from "@/components/ui/Stagger";
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

const BAUSTEINE = [
  { icon: Scale, ton: "bg-ov-50 text-ov-700 ring-1 ring-ov-100", titel: "Preisunterschied", text: "Energiepreis Ihres Lieferanten minus Preis in der Gemeinschaft.", wert: `${fmt(RECHNER_STANDARD.lieferantCt)} → ${fmt(RECHNER_STANDARD.gemeinschaftCt)} ct` },
  { icon: Percent, ton: "bg-navy-50 text-navy-700 ring-1 ring-navy-100", titel: "Netzentgelt-Reduktion", text: "Reduzierter Netznutzungs-Arbeitspreis für EEG lokal bzw. regional.", wert: "−57 % / −28 %" },
  { icon: Landmark, ton: "bg-sun-50 text-sun-700 ring-1 ring-sun-200", titel: "Elektrizitätsabgabe", text: "Entfällt auf Gemeinschaftsstrom – nur bei Erneuerbare-Energie-Gemeinschaften.", wert: `${fmt(RECHNER_STANDARD.abgabenCt, 2)} ct/kWh` },
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
        <div>
          <h2 className="ov-h2 text-ink-900">So rechnen wir</h2>
          <p className="mt-4 text-[16.5px] leading-relaxed text-ink-600">
            Geteilt wird nur, was in derselben Viertelstunde erzeugt und verbraucht wird. Den Anteil schätzen wir aus Ihrem Verbrauchsprofil und dem Verhältnis von Erzeugung zu Verbrauch in der Gemeinschaft. Auf diesen Gemeinschaftsstrom wirken der Preisunterschied, die Netzentgelt-Reduktion und – bei Erneuerbare-Energie-Gemeinschaften – die Befreiung von der Elektrizitätsabgabe.
          </p>

          {/* drei Bausteine des Vorteils – Werte aus RECHNER_STANDARD (Vorbelegung des Rechners) */}
          <Stagger as="ol" schritt={90} className="mt-8 grid gap-3">
            {BAUSTEINE.map((b, i) => (
              <li key={b.titel} className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-4 gap-y-2 rounded-2xl sm:grid-cols-[auto_minmax(0,1fr)_auto] bg-white p-5 ring-1 ring-ink-200/70">
                <span aria-hidden="true" className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl ${b.ton}`}>
                  <b.icon className="h-[18px] w-[18px]" />
                </span>
                <div className="min-w-0">
                  <p className="font-display text-[16.5px] font-bold text-ink-900">
                    <span className="sr-only">Baustein {i + 1}: </span>
                    {b.titel}
                  </p>
                  <p className="mt-1 text-[14px] leading-relaxed text-ink-600">{b.text}</p>
                </div>
                <span className="ov-num col-start-2 justify-self-start whitespace-nowrap rounded-full bg-sand-100 sm:col-start-3 sm:row-start-1 px-2.5 py-1 text-[12.5px] font-semibold text-ink-700">{b.wert}</span>
              </li>
            ))}
          </Stagger>

          {/* nächste Schritte */}
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <Link href="/registrieren?rolle=mitglied&weiter=%2Fportal%2Feg%2Fbeitritt" className="ov-lift group flex flex-col rounded-2xl bg-navy-950 p-5 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500 focus-visible:ring-offset-2">
              <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ov-300">Bestehende Gemeinschaft gesucht?</span>
              <span className="mt-1.5 inline-flex items-center gap-1.5 font-display text-[16.5px] font-bold">
                Konto anlegen und Gemeinschaft finden
                <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
              </span>
            </Link>
            <Link href="/energiegemeinschaften/software" className="ov-lift group flex flex-col rounded-2xl bg-white p-5 ring-1 ring-ink-200/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500 focus-visible:ring-offset-2">
              <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ov-700">Für Vorstände und Gemeinden</span>
              <span className="mt-1.5 inline-flex items-center gap-1.5 font-display text-[16.5px] font-bold text-ink-900">
                Plattform und Betriebsführung
                <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-ov-600 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
              </span>
            </Link>
          </div>

          <div id="interesse" className="mt-8 scroll-mt-24 rounded-[2rem] bg-sand-50 p-5 ring-1 ring-ink-200/70 sm:p-7">
            <div className="mb-5 flex items-start gap-4">
              <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ov-600 text-white">
                <BellRing className="h-5 w-5" />
              </span>
              <div>
                <p className="font-display text-[18px] font-bold text-ink-900">Interesse hinterlegen</p>
                <p className="mt-1 text-[14px] text-ink-600">Wir melden uns, sobald eine Gemeinschaft in Ihrer Nähe Mitglieder aufnimmt.</p>
              </div>
            </div>
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
