"use client";

import { SperrEingaben } from "./LaenderSperre";
import { useMemo, useState } from "react";
import { AlertTriangle, Coins, HandCoins, Landmark, Receipt, ShieldAlert, Users } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { Auswahl, Gruppe, Kennzahl, Regler, Schalter, Zahl } from "./bausteine";
import { useTeilbarerZustand } from "./kontext";
import ErgebnisAnfrage from "./ErgebnisAnfrage";
import { ErgebnisKopf, Hinweis, MobilKurz, RechnerRahmen } from "./InvestTeile";
import { DiagrammKarte, FARBEN, Linien } from "./ToolTeile";
import { STANDARD, rechneBeteiligung } from "@/lib/rechner/beteiligung";
import { REGION_KURZ } from "@/lib/rechner/pacht";
import { regionEn } from "@/lib/sprache/begriffe";
import { GEMEINSCHAFTEN, REGIONEN } from "@/lib/invest/markt";
import { pfad } from "@/lib/land";
import { useSeitenLand } from "@/components/Land/LandKontext";
import { landStart } from "@/components/Land/useLand";
import { useTexte } from "@/components/Sprache/SpracheKontext";
import { useFormate } from "@/components/Sprache/useFormate";

const B = GEMEINSCHAFTEN.beteiligung;
const pctMit = (f) => (v, s = 1) => (v == null || !Number.isFinite(v) ? "–" : `${v < 0 ? "−" : ""}${f.fmtPct(Math.abs(v), s)}`);

// Sprachmodell: Texte des Rechners
const TEXTE = {
  de: {
    szenario: {
      schlecht: ["Schlecht", "Erlöse −12 % (weniger Sonne, Abregelung, negative Preise), Marktwert nach Förderende −20 % ohne Steigerung, Bau +5 %, Betrieb +15 %"],
      mittel: ["Mittel", "Standardannahmen des Solarpark-Rechners"],
      gut: ["Gut", "Erlöse +5 %, Marktwert nach Förderende +20 %, Bau −5 %"],
    },
    regionLabel: (id, l) => l,
    region: "Region",
    einlage: "Einlage",
    mittelPa: "Mittel p. a.",
    spanne: "Spanne",
    bis: (a, b) => `${a} bis ${b}`,
    ihre: "Ihre Beteiligung (Beispiel)",
    anzahl: "Anzahl Anteile",
    einlageHinweis: (x) => `Einlage ${x}`,
    betrag: "Betrag je Anteil",
    betragHinweis: (x) => `Beispielwert – die Satzung und damit die Anteilshöhe stehen noch nicht fest (angenommen ${x}).`,
    parkEg: "Solarpark und Genossenschaft",
    groesse: "Größe des Parks",
    anteilEg: "Anteil der eG am Park",
    anteilFormat: (f, v) => `${f.fmt(v)} % des EK`,
    anteilHinweis: (a, b) => `Anteil am Eigenkapital der Parkgesellschaft. Genossenschaftskapital ≈ ${a} bei ${b} Eigenkapital des Parks.`,
    mio: (f, v) => `${f.fmt(v, 2)} Mio. €`,
    kostenEg: "Kosten der Genossenschaft",
    kostenFormat: (f, v) => `${f.fmt(v, 2)} % p. a.`,
    kostenHinweis: "Prüfungsverband, Buchhaltung, Generalversammlung – in % des Mitgliederkapitals.",
    steuer: "Kapitalertragsteuer abziehen",
    steuerText: "25 % + Soli, ohne Kirchensteuer und Sparer-Pauschbetrag",
    sr: (m, s, g) => `Illustration, keine Zusage. Rendite im mittleren Szenario ${m}, schlechtes Szenario ${s}, gutes Szenario ${g}.`,
    warnTitel: "Keine Anlageberatung, kein Angebot, kein Renditeversprechen.",
    warnText: "Die Genossenschaft ist im Aufbau; Anteile können noch nicht gezeichnet werden. Die Zahlen illustrieren, wie Ausschüttungen aus einem Park-Cashflow entstehen – sie können deutlich geringer ausfallen oder ganz ausbleiben.",
    dreiSzenarien: "Drei Szenarien",
    plakette: (e, n) => `${e} Einlage · ${n} Jahre`,
    deltaPkt: (f, d) => `${f.fmt(d * 100, 1)} %-Pkt.`,
    renditePa: "Rendite p. a. inkl. Rückzahlung",
    ausschuettungen: "Ausschüttungen",
    jahre110: "Ø Jahre 1–10",
    nullrunden: "Nullrunden",
    nullWert: (a, b) => `${a} / ${b} J.`,
    rueckzahlung: "Rückzahlung",
    totalTitel: "Schlimmster Fall: Totalverlust.",
    totalText: (x) => ` Fällt der Park dauerhaft aus oder wird die Betreibergesellschaft insolvent, kann die Einlage von ${x} ganz verloren gehen. Eine Einlagensicherung gibt es nicht.`,
    parkIrr: "Park-EK-Rendite (mittel)",
    vorKosten: "vor Kosten der eG",
    mitglieder: "Mitglieder rechnerisch",
    jeEinlage: (x) => `bei je ${x}`,
    eyebrow: "Genossenschaft im Aufbau",
    satz: "Interesse unverbindlich vormerken – Unterlagen erhalten Sie vor jeder Entscheidung.",
    label: "Interesse vormerken",
    versprechen: "Interessenbekundung, keine Zeichnung – erst mit dem Beitritt entsteht eine Zahlungspflicht.",
    nachricht: (n, x) => `Aus dem Beteiligungsrechner: Interesse an einer Beteiligung, gerechnet mit ${n} Anteil${n === 1 ? "" : "en"} (Beispiel-Einlage ${x}).`,
    hinweis: (st) => `Vor persönlichen Steuern${st ? " (hier nach Kapitalertragsteuer)" : ""}. Über Ausschüttungen entscheidet die Generalversammlung.`,
    proJahr: "Ausschüttung je Jahr",
    proJahrZusatz: (x, st) => `Auf Ihre Einlage von ${x}, ${st ? "nach" : "vor"} Kapitalertragsteuer`,
    linienAria: (n) => `Jährliche Ausschüttungen in drei Szenarien über ${n} Jahre.`,
    achse: (f, v) => `${f.fmt(v)} €`,
    jahr: "Jahr",
    diagrammText: "In den ersten Jahren fließt der Cashflow des Parks vor allem in Zins und Tilgung der Bankdarlehen; ausschüttungsfähig wird erst, was nach Kosten, Rücklage und dem Kapitalerhalt für die spätere Rückzahlung der Einlagen übrig bleibt.",
    pachtHinweis: "Für Landwirte und Flächeneigentümer kann eine Beteiligung die Pacht ergänzen – ersetzt sie aber nicht. Die Pacht ist vertraglich gesichert, eine Ausschüttung nicht.",
    boerseHinweis: "Anteile an einer Genossenschaft sind nicht börsengehandelt. Eine Kündigung ist nur zum Geschäftsjahresende mit Frist möglich; das Auseinandersetzungsguthaben wird erst danach ausgezahlt.",
  },
  en: {
    szenario: {
      schlecht: ["Poor", "Revenue −12% (less sun, curtailment, negative prices), market value after the subsidy −20% with no increase, construction +5%, operation +15%"],
      mittel: ["Base", "Default assumptions of the solar park calculator"],
      gut: ["Good", "Revenue +5%, market value after the subsidy +20%, construction −5%"],
    },
    regionLabel: (id, l) => regionEn(id, "kurz", l),
    region: "Region",
    einlage: "Contribution",
    mittelPa: "Base p.a.",
    spanne: "Range",
    bis: (a, b) => `${a} to ${b}`,
    ihre: "Your participation (example)",
    anzahl: "Number of shares",
    einlageHinweis: (x) => `Contribution ${x}`,
    betrag: "Amount per share",
    betragHinweis: (x) => `Example value – the articles of association, and with them the share amount, have not yet been set (assumed ${x}).`,
    parkEg: "Solar park and cooperative",
    groesse: "Size of the park",
    anteilEg: "Cooperative’s share in the park",
    anteilFormat: (f, v) => `${f.pct(v)} of equity`,
    anteilHinweis: (a, b) => `Share in the equity of the park company. Cooperative capital ≈ ${a} with ${b} of park equity.`,
    mio: (f, v) => `€${f.fmt(v, 2)}m`,
    kostenEg: "Costs of the cooperative",
    kostenFormat: (f, v) => `${f.pct(v, 2)} p.a.`,
    kostenHinweis: "Auditing association, accounting, general meeting – as a % of members’ capital.",
    steuer: "Deduct capital gains tax",
    steuerText: "25% + solidarity surcharge, without church tax and saver’s allowance (Germany)",
    sr: (m, s, g) => `Illustration, not a commitment. Return in the base scenario ${m}, poor scenario ${s}, good scenario ${g}.`,
    warnTitel: "No investment advice, no offer, no promise of returns.",
    warnText: "The cooperative is being set up; shares cannot yet be subscribed. The figures illustrate how distributions arise from a park’s cash flow – they may turn out considerably lower or not materialise at all.",
    dreiSzenarien: "Three scenarios",
    plakette: (e, n) => `${e} contribution · ${n} years`,
    deltaPkt: (f, d) => `${f.fmt(d * 100, 1)} pp`,
    renditePa: "Return p.a. incl. repayment",
    ausschuettungen: "Distributions",
    jahre110: "Ø years 1–10",
    nullrunden: "Years without payout",
    nullWert: (a, b) => `${a} / ${b} yrs`,
    rueckzahlung: "Repayment",
    totalTitel: "Worst case: total loss.",
    totalText: (x) => ` If the park fails permanently or the operating company becomes insolvent, the contribution of ${x} can be lost entirely. There is no deposit protection.`,
    parkIrr: "Park equity return (base)",
    vorKosten: "before cooperative costs",
    mitglieder: "Members (calculated)",
    jeEinlage: (x) => `at ${x} each`,
    eyebrow: "Cooperative being set up",
    satz: "Register your interest without obligation – you will receive the documents before any decision.",
    label: "Register interest",
    versprechen: "An expression of interest, not a subscription – a payment obligation only arises on joining.",
    nachricht: (n, x) => `From the participation calculator: interest in participating, calculated with ${n} share${n === 1 ? "" : "s"} (example contribution ${x}).`,
    hinweis: (st) => `Before personal taxes${st ? " (here after capital gains tax)" : ""}. Distributions are decided by the general meeting.`,
    proJahr: "Distribution per year",
    proJahrZusatz: (x, st) => `On your contribution of ${x}, ${st ? "after" : "before"} capital gains tax`,
    linienAria: (n) => `Annual distributions in three scenarios over ${n} years.`,
    achse: (f, v) => f.eur(v),
    jahr: "Year",
    diagrammText: "In the first years, the park’s cash flow goes mainly into interest and repayment of the bank loans; only what remains after costs, reserves and capital preservation for the later repayment of contributions becomes distributable.",
    pachtHinweis: "For farmers and landowners, a participation can complement the lease – but not replace it. The lease is contractually secured; a distribution is not.",
    boerseHinweis: "Cooperative shares are not traded on an exchange. Notice of termination is only possible at the end of the financial year with a notice period; the settlement balance is paid out only afterwards.",
  },
};
const FARBE = { schlecht: FARBEN.sun, mittel: FARBEN.navy, gut: FARBEN.gruen };

export default function BeteiligungRechner() {
  // Ländermodell: auf /at bzw. /ch Region/Land vorwählen – die Länder-Sperre zeigt dann keine ungeprüften Werte
  const seitenLand = useSeitenLand();
  const t = useTexte(TEXTE);
  const f = useFormate();
  const { fmt, fmtEur } = f;
  const pct = pctMit(f);
  const lbl = (x) => t.szenario[x.id]?.[0] ?? x.label;
  const [e, setE] = useState(() => landStart(STANDARD, seitenLand));
  const set = (k) => (v) => setE((a) => ({ ...a, [k]: v }));
  useTeilbarerZustand(e, (neu) => setE((a) => ({ ...a, ...neu })), {
    optionen: { regionId: REGIONEN.map((x) => x.id) },
    grenzen: { anteile: [1, 40], anteilEur: [50, 1000], parkMwp: [2, 50], egQuote: [0.05, 0.49], verwaltungAnteil: [0.0025, 0.03] },
    pruefen: rechneBeteiligung,
  });
  const r = useMemo(() => rechneBeteiligung(e), [e]);
  const [s, m, g] = r.szenarien;

  // Länder-Sperre (Paket E): für AT/CH nur die Regionswahl und der Hinweis aus markt.js
  const sperre = r.sperre;
  const regionWahl = (
    <Auswahl
      legende={t.region}
      wert={e.regionId}
      onChange={set("regionId")}
      spalten={3}
      klein
      optionen={REGIONEN.map((x) => ({ id: x.id, label: t.regionLabel(x.id, REGION_KURZ[x.id] || x.label) }))}
    />
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
              [t.einlage, fmtEur(r.einlage)],
              [t.mittelPa, pct(m.rendite)],
              [t.spanne, t.bis(pct(s.rendite, 0), pct(g.rendite, 0))],
            ]}
          />
          <div className="space-y-8">
            <Gruppe titel={t.ihre}>
              <Regler label={t.anzahl} wert={e.anteile} min={1} max={40} step={1} onChange={set("anteile")} hinweis={t.einlageHinweis(fmtEur(r.einlage))} />
              <Regler
                label={t.betrag}
                wert={e.anteilEur}
                min={50}
                max={1000}
                step={50}
                format={(v) => fmtEur(v)}
                onChange={set("anteilEur")}
                hinweis={t.betragHinweis(fmtEur(B.anteilEur))}
              />
            </Gruppe>
            <Gruppe titel={t.parkEg}>
              <Regler label={t.groesse} wert={e.parkMwp} min={2} max={50} step={1} einheit="MWp" onChange={set("parkMwp")} />
              {regionWahl}
              <Regler
                label={t.anteilEg}
                wert={e.egQuote * 100}
                min={5}
                max={49}
                step={1}
                format={(v) => t.anteilFormat(f, v)}
                minLabel={f.pct(5)}
                maxLabel={f.pct(49)}
                onChange={(v) => set("egQuote")(v / 100)}
                hinweis={t.anteilHinweis(fmtEur(m.eg.egKapital), t.mio(f, m.park.ek / 1e6))}
              />
              <Regler
                label={t.kostenEg}
                wert={e.verwaltungAnteil * 100}
                min={0.25}
                max={3}
                step={0.25}
                stellen={2}
                format={(v) => t.kostenFormat(f, v)}
                onChange={(v) => set("verwaltungAnteil")(v / 100)}
                hinweis={t.kostenHinweis}
              />
              <Schalter icon={Receipt} label={t.steuer} beschreibung={t.steuerText} an={e.steuer} onChange={set("steuer")} />
            </Gruppe>
          </div>
        </>
      )}
      ergebnis={
        <>
          <p className="sr-only" aria-live="polite">
            {t.sr(pct(m.rendite), pct(s.rendite), pct(g.rendite))}
          </p>
          <div className="flex gap-3 rounded-2xl bg-warn-50 p-4 ring-1 ring-warn-200" role="note">
            <AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-warn-600" />
            <p className="text-[13.5px] leading-relaxed text-ink-800">
              <strong className="text-ink-900">{t.warnTitel}</strong> {t.warnText}
            </p>
          </div>

          <div className="mt-6">
            <ErgebnisKopf titel={t.dreiSzenarien} plakette={t.plakette(fmtEur(r.einlage), s.laufzeit)} />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {r.szenarien.map((x) => (
              <div key={x.id} className={cn("rounded-2xl p-4 ring-1", x.id === "mittel" ? "ov-verlauf-nacht text-white ring-white/10 shadow-kante" : "bg-white shadow-e1 ring-ink-200/70")}>
                <p className={cn("flex items-center gap-2 text-[12.5px] font-semibold", x.id === "mittel" ? "text-white/80" : "text-ink-500")}>
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: FARBE[x.id] }} aria-hidden="true" />
                  {lbl(x)}
                </p>
                <p className="mt-1 font-display text-[26px] font-extrabold leading-tight tracking-tight">
                  {x.rendite == null || !Number.isFinite(x.rendite) ? "–" : <Zahl wert={x.rendite} format={(v) => pct(v)} delta={x.id === "mittel" ? "dunkel" : "hell"} deltaFormat={(dd) => t.deltaPkt(f, dd)} />}
                </p>
                <p className={cn("text-[12px]", x.id === "mittel" ? "text-white/75" : "text-ink-500")}>{t.renditePa}</p>
                <dl className={cn("mt-3 space-y-1 border-t pt-3 text-[12.5px]", x.id === "mittel" ? "border-white/15" : "border-ink-100")}>
                  <Zeile k={t.ausschuettungen} v={fmtEur(x.summeNetto)} dunkel={x.id === "mittel"} />
                  <Zeile k={t.jahre110} v={pct(x.quote10)} dunkel={x.id === "mittel"} />
                  <Zeile k={t.nullrunden} v={t.nullWert(x.jahreOhne, x.laufzeit)} dunkel={x.id === "mittel"} />
                  <Zeile k={t.rueckzahlung} v={fmtEur(x.rueckzahlung)} dunkel={x.id === "mittel"} />
                </dl>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-start gap-3 rounded-2xl bg-ink-900 p-4 text-white">
            <ShieldAlert aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-sun-300" />
            <p className="text-[13.5px] leading-relaxed text-white/85">
              <strong className="text-white">{t.totalTitel}</strong>
              {t.totalText(fmtEur(r.einlage))}
            </p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <Kennzahl icon={Landmark} label={t.parkIrr} zusatz={t.vorKosten}>
              {pct(m.park.ekIrr)}
            </Kennzahl>
            <Kennzahl icon={Users} label={t.mitglieder} zusatz={t.jeEinlage(fmtEur(r.einlage))}>
              {fmt(Math.floor(m.eg.egKapital / r.einlage))}
            </Kennzahl>
          </div>

          {/* Bewusst ohne Renditezahl neben dem Knopf: Interessenbekundung, kein Renditeversprechen */}
          <ErgebnisAnfrage
            typ="genossenschaft"
            href={pfad("/genossenschaft#interesse")}
            eyebrow={t.eyebrow}
            satz={t.satz}
            label={t.label}
            versprechen={t.versprechen}
            nachricht={t.nachricht(e.anteile, fmtEur(r.einlage))}
            hinweis={t.hinweis(e.steuer)}
          />
        </>
      }
      unten={
        <div className="space-y-6">
          <DiagrammKarte titel={t.proJahr} zusatz={t.proJahrZusatz(fmtEur(r.einlage), e.steuer)}>
            <Linien
              xLabels={m.mitglied.map((x) => String(x.jahr))}
              serien={r.szenarien.map((x) => ({ key: x.id, label: lbl(x), farbe: FARBE[x.id], werte: x.mitglied.map((y) => y.netto), dick: x.id === "mittel" }))}
              ariaLabel={t.linienAria(m.laufzeit)}
              achsenFormat={(v) => t.achse(f, v)}
              tooltip={(i) => (
                <>
                  <p className="font-semibold">{t.jahr} {i + 1}</p>
                  {r.szenarien.map((x) => (
                    <p key={x.id} className="text-white/70">
                      {lbl(x)} <span className="ov-num font-semibold text-white">{fmtEur(x.mitglied[i].netto)}</span>{" "}
                      <span className="text-white/75">({pct(x.mitglied[i].quote)})</span>
                    </p>
                  ))}
                </>
              )}
            />
            <p className="px-5 pb-5 text-[12.5px] leading-relaxed text-ink-500 md:px-6">
              {t.diagrammText}
            </p>
          </DiagrammKarte>

          <div className="grid gap-4 md:grid-cols-3">
            {r.szenarien.map((x) => (
              <p key={x.id} className="rounded-2xl bg-sand-50 px-4 py-3 text-[13px] leading-relaxed text-ink-600 ring-1 ring-ink-200/60">
                <strong className="text-ink-900">{lbl(x)}:</strong> {t.szenario[x.id]?.[1] ?? x.text}.
              </p>
            ))}
          </div>

          <Hinweis ton="neutral" icon={HandCoins}>
            {t.pachtHinweis}
          </Hinweis>
          <Hinweis ton="neutral" icon={Coins}>
            {t.boerseHinweis}
          </Hinweis>
        </div>
      }
    />
  );
}

function Zeile({ k, v, dunkel }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className={dunkel ? "text-white/65" : "text-ink-500"}>{k}</dt>
      <dd className={cn("ov-num text-right font-semibold", dunkel ? "text-white" : "text-ink-900")}>{v}</dd>
    </div>
  );
}
