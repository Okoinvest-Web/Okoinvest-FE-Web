"use client";

// Projektkostenkalkulation (Backoffice-Reiter „Kostenkalkulation“): Gewerke nach DIN-276-Anlehnung mit Vorschlägen aus
// markt.js, jede Zahl überschreibbar (Kennzeichen „überschrieben“ + Abweichungsampel), Live-Berechnung im Browser mit
// derselben Logik wie der Server (src/lib/plattform/planung/kosten.js), Trasse aus Akquise-Geodaten bzw. DXF übernehmen
// (mit Bestätigung), Kostenstände festschreiben (Historie mit Differenz), Soll/Ist, Übergabe an Finanzierung/Bewertung,
// Export PDF/CSV. Speichern: Knopf oder Strg+S. Prüfungen und Rechte: Server.

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Download, Loader2, Plus, RotateCcw, Save, Send } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { Badge, Karte } from "@/components/Portal/ui";
import { ErfolgBox, FehlerBox, Feld, auswahlfeld, eingabe } from "@/components/Portal/felder";
import { senden } from "@/lib/plattform/client";
import { GEWERKE, GRUPPEN, KOSTENSTAENDE, VERLEGEARTEN, berechnen, trassenLaenge, uebernahmeAusDxf, vorschlag, zusammenfuehren } from "@/lib/plattform/planung/kosten";
import { fmt } from "@/lib/rechner/annahmen";
import { abfragen, bestaetigen } from "@/components/ui/Rueckfrage";

const eur = (x) => (Number.isFinite(x) ? `${fmt(Math.round(x))} €` : "–");
const teur = (x) => (Number.isFinite(x) ? `${fmt(x / 1000, Math.abs(x) >= 1e7 ? 0 : 1)} T€` : "–");
const zahlEin = (s) => {
  if (s === "" || s === null || s === undefined) return null;
  const n = Number(String(s).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};
const AMPEL_KL = { gruen: "bg-ov-50 text-ov-800 ring-ov-200", gelb: "bg-sun-300/25 text-ink-900 ring-sun-400/50", rot: "bg-red-50 text-red-800 ring-red-200" };
const AMPEL_TXT = { gruen: "im Rahmen", gelb: "prüfen", rot: "auffällig" };

function Ampel({ ampel, children }) {
  if (!ampel) return null;
  return <Badge className={AMPEL_KL[ampel]}>{children || AMPEL_TXT[ampel]}</Badge>;
}

function Wert({ label, wert, hinweis, dunkel }) {
  return (
    <div className={cn("min-w-0 rounded-3xl p-4 md:p-5", dunkel ? "bg-navy-950 text-white ring-1 ring-navy-800" : "bg-white ring-1 ring-ink-200/70")}>
      <p className={cn("text-[12.5px] font-medium", dunkel ? "text-white/70" : "text-ink-500")}>{label}</p>
      <p className="ov-num mt-2 font-display text-[21px] font-extrabold leading-none tracking-tight md:text-[24px]">{wert}</p>
      {hinweis && <p className={cn("mt-1.5 text-[12px]", dunkel ? "text-white/60" : "text-ink-500")}>{hinweis}</p>}
    </div>
  );
}

function ZahlFeld({ wert, onChange, label, einheit, breit = "w-28", deaktiviert, placeholder }) {
  const [txt, setTxt] = useState(wert === null || wert === undefined ? "" : String(wert).replace(".", ","));
  useEffect(() => setTxt(wert === null || wert === undefined ? "" : String(wert).replace(".", ",")), [wert]);
  return (
    <span className="inline-flex items-center gap-1">
      <input
        type="text"
        inputMode="decimal"
        aria-label={label}
        value={txt}
        disabled={deaktiviert}
        placeholder={placeholder}
        onChange={(e) => setTxt(e.target.value)}
        onBlur={() => onChange(zahlEin(txt))}
        onKeyDown={(e) => e.key === "Enter" && onChange(zahlEin(txt))}
        className={cn("ov-num h-9 rounded-xl border border-ink-200 bg-white px-2 text-right text-[13px] focus:border-ov-500 focus:outline-none focus:ring-2 focus:ring-ov-500/30 disabled:bg-ink-50", breit)}
      />
      {einheit && <span className="text-[12px] text-ink-500">{einheit}</span>}
    </span>
  );
}

export default function Kalkulation({ projektId, daten }) {
  const router = useRouter();
  const [k, setK] = useState(daten);
  const [par, setPar] = useState(() => ({ ...daten.parameter }));
  const [pos, setPos] = useState(() => daten.positionen.map((x) => ({ ...x })));
  const [geaendert, setGeaendert] = useState(false);
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");
  const [erfolg, setErfolg] = useState("");
  const [stand, setStand] = useState(daten.kostenstand);
  const [kommentar, setKommentar] = useState("");
  const [dxfWahl, setDxfWahl] = useState(daten.quellen.dxf[0]?.versionId || "");
  const [dxfFelder, setDxfFelder] = useState([]);
  const [neuGewerk, setNeuGewerk] = useState("sonstiges");
  const schreiben = k.darfBearbeiten;

  const e = useMemo(() => berechnen(zusammenfuehren(pos, vorschlag(par)), par), [pos, par]);

  const uebernehmen = (neu) => {
    setK(neu);
    setPar({ ...neu.parameter });
    setPos(neu.positionen.map((x) => ({ ...x })));
    setGeaendert(false);
    router.refresh();
  };

  async function ausfuehren(fn, meldung) {
    setLaeuft(true);
    setFehler("");
    setErfolg("");
    try {
      const r = await fn();
      if (r?.kalkulation) uebernehmen(r.kalkulation);
      setErfolg(meldung);
      return r;
    } catch (x) {
      setFehler(x.message);
      return null;
    } finally {
      setLaeuft(false);
    }
  }

  const speichern = () =>
    ausfuehren(() => senden(`/api/admin/entwicklung/${projektId}/kalkulation`, {
      method: "PUT",
      body: {
        parameter: { flaecheHa: par.flaecheHa, flaechenAnzahl: par.flaechenAnzahl, zaunM: par.zaunM || null, trasse: par.trasse, speicherNetzbezug: par.speicherNetzbezug, contingency: par.contingencyEigen ? par.contingency : null, fkQuote: par.fkQuote, zinsBau: par.zinsBau, bauzeitMonate: par.bauzeitMonate },
        positionen: pos.map(({ schluessel, gewerk, bezeichnung, art, menge, einheit, ep, satz, manuell, istEur, notiz, angebot }) => ({ schluessel, gewerk, bezeichnung, art, menge, einheit, ep, satz, manuell, istEur, notiz, angebot })),
      },
    }), "Kalkulation gespeichert.");
  const aktion = (body, meldung) => ausfuehren(() => senden(`/api/admin/entwicklung/${projektId}/kalkulation/aktion`, { body }), meldung);

  useEffect(() => {
    const f = (ev) => {
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "s" && schreiben) {
        ev.preventDefault();
        speichern();
      }
    };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  });

  const setzeP = (feld, w) => {
    setPar((p) => ({ ...p, [feld]: w }));
    setGeaendert(true);
  };
  const setzePos = (schluessel, aend) => {
    setPos((liste) => {
      const i = liste.findIndex((x) => x.schluessel === schluessel);
      if (i < 0) {
        const basis = e.positionen.find((x) => x.schluessel === schluessel);
        return [...liste, { ...basis, ...aend, manuell: aend.manuell ?? true }];
      }
      const n = [...liste];
      n[i] = { ...n[i], ...aend, manuell: aend.manuell ?? true };
      return n;
    });
    setGeaendert(true);
  };
  const abschnitte = par.trasse?.abschnitte || [];
  const setzeAbschnitte = (liste) => setzeP("trasse", { ...(par.trasse || {}), abschnitte: liste });
  const dxf = k.quellen.dxf.find((x) => x.versionId === dxfWahl);
  const dxfAenderungen = dxf ? uebernahmeAusDxf(par, dxf.kennzahlen) : [];
  const s = e.summen;

  return (
    <div className="space-y-6">
      <section aria-label="Kennzahlen der Kalkulation" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Wert dunkel label="Gesamtkosten" wert={teur(s.gesamt)} hinweis={`${k.kostenstandLabel}${geaendert ? " · nicht gespeichert" : ""}`} />
        <Wert label="€/kWp gesamt" wert={s.eurProKwp ? `${fmt(s.eurProKwp)} €` : "–"} hinweis={s.epcProKwp ? `Technik/EPC ${fmt(s.epcProKwp)} €/kWp` : s.eurProKwh ? `Speicher ${fmt(s.eurProKwh)} €/kWh` : ""} />
        <Wert label="Capex (Bewertung/Börse)" wert={teur(s.capex)} hinweis="ohne Finanzierungskosten" />
        <Wert label="Finanzierungsbedarf" wert={teur(s.finanzierungsbedarf)} hinweis="inkl. Rückbausicherheit" />
        <div className="col-span-2 min-w-0 rounded-3xl bg-white p-4 ring-1 ring-ink-200/70 md:col-span-1 md:p-5">
          <p className="text-[12.5px] font-medium text-ink-500">Marktvergleich</p>
          <div className="mt-2"><Ampel ampel={e.benchmark.ampel} /></div>
          <p className="mt-1.5 text-[12px] text-ink-500">{e.benchmark.eintraege.filter((b) => b.ampel !== "gruen").map((b) => b.label).join(", ") || "alle Kennzahlen im Rahmen"}</p>
        </div>
      </section>

      <div className="sticky top-2 z-10 flex flex-wrap items-center gap-2 rounded-full bg-white/95 p-1.5 shadow-sm ring-1 ring-ink-200/70 backdrop-blur">
        {schreiben && <button type="button" onClick={speichern} disabled={laeuft || !geaendert} className="inline-flex h-10 items-center gap-2 rounded-full bg-ov-600 px-4 text-[14px] font-semibold text-white hover:bg-ov-700 disabled:opacity-50">{laeuft ? <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Save aria-hidden="true" className="h-4 w-4" />}Speichern<span className="hidden text-[11px] font-normal opacity-80 sm:inline">Strg+S</span></button>}
        {schreiben && pos.some((x) => x.manuell && !String(x.schluessel).startsWith("frei:")) && <button type="button" onClick={async () => (await bestaetigen({ titel: "Alle Überschreibungen zurücksetzen?", text: "Manuell geänderte Werte werden durch die Vorschlagswerte ersetzt.", bestaetigenText: "Zurücksetzen", gefahr: true })) && aktion({ aktion: "vorschlag" }, "Vorschlagswerte wiederhergestellt.")} className="inline-flex h-10 items-center gap-2 rounded-full px-3 text-[13.5px] font-semibold text-ink-700 hover:bg-ink-50"><RotateCcw aria-hidden="true" className="h-4 w-4" />Vorschläge</button>}
        <span className="ml-auto flex flex-wrap gap-1.5">
          <a href={`/api/admin/entwicklung/${projektId}/kalkulation/export?format=pdf&anzeigen=1`} target="_blank" rel="noopener" className="inline-flex h-10 items-center gap-2 rounded-full px-3 text-[13.5px] font-semibold text-ink-800 ring-1 ring-inset ring-ink-200 hover:bg-ink-50"><Download aria-hidden="true" className="h-4 w-4" />PDF</a>
          <a href={`/api/admin/entwicklung/${projektId}/kalkulation/export?format=csv`} className="inline-flex h-10 items-center gap-2 rounded-full px-3 text-[13.5px] font-semibold text-ink-800 ring-1 ring-inset ring-ink-200 hover:bg-ink-50"><Download aria-hidden="true" className="h-4 w-4" />CSV</a>
        </span>
      </div>
      <div aria-live="polite"><FehlerBox>{fehler}</FehlerBox><ErfolgBox>{erfolg}</ErfolgBox></div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
        <Karte titel="Positionen" untertitel="Vorschläge aus Marktspannen (markt.js) – Werte anklicken und überschreiben; überschriebene Positionen zeigen die Abweichung zum Vorschlag" innen="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-ink-100 text-[11.5px] font-semibold uppercase tracking-wider text-ink-500">
                  <th scope="col" className="px-4 py-2.5">Position</th>
                  <th scope="col" className="px-2 py-2.5">KG</th>
                  <th scope="col" className="px-2 py-2.5 text-right">Menge / Satz</th>
                  <th scope="col" className="px-2 py-2.5 text-right">EP €</th>
                  <th scope="col" className="px-2 py-2.5 text-right">Betrag</th>
                  <th scope="col" className="px-2 py-2.5 text-right">€/kWp</th>
                  <th scope="col" className="px-2 py-2.5">Vorschlag</th>
                  <th scope="col" className="px-4 py-2.5 text-right">Ist €</th>
                </tr>
              </thead>
              {Object.entries(GRUPPEN).map(([g, gr]) => {
                const zeilen = e.positionen.filter((x) => x.gruppe === g);
                if (!zeilen.length && !["entwicklung", "technik", "netz", "neben"].includes(g)) return null;
                return (
                  <tbody key={g} className="divide-y divide-ink-100 border-b border-ink-200">
                    <tr className="bg-ink-50/80">
                      <th scope="rowgroup" colSpan={4} className="px-4 py-2 text-[13px] font-bold text-ink-900">{gr.label} <span className="font-normal text-ink-500">(KG {gr.kg})</span></th>
                      <td className="ov-num px-2 py-2 text-right font-bold">{eur(e.gruppen[g].soll)}</td>
                      <td className="ov-num px-2 py-2 text-right text-ink-600">{e.gruppen[g].eurProKwp !== null ? fmt(e.gruppen[g].eurProKwp, 1) : "–"}</td>
                      <td />
                      <td className="ov-num px-4 py-2 text-right text-ink-600">{e.gruppen[g].ist ? eur(e.gruppen[g].ist) : ""}</td>
                    </tr>
                    {zeilen.map((x) => (
                      <tr key={x.schluessel} className={cn(x.entfallen && "opacity-60")}>
                        <td className="px-4 py-2 align-top">
                          <span className="font-medium text-ink-900">{x.bezeichnung}</span>
                          {x.manuell && <span className="ml-1.5 text-[11px] font-semibold text-navy-700">überschrieben</span>}
                          {x.angebot && <span className="block text-[11.5px] text-ink-500">Angebot: {x.angebot}</span>}
                          {x.entfallen && <span className="block text-[11.5px] text-ink-500">nicht mehr im Vorschlag</span>}
                        </td>
                        <td className="px-2 py-2 align-top text-ink-500">{GEWERKE[x.gewerk]?.kg}</td>
                        <td className="px-2 py-2 text-right align-top">
                          {x.art === "menge" || !x.art ? (
                            <ZahlFeld label={`Menge ${x.bezeichnung}`} wert={x.menge} einheit={x.einheit} onChange={(w) => w !== null && setzePos(x.schluessel, { menge: w, ep: x.ep })} deaktiviert={!schreiben} />
                          ) : (
                            <ZahlFeld label={`Satz ${x.bezeichnung} in %`} wert={x.satz !== null ? Math.round(x.satz * 1e6) / 1e4 : null} einheit="%" breit="w-20" onChange={(w) => w !== null && setzePos(x.schluessel, { satz: w / 100 })} deaktiviert={!schreiben} />
                          )}
                        </td>
                        <td className="px-2 py-2 text-right align-top">{(x.art === "menge" || !x.art) && <ZahlFeld label={`Einheitspreis ${x.bezeichnung}`} wert={x.ep} onChange={(w) => w !== null && setzePos(x.schluessel, { ep: w, menge: x.menge })} deaktiviert={!schreiben} />}</td>
                        <td className="ov-num px-2 py-2 text-right align-top font-semibold">{eur(x.betrag)}</td>
                        <td className="ov-num px-2 py-2 text-right align-top text-ink-600">{x.eurProKwp !== null ? fmt(x.eurProKwp, 1) : "–"}</td>
                        <td className="px-2 py-2 align-top">
                          {x.manuell && x.vorschlagBetrag !== null ? (
                            <span className="inline-flex flex-col items-start gap-1">
                              <Ampel ampel={x.ampel}>{x.abweichung >= 0 ? "+" : ""}{fmt((x.abweichung || 0) * 100, 0)} %</Ampel>
                              <span className="ov-num text-[11.5px] text-ink-500">{eur(x.vorschlagBetrag)}</span>
                              {schreiben && !String(x.schluessel).startsWith("frei:") && <button type="button" onClick={() => setzePos(x.schluessel, { manuell: false })} className="text-[11.5px] font-semibold text-ov-700 hover:text-ov-800">zurücksetzen</button>}
                            </span>
                          ) : <span className="text-[11.5px] text-ink-400" title={x.quelle}>{x.quelle ? "Vorschlag" : ""}</span>}
                        </td>
                        <td className="px-4 py-2 text-right align-top"><ZahlFeld label={`Ist ${x.bezeichnung}`} wert={x.istEur} breit="w-24" onChange={(w) => setzePos(x.schluessel, { istEur: w, manuell: !!x.manuell })} deaktiviert={!schreiben} /></td>
                      </tr>
                    ))}
                  </tbody>
                );
              })}
              <tfoot>
                <tr className="bg-navy-950 text-white">
                  <th scope="row" colSpan={4} className="px-4 py-3 text-[14px] font-bold">Gesamtkosten (ohne Sicherheiten)</th>
                  <td className="ov-num px-2 py-3 text-right text-[14px] font-bold">{eur(s.gesamt)}</td>
                  <td className="ov-num px-2 py-3 text-right">{s.eurProKwp ? fmt(s.eurProKwp, 1) : "–"}</td>
                  <td />
                  <td className="ov-num px-4 py-3 text-right">{s.ist ? eur(s.ist) : ""}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          {schreiben && (
            <div className="flex flex-wrap items-end gap-2 border-t border-ink-100 px-4 py-3">
              <Feld id="kk-neu" label="Eigene Position hinzufügen" className="min-w-[220px]">
                <select id="kk-neu" className={cn(auswahlfeld, "h-10")} value={neuGewerk} onChange={(ev) => setNeuGewerk(ev.target.value)}>
                  {Object.entries(GEWERKE).filter(([, gw]) => !["reserve", "finanzierung", "sicherheit"].includes(gw.gruppe) && gw.label).map(([id, gw]) => <option key={id} value={id}>{GRUPPEN[gw.gruppe].label}: {gw.label}</option>)}
                </select>
              </Feld>
              <button type="button" onClick={async () => { const b = await abfragen({ titel: "Position hinzufügen", label: "Bezeichnung der Position", pflicht: true, maxlaenge: 160, bestaetigenText: "Position hinzufügen" }); if (b) { setPos((l) => [...l, { schluessel: `frei:${Date.now().toString(36)}`, gewerk: neuGewerk, bezeichnung: b.slice(0, 160), art: "menge", menge: 1, einheit: "psch", ep: 0, manuell: true, istEur: null }]); setGeaendert(true); } }} className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-[14px] font-semibold text-ink-900 ring-1 ring-inset ring-ink-200 hover:bg-ink-50"><Plus aria-hidden="true" className="h-4 w-4" />Position</button>
            </div>
          )}
        </Karte>

        <div className="space-y-6">
          <Karte titel="Annahmen" untertitel={`Typ, Leistung und Gutachten aus dem Projekt · ${fmt(e.parameter.mwp, 2)} ${e.parameter.typ === "speicher" ? "MW" : "MWp"}${e.parameter.mwh ? ` · ${fmt(e.parameter.mwh)} MWh` : ""}`}>
            <div className="grid grid-cols-2 gap-3 text-[13px]">
              <label className="text-ink-700">Fläche<br /><ZahlFeld label="Fläche in ha" wert={par.flaecheHa} einheit="ha" onChange={(w) => setzeP("flaecheHa", w)} deaktiviert={!schreiben} /></label>
              <label className="text-ink-700">Grundstücke<br /><ZahlFeld label="Anzahl Grundstücke" wert={par.flaechenAnzahl} breit="w-20" onChange={(w) => setzeP("flaechenAnzahl", w)} deaktiviert={!schreiben} /></label>
              <label className="text-ink-700">Zaunlänge<br /><ZahlFeld label="Zaunlänge in m" wert={par.zaunM || null} einheit="m" placeholder="aus Fläche" onChange={(w) => setzeP("zaunM", w)} deaktiviert={!schreiben} /></label>
              <label className="text-ink-700">Bauzeit<br /><ZahlFeld label="Bauzeit in Monaten" wert={par.bauzeitMonate} einheit="Mon." breit="w-20" onChange={(w) => setzeP("bauzeitMonate", w)} deaktiviert={!schreiben} /></label>
              <label className="text-ink-700">Fremdkapital<br /><ZahlFeld label="Fremdkapitalquote in %" wert={Math.round((par.fkQuote ?? 0) * 1000) / 10} einheit="%" breit="w-20" onChange={(w) => w !== null && setzeP("fkQuote", w / 100)} deaktiviert={!schreiben} /></label>
              <label className="text-ink-700">Bauzeitzins<br /><ZahlFeld label="Bauzeitzins in %" wert={Math.round((par.zinsBau ?? 0) * 10000) / 100} einheit="%" breit="w-20" onChange={(w) => w !== null && setzeP("zinsBau", w / 100)} deaktiviert={!schreiben} /></label>
              <label className="text-ink-700">Unvorhergesehenes<br /><ZahlFeld label="Unvorhergesehenes in %" wert={Math.round((par.contingency ?? 0) * 1000) / 10} einheit="%" breit="w-20" onChange={(w) => w !== null && setPar((p) => ({ ...p, contingency: w / 100, contingencyEigen: true })) || setGeaendert(true)} deaktiviert={!schreiben} /></label>
              {e.parameter.mwh > 0 && <label className="col-span-2 inline-flex items-center gap-2 text-ink-700"><input type="checkbox" className="h-4 w-4 accent-ov-600" checked={!!par.speicherNetzbezug} onChange={(ev) => setzeP("speicherNetzbezug", ev.target.checked)} disabled={!schreiben} />Speicher lädt aus dem Netz (Baukostenzuschuss)</label>}
            </div>
            <p className="mt-3 text-[12px] text-ink-500">Gutachten aus dem Terminplan: {e.parameter.gutachten.map((g) => g.titel).join(", ") || "keine"}.</p>
          </Karte>

          <Karte titel="Mittelspannungstrasse" untertitel={`${fmt(trassenLaenge(par))} m${par.trasse?.quelle ? ` · Quelle: ${par.trasse.quelle}` : ""}`}>
            <ul className="space-y-2">
              {abschnitte.map((a, i) => (
                <li key={i} className="flex flex-wrap items-center gap-2">
                  <select aria-label="Verlegeart" className={cn(auswahlfeld, "h-9 w-auto min-w-[180px] flex-1 text-[13px]")} value={a.art} disabled={!schreiben} onChange={(ev) => setzeAbschnitte(abschnitte.map((x, j) => (j === i ? { ...x, art: ev.target.value } : x)))}>
                    {Object.entries(VERLEGEARTEN).map(([id, l]) => <option key={id} value={id}>{l}</option>)}
                  </select>
                  <ZahlFeld label="Länge in m" wert={a.laengeM} einheit="m" breit="w-24" onChange={(w) => setzeAbschnitte(abschnitte.map((x, j) => (j === i ? { ...x, laengeM: w || 0 } : x)))} deaktiviert={!schreiben} />
                  {schreiben && <button type="button" className="text-[12px] font-semibold text-red-700 hover:underline" onClick={() => setzeAbschnitte(abschnitte.filter((_, j) => j !== i))}>entfernen</button>}
                </li>
              ))}
            </ul>
            {schreiben && <button type="button" className="mt-2 text-[13px] font-semibold text-ov-700 hover:text-ov-800" onClick={() => setzeAbschnitte([...abschnitte, { art: "graben", laengeM: 100 }])}>+ Abschnitt</button>}
            <div className="mt-3 flex flex-wrap gap-3 text-[13px] text-ink-700">
              {["strasse", "bahn", "gewaesser"].map((q) => <label key={q}>Querung {q === "strasse" ? "Straße" : q === "bahn" ? "Bahn" : "Gewässer"} <ZahlFeld label={`Anzahl Querungen ${q}`} wert={par.trasse?.querungen?.[q] || 0} breit="w-14" onChange={(w) => setzeP("trasse", { ...(par.trasse || {}), querungen: { ...(par.trasse?.querungen || {}), [q]: w || 0 } })} deaktiviert={!schreiben} /></label>)}
            </div>
            {k.quellen.akquise ? (
              <div className="mt-4 rounded-2xl bg-sand-50 p-3 text-[13px] ring-1 ring-ink-200/70">
                <p>Akquise-Geodaten: <strong className="ov-num">{fmt(k.quellen.akquise.trasseM)} m</strong> bis {k.quellen.akquise.umspannwerk || "Umspannwerk"}{k.quellen.akquise.demo ? " (Demo-Daten)" : ""}.</p>
                {schreiben && <button type="button" disabled={laeuft} onClick={async () => (await bestaetigen({ titel: "Trassenlänge aus der Akquise übernehmen?", text: "Nicht gespeicherte Änderungen gehen verloren.", details: [{ label: "Trassenlänge", wert: `${fmt(k.quellen.akquise.trasseM)} m` }], bestaetigenText: "Übernehmen", gefahr: true })) && aktion({ aktion: "trasse_akquise" }, "Trassenlänge aus der Akquise übernommen.")} className="mt-2 inline-flex h-9 items-center rounded-full bg-navy-700 px-3 text-[13px] font-semibold text-white hover:bg-navy-800">Übernehmen</button>}
              </div>
            ) : <p className="mt-3 text-[12px] text-ink-500">Keine Akquise-Geodaten zu den Flächen dieses Projekts – Länge manuell oder aus einem Trassenplan (DXF, Layer „Kabel_MS“).</p>}
          </Karte>

          {k.quellen.dxf.length > 0 && (
            <Karte titel="Kennzahlen aus Plänen übernehmen" untertitel="Layer-Konvention: PV_Module, Zaun, Kabel_MS, Baugrenze">
              <Feld id="kk-dxf" label="Planstand">
                <select id="kk-dxf" className={cn(auswahlfeld, "h-10 text-[13px]")} value={dxfWahl} onChange={(ev) => { setDxfWahl(ev.target.value); setDxfFelder([]); }}>
                  {k.quellen.dxf.map((x) => <option key={x.versionId} value={x.versionId}>{x.plannummer} {x.titel} · Index {x.index} ({x.statusLabel})</option>)}
                </select>
              </Feld>
              <ul className="mt-3 space-y-1.5 text-[13px]">
                {dxfAenderungen.map((a) => (
                  <li key={a.feld}>
                    <label className={cn("flex items-start gap-2", a.nurHinweis && "text-ink-500")}>
                      {!a.nurHinweis && <input type="checkbox" className="mt-0.5 h-4 w-4 accent-ov-600" checked={dxfFelder.includes(a.feld)} onChange={(ev) => setDxfFelder((f) => (ev.target.checked ? [...f, a.feld] : f.filter((x) => x !== a.feld)))} disabled={!schreiben} />}
                      <span>{a.label}: <span className="ov-num">{a.alt !== null ? `${fmt(a.alt, a.einheit === "ha" ? 2 : 0)} → ` : ""}<strong>{fmt(a.neu, a.einheit === "ha" ? 2 : 0)} {a.einheit}</strong></span></span>
                    </label>
                  </li>
                ))}
              </ul>
              {schreiben && <button type="button" disabled={laeuft || !dxfFelder.length} onClick={() => aktion({ aktion: "dxf_uebernehmen", versionId: dxfWahl, felder: dxfFelder }, "Kennzahlen aus dem Plan übernommen.")} className="mt-3 inline-flex h-9 items-center rounded-full bg-navy-700 px-3 text-[13px] font-semibold text-white hover:bg-navy-800 disabled:opacity-50">Ausgewählte übernehmen</button>}
            </Karte>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Karte titel="Vergleich mit Marktspannen" untertitel="Benchmark aus markt.js – grün im Rahmen, gelb knapp außerhalb, rot auffällig">
          <ul className="space-y-3">
            {e.benchmark.eintraege.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-2">
                <span className="min-w-0 text-[13.5px] text-ink-800">{b.label}<span className="block text-[12px] text-ink-500">{b.text}</span></span>
                <span className="flex items-center gap-2"><span className="ov-num font-semibold">{fmt(b.wert, 1)}{b.einheit === "%" ? " %" : ""}</span><Ampel ampel={b.ampel} /></span>
              </li>
            ))}
          </ul>
        </Karte>
        <Karte titel="Soll / Ist" untertitel={`Ist aus ${k.istQuelle === "erpnext" ? "ERPNext" : k.istQuelle === "manuell" ? "manuellen Einträgen" : "dem Finanzmodul (Projektkosten)"} je Kostenart`} innen="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[460px] text-[13px]">
              <thead><tr className="border-b border-ink-100 text-[11.5px] font-semibold uppercase tracking-wider text-ink-500"><th scope="col" className="px-4 py-2 text-left">Kostenart / Gruppe</th><th scope="col" className="px-2 py-2 text-right">Soll</th><th scope="col" className="px-2 py-2 text-right">Ist</th><th scope="col" className="px-4 py-2 text-right">Quote</th></tr></thead>
              <tbody className="divide-y divide-ink-100">
                {k.sollIst.filter((z) => z.soll || z.ist).map((z) => (
                  <tr key={z.schluessel}>
                    <td className="px-4 py-2">{z.kostenart ? { flaeche: "Fläche/Grundstück", planung: "Planung & Gutachten", genehmigung: "Genehmigung", recht: "Recht", netz: "Netzprüfung", personal: "Personal", sonstiges: "Sonstiges" }[z.kostenart] || z.kostenart : GRUPPEN[z.gruppe]?.label}<span className="ml-1 text-[11px] text-ink-400">{z.quelle}</span></td>
                    <td className="ov-num px-2 py-2 text-right">{eur(z.soll)}</td>
                    <td className="ov-num px-2 py-2 text-right">{z.ist ? eur(z.ist) : "–"}</td>
                    <td className="ov-num px-4 py-2 text-right">{z.soll && z.ist ? `${fmt((z.ist / z.soll) * 100, 0)} %` : "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Karte>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Karte titel="Kostenstände" untertitel="Schätzung → Kostenrahmen → Kostenberechnung → Angebote → Vergabe → Abrechnung (angelehnt an DIN 276)">
          {schreiben && (
            <div className="mb-4 flex flex-wrap items-end gap-2">
              <Feld id="kk-stand" label="Stand festschreiben" className="min-w-[200px]">
                <select id="kk-stand" className={cn(auswahlfeld, "h-10")} value={stand} onChange={(ev) => setStand(ev.target.value)}>
                  {Object.entries(KOSTENSTAENDE).map(([id, x]) => <option key={id} value={id}>{x.nr}. {x.label}</option>)}
                </select>
              </Feld>
              <Feld id="kk-kom" label="Kommentar" className="min-w-[200px] flex-1"><input id="kk-kom" className={cn(eingabe, "h-10")} value={kommentar} onChange={(ev) => setKommentar(ev.target.value)} maxLength={300} placeholder="z. B. Angebote Gewerke eingeholt" /></Feld>
              <button type="button" disabled={laeuft || geaendert} title={geaendert ? "Erst speichern" : ""} onClick={() => aktion({ aktion: "festschreiben", stand, kommentar }, `Kostenstand „${KOSTENSTAENDE[stand].label}“ festgeschrieben.`).then((r) => r && setKommentar(""))} className="inline-flex h-10 items-center rounded-full bg-navy-700 px-4 text-[14px] font-semibold text-white hover:bg-navy-800 disabled:opacity-50">Festschreiben</button>
            </div>
          )}
          {k.staende.length ? (
            <ol className="divide-y divide-ink-100">
              {k.staende.map((x) => (
                <li key={x.id} className="flex flex-wrap items-start justify-between gap-2 py-2.5 text-[13px]">
                  <span className="min-w-0"><strong>{x.standLabel}</strong> · {new Date(x.am).toLocaleDateString("de-DE")} · {x.von}{x.kommentar && <span className="block text-ink-500">{x.kommentar}</span>}</span>
                  <span className="text-right"><span className="ov-num font-semibold">{teur(x.summen.gesamt)}</span>{x.summen.eurProKwp ? <span className="ov-num block text-[12px] text-ink-500">{fmt(x.summen.eurProKwp)} €/kWp</span> : null}{x.vergleich && <span className={cn("ov-num block text-[12px] font-semibold", x.vergleich.gesamt > 0 ? "text-red-700" : "text-ov-700")}>{x.vergleich.gesamt > 0 ? "+" : ""}{teur(x.vergleich.gesamt)} zum Vorstand</span>}</span>
                </li>
              ))}
            </ol>
          ) : <p className="text-[13px] text-ink-500">Noch kein Kostenstand festgeschrieben.</p>}
        </Karte>
        <Karte titel="Übergabe" untertitel="Finanzierungsbedarf an das Finanzierungsmodul, Capex an Bewertung/Projektbörse">
          {k.uebergabe ? (
            <p className="text-[13.5px] text-ink-700">Zuletzt übergeben am {new Date(k.uebergabe.am).toLocaleDateString("de-DE")} ({k.uebergabe.standLabel}): Finanzierungsbedarf <strong className="ov-num">{teur(k.uebergabe.finanzierungsbedarf)}</strong>, Capex <strong className="ov-num">{teur(k.uebergabe.capex)}</strong>.</p>
          ) : <p className="text-[13.5px] text-ink-600">Noch nicht übergeben.</p>}
          {k.uebergabe && Math.abs(k.uebergabe.gesamt - s.gesamt) > 1 && <p className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-900"><AlertTriangle aria-hidden="true" className="h-4 w-4 text-sun-500" />Aktuelle Kalkulation weicht vom übergebenen Stand ab.</p>}
          {schreiben && <button type="button" disabled={laeuft || geaendert} onClick={async () => (await bestaetigen({ titel: "Projektkosten übergeben?", text: "Die Werte gehen an Finanzierung und Bewertung.", details: [{ label: "Finanzierungsbedarf", wert: teur(s.finanzierungsbedarf) }, { label: "Capex", wert: teur(s.capex) }], bestaetigenText: "Projektkosten übergeben", gefahr: true })) && aktion({ aktion: "uebergeben" }, "An Finanzierung und Bewertung übergeben.")} className="mt-3 inline-flex h-10 items-center gap-2 rounded-full bg-ov-600 px-4 text-[14px] font-semibold text-white hover:bg-ov-700 disabled:opacity-50"><Send aria-hidden="true" className="h-4 w-4" />Projektkosten übergeben</button>}
        </Karte>
      </div>
    </div>
  );
}
