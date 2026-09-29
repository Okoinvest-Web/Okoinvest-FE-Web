"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight, BatteryCharging, CarFront, ReceiptEuro, WashingMachine } from "lucide-react";
import useLiveDaten from "./useLiveDaten";
import { preisTage, zeitfenster, ct, zahl, uhr, berlinTag, stundenmittel, STUNDE } from "./berechnung";
import { dynamischBrutto, TARIF_ANNAHMEN } from "@/lib/energy";

/**
 * „Was bedeutet das für Sie?" – aus den veröffentlichten Börsenpreisen abgeleitete,
 * alltagstaugliche Hinweise. Bewusst als Orientierung formuliert.
 */
export default function Empfehlungen({ initial }) {
  const { daten, jetzt } = useLiveDaten(initial);
  const tage = useMemo(() => preisTage(daten.preis, jetzt), [daten.preis, jetzt]);

  const horizont = tage.zukunft;
  const wasch = useMemo(() => bestesFenster(tage, horizont, 120), [tage, horizont]);
  const auto = useMemo(() => bestesFenster(tage, horizont, 240), [tage, horizont]);
  const heute = tage.heute;
  const guenstig3h = useMemo(() => (heute ? zeitfenster(heute.punkte, 180, tage.schrittMs).guenstig : null), [heute, tage.schrittMs]);

  const heuteStr = berlinTag(jetzt);
  const tagWort = (t) => (berlinTag(t) === heuteStr ? "Heute" : "Morgen");

  return (
    <div className="grid gap-4 md:gap-5 lg:grid-cols-2">
      <FensterKarte
        icon={WashingMachine}
        eyebrow="Waschmaschine & Geschirrspüler · 2 Stunden"
        fenster={wasch}
        tagWort={tagWort}
        schrittMs={tage.schrittMs}
        jetzt={jetzt}
        text={(f) =>
          `Im Schnitt ${ct(f.guenstig.avg)} ct/kWh an der Börse – ${ct(f.teuer.avg - f.guenstig.avg)} ct weniger als im teuersten 2-Stunden-Fenster (${uhr(f.teuer.start)}–${uhr(f.teuer.ende)} Uhr).`
        }
      />
      <FensterKarte
        icon={CarFront}
        eyebrow="E-Auto laden · 4 Stunden"
        fenster={auto}
        tagWort={tagWort}
        schrittMs={tage.schrittMs}
        jetzt={jetzt}
        text={(f) => {
          const euro = ((f.teuer.avg - f.guenstig.avg) / 10) * 40 * (1 + TARIF_ANNAHMEN.mwst) / 100;
          return `Im Schnitt ${ct(f.guenstig.avg)} ct/kWh. Mit dynamischem Tarif kostet eine 40-kWh-Ladung hier rund ${zahl(Math.max(euro, 0), 2)} € weniger als zur teuersten Zeit.`;
        }}
      />

      <LinkKarte
        icon={ReceiptEuro}
        eyebrow="Dynamischer Stromtarif"
        titel={
          guenstig3h
            ? `Günstigste 3 h heute: ca. ${zahl(dynamischBrutto(guenstig3h.avg), 0)} ct/kWh brutto`
            : "Börsenpreis direkt nutzen"
        }
        text={`${heute ? `Im Tagesmittel wären es rund ${zahl(dynamischBrutto(heute.avg), 0)} ct/kWh, Festpreistarife liegen bei etwa ${TARIF_ANNAHMEN.festpreisCt} ct/kWh. ` : ""}Dynamische Tarife geben den Börsenpreis viertelstündlich weiter – lohnend vor allem, wenn Sie Verbrauch verschieben können, etwa mit E-Auto, Wärmepumpe oder Speicher. Voraussetzung ist ein intelligentes Messsystem.`}
        links={[
          { href: "/rechner/dynamischer-stromtarif", label: "Ersparnis berechnen", primaer: true },
          { href: "/service/stromtarif", label: "Ökovolt-Stromtarif" },
        ]}
      />
      <LinkKarte
        dunkel
        icon={BatteryCharging}
        eyebrow="Photovoltaik & Stromspeicher"
        titel={heute ? `Preisspanne heute: ${ct(heute.max.eurMwh - heute.min.eurMwh)} ct/kWh` : "Günstigen Strom selbst erzeugen"}
        text="Mittags ist Strom meist reichlich und billig, abends knapp und teuer. Eine PV-Anlage mit Speicher verschiebt Ihren eigenen Solarstrom genau in diese teuren Abendstunden – unabhängig davon, was die Börse gerade macht."
        links={[
          { href: "/produkte/stromspeicher", label: "Stromspeicher ansehen", primaer: true },
          { href: "/solarrechner", label: "Solarertrag berechnen" },
        ]}
      />
    </div>
  );
}

/** Ende des Suchzeitraums: Mitternacht als „24:00 Uhr" des Vortags */
function endeLabel(t, tagWort) {
  const u = uhr(t);
  if (u === "00:00") return `${tagWort(t - 1) === "Heute" ? "" : "morgen "}24:00 Uhr`;
  return `${tagWort(t) === "Heute" ? "" : "morgen "}${u} Uhr`;
}

function bestesFenster(tage, horizont, dauerMin) {
  const n = Math.round((dauerMin * 60000) / tage.schrittMs);
  // Genug veröffentlichte Preise ab jetzt? Sonst den heutigen Tag rückblickend zeigen.
  if (horizont.length >= n + 2) return { ...zeitfenster(horizont, dauerMin, tage.schrittMs), punkte: horizont, rueckblick: false };
  if (tage.heute) return { ...zeitfenster(tage.heute.punkte, dauerMin, tage.schrittMs), punkte: tage.heute.punkte, rueckblick: true };
  return null;
}

function FensterKarte({ icon: Icon, eyebrow, fenster, tagWort, text, jetzt }) {
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
          <p className="mt-6 text-[14px] text-ink-500">{fenster.rueckblick ? "Günstigste Zeit war heute" : "Beste Startzeit"}</p>
          <h3 className="mt-1 font-display text-[clamp(1.6rem,1.2rem+1.3vw,2.25rem)] font-extrabold leading-tight tracking-tight text-ink-900">
            {fenster.rueckblick ? "" : `${tagWort(fenster.guenstig.start)} `}
            <span className="text-ov-600">
              {uhr(fenster.guenstig.start)}–{uhr(fenster.guenstig.ende)} Uhr
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
              <span>{fenster.rueckblick ? "0 Uhr" : "jetzt"}</span>
              <span>
                {balken.length ? endeLabel(balken[balken.length - 1].t + STUNDE, tagWort) : ""}
              </span>
            </div>
          </div>
        </>
      ) : (
        <p className="mt-6 text-[15.5px] leading-relaxed text-ink-600">
          Sobald die Börsenpreise wieder abrufbar sind, zeigen wir hier die günstigste Zeit. Faustregel: an sonnigen Tagen mittags, an windigen
          Tagen oft nachts – teuer ist es meist zwischen 18 und 21 Uhr.
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
