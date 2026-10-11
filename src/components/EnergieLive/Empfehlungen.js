"use client";

import { useSeitenLand } from "@/components/Land/LandKontext";
import { schreibweiseFuer } from "@/lib/land/schreibweise";
import { useMemo } from "react";
import Link from "@/components/Land/Link";
import { ArrowRight, BatteryCharging, Factory, LineChart, Timer } from "lucide-react";
import useLiveDaten from "./useLiveDaten";
import { preisTage, zeitfenster, berlinTag, stundenmittel, STUNDE, formate } from "./berechnung";
import { pfad } from "@/lib/land";
import { useSprache } from "@/components/Sprache/SpracheKontext";

/* Sprachmodell: feste Texte je Sprache */
const TEXTE = {
  de: {
    heute: "Heute", morgen: "Morgen", morgenKlein: "morgen ",
    lastEyebrow: "Flexible Last im Betrieb · 4 Stunden",
    lastText: (avg, eur) => `Im Schnitt ${avg} ct/kWh an der Börse. Jede verschobene Megawattstunde – etwa Kühlung, Druckluft oder Chargenprozesse – kostet hier rund ${eur} € weniger als im teuersten 4-Stunden-Fenster.`,
    speicherEyebrow: "Speicher laden · 2 Stunden",
    speicherText: (avg, diff, von, bis) => `Im Schnitt ${avg} ct/kWh – ${diff} ct weniger als im teuersten 2-Stunden-Fenster (${von}–${bis} Uhr). Diese Spanne ist der Rohertrag, den ein Speicher aus einem Zyklus ziehen kann, vor Wirkungsgradverlusten.`,
    uEyebrow: "Unternehmen · Reststrom-Pool",
    uTitel: (v) => `Günstigste 3 h heute: ${v} ct/kWh netto`, uTitelLeer: "Börsenpreis gezielt nutzen",
    uMittel: (v) => `Das Tagesmittel liegt bei ${v} ct/kWh. `,
    // CH handelt stündlich, DE/AT viertelstündlich – Wortwahl folgt der Auflösung
    uText: (stuendlich) => `Ein Festpreisvertrag gibt Ihnen davon nichts weiter. Im Reststrom-Pool wird gebündelt und in Tranchen beschafft, Solarstrom aus den Parks deckt Tagesstunden – und wer Last verschieben kann, profitiert zusätzlich von günstigen ${stuendlich ? "Börsenstunden" : "Viertelstunden"}.`,
    uLinks: ["Ersparnis berechnen", "Zum Reststrom-Pool"],
    iEyebrow: "Investoren · Speicher & Solarparks",
    iTitel: (v) => `Preisspanne heute: ${v} ct/kWh`, iTitelLeer: "Flexibilität wird zum Erlös",
    iText: "Mittags drückt Solarstrom den Preis, abends ist Strom knapp. Genau diese Spanne verdienen Großspeicher – und sie entscheidet, ob ein ungeförderter Solarpark mit Speicher oder PPA wirtschaftlicher ist als ohne.",
    iLinks: ["Großspeicher", "Für Investoren"],
    warHeute: "Günstigste Zeit war heute", beste: "Beste Startzeit", uhrSuffix: " Uhr", nullUhr: "0 Uhr", jetzt: "jetzt",
    leer: "Sobald die Börsenpreise wieder abrufbar sind, zeigen wir hier die günstigste Zeit. Faustregel: an sonnigen Tagen mittags, an windigen Tagen oft nachts – teuer ist es meist zwischen 18 und 21 Uhr.",
  },
  en: {
    heute: "Today", morgen: "Tomorrow", morgenKlein: "tomorrow ",
    lastEyebrow: "Flexible load in operations · 4 hours",
    lastText: (avg, eur) => `On average ${avg} ct/kWh on the exchange. Every shifted megawatt hour – for example cooling, compressed air or batch processes – costs around €${eur} less here than in the most expensive 4-hour window.`,
    speicherEyebrow: "Charging storage · 2 hours",
    speicherText: (avg, diff, von, bis) => `On average ${avg} ct/kWh – ${diff} ct less than in the most expensive 2-hour window (${von}–${bis}). This spread is the gross margin a storage system can earn from one cycle, before efficiency losses.`,
    uEyebrow: "Businesses · residual power pool",
    uTitel: (v) => `Cheapest 3 h today: ${v} ct/kWh net`, uTitelLeer: "Using the exchange price in a targeted way",
    uMittel: (v) => `The daily average is ${v} ct/kWh. `,
    uText: (stuendlich) => `A fixed-price contract passes none of this on to you. In the residual power pool, power is procured as a pool and in tranches, solar power from the parks covers daytime hours – and those who can shift load also benefit from low-cost ${stuendlich ? "exchange hours" : "quarter-hours"}.`,
    uLinks: ["Calculate savings", "To the residual power pool"],
    iEyebrow: "Investors · storage & solar parks",
    iTitel: (v) => `Price spread today: ${v} ct/kWh`, iTitelLeer: "Flexibility becomes revenue",
    iText: "At midday, solar power pushes the price down; in the evening, power is scarce. This is exactly the spread that battery storage earns – and it decides whether an unsubsidised solar park is more profitable with storage or a PPA than without.",
    iLinks: ["Battery storage", "For investors"],
    warHeute: "Cheapest time today was", beste: "Best start time", uhrSuffix: "", nullUhr: "00:00", jetzt: "now",
    leer: "As soon as exchange prices can be retrieved again, we will show the cheapest time here. Rule of thumb: on sunny days at midday, on windy days often at night – it is usually expensive between 18:00 and 21:00.",
  },
};

/**
 * „Was bedeutet das für Sie?" – aus den veröffentlichten Börsenpreisen abgeleitete
 * Hinweise für Unternehmen (Lastverschiebung, Speicher) und Investoren.
 * Bewusst als Orientierung formuliert.
 */
export default function Empfehlungen({ initial }) {
  const { daten, jetzt } = useLiveDaten(initial);
  const tage = useMemo(() => preisTage(daten.preis, jetzt), [daten.preis, jetzt]);
  const sprache = useSprache();
  const f = formate(sprache);
  const { ct, zahl, uhr } = f;
  const w = schreibweiseFuer(TEXTE[sprache === "en" ? "en" : "de"], useSeitenLand()); // Schweiz: ohne „ß“

  const horizont = tage.zukunft;
  const speicher = useMemo(() => bestesFenster(tage, horizont, 120), [tage, horizont]);
  const last = useMemo(() => bestesFenster(tage, horizont, 240), [tage, horizont]);
  const heute = tage.heute;
  const guenstig3h = useMemo(() => (heute ? zeitfenster(heute.punkte, 180, tage.schrittMs) : null), [heute, tage.schrittMs]);

  const heuteStr = berlinTag(jetzt);
  const tagWort = (t) => (berlinTag(t) === heuteStr ? w.heute : w.morgen);

  return (
    <div className="grid gap-4 md:gap-5 lg:grid-cols-2">
      <FensterKarte
        icon={Timer}
        eyebrow={w.lastEyebrow}
        fenster={last}
        tagWort={tagWort}
        f={f}
        w={w}
        schrittMs={tage.schrittMs}
        jetzt={jetzt}
        text={(f) =>
          w.lastText(ct(f.guenstig.avg), zahl(Math.max(f.teuer.avg - f.guenstig.avg, 0), 0))
        }
      />
      <FensterKarte
        icon={BatteryCharging}
        eyebrow={w.speicherEyebrow}
        fenster={speicher}
        tagWort={tagWort}
        f={f}
        w={w}
        schrittMs={tage.schrittMs}
        jetzt={jetzt}
        text={(f) =>
          w.speicherText(ct(f.guenstig.avg), ct(f.teuer.avg - f.guenstig.avg), uhr(f.teuer.start), uhr(f.teuer.ende))
        }
      />

      <LinkKarte
        icon={Factory}
        eyebrow={w.uEyebrow}
        titel={guenstig3h ? w.uTitel(ct(guenstig3h.guenstig.avg)) : w.uTitelLeer}
        text={`${heute ? w.uMittel(ct(heute.avg)) : ""}${w.uText((daten.preis?.aufloesungMin || 15) >= 60)}`}
        links={[
          { href: pfad("/rechner/reststrom"), label: w.uLinks[0], primaer: true },
          { href: pfad("/reststrom"), label: w.uLinks[1] },
        ]}
      />
      <LinkKarte
        dunkel
        icon={LineChart}
        eyebrow={w.iEyebrow}
        titel={heute ? w.iTitel(ct(heute.max.eurMwh - heute.min.eurMwh)) : w.iTitelLeer}
        text={w.iText}
        links={[
          { href: pfad("/grossspeicher"), label: w.iLinks[0], primaer: true },
          { href: "/investoren", label: w.iLinks[1] },
        ]}
      />
    </div>
  );
}

/** Ende des Suchzeitraums: Mitternacht als „24:00 Uhr" des Vortags */
function endeLabel(t, tagWort, f, w) {
  const u = f.uhr(t);
  if (u === "00:00") return `${tagWort(t - 1) === w.heute ? "" : w.morgenKlein}24:00${w.uhrSuffix}`;
  return `${tagWort(t) === w.heute ? "" : w.morgenKlein}${u}${w.uhrSuffix}`;
}

function bestesFenster(tage, horizont, dauerMin) {
  const n = Math.round((dauerMin * 60000) / tage.schrittMs);
  // Genug veröffentlichte Preise ab jetzt? Sonst den heutigen Tag rückblickend zeigen.
  if (horizont.length >= n + 2) return { ...zeitfenster(horizont, dauerMin, tage.schrittMs), punkte: horizont, rueckblick: false };
  if (tage.heute) return { ...zeitfenster(tage.heute.punkte, dauerMin, tage.schrittMs), punkte: tage.heute.punkte, rueckblick: true };
  return null;
}

function FensterKarte({ icon: Icon, eyebrow, fenster, tagWort, text, jetzt, f, w }) {
  const { uhr } = f;
  const ok = fenster?.guenstig && fenster?.teuer;
  const balken = ok ? stundenmittel(fenster.punkte) : [];
  const max = Math.max(...balken.map((b) => b.avg), 1);
  const min = Math.min(0, ...balken.map((b) => b.avg));

  return (
    <article className="flex flex-col rounded-3xl bg-white p-6 ring-1 ring-ink-200/70 md:p-8">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-ov-50 text-ov-600">
          <Icon aria-hidden="true" className="h-6 w-6" strokeWidth={1.8} />
        </span>
        <p className="text-[12.5px] font-semibold uppercase tracking-[0.14em] text-ink-600">{eyebrow}</p>
      </div>
      {ok ? (
        <>
          <p className="mt-6 text-[14px] text-ink-500">{fenster.rueckblick ? w.warHeute : w.beste}</p>
          <h3 className="mt-1 font-display text-[clamp(1.6rem,1.2rem+1.3vw,2.25rem)] font-extrabold leading-tight tracking-tight text-ink-900">
            {fenster.rueckblick ? "" : `${tagWort(fenster.guenstig.start)} `}
            <span className="text-ov-600">
              {uhr(fenster.guenstig.start)}–{uhr(fenster.guenstig.ende)}{w.uhrSuffix}
            </span>
          </h3>
          <p className="mt-3 text-[15.5px] leading-relaxed text-ink-600">{text(fenster)}</p>

          {/* Mini-Balken: Stundenpreise im Suchzeitraum, Fenster hervorgehoben */}
          <div className="mt-auto pt-7" aria-hidden="true">
            <div className="flex h-16 items-end gap-[2px]">
              {balken.map((b) => {
                const imFenster = b.t + STUNDE > fenster.guenstig.start && b.t < fenster.guenstig.ende;
                const h = Math.max(((b.avg - min) / (max - min)) * 100, 4);
                return (
                  <span
                    key={b.t}
                    className={`min-w-0 flex-1 rounded-t-[3px] ${imFenster ? "bg-ov-500" : b.t <= jetzt && jetzt < b.t + STUNDE ? "bg-ink-500" : "bg-ink-200"}`}
                    style={{ height: `${h}%`, maxWidth: 24 }}
                  />
                );
              })}
            </div>
            <div className="mt-2 flex justify-between text-[12px] text-ink-500">
              <span>{fenster.rueckblick ? w.nullUhr : w.jetzt}</span>
              <span>
                {balken.length ? endeLabel(balken[balken.length - 1].t + STUNDE, tagWort, f, w) : ""}
              </span>
            </div>
          </div>
        </>
      ) : (
        <p className="mt-6 text-[15.5px] leading-relaxed text-ink-600">
          {w.leer}
        </p>
      )}
    </article>
  );
}

function LinkKarte({ icon: Icon, eyebrow, titel, text, links, dunkel }) {
  return (
    <article
      className={`relative flex flex-col overflow-hidden rounded-3xl p-6 md:p-8 ${
        dunkel ? "bg-navy-950 text-white" : "bg-ov-50 ring-1 ring-ov-200/70"
      }`}
    >
      {dunkel && <div aria-hidden="true" className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-ov-500/25 blur-[90px]" />}
      <div className="relative flex items-center gap-3">
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${dunkel ? "bg-white/10 text-ov-300" : "bg-white text-ov-600"}`}>
          <Icon aria-hidden="true" className="h-6 w-6" strokeWidth={1.8} />
        </span>
        <p className={`text-[12.5px] font-semibold uppercase tracking-[0.14em] ${dunkel ? "text-white/60" : "text-ink-600"}`}>{eyebrow}</p>
      </div>
      <h3 className={`relative mt-6 font-display text-[clamp(1.35rem,1.1rem+0.9vw,1.75rem)] font-extrabold leading-tight tracking-tight ${dunkel ? "text-white" : "text-ink-900"}`}>
        {titel}
      </h3>
      <p className={`relative mt-3 text-[15.5px] leading-relaxed ${dunkel ? "text-white/70" : "text-ink-600"}`}>{text}</p>
      <div className="relative mt-auto flex flex-col gap-3 pt-7 sm:flex-row sm:flex-wrap">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`group inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold transition-all ${
              l.primaer
                ? "bg-ov-600 text-white hover:bg-ov-700"
                : dunkel
                  ? "text-white ring-1 ring-inset ring-white/35 hover:bg-white/10"
                  : "bg-white text-ink-900 ring-1 ring-inset ring-ink-200 hover:ring-ink-300"
            }`}
          >
            {l.label}
            {l.primaer && <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-1" />}
          </Link>
        ))}
      </div>
    </article>
  );
}
