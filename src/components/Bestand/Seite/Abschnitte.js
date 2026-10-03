// Weitere Abschnitte der Seite /bestandsanlagen: Perspektiven, Datenraum, Provision, Anfrage
import Link from "next/link";
import { ArrowRight, ArrowRightLeft, BadgePercent, Check, ClipboardList, FileSearch, FolderLock, Handshake, LineChart, Lock, ScrollText, Wrench } from "lucide-react";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import BestandAnfrage from "@/components/Bestand/BestandAnfrage";
import { pfad } from "@/lib/land";

/* ---------- Verkäufer und Käufer ---------- */
const SEITEN = [
  {
    t: "Gründe für den Verkauf",
    rolle: "Verkäufer",
    icon: Handshake,
    dunkel: false,
    punkte: [
      "Kapital freisetzen für neue Projekte oder den eigenen Betrieb",
      "Nachfolge, Erbfall oder Auflösung einer Betreibergesellschaft",
      "Portfolio bereinigen – kleine Anlagen, fremde Regionen",
      "Förderende naht: Marktrisiko an einen Spezialisten abgeben",
      "Anstehende Investitionen (Wechselrichter, Repowering) nicht selbst tragen",
      "Refinanzierung oder Bankauflagen",
    ],
  },
  {
    t: "Was Käufer suchen",
    rolle: "Käufer",
    icon: LineChart,
    dunkel: true,
    punkte: [
      "Belegte Erträge statt Prognosen – mehrere Betriebsjahre",
      "Möglichst lange Förderrestlaufzeit oder ein laufender PPA",
      "Gesicherte Fläche bzw. Dach über die gesamte Nutzungsdauer",
      "Vollständige Unterlagen: Abrechnungen, Wartung, Gutachten",
      "Potenzial: Repowering, Speicher am Netzanschluss, Direktvermarktung",
      "Klare Betriebsführung nach dem Übergang",
    ],
  },
];

export function Perspektiven() {
  return (
    <section data-abschnitt="perspektiven" aria-labelledby="perspektiven-titel" className="bg-white pb-20 pt-20 md:pb-28 md:pt-28">
      <div className="ov-container">
        <SectionHeading
          eyebrow="Verkäufer und Käufer"
          title={<span id="perspektiven-titel">Warum Bestandsanlagen den Besitzer wechseln.</span>}
          lead="Am Zweitmarkt treffen sich zwei Interessen: Der eine will Kapital freisetzen oder Risiko abgeben, der andere sucht planbaren Cashflow ohne Entwicklungs- und Baurisiko."
        />
        <div className="relative mt-10 grid gap-4 md:mt-12 lg:grid-cols-2 lg:gap-6">
          {/* Verbindungsknoten */}
          <span aria-hidden="true" className="absolute left-1/2 top-1/2 z-10 hidden h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-ov-600 shadow-e3 ring-1 ring-ink-200 lg:flex">
            <ArrowRightLeft className="h-5 w-5" />
          </span>
          {SEITEN.map((b, i) => (
            <Reveal
              key={b.t}
              delay={i * 80}
              className={cn(
                "relative overflow-hidden rounded-[1.75rem] p-6 md:p-9",
                b.dunkel ? "ov-verlauf-nacht ov-noise text-white" : "bg-sand-50 ring-1 ring-ink-200/60"
              )}
            >
              {b.dunkel && <div aria-hidden="true" className="ov-grid-bg absolute inset-0 opacity-40" />}
              <div className="relative">
                <div className="flex items-center gap-3">
                  <span className={cn("flex h-11 w-11 items-center justify-center rounded-2xl ring-1 ring-inset", b.dunkel ? "bg-white/10 text-ov-300 ring-white/15" : "bg-white text-ov-600 ring-ink-200")}>
                    <b.icon aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <span className={cn("text-[12.5px] font-semibold uppercase tracking-[0.14em]", b.dunkel ? "text-ov-300" : "text-ov-700")}>{b.rolle}</span>
                </div>
                <h3 className={cn("mt-5 font-display text-[22px] font-bold", b.dunkel ? "text-white" : "text-ink-900")}>{b.t}</h3>
                <ul className="mt-5 grid gap-3">
                  {b.punkte.map((p) => (
                    <li key={p} className={cn("flex items-start gap-3 text-[15px] leading-relaxed", b.dunkel ? "text-white/85" : "text-ink-700")}>
                      <span aria-hidden="true" className={cn("mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full", b.dunkel ? "bg-ov-400/20 text-ov-300 ring-1 ring-inset ring-ov-300/50" : "bg-ov-500 text-white")}>
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Datenraum ---------- */
const ORDNER = [
  { icon: Wrench, t: "Technisch", p: ["Ertragsdaten, Monitoring-Export", "Ertragsgutachten der Planung", "Wartungs- und Störungsprotokolle", "Thermografie, Kennlinien", "Anlagen- bzw. Einheitenzertifikat", "Pläne, Stringpläne, Datenblätter"] },
  { icon: ScrollText, t: "Rechtlich", p: ["Pacht- bzw. Dachnutzungsvertrag", "Dienstbarkeiten, Grundbuch", "Genehmigung bzw. Baurecht", "Netzanschlussvertrag", "Direktvermarktungs- oder PPA-Vertrag", "Rückbauverpflichtung, Sicherheiten"] },
  { icon: ClipboardList, t: "Kaufmännisch", p: ["Abrechnungen Netzbetreiber / Vermarkter", "Jahresabschlüsse der Gesellschaft", "Finanzierung, Sicherheiten, Covenants", "Versicherungen, Schadenhistorie", "Betriebsführungsverträge", "Marktstammdatenregister-Einträge"] },
];

export function Datenraum() {
  return (
    <section data-abschnitt="datenraum" aria-labelledby="datenraum-titel" className="bg-white py-20 md:py-28">
      <div className="ov-container">
        <SectionHeading
          eyebrow="Datenraum"
          title={<span id="datenraum-titel">Welche Unterlagen ein Käufer sehen will.</span>}
          lead="Je vollständiger der Datenraum, desto schneller die Prüfung – und desto geringer die Abschläge. Wir helfen beim Zusammenstellen und prüfen vor der Veröffentlichung auf Vollständigkeit."
        />
        <Reveal className="mt-10 overflow-hidden rounded-[1.75rem] bg-sand-50 ring-1 ring-ink-200/70 md:mt-12">
          {/* Fensterleiste */}
          <div className="flex items-center gap-3 border-b border-ink-200/70 bg-white px-5 py-3.5 md:px-7">
            <span aria-hidden="true" className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-ink-200" />
              <span className="h-2.5 w-2.5 rounded-full bg-ink-200" />
              <span className="h-2.5 w-2.5 rounded-full bg-ink-200" />
            </span>
            <p className="flex min-w-0 items-center gap-2 text-[13px] font-semibold text-ink-700">
              <FolderLock aria-hidden="true" className="h-4 w-4 shrink-0 text-ov-600" />
              <span className="truncate">Datenraum · {ORDNER.reduce((s, o) => s + o.p.length, 0)} Unterlagen<span className="max-sm:hidden"> in drei Ordnern</span></span>
            </p>
            <span className="ml-auto hidden items-center gap-1.5 rounded-full bg-ov-50 px-2.5 py-1 text-[11.5px] font-semibold text-ov-700 ring-1 ring-ov-200 sm:inline-flex">
              <Lock aria-hidden="true" className="h-3 w-3" /> nach NDA
            </span>
          </div>
          <div className="grid gap-4 p-4 md:grid-cols-3 md:p-6">
            {ORDNER.map((k, i) => (
              <div key={k.t} className="relative pt-3">
                {/* Reiter */}
                <span aria-hidden="true" className="absolute left-0 top-0 h-5 w-24 rounded-t-xl bg-white ring-1 ring-ink-200/70" />
                <div className="relative rounded-2xl rounded-tl-none bg-white p-5 shadow-e1 ring-1 ring-ink-200/70">
                  <div className="flex items-center gap-2.5">
                    <k.icon aria-hidden="true" className="h-5 w-5 text-ov-600" />
                    <h3 className="font-display text-[17px] font-bold text-ink-900">{k.t}</h3>
                    <span className="ov-num ml-auto text-[12px] text-ink-400">0{i + 1}</span>
                  </div>
                  <ul className="mt-4 divide-y divide-ink-100">
                    {k.p.map((x) => (
                      <li key={x} className="flex items-center gap-2.5 py-2 text-[14px] leading-snug text-ink-600">
                        <FileSearch aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-ink-300" />
                        {x}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- Provision ---------- */
export function Provision({ text, beispielWert, von, bis, maxProzent, boerse }) {
  return (
    <section data-abschnitt="provision" aria-labelledby="provision-titel" className="ov-verlauf-nacht ov-noise relative isolate overflow-hidden py-20 text-white md:py-28">
      <div aria-hidden="true" className="ov-grid-bg absolute inset-0 -z-10 opacity-40" />
      <div className="ov-container grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16">
        <SectionHeading dark eyebrow="Provision offen" title={<span id="provision-titel">Sie wissen vorher, was der Verkauf kostet.</span>} lead={text} />
        <Reveal className="rounded-[1.75rem] bg-white/[0.06] p-6 ring-1 ring-inset ring-white/12 md:p-8">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-ov-300 ring-1 ring-inset ring-white/15">
              <BadgePercent aria-hidden="true" className="h-5 w-5" />
            </span>
            <p className="text-[14px] text-white/70">Beispiel: Anlage mit Ertragswert {beispielWert}</p>
          </div>
          <p className="ov-num mt-5 font-display text-[34px] font-extrabold leading-tight text-white">
            {von}–{bis} Tsd. €
          </p>
          <p className="mt-1 text-[14px] leading-relaxed text-white/70">nur bei erfolgreichem Verkauf, auf den tatsächlichen Kaufpreis.</p>
          {/* Anteil am Kaufpreis */}
          <div className="mt-6" aria-hidden="true">
            <div className="flex h-3 overflow-hidden rounded-full bg-white/10">
              <span className="h-full flex-1 bg-ov-500/70" />
              <span className="h-full bg-sun-300" style={{ width: `${maxProzent}%` }} />
            </div>
            <div className="mt-2 flex justify-between text-[11.5px] text-white/55">
              <span>Kaufpreis</span>
              <span className="text-sun-300">Provision bis {maxProzent} %</span>
            </div>
          </div>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Button href={boerse} variant="white" pfeil>Bestand in der Börse</Button>
            <Button href="/projektboerse/anbieten" variant="outlineLight">Anlage anbieten</Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- Anfrage ---------- */
export function Anfrage() {
  return (
    <section id="anfrage" data-abschnitt="anfrage" aria-labelledby="anfrage-titel" className="relative scroll-mt-24 overflow-clip bg-sand-50 py-20 md:py-28">
      <div aria-hidden="true" className="pointer-events-none absolute -right-40 top-0 h-[480px] w-[480px] rounded-full bg-ov-200/40 blur-[120px]" />
      <div className="ov-container relative grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionHeading
            eyebrow="Kostenlos & unverbindlich"
            title={<span id="anfrage-titel">Anlage vorstellen oder Suchprofil hinterlegen.</span>}
            lead="Für Verkäufer: Eckdaten reichen für eine erste Einschätzung. Für Käufer: Wir melden uns, sobald eine passende Anlage in die Börse kommt."
          />
          <Reveal className="mt-8 rounded-3xl bg-white p-6 shadow-e1 ring-1 ring-ink-200/60 md:p-8">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ov-50 text-ov-600 ring-1 ring-ov-200">
              <FileSearch aria-hidden="true" className="h-5 w-5" />
            </span>
            <p className="mt-4 font-display text-[19px] font-bold text-ink-900">Erst rechnen, dann reden?</p>
            <p className="mt-2 text-[15px] leading-relaxed text-ink-600">
              Der Bewertungsrechner zeigt Ertragswert, Spanne, Wert je kWp und die wichtigsten Werttreiber Ihrer Anlage – ohne Anmeldung.
            </p>
            <Link href={pfad("/rechner/bestandsanlage")} className="group mt-5 inline-flex items-center gap-2 rounded text-[15px] font-semibold text-ov-700 hover:text-ov-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500">
              Zum Bewertungsrechner <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
            </Link>
          </Reveal>
        </div>
        <Reveal className="relative rounded-[2rem] bg-white p-6 shadow-e4 ring-1 ring-ink-200/70 md:p-9">
          <div aria-hidden="true" className="absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-ov-400 to-transparent" />
          <BestandAnfrage />
        </Reveal>
      </div>
    </section>
  );
}
