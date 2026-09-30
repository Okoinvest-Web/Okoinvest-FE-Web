"use client";

// Berichte & Analysen: Diagramme und Tabellen zu einem Bericht (Daten: Operation `bericht`).

import { useState } from "react";
import { Karte, Tabelle, zelle } from "@/components/Portal/ui";
import { cn } from "@/components/ui/cn";
import { fmt } from "@/lib/rechner/annahmen";
import { LAENDER } from "@/lib/plattform/konstanten";
import { Balken, FARBEN, Legende, MonatsSaeulen, Ring, Trichter } from "./Diagramme";

const eur = (x) => `${fmt(Math.round(x || 0))} €`;
const eurKurz = (x) => (Math.abs(x) >= 1e6 ? `${fmt(x / 1e6, 1)} Mio. €` : Math.abs(x) >= 1e3 ? `${fmt(x / 1e3, 0)} T€` : `${fmt(x)} €`);
const pct = (x) => (x === null || x === undefined ? "–" : `${fmt(x * 100, 0)} %`);

function Umschalter({ werte, wert, setzen, label }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-full bg-ink-100 p-1 text-[13px] font-semibold">
      {werte.map(([k, t]) => (
        <button key={k} type="button" role="radio" aria-checked={wert === k} onClick={() => setzen(k)} className={cn("rounded-full px-3 py-1.5 transition-colors", wert === k ? "bg-white text-ink-900 shadow-sm" : "text-ink-600 hover:text-ink-900")}>
          {t}
        </button>
      ))}
    </div>
  );
}

export default function BerichtAnsicht({ bericht: b }) {
  const [trichterArt, setTrichterArt] = useState("vorgang");
  const [durchlaufArt, setDurchlaufArt] = useState("vorgang");
  const tz = b.trichterZeit[trichterArt];
  const reihen = tz.stufen.map((s, i) => ({ label: s.label, farbe: FARBEN[i] || "#041d42", werte: tz.reihen[s.id] }));
  const maxQuelle = Math.max(1, ...b.quellen.map((q) => q.anfragen));

  return (
    <div className="space-y-6">
      <Karte
        titel="Trichter über Zeit"
        untertitel="Wie viele Objekte haben je Monat die jeweilige Stufe erreicht (erstmals)."
        aktion={<Umschalter label="Prozess" werte={[["vorgang", "Anfragen"], ["flaeche", "Flächen"]]} wert={trichterArt} setzen={setTrichterArt} />}
      >
        <MonatsSaeulen titel={`Trichter ${trichterArt === "vorgang" ? "Anfragen" : "Flächen"}`} monate={b.zeitraum.monate} reihen={reihen} />
        <div className="mt-4">
          <Legende items={reihen.map((r) => ({ label: r.label, farbe: r.farbe }))} />
        </div>
      </Karte>

      <div className="grid gap-6 lg:grid-cols-2">
        <Karte titel="Kohorte Anfragen" untertitel="Eingang im Zeitraum – welcher Anteil erreicht welche Stufe">
          <Trichter titel="Trichter Anfragen" stufen={b.kohorteTrichter} />
        </Karte>
        <Karte titel="Kohorte Flächen" untertitel="Eingang im Zeitraum – bis zum Pachtvertrag">
          <Trichter titel="Trichter Flächen" stufen={b.flaechenTrichter} />
        </Karte>
      </div>

      <Karte titel="Konversion je Quelle" untertitel="Herkunft (Kanal, UTM) der Anfragen im Zeitraum">
        {b.quellen.length ? (
          <Tabelle kopf={["Kanal", "Anfragen", "Qualifiziert", "Quote", "Abgeschlossen", "Top-Kampagnen"]}>
            {b.quellen.map((q) => (
              <tr key={q.kanal}>
                <td className={cn(zelle, "font-semibold text-ink-900")}>{q.kanal}</td>
                <td className={zelle}>
                  <div className="flex items-center gap-2">
                    <span className="h-2 rounded-full bg-navy-500" style={{ width: `${Math.max(4, (q.anfragen / maxQuelle) * 90)}px` }} aria-hidden="true" />
                    <span className="ov-num">{fmt(q.anfragen)}</span>
                  </div>
                </td>
                <td className={cn(zelle, "ov-num")}>{fmt(q.qualifiziert)}</td>
                <td className={zelle}>
                  <span className={cn("ov-num rounded-full px-2 py-0.5 text-[12.5px] font-bold", q.quoteQualifiziert >= 0.4 ? "bg-ov-50 text-ov-800" : "bg-ink-50 text-ink-700")}>{pct(q.quoteQualifiziert)}</span>
                </td>
                <td className={cn(zelle, "ov-num")}>{fmt(q.abgeschlossen)}</td>
                <td className={cn(zelle, "text-[13px] text-ink-600")}>{q.kampagnen.length ? q.kampagnen.map((k) => `${k.name} (${k.anzahl})`).join(", ") : "–"}</td>
              </tr>
            ))}
          </Tabelle>
        ) : (
          <p className="text-[14px] text-ink-500">Keine Anfragen im Zeitraum.</p>
        )}
      </Karte>

      <div className="grid gap-6 lg:grid-cols-2">
        <Karte titel="Pipeline-MWp nach Phase und Land" untertitel={`Börse: ${fmt(b.kennzahlen.pipelineMwp, 1)} MWp (in Prüfung, veröffentlicht, reserviert)`}>
          <Balken titel="Pipeline nach Phase" eintraege={b.pipelinePhasen.map((p) => ({ label: p.label, werte: p.werte }))} labels={LAENDER} format={(v) => `${fmt(v, 1)} MWp`} />
        </Karte>
        <Karte titel="Flächen-Potenzial nach Status und Land" untertitel={`${fmt(b.kennzahlen.flaechenMwp, 1)} MWp grob aus Hektar (Süd, fest)`}>
          <Balken titel="Flächen nach Status" eintraege={b.flaechenPipeline.map((p) => ({ label: p.label, werte: p.werte }))} labels={LAENDER} format={(v) => `${fmt(v, 1)} MWp`} />
        </Karte>
      </div>

      <Karte titel="Provision: erwartet vs. realisiert" untertitel="Erwartet = Kaufpreis × Satz × Abschlusswahrscheinlichkeit je Stand (interne Annahme)">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <div className="min-w-0">
            <MonatsSaeulen
              titel="Provision je Monat"
              monate={b.zeitraum.monate}
              reihen={[{ label: "realisiert (verkauft)", farbe: "#669933", werte: b.provision.realisiertMonat }, { label: "bezahlt", farbe: "#1f5aa1", werte: b.provision.bezahltMonat }]}
              format={eurKurz}
            />
            <div className="mt-3">
              <Legende items={[{ label: "realisiert (verkauft)", farbe: "#669933" }, { label: "bezahlt", farbe: "#1f5aa1" }]} />
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-3 self-start">
            {[
              ["Erwartet (gewichtet)", eur(b.provision.erwartetGewichtet), true],
              ["Erwartet (ungewichtet)", eur(b.provision.erwartetUngewichtet)],
              ["Realisiert im Zeitraum", eur(b.provision.realisiert)],
              ["Bezahlt im Zeitraum", eur(b.provision.bezahlt)],
              ["Offen / in Rechnung", eur(b.provision.offen)],
            ].map(([l, w, dunkel]) => (
              <div key={l} className={cn("rounded-2xl p-3.5", dunkel ? "col-span-2 bg-navy-950 text-white" : "bg-sand-50 ring-1 ring-ink-200/60")}>
                <dt className={cn("text-[12px]", dunkel ? "text-white/70" : "text-ink-500")}>{l}</dt>
                <dd className="ov-num mt-1 font-display text-[19px] font-extrabold">{w}</dd>
              </div>
            ))}
          </dl>
        </div>
        {b.provision.projekte?.length > 0 && (
          <div className="mt-6">
            <Tabelle kopf={["Projekt", "Stand", "Kaufpreis", "Satz", "Wahrsch.", "Gewichtet"]}>
              {b.provision.projekte.slice(0, 12).map((p) => (
                <tr key={p.id}>
                  <td className={cn(zelle, "font-semibold text-ink-900")}>{p.titel}<span className="block text-[12px] font-normal text-ink-500">{fmt(p.mwp, 1)} MWp · {p.land}</span></td>
                  <td className={cn(zelle, "text-ink-700")}>{p.standLabel}</td>
                  <td className={cn(zelle, "ov-num")}>{eur(p.kaufpreis)}{p.geschaetzt && <span title="geschätzt: Mitte der Phasenspanne" className="text-ink-400">*</span>}</td>
                  <td className={cn(zelle, "ov-num")}>{pct(p.satz)}</td>
                  <td className={cn(zelle, "ov-num")}>{pct(p.p)}</td>
                  <td className={cn(zelle, "ov-num font-bold text-ink-900")}>{eur(p.gewichtet)}</td>
                </tr>
              ))}
            </Tabelle>
            <p className="mt-3 text-[12.5px] text-ink-500">
              * Kaufpreis geschätzt (Mitte der Phasenspanne). Annahmen: {Object.values(b.provision.wahrscheinlichkeiten).map((w) => `${w.label} ${pct(w.p)}`).join(" · ")}.
            </p>
          </div>
        )}
      </Karte>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Karte titel="Durchlaufzeiten je Stufe" untertitel="Tage zwischen Eintritt in die Stufe und Eintritt in die nächste (abgeschlossen im Zeitraum)" aktion={<Umschalter label="Prozess" werte={[["vorgang", "Anfrage"], ["flaeche", "Fläche"], ["projekt", "Projekt"], ["interesse", "Interesse"]]} wert={durchlaufArt} setzen={setDurchlaufArt} />}>
          <Balken titel="Median-Durchlaufzeit" eintraege={b.durchlauf[durchlaufArt].map((d) => ({ label: d.label, wert: d.median || 0, farbe: "#1f5aa1" }))} format={(v) => `${fmt(v, 1)} Tg.`} />
          <p className="mt-3 text-[12.5px] text-ink-500">Median je Übergang; Anzahl: {b.durchlauf[durchlaufArt].map((d) => d.anzahl).join(" · ")}. Mittelwerte im CSV-Export.</p>
        </Karte>
        <Karte titel="Team-Leistung" untertitel="im Zeitraum">
          <ul className="divide-y divide-ink-100">
            {b.team.map((t) => (
              <li key={t.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <Ring quote={t.slaQuote ?? 0} label={`SLA-Quote ${t.name}`} groesse={48} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink-900">{t.name}</p>
                  <p className="text-[12.5px] text-ink-500">
                    {fmt(t.offen)} offen · {fmt(t.statuswechsel)} Statuswechsel · {fmt(t.aufgabenErledigt)} Aufgaben erledigt · {fmt(t.crmAktivitaeten)} CRM
                    {t.aufgabenUeberfaellig ? <span className="font-semibold text-ink-900"> · {fmt(t.aufgabenUeberfaellig)} überfällig</span> : null}
                  </p>
                  <p className="text-[11.5px] text-ink-400">SLA-Quote {t.slaQuote === null ? "– (keine Flächen)" : `${pct(t.slaQuote)} von ${t.slaBasis}`}</p>
                </div>
              </li>
            ))}
          </ul>
        </Karte>
      </div>
    </div>
  );
}
