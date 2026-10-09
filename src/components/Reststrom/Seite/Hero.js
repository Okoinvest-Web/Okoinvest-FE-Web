// Hero der Seite /reststrom – dunkle Bühne mit Preiszerlegung „heute / im Pool“
//
// Paket D (Welle 1): Texte nach Empfehlung E3 als ENTWURF – ÖkoInvest tritt als Vermittler
// auf, nicht als Lieferant, und legt seine Vergütung offen. Die Rolle ist eine
// Inhaber-Entscheidung (MASTERPLAN-DACH Abschnitt 10, E3); bis dahin den Pool nicht bewerben.
// Keine Ersparniszusage („wird günstiger“), Pool-Werte als Modell gekennzeichnet (§ 5 UWG).
// CH-Hinweis: ElCom, FAQ Grundversorgung (Art. 11 Abs. 2 StromVV, „einmal frei, immer frei“),
// https://www.elcom.admin.ch/de/faq-grundversorgung – abgerufen 03.10.2026.
import { BatteryCharging, Check, Handshake, Sun } from "lucide-react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { STROM } from "@/lib/invest/markt";
import { FARBEN } from "@/components/Reststrom/PreisBalken";
import s from "@/components/Reststrom/reststrom.module.css";
import { pfad } from "@/lib/land";
import { spracheDerAnfrage } from "@/lib/land/seite";
import { fmtZahl } from "@/lib/sprache/format";
import { stromTeilEn } from "@/lib/sprache/rechnerBegriffe";

const PUNKTE = ["Bündelung statt Einzelvertrag", "Wir vermitteln – Vergütung offengelegt", "Solar-PPA als Option, wo verfügbar", "Offen auch ohne ÖKOVOLT-Anlage"];
const HEBEL_ICONS = { buendelung: Handshake, ppa: Sun, flex: BatteryCharging };
const KURZ = { buendelung: "Bündelung", ppa: "Solarstrom (PPA)", flex: "Flexibilität & Speicher" };
/* Sprachmodell: englische Fassung (Rechenwerte bleiben unverändert) */
const PUNKTE_EN = ["Pooling instead of a single contract", "We broker – remuneration disclosed", "Solar PPA as an option where available", "Open even without an ÖKOVOLT installation"];
const KURZ_EN = { buendelung: "Pooling", ppa: "Solar power (PPA)", flex: "Flexibility & storage" };
const KARTE = {
  de: { kopf: "Gewerbestrom netto, zerlegt", stand: "ct/kWh · DE, Neuverträge 2026 · Modell", heute: "Heute, Einzelvertrag", heuteAria: "Heute", pool: "Im Pool (Modell)", poolAria: (a, b) => `Im Pool: Beschaffung um ${a} bis ${b} ct niedriger, feste Bestandteile unverändert`, beschaffung: "Beschaffung", ersparnis: "Ersparnis", spanne: "Spanne je nach Profil", unten: "untere Modellannahme der Ersparnis", fest: "fest: Netz, Umlagen, Steuer", bis: "bis", fuss: "Grobe Aufteilung (BDEW-Strompreisanalyse, eigene Einschätzung). Modellrechnung, keine Preiszusage: Die Pool-Hebel wirken nur auf die Beschaffung, je nach Profil, Menge und Marktlage, und sind vor Abzug unserer Vergütung angegeben. Ob und wie viel Sie sparen, zeigt erst das konkrete Lieferantenangebot." },
  en: { kopf: "Business electricity, net, broken down", stand: "ct/kWh · Germany, new contracts 2026 · model", heute: "Today, single contract", heuteAria: "Today", pool: "In the pool (model)", poolAria: (a, b) => `In the pool: procurement ${a} to ${b} ct lower, fixed components unchanged`, beschaffung: "Procurement", ersparnis: "Savings", spanne: "Range depending on profile", unten: "lower model assumption for savings", fest: "fixed: grid, levies, tax", bis: "to", fuss: "Rough breakdown (BDEW electricity price analysis – BDEW is the German energy industry association – and our own estimate). Model calculation, not a price commitment: the pool levers only affect procurement, depending on profile, volume and market conditions, and are stated before deduction of our remuneration. Whether and how much you save is only shown by the specific supplier offer." },
};

export default function Hero() {
  const en = spracheDerAnfrage() === "en";
  const punkte = en ? PUNKTE_EN : PUNKTE;
  return (
    <section data-abschnitt="hero" aria-labelledby="hero-titel" className="ov-verlauf-nacht ov-noise relative isolate overflow-hidden text-white">
      <div aria-hidden="true" className="ov-grid-bg absolute inset-0 -z-10 opacity-50" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-ov-300/40 to-transparent" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-40 top-20 -z-10 h-[520px] w-[520px] rounded-full bg-sun-400/10 blur-[120px]" />

      <div className="ov-container pb-20 pt-6 sm:pt-8 md:pb-28 md:pt-10">
        <Breadcrumbs items={[{ name: en ? "Residual power pool for SMEs" : "Reststrom-Pool Mittelstand" }]} dark className="ov-hero-in mb-8 md:mb-12" />

        <div className="grid items-center gap-y-14 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-x-14 xl:gap-x-20">
          <div className="max-w-[36rem]">
            <p className="ov-hero-in inline-flex items-center gap-2 rounded-full bg-white/[0.06] px-3.5 py-1.5 text-[12.5px] font-semibold uppercase tracking-[0.14em] text-ov-300 ring-1 ring-inset ring-white/15" style={{ "--ov-delay": "40ms" }}>
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-ov-300" />
              {en ? "Residual power pool · Businesses" : "Reststrom-Pool · Unternehmen"}
            </p>
            <h1 id="hero-titel" className="ov-h1 ov-hero-in mt-6 text-balance md:mt-8" style={{ "--ov-delay": "100ms" }}>
              {en ? (
                <>
                  The power you still buy, <span className="ov-text-gradient-light">bought together.</span>
                </>
              ) : (
                <>
                  Den Strom, den Sie noch kaufen, <span className="ov-text-gradient-light">gemeinsam einkaufen.</span>
                </>
              )}
            </h1>
            <p className="ov-lead ov-hero-in mt-5 text-pretty text-white/75 md:mt-6" style={{ "--ov-delay": "180ms" }}>
              {en
                ? "Even with its own PV and storage, a business draws a large share of its electricity from the grid. We pool this residual power with the demand of other companies and obtain offers from electricity suppliers for it – if you wish, structured in tranches instead of on a single cut-off date."
                : "Auch mit eigener PV und Speicher bezieht ein Betrieb einen großen Teil seines Stroms aus dem Netz. Diesen Reststrom bündeln wir mit dem Bedarf anderer Unternehmen und holen dafür Angebote von Stromlieferanten ein – auf Wunsch strukturiert in Tranchen statt an einem Stichtag."}
            </p>
            <p className="ov-hero-in mt-4 text-pretty text-[14.5px] leading-relaxed text-white/70" style={{ "--ov-delay": "220ms" }}>
              {en ? (
                <>
                  <strong className="font-semibold text-white">Our role:</strong> We broker; your supply contract is concluded directly with the supplier. What we receive for this&nbsp;– from you or from the supplier&nbsp;– we disclose before the contract is signed.
                </>
              ) : (
                <>
                  <strong className="font-semibold text-white">Unsere Rolle:</strong> Wir vermitteln, Ihr Liefervertrag läuft direkt mit dem Lieferanten. Was wir dafür erhalten&nbsp;– von Ihnen oder vom Lieferanten&nbsp;–, legen wir vor Vertragsschluss offen.
                </>
              )}
            </p>
            <div className="ov-hero-in mt-8 flex flex-col gap-3 sm:flex-row sm:items-center md:mt-10" style={{ "--ov-delay": "260ms" }}>
              <Button href={pfad("/rechner/reststrom")} size="lg" pfeil className="w-full sm:w-auto">{en ? "Calculate savings" : "Ersparnis berechnen"}</Button>
              <Button href="#anfrage" size="lg" variant="outlineLight" className="w-full sm:w-auto">{en ? "Request an offer" : "Angebot anfragen"}</Button>
            </div>
            <ul className="ov-hero-in mt-9 grid gap-x-6 gap-y-3 border-t border-white/10 pt-7 sm:grid-cols-2 md:mt-10" style={{ "--ov-delay": "340ms" }}>
              {punkte.map((x, i) => (
                <li key={i} className={cn("flex items-start gap-2.5 text-[14px] leading-snug text-white/85", i > 1 && "max-sm:hidden")}>
                  <span aria-hidden="true" className="mt-px flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-ov-400/15 ring-1 ring-inset ring-ov-300/40">
                    <Check className="h-2.5 w-2.5 text-ov-300" strokeWidth={3.5} />
                  </span>
                  {x}
                </li>
              ))}
            </ul>
            <p className="ov-hero-in mt-6 text-[13px] leading-relaxed text-white/60" style={{ "--ov-delay": "380ms" }}>
              {en ? (
                <>The pool is currently aimed at companies in Germany. Switzerland: businesses with an annual consumption of 100&nbsp;MWh or more can choose their supplier freely&nbsp;– once you switch, you cannot return to basic supply (Grundversorgung, the regulated default tariff): “once free, always free”.</>
              ) : (
                <>Der Pool richtet sich derzeit an Unternehmen in Deutschland. Schweiz: Den Lieferanten frei wählen können Betriebe ab 100&nbsp;MWh Jahresverbrauch&nbsp;– wer einmal wechselt, kann nicht in die Grundversorgung zurück („einmal frei, immer frei“).</>
              )}
            </p>
          </div>

          <div className="ov-hero-in relative" style={{ "--ov-delay": "300ms" }}>
            <div aria-hidden="true" className="pointer-events-none absolute -inset-x-8 -inset-y-10 -z-10 rounded-full bg-[radial-gradient(closest-side,rgba(140,186,88,0.22),transparent_70%)] blur-2xl" />
            <PreisKarte en={en} />
          </div>
        </div>
      </div>
    </section>
  );
}

function PreisKarte({ en = false }) {
  const k = KARTE[en ? "en" : "de"];
  const fmt = (n, st) => fmtZahl(n, st, en ? "en" : "de");
  const teile = en ? STROM.bestandteile.map(stromTeilEn) : STROM.bestandteile;
  const kurz = en ? KURZ_EN : KURZ;
  const summe = teile.reduce((s, t) => s + t.ct, 0);
  const beschaffung = teile.find((t) => t.beeinflussbar);
  const fix = teile.filter((t) => !t.beeinflussbar);
  const hebelMin = STROM.poolHebel.reduce((s, h) => s + h.ct.min, 0);
  const hebelMax = STROM.poolHebel.reduce((s, h) => s + h.ct.max, 0);
  const pct = (v) => `${(v / summe) * 100}%`;

  return (
    <figure className="rounded-[1.75rem] bg-white p-5 text-ink-900 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)] ring-1 ring-white/20 sm:p-7">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-500">{k.kopf}</span>
        <span className="text-[12px] text-ink-500">{k.stand}</span>
      </figcaption>

      {/* Heute */}
      <div className="mt-5">
        <div className="flex items-baseline justify-between text-[14px]">
          <span className="font-semibold text-ink-800">{k.heute}</span>
          <span className="ov-num font-display text-[20px] font-extrabold">{fmt(summe, 1)}</span>
        </div>
        {/* Einlauf beim Laden: erst „heute“, dann „im Pool“ – der Vergleich entsteht in Lesereihenfolge (Vorhang, reines CSS) */}
        <div className={cn("mt-2 flex h-11 overflow-hidden rounded-xl", s.vorhang, s.laden)} style={{ "--ov-delay": "520ms" }} role="img" aria-label={`${k.heuteAria}: ${teile.map((t) => `${t.label} ${fmt(t.ct, 1)} ct`).join(", ")}`}>
          {teile.map((t) => (
            <span key={t.id} className={cn("flex h-full items-center justify-center border-r-2 border-white last:border-r-0", FARBEN[t.id])} style={{ width: pct(t.ct) }}>
              {t.ct > 1.5 && <span className="ov-num text-[12px] font-semibold text-white">{fmt(t.ct, 1)}</span>}
            </span>
          ))}
        </div>
      </div>

      {/* Im Pool */}
      <div className="mt-5">
        <div className="flex items-baseline justify-between text-[14px]">
          <span className="font-semibold text-ink-800">{k.pool}</span>
          <span className="ov-num font-display text-[20px] font-extrabold text-ov-700">
            {fmt(summe - hebelMax, 1)}–{fmt(summe - hebelMin, 1)}
          </span>
        </div>
        <div className={cn("mt-2 flex h-11 overflow-hidden rounded-xl", s.vorhang, s.laden)} style={{ "--ov-delay": "980ms" }} role="img" aria-label={k.poolAria(fmt(hebelMin, 1), fmt(hebelMax, 1))}>
          <span className={cn("flex h-full items-center justify-center", FARBEN.beschaffung)} style={{ width: pct(beschaffung.ct - hebelMax) }}>
            <span className="ov-num text-[12px] font-semibold text-white">{k.beschaffung}</span>
          </span>
          <span className="h-full border-r-2 border-white bg-[repeating-linear-gradient(135deg,#cde3b1_0_6px,#e6f1d8_6px_12px)]" style={{ width: pct(hebelMax - hebelMin) }} />
          {fix.map((t) => (
            <span key={t.id} className={cn("h-full border-r-2 border-white last:border-r-0", FARBEN[t.id])} style={{ width: pct(t.ct) }} />
          ))}
          <span className="flex h-full items-center justify-center bg-sun-100" style={{ width: pct(hebelMin) }}>
            <span className="sr-only">{k.ersparnis}</span>
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-ink-500" aria-hidden="true">
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-[repeating-linear-gradient(135deg,#aed083_0_3px,#e6f1d8_3px_6px)] ring-1 ring-ov-200" />{k.spanne}</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-sun-100 ring-1 ring-sun-200" />{k.unten}</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-navy-700" />{k.fest}</span>
        </div>
      </div>

      {/* Hebel */}
      <ul className="mt-6 grid gap-2 border-t border-ink-100 pt-5 sm:grid-cols-3">
        {STROM.poolHebel.map((h) => {
          const Icon = HEBEL_ICONS[h.id] || Handshake;
          return (
            <li key={h.id} className="flex items-center gap-3 rounded-xl bg-ov-50/70 px-3 py-2.5 ring-1 ring-inset ring-ov-100 sm:flex-col sm:items-start sm:gap-2">
              <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-ov-700 ring-1 ring-ov-200"><Icon className="h-4 w-4" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] font-semibold leading-snug text-ink-800">{kurz[h.id] || h.label}</span>
                <span className="ov-num block text-[12.5px] font-bold text-ov-700">−{fmt(h.ct.min, 1)} {k.bis} −{fmt(h.ct.max, 1)} ct</span>
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-[11.5px] leading-relaxed text-ink-500">{k.fuss}</p>
    </figure>
  );
}
