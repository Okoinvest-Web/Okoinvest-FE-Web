// src/app/flaeche-verpachten/page.js – Landingpage für Flächeneigentümer

import Link from "next/link";
import {
  ArrowRight, BadgePercent, CalendarClock, Check, ClipboardCheck, FileSignature, HandCoins, KeyRound, LayoutDashboard,
  Landmark, Lock, PlugZap, Route, Scale, ScrollText, ShieldCheck, Sprout, TrendingUp, Wheat,
} from "lucide-react";

import PageHero from "@/components/ui/PageHero";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Steps from "@/components/ui/Steps";
import Reveal from "@/components/ui/Reveal";
import Faq from "@/components/ui/Faq";
import CtaBand from "@/components/ui/CtaBand";
import Querverweise from "@/components/Reusable/Querverweise";
import AnfrageFormular from "@/components/Plattform/AnfrageFormular";
import { abs } from "@/data/site";
import { PACHT, PROVISION, STAND } from "@/lib/invest/markt";
import { fmt, fmtEur } from "@/lib/rechner/annahmen";
import { pachtRechnung } from "@/lib/rechner/pacht";

const PFAD = "/flaeche-verpachten";
const TITEL = "Fläche für Solarpark verpachten | ÖkoInvest";
const BESCHREIBUNG =
  "Acker oder Grünland für einen Solarpark verpachten: Pachtmodelle, Vertragsinhalte, Rückbausicherheit, Steuern und der Weg bis zur ersten Pacht – kostenfrei.";

export const metadata = {
  title: TITEL,
  description: BESCHREIBUNG,
  alternates: { canonical: abs(PFAD) },
  openGraph: {
    type: "website",
    locale: "de_DE",
    url: abs(PFAD),
    siteName: "ÖkoInvest",
    title: TITEL,
    description: BESCHREIBUNG,
    images: [{ url: abs("/img/freiflaeche-begehung.jpg"), width: 1280, height: 852, alt: "Begehung einer Fläche für einen Solarpark" }],
  },
};

const BEISPIEL_HA = 10;
const fest = pachtRechnung({ ha: BEISPIEL_HA, modell: "fest" });
const index = pachtRechnung({ ha: BEISPIEL_HA, modell: "index" });
const umsatz = pachtRechnung({ ha: BEISPIEL_HA, modell: "umsatz", umsatzAnteil: 0.06 });
const tsd = (v) => `${fmt(Math.round(v / 1000))} Tsd. €`;

const FAQ = [
  {
    q: "Wie viel Pacht bekomme ich für einen Solarpark?",
    a: `Für Freiflächen-PV liegen die Pachten im DACH-Raum derzeit meist zwischen ${fmt(PACHT.freiflaecheProHa.min)} und ${fmt(PACHT.freiflaecheProHa.max)} € je Hektar und Jahr, typisch um ${fmt(PACHT.freiflaecheProHa.mittel)} €. Entscheidend sind Netzanschluss, Größe, Einstrahlung und ob die Fläche in der EEG-Kulisse liegt. Das ist ein Vielfaches der üblichen Ackerpacht von durchschnittlich rund ${fmt(PACHT.ackerProHa)} € je Hektar.`,
  },
  {
    q: "Kostet mich die Prüfung oder der Vertrag etwas?",
    a: `Nein. ${PROVISION.flaeche.text[0].toUpperCase()}${PROVISION.flaeche.text.slice(1)} – Flächencheck, Pachtangebot, Vertragsentwurf und Notartermin für die Dienstbarkeit tragen wir. Eine anwaltliche oder steuerliche Prüfung auf Ihrer Seite empfehlen wir ausdrücklich; auf Wunsch beteiligen wir uns an den Kosten.`,
  },
  {
    q: "Ab wann wird die Pacht gezahlt?",
    a: `Die volle Pacht beginnt in der Regel mit Baubeginn oder Inbetriebnahme. Bis dahin – meist 2 bis 4 Jahre – zahlen wir eine Reservierungsprämie von typischerweise ${fmt(PACHT.reservierungProHa.min)}–${fmt(PACHT.reservierungProHa.max)} € je Hektar und Jahr, und Sie bewirtschaften die Fläche weiter wie bisher.`,
  },
  {
    q: "Was passiert, wenn der Solarpark doch nicht gebaut wird?",
    a: "Dann endet der Vertrag nach Ablauf einer vereinbarten Frist automatisch oder durch Rücktritt, die Dienstbarkeit wird gelöscht und Sie haben Ihre Fläche uneingeschränkt zurück. Bereits gezahlte Reservierungsprämien behalten Sie.",
  },
  {
    q: "Kann ich die Fläche während der Laufzeit verkaufen oder vererben?",
    a: "Ja. Der Pachtvertrag und die Dienstbarkeit im Grundbuch gehen auf Käufer oder Erben über – die Pacht auch. Für die Erbschaftsteuer kann die Verpachtung an einen Solarpark allerdings nachteilig sein; lassen Sie das vor der Unterschrift steuerlich prüfen.",
  },
  {
    q: "Was ist, wenn ich die Fläche bereits an einen Landwirt verpachtet habe?",
    a: "Das ist häufig. Landpachtverträge lassen sich meist mit Frist kündigen oder für Teilflächen anpassen. Wir planen die Kündigungsfristen in den Zeitplan ein und sprechen auf Wunsch mit Ihrem Pächter – oft kann er die Pflege der Fläche, etwa durch Beweidung, übernehmen.",
  },
  {
    q: "Wie sicher ist der Rückbau nach 30 Jahren?",
    a: "Die Rückbaupflicht steht im Vertrag und in der Dienstbarkeit. Zusätzlich hinterlegt der Betreiber vor Baubeginn eine Rückbaubürgschaft einer Bank oder Versicherung. Fällt der Betreiber aus, kann aus der Bürgschaft zurückgebaut werden.",
  },
];

export default function FlaecheVerpachtenPage() {
  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            name: "Pacht von Flächen für Solarparks",
            serviceType: "Flächenpacht für Freiflächen-Photovoltaik",
            provider: { "@id": `${abs("/")}/#organization` },
            areaServed: ["DE", "AT", "CH"],
            audience: { "@type": "Audience", audienceType: "Flächeneigentümer und Landwirte" },
            url: abs(PFAD),
            description: BESCHREIBUNG,
          }),
        }}
      />

      <PageHero
        breadcrumbs={[{ name: "Fläche verpachten" }]}
        eyebrow="Für Flächeneigentümer"
        title={<>Ihre Fläche. <span className="ov-text-gradient">30 Jahre</span> planbare Einnahmen.</>}
        lead="Verpachten Sie Acker, Grünland oder Konversionsfläche für einen Solarpark: mit fairer Pacht, Rückbausicherheit im Grundbuch und einem Ansprechpartner, der Ihnen den Stand jederzeit im Portal zeigt."
        image={{ src: "/img/freiflaeche-begehung.jpg", alt: "Projektteam bei der Begehung einer landwirtschaftlichen Fläche" }}
        actions={[
          { label: "Fläche prüfen lassen", href: "#anfrage" },
          { label: "Pacht berechnen", href: "/rechner/pacht" },
        ]}
        points={["Prüfung & Vertrag kostenfrei", "Rückbaubürgschaft ab Baubeginn", "Weiter bewirtschaften bis zum Bau", "Status jederzeit im Portal"]}
        badge={
          <div>
            <p className="text-[12.5px] font-medium text-ink-500">Beispiel {BEISPIEL_HA} ha, Festpacht</p>
            <p className="mt-1 font-display text-[28px] font-extrabold leading-none tracking-tight text-ink-900">
              {fmtEur(fest.ersteJahrespacht)}<span className="text-[15px] font-bold text-ink-500"> / Jahr</span>
            </p>
            <p className="mt-2 text-[13px] leading-snug text-ink-600">
              rund <strong className="text-ov-700">{fmt(fest.faktorAcker, 0)}-mal</strong> so viel wie die durchschnittliche Ackerpacht
            </p>
          </div>
        }
      />

      {/* Pachtmodelle */}
      <Section tone="white" space="lg">
        <SectionHeading
          eyebrow="Pachtmodelle"
          title="Vier Bausteine – Sie entscheiden, was zu Ihnen passt."
          lead={`Beispielrechnung für ${BEISPIEL_HA} Hektar in Süddeutschland über ${PACHT.laufzeit} Jahre. Ihre Werte rechnen Sie im Pachtrechner.`}
          className="mb-12"
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { icon: Lock, t: "Festpacht", k: `${fmt(PACHT.freiflaecheProHa.mittel)} €/ha`, x: "Ein fester Betrag je Hektar und Jahr. Maximal planbar, aber ohne Inflationsausgleich.", s: `${tsd(fest.summeSolar)} in ${PACHT.laufzeit} J.` },
            { icon: TrendingUp, t: "Indexiert", k: `+${fmt(PACHT.indexierung * 100, 1)} % p. a.`, x: "Festpacht, die an den Verbraucherpreisindex gekoppelt ist – oder mit fester Staffel steigt.", s: `${tsd(index.summeSolar)} in ${PACHT.laufzeit} J.` },
            { icon: BadgePercent, t: "Umsatzbeteiligung", k: `${fmt(PACHT.umsatzbeteiligung.min * 100)}–${fmt(PACHT.umsatzbeteiligung.max * 100)} %`, x: "Anteil an den Stromerlösen, meist mit Mindestpacht als Untergrenze. Sie profitieren von hohen Strompreisen.", s: `${tsd(umsatz.summeSolar)} in ${PACHT.laufzeit} J. (6 %)` },
            { icon: CalendarClock, t: "Reservierungsprämie", k: `${fmt(PACHT.reservierungProHa.min)}–${fmt(PACHT.reservierungProHa.max)} €/ha`, x: "Jährlich ab Unterschrift bis Baubeginn – zusätzlich zur weiterlaufenden Bewirtschaftung.", s: "zusätzlich, bis Baubeginn" },
          ].map((m, i) => (
            <Reveal key={m.t} delay={i * 70} className="flex flex-col rounded-3xl bg-sand-50 p-6 ring-1 ring-ink-200/60 md:p-7">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-ov-600 ring-1 ring-ink-200">
                <m.icon aria-hidden="true" className="h-5 w-5" />
              </span>
              <h3 className="mt-5 font-display text-[19px] font-bold text-ink-900">{m.t}</h3>
              <p className="ov-num mt-1 font-display text-[24px] font-extrabold tracking-tight text-ov-700">{m.k}</p>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-600">{m.x}</p>
              <p className="ov-num mt-auto pt-5 text-[13.5px] font-semibold text-ink-800">{m.s}</p>
            </Reveal>
          ))}
        </div>

        {/* Vergleich Acker */}
        <Reveal className="mt-10 rounded-3xl bg-white p-6 ring-1 ring-ink-200/70 md:p-8">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h3 className="font-display text-[19px] font-bold text-ink-900">{BEISPIEL_HA} ha über {PACHT.laufzeit} Jahre im Vergleich</h3>
            <Link href="/rechner/pacht" className="inline-flex items-center gap-1.5 text-[14.5px] font-semibold text-ov-700 hover:text-ov-800">
              Mit eigenen Werten rechnen <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-6 space-y-4">
            {[
              { l: "Solarpacht indexiert", v: index.summeSolar, c: "bg-ov-600" },
              { l: "Solarpacht fest", v: fest.summeSolar, c: "bg-ov-400" },
              { l: "Deckungsbeitrag Ackerbau (selbst bewirtschaftet)", v: fest.summeDb, c: "bg-sun-400" },
              { l: "Ackerpacht (Durchschnitt DE)", v: fest.summeAcker, c: "bg-ink-300" },
            ].map((b) => (
              <div key={b.l}>
                <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[14px]">
                  <span className="text-ink-700">{b.l}</span>
                  <span className="ov-num shrink-0 font-semibold text-ink-900">{tsd(b.v)}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-ink-100">
                  <div className={`h-full rounded-full ${b.c}`} style={{ width: `${(b.v / index.summeSolar) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-5 text-[12.5px] leading-relaxed text-ink-500">
            Nominal, vor Steuern; Ackerpacht {fmt(PACHT.ackerProHa)} €/ha und Deckungsbeitrag {fmt(PACHT.deckungsbeitragAcker.mittel)} €/ha jeweils mit {fmt(PACHT.indexierung * 100, 1)} % p. a. fortgeschrieben. Stand {STAND}.
          </p>
        </Reveal>
      </Section>

      {/* Vertrag */}
      <Section tone="sand" space="lg">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <SectionHeading
            eyebrow="Der Pachtvertrag"
            title="Was im Vertrag steht – und warum."
            lead="Ein Solarpark-Pachtvertrag ist ein Nutzungsvertrag über Jahrzehnte. Wir legen ihn offen vor, erklären jede Klausel und geben Ihnen Zeit für die Prüfung mit Anwalt oder Verband."
          />
          <ul className="grid gap-3 sm:grid-cols-2">
            {[
              { icon: CalendarClock, t: "Laufzeit", x: `${PACHT.laufzeit} Jahre ab Inbetriebnahme, dazu ${PACHT.verlaengerung} für den Betreiber – an eine höhere Pacht gekoppelt.` },
              { icon: ScrollText, t: "Dienstbarkeit im Grundbuch", x: "Beschränkte persönliche Dienstbarkeit für Anlage, Kabel und Zufahrt – Voraussetzung für jede Bankfinanzierung." },
              { icon: ShieldCheck, t: "Rückbaubürgschaft", x: "Rückbau und Wiederherstellung sind Pflicht des Betreibers, abgesichert durch eine Bank- oder Versicherungsbürgschaft." },
              { icon: Sprout, t: "Bewirtschaftung & Pflege", x: "Bis Baubeginn bewirtschaften Sie weiter. Im Betrieb Pflege durch Mahd oder Beweidung – gern durch Sie oder Ihren Pächter, gegen Vergütung." },
              { icon: Route, t: "Wegerecht & Kabeltrasse", x: "Zufahrt und Kabel über Ihre oder fremde Flurstücke werden gesondert gesichert und entschädigt." },
              { icon: KeyRound, t: "Rücktritt & Fristen", x: "Klare Fristen, bis wann Baurecht und Netz vorliegen müssen. Scheitert das Projekt, erhalten Sie Ihre Fläche frei zurück." },
              { icon: HandCoins, t: "Pacht & Zahlungstermin", x: "Pachtmodell, Indexierung, Fälligkeit (meist jährlich im Voraus) und Reservierungsprämie bis Baubeginn." },
              { icon: Scale, t: "Rechtsnachfolge & Haftung", x: "Vertrag bindet Erben und Käufer; Betreiber versichert Anlage und Haftpflicht und stellt Sie von Schäden frei." },
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

      {/* Steuern */}
      <Section tone="white" space="lg">
        <SectionHeading
          eyebrow="Steuern & Erbschaft"
          title="Vor der Unterschrift zur Steuerberatung."
          lead="Die Pacht ist attraktiv – steuerlich hat die Verpachtung für einen Solarpark aber Folgen, die Sie kennen sollten. Die Punkte unten sind eine Orientierung, keine Steuerberatung."
          className="mb-12"
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: HandCoins, t: "Einkommensteuer", x: "Pachteinnahmen sind steuerpflichtig – je nach Lage als Einkünfte aus Vermietung und Verpachtung oder, bei Betriebsvermögen, im landwirtschaftlichen Betrieb. Auch eine Entnahme aus dem Betriebsvermögen kann ein Thema sein." },
            { icon: Landmark, t: "Grundsteuer", x: "Solarpark-Flächen werden in Deutschland in der Regel nicht mehr als land- und forstwirtschaftliches Vermögen (Grundsteuer A), sondern als Grundvermögen (Grundsteuer B) bewertet. Bayern weicht davon ab. Die Grundsteuer übernimmt vertraglich oft der Betreiber." },
            { icon: Wheat, t: "Erbschaft & Schenkung", x: "Verpachtete Solarflächen fallen nach derzeitiger Verwaltungsauffassung meist aus dem begünstigten land- und forstwirtschaftlichen Vermögen. Verbände fordern eine Neuregelung; bei Agri-PV bleibt die landwirtschaftliche Nutzung erhalten. Früh gestalten lohnt sich." },
            { icon: FileSignature, t: "Umsatzsteuer", x: "Die Verpachtung von Grundstücken ist grundsätzlich umsatzsteuerfrei, eine Option zur Umsatzsteuer ist möglich. Für pauschalierende Landwirte gelten Besonderheiten." },
          ].map((k, i) => (
            <Reveal key={k.t} delay={i * 70} className="rounded-3xl bg-sand-50 p-6 ring-1 ring-ink-200/60">
              <k.icon aria-hidden="true" className="h-6 w-6 text-ov-600" />
              <p className="mt-4 font-display text-[17px] font-bold text-ink-900">{k.t}</p>
              <p className="mt-2 text-[14.5px] leading-relaxed text-ink-600">{k.x}</p>
            </Reveal>
          ))}
        </div>
        <p className="mt-8 max-w-4xl text-[13.5px] leading-relaxed text-ink-500">
          Deutschland, Stand {STAND}; in Österreich und der Schweiz gelten eigene Regeln (z. B. Einheitswert bzw. kantonales Steuerrecht). Die Rechtslage – insbesondere zur Erbschaftsteuer – ist in Bewegung. Bitte lassen Sie Ihren Fall vor Vertragsschluss von Ihrer Steuerberatung prüfen.
        </p>
      </Section>

      {/* Was wir prüfen */}
      <Section tone="green" space="lg">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <SectionHeading
            eyebrow="Was wir prüfen"
            title="Bevor wir Ihnen ein Angebot machen."
            lead="Kein Pachtangebot ins Blaue: Wir prüfen Ihre Fläche erst am Kartentisch und sagen Ihnen offen, wenn sie nicht passt – auch das ist eine Antwort, die Zeit spart."
          />
          <ul className="grid gap-2.5">
            {[
              "Lage im Regional- und Flächennutzungsplan, Haltung der Gemeinde",
              "Schutzgebiete, Biotope, Wasserschutz, Überschwemmungsgebiete",
              "EEG-Flächenkulisse bzw. Förderung in AT und CH",
              "Netzverknüpfungspunkt, freie Kapazität, Trassenverlauf",
              "Einstrahlung, Verschattung, Hangneigung und Zuschnitt",
              "Zufahrt, Baugrund, Leitungen und Altlasten",
              "Eigentumsverhältnisse, Grundbuch, bestehende Pachtverträge",
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

      {/* Weg */}
      <Section tone="white" space="lg">
        <SectionHeading eyebrow="Schritt für Schritt" title="Der Weg bis zur ersten Pachtzahlung" align="center" className="mb-14" />
        <Steps
          cols={3}
          items={[
            { icon: ClipboardCheck, title: "Flächencheck", text: "Sie nennen Flurstücke oder zeichnen die Fläche ein. Wir prüfen kostenfrei am Kartentisch – Rückmeldung in der Regel innerhalb weniger Wochen." },
            { icon: HandCoins, title: "Pachtangebot", text: "Sie erhalten ein schriftliches Angebot mit Pachtmodell und Vertragsentwurf – und so viel Zeit, wie Sie für die Prüfung brauchen." },
            { icon: FileSignature, title: "Vertrag & Grundbuch", text: "Unterschrift, notarielle Dienstbarkeit. Ab jetzt läuft die Reservierungsprämie, Sie bewirtschaften weiter." },
            { icon: PlugZap, title: "Netz & Baurecht", text: "Wir sichern den Netzanschluss und führen das Verfahren mit der Gemeinde. Jeder Meilenstein erscheint im Portal." },
            { icon: ShieldCheck, title: "Bürgschaft & Bau", text: "Vor Baubeginn wird die Rückbaubürgschaft hinterlegt. Der Bau selbst dauert meist nur wenige Monate." },
            { icon: Wheat, title: "Erste Pachtzahlung", text: "Mit Bau- bzw. Betriebsbeginn fließt die volle Pacht – für 30 Jahre und mehr." },
          ]}
        />
      </Section>

      {/* Portal + Formular */}
      <Section tone="sand" space="lg" id="anfrage" className="scroll-mt-24">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <SectionHeading
              eyebrow="Kostenlos & unverbindlich"
              title="Fläche melden – wir melden uns."
              lead="Nennen Sie uns Ort, Größe und wenn möglich die Flurstücke. Wir prüfen und melden uns in der Regel innerhalb von zwei Werktagen."
            />
            <Reveal className="ov-noise relative mt-8 overflow-hidden rounded-3xl bg-navy-950 p-6 text-white md:p-8">
              <div aria-hidden="true" className="ov-grid-bg absolute inset-0" />
              <div className="relative">
                <LayoutDashboard aria-hidden="true" className="h-7 w-7 text-ov-300" />
                <p className="mt-4 font-display text-[20px] font-bold">Status Ihrer Fläche jederzeit im Portal</p>
                <p className="mt-2 text-[15px] leading-relaxed text-white/70">
                  Prüfergebnis, Angebot, Vertragsentwürfe, Meilensteine von Netzanfrage bis Satzungsbeschluss und Nachrichten an Ihren Ansprechpartner – alles an einem Ort. Registrieren Sie sich mit derselben E-Mail, dann erscheint Ihre Anfrage automatisch.
                </p>
                <Link href="/registrieren?rolle=flaeche" className="mt-5 inline-flex items-center gap-2 text-[15px] font-semibold text-ov-300 hover:text-white">
                  Zugang zum Portal anlegen <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              </div>
            </Reveal>
          </div>
          <Reveal className="rounded-[2rem] bg-white p-6 shadow-[0_40px_80px_-50px_rgba(3,18,43,0.45)] ring-1 ring-ink-200/70 md:p-9">
            <AnfrageFormular
              typ="flaeche"
              daten={{ quelle: "flaeche-verpachten" }}
              felder={["telefon", "plz", "ort", "land", "nachricht"]}
              titel="Ihre Fläche"
              text="Bitte in der Nachricht ungefähre Größe, aktuelle Nutzung und – falls zur Hand – Gemarkung und Flurstücke angeben."
              button="Fläche melden"
            />
          </Reveal>
        </div>
      </Section>

      <Section tone="white" space="lg">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <SectionHeading eyebrow="Häufige Fragen" title="Fragen von Flächeneigentümern" lead="Ihre Frage ist nicht dabei? Stellen Sie sie im Formular – wir antworten persönlich." />
          <Faq items={FAQ} />
        </div>
      </Section>

      <Querverweise
        items={[
          { href: "/rechner/pacht", titel: "Pachtrechner", text: "Fest, indexiert oder Umsatzbeteiligung – Ihre Pacht über 30 Jahre im Vergleich zum Ackerbau." },
          { href: "/flaechencheck", titel: "Flächencheck", text: "Ampel, Leistung und Pachtspanne Ihrer Fläche in zwei Minuten." },
          { href: "/dachflaeche-verpachten", titel: "Dachfläche verpachten", text: "Gewerbe-, Hallen- und Stalldächer ab etwa 1.000 m² – Pacht, Dachstrom oder Sanierung als Gegenleistung." },
          { href: "/landwirte", titel: "Für Landwirte", text: "Verpachten, selbst investieren oder beteiligen – die vier Wege mit Agri-PV." },
        ]}
      />

      <CtaBand
        eyebrow="Für Flächeneigentümer kostenfrei"
        title="Was ist Ihre Fläche als Solarpark wert?"
        text="Zwei Minuten im Flächencheck – mit Ampel, möglicher Leistung und Pachtspanne. Das Ergebnis landet auf Wunsch direkt bei unserem Flächenteam."
        primary={{ label: "Zum Flächencheck", href: "/flaechencheck" }}
        secondary={{ label: "Pachtrechner", href: "/rechner/pacht" }}
      />
    </div>
  );
}
