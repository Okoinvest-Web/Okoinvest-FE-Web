"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Factory, Info, Landmark, PiggyBank, Sun, Zap } from "lucide-react";
import { Auswahl, Gruppe, Kennzahl, Regler, Schalter, Zahl } from "@/components/Rechner/bausteine";
import AnfrageFormular from "@/components/Plattform/AnfrageFormular";
import PreisBalken from "./PreisBalken";
import { berechneReststrom, LASTPROFILE, PV_ERTRAG_KWH_PRO_KWP, SINNVOLL_AB_MWH } from "@/lib/rechner/reststrom";
import { fmt, fmtEur } from "@/lib/rechner/annahmen";
import { cn } from "@/components/ui/cn";

// auf 100 € gerundet – mehr Genauigkeit gibt eine Spanne nicht her
const eurK = (n) => fmtEur(Math.round(n / 100) * 100);

export default function ReststromRechner() {
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

  const maxHebel = Math.max(...r.hebel.map((h) => h.eurMax), 1);
  const skala = Math.max(preis, r.fixSumme + 1);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
      {/* Eingaben */}
      <div className="rounded-[2rem] bg-sand-50 p-5 shadow-xl ring-1 ring-ink-200/70 sm:p-7">
        <Gruppe titel="Ihr Strombezug">
          <Regler
            label="Jahresverbrauch aus dem Netz"
            wert={verbrauch}
            min={20}
            max={5000}
            step={10}
            einheit="MWh"
            onChange={setVerbrauch}
            hinweis="Steht auf der Jahresabrechnung (1 MWh = 1.000 kWh)."
          />
          <Regler
            label="Aktueller Arbeitspreis, netto"
            wert={preis}
            min={12}
            max={40}
            step={0.1}
            stellen={1}
            einheit="ct/kWh"
            onChange={setPreis}
            hinweis="Gesamtpreis je kWh inkl. Netzentgelten, Umlagen und Stromsteuer, ohne Umsatzsteuer und Grundpreis."
          />
        </Gruppe>

        <Gruppe titel="Betrieb" className="mt-8">
          <Auswahl legende="Lastprofil" optionen={LASTPROFILE} wert={profil} onChange={setProfil} spalten={2} />
          <Schalter
            label="Eigene PV-Anlage"
            beschreibung="Vorhanden oder geplant, z. B. von ÖKOVOLT"
            an={pvAn}
            onChange={setPvAn}
            icon={Sun}
          >
            <div className="space-y-5">
              <Regler label="Leistung" wert={pvKwp} min={10} max={2000} step={10} einheit="kWp" onChange={setPvKwp} />
              <Auswahl
                legende="Status"
                klein
                optionen={[
                  { id: "geplant", label: "geplant", sub: "senkt den Bezug" },
                  { id: "bestand", label: "läuft schon", sub: "Verbrauch = Reststrom" },
                ]}
                wert={pvStatus}
                onChange={setPvStatus}
              />
            </div>
          </Schalter>
          <Schalter
            label="Produzierendes Gewerbe"
            beschreibung="oder Land- und Forstwirtschaft (Stromsteuer)"
            an={produzierend}
            onChange={setProduzierend}
            icon={Factory}
          />
        </Gruppe>
      </div>

      {/* Ergebnis */}
      <div className="min-w-0 rounded-[2rem] bg-white p-5 shadow-xl ring-1 ring-ink-200/70 sm:p-7" aria-live="polite">
        <div className="grid gap-3 sm:grid-cols-3">
          <Kennzahl label="Ersparnis Pool pro Jahr" ton="gruen" icon={PiggyBank} zusatz={`Mitte ca. ${eurK(r.gesamt.eurMitte)}`} className="sm:col-span-2">
            <Zahl wert={Math.round(r.gesamt.eurMin / 100) * 100} /> – <Zahl wert={Math.round(r.gesamt.eurMax / 100) * 100} suffix=" €" />
          </Kennzahl>
          <Kennzahl label="je kWh Reststrom" icon={Zap} zusatz={`${fmt(r.gesamt.anteilMin * 100, 0)}–${fmt(r.gesamt.anteilMax * 100, 0)} % der Stromkosten`}>
            <Zahl wert={r.gesamt.ctMin} stellen={1} />–<Zahl wert={r.gesamt.ctMax} stellen={1} suffix=" ct" />
          </Kennzahl>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Kennzahl label="Reststrom für den Pool" ton="sand" zusatz={r.eigenverbrauch > 0 ? `nach ca. ${fmt(r.eigenverbrauch / 1000, 0)} MWh Eigenverbrauch` : "gesamter Netzbezug"}>
            <Zahl wert={r.reststromKwh / 1000} suffix=" MWh" />
          </Kennzahl>
          <Kennzahl label="Stromkosten heute (Reststrom)" ton="sand" zusatz="netto, ohne Grundpreis">
            <Zahl wert={Math.round(r.kostenVorher / 100) * 100} suffix=" €" />
          </Kennzahl>
        </div>

        {/* Hebel */}
        <h3 className="mt-8 font-display text-[18px] font-bold text-ink-900">Ersparnis je Hebel</h3>
        <ul className="mt-4 space-y-4">
          {r.hebel.map((h) => (
            <li key={h.id}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-[14px]">
                <span className="font-semibold text-ink-800">{h.label}</span>
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
        <h3 className="mt-9 font-display text-[18px] font-bold text-ink-900">Preiszerlegung vorher / nachher</h3>
        <p className="mt-1 text-[13.5px] text-ink-500">Nachher mit der Mitte der Spanne. Nur die grüne Beschaffungskomponente ändert sich.</p>
        <PreisBalken
          className="mt-5"
          max={skala}
          zeilen={[
            { titel: "Heute (Einzelvertrag)", teile: r.vorher },
            { titel: "Mit Reststrom-Pool", teile: r.nachher },
          ]}
        />

        {/* Hinweise */}
        <div className="mt-8 space-y-3">
          {r.stromsteuer && (
            <p className="flex gap-3 rounded-2xl bg-navy-50 p-4 text-[14px] leading-relaxed text-navy-900 ring-1 ring-navy-100">
              <Landmark aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-navy-600" />
              <span>
                <strong>Zusätzlich: Stromsteuer-Entlastung.</strong> Als produzierendes Gewerbe zahlen Sie seit 2026 nur noch den EU-Mindestsatz. Das sind
                weitere rund <strong>{eurK(r.stromsteuer.eur)}</strong> pro Jahr ({fmt(r.stromsteuer.ctJeKwh, 2)} ct/kWh) – falls noch nicht beantragt.
                Die Entlastung wird beim Hauptzollamt beantragt und ist keine Leistung des Pools.
              </span>
            </p>
          )}
          {r.klein && (
            <p className="flex gap-3 rounded-2xl bg-sun-400/10 p-4 text-[14px] leading-relaxed text-ink-800 ring-1 ring-sun-400/30">
              <AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-sun-500" />
              Unter etwa {fmt(SINNVOLL_AB_MWH)} MWh ist der Hebel meist kleiner als die Kosten der strukturierten Beschaffung. Wir prüfen Ihren Fall trotzdem gern.
            </p>
          )}
          {r.preisUnplausibel && (
            <p className="flex gap-3 rounded-2xl bg-sun-400/10 p-4 text-[14px] leading-relaxed text-ink-800 ring-1 ring-sun-400/30">
              <AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-sun-500" />
              Ihr Preis liegt kaum über Netzentgelten, Umlagen und Steuern (rund {fmt(r.fixSumme, 1)} ct/kWh). Prüfen Sie, ob wirklich der Gesamtpreis gemeint ist –
              oder Sie haben bereits sehr gut eingekauft.
            </p>
          )}
          <p className="flex gap-3 text-[13px] leading-relaxed text-ink-500">
            <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            Orientierung, kein Angebot. PV-Ertrag vereinfacht mit {fmt(PV_ERTRAG_KWH_PRO_KWP)} kWh/kWp. Die tatsächliche Ersparnis hängt von Lastgang, Marktlage
            zum Beschaffungszeitpunkt und Vertragslaufzeit ab.
          </p>
        </div>

        {/* Anfrage */}
        <details className="group mt-8 rounded-3xl bg-sand-50 ring-1 ring-ink-200/70 open:bg-white">
          <summary className={cn("flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-display text-[17px] font-bold text-ink-900 [&::-webkit-details-marker]:hidden")}>
            Mit diesen Werten ein Angebot anfragen
            <span className="rounded-full bg-ov-600 px-4 py-2 text-[13.5px] font-semibold text-white group-open:hidden">Öffnen</span>
          </summary>
          <div className="px-5 pb-6">
            <AnfrageFormular
              typ="reststrom"
              felder={["firma", "telefon", "plz", "nachricht"]}
              button="Pool-Angebot anfragen"
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
      </div>
    </div>
  );
}
