// Hero der Seite /bestandsanlagen – Nachtbühne mit Bewertungsansicht.
// Alle Zahlen stammen aus rechneBestand() (Beispiel 2 MWp Freifläche, IBN 2013) – keine echten Anlagendaten.
import { Check, FileLock2, Gauge, Lock, Search } from "lucide-react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { TextEnthuellung, Zaehler } from "@/components/motion";
import { fmt } from "@/lib/rechner/annahmen";

/** Cashflow-Säulen je Jahr – Farben wie im Bewertungsrechner: Förderphase grün, Marktphase gelb, Tausch/Rückbau navy */
function CashflowSaeulen({ jahre, foerderEnde }) {
  const W = 480;
  const H = 120;
  const max = Math.max(...jahre.map((j) => Math.abs(j.cf)));
  const b = W / jahre.length;
  const null0 = H * 0.86; // Nulllinie – Platz für negative Jahre
  const iEnde = jahre.findIndex((j) => j.jahr > foerderEnde);
  return (
    <svg viewBox={`0 0 ${W} ${H + 20}`} className="ov-sofort block h-auto w-full" style={{ "--ov-delay": "650ms" }} aria-hidden="true">
      {iEnde > 0 && <rect x={iEnde * b} y="0" width={W - iEnde * b} height={H} className="fill-sun-100" fillOpacity="0.6" />}
      {jahre.map((j, i) => {
        const h = (Math.abs(j.cf) / max) * null0 * 0.95;
        const neg = j.cf < 0;
        return (
          <rect
            key={j.jahr}
            x={i * b + 1.5}
            y={neg ? null0 : null0 - h}
            width={b - 3}
            height={Math.max(neg ? Math.min(h, H - null0) : h, 1.5)}
            rx="1.5"
            className={cn("ov-balken-y", j.wr > 0 || j.rueckbau > 0 ? "fill-navy-600" : j.gefoerdert ? "fill-ov-500" : "fill-sun-400")}
            style={{ "--i": i * 0.5, ...(neg ? { transformOrigin: "50% 0%" } : {}) }}
          />
        );
      })}
      <line x1="0" x2={W} y1={null0} y2={null0} stroke="#03122b" strokeOpacity="0.25" />
      {iEnde > 0 && <line x1={iEnde * b} x2={iEnde * b} y1="0" y2={H} className="stroke-sun-600" strokeDasharray="3 3" />}
      <text x="0" y={H + 16} fontSize="11" fill="#5b6475">{jahre[0].jahr}</text>
      {iEnde > 0 && <text x={iEnde * b + 4} y="12" fontSize="11" className="fill-sun-700" fontWeight="600">Förderende {foerderEnde}</text>}
      <text x={W} y={H + 16} fontSize="11" fill="#5b6475" textAnchor="end">{jahre.at(-1).jahr}</text>
    </svg>
  );
}

function Buehne({ bsp, ct, jahr }) {
  return (
    <div className="relative">
      {/* Bewertungskarte */}
      <div className="ov-hero-in relative rounded-[1.5rem] bg-white p-5 text-ink-900 shadow-e4 ring-1 ring-black/5 sm:p-6" style={{ "--ov-delay": "380ms" }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-500">
              <Gauge aria-hidden="true" className="h-3.5 w-3.5 text-ov-600" />
              Ertragswert (DCF)
            </p>
            <p className="ov-num mt-2 font-display text-[32px] font-extrabold leading-none tracking-tight sm:text-[38px]"><Zaehler wert={bsp.wert / 1e6} nachkomma={2} nach=" Mio. €" dauer={1300} verzoegerung={500} /></p>
            <p className="ov-num mt-2 text-[13px] text-ink-600">
              <strong className="text-ink-900">{fmt(bsp.wertProKwp)} €</strong> je kWp · Spanne {fmt(bsp.spanneProKwp.min)}–{fmt(bsp.spanneProKwp.max)} €
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-sun-50 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.06em] text-sun-700 ring-1 ring-sun-200">Beispiel</span>
        </div>
        <div className="mt-5 rounded-2xl bg-sand-50 p-3 ring-1 ring-ink-100 sm:p-4">
          <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-ink-600">
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-ov-500" />Förderphase</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-sun-400" />Marktphase</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-navy-600" />Tausch, Rückbau</span>
          </div>
          <CashflowSaeulen jahre={bsp.jahre} foerderEnde={bsp.foerderEnde} />
        </div>
        <p className="mt-3 text-[11.5px] text-ink-500 sm:text-right">Freier Cashflow je Jahr ab {bsp.start}, abgezinst zum Ertragswert</p>
      </div>

      {/* Teaser-Karte */}
      <div className="ov-hero-in relative mx-3 -mt-3 rounded-2xl bg-navy-900/95 p-4 text-white shadow-e4 ring-1 ring-white/12 backdrop-blur sm:absolute sm:-bottom-40 sm:-left-6 sm:mx-0 sm:mt-0 sm:w-[270px] lg:-left-10" style={{ "--ov-delay": "620ms" }}>
        <p className="flex items-center justify-between text-[11.5px] font-semibold uppercase tracking-[0.08em] text-white/60">
          Teaser · anonym
          <Search aria-hidden="true" className="h-3.5 w-3.5 text-ov-300" />
        </p>
        <dl className="ov-num mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[13px]">
          {[
            ["Region", "Süddeutschland"],
            ["Typ", "Freifläche"],
            ["Leistung", `${fmt(bsp.eingabe.kwp / 1000)} MWp`],
            ["Inbetriebnahme", String(jahr)],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-[11px] text-white/50">{k}</dt>
              <dd className="font-semibold text-white/90">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 flex items-center gap-2 border-t border-white/10 pt-3 text-[12px] text-white/70">
          <Lock aria-hidden="true" className="h-3.5 w-3.5 text-sun-300" />
          Standort &amp; Verträge nach NDA · {fmt(ct, 0)} ct/kWh
        </p>
      </div>

      {/* Datenraum-Chip */}
      <div className="ov-hero-in absolute -right-3 -top-5 hidden items-center gap-2 rounded-full bg-white px-3.5 py-2 text-[12.5px] font-semibold text-ink-800 shadow-e3 ring-1 ring-ink-200 sm:flex lg:-right-6" style={{ "--ov-delay": "760ms" }}>
        <FileLock2 aria-hidden="true" className="h-4 w-4 text-ov-600" />
        Datenraum: jeder Zugriff protokolliert
      </div>
    </div>
  );
}

export default function Hero({ bsp, ct, jahr, provision, boerse }) {
  const punkte = ["Rechenweg offen", `Provision ${provision} nur bei Abschluss`, "Für Käufer kostenfrei", "Betrieb aus der Gruppe möglich"];
  return (
    <section data-abschnitt="hero" aria-labelledby="hero-titel" className="ov-verlauf-nacht ov-noise relative isolate overflow-hidden text-white">
      <div aria-hidden="true" className="ov-grid-bg absolute inset-0 -z-10 opacity-50" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-ov-300/40 to-transparent" />
      <div aria-hidden="true" className="pointer-events-none absolute -left-40 -top-40 -z-10 h-[520px] w-[520px] rounded-full bg-ov-500/20 blur-[120px]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-b from-transparent to-navy-950/50" />

      <div className="ov-container pb-24 pt-6 sm:pt-8 md:pb-36 md:pt-10">
        <Breadcrumbs items={[{ name: "Bestandsanlagen" }]} dark className="ov-hero-in mb-8 md:mb-12" />
        <div className="grid items-center gap-y-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-x-14 xl:gap-x-20">
          <div className="max-w-[36rem]">
            <p className="ov-hero-in inline-flex items-center gap-2 text-[12.5px] font-semibold uppercase tracking-[0.16em] text-ov-300" style={{ "--ov-delay": "40ms" }}>
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-ov-300" />
              Zweitmarkt PV-Bestandsanlagen
            </p>
            <h1 id="hero-titel" className="ov-h1 mt-5 text-balance md:mt-6">
              <TextEnthuellung verzoegerung={80}>
                PV-Bestandsanlagen: <span className="ov-text-gradient-light">fair bewertet, vertraulich verkauft.</span>
              </TextEnthuellung>
            </h1>
            <p className="ov-lead ov-hero-in mt-5 text-pretty text-white/75 md:mt-6" style={{ "--ov-delay": "180ms" }}>
              Solarparks und Dachanlagen mit Ertragshistorie im DACH-Raum: Bewertung nach Ertragswert, geprüfte Unterlagen, Datenraum nach NDA – <span className="text-white">und eine Provision, die Sie vorher kennen.</span>
            </p>
            <div className="ov-hero-in mt-8 flex flex-col gap-3 sm:flex-row sm:items-center md:mt-10" style={{ "--ov-delay": "260ms" }}>
              <Button href="/rechner/bestandsanlage" size="lg" pfeil magnetisch className="w-full sm:w-auto">Anlage bewerten</Button>
              <Button href={boerse} size="lg" variant="outlineLight" className="w-full sm:w-auto">Bestand in der Börse</Button>
            </div>
            <div className="ov-hero-in mt-9 border-t border-white/10 pt-7 md:mt-10" style={{ "--ov-delay": "340ms" }}>
              <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {punkte.map((x, i) => (
                  <li key={x} className={cn("flex items-start gap-2.5 text-[14px] leading-snug text-white/85", i > 1 && "max-sm:hidden")}>
                    <span aria-hidden="true" className="mt-px flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-ov-400/15 ring-1 ring-inset ring-ov-300/40">
                      <Check className="h-2.5 w-2.5 text-ov-300" strokeWidth={3.5} />
                    </span>
                    {x}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <figure className="relative mx-auto w-full max-w-[560px] lg:mx-0 lg:max-w-none">
            <div aria-hidden="true" className="pointer-events-none absolute -inset-x-8 -inset-y-12 -z-10 rounded-full bg-[radial-gradient(closest-side,rgba(140,186,88,0.22),transparent_70%)] blur-2xl" />
            <Buehne bsp={bsp} ct={ct} jahr={jahr} />
            <figcaption className="mt-6 text-center text-[12px] text-white/60 sm:mt-48 sm:pl-[260px] sm:text-left">
              Beispielbewertung: 2 MWp Freifläche, Inbetriebnahme {jahr}, Standardannahmen des Bewertungsrechners
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
