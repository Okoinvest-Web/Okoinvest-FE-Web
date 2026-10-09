"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Factory, Info, Landmark, PiggyBank, Sun, Zap } from "lucide-react";
import { Auswahl, Belege, Gruppe, Hauptzahl, Kennzahl, Regler, Schalter, Zahl } from "@/components/Rechner/bausteine";
import { useTeilbarerZustand } from "@/components/Rechner/kontext";
import { ErgebnisKopf, MobilKurz, RechnerRahmen } from "@/components/Rechner/InvestTeile";
import AnfrageFormular from "@/components/Plattform/AnfrageFormular";
import PreisBalken from "./PreisBalken";
import { berechneReststrom, LASTPROFILE, PV_ERTRAG_KWH_PRO_KWP, SINNVOLL_AB_MWH } from "@/lib/rechner/reststrom";
import { cn } from "@/components/ui/cn";
import { useTexte } from "@/components/Sprache/SpracheKontext";
import { useFormate } from "@/components/Sprache/useFormate";
import { LASTPROFILE_EN, STROM_EN, mitTexten, stromTeilEn } from "@/lib/sprache/rechnerBegriffe";

// Sprachmodell: Texte des Rechners
const TEXTE = {
  de: {
    profile: {},
    hebel: {},
    teil: (x) => x,
    ersparnisJahr: "Ersparnis/Jahr",
    jeKwh: "je kWh",
    ctSpanne: (f, a, b) => `${f.fmt(a, 1)}–${f.fmt(b, 1)} ct`,
    reststrom: "Reststrom",
    bezug: "Ihr Strombezug",
    verbrauch: "Jahresverbrauch aus dem Netz",
    verbrauchHinweis: "Steht auf der Jahresabrechnung (1 MWh = 1.000 kWh).",
    preis: "Aktueller Arbeitspreis, netto",
    preisHinweis: "Gesamtpreis je kWh inkl. Netzentgelten, Umlagen und Stromsteuer, ohne Umsatzsteuer und Grundpreis.",
    betrieb: "Betrieb",
    lastprofil: "Lastprofil",
    pv: "Eigene PV-Anlage",
    pvText: "Vorhanden oder geplant, z. B. von ÖKOVOLT",
    leistung: "Leistung",
    status: "Status",
    geplant: ["geplant", "senkt den Bezug"],
    bestand: ["läuft schon", "Verbrauch = Reststrom"],
    produzierend: "Produzierendes Gewerbe",
    produzierendText: "oder Land- und Forstwirtschaft (Stromsteuer)",
    sr: (a, b, c, d) => `Ersparnis im Pool ${a} bis ${b} pro Jahr, ${c} bis ${d} Cent je Kilowattstunde.`,
    ihre: "Ihre Ersparnis im Pool",
    hauptLabel: "Ersparnis Pool pro Jahr",
    mitte: (x) => `Mitte ca. ${x}`,
    jeKwhRest: "je kWh Reststrom",
    stromkostenAnteil: (f, a, b) => `${f.fmt(a, 0)}–${f.fmt(b, 0)} % der Stromkosten`,
    fuerPool: "Reststrom für den Pool",
    nachEigen: (f, x) => `nach ca. ${f.fmt(x, 0)} MWh Eigenverbrauch`,
    gesamterBezug: "gesamter Netzbezug",
    kostenHeute: "Stromkosten heute (Reststrom)",
    nettoOhne: "netto, ohne Grundpreis",
    jeHebel: "Ersparnis je Hebel",
    zerlegung: "Preiszerlegung vorher / nachher",
    zerlegungText: "Nachher mit der Mitte der Spanne. Nur die grüne Beschaffungskomponente ändert sich, die schraffierte Fläche ist die Ersparnis je kWh.",
    heute: "Heute (Einzelvertrag)",
    mitPool: "Mit Reststrom-Pool",
    stromsteuerTitel: "Zusätzlich: Stromsteuer-Entlastung.",
    stromsteuerText: (a, b) => (
      <>
        {" "}Als produzierendes Gewerbe zahlen Sie seit 2026 nur noch den EU-Mindestsatz. Das sind weitere rund <strong>{a}</strong> pro Jahr ({b} ct/kWh) – falls noch nicht beantragt. Die Entlastung wird beim Hauptzollamt beantragt und ist keine Leistung des Pools.
      </>
    ),
    klein: (x) => `Unter etwa ${x} MWh ist der Hebel meist kleiner als die Kosten der strukturierten Beschaffung. Wir prüfen Ihren Fall trotzdem gern.`,
    unplausibel: (x) => `Ihr Preis liegt kaum über Netzentgelten, Umlagen und Steuern (rund ${x} ct/kWh). Prüfen Sie, ob wirklich der Gesamtpreis gemeint ist – oder Sie haben bereits sehr gut eingekauft.`,
    fuss: (x) => `Orientierung, kein Angebot. PV-Ertrag vereinfacht mit ${x} kWh/kWp. Die tatsächliche Ersparnis hängt von Lastgang, Marktlage zum Beschaffungszeitpunkt und Vertragslaufzeit ab.`,
    anfrageTitel: "Mit diesen Werten ein Angebot anfragen",
    oeffnen: "Öffnen",
    button: "Pool-Angebot anfragen",
  },
  en: {
    profile: LASTPROFILE_EN,
    hebel: STROM_EN.hebel,
    teil: stromTeilEn,
    ersparnisJahr: "Savings/year",
    jeKwh: "per kWh",
    ctSpanne: (f, a, b) => `${f.fmt(a, 1)}–${f.fmt(b, 1)} ct`,
    reststrom: "Residual power",
    bezug: "Your power consumption",
    verbrauch: "Annual consumption from the grid",
    verbrauchHinweis: "Shown on your annual bill (1 MWh = 1,000 kWh).",
    preis: "Current energy price, net",
    preisHinweis: "Total price per kWh including grid fees, levies and electricity tax, excluding VAT and standing charge.",
    betrieb: "Operation",
    lastprofil: "Load profile",
    pv: "Own PV plant",
    pvText: "Existing or planned, e.g. by ÖKOVOLT",
    leistung: "Capacity",
    status: "Status",
    geplant: ["planned", "reduces consumption"],
    bestand: ["already running", "consumption = residual power"],
    produzierend: "Manufacturing business",
    produzierendText: "or agriculture and forestry (electricity tax)",
    sr: (a, b, c, d) => `Savings in the pool ${a} to ${b} per year, ${c} to ${d} cents per kilowatt hour.`,
    ihre: "Your savings in the pool",
    hauptLabel: "Pool savings per year",
    mitte: (x) => `mid-point approx. ${x}`,
    jeKwhRest: "per kWh of residual power",
    stromkostenAnteil: (f, a, b) => `${f.fmt(a, 0)}–${f.pct(b, 0)} of power costs`,
    fuerPool: "Residual power for the pool",
    nachEigen: (f, x) => `after approx. ${f.fmt(x, 0)} MWh of self-consumption`,
    gesamterBezug: "total grid consumption",
    kostenHeute: "Power costs today (residual power)",
    nettoOhne: "net, excluding standing charge",
    jeHebel: "Savings per lever",
    zerlegung: "Price breakdown before / after",
    zerlegungText: "After: using the mid-point of the range. Only the green procurement component changes; the hatched area is the saving per kWh.",
    heute: "Today (individual contract)",
    mitPool: "With the residual power pool",
    stromsteuerTitel: "In addition: electricity tax relief.",
    stromsteuerText: (a, b) => (
      <>
        {" "}As a manufacturing business, since 2026 you only pay the EU minimum rate. That is around a further <strong>{a}</strong> per year ({b} ct/kWh) – if not yet applied for. The relief is applied for at the main customs office (Hauptzollamt) and is not a service of the pool.
      </>
    ),
    klein: (x) => `Below about ${x} MWh, the lever is usually smaller than the costs of structured procurement. We are still happy to review your case.`,
    unplausibel: (x) => `Your price is barely above grid fees, levies and taxes (around ${x} ct/kWh). Check whether this really is the total price – or you have already bought very well.`,
    fuss: (x) => `For guidance only, not an offer. PV yield simplified at ${x} kWh/kWp. The actual savings depend on the load profile, the market situation at the time of procurement and the contract term.`,
    anfrageTitel: "Request an offer with these values",
    oeffnen: "Open",
    button: "Request a pool offer",
  },
};

export default function ReststromRechner() {
  const t = useTexte(TEXTE);
  const f = useFormate();
  const { fmt, fmtEur } = f;
  // auf 100 € gerundet – mehr Genauigkeit gibt eine Spanne nicht her
  const eurK = (n) => fmtEur(Math.round(n / 100) * 100);
  const [verbrauch, setVerbrauch] = useState(500);
  const [preis, setPreis] = useState(22);
  const [profil, setProfil] = useState("einschicht");
  const [pvAn, setPvAn] = useState(false);
  const [pvKwp, setPvKwp] = useState(250);
  const [pvStatus, setPvStatus] = useState("geplant");
  const [produzierend, setProduzierend] = useState(false);

  const r = useMemo(
    () =>
      berechneReststrom({
        verbrauchMwh: verbrauch,
        preisCt: preis,
        profil,
        pvKwp: pvAn ? pvKwp : 0,
        pvBestand: pvAn && pvStatus === "bestand",
        produzierend,
      }),
    [verbrauch, preis, profil, pvAn, pvKwp, pvStatus, produzierend]
  );

  // Teilen-Link: Eingaben in der Adresszeile (nur Abweichungen vom Standard)
  const SETZER = { verbrauch: setVerbrauch, preis: setPreis, profil: setProfil, pvAn: setPvAn, pvKwp: setPvKwp, pvStatus: setPvStatus, produzierend: setProduzierend };
  useTeilbarerZustand(
    { verbrauch, preis, profil, pvAn, pvKwp, pvStatus, produzierend },
    (neu) => Object.entries(neu).forEach(([k, v]) => SETZER[k]?.(v)),
    {
      optionen: { profil: LASTPROFILE.map((l) => l.id), pvStatus: ["geplant", "bestand"] },
      grenzen: { verbrauch: [20, 5000], preis: [12, 40], pvKwp: [10, 2000] },
    }
  );

  const maxHebel = Math.max(...r.hebel.map((h) => h.eurMax), 1);
  const skala = Math.max(preis, r.fixSumme + 1);

  return (
    <RechnerRahmen
      breiteLinks={400}
      eingaben={
        <>
          <MobilKurz
            werte={[
              [t.ersparnisJahr, `${eurK(r.gesamt.eurMin)} – ${eurK(r.gesamt.eurMax)}`],
              [t.jeKwh, t.ctSpanne(f, r.gesamt.ctMin, r.gesamt.ctMax)],
              [t.reststrom, `${fmt(r.reststromKwh / 1000)} MWh`],
            ]}
          />
          <Gruppe titel={t.bezug}>
            <Regler
              label={t.verbrauch}
              wert={verbrauch}
              min={20}
              max={5000}
              step={10}
              einheit="MWh"
              onChange={setVerbrauch}
              hinweis={t.verbrauchHinweis}
            />
            <Regler
              label={t.preis}
              wert={preis}
              min={12}
              max={40}
              step={0.1}
              stellen={1}
              einheit="ct/kWh"
              onChange={setPreis}
              hinweis={t.preisHinweis}
            />
          </Gruppe>

          <Gruppe titel={t.betrieb} className="mt-8">
            <Auswahl legende={t.lastprofil} optionen={mitTexten(LASTPROFILE, t.profile)} wert={profil} onChange={setProfil} spalten={2} />
            <Schalter
              label={t.pv}
              beschreibung={t.pvText}
              an={pvAn}
              onChange={setPvAn}
              icon={Sun}
            >
              <div className="space-y-5">
                <Regler label={t.leistung} wert={pvKwp} min={10} max={2000} step={10} einheit="kWp" onChange={setPvKwp} />
                <Auswahl
                  legende={t.status}
                  klein
                  optionen={[
                    { id: "geplant", label: t.geplant[0], sub: t.geplant[1] },
                    { id: "bestand", label: t.bestand[0], sub: t.bestand[1] },
                  ]}
                  wert={pvStatus}
                  onChange={setPvStatus}
                />
              </div>
            </Schalter>
            <Schalter
              label={t.produzierend}
              beschreibung={t.produzierendText}
              an={produzierend}
              onChange={setProduzierend}
              icon={Factory}
            />
          </Gruppe>
        </>
      }
      ergebnis={
        <>
          <p className="sr-only" aria-live="polite">
            {t.sr(eurK(r.gesamt.eurMin), eurK(r.gesamt.eurMax), fmt(r.gesamt.ctMin, 1), fmt(r.gesamt.ctMax, 1))}
          </p>
          <ErgebnisKopf titel={t.ihre} plakette={`${fmt(verbrauch)} MWh · ${fmt(preis, 1)} ct/kWh`} />
          <Hauptzahl className="mt-5" icon={PiggyBank} label={t.hauptLabel} zusatz={t.mitte(eurK(r.gesamt.eurMitte))}>
            <Zahl wert={Math.round(r.gesamt.eurMin / 100) * 100} prefix={f.sprache === "en" ? "€" : ""} /> – <Zahl wert={Math.round(r.gesamt.eurMax / 100) * 100} prefix={f.sprache === "en" ? "€" : ""} suffix={f.sprache === "en" ? "" : " €"} />
          </Hauptzahl>

          <Belege>
            <Kennzahl label={t.jeKwhRest} ton="akzent" icon={Zap} zusatz={t.stromkostenAnteil(f, r.gesamt.anteilMin * 100, r.gesamt.anteilMax * 100)}>
              <Zahl wert={r.gesamt.ctMin} stellen={1} />–<Zahl wert={r.gesamt.ctMax} stellen={1} suffix=" ct" />
            </Kennzahl>
            <Kennzahl label={t.fuerPool} ton="sand" zusatz={r.eigenverbrauch > 0 ? t.nachEigen(f, r.eigenverbrauch / 1000) : t.gesamterBezug}>
              <Zahl wert={r.reststromKwh / 1000} suffix=" MWh" />
            </Kennzahl>
            <Kennzahl label={t.kostenHeute} ton="sand" zusatz={t.nettoOhne}>
              <Zahl wert={Math.round(r.kostenVorher / 100) * 100} format={(v) => fmtEur(v)} />
            </Kennzahl>
          </Belege>

          {/* Hebel */}
          <h3 className="mt-8 font-display text-[18px] font-bold text-ink-900">{t.jeHebel}</h3>
          <ul className="mt-4 space-y-4">
            {r.hebel.map((h) => (
              <li key={h.id}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-[14px]">
                  <span className="font-semibold text-ink-800">{t.hebel[h.id] ?? h.label}</span>
                  <span className="ov-num text-ink-600">
                    {fmt(h.ctMin, 2)}–{fmt(h.ctMax, 2)} ct · <strong className="text-ink-900">{eurK(h.eurMin)} – {eurK(h.eurMax)}</strong>
                  </span>
                </div>
                <div className="relative mt-2 h-3 rounded-full bg-ink-100" aria-hidden="true">
                  <div
                    className="absolute inset-y-0 rounded-full bg-ov-500/80 transition-all duration-500"
                    style={{ left: `${(h.eurMin / maxHebel) * 100}%`, width: `${Math.max(((h.eurMax - h.eurMin) / maxHebel) * 100, 1)}%` }}
                  />
                  <div className="absolute inset-y-0 left-0 rounded-full bg-ov-200 transition-all duration-500" style={{ width: `${(h.eurMin / maxHebel) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>

          {/* Preiszerlegung */}
          <h3 className="mt-9 font-display text-[18px] font-bold text-ink-900">{t.zerlegung}</h3>
          <p className="mt-1 text-[13.5px] text-ink-500">{t.zerlegungText}</p>
          <PreisBalken
            className="mt-5"
            max={skala}
            ersparnis
            sprache={f.sprache}
            zeilen={[
              { titel: t.heute, teile: r.vorher.map(t.teil) },
              { titel: t.mitPool, teile: r.nachher.map(t.teil) },
            ]}
          />

          {/* Hinweise */}
          <div className="mt-8 space-y-3">
            {r.stromsteuer && (
              <p className="flex gap-3 rounded-2xl bg-navy-50 p-4 text-[14px] leading-relaxed text-navy-900 ring-1 ring-navy-100">
                <Landmark aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-navy-600" />
                <span>
                  <strong>{t.stromsteuerTitel}</strong>
                  {t.stromsteuerText(eurK(r.stromsteuer.eur), fmt(r.stromsteuer.ctJeKwh, 2))}
                </span>
              </p>
            )}
            {r.klein && (
              <p className="flex gap-3 rounded-2xl bg-sun-400/10 p-4 text-[14px] leading-relaxed text-ink-800 ring-1 ring-sun-400/30">
                <AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-sun-500" />
                {t.klein(fmt(SINNVOLL_AB_MWH))}
              </p>
            )}
            {r.preisUnplausibel && (
              <p className="flex gap-3 rounded-2xl bg-sun-400/10 p-4 text-[14px] leading-relaxed text-ink-800 ring-1 ring-sun-400/30">
                <AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-sun-500" />
                {t.unplausibel(fmt(r.fixSumme, 1))}
              </p>
            )}
            <p className="flex gap-3 text-[13px] leading-relaxed text-ink-500">
              <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
              {t.fuss(fmt(PV_ERTRAG_KWH_PRO_KWP))}
            </p>
          </div>
        </>
      }
      unten={
        <details className="group rounded-3xl bg-sand-50 ring-1 ring-ink-200/70 open:bg-white">
          <summary className={cn("flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-display text-[17px] font-bold text-ink-900 [&::-webkit-details-marker]:hidden")}>
            {t.anfrageTitel}
            <span className="rounded-full bg-ov-600 px-4 py-2 text-[13.5px] font-semibold text-white group-open:hidden">{t.oeffnen}</span>
          </summary>
          <div className="px-5 pb-6">
            <AnfrageFormular
              typ="reststrom"
              felder={["firma", "telefon", "plz", "nachricht"]}
              button={t.button}
              daten={{
                quelle: "rechner-reststrom",
                verbrauchMwh: verbrauch,
                arbeitspreisCt: preis,
                lastprofil: profil,
                pvKwp: pvAn ? pvKwp : 0,
                pvStatus: pvAn ? pvStatus : null,
                produzierendesGewerbe: produzierend,
                ersparnisEurMin: Math.round(r.gesamt.eurMin),
                ersparnisEurMax: Math.round(r.gesamt.eurMax),
              }}
            />
          </div>
        </details>
      }
    />
  );
}
