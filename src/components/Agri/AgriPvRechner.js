"use client";

import { SperrEingaben } from "@/components/Rechner/LaenderSperre";
import { useMemo, useState } from "react";
import { Banknote, Gauge, Info, Sprout, Sun, Trophy, Zap } from "lucide-react";
import Button from "@/components/ui/Button";
import ZumFlaechencheck from "@/components/Flaeche/Seite/ZumFlaechencheck";
import { cn } from "@/components/ui/cn";
import { Auswahl, Belege, Gruppe, Hauptzahl, Kennzahl, Regler, Zahl } from "@/components/Rechner/bausteine";
import { useTeilbarerZustand } from "@/components/Rechner/kontext";
import { ErgebnisKopf, MobilKurz, RechnerRahmen } from "@/components/Rechner/InvestTeile";
import { WEGE } from "./wege";
import AgriBild from "./AgriBild";
import { AGRI, ERLOESE, PACHT, REGIONEN } from "@/lib/invest/markt";
import { SYSTEME, agriVergleich, kulturById, systemPasst } from "@/lib/rechner/agriPv";
import { REGION_KURZ } from "@/lib/rechner/pacht";
import { fmt, fmtEur, fmtPct } from "@/lib/rechner/annahmen";
import { pfad } from "@/lib/land";

const betrag = (v) => {
  const a = Math.abs(v);
  const s = v < 0 ? "−" : "";
  return a >= 1e6 ? `${s}${fmt(a / 1e6, 2)} Mio. €` : `${s}${fmt(Math.round(a / 1000))} Tsd. €`;
};

const WEG_META = {
  pacht: { weg: WEGE.find((w) => w.id === "investor"), titel: "Verpachten", sub: "Investor baut, Sie ernten weiter" },
  eigen: { weg: WEGE.find((w) => w.id === "eigen"), titel: "Selbst investieren", sub: "Ihre Anlage, wir bauen & vermarkten" },
  genossenschaft: { weg: WEGE.find((w) => w.id === "genossenschaft"), titel: "Genossenschaft", sub: "Pacht + Anteil als Mitglied" },
};

export default function AgriPvRechner() {
  const [ha, setHa] = useState(10);
  const [system, setSystem] = useState("vertikal");
  const [kulturId, setKulturId] = useState("acker");
  const [regionId, setRegionId] = useState("de-sued");
  const [vermarktung, setVermarktung] = useState("eeg");
  const [db, setDb] = useState(kulturById("acker").db);
  const [anteil, setAnteil] = useState(AGRI.beteiligungAnteil.standard * 100);

  const kultur = kulturById(kulturId);
  const land = REGIONEN.find((r) => r.id === regionId)?.land;

  function kulturWaehlen(id) {
    setKulturId(id);
    const k = kulturById(id);
    setDb(k.db);
    if (!systemPasst(k, system)) setSystem("hoch");
  }

  const r = useMemo(
    () => agriVergleich({ ha, system, kulturId, regionId, dbProHa: db, vermarktung, anteil: anteil / 100 }),
    [ha, system, kulturId, regionId, db, vermarktung, anteil]
  );
  const [pacht, eigen, gen] = r.wege;
  const bester = [...r.wege].sort((a, b) => b.gesamtSumme - a.gesamtSumme)[0].id;
  const maxSumme = Math.max(...r.wege.map((w) => w.gesamtSumme), 1);
  const besterWeg = r.wege.find((w) => w.id === bester);

  // Teilen-Link: Eingaben in der Adresszeile (nur Abweichungen vom Standard)
  const SETZER = { ha: setHa, system: setSystem, kulturId: setKulturId, regionId: setRegionId, vermarktung: setVermarktung, db: setDb, anteil: setAnteil };
  useTeilbarerZustand(
    { ha, system, kulturId, regionId, vermarktung, db, anteil },
    (neu) => Object.entries(neu).forEach(([k, v]) => SETZER[k]?.(v)),
    {
      optionen: { system: SYSTEME.map((x) => x.id), kulturId: AGRI.kulturen.map((k) => k.id), regionId: REGIONEN.map((x) => x.id), vermarktung: ["eeg", "ppa"] },
      grenzen: { ha: [1, 50], db: [0, 10000], anteil: [AGRI.beteiligungAnteil.min * 100, AGRI.beteiligungAnteil.max * 100] },
    }
  );

  // Länder-Sperre (Paket E): für AT/CH nur die Regionswahl und der Hinweis aus markt.js
  const sperre = r.sperre;
  const regionWahl = (
    <Auswahl legende="Region" wert={regionId} onChange={setRegionId} spalten={3} klein optionen={REGIONEN.map((x) => ({ id: x.id, label: REGION_KURZ[x.id] || x.label }))} />
  );

  return (
    <RechnerRahmen
      breiteLinks={390}
      mitlaufend
      sperre={sperre}
      eingaben={sperre ? (
        <SperrEingaben>{regionWahl}</SperrEingaben>
      ) : (
        <>
          <MobilKurz
            werte={[
              ["Leistung", `${fmt(r.anlage.kwp / 1000, 1)} MWp`],
              ["Pacht/Jahr", `${fmt(Math.round(pacht.energieJahr / 1000))} Tsd. €`],
              ["IRR eigen", eigen.irr != null ? fmtPct(eigen.irr, 1) : "–"],
            ]}
          />
          <div className="space-y-8">
            <Gruppe titel="Fläche & System">
              <Regler label="Fläche" wert={ha} min={1} max={50} step={0.5} stellen={ha % 1 ? 1 : 0} einheit="ha" onChange={setHa} hinweis={ha <= AGRI.privilegierungHa ? `Bis ${fmt(AGRI.privilegierungHa, 1)} ha hofnah ggf. ohne Bebauungsplan (§ 35 BauGB)` : "Größere Anlagen brauchen in der Regel einen Bebauungsplan"} />
              <Auswahl legende="Kultur" wert={kulturId} onChange={kulturWaehlen} spalten={2} klein optionen={AGRI.kulturen.map((k) => ({ id: k.id, label: k.label, sub: k.sub }))} />
              <Auswahl
                legende="System"
                wert={system}
                onChange={(v) => (systemPasst(kultur, v) ? setSystem(v) : null)}
                optionen={SYSTEME.map((s) => ({ id: s.id, label: s.label, sub: systemPasst(kultur, s.id) ? s.sub : "für Kultur unüblich" }))}
              />
              {regionWahl}
            </Gruppe>

            <Gruppe titel="Vermarktung & Beteiligung">
              {land === "DE" ? (
                <Auswahl
                  legende="Stromvermarktung"
                  wert={vermarktung}
                  onChange={setVermarktung}
                  optionen={[
                    { id: "eeg", label: "EEG-Zuschlag", sub: `${fmt(system === "hoch" ? ERLOESE.eegBesondereCt : ERLOESE.eegFreiflaecheCt, 1)} ct/kWh` },
                    { id: "ppa", label: "PPA", sub: `${fmt(ERLOESE.ppaCt.mittel, 1)} ct/kWh` },
                  ]}
                />
              ) : (
                <p className="rounded-2xl bg-white px-4 py-3 text-[13.5px] leading-relaxed text-ink-600 ring-1 ring-ink-200">
                  In {land === "AT" ? "Österreich" : "der Schweiz"} rechnen wir mit einem Stromliefervertrag (PPA) von {fmt(ERLOESE.ppaCt.mittel, 1)} ct/kWh; Förderungen nach {land === "AT" ? "EAG" : "Einmalvergütung"} prüfen wir im Einzelfall.
                </p>
              )}
              <Regler
                label="Ihr Anteil an der Anlage (Genossenschaft)"
                wert={anteil}
                min={AGRI.beteiligungAnteil.min * 100}
                max={AGRI.beteiligungAnteil.max * 100}
                step={1}
                einheit="%"
                onChange={setAnteil}
                hinweis={`Einlage ≈ ${betrag(gen.invest)}`}
              />
            </Gruppe>

            <Gruppe titel="Landwirtschaft">
              <Regler
                label="Deckungsbeitrag ohne Anlage"
                wert={db}
                min={0}
                max={kulturId === "sonder" ? 10000 : 1500}
                step={kulturId === "sonder" ? 100 : 10}
                format={(v) => `${fmt(v)} €/ha`}
                onChange={setDb}
                hinweis={`Unter dem System ca. ${fmt(r.landwirtschaft.ertragLw * 100)} % davon (inkl. Flächenverlust)`}
              />
            </Gruppe>

            {/* Vorschau des gewählten Systems */}
            <figure className="overflow-hidden rounded-2xl bg-white ring-1 ring-ink-200/70">
              <AgriBild typ={r.system} className="block h-auto w-full" />
              <figcaption className="flex items-center justify-between gap-3 border-t border-ink-100 px-4 py-3 text-[12.5px]">
                <span className="font-semibold text-ink-800">{SYSTEME.find((x) => x.id === r.system)?.label}</span>
                <span className="ov-num shrink-0 text-ink-500">
                  {fmt(ha, ha % 1 ? 1 : 0)} ha · {fmt(r.anlage.kwp / 1000, 2)} MWp
                </span>
              </figcaption>
            </figure>
          </div>
        </>
      )}
      ergebnis={
        <>
          <p className="sr-only" aria-live="polite">
            {`Anlage ${fmt(r.anlage.kwp / 1000, 1)} Megawatt Peak. Verpachten ${Math.round(pacht.gesamtSumme)} Euro, Eigeninvestition ${Math.round(eigen.gesamtSumme)} Euro, Genossenschaft ${Math.round(gen.gesamtSumme)} Euro über ${r.laufzeit} Jahre.`}
          </p>
          <ErgebnisKopf titel="Drei Wege im Vergleich" plakette={`${r.laufzeit} Jahre · vor Steuern`} />

          {/* Hauptzahl: der Weg mit der höchsten Summe */}
          <Hauptzahl className="mt-5" icon={Trophy} label={`Höchste Summe: ${WEG_META[bester].titel}`} zusatz={`${r.laufzeit} Jahre inkl. Landwirtschaft, nominal`}>
            <Zahl wert={besterWeg.gesamtSumme / 1000} suffix=" Tsd. €" />
          </Hauptzahl>

          {/* Anlage */}
          <Belege spalten={4}>
            <Kennzahl icon={Zap} label="Leistung">{`${fmt(r.anlage.kwp / 1000, 2)} MWp`}</Kennzahl>
            <Kennzahl icon={Sun} label="Strom pro Jahr">{`${fmt(r.anlage.kwh / 1000)} MWh`}</Kennzahl>
            <Kennzahl icon={Banknote} label="Investition">{betrag(r.anlage.capex)}</Kennzahl>
            <Kennzahl icon={Gauge} label="Erlös">{`${fmt(r.ctFoerder, 1)} ct/kWh`}</Kennzahl>
          </Belege>
          {kulturId === "sonder" && (
            <p className="mt-3 text-[13px] leading-relaxed text-ink-500">Bei Obst und Beeren ersetzt das Moduldach oft Hagelnetz oder Folientunnel und sichert Qualität – diese Einsparung ist hier nicht eingerechnet und kann die Rechnung deutlich verbessern.</p>
          )}
          {r.systemGewechselt && (
            <p className="mt-3 text-[13px] text-ink-500">Für {kultur.label} rechnen wir mit hoch aufgeständerter Agri-PV (Kategorie I).</p>
          )}

          {/* Drei Wege */}
          <div className="mt-5 grid gap-3 xl:grid-cols-3">
            {r.wege.map((w) => {
              const m = WEG_META[w.id];
              const Icon = m.weg.icon;
              const top = w.id === bester;
              return (
                <div key={w.id} className={cn("relative flex flex-col rounded-3xl p-5 ring-1", top ? "bg-ov-50 ring-2 ring-ov-500" : "bg-white ring-ink-200/70")}>
                  {top && <span className="absolute -top-3 left-5 rounded-full bg-ov-600 px-2.5 py-0.5 text-[11.5px] font-semibold text-white">Höchste Summe</span>}
                  <div className="flex items-center gap-3">
                    <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", top ? "bg-ov-500 text-white" : "bg-sand-50 text-ov-600 ring-1 ring-ink-200")}>
                      <Icon aria-hidden="true" className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-[16.5px] font-bold leading-tight text-ink-900">{m.titel}</p>
                      <p className="text-[12.5px] leading-snug text-ink-500">
                        <span className="font-semibold text-ink-600">Weg {m.weg.buchstabe}</span> · {m.sub}
                      </p>
                    </div>
                  </div>
                  {/* Anteil an der höchsten Summe */}
                  <div aria-hidden="true" className="mt-4 h-1.5 overflow-hidden rounded-full bg-ink-100">
                    <span className={cn("block h-full rounded-full", top ? "bg-ov-500" : "bg-ink-300")} style={{ width: `${Math.max(0, (w.gesamtSumme / maxSumme) * 100)}%` }} />
                  </div>
                  <p className="mt-4 text-[12.5px] font-medium text-ink-500">Summe {r.laufzeit} Jahre inkl. Landwirtschaft</p>
                  <p className="ov-num font-display text-[26px] font-extrabold leading-tight tracking-tight text-ink-900">
                    <Zahl wert={w.gesamtSumme / 1000} suffix=" Tsd. €" />
                  </p>
                  <dl className="mt-4 space-y-2 border-t border-ink-200/70 pt-4 text-[13.5px]">
                    <Zeile k="Eigene Investition" v={w.invest ? betrag(w.invest) : "keine"} />
                    <Zeile k="Energie im 1. Jahr" v={fmtEur(w.energieJahr)} />
                    <Zeile k="Projektrendite (IRR)" v={w.irr != null ? fmtPct(w.irr, 1) : "–"} />
                    <Zeile k="Amortisation" v={w.invest ? (w.amortisation ? `${fmt(w.amortisation, 1)} Jahre` : "> Laufzeit") : "sofort"} />
                    <Zeile k="Risiko" v={w.risiko} />
                  </dl>
                </div>
              );
            })}
          </div>

          {/* Balken */}
          <div className="mt-5 rounded-3xl p-5 ring-1 ring-ink-200/70 md:p-6">
            <p className="font-display text-[16px] font-bold text-ink-900">Woraus sich die Summe zusammensetzt</p>
            <div className="mt-4 space-y-3.5">
              {r.wege.map((w) => {
                const lw = r.landwirtschaft.summe;
                const en = w.gesamtSumme - lw;
                return (
                  <div key={w.id}>
                    <div className="mb-1.5 flex justify-between gap-3 text-[13px]">
                      <span className="font-semibold text-ink-800">{WEG_META[w.id].titel}</span>
                      <span className="ov-num text-right text-ink-600">
                        {betrag(w.gesamtSumme)}
                      </span>
                    </div>
                    <div className="flex h-3 overflow-hidden rounded-full bg-ink-100">
                      <span className="h-full bg-sun-400" style={{ width: `${(Math.max(0, lw) / maxSumme) * 100}%` }} />
                      <span className="h-full bg-ov-500" style={{ width: `${(Math.max(0, en) / maxSumme) * 100}%` }} />
                    </div>
                    <p className="ov-num mt-1 text-[12px] text-ink-500">
                      Landwirtschaft {betrag(lw)} · Energie {betrag(en)}
                    </p>
                  </div>
                );
              })}
            </div>
            <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-[12.5px] text-ink-600">
              <li className="flex items-center gap-2"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-sun-400" />Landwirtschaft: Deckungsbeitrag + GAP</li>
              <li className="flex items-center gap-2"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-ov-500" />Energie: Pacht bzw. Überschuss nach Investition</li>
            </ul>
          </div>

          {/* Landwirtschaft */}
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Mini icon={Sprout} k="Deckungsbeitrag/Jahr" v={fmtEur(r.landwirtschaft.dbJahr)} z={`ohne Anlage ${fmtEur(r.landwirtschaft.dbOhneAnlage)}`} />
            <Mini icon={Info} k="GAP-Direktzahlung/Jahr" v={r.land === "CH" ? "nicht gerechnet" : fmtEur(r.landwirtschaft.gapJahr)} z={r.land === "CH" ? "CH-Direktzahlungen eigenes System" : `${fmt(AGRI.gapFoerderfaehig * 100)} % der Fläche förderfähig`} />
            <Mini icon={Zap} k="Agri-Pacht/Jahr" v={fmtEur(r.pachtJahr0)} z={`${fmt(PACHT.agriProHa.mittel)} €/ha, +${fmt(PACHT.indexierung * 100, 1)} % p. a.`} />
          </div>

          <div className="mt-7 border-t border-ink-100 pt-6">
            <div className="flex flex-col gap-4 rounded-3xl bg-ov-50 p-5 ring-1 ring-ov-200 md:p-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-ov-800">Mit diesem Ergebnis weiter</p>
                <p className="mt-1 font-display text-[19px] font-bold leading-snug text-ink-900">
                  {fmt(ha, ha % 1 ? 1 : 0)} ha · Agri-Pacht ≈ <span className="ov-num">{fmtEur(r.pachtJahr0)}</span> pro Jahr – unverbindlich prüfen lassen
                </p>
                <p className="mt-1 text-[13px] leading-snug text-ink-600">Größe und Region übernehmen wir in den Flächencheck.</p>
              </div>
              <div className="flex shrink-0 flex-col gap-2.5 sm:flex-row lg:flex-col xl:flex-row">
                <ZumFlaechencheck ha={ha} regionId={regionId} size="lg" data-ov-cta>
                  Fläche prüfen
                </ZumFlaechencheck>
                <Button href={pfad("/landwirte#anfrage")} size="lg" variant="secondary">
                  Mit uns durchrechnen
                </Button>
              </div>
            </div>
            <p className="mt-4 text-[13px] leading-relaxed text-ink-500">
              Projektrendite ohne Fremdkapital und vor Steuern, nominal – eine Orientierung, kein Angebot. Eigenverbrauch am Hof, Speicher und eingesparte Schutznetze sind nicht eingerechnet – sie verbessern Weg B oft deutlich.
            </p>
          </div>
        </>
      }
    />
  );
}

function Zeile({ k, v }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-ink-500">{k}</dt>
      <dd className="ov-num text-right font-semibold text-ink-900">{v}</dd>
    </div>
  );
}

function Mini({ icon: Icon, k, v, z }) {
  return (
    <div className="rounded-2xl bg-sand-50 p-4 ring-1 ring-ink-200/60">
      <p className="flex items-center gap-1.5 text-[12.5px] font-medium text-ink-500">
        <Icon aria-hidden="true" className="h-3.5 w-3.5 text-ov-600" />
        {k}
      </p>
      <p className="ov-num mt-1 font-display text-[19px] font-extrabold tracking-tight text-ink-900">{v}</p>
      <p className="mt-0.5 text-[12px] leading-snug text-ink-500">{z}</p>
    </div>
  );
}
