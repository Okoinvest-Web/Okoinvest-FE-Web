// src/app/dachflaeche-verpachten/page.js – Landingpage für Dacheigentümer (Gewerbe, Hallen, Landwirtschaft, Logistik)

import Link from "next/link";
import {
  ArrowRight, BadgePercent, Banknote, Building2, CalendarClock, Check, ClipboardCheck, Factory, FileSignature, Flame, HandCoins,
  Hammer, KeyRound, LayoutDashboard, Lock, PlugZap, Ruler, ScrollText, ShieldCheck, Tractor, Truck, Warehouse, Wrench, Zap,
} from "lucide-react";

import PageHero from "@/components/ui/PageHero";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import FeatureGrid from "@/components/ui/FeatureGrid";
import Steps from "@/components/ui/Steps";
import Reveal from "@/components/ui/Reveal";
import Faq from "@/components/ui/Faq";
import CtaBand from "@/components/ui/CtaBand";
import Querverweise from "@/components/Reusable/Querverweise";
import HallenSchnitt from "@/components/Dach/HallenSchnitt";
import DachAnfrage from "@/components/Dach/DachAnfrage";
import { abs } from "@/data/site";
import { DACH, PROVISION, STAND } from "@/lib/invest/markt";
import { fmt, fmtEur } from "@/lib/rechner/annahmen";
import { rechneDach } from "@/lib/rechner/dachpacht";

const PFAD = "/dachflaeche-verpachten";
const TITEL = "Dachfläche für Photovoltaik verpachten | ÖkoInvest";
const BESCHREIBUNG =
  "Gewerbe-, Hallen-, Agrar- oder Logistikdach ab 1.000 m² für PV verpachten: Pachtmodelle, Dachstrom, Sanierung, Vertrag, Steuern DACH und Ablauf – kostenfrei.";

export const metadata = {
  title: TITEL,
  description: BESCHREIBUNG,
  keywords: ["Dachfläche verpachten", "Dach verpachten Photovoltaik", "Dachpacht Gewerbedach", "Hallendach vermieten Solar", "Dachpacht pro m²"],
  alternates: { canonical: abs(PFAD) },
  openGraph: {
    type: "website",
    locale: "de_DE",
    url: abs(PFAD),
    siteName: "ÖkoInvest",
    title: TITEL,
    description: BESCHREIBUNG,
    images: [{ url: abs("/img/gewerbedach.jpg"), width: 1280, height: 852, alt: "Photovoltaikanlage auf einem Gewerbedach" }],
  },
};

const BEISPIEL_M2 = 5000;
const bsp = rechneDach({ m2: BEISPIEL_M2, dachart: "trapez", ausrichtung: "sued", regionId: "de-sued" });
const tsd = (v) => `${fmt(Math.round(v / 1000))} Tsd. €`;

const FAQ = [
  {
    q: "Ab welcher Dachgröße lohnt sich die Verpachtung?",
    a: `In der Regel ab rund ${fmt(DACH.mindestM2)} m² zusammenhängender, gut zugänglicher Fläche – das sind grob ${fmt(DACH.mindestM2 / DACH.dacharten[0].m2ProKwp)} kWp oder mehr. Kleinere Dächer rechnen sich für einen fremden Betreiber selten; dann ist eine eigene Anlage meist der bessere Weg. Mehrere Dächer an einem Standort oder in einer Gruppe lassen sich bündeln.`,
  },
  {
    q: "Wie viel Dachpacht ist realistisch?",
    a: `Als Orientierung ${fmt(DACH.pachtProM2.min, 2)}–${fmt(DACH.pachtProM2.max, 2)} € je m² und Jahr bzw. ${fmt(DACH.pachtProKwp.min)}–${fmt(DACH.pachtProKwp.max)} € je kWp. Höhere Werte sind möglich bei sehr großen, unverschatteten Dächern mit Netzanschluss am Gebäude oder einem Stromabnehmer vor Ort. Werbewerte von 4–5 €/m² sollten Sie gegenrechnen: Die Pacht muss zum Stromerlös passen, sonst wird die Anlage nicht gebaut – und eine unterschriebene, nie gebaute Anlage blockiert Ihr Dach.`,
  },
  {
    q: "Was passiert, wenn das Dach während der Laufzeit saniert werden muss?",
    a: "Das regelt der Vertrag: Der Betreiber demontiert und montiert die Anlage auf Anforderung – wer die Kosten trägt und wie ein Ertragsausfall behandelt wird, wird vorab festgelegt. Am besten wird ein sanierungsbedürftiges Dach vor der Belegung erneuert; das kann auch Teil der Gegenleistung des Betreibers sein.",
  },
  {
    q: "Wer haftet bei Schäden am Dach oder bei einem Brand?",
    a: "Der Betreiber versichert die Anlage (Allgefahren/Elektronik) und seine Haftpflicht und stellt Sie von Schäden frei, die durch Anlage, Montage oder Wartung entstehen. Ihre Gebäudeversicherung informieren Sie vor dem Bau; manche Versicherer verlangen zusätzliche Brandschutzmaßnahmen. Planung und Ausführung nach anerkannten Regeln (z. B. VDE-Normen, Brandschutz-Richtlinien der Versicherer) schreiben wir in den Vertrag.",
  },
  {
    q: "Kann ich das Gebäude trotzdem verkaufen oder vermieten?",
    a: "Ja. Eine beschränkte persönliche Dienstbarkeit im Grundbuch sichert die Anlage auch gegenüber Käufern; der Vertrag geht auf den Erwerber über. Bestehende Mietverträge im Gebäude sollten den Dachzugang und – falls gewünscht – die Stromlieferung an den Mieter berücksichtigen.",
  },
  {
    q: "Kann ich den Strom vom eigenen Dach günstig beziehen?",
    a: `Ja, das ist oft der größte Hebel: Der Betreiber liefert Ihnen den Dachstrom per Vertrag (On-Site-PPA), typischerweise für ${fmt(DACH.ppaVorOrtCt.min)}–${fmt(DACH.ppaVorOrtCt.max)} ct/kWh netto – deutlich unter üblichen Gewerbestrompreisen, weil für Strom, der das Gebäude nicht verlässt, keine Netzentgelte anfallen. Den restlichen Bedarf können Sie über unseren Reststrom-Pool beziehen.`,
  },
  {
    q: "Was kostet mich die Prüfung?",
    a: `Nichts. ${PROVISION.flaeche.text[0].toUpperCase()}${PROVISION.flaeche.text.slice(1)} – das gilt auch für Dächer. Erstprüfung, Angebot und Vertragsentwurf sind kostenfrei; ein Statikgutachten beauftragen und bezahlen wir, wenn das Projekt weiterverfolgt wird.`,
  },
];

export default function DachflaecheVerpachtenPage() {
  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            name: "Dachpacht für Photovoltaik",
            serviceType: "Pacht und Nutzung großer Dachflächen für Photovoltaikanlagen",
            provider: { "@id": `${abs("/")}/#organization` },
            areaServed: ["DE", "AT", "CH"],
            audience: { "@type": "BusinessAudience", audienceType: "Eigentümer von Gewerbe-, Hallen-, Landwirtschafts- und Logistikdächern" },
            url: abs(PFAD),
            description: BESCHREIBUNG,
          }),
        }}
      />

      <PageHero
        breadcrumbs={[{ name: "Dachfläche verpachten" }]}
        eyebrow="Für Dacheigentümer"
        title={<>Ihr Dach arbeitet. <span className="ov-text-gradient">Sie kassieren die Pacht.</span></>}
        lead="Verpachten Sie Gewerbe-, Hallen-, Landwirtschafts- oder Logistikdächer ab rund 1.000 m² für Photovoltaik – als feste Pacht, Einmalzahlung, mit günstigem Dachstrom oder im Tausch gegen ein saniertes Dach. Geplant und gebaut von einer Gruppe, die seit 2010 Gewerbedächer belegt."
        image={{ src: "/img/gewerbedach.jpg", alt: "Photovoltaikanlage auf einem großen Gewerbedach" }}
        actions={[
          { label: "Dach prüfen lassen", href: "#anfrage" },
          { label: "Dachpacht berechnen", href: "/rechner/dachpacht" },
        ]}
        points={["Prüfung & Angebot kostenfrei", "Pacht, Dachstrom oder Sanierung", "Statik und Brandschutz geprüft", "Status jederzeit im Portal"]}
        badge={
          <div>
            <p className="text-[12.5px] font-medium text-ink-500">Beispiel {fmt(BEISPIEL_M2)} m² Trapezdach, Süd</p>
            <p className="mt-1 font-display text-[28px] font-extrabold leading-none tracking-tight text-ink-900">
              {fmtEur(bsp.pachtJahr)}<span className="text-[15px] font-bold text-ink-500"> / Jahr</span>
            </p>
            <p className="mt-2 text-[13px] leading-snug text-ink-600">
              rund <strong className="text-ov-700">{fmt(bsp.kwp)} kWp</strong> · {tsd(bsp.wege.pacht.summe)} in {DACH.laufzeit} Jahren
            </p>
          </div>
        }
      />

      {/* Für welche Dächer */}
      <Section tone="white" space="lg">
        <SectionHeading
          eyebrow="Für welche Dächer"
          title="Große Dächer, die sonst nur Regen abhalten."
          lead={`Entscheidend sind Größe, Tragreserve, Zustand und ein erreichbarer Netzanschluss. Ab rund ${fmt(DACH.mindestM2)} m² wird ein Dach für einen Betreiber interessant – mehrere Dächer an einem Standort zählen zusammen.`}
          className="mb-12"
        />
        <FeatureGrid
          cols={4}
          items={[
            { icon: Factory, title: "Gewerbe & Produktion", text: "Hoher Tagesverbrauch im Gebäude – ideal für günstigen Dachstrom zusätzlich zur Pacht." },
            { icon: Truck, title: "Logistik & Lager", text: "Sehr große, zusammenhängende Flächen, oft neu gebaut und statisch gut dimensioniert." },
            { icon: Tractor, title: "Landwirtschaft", text: "Maschinenhallen, Ställe, Lagerhallen – Achtung bei alten Faserzement-Eindeckungen." },
            { icon: Warehouse, title: "Handel & Hallen", text: "Märkte, Sporthallen, Werkstätten: Dachpacht ohne eigenes Kapital und ohne Betriebsaufwand." },
          ]}
        />
      </Section>

      {/* Modelle */}
      <Section tone="sand" space="lg">
        <SectionHeading
          eyebrow="Fünf Modelle"
          title="Pacht, Einmalbetrag, Dachstrom – oder ein neues Dach."
          lead={`Beispielwerte für ein ${fmt(BEISPIEL_M2)}-m²-Trapezdach in Süddeutschland (≈ ${fmt(bsp.kwp)} kWp, ${fmt(bsp.kwhJahr1 / 1000)} MWh im Jahr) über ${DACH.laufzeit} Jahre. Ihre Werte rechnen Sie im Dachpacht-Rechner.`}
          className="mb-12"
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {[
            { icon: Lock, t: "Dachpacht fest", k: `${fmt(DACH.pachtProM2.min, 2)}–${fmt(DACH.pachtProM2.max, 2)} €/m²`, x: `Fester Betrag je m² oder je kWp (${fmt(DACH.pachtProKwp.min)}–${fmt(DACH.pachtProKwp.max)} €/kWp) und Jahr – auf Wunsch indexiert. Maximal planbar.`, s: `${fmtEur(bsp.pachtJahr)} pro Jahr` },
            { icon: Banknote, t: "Einmalzahlung", k: "Barwert", x: "Alle künftigen Pachten abgezinst auf einen Betrag bei Baubeginn – etwa für Sanierung, Investition oder Tilgung.", s: `ca. ${tsd(bsp.einmalzahlung)} einmalig` },
            { icon: BadgePercent, t: "Umsatzbeteiligung", k: `${fmt(DACH.umsatzbeteiligung.min * 100)}–${fmt(DACH.umsatzbeteiligung.max * 100)} %`, x: "Anteil an den Stromerlösen, meist mit Mindestpacht. Steigt mit dem Strompreis – schwankt aber mit Ertrag und Markt.", s: `ca. ${fmtEur(bsp.erloesVoll * 0.06)} bei 6 %` },
            { icon: Zap, t: "Dachstrom (PPA)", k: `${fmt(DACH.ppaVorOrtCt.min)}–${fmt(DACH.ppaVorOrtCt.max)} ct/kWh`, x: "Sie oder Ihr Mieter beziehen den Strom direkt vom Dach – ohne Netzentgelte für diesen Anteil. Pacht dafür meist reduziert.", s: `Barwert ca. ${tsd(bsp.wege.ppa.barwert)} (40 % Eigenverbrauch)` },
            { icon: Hammer, t: "Dachsanierung", k: "als Gegenleistung", x: "Der Betreiber finanziert die Neueindeckung ganz oder teilweise und verrechnet sie mit der Pacht. Sie erhalten ein neues Dach ohne Kapital.", s: `Neueindeckung ≈ ${fmt(bsp.sanierungInPachtjahren, 0)} Pachtjahre` },
          ].map((m, i) => (
            <Reveal key={m.t} delay={i * 60} className="flex flex-col rounded-3xl bg-white p-6 ring-1 ring-ink-200/60">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sand-50 text-ov-600 ring-1 ring-ink-200">
                <m.icon aria-hidden="true" className="h-5 w-5" />
              </span>
              <h3 className="mt-5 font-display text-[18px] font-bold text-ink-900">{m.t}</h3>
              <p className="ov-num mt-1 font-display text-[21px] font-extrabold tracking-tight text-ov-700">{m.k}</p>
              <p className="mt-3 text-[14.5px] leading-relaxed text-ink-600">{m.x}</p>
              <p className="ov-num mt-auto pt-5 text-[13.5px] font-semibold text-ink-800">{m.s}</p>
            </Reveal>
          ))}
        </div>
        <p className="mt-8 max-w-4xl text-[13px] leading-relaxed text-ink-500">
          Nominal und vor Steuern. Einmalzahlung abgezinst mit {fmt(DACH.einmalDiskont * 100, 1)} %; Stromerlöse bei Volleinspeisung mit {fmt(DACH.eegDachCt, 1)} ct/kWh (Durchschnitt der Dach-Ausschreibungen 2025). Modelle lassen sich kombinieren, etwa Mindestpacht plus Umsatzbeteiligung oder Sanierung plus reduzierte Pacht. Stand {STAND}.{" "}
          <Link href="/rechner/dachpacht" className="font-semibold text-ov-700 underline decoration-ov-300 underline-offset-2">
            Mit eigenen Werten rechnen
          </Link>
        </p>
      </Section>

      {/* Voraussetzungen */}
      <Section tone="white" space="lg">
        <SectionHeading
          eyebrow="Voraussetzungen"
          title="Was Ihr Dach mitbringen muss."
          lead="Vier Fragen entscheiden: Trägt es? Hält es lange genug? Ist der Brandschutz lösbar? Kommt der Strom ins Netz? Wir prüfen das mit Ihnen – und sagen offen, wenn ein Dach nicht passt."
          className="mb-10"
        />
        <HallenSchnitt />
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Ruler, t: "Statik", x: "Tragreserve für die Zusatzlast der Anlage – je nach Dach und System grob 12–25 kg/m² – plus Schnee- und Windlast am Standort. Nachweis durch einen Tragwerksplaner." },
            { icon: CalendarClock, t: "Restnutzungsdauer", x: `Die Dachhaut sollte mindestens so lange halten wie der Vertrag – als Faustwert ${DACH.restnutzungMinJahre} Jahre. Sonst zuerst sanieren; das spart später teure Demontagen.` },
            { icon: Flame, t: "Brandschutz", x: "Abstände zu Brandwänden, Lichtbändern und Rauchabzügen, geprüfte Kabelführung, Abschaltmöglichkeit für die Feuerwehr. Gebäudeversicherer früh einbinden." },
            { icon: PlugZap, t: "Netzanschluss", x: "Freie Kapazität am Hausanschluss oder im Netz in der Nähe. Größere Anlagen brauchen meist eine eigene Übergabestation; die Netzanfrage stellen wir." },
          ].map((k, i) => (
            <Reveal key={k.t} delay={i * 70} className="rounded-3xl bg-sand-50 p-6 ring-1 ring-ink-200/60">
              <k.icon aria-hidden="true" className="h-6 w-6 text-ov-600" />
              <p className="mt-4 font-display text-[17px] font-bold text-ink-900">{k.t}</p>
              <p className="mt-2 text-[14.5px] leading-relaxed text-ink-600">{k.x}</p>
            </Reveal>
          ))}
        </div>
        <Reveal className="mt-6 flex gap-3 rounded-3xl bg-sun-300/15 p-5 ring-1 ring-sun-400/50 md:p-6">
          <Hammer aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-sun-500" />
          <p className="text-[14.5px] leading-relaxed text-ink-700">
            <strong className="text-ink-900">Faserzement-Wellplatten</strong> – bei Gebäuden vor 1993 häufig asbesthaltig – dürfen nicht überbaut oder angebohrt werden. Solche Dächer belegen wir erst nach einer Sanierung. Die Neueindeckung kann Teil des Pachtmodells sein.
          </p>
        </Reveal>
      </Section>

      {/* Vertrag */}
      <Section tone="sand" space="lg">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <SectionHeading
            eyebrow="Der Dachnutzungsvertrag"
            title="Was im Vertrag steht – und warum."
            lead="Ein Dachvertrag bindet Ihr Gebäude für Jahrzehnte. Wir legen den Entwurf offen vor, erklären jede Klausel und geben Ihnen Zeit für die Prüfung mit Anwalt oder Verband."
          />
          <ul className="grid gap-3 sm:grid-cols-2">
            {[
              { icon: CalendarClock, t: "Laufzeit", x: `Meist ${DACH.laufzeit} Jahre ab Inbetriebnahme, dazu ${DACH.verlaengerung} – abgestimmt auf die Restnutzungsdauer des Dachs.` },
              { icon: ScrollText, t: "Dienstbarkeit", x: "Beschränkte persönliche Dienstbarkeit für Anlage, Kabelwege und Zugang – Voraussetzung für die Finanzierung, bindet auch Käufer." },
              { icon: ShieldCheck, t: "Rückbau", x: "Rückbau und Wiederherstellung der Dachhaut sind Pflicht des Betreibers, bei größeren Anlagen mit Sicherheit (Bürgschaft)." },
              { icon: HandCoins, t: "Versicherung & Haftung", x: "Betreiber versichert Anlage und Haftpflicht und stellt Sie frei. Abstimmung mit Ihrer Gebäudeversicherung vor dem Bau." },
              { icon: KeyRound, t: "Zugang & Betrieb", x: "Anmeldung, Zeiten, Laufwege, Absturzsicherung, Zugang für Wartung und Störungen – ohne Ihren Betrieb zu stören." },
              { icon: Hammer, t: "Dachsanierung in der Laufzeit", x: "Demontage und Remontage auf Anforderung, Kostenverteilung und Umgang mit dem Ertragsausfall – vorab geregelt." },
              { icon: Wrench, t: "Instandhaltung Dach", x: "Wer wartet Dachhaut, Entwässerung und Lichtbänder unter den Modulen? Klare Pflichten verhindern späteren Streit." },
              { icon: FileSignature, t: "Rechtsnachfolge & Mieter", x: "Übergang bei Verkauf oder Erbe; Regeln für Mieter im Gebäude, etwa für Dachzugang und Stromlieferung." },
            ].map((k, i) => (
              <Reveal as="li" key={k.t} delay={i * 50} className="rounded-3xl bg-white p-5 ring-1 ring-ink-200/60 md:p-6">
                <div className="flex items-center gap-3">
                  <k.icon aria-hidden="true" className="h-5 w-5 shrink-0 text-ov-600" />
                  <p className="font-display text-[16.5px] font-bold text-ink-900">{k.t}</p>
                </div>
                <p className="mt-2 text-[14.5px] leading-relaxed text-ink-600">{k.x}</p>
              </Reveal>
            ))}
          </ul>
        </div>
      </Section>

      {/* Recht & Steuern */}
      <Section tone="white" space="lg">
        <SectionHeading
          eyebrow="Recht & Steuern"
          title="Vor der Unterschrift zur Steuerberatung."
          lead="Die Dachpacht ist einfach – steuerlich kommt es darauf an, wem das Gebäude gehört und ob Sie selbst Strom erzeugen oder liefern. Die Punkte sind eine Orientierung nach aktuellem Stand, keine Rechts- oder Steuerberatung."
          className="mb-12"
        />
        <div className="grid gap-4 lg:grid-cols-3">
          {[
            {
              land: "Deutschland",
              punkte: [
                ["Einkommensteuer", "Dachpacht aus dem Privatvermögen sind in der Regel Einkünfte aus Vermietung und Verpachtung (§ 21 EStG); gehört das Gebäude zum Betriebsvermögen, sind es betriebliche Einnahmen."],
                ["Gewerbliche Infizierung", "Reine Dachvermietung ist keine gewerbliche Tätigkeit. Betreibt aber eine vermögensverwaltende Personengesellschaft selbst eine PV-Anlage, können nach § 15 Abs. 3 Nr. 1 EStG alle Einkünfte gewerblich werden – kleine, nach § 3 Nr. 72 EStG steuerfreie Anlagen sind davon ausgenommen. Deshalb häufig: Verpachten statt selbst betreiben."],
                ["Gewerbesteuer-Kürzung", "Wohnungs- und Grundstücksunternehmen mit erweiterter Kürzung (§ 9 Nr. 1 GewStG) sollten eigene Stromlieferungen vorab prüfen lassen – Einnahmen daraus sind nur in engen Grenzen unschädlich. Die bloße Dachvermietung ist nach aktuellem Stand unkritisch."],
                ["Grundsteuer", "Die PV-Anlage gilt in der Regel als Betriebsvorrichtung und gehört nicht zum Grundvermögen – die Grundsteuer des Gebäudes ändert sich durch die Dachpacht im Normalfall nicht."],
                ["Umsatzsteuer", "Dachvermietung ist grundsätzlich umsatzsteuerfrei (§ 4 Nr. 12 UStG), eine Option zur Steuerpflicht ist möglich. Wird eine Dachsanierung als Gegenleistung erbracht, liegt ein tauschähnlicher Umsatz vor – Rechnungen sauber gestalten."],
              ],
            },
            {
              land: "Österreich",
              punkte: [
                ["Einkommensteuer", "Dachpacht zählt bei Privatpersonen meist zu den Einkünften aus Vermietung und Verpachtung, im Betrieb zu den betrieblichen Einkünften."],
                ["Umsatzsteuer", "Die Vermietung von Grundstücksteilen ist grundsätzlich unecht steuerbefreit; eine Option zur Steuerpflicht ist unter Voraussetzungen möglich."],
                ["Sicherung & Genehmigung", "Absicherung über eine im Grundbuch eingetragene Dienstbarkeit. Bau- bzw. Anzeigepflichten regeln die Bauordnungen der Länder; Förderung (etwa EAG-Investitionszuschuss) beantragt der Betreiber."],
              ],
            },
            {
              land: "Schweiz",
              punkte: [
                ["Vertrag & Sicherung", "Üblich sind Dachmietverträge oder eine Dienstbarkeit (etwa ein Baurecht bzw. Personaldienstbarkeit im Grundbuch), damit die Anlage vom Gebäude getrennt bleibt."],
                ["Steuern", "Mietentgelte sind als Einkommen steuerbar; Behandlung und Abzüge richten sich nach kantonalem Recht. Frühzeitig mit der Treuhand klären."],
                ["Bewilligung & Förderung", "Genügend angepasste Solaranlagen auf Dächern sind nach Art. 18a RPG in vielen Fällen nur meldepflichtig. Die Einmalvergütung beantragt der Betreiber; Eigenverbrauch lässt sich über ZEV bzw. vZEV organisieren."],
              ],
            },
          ].map((l, i) => (
            <Reveal key={l.land} delay={i * 80} className="rounded-3xl bg-sand-50 p-6 ring-1 ring-ink-200/60 md:p-7">
              <p className="font-display text-[20px] font-bold text-ink-900">{l.land}</p>
              <dl className="mt-4 space-y-4">
                {l.punkte.map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-[14.5px] font-semibold text-ink-900">{k}</dt>
                    <dd className="mt-1 text-[14px] leading-relaxed text-ink-600">{v}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          ))}
        </div>
        <p className="mt-8 max-w-4xl text-[13.5px] leading-relaxed text-ink-500">
          Stand {STAND}. Steuerrecht und Förderbedingungen ändern sich; einzelne Punkte hängen stark von Rechtsform, Gebäudenutzung und Größe der Anlage ab. Bitte lassen Sie Ihren Fall vor Vertragsschluss von Ihrer Steuerberatung bzw. Treuhand prüfen.
        </p>
      </Section>

      {/* Gruppe */}
      <Section tone="green" space="lg">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <SectionHeading
            eyebrow="Warum mit uns"
            title="Wer Ihr Dach pachtet, sollte es auch bauen können."
            lead="Viele Angebote für Dachpacht kommen von reinen Vermittlern – gebaut wird später von jemand anderem, wenn überhaupt. Bei uns liegen Entwicklung, Bau und Betrieb in einer Gruppe."
          />
          <ul className="grid gap-2.5">
            {[
              "Die ÖKOVOLT Gruppe plant und baut seit 2010 PV-Anlagen und Speicher, auch auf Gewerbedächern",
              "Statik, Brandschutz und Netzanfrage aus einem Team, bevor Sie etwas unterschreiben",
              "Offene Konditionen: Pachtspannen und Rechenweg stehen auf dieser Seite und im Rechner",
              "Dachstrom für Sie oder Ihre Mieter – und den Reststrom gebündelt über unseren Strompool",
              "Betrieb, Wartung und Versicherung über die gesamte Laufzeit durch den Betreiber – nicht durch einen Vermittler",
              "Jeder Schritt – Prüfung, Angebot, Vertrag, Netz, Bau – im Portal sichtbar",
            ].map((t, i) => (
              <Reveal as="li" key={t} delay={i * 40} className="flex items-start gap-3 rounded-2xl bg-white px-4 py-3.5 text-[15px] text-ink-700 ring-1 ring-ov-100">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ov-500 text-white">
                  <Check aria-hidden="true" className="h-3 w-3" strokeWidth={3} />
                </span>
                {t}
              </Reveal>
            ))}
          </ul>
        </div>
      </Section>

      {/* Ablauf */}
      <Section tone="white" space="lg">
        <SectionHeading eyebrow="Schritt für Schritt" title="Vom Dachcheck bis zur ersten Pacht" align="center" className="mb-14" />
        <Steps
          cols={3}
          items={[
            { icon: ClipboardCheck, title: "Dachcheck", text: "Sie nennen Adresse, Dachart und Größe. Wir prüfen Luftbild, Verschattung, Netz und Eckdaten – Rückmeldung in der Regel innerhalb weniger Wochen." },
            { icon: Building2, title: "Begehung & Statik", text: "Vor-Ort-Termin, Zustand der Dachhaut, Brandschutz, Zugang. Das Statikgutachten beauftragen wir, wenn es weitergeht." },
            { icon: HandCoins, title: "Angebot & Vertrag", text: "Schriftliches Angebot mit Modell (Pacht, Einmalbetrag, Dachstrom, Sanierung) und Vertragsentwurf – mit Zeit für Ihre Prüfung." },
            { icon: PlugZap, title: "Netz & Genehmigung", text: "Netzanfrage, ggf. Ausschreibung oder Förderantrag, Abstimmung mit Versicherer und Feuerwehr. Jeder Meilenstein im Portal." },
            { icon: Wrench, title: "Bau", text: "Montage durch die Gruppe, meist in wenigen Wochen und abgestimmt auf Ihren Betrieb. Danach Abnahme und Dokumentation." },
            { icon: Banknote, title: "Pacht & Betrieb", text: "Ab Inbetriebnahme fließt die Pacht bzw. der Dachstrom. Wartung, Monitoring und Versicherung übernimmt der Betreiber." },
          ]}
        />
      </Section>

      {/* Formular */}
      <Section tone="sand" space="lg" id="anfrage" className="scroll-mt-24">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <SectionHeading
              eyebrow="Kostenlos & unverbindlich"
              title="Dach vorstellen – wir melden uns."
              lead="Nennen Sie uns Adresse, Dachart und ungefähre Größe. Wir prüfen und melden uns in der Regel innerhalb von zwei Werktagen."
            />
            <Reveal className="ov-noise relative mt-8 overflow-hidden rounded-3xl bg-navy-950 p-6 text-white md:p-8">
              <div aria-hidden="true" className="ov-grid-bg absolute inset-0" />
              <div className="relative">
                <LayoutDashboard aria-hidden="true" className="h-7 w-7 text-ov-300" />
                <p className="mt-4 font-display text-[20px] font-bold">Status Ihres Dachs jederzeit im Portal</p>
                <p className="mt-2 text-[15px] leading-relaxed text-white/70">
                  Prüfergebnis, Angebot, Vertragsentwürfe, Netzanfrage und Bautermine – alles an einem Ort. Registrieren Sie sich mit derselben E-Mail, dann erscheint Ihre Anfrage automatisch.
                </p>
                <Link href="/registrieren?rolle=flaeche" className="mt-5 inline-flex items-center gap-2 text-[15px] font-semibold text-ov-300 hover:text-white">
                  Zugang zum Portal anlegen <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              </div>
            </Reveal>
          </div>
          <Reveal className="rounded-[2rem] bg-white p-6 shadow-[0_40px_80px_-50px_rgba(3,18,43,0.45)] ring-1 ring-ink-200/70 md:p-9">
            <DachAnfrage />
          </Reveal>
        </div>
      </Section>

      <Section tone="white" space="lg">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <SectionHeading eyebrow="Häufige Fragen" title="Fragen von Dacheigentümern" lead="Ihre Frage ist nicht dabei? Stellen Sie sie im Formular – wir antworten persönlich." />
          <Faq items={FAQ} />
        </div>
      </Section>

      <Querverweise
        items={[
          { href: "/rechner/dachpacht", titel: "Dachpacht-Rechner", text: "Leistung, Ertrag und Pachtspanne Ihres Dachs – Pacht, Dachstrom und Eigeninvestition im Vergleich." },
          { href: "/reststrom", titel: "Reststrom-Pool", text: "Den Strom, den Sie trotz Dachanlage noch kaufen, gebündelt über das virtuelle Kraftwerk beziehen." },
          { href: "/flaeche-verpachten", titel: "Fläche verpachten", text: "Acker, Grünland oder Konversionsfläche für einen Solarpark verpachten." },
          { href: "/solarcarport", titel: "Solarcarport", text: "Parkplatz neben der Halle? Strom und Ladepunkte unter einem Dach." },
        ]}
      />

      <CtaBand
        eyebrow="Für Dacheigentümer kostenfrei"
        title="Was ist Ihr Dach als Kraftwerk wert?"
        text="Im Dachpacht-Rechner sehen Sie Leistung, Ertrag und Pachtspanne in einer Minute – und vergleichen Pacht, Dachstrom und Eigeninvestition."
        primary={{ label: "Zum Dachpacht-Rechner", href: "/rechner/dachpacht" }}
        secondary={{ label: "Dach vorstellen", href: "#anfrage" }}
      />
    </div>
  );
}
