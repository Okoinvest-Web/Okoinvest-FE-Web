// /energiegemeinschaften/software – Plattform und Betriebsführung für Energiegemeinschaften in Österreich (WP6):
// Mitgliederportal, Ersparnis-Rechner, fairer Vergleich mit dem Markt (belegt aus docs/EG-MARKT.md, keine Herabsetzung),
// Pakete Software / Betriebsführung / Gründung (Preise auf Anfrage), Wechsel, ElWG-Neuerungen, Anfrage über POST /api/anfrage.

import { BadgeCheck, BellRing, Building2, ClipboardList, FileSignature, HandCoins, Landmark, LineChart, Repeat, ShieldCheck, SlidersHorizontal, Sun, Users } from "lucide-react";
import PageHero from "@/components/ui/PageHero";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import SplitMedia from "@/components/ui/SplitMedia";
import FeatureGrid from "@/components/ui/FeatureGrid";
import Steps from "@/components/ui/Steps";
import Faq from "@/components/ui/Faq";
import CtaBand from "@/components/ui/CtaBand";
import Reveal from "@/components/ui/Reveal";
import Querverweise from "@/components/Reusable/Querverweise";
import { rechnerMetadata } from "@/components/Rechner/RechnerSeite";
import AnfrageMitDaten from "@/components/Gemeinschaft/AnfrageMitDaten";
import ErsparnisRechner from "@/components/Portal/EG/Mitglied/ErsparnisRechner";
import PortalVorschau from "@/components/Portal/EG/Mitglied/PortalVorschau";
import { abs } from "@/data/site";

const PFAD = "/energiegemeinschaften/software";

export const metadata = rechnerMetadata({
  pfad: PFAD,
  title: "Software für Energiegemeinschaften (AT) | ÖkoInvest",
  description: "Plattform und Betriebsführung für EEG, BEG und GEA nach ElWG: geführte Zustimmung beim Netzbetreiber, Mehrfachteilnahme, Ersparnis-Rechner, Gründung und Wechsel.",
  keywords: ["Energiegemeinschaft Software", "EEG Abrechnung", "Bürgerenergiegemeinschaft", "ElWG Energiegemeinschaft", "Mehrfachteilnahme Teilnahmefaktor", "Energiegemeinschaft gründen Österreich"],
});

const PORTAL = [
  { icon: BellRing, title: "Zustimmung mit Countdown", text: "Jedes Mitglied sieht, wo seine Anmeldung steht, wie viele Tage für die Zustimmung im Netzbetreiber-Portal bleiben – und eine Anleitung für genau seinen Netzbetreiber." },
  { icon: LineChart, title: "Ersparnis, die man versteht", text: "Anteil Gemeinschaftsstrom, Ersparnis aus Energiepreis, Netzentgelt und Abgabe – getrennt ausgewiesen und als Schätzung gekennzeichnet." },
  { icon: Sun, title: "Grüne Stunden", text: "Wann die Gemeinschaft am meisten erzeugt: aus Prognose und Messwerten, dazu Hinweise zu Mittagstarif, Speicher und Wallbox – ohne Fernsteuerung." },
  { icon: SlidersHorizontal, title: "Mehrfachteilnahme", text: "Ein Zählpunkt in bis zu fünf Gemeinschaften: Teilnahmefaktoren je Gemeinschaft, freier Anteil und ein Vorschlag des Optimierers." },
  { icon: FileSignature, title: "Beitritt in Minuten", text: "Eignungscheck des Zählpunkts, Verträge, SEPA-Mandat und elektronische Unterschrift – danach geht es geführt in die Zustimmung beim Netzbetreiber." },
  { icon: ShieldCheck, title: "Eigene Daten, klare Rechte", text: "Mitglieder sehen nur ihre Daten, Vorstände standardmäßig Summen. Datenauskunft nach Art. 15 DSGVO als Download." },
];

/** Vergleich: Aussagen zum Markt aus der Marktanalyse (öffentliche Anbieterangaben, Stand 01.10.2026) */
const VERGLEICH = [
  { thema: "Online-Beitritt, EDA-Anbindung, Rechnungen und Gutschriften, Mitgliederportal", markt: "bei nahezu allen Anbietern Standard", wir: "Ebenso enthalten – mit geführter Zustimmung je Netzbetreiber und Fristanzeige" },
  { thema: "Hilfe bei der Zustimmung im Netzbetreiber-Portal", markt: "teils als Anleitung (PDF, Seiten je Netzbetreiber)", wir: "Status Schritt für Schritt im Portal, Countdown und Anleitung im Kontext des Zählpunkts" },
  { thema: "Mehrfachteilnahme mit Teilnahmefaktor", markt: "bei einzelnen Anbietern, teils als eigenes Paket", wir: "Übersicht je Zählpunkt, Regeln Σ ≤ 100 % und max. 5 geprüft, Vorschlag des Optimierers" },
  { thema: "Prognose „grüne Stunden“, Speicher- und Lastverschiebungs-Hinweise", markt: "in öffentlichen Quellen selten belegt", wir: "Prognose aus Messwerten und Wetter, Hinweise ohne Steuerung" },
  { thema: "Vereinsführung, Mahnwesen, Umsatzsteuer-Sonderfälle", markt: "in öffentlichen Quellen selten belegt", wir: "Organe, Versammlungen, Vier-Augen-Freigaben, USt-Fälle (Kleinunternehmer, Landwirt, Reverse Charge)" },
  { thema: "Gründung, Anlagen und Finanzierung aus einer Hand", markt: "Gründungsbegleitung verbreitet, eigene Anlagenprojekte selten", wir: "Gründung als Dienstleistung, PV und Speicher über die ÖKOVOLT-Gruppe, Bürgerbeteiligung" },
];

const PAKETE = [
  { icon: ClipboardList, title: "Software", tag: "Selbstverwaltet", text: "Plattform für Vorstand, Kassa und Mitglieder: Stammdaten, EDA-Prozesse, Energiedaten, Abrechnung, Portal. Ihre Gemeinschaft arbeitet selbst, wir liefern Werkzeug und Support.", punkte: ["Mitgliederportal und Beitritt online", "Abrechnung mit Vier-Augen-Freigabe", "Export für die Steuerberatung"] },
  { icon: Users, title: "Betriebsführung", tag: "ÖkoInvest als Organisator", text: "Wir übernehmen als Organisator nach § 68 Abs. 2 ElWG Anmeldungen, Datenqualität, Abrechnung und Mitgliederfragen – auf Basis eines Dienstleistungs- und Auftragsverarbeitungsvertrags.", punkte: ["Kommunikation mit dem Netzbetreiber", "Lieferantenpflichten ab 100 kW (§ 69)", "Ansprechpartner für Mitglieder"] },
  { icon: Building2, title: "Gründung", tag: "Von der Idee bis zum ersten Strom", text: "Machbarkeit mit Simulation, Rechtsform und Statuten, Marktpartner, Vertrag mit dem Netzbetreiber, EDA-Zugang, erste Mitglieder – für Gemeinden, Vereine und Initiativen.", punkte: ["Netzgebiets- und Nahebereichs-Check", "Statuten und Verträge aus Mustern", "Startkampagne für Mitglieder"] },
];

const WECHSEL = [
  { title: "Mandat", text: "Vorstandsbeschluss, Dienstleistungs- und Auftragsverarbeitungsvertrag; auf Wunsch Bestellung als Organisator." },
  { title: "EDA-Zugang übertragen", text: "Die Marktpartner-ID bleibt bei Ihrer Gemeinschaft. Zählpunkte müssen nicht ab- und neu angemeldet werden – die Zustimmungen bleiben bestehen." },
  { title: "Daten übernehmen", text: "Import von Mitgliedern, Zählpunkten und Tarifen, Abgleich mit der Zählpunktliste des Netzbetreibers." },
  { title: "Parallellauf und Stichtag", text: "Eigene Zuteilung gegen die Werte des Netzbetreibers prüfen, Abrechnung ab einem festen Monat." },
];

const ELWG = [
  { icon: Repeat, title: "Bis zu fünf Gemeinschaften", text: "Ein Zählpunkt kann an bis zu fünf gemeinsamen Energienutzungen teilnehmen; Teilnahmefaktor ganzzahlig, zusammen höchstens 100 % (ElWG § 71 Abs. 5)." },
  { icon: HandCoins, title: "Netzentgelt nach Nahebereich", text: "Bis Ende 2026 gelten für EEG lokal −57 % bzw. regional −28 %/−64 % auf den Netznutzungs-Arbeitspreis. Ab 2027 soll eine neue Verordnung nach Nahebereich staffeln – die Höhe steht noch aus (zu bestätigen)." },
  { icon: BadgeCheck, title: "Pflichten ab 100 kW", text: "Gemeinschaften mit mehr als 100 kW Erzeugung (Haushalte über 30 kW) brauchen AGB, Informationsblatt und Rechnungen mit Pflichtinhalten – ein Organisator kann sie übernehmen (§ 69)." },
  { icon: Landmark, title: "Sozialquote für Gemeinden", text: "Nehmen Gebietskörperschaften mit eigener Erzeugung teil, sollen mindestens 10 % der Menge schutzbedürftigen Haushalten zugutekommen (§ 68 Abs. 6)." },
];

const FAQ = [
  { q: "Für welche Gemeinschaften ist die Plattform gedacht?", a: "Für Erneuerbare-Energie-Gemeinschaften (lokal und regional), Bürgerenergiegemeinschaften und gemeinschaftliche Erzeugungsanlagen in Österreich nach den §§ 65–72 ElWG. Das neue Modell Peer-to-Peer ist im Datenmodell bereits vorgesehen." },
  { q: "Müssen wir bei einem Wechsel alle Zählpunkte neu anmelden?", a: "Nein. Die Marktpartner-ID gehört der Gemeinschaft; wir erhalten einen Zugang im EDA-Anwenderportal bzw. eine Bevollmächtigung. Die bestehenden Zustimmungen der Mitglieder bleiben gültig. Für einen Monat rechnen wir parallel und gleichen mit den Werten des Netzbetreibers ab." },
  { q: "Wie hoch ist die Ersparnis für ein Mitglied?", a: "Das hängt vom Modell, vom Verbrauchsprofil und vom Preis in der Gemeinschaft ab. Öffentlich genannte Beispiele liegen bei rund 50 bis 200 € im Jahr je Haushalt. Der Rechner oben zeigt Ihre Größenordnung – die Netzentgelt-Reduktion zieht der Netzbetreiber direkt auf der Netzrechnung ab." },
  { q: "Was passiert bei den Netzentgelten ab 2027?", a: "Mit dem ElWG sollen reduzierte Netzentgelte künftig nach dem Nahebereich (Zonelevel) statt nach der Form der Gemeinschaft berechnet werden. Die neue Verordnung lag zum 1. Oktober 2026 noch nicht endgültig vor; wir rechnen bis dahin mit einer gekennzeichneten Arbeitshypothese und passen die Werte an, sobald sie feststehen." },
  { q: "Was kostet die Plattform?", a: "Wir kalkulieren je Gemeinschaft nach Paket und Größe und legen das Angebot offen dar. Fragen Sie unverbindlich an – mit wenigen Angaben zu Mitgliedern und Anlagen erhalten Sie ein konkretes Angebot." },
  { q: "Wer sieht die Viertelstundenwerte der Mitglieder?", a: "Mitglieder sehen ihre eigenen Werte. Vorstand und Kassa sehen standardmäßig Summen; eine Einzeleinsicht ist nur mit Zweck möglich und wird protokolliert. Die Betriebsführung arbeitet im Auftrag der Gemeinschaft (Auftragsverarbeitung nach Art. 28 DSGVO)." },
];

const QUERVERWEISE = [
  { href: "/energiegemeinschaften", titel: "Energiegemeinschaften im Überblick", text: "Regeln in Deutschland, Österreich und der Schweiz im Vergleich." },
  { href: "/energiegemeinschaften/rechner", titel: "Ersparnis-Rechner", text: "Was eine Gemeinschaft für Ihren Verbrauch oder Ihre PV-Anlage bringt." },
  { href: "/kommunen", titel: "Für Gemeinden", text: "Wertschöpfung, Beteiligung und eigene Anlagen vor Ort." },
];

const schema = {
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": `${abs(PFAD)}/#service`,
  name: "Plattform und Betriebsführung für Energiegemeinschaften",
  serviceType: "Software und Dienstleistung für Energiegemeinschaften",
  description: "Mitgliederportal, EDA-Prozesse, Abrechnung, Gründung und Betriebsführung für Energiegemeinschaften in Österreich nach ElWG.",
  provider: { "@id": `${abs("/")}/#organization` },
  areaServed: { "@type": "Country", name: "Österreich" },
  url: abs(PFAD),
};

export default function SoftwarePage() {
  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <PageHero
        breadcrumbs={[{ name: "Energiegemeinschaften", href: "/energiegemeinschaften" }, { name: "Plattform & Betrieb" }]}
        eyebrow="Für Energiegemeinschaften in Österreich · ElWG"
        title={<>Die Gemeinschaft führen – <span className="ov-text-gradient">nicht nur abrechnen.</span></>}
        lead="Eine Plattform für Mitglieder, Vorstand und Kassa – und auf Wunsch ein Team, das den Betrieb übernimmt. Von der Gründung über die Zustimmung beim Netzbetreiber bis zur eigenen Anlage."
        image={{ src: "/img/planer-tablet.jpg", alt: "Planung am Tablet" }}
        points={["Geführte Zustimmung beim Netzbetreiber", "Mehrfachteilnahme bis fünf Gemeinschaften", "Gründung, Wechsel und Betrieb", "EDA-Rolle bleibt bei der Gemeinschaft"]}
        actions={[{ label: "Ersparnis rechnen", href: "#rechner" }, { label: "Angebot anfragen", href: "#anfrage" }]}
      />

      <Section tone="white" space="lg">
        <SplitMedia
          eyebrow="Mitgliederportal"
          title="Jedes Mitglied weiß, was als Nächstes passiert"
          text={[
            "Der häufigste Ärger in Energiegemeinschaften ist nicht die Rechnung, sondern das Drumherum: Zustimmungen im Netzbetreiber-Portal werden vergessen, Daten kommen verspätet, Mitglieder fragen nach.",
            "Unser Portal zeigt jede Anmeldung Schritt für Schritt, zählt die Tage bis zum Fristende herunter und erklärt die Zustimmung für den jeweiligen Netzbetreiber. Danach sieht das Mitglied seinen Gemeinschaftsstrom, die Ersparnis und die besten Verbrauchszeiten.",
          ]}
          aside={<PortalVorschau />}
        />
      </Section>

      <Section tone="sand" space="lg">
        <SectionHeading eyebrow="Was Mitglieder bekommen" title="Klar, ehrlich, ohne Rückfragen" lead="Alles an einem Ort – auch auf dem Handy." className="mb-10 md:mb-12" />
        <FeatureGrid items={PORTAL} cols={3} />
      </Section>

      <Section tone="white" space="lg" id="rechner" className="scroll-mt-24">
        <SectionHeading eyebrow="Ersparnis-Rechner" title={<>Was bringt eine Gemeinschaft <span className="ov-text-gradient">Ihren Mitgliedern?</span></>} lead="Verbrauch oder PV-Anlage eingeben – der Rechner nutzt die Netzentgelt-Regeln 2026 und kennzeichnet die Arbeitshypothese für 2027." className="mb-8 md:mb-10" />
        <ErsparnisRechner />
      </Section>

      <Section tone="sand" space="lg">
        <SectionHeading eyebrow="Warum ÖkoInvest" title="Was es am Markt gibt – und was wir anders machen" lead="Rund ein Dutzend Plattformen decken den Grundumfang solide ab. Den Unterschied machen die Aufgaben rund um die Abrechnung, die in Vorständen die meiste Zeit kosten." className="mb-8 md:mb-10" />
        <Reveal className="overflow-hidden rounded-[2rem] bg-white ring-1 ring-ink-200/70">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[14.5px]">
              <caption className="sr-only">Vergleich der Funktionen am Markt und bei ÖkoInvest</caption>
              <thead>
                <tr className="border-b border-ink-100 bg-sand-50 text-[12px] font-semibold uppercase tracking-wider text-ink-500">
                  <th scope="col" className="px-5 py-3.5 md:px-6">Aufgabe</th>
                  <th scope="col" className="px-5 py-3.5 md:px-6">Am Markt (öffentlich belegt)</th>
                  <th scope="col" className="px-5 py-3.5 text-ov-800 md:px-6">ÖkoInvest-Plattform</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {VERGLEICH.map((v) => (
                  <tr key={v.thema}>
                    <th scope="row" className="px-5 py-4 align-top font-semibold text-ink-900 md:px-6">{v.thema}</th>
                    <td className="px-5 py-4 align-top text-ink-600 md:px-6">{v.markt}</td>
                    <td className="px-5 py-4 align-top text-ink-800 md:px-6"><span className="flex gap-2"><BadgeCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ov-600" />{v.wir}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-ink-100 px-5 py-4 text-[12.5px] leading-relaxed text-ink-500 md:px-6">Grundlage: eigene Auswertung öffentlicher Anbieterangaben (Websites, Preisblätter, Dokumentationen), Stand 01.10.2026. „Selten belegt“ heißt: in öffentlichen Quellen nicht gefunden – nicht, dass es eine Funktion nicht gibt. Der Funktionsumfang der ÖkoInvest-Plattform geht schrittweise in Betrieb.</p>
        </Reveal>
      </Section>

      <Section tone="white" space="lg">
        <SectionHeading eyebrow="Pakete" title="So viel Unterstützung, wie Ihre Gemeinschaft braucht" lead="Preise auf Anfrage – wir kalkulieren je Gemeinschaft nach Größe und Leistungsumfang und legen das Angebot transparent dar." className="mb-10 md:mb-12" />
        <div className="grid gap-5 lg:grid-cols-3">
          {PAKETE.map((p, i) => (
            <Reveal key={p.title} delay={i * 80} className={i === 1 ? "flex flex-col rounded-[2rem] bg-navy-950 p-6 text-white md:p-8" : "flex flex-col rounded-[2rem] bg-white p-6 ring-1 ring-ink-200/70 md:p-8"}>
              <span className={i === 1 ? "flex h-12 w-12 items-center justify-center rounded-2xl bg-ov-500 text-white" : "flex h-12 w-12 items-center justify-center rounded-2xl bg-ov-50 text-ov-600"}><p.icon aria-hidden="true" className="h-6 w-6" /></span>
              <p className={i === 1 ? "mt-5 text-[12px] font-semibold uppercase tracking-[0.16em] text-ov-300" : "mt-5 text-[12px] font-semibold uppercase tracking-[0.16em] text-ov-700"}>{p.tag}</p>
              <h3 className="ov-h3 mt-1">{p.title}</h3>
              <p className={i === 1 ? "mt-3 text-[15px] leading-relaxed text-white/70" : "mt-3 text-[15px] leading-relaxed text-ink-600"}>{p.text}</p>
              <ul className="mt-5 space-y-2">
                {p.punkte.map((x) => <li key={x} className={i === 1 ? "flex gap-2 text-[14.5px] text-white/85" : "flex gap-2 text-[14.5px] text-ink-700"}><BadgeCheck aria-hidden="true" className={i === 1 ? "mt-0.5 h-4 w-4 shrink-0 text-ov-300" : "mt-0.5 h-4 w-4 shrink-0 text-ov-600"} />{x}</li>)}
              </ul>
              <p className={i === 1 ? "mt-auto pt-6 font-display text-[18px] font-bold text-white" : "mt-auto pt-6 font-display text-[18px] font-bold text-ink-900"}>Preis auf Anfrage</p>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section tone="green" space="lg">
        <SectionHeading eyebrow="Wechsel" title="Wechseln, ohne dass der Strom stockt" lead="Bestehende Gemeinschaften wechseln zu uns, ohne ihre Zählpunkte neu anzumelden." className="mb-10 md:mb-12" />
        <Steps items={WECHSEL} cols={4} />
      </Section>

      <Section tone="white" space="lg">
        <SectionHeading eyebrow="Seit 1. Oktober 2026" title="Was das ElWG für Gemeinschaften ändert" lead="Bestehende Gemeinschaften werden übergeführt; Verträge und Statuten sollten angepasst werden. Die Plattform bildet die neuen Regeln ab." className="mb-10 md:mb-12" />
        <FeatureGrid items={ELWG} cols={4} />
        <p className="mt-6 text-[13px] leading-relaxed text-ink-500">Quellen: ElWG BGBl. I Nr. 91/2025 (§§ 65–72), SNE-V 2018 § 5 Abs. 1a, Koordinationsstelle für Energiegemeinschaften (FAQ zum ElWG). Keine Rechts- oder Steuerberatung; Details der neuen Netzentgelt-Verordnung zu bestätigen.</p>
      </Section>

      <Section tone="sand" space="lg" id="anfrage" className="scroll-mt-24">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <SectionHeading eyebrow="Anfrage" title="Gründen, wechseln oder betreiben lassen" lead="Erzählen Sie uns kurz, wo Ihre Gemeinschaft steht. Wir melden uns mit einem konkreten Vorschlag und Angebot." />
          <Reveal className="rounded-[2rem] bg-white p-6 shadow-xl ring-1 ring-ink-200/70 sm:p-8 md:p-10">
            <AnfrageMitDaten
              legende="Ihre Gemeinschaft"
              festeDaten={{ quelle: "energiegemeinschaften-software", land: "AT" }}
              zusatz={[
                { name: "anliegen", label: "Worum geht es?", art: "chips", optionen: [{ id: "software", label: "Software" }, { id: "betrieb", label: "Betriebsführung" }, { id: "gruendung", label: "Gründung" }, { id: "wechsel", label: "Wechsel" }] },
                { name: "modell", label: "Modell", art: "select", optionen: [{ id: "eeg_lokal", label: "EEG lokal" }, { id: "eeg_regional", label: "EEG regional" }, { id: "beg", label: "BEG" }, { id: "gea", label: "GEA" }, { id: "offen", label: "Noch offen" }] },
                { name: "zaehlpunkte", label: "Zählpunkte (ungefähr)", art: "zahl", platzhalter: "z. B. 60" },
                { name: "erzeugungKw", label: "Erzeugungsleistung kW (ungefähr)", art: "zahl", platzhalter: "z. B. 120" },
              ]}
              formular={{ typ: "energiegemeinschaft", felder: ["firma", "telefon", "plz", "nachricht"], button: "Anfrage senden" }}
            />
          </Reveal>
        </div>
      </Section>

      <Section tone="white" space="lg">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <SectionHeading eyebrow="Häufige Fragen" title="Plattform und Betrieb" lead="Was Vorstände und Gemeinden vor dem Start wissen möchten." />
          <Faq items={FAQ} />
        </div>
      </Section>

      <Querverweise items={QUERVERWEISE} />
      <CtaBand eyebrow="Gemeinschaft stärken" title="Weniger Verwaltung, mehr Gemeinschaftsstrom." text="Ob neue Gemeinschaft oder Wechsel: Wir zeigen Ihnen die Plattform an Ihren eigenen Zahlen." primary={{ label: "Angebot anfragen", href: "#anfrage" }} secondary={{ label: "Zum Rechner", href: "/energiegemeinschaften/rechner" }} />
    </div>
  );
}
