// Was Mitglieder bekommen – Bento: große Dorf-Szene, zwei Funktions-Kacheln mit Mini-Grafik, Datenschutz-Leiste über die volle Breite
import { Check, Download, FileSignature, Leaf, PiggyBank, ShieldCheck, SlidersHorizontal, Sun, UserRound, UsersRound } from "lucide-react";
import { EnergiegemeinschaftDorf } from "@/components/illustrationen";
import Section from "@/components/ui/Section";
import SectionHeading from "@/components/ui/SectionHeading";
import Reveal from "@/components/ui/Reveal";
import { spracheDerAnfrage } from "@/lib/land/seite";

/* Sprachmodell: feste Texte je Sprache */
const WORTE = {
  de: {
    sichtbar: ["Erzeugung", "Anteil", "Ersparnis"],
    beitritt: ["Eignung", "Verträge", "SEPA", "Signatur", "Netz\u00adbetreiber"],
    aufteilung: ["EEG Ortskern", "BEG Region", "frei"],
    eyebrow: "Was Mitglieder bekommen", titelA: "Klar, ehrlich, ", titelB: "ohne Rückfragen",
    leadA: "Alles an einem Ort – auch auf dem Handy. Countdown, Ersparnis und grüne Stunden sehen Sie oben in der", tour: "Produkt-Tour",
    dorfAria: "Energiegemeinschaft im Dorf: Sonnenstrom fließt von den Dächern zu den Nachbarn", gemStrom: "Gemeinschaftsstrom",
    dorfTitel: "Strom aus der Nachbarschaft\u00a0– sichtbar gemacht", dorfText: "Wer sieht, woher sein Strom kommt, bleibt dabei. Das Portal macht Erzeugung, Anteil und Ersparnis jeden Tag greifbar.", taeglich: "Täglich im Portal",
    mehrOver: "Mehrere Gemeinschaften", mehrTitel: "Mehrfachteilnahme", mehrText: "Ein Zählpunkt in bis zu fünf Gemeinschaften: Teilnahmefaktoren je Gemeinschaft, freier Anteil und ein Vorschlag des Optimierers.",
    aufgeteilt: "Ein Zählpunkt, aufgeteilt", beispiel: "Beispiel", plaetze: "Plätze je Zählpunkt", plaetzeAria: "2 von bis zu 5 Gemeinschaften belegt (Beispiel)",
    beiOver: "Geführter Beitritt", beiTitel: "Beitritt in Minuten", beiText: "Eignungscheck des Zählpunkts, Verträge, SEPA-Mandat und elektronische Unterschrift – danach geht es geführt in die Zustimmung beim Netzbetreiber.", beiAria: "Schritte des Beitritts",
    dsOver: "Datenschutz", dsTitel: "Eigene Daten, klare Rechte", dsText: "Mitglieder sehen nur ihre Daten, Vorstände standardmäßig Summen. Datenauskunft nach Art. 15 DSGVO als Download.",
    rechte: [["Mitglied", "sieht nur die eigenen Daten"], ["Vorstand", "sieht standardmäßig Summen"], ["Auskunft", "Art. 15 DSGVO als Download"]],
  },
  en: {
    sichtbar: ["Generation", "Share", "Savings"],
    beitritt: ["Eligi\u00adbility", "Con\u00adtracts", "SEPA", "Signa\u00adture", "Grid oper\u00adator"],
    aufteilung: ["EEG village centre", "BEG region", "free"],
    eyebrow: "What members get", titelA: "Clear, honest, ", titelB: "no need to ask",
    leadA: "Everything in one place – on mobile too. You can see the countdown, savings and green hours above in the", tour: "product tour",
    dorfAria: "Energy community in the village: solar power flows from the roofs to the neighbours", gemStrom: "Community power",
    dorfTitel: "Power from the neighbourhood\u00a0– made visible", dorfText: "Those who see where their power comes from stay involved. The portal makes generation, share and savings tangible every day.", taeglich: "Daily in the portal",
    mehrOver: "Several communities", mehrTitel: "Multiple participation", mehrText: "One metering point in up to five communities: participation factors per community, free share and a suggestion from the optimiser.",
    aufgeteilt: "One metering point, split", beispiel: "Example", plaetze: "Slots per metering point", plaetzeAria: "2 of up to 5 communities used (example)",
    beiOver: "Guided joining", beiTitel: "Join in minutes", beiText: "Eligibility check of the metering point, contracts, SEPA mandate and electronic signature – then you are guided through consent at the grid operator.", beiAria: "Steps for joining",
    dsOver: "Data protection", dsTitel: "Your own data, clear rights", dsText: "Members only see their own data, boards see totals by default. Data access request under Art. 15 GDPR as a download.",
    rechte: [["Member", "only sees their own data"], ["Board", "sees totals by default"], ["Access request", "Art. 15 GDPR as a download"]],
  },
};

/** Was das Portal jeden Tag zeigt (Text der Dorf-Kachel, als drei Begriffe) */
const SICHTBAR = [
  { icon: Sun, label: "Erzeugung" },
  { icon: Leaf, label: "Anteil" },
  { icon: PiggyBank, label: "Ersparnis" },
];

/** Beispielaufteilung eines Zählpunkts (Mockup, als Beispiel gekennzeichnet) */
const AUFTEILUNG = [
  { label: "EEG Ortskern", pct: 50, farbe: "bg-ov-500" },
  { label: "BEG Region", pct: 30, farbe: "bg-navy-600" },
  { label: "frei", pct: 20, farbe: "bg-ink-200", frei: true },
];

/** Kachel-Grundform: weiße Fläche, gleiche Rundung und Innenabstände im ganzen Raster */
function Kachel({ className, children }) {
  return <div className={`relative flex h-full w-full flex-col overflow-hidden rounded-[2rem] bg-white p-6 shadow-e1 ring-1 ring-ink-200/70 md:p-7 ${className || ""}`}>{children}</div>;
}

function KachelKopf({ icon: Icon, overline, titel }) {
  return (
    <div className="flex items-start gap-3.5">
      <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ov-50 text-ov-700 ring-1 ring-ov-100">
        <Icon className="h-5 w-5" strokeWidth={1.8} />
      </span>
      <div className="min-w-0">
        <p className="text-[11.5px] font-semibold uppercase tracking-[0.16em] text-ink-500">{overline}</p>
        <h3 className="mt-0.5 font-display text-[19px] font-bold leading-snug tracking-tight text-ink-900">{titel}</h3>
      </div>
    </div>
  );
}

export default function Mitglieder() {
  const en = spracheDerAnfrage() === "en";
  const w = WORTE[en ? "en" : "de"];
  const sichtbar = SICHTBAR.map((s, i) => ({ ...s, label: w.sichtbar[i] }));
  const beitritt = w.beitritt;
  const aufteilung = AUFTEILUNG.map((a, i) => ({ ...a, label: w.aufteilung[i] }));
  return (
    <Section data-abschnitt="mitglieder" tone="white" space="lg">
      <div className="mb-10 grid gap-6 md:mb-14 lg:grid-cols-12 lg:items-end">
        <SectionHeading
          eyebrow={w.eyebrow}
          title={<>{w.titelA}<span className="ov-text-gradient">{w.titelB}</span></>}
          className="lg:col-span-7"
        />
        <p className="ov-lead text-ink-600 lg:col-span-5 lg:pb-1">
          {w.leadA}{" "}
          <a href="#produkt" className="rounded font-semibold text-ov-700 underline decoration-ov-300 decoration-2 underline-offset-4 transition-colors hover:text-ov-800 hover:decoration-ov-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500">{w.tour}</a>.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-12">
        {/* 1 – Dorf-Szene: die große, dunkle Bühne */}
        <Reveal className="flex md:col-span-2 lg:col-span-7 lg:row-span-2">
          <div className="ov-verlauf-nacht relative flex w-full flex-col overflow-hidden rounded-[2rem] text-white shadow-e4 ring-1 ring-white/10">
            <div aria-hidden="true" className="pointer-events-none absolute -left-24 top-1/3 h-72 w-72 rounded-full bg-ov-500/20 blur-3xl" />
            <div className="relative">
              {/* Bühne ohne eigenen Rahmen: Raster läuft weich in die Karte aus */}
              <div aria-hidden="true" className="ov-grid-bg absolute inset-0 opacity-60 [mask-image:radial-gradient(75%_70%_at_50%_45%,black,transparent)]" />
              <div role="img" aria-label={w.dorfAria} className="relative px-[5%] pt-[7%]" style={{ aspectRatio: "16/10.5" }}>
                <EnergiegemeinschaftDorf animiert ton="dunkel" className="h-full w-full" />
              </div>
              <span className="ov-glass absolute left-6 top-6 hidden items-center gap-2 rounded-full px-3 py-1.5 text-[12.5px] font-semibold text-white sm:inline-flex md:left-8 md:top-8">
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-ov-400 shadow-[0_0_0_3px_rgba(102,153,51,0.3)]" />
                {w.gemStrom}
              </span>
            </div>
            <div className="relative mt-auto p-6 pt-2 md:p-8 md:pt-2">
              <div className="min-w-0">
                <h3 className="ov-h3 text-white">{w.dorfTitel}</h3>
                <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-white/75">{w.dorfText}</p>
              </div>
              <ul aria-label={w.taeglich} className="mt-5 flex flex-wrap gap-2">
                {sichtbar.map(({ icon: Icon, label }, i) => (
                  <li key={i} className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.08] px-3 py-1.5 text-[13px] font-semibold text-white ring-1 ring-white/15">
                    <Icon aria-hidden="true" className="h-3.5 w-3.5 text-ov-300" strokeWidth={2} />
                    {label}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>

        {/* 2 – Mehrfachteilnahme mit Beispiel-Aufteilung eines Zählpunkts */}
        <Reveal className="flex lg:col-span-5" delay={80}>
          <Kachel>
            <KachelKopf icon={SlidersHorizontal} overline={w.mehrOver} titel={w.mehrTitel} />
            <p className="mt-3 text-[14.5px] leading-relaxed text-ink-600">{w.mehrText}</p>
            <figure className="mt-auto pt-5"><div className="rounded-2xl bg-sand-50 p-4 ring-1 ring-sand-200">
              <figcaption className="mb-2 flex items-center justify-between gap-3 text-[12px] text-ink-500">
                <span className="font-semibold text-ink-700">{w.aufgeteilt}</span>
                <span className="rounded-full bg-sand-100 px-2 py-0.5 font-semibold text-ink-600">{w.beispiel}</span>
              </figcaption>
              <div aria-hidden="true" className="flex h-3 gap-1 overflow-hidden rounded-full">
                {aufteilung.map((a, i) => (
                  <span key={i} className={`h-full rounded-full ${a.farbe} ${a.frei ? "bg-[repeating-linear-gradient(135deg,var(--color-ink-200)_0_4px,var(--color-ink-100)_4px_8px)]" : ""}`} style={{ width: `${a.pct}%` }} />
                ))}
              </div>
              <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-ink-600">
                {aufteilung.map((a, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    <span aria-hidden="true" className={`h-2 w-2 rounded-full ${a.farbe}`} />
                    {a.label} <span className="ov-num font-semibold text-ink-900">{a.pct} %</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex items-center justify-between gap-3 border-t border-sand-200 pt-3 text-[12.5px] text-ink-600">
                <span>{w.plaetze}</span>
                <span className="flex items-center gap-1" aria-label={w.plaetzeAria} role="img">
                  {[0, 1, 2, 3, 4].map((i) => <span key={i} aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${i === 0 ? "bg-ov-500" : i === 1 ? "bg-navy-600" : "bg-white ring-1 ring-ink-300"}`} />)}
                  <span aria-hidden="true" className="ml-1.5 ov-num font-semibold text-ink-900">2 / 5</span>
                </span>
              </div>
            </div></figure>
          </Kachel>
        </Reveal>

        {/* 3 – Beitritt als geführte Schrittfolge */}
        <Reveal className="flex lg:col-span-5" delay={160}>
          <Kachel>
            <KachelKopf icon={FileSignature} overline={w.beiOver} titel={w.beiTitel} />
            <p className="mt-3 text-[14.5px] leading-relaxed text-ink-600">{w.beiText}</p>
            <div className="mt-auto pt-5"><ol aria-label={w.beiAria} className="relative grid grid-cols-5 rounded-2xl bg-sand-50 px-1 py-4 ring-1 ring-sand-200">
              <span aria-hidden="true" className="absolute left-[10%] right-[10%] top-[1.8125rem] h-0.5 rounded-full bg-gradient-to-r from-ov-500 via-ov-400 to-navy-500" />
              {beitritt.map((s, i) => {
                const letzter = i === beitritt.length - 1;
                return (
                  <li key={i} className="relative flex min-w-0 flex-col items-center gap-2 px-0.5 text-center">
                    <span aria-hidden="true" className={`flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-bold text-white ring-4 ring-sand-50 ${letzter ? "bg-navy-600" : "bg-ov-600"}`}>{i + 1}</span>
                    <span className="hyphens-manual text-[12px] font-semibold leading-tight text-ink-700" lang={en ? "en" : "de"}>{s}</span>
                  </li>
                );
              })}
            </ol></div>
          </Kachel>
        </Reveal>

        {/* 4 – Daten und Rechte: volle Breite, Text links, Rechte-Übersicht rechts */}
        <Reveal className="flex md:col-span-2 lg:col-span-12">
          <div className="grid w-full gap-6 overflow-hidden rounded-[2rem] bg-sand-50 p-6 ring-1 ring-sand-200 md:p-8 lg:grid-cols-12 lg:items-center lg:gap-10">
            <div className="lg:col-span-5">
              <KachelKopf icon={ShieldCheck} overline={w.dsOver} titel={w.dsTitel} />
              <p className="mt-3 text-[14.5px] leading-relaxed text-ink-600">{w.dsText}</p>
            </div>
            <ul className="grid gap-2.5 sm:grid-cols-3 sm:gap-3 lg:col-span-7">
              <li className="rounded-2xl bg-white p-4 shadow-e1 ring-1 ring-ink-200/70">
                <p className="flex items-center gap-2 text-[13px] font-semibold text-ink-900"><UserRound aria-hidden="true" className="h-4 w-4 text-ov-600" />{w.rechte[0][0]}</p>
                <p className="mt-1.5 flex items-start gap-1.5 text-[13.5px] leading-snug text-ink-600 sm:mt-2"><Check aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ov-600" strokeWidth={2.6} />{w.rechte[0][1]}</p>
              </li>
              <li className="rounded-2xl bg-white p-4 shadow-e1 ring-1 ring-ink-200/70">
                <p className="flex items-center gap-2 text-[13px] font-semibold text-ink-900"><UsersRound aria-hidden="true" className="h-4 w-4 text-navy-600" />{w.rechte[1][0]}</p>
                <p className="mt-1.5 flex items-start gap-1.5 text-[13.5px] leading-snug text-ink-600 sm:mt-2"><Check aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ov-600" strokeWidth={2.6} />{w.rechte[1][1]}</p>
              </li>
              <li className="rounded-2xl bg-white p-4 shadow-e1 ring-1 ring-ink-200/70">
                <p className="flex items-center gap-2 text-[13px] font-semibold text-ink-900"><Download aria-hidden="true" className="h-4 w-4 text-ov-600" />{w.rechte[2][0]}</p>
                <p className="mt-1.5 flex items-start gap-1.5 text-[13.5px] leading-snug text-ink-600 sm:mt-2"><Check aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ov-600" strokeWidth={2.6} />{w.rechte[2][1]}</p>
              </li>
            </ul>
          </div>
        </Reveal>
      </div>
    </Section>
  );
}
