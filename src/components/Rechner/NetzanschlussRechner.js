"use client";

import { SperrEingaben } from "./LaenderSperre";
import { AlertTriangle, BatteryCharging, CalendarClock, Cable, Coins, Lightbulb, Network, Percent, Users } from "lucide-react";
import { useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { Auswahl, Belege, Gruppe, Hauptzahl, Kennzahl, Regler, Schalter, Zahl } from "./bausteine";
import { useTeilbarerZustand } from "./kontext";
import { ErgebnisKopf, MobilKurz, RechnerRahmen } from "./InvestTeile";
import { AmpelMarke, FARBEN } from "./ToolTeile";
import { EBENEN, KAPAZITAETEN, LAENDER, STANDARD, rechneNetzanschluss } from "@/lib/rechner/netzanschluss";
import { fmt, fmtEur, fmtMio } from "@/lib/rechner/annahmen";

const geld = (v) => (v >= 1e6 ? fmtMio(v, 2) : `${fmt(Math.round(v / 1000))} Tsd. €`);
const EBENE_LABEL = { msLeitung: "Mittelspannungsleitung (20 kV)", uwMs: "Umspannwerk, MS-Sammelschiene", hs: "Hochspannung 110 kV" };
const AMPEL_TEXT = {
  gut: "Gute Ausgangslage – der Netzanschluss dürfte das Projekt nicht bremsen.",
  pruefen: "Machbar, aber Kosten oder Kapazität sind offen – früh beim Netzbetreiber anfragen.",
  kritisch: "Der Netzanschluss ist das Nadelöhr – Kosten oder Wartezeit können das Projekt in Frage stellen.",
};

export default function NetzanschlussRechner() {
  const [e, setE] = useState(STANDARD);
  const set = (k) => (v) => setE((a) => ({ ...a, [k]: v }));
  useTeilbarerZustand(e, (neu) => setE((a) => ({ ...a, ...neu })), {
    optionen: { land: LAENDER.map((x) => x.id), ebene: EBENEN.map((x) => x.id), kapazitaet: KAPAZITAETEN.map((x) => x.id) },
    grenzen: { mwp: [1, 150], anschlussQuote: [0.5, 1], km: [0.2, 20], speicherMw: [0, 150] },
    pruefen: rechneNetzanschluss,
  });
  const r = useMemo(() => rechneNetzanschluss(e), [e]);
  const u = r.ueberbauung;

  // Länder-Sperre (Paket E): für AT/CH nur die Regionswahl und der Hinweis aus markt.js
  const sperre = r.sperre;
  const regionWahl = (
    <Auswahl legende="Land" wert={e.land} onChange={set("land")} optionen={LAENDER} />
  );

  return (
    <RechnerRahmen
      mitlaufend
      sperre={sperre}
      eingaben={sperre ? (
        <SperrEingaben>{regionWahl}</SperrEingaben>
      ) : (
        <>
          <MobilKurz
            werte={[
              ["Kosten", geld(r.summe)],
              ["je kWp", `${fmt(r.proKwp)} €`],
              ["Zeit", `${r.monate[0]}–${r.monate[1]} Mon.`],
            ]}
          />
          <div className="space-y-8">
            <Gruppe titel="Anlage">
              {regionWahl}
              <Regler label="Anlagengröße" wert={e.mwp} min={1} max={150} step={1} einheit="MWp" onChange={set("mwp")} />
              <Regler
                label="Anschlussleistung (Überbauung)"
                wert={e.anschlussQuote * 100}
                min={50}
                max={100}
                step={5}
                format={(v) => `${fmt(v)} % · ${fmt((e.mwp * v) / 100, 1)} MW`}
                minLabel="50 %"
                maxLabel="100 %"
                onChange={(v) => set("anschlussQuote")(v / 100)}
                hinweis="Einspeiseleistung im Verhältnis zur Modulleistung – weniger Leistung spart Netzkosten, kostet aber etwas Ertrag."
              />
              <Schalter icon={BatteryCharging} label="Speicher am selben Anschluss" beschreibung="Co-Location, fängt Spitzen auf" an={e.speicherMw > 0} onChange={(v) => set("speicherMw")(v ? Math.max(1, Math.round(e.mwp * 0.3)) : 0)}>
                <div className="space-y-4">
                  <Regler label="Speicherleistung" wert={e.speicherMw} min={1} max={Math.max(5, e.mwp)} step={1} einheit="MW" onChange={set("speicherMw")} />
                  <Schalter icon={Cable} label="Speicher lädt auch aus dem Netz" beschreibung="dann fällt ein Baukostenzuschuss an" an={e.speicherNetzbezug} onChange={set("speicherNetzbezug")} />
                </div>
              </Schalter>
            </Gruppe>
            <Gruppe titel="Netz">
              <Regler label="Entfernung zum Anschlusspunkt" wert={e.km} min={0.2} max={20} step={0.1} stellen={1} format={(v) => `${fmt(v, 1)} km`} onChange={set("km")} hinweis="Trassenlänge bis zur MS-Leitung oder zum Umspannwerk – meist länger als Luftlinie." />
              <Auswahl legende="Spannungsebene" wert={e.ebene} onChange={set("ebene")} optionen={EBENEN} spalten={2} klein />
              <Auswahl legende="Freie Netzkapazität" wert={e.kapazitaet} onChange={set("kapazitaet")} optionen={KAPAZITAETEN} klein />
              <Schalter icon={Users} label="Clusterung mit Nachbarprojekt" beschreibung="gemeinsame Trasse bzw. gemeinsames Umspannwerk" an={e.cluster} onChange={set("cluster")} />
            </Gruppe>
          </div>
        </>
      )}
      ergebnis={
        <>
          <p className="sr-only" aria-live="polite">{`Netzanschluss grob ${geld(r.spanne.min)} bis ${geld(r.spanne.max)}, Zeitrahmen ${r.monate[0]} bis ${r.monate[1]} Monate.`}</p>
          <ErgebnisKopf titel="Ihr Netzanschluss" plakette={EBENE_LABEL[r.ebene]} />

          <Hauptzahl
            className="mt-5"
            icon={Coins}
            label="Kosten des Netzanschlusses (Mitte)"
            zusatz={`Spanne ${geld(r.spanne.min)} – ${geld(r.spanne.max)}`}
            rechts={<AmpelMarke ampel={r.ampel} className={r.ampel === "kritisch" ? "bg-white/10 ring-white/25" : undefined} />}
          >
            <Zahl wert={r.summe} format={geld} delta="dunkel" einlauf />
          </Hauptzahl>
          <p
            className={cn(
              "animate-ov-einblenden mt-3 rounded-2xl px-4 py-3 text-[14px] leading-relaxed text-ink-800 ring-1",
              r.ampel === "gut" ? "bg-success-50 ring-success-200" : r.ampel === "kritisch" ? "bg-ink-50 ring-ink-300" : "bg-warn-50 ring-warn-200"
            )}
            key={r.ampel}
          >
            {AMPEL_TEXT[r.ampel]}
          </p>

          <Belege>
            <Kennzahl ton="akzent" icon={Percent} label="je kWp" zusatz={`${fmt(r.anteil * 100)} % der Anlagenkosten`}>
              <Zahl wert={r.proKwp} suffix=" €" delta="hell" />
            </Kennzahl>
            <Kennzahl icon={CalendarClock} label="Zeitrahmen" zusatz="ab vollständigem Begehren">
              {r.monate[0]}–{r.monate[1]} Mon.
            </Kennzahl>
            <Kennzahl icon={Network} label="Anschluss" zusatz={`${r.kabelSysteme} × 20-kV-System`}>
              <Zahl wert={r.anschlussMw} stellen={1} suffix=" MW" />
            </Kennzahl>
          </Belege>

          {e.ebene !== "auto" && e.ebene !== r.vorschlag && (
            <p className="mt-3 text-[13px] text-ink-500">Für {fmt(r.anschlussMw, 1)} MW wäre typischerweise „{EBENE_LABEL[r.vorschlag]}“ zu erwarten.</p>
          )}

          <Schema r={r} km={e.km} />

          <ul className="mt-4 space-y-2">
            {r.posten.map((p) => (
              <li key={p.id} className="rounded-2xl bg-ink-50 px-4 py-3">
                <div className="flex items-baseline justify-between gap-3 text-[13.5px]">
                  <span className="min-w-0 text-ink-700">
                    {p.label}
                    {p.geteilt && <span className="ml-1.5 text-[12px] text-ov-700">(Ihr Anteil)</span>}
                  </span>
                  <span className="ov-num shrink-0 font-semibold text-ink-900">{geld(p.eur)}</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-100">
                  <div className="ov-fortschritt h-full w-full rounded-full bg-navy-500" style={{ transform: `scaleX(${r.summe > 0 ? Math.min(1, p.eur / r.summe) : 0})` }} />
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-7 flex flex-col gap-3 border-t border-ink-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-md text-[13px] leading-relaxed text-ink-500">Grobe Orientierung ohne Gewähr. Verbindlich sind nur Netzverträglichkeitsprüfung und Kostenvoranschlag des Netzbetreibers.</p>
            <Button href="/flaechencheck" size="lg" pfeil className="shrink-0">
              Fläche prüfen lassen
            </Button>
          </div>
        </>
      }
      unten={
        <div className="space-y-6">
          <div className="rounded-3xl bg-sand-50 p-5 ring-1 ring-ink-200/60 md:p-6">
            <h3 className="font-display text-[19px] font-extrabold tracking-tight text-ink-900">Überbauung: lohnt weniger Anschlussleistung?</h3>
            {e.anschlussQuote >= 1 ? (
              <p className="mt-2 text-[14px] leading-relaxed text-ink-600">
                Sie rechnen mit voller Anschlussleistung. Stellen Sie den Regler „Anschlussleistung“ auf 70–80 %: Oft sinken die Netzkosten, während nur wenige Prozent Ertrag verloren gehen.
              </p>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <Kennzahl icon={Coins} label="Netzkosten gespart" zusatz="ggü. 100 % Anschluss">
                  {geld(u.einsparung)}
                </Kennzahl>
                <Kennzahl icon={AlertTriangle} label="Ertragsverlust" zusatz={`${fmt(u.verlustKwh / 1000)} MWh · ${fmtEur(u.verlustEurJahr)} je Jahr`}>
                  {fmt(u.verlust * 100, 1)} %
                </Kennzahl>
                <Kennzahl ton={u.lohnt ? "akzent" : "hell"} icon={Percent} label="Barwert Verlust 20 J." zusatz={u.lohnt ? "kleiner als die Ersparnis" : "größer als die Ersparnis"}>
                  {geld(u.verlustBarwert)}
                </Kennzahl>
              </div>
            )}
            {u.speicherAuffang > 0 && (
              <p className="mt-3 text-[13px] text-ink-500">Der Speicher fängt rechnerisch rund {fmt(u.speicherAuffang * 100)} % der Abregelung auf.</p>
            )}
            <p className="mt-3 text-[12.5px] leading-relaxed text-ink-500">
              Kapazität frei wird oft schneller, wenn Sie eine begrenzte Einspeisung anbieten – etwa über eine flexible Netzanschlussvereinbarung nach § 8a EEG. Ertragsverlust bewertet mit dem EEG-Zuschlag, abgezinst mit 5 %.
            </p>
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-2">
            <section aria-labelledby="na-risiken" className="rounded-3xl ring-1 ring-ink-200/70 p-5 md:p-6">
              <h3 id="na-risiken" className="flex items-center gap-2.5 font-display text-[19px] font-extrabold tracking-tight text-ink-900">
                <AlertTriangle aria-hidden="true" className="h-5 w-5 text-warn-600" /> Risiken
              </h3>
              <ul className="mt-4 space-y-3">
                {r.risiken.map((t) => (
                  <li key={t} className="flex gap-3 text-[14px] leading-relaxed text-ink-700">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sun-500" aria-hidden="true" />
                    {t}
                  </li>
                ))}
              </ul>
            </section>
            <section aria-labelledby="na-tipps" className="rounded-3xl bg-navy-950 p-5 text-white md:p-6">
              <h3 id="na-tipps" className="flex items-center gap-2.5 font-display text-[19px] font-extrabold tracking-tight">
                <Lightbulb aria-hidden="true" className="h-5 w-5 text-sun-400" /> Tipps
              </h3>
              <ol className="mt-4 space-y-3">
                {r.tipps.map((t, i) => (
                  <li key={t} className="flex gap-3 text-[14px] leading-relaxed text-white/85">
                    <span className="ov-num flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-[12px] font-bold text-ov-300">{i + 1}</span>
                    <span className="min-w-0">{t}</span>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        </div>
      }
    />
  );
}

/** Schematische Skizze: Park → Trasse → Anschlusspunkt */
function Schema({ r, km }) {
  const ziel = r.ebene === "msLeitung" ? "MS-Leitung" : r.ebene === "uwMs" ? "Umspannwerk" : "110-kV-Netz";
  return (
    <div className="mt-5 overflow-hidden rounded-2xl ring-1 ring-ink-200/70">
      <svg viewBox="0 0 600 120" width="100%" role="img" aria-label={`Skizze: Solarpark, ${fmt(km, 1)} km Kabeltrasse, Anschluss an ${ziel}`} className="block bg-sand-50">
        {/* Park */}
        <g transform="translate(24 30)">
          {[0, 1, 2].map((z) => (
            <g key={z} transform={`translate(0 ${z * 20})`}>
              {[0, 1, 2, 3].map((s) => (
                <rect key={s} x={s * 26} y={0} width={22} height={12} rx={2} fill={FARBEN.navyDunkel} opacity={0.85} transform="skewX(-12)" />
              ))}
            </g>
          ))}
          <text x={46} y={82} textAnchor="middle" className="fill-ink-600 text-[12px] font-semibold">
            Park {fmt(r.eingabe.mwp)} MWp
          </text>
        </g>
        {/* Station */}
        <rect x={140} y={44} width={30} height={30} rx={5} fill={FARBEN.gruen} />
        <path d="M150 52 l6 0 -4 7 6 0 -9 10 3 -8 -5 0 z" fill="#fff" />
        {/* Trasse */}
        <line x1={172} x2={440} y1={59} y2={59} stroke={r.ebene === "hs" ? FARBEN.navy : FARBEN.gruen} strokeWidth={r.kabelSysteme > 1 ? 5 : 3} strokeDasharray="10 6" />
        <text x={306} y={48} textAnchor="middle" className="fill-ink-700 text-[12px] font-semibold">
          {fmt(km, 1)} km · {r.ebene === "hs" ? "110 kV" : `${r.kabelSysteme} × 20 kV`}
        </text>
        {/* Ziel */}
        <g transform="translate(446 30)">
          {r.ebene === "msLeitung" ? (
            <g>
              <line x1={30} x2={30} y1={0} y2={60} stroke={FARBEN.ink} strokeWidth={3} />
              <line x1={10} x2={50} y1={12} y2={12} stroke={FARBEN.ink} strokeWidth={3} />
              <line x1={14} x2={46} y1={26} y2={26} stroke={FARBEN.ink} strokeWidth={2} />
            </g>
          ) : (
            <g>
              <rect x={0} y={8} width={70} height={48} rx={6} fill="#fff" stroke={FARBEN.ink} strokeWidth={2} />
              <circle cx={26} cy={32} r={11} fill="none" stroke={FARBEN.ink} strokeWidth={2} />
              <circle cx={40} cy={32} r={11} fill="none" stroke={FARBEN.ink} strokeWidth={2} />
            </g>
          )}
          <text x={35} y={82} textAnchor="middle" className="fill-ink-600 text-[12px] font-semibold">
            {ziel}
          </text>
        </g>
      </svg>
    </div>
  );
}
