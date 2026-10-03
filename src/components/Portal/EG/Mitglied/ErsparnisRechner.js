"use client";

// Öffentlicher Ersparnis-Rechner Energiegemeinschaft Österreich (WP6). Reine Funktion eg/interesse.js rechnerOeffentlich
// (= Python eg_portal_kern.rechner_oeffentlich, API POST /api/eg/rechner): Netzentgelt aus der Regeltabelle (SNE-V 2018 bis
// Ende 2026, Arbeitshypothese ab 2027), Abgabenbefreiung nur EEG, Standardpreise aus src/lib/invest/markt.js.
//
// Props (alle optional, Standard = Verhalten der Rechner-Seite /energiegemeinschaften/rechner):
//   ctaHref, ctaLabel      Haupt-Button im Ergebnis
//   ctaHinweis             kleine Zeile unter den Buttons
//   zweitCta               { label, href } – zweiter, leiserer Button
//   perspektive            "mitglied" | "vorstand" (Vorstand rechnet für ein Beispielmitglied)
//   ueberschriftEbene      2 | 3 – Ebene der Ergebnis-Überschrift (Standard: 2, bei perspektive="vorstand" 3)

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowLeftRight, ChevronDown, Info, Leaf, PiggyBank, Plug, Sun, Users, Zap } from "lucide-react";
import Button from "@/components/ui/Button";
import FortschrittsRing from "@/components/ui/FortschrittsRing";
import { cn } from "@/components/ui/cn";
import { Auswahl, Belege, Gruppe, Kennzahl, Regler, Zahl, eingabeMerken } from "@/components/Rechner/bausteine";
import { Hinweis, MobilKurz, RechnerRahmen } from "@/components/Rechner/InvestTeile";
import { RECHNER_DECKUNG, RECHNER_MODELLE, RECHNER_PROFILE, RECHNER_ROLLEN, RECHNER_STANDARD, rechnerOeffentlich } from "@/lib/plattform/eg/interesse";
import { fmt } from "@/lib/rechner/annahmen";

const opt = (o) => Object.entries(o).map(([id, x]) => ({ id, label: typeof x === "string" ? x : x.label, sub: typeof x === "string" ? undefined : x.sub }));
const euro = (v) => `${v < 0 ? "−" : ""}${fmt(Math.abs(Math.round(v)))} €`;

/** Farbcodierung der Bestandteile – dieselbe Farbe für Punkt (Legende) und Balkensegment */
const FARBE = { energie: "bg-ov-500", netz: "bg-navy-600", abgaben: "bg-ov-300", erzeuger: "bg-sun-400" };
const PREIS_FELDER = ["lieferantCt", "gemeinschaftCt", "netzApCt", "einspeiseEgCt", "marktCt", "gebuehrenJahr"];
/** Schraffur für Abzüge (Gebühren) – im Balken und in der Legende gleich */
const SCHRAFFUR = "bg-[repeating-linear-gradient(135deg,var(--color-ink-400)_0_3px,var(--color-ink-200)_3px_6px)]";

/** Einordnungsskala: typische Spanne laut Hinweis „50–200 € im Jahr je Haushalt“ */
const SKALA_MAX = 250;
const TYPISCH = [50, 200];

/** Rolle als große Wahlkarten mit Symbol (echte Radios, einhändig gut zu treffen) */
const ROLLEN_ICON = { verbraucher: Plug, erzeuger: Sun, prosumer: ArrowLeftRight };
function RolleWahl({ wert, onChange }) {
  const name = useId();
  return (
    <fieldset>
      <legend className="mb-2.5 text-[14.5px] font-semibold text-ink-800">Rolle</legend>
      <div className="grid grid-cols-3 gap-2">
        {Object.entries(RECHNER_ROLLEN).map(([id, label]) => {
          const aktiv = wert === id;
          const Icon = ROLLEN_ICON[id] || Zap;
          return (
            <label
              key={id}
              className={cn(
                "relative flex min-h-[4.5rem] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl px-2 py-2.5 text-center text-[13px] leading-tight ring-1 transition-[background-color,box-shadow,color] duration-200 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ov-500",
                aktiv ? "bg-white font-semibold text-ink-900 shadow-e2 ring-ov-400" : "bg-white/50 text-ink-600 ring-ink-200 hover:bg-white hover:text-ink-900"
              )}
            >
              <input
                type="radio"
                name={name}
                value={id}
                checked={aktiv}
                onChange={() => {
                  eingabeMerken();
                  onChange(id);
                }}
                className="sr-only"
              />
              <span aria-hidden="true" className={cn("flex h-8 w-8 items-center justify-center rounded-xl transition-colors duration-200", aktiv ? "bg-ov-600 text-white" : "bg-ink-100 text-ink-500")}>
                <Icon className="h-4 w-4" strokeWidth={2} />
              </span>
              <span>{label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Nummerierter Gruppentitel – führt durch die Eingaben */
function Schritt({ n, children }) {
  return (
    <span className="flex items-center gap-2.5">
      <span aria-hidden="true" className="flex h-6 w-6 items-center justify-center rounded-full bg-navy-950 text-[11.5px] font-bold tracking-normal text-white">{n}</span>
      {children}
    </span>
  );
}

/** Einordnung auf der Skala 0–250 € mit hervorgehobener typischer Spanne (dunkle Karte) */
function Einordnung({ netto }) {
  const pos = Math.max(0, Math.min(100, (netto / SKALA_MAX) * 100));
  const ueber = netto > SKALA_MAX;
  const lage = netto < TYPISCH[0] ? "unter" : netto > TYPISCH[1] ? "über" : "in";
  return (
    <div className="mt-6 border-t border-white/10 pt-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-[12.5px]">
        <p className="font-semibold text-white">Zur Einordnung</p>
        <p className="text-white/75">
          Typisch sind {TYPISCH[0]}–{TYPISCH[1]} € im Jahr je Haushalt
          <span className="sr-only"> – dieses Ergebnis liegt {lage} der typischen Spanne</span>
        </p>
      </div>
      <div aria-hidden="true" className="relative mt-3 h-2 rounded-full bg-white/10">
        <div className="absolute inset-y-0 rounded-full bg-ov-400/35 ring-1 ring-ov-300/40" style={{ left: `${(TYPISCH[0] / SKALA_MAX) * 100}%`, width: `${((TYPISCH[1] - TYPISCH[0]) / SKALA_MAX) * 100}%` }} />
        <div className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-e3 ring-4 ring-ov-500/50 transition-[left] duration-500 ease-ov-out motion-reduce:transition-none" style={{ left: `${pos}%` }} />
      </div>
      <div aria-hidden="true" className="relative mt-2 h-4 text-[11.5px] text-white/60">
        <span className="absolute left-0 hidden sm:inline">0 €</span>
        <span className="absolute -translate-x-1/2" style={{ left: `${(TYPISCH[0] / SKALA_MAX) * 100}%` }}>{TYPISCH[0]} €</span>
        <span className="absolute -translate-x-1/2" style={{ left: `${(TYPISCH[1] / SKALA_MAX) * 100}%` }}>{TYPISCH[1]} €</span>
        <span className="absolute right-0 hidden sm:inline">{ueber ? `> ${SKALA_MAX} €` : `${SKALA_MAX} €`}</span>
      </div>
    </div>
  );
}

/** Zusammensetzung: ein Balken (Bestandteile), Abzüge schraffiert vom Ende her – was übrig bleibt, ist netto */
function Zusammensetzung({ r, vorstand, teileId }) {
  const positiv = r.teile.filter((t) => t.eur > 0);
  const summe = positiv.reduce((s, t) => s + t.eur, 0);
  const abzug = Math.max(0, summe - r.nettoEur);
  const abzugPct = summe > 0 ? Math.min(100, (abzug / summe) * 100) : 100;
  const gebuehren = -Math.abs(r.gebuehrenEur || 0);
  return (
    <div className="mt-5 rounded-2xl bg-white p-4 ring-1 ring-ink-200/70 md:p-5">
      <p id={teileId} className="text-[11.5px] font-semibold uppercase tracking-[0.16em] text-ink-600">So setzt sich {vorstand ? "der" : "Ihr"} Vorteil zusammen</p>

      <div aria-hidden="true" className="mt-4">
        <div className="relative">
          <div className="flex h-4 gap-[3px] overflow-hidden rounded-full bg-ink-100">
            {positiv.map((t, i) => (
              <div
                key={t.id}
                className={cn("ov-balken-x ov-sofort h-full transition-[width] duration-500 ease-ov-out first:rounded-l-full last:rounded-r-full motion-reduce:transition-none", FARBE[t.id] || FARBE.energie)}
                style={{ width: `${(t.eur / (summe || 1)) * 100}%`, "--i": i }}
              />
            ))}
          </div>
          {abzug > 0 && (
            <div className={cn("absolute inset-y-0 right-0 rounded-r-full border-l-2 border-white transition-[width] duration-500 ease-ov-out motion-reduce:transition-none", SCHRAFFUR)} style={{ width: `${abzugPct}%` }} />
          )}
        </div>
        <div className="relative mt-2 flex h-4 text-[11.5px] font-medium text-ink-500">
          <span>{r.nettoEur >= 0 ? "netto bleibt" : ""}</span>
          {abzug > 0 && <span className="absolute right-0 whitespace-nowrap">Abzüge</span>}
        </div>
      </div>

      <ul aria-labelledby={teileId} className="mt-3 divide-y divide-ink-100">
        {r.teile.map((t) => {
          const negativ = t.eur < 0;
          return (
            <li key={t.id} className="flex items-baseline justify-between gap-3 py-2.5 text-[13.5px]">
              <span className="flex min-w-0 items-baseline text-ink-700">
                <span aria-hidden="true" className={cn("mr-2.5 inline-block h-2.5 w-2.5 shrink-0 translate-y-[1px] rounded-full", negativ ? "bg-danger-500" : FARBE[t.id] || FARBE.energie)} />
                <span className="min-w-0">
                  {t.label}
                  {Number.isFinite(t.ct) && t.ct !== 0 && <span className="ml-1.5 whitespace-nowrap text-[12px] text-ink-500">({fmt(t.ct, 2)} ct/kWh)</span>}
                  <span className="sr-only">: </span>
                </span>
              </span>
              <span className={cn("ov-num shrink-0 font-semibold", negativ ? "text-danger-700" : "text-ink-900")}>{euro(t.eur)}</span>
            </li>
          );
        })}
        <li className="flex items-baseline justify-between gap-3 py-2.5 text-[13.5px]">
          <span className="flex min-w-0 items-baseline text-ink-700">
            <span aria-hidden="true" className={cn("mr-2.5 inline-block h-2.5 w-2.5 shrink-0 translate-y-[1px] rounded-[3px]", SCHRAFFUR)} />
            <span className="min-w-0">Gebühren und Beitrag<span className="sr-only">: </span></span>
          </span>
          <span className="ov-num shrink-0 font-semibold text-ink-700">{euro(gebuehren)}</span>
        </li>
        <li className="flex items-baseline justify-between gap-3 pt-3 font-display text-[16px] font-bold text-ink-900">
          <span>{r.nettoEur < 0 ? "Nachteil netto" : "Vorteil netto"}<span className="sr-only">: </span></span>
          <span className={cn("ov-num", r.nettoEur < 0 && "text-danger-700")}>{euro(r.nettoEur)}</span>
        </li>
      </ul>
      {r.eingebrachtKwh > 0 && (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-sun-50 px-3 py-2 text-[12.5px] leading-snug text-ink-700">
          <Sun aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sun-600" />
          <span>{fmt(r.eingebrachtKwh)} kWh {vorstand ? "des" : "Ihres"} Überschusses nutzt die Gemeinschaft (ca. {fmt(r.nutzungsgradPct * 0.85)} %).</span>
        </p>
      )}
    </div>
  );
}

export default function ErsparnisRechner({
  ctaHref = "/registrieren?rolle=mitglied&weiter=%2Fportal%2Feg%2Fbeitritt",
  ctaLabel = "Gemeinschaft finden",
  ctaHinweis,
  zweitCta,
  perspektive = "mitglied",
  ueberschriftEbene,
}) {
  const [e, setE] = useState({ ...RECHNER_STANDARD });
  const set = (k) => (v) => setE((a) => ({ ...a, [k]: v }));
  const r = useMemo(() => rechnerOeffentlich(e), [e]);
  const verbraucht = e.rolle !== "erzeuger";
  const erzeugt = e.rolle !== "verbraucher";
  const vorstand = perspektive === "vorstand";
  const Ueberschrift = (ueberschriftEbene ?? (vorstand ? 3 : 2)) === 3 ? "h3" : "h2";
  const ids = useId();
  const teileId = `${ids}-teile`;

  // Preise: mobil eingeklappt (Ergebnis rückt nach oben), ab lg offen
  const [preiseOffen, setPreiseOffen] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const t = setTimeout(() => {
      if (window.matchMedia("(min-width: 1024px)").matches) setPreiseOffen(true);
    }, 0);
    return () => clearTimeout(t);
  }, []);
  const preiseAngepasst = PREIS_FELDER.some((k) => e[k] !== RECHNER_STANDARD[k]);

  // Live-Ansage entprellt und deutsch formatiert; beim Laden still
  const regelJahr = e.jahr === 2027 ? "ab 2027" : "2026";
  const ansage = `${r.nettoEur < 0 ? "Nachteil" : "Vorteil"} netto ${euro(Math.abs(r.nettoEur))} pro Jahr${vorstand ? " je Mitglied" : ""}${verbraucht ? `, ${fmt(r.quotePct)} Prozent des Verbrauchs aus der Gemeinschaft` : ""}, ${RECHNER_MODELLE[e.modell].label}, Regeln ${regelJahr}.`;
  const [live, setLive] = useState("");
  const startAnsage = useRef(ansage);
  useEffect(() => {
    if (startAnsage.current === ansage) return undefined;
    startAnsage.current = null;
    const t = setTimeout(() => setLive(ansage), 700);
    return () => clearTimeout(t);
  }, [ansage]);

  const gesichert = r.regel.status === "gesichert";
  // Deckung: lange Zusatzzeilen („Erzeugung ≈ 70 % des Verbrauchs“) als kurze Prozentangabe, Erklärung darunter
  const deckungOptionen = opt(RECHNER_DECKUNG).map((o) => ({ ...o, sub: o.sub?.replace(/^Erzeugung\s*/, "").replace(/\s*des Verbrauchs$/, "") }));

  return (
    <RechnerRahmen
      mitlaufend
      eingaben={
        <>
          <MobilKurz werte={[["Vorteil netto", euro(r.nettoEur)], ["aus Gemeinschaft", `${fmt(r.quotePct)} %`], ["CO₂", `${fmt(r.co2Kg)} kg`]]} />
          <Ueberschrift className="sr-only">{vorstand ? "Angaben zum Beispielmitglied" : "Ihre Angaben"}</Ueberschrift>
          <div className="space-y-9">
            <Gruppe titel={<Schritt n={1}>{vorstand ? "Beispielmitglied" : "Sie"}</Schritt>}>
              <RolleWahl wert={e.rolle} onChange={set("rolle")} />
              {verbraucht && <Auswahl legende="Verbrauch" wert={e.profil} onChange={set("profil")} optionen={opt(RECHNER_PROFILE)} spalten={2} klein />}
              {verbraucht && <Regler label="Jahresverbrauch" wert={e.verbrauchKwh} min={500} max={60000} step={100} format={(v) => `${fmt(v)} kWh`} onChange={set("verbrauchKwh")} hinweis={vorstand ? "steht auf der Jahresabrechnung des Mitglieds" : "steht auf Ihrer Jahresabrechnung"} />}
              {erzeugt && <Regler label="PV-Anlage" wert={e.kwp} min={1} max={500} step={0.5} stellen={1} format={(v) => `${fmt(v, 1)} kWp`} onChange={set("kwp")} hinweis={`≈ ${fmt(r.erzeugungKwh)} kWh Erzeugung pro Jahr`} />}
              {erzeugt && <Regler label="Eigenverbrauch im Haus" wert={e.eigenverbrauchPct} min={0} max={90} step={5} format={(v) => `${fmt(v)} %`} onChange={set("eigenverbrauchPct")} />}
            </Gruppe>
            <Gruppe titel={<Schritt n={2}>Gemeinschaft</Schritt>}>
              <Auswahl legende="Modell" wert={e.modell} onChange={set("modell")} optionen={opt(RECHNER_MODELLE)} spalten={2} klein />
              <div>
                <Auswahl legende="Erzeugung in der Gemeinschaft" wert={e.deckung} onChange={set("deckung")} optionen={deckungOptionen} klein />
                <p className="mt-2 text-[13px] leading-relaxed text-ink-500">Erzeugung im Verhältnis zum Verbrauch der Gemeinschaft</p>
              </div>
              <Auswahl legende="Netzentgelt-Regeln" wert={String(e.jahr)} onChange={(v) => set("jahr")(Number(v))} optionen={[{ id: "2026", label: "2026", sub: "SNE-V 2018" }, { id: "2027", label: "ab 2027", sub: "Arbeitshypothese" }]} klein />
            </Gruppe>
            <div className="space-y-5">
              <p className="text-[11.5px] font-semibold uppercase tracking-[0.16em] text-ink-500"><Schritt n={3}>Preise</Schritt></p>
              <details className="group rounded-2xl bg-white shadow-e1 ring-1 ring-ink-200/70" open={preiseOffen} onToggle={(ev) => setPreiseOffen(ev.currentTarget.open)}>
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500 [&::-webkit-details-marker]:hidden">
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2 text-[14.5px] font-semibold text-ink-800">
                      Preise netto (ct/kWh)
                      {preiseAngepasst && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-ov-50 px-2 py-0.5 text-[11px] font-semibold text-ov-800 ring-1 ring-ov-200">
                          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-ov-500" />
                          angepasst
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-500">Vorbelegt mit üblichen Werten – anpassen, wenn Sie Ihre Preise kennen.</span>
                  </span>
                  <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink-100 text-ink-600 transition-colors group-hover:bg-ink-200">
                    <ChevronDown className="h-4 w-4 transition-transform duration-200 ease-ov-out group-open:rotate-180 motion-reduce:transition-none" />
                  </span>
                </summary>
                <Gruppe className="border-t border-ink-100 px-4 pb-5 pt-5">
                  {verbraucht && <Regler label="Energiepreis Ihres Lieferanten" wert={e.lieferantCt} min={5} max={30} step={0.5} stellen={1} format={(v) => `${fmt(v, 1)} ct`} onChange={set("lieferantCt")} hinweis="nur Energieanteil, ohne Netz und Abgaben" />}
                  {verbraucht && <Regler label="Preis in der Gemeinschaft" wert={e.gemeinschaftCt} min={3} max={25} step={0.5} stellen={1} format={(v) => `${fmt(v, 1)} ct`} onChange={set("gemeinschaftCt")} hinweis="üblich 9–14 ct (Marktbeobachtung)" />}
                  {verbraucht && <Regler label="Netznutzungs-Arbeitspreis" wert={e.netzApCt} min={2} max={12} step={0.1} stellen={1} format={(v) => `${fmt(v, 1)} ct`} onChange={set("netzApCt")} hinweis="je Netzgebiet verschieden, siehe Netzrechnung" />}
                  {erzeugt && <Regler label="Einspeisepreis der Gemeinschaft" wert={e.einspeiseEgCt} min={2} max={15} step={0.5} stellen={1} format={(v) => `${fmt(v, 1)} ct`} onChange={set("einspeiseEgCt")} />}
                  {erzeugt && <Regler label="Alternative: Marktpreis Überschuss" wert={e.marktCt} min={0} max={15} step={0.5} stellen={1} format={(v) => `${fmt(v, 1)} ct`} onChange={set("marktCt")} />}
                  <Regler label="Gebühren und Beitrag" wert={e.gebuehrenJahr} min={0} max={150} step={5} format={(v) => `${fmt(v)} €/Jahr`} onChange={set("gebuehrenJahr")} />
                </Gruppe>
              </details>
            </div>
          </div>
        </>
      }
      ergebnis={
        <>
          <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{live}</p>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Ueberschrift className="font-display text-[22px] font-extrabold tracking-tight text-ink-900 md:text-[26px]">{vorstand ? "Ergebnis je Mitglied" : "Ihr Ergebnis"}</Ueberschrift>
            <span className="inline-flex items-center gap-2 rounded-full bg-ov-50 px-3 py-1 text-[12.5px] font-semibold text-ov-800 ring-1 ring-ov-200">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-ov-500" />
              {RECHNER_MODELLE[e.modell].label} · {regelJahr}
            </span>
          </div>

          {/* Die eine laute Zahl, mit Anteil-Ring und Einordnung */}
          <div className="ov-verlauf-nacht relative mt-5 overflow-hidden rounded-3xl p-5 text-white shadow-e4 ring-1 ring-white/10 sm:p-6 md:p-7">
            <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-ov-500/20 blur-3xl" />
            <div className="relative flex flex-wrap items-end justify-between gap-x-6 gap-y-5">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-[13px] font-medium text-white/75">
                  <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10 text-ov-300"><PiggyBank className="h-4 w-4" /></span>
                  {vorstand ? "Vorteil netto je Mitglied und Jahr" : "Vorteil netto pro Jahr"}
                </p>
                <p className={cn("ov-kpi-xl mt-3", r.nettoEur < 0 ? "text-danger-200" : "text-white")}>
                  <Zahl wert={r.nettoEur} suffix=" €" delta="dunkel" deltaFormat={(d) => `${fmt(Math.round(d))} €`} />
                </p>
                <p className="mt-2 text-[13.5px] leading-snug text-white/75">nach {fmt(r.gebuehrenEur)} € Gebühren und Beitrag</p>
              </div>
              {verbraucht && (
                <div className="flex items-center gap-3 rounded-2xl bg-white/[0.06] p-3 pr-4 ring-1 ring-white/10">
                  <FortschrittsRing wert={Math.round(r.quotePct)} groesse={64} staerke={6} ton="hell" dunkel sofort label={`${fmt(r.quotePct)} Prozent des Verbrauchs aus der Gemeinschaft`} className="text-[13px] font-bold text-white" />
                  <p className="max-w-[9rem] text-[12.5px] leading-snug text-white/75">{vorstand ? "des Verbrauchs aus der Gemeinschaft" : "Ihres Verbrauchs aus der Gemeinschaft"}</p>
                </div>
              )}
            </div>
            <div className="relative">
              <Einordnung netto={r.nettoEur} />
            </div>
          </div>

          <Belege spalten={3}>
            {verbraucht ? (
              <Kennzahl ton="akzent" icon={Users} label="Aus der Gemeinschaft" zusatz={`${fmt(r.quotePct)} % des Verbrauchs`}><Zahl wert={r.bezugKwh} suffix=" kWh" /></Kennzahl>
            ) : (
              <Kennzahl ton="akzent" icon={Sun} label="In die Gemeinschaft" zusatz="eingebrachter Überschuss"><Zahl wert={r.eingebrachtKwh} suffix=" kWh" /></Kennzahl>
            )}
            <Kennzahl icon={Zap} label="Vorteil je kWh" zusatz="Energie + Netz + Abgabe">{verbraucht ? `${fmt(r.vorteilJeKwhCt, 2)} ct` : "–"}</Kennzahl>
            <Kennzahl icon={Leaf} label="CO₂ (rechnerisch)" zusatz="UBA-Faktor; österr. Strommix meist darunter" className="col-span-2 xl:col-span-1"><Zahl wert={r.co2Kg} suffix=" kg" /></Kennzahl>
          </Belege>

          <Zusammensetzung r={r} vorstand={vorstand} teileId={teileId} />

          <div className="mt-4 space-y-2.5">
            <Hinweis ton={gesichert ? "neutral" : "warnung"} icon={gesichert ? Info : AlertTriangle}>
              {!gesichert && <strong className="font-semibold">Noch nicht gesichert: </strong>}
              Netzentgelt: {r.regel.text}{r.regel.abgabenBefreit ? "; Elektrizitätsabgabe entfällt für Gemeinschaftsstrom" : ""}. Quelle: {r.regel.quelle}.
            </Hinweis>
            {r.hinweise.map((h) => (
              <Hinweis key={h.id} ton={h.id === "negativ" ? "warnung" : "neutral"} icon={h.id === "negativ" ? AlertTriangle : Info}>
                {h.id === "negativ" && <strong className="font-semibold">Achtung: </strong>}
                {h.text}
              </Hinweis>
            ))}
          </div>

          {/* Nächster Schritt: Haupt-Button zuerst, mobil volle Breite (Daumenzone) */}
          <div className="mt-6 rounded-3xl bg-sand-50 p-4 ring-1 ring-sand-200 sm:p-5 md:p-6">
            <p className="text-[13px] leading-relaxed text-ink-600">Erste Einschätzung, netto. Maßgeblich sind die Viertelstundenwerte {vorstand ? "des" : "Ihres"} Netzbetreibers und das Preisblatt {vorstand ? "der" : "Ihrer"} Gemeinschaft.</p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Button href={ctaHref} size="lg" pfeil className="w-full justify-center px-5! sm:w-auto sm:px-8!">{ctaLabel}</Button>
              {zweitCta?.href && zweitCta?.label && <Button href={zweitCta.href} size="lg" variant="secondary" className="w-full justify-center px-5! sm:w-auto sm:px-8!">{zweitCta.label}</Button>}
            </div>
            {ctaHinweis && <p className="mt-3 text-[12.5px] text-ink-500">{ctaHinweis}</p>}
          </div>
        </>
      }
    />
  );
}
