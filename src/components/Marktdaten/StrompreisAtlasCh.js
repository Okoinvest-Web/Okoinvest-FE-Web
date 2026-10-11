"use client";

// CH-Strompreis-Atlas (Welle 4, Paket CHATLAS) – Kantons-Mediane und Beispielstädte aus den
// amtlichen ElCom-Tarifdaten (LINDAS). Daten kommen fertig vom Server (statischer, versionierter
// Auszug in src/data/strompreisatlasCh.js); hier wird nur angezeigt und umgeschaltet.
//
// Nur amtliche Bestandteile (Energie, Netznutzung, Abgaben, Netzzuschlag), keine Anbieter-Rangliste:
// Die Kantonstabelle ist alphabetisch sortiert, kein „bester Anbieter“, keine Empfehlung.

import { useState } from "react";
import { useTexte } from "@/components/Sprache/SpracheKontext";

const TEXTE = {
  de: {
    kategorie: "Verbrauchskategorie",
    jahr: "Tarifjahr",
    kantonTitel: "Median je Kanton",
    kantonAria: (jahr, kat) => `Tabelle: Median-Strompreise je Kanton, Tarifjahr ${jahr}, Kategorie ${kat}, horizontal scrollbar`,
    kopf: ["Kanton", "Total", "Energie", "Netznutzung", "Abgaben", "Netzzuschlag", "ggü. Vorjahr"],
    gemeindenTitel: "Beispielstädte (Tarif des Netzbetreibers)",
    gemeindenAria: (jahr, kat) => `Tabelle: Strompreise in Beispielstädten, Tarifjahr ${jahr}, Kategorie ${kat}, horizontal scrollbar`,
    gemeindenKopf: ["Stadt", "Netzbetreiber", "Total", "Energie", "Netznutzung", "Abgaben", "Netzzuschlag"],
    einheit: "Alle Werte in Rp./kWh, Produkt „standard“.",
    balkenAria: (name, wert) => `${name}: ${wert} Rappen je Kilowattstunde`,
    keinVorjahr: "–",
    fussKanton: "Mediane der Bestandteile summieren sich nicht exakt zum Median des Totals (der Median wird je Spalte eigenständig gebildet).",
    fussGemeinden: "Städte mit mehreren Netzbetreibern erscheinen mehrfach. Fehlt ein Tarif, war er zum Abrufdatum nicht veröffentlicht.",
  },
  en: {
    kategorie: "Consumption category",
    jahr: "Tariff year",
    kantonTitel: "Median per canton",
    kantonAria: (jahr, kat) => `Table: median electricity prices per canton, tariff year ${jahr}, category ${kat}, scrolls horizontally`,
    kopf: ["Canton", "Total", "Energy", "Grid usage", "Fees", "Grid surcharge", "vs. previous year"],
    gemeindenTitel: "Example cities (network operator tariff)",
    gemeindenAria: (jahr, kat) => `Table: electricity prices in example cities, tariff year ${jahr}, category ${kat}, scrolls horizontally`,
    gemeindenKopf: ["City", "Network operator", "Total", "Energy", "Grid usage", "Fees", "Grid surcharge"],
    einheit: "All values in Rp./kWh, “standard” product.",
    balkenAria: (name, wert) => `${name}: ${wert} centimes per kilowatt-hour`,
    keinVorjahr: "–",
    fussKanton: "The medians of the components do not add up exactly to the median of the total (each column's median is calculated independently).",
    fussGemeinden: "Cities with several network operators appear more than once. A missing tariff was not published at the retrieval date.",
  },
};

const zahl = (v, en) => (v == null ? "–" : v.toLocaleString(en ? "en-CH" : "de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

const KNOPF = (aktiv) =>
  `min-h-11 rounded-2xl px-4 py-2 text-[14px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ov-500 ${
    aktiv ? "bg-ov-600 text-white" : "bg-white text-ink-700 ring-1 ring-ink-200 hover:text-navy-700 hover:ring-navy-200"
  }`;

export default function StrompreisAtlasCh({ jahre, kategorien, kantone, gemeinden, veraenderung, sprache = "de" }) {
  const t = useTexte(TEXTE);
  const en = sprache === "en";
  const [jahr, setJahr] = useState(jahre[jahre.length - 1]);
  const [kat, setKat] = useState("H4");

  const kListe = kantone[jahr]?.[kat] || [];
  const gListe = gemeinden[jahr]?.[kat] || [];
  const delta = veraenderung[kat] || {};
  const max = Math.max(...kListe.map((x) => x.total || 0), 1);
  const letztesJahr = jahr === jahre[jahre.length - 1];

  return (
    <div>
      <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
        <div role="group" aria-label={t.kategorie}>
          <p className="mb-2 text-[13px] font-semibold text-ink-700">{t.kategorie}</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(kategorien).map(([id, k]) => (
              <button key={id} type="button" aria-pressed={kat === id} onClick={() => setKat(id)} className={KNOPF(kat === id)}>
                {en ? k.nameEn : k.name}
              </button>
            ))}
          </div>
        </div>
        <div role="group" aria-label={t.jahr}>
          <p className="mb-2 text-[13px] font-semibold text-ink-700">{t.jahr}</p>
          <div className="flex gap-2">
            {jahre.map((j) => (
              <button key={j} type="button" aria-pressed={jahr === j} onClick={() => setJahr(j)} className={KNOPF(jahr === j)}>
                {j}
              </button>
            ))}
          </div>
        </div>
      </div>
      <p className="mt-4 text-[14px] leading-relaxed text-ink-600">
        {en ? kategorien[kat].beschreibungEn : kategorien[kat].beschreibung} · {t.einheit}
      </p>

      <h3 className="mt-8 font-display text-[17px] font-bold text-ink-900">{t.kantonTitel}</h3>
      <div className="mt-3 overflow-x-auto rounded-2xl ring-1 ring-ink-200/70" role="region" aria-label={t.kantonAria(jahr, kat)} tabIndex={0}>
        <table className="w-full min-w-[720px] border-collapse bg-white text-[14px]">
          <thead>
            <tr className="border-b border-ink-200/70 bg-sand-50 text-left text-[13px] text-ink-700">
              {t.kopf.map((k, i) => (
                <th key={k} scope="col" className={`px-3 py-2.5 font-semibold ${i > 0 ? "text-right" : ""} ${i === 1 ? "w-[220px]" : ""}`}>
                  {k}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {kListe.map((x) => {
              const d = letztesJahr ? delta[x.abk] : undefined;
              return (
                <tr key={x.abk} className="border-b border-ink-100 last:border-0">
                  <th scope="row" className="whitespace-nowrap px-3 py-2 text-left font-medium text-ink-800">
                    {x.name} <span className="text-ink-400">{x.abk}</span>
                  </th>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div aria-hidden="true" className="h-2 w-28 shrink-0 overflow-hidden rounded-full bg-ov-100 sm:w-36">
                        <div className="h-full rounded-full bg-ov-600" style={{ width: `${Math.round(((x.total || 0) / max) * 100)}%` }} />
                      </div>
                      <span className="w-14 font-semibold tabular-nums text-ink-900" aria-label={t.balkenAria(x.name, zahl(x.total, en))}>
                        {zahl(x.total, en)}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-ink-600">{zahl(x.energie, en)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-ink-600">{zahl(x.netz, en)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-ink-600">{zahl(x.abgaben, en)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-ink-600">{zahl(x.netzzuschlag, en)}</td>
                  <td className={`px-3 py-2 text-right tabular-nums ${d == null ? "text-ink-400" : d.delta > 0 ? "text-sun-700" : "text-ov-700"}`}>
                    {d == null ? t.keinVorjahr : `${d.delta > 0 ? "+" : ""}${zahl(d.delta, en)}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[13px] leading-relaxed text-ink-500">{t.fussKanton}</p>

      <h3 className="mt-10 font-display text-[17px] font-bold text-ink-900">{t.gemeindenTitel}</h3>
      <div className="mt-3 overflow-x-auto rounded-2xl ring-1 ring-ink-200/70" role="region" aria-label={t.gemeindenAria(jahr, kat)} tabIndex={0}>
        <table className="w-full min-w-[720px] border-collapse bg-white text-[14px]">
          <thead>
            <tr className="border-b border-ink-200/70 bg-sand-50 text-left text-[13px] text-ink-700">
              {t.gemeindenKopf.map((k, i) => (
                <th key={k} scope="col" className={`px-3 py-2.5 font-semibold ${i > 1 ? "text-right" : ""}`}>
                  {k}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {gListe.map((x) => (
              <tr key={`${x.bfs}-${x.betreiber}`} className="border-b border-ink-100 last:border-0">
                <th scope="row" className="whitespace-nowrap px-3 py-2 text-left font-medium text-ink-800">
                  {x.name}
                </th>
                <td className="px-3 py-2 text-ink-600">{x.betreiber}</td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums text-ink-900">{zahl(x.total, en)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-ink-600">{zahl(x.energie, en)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-ink-600">{zahl(x.netz, en)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-ink-600">{zahl(x.abgaben, en)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-ink-600">{zahl(x.netzzuschlag, en)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[13px] leading-relaxed text-ink-500">{t.fussGemeinden}</p>
    </div>
  );
}
