"use client";

// SPV-/GmbH-Gründungsassistent (Backoffice): Projekt & Rechtsform → Firma & Sitz (Namensprüfung) → Gesellschafter &
// Geschäftsführung → Kapital & Gegenstand → Prüfen & anlegen. Die Regeln (Mindestkapital, Pflichtangaben) kommen aus
// dienste/gesellschaft/rechtsformen.js und werden serverseitig erneut geprüft.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Plus, Search, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import { Badge, Karte } from "@/components/Portal/ui";
import { Chip, FehlerBox, Feld, auswahlfeld, eingabe, textbereich } from "@/components/Portal/felder";
import { cn } from "@/components/ui/cn";
import { senden } from "@/lib/plattform/client";
import { GESELLSCHAFT_LAENDER, RECHTSFORMEN, gegenstandVorlage, gruendungPruefen, musterprotokollMoeglich, rechtsformenFuer } from "@/lib/plattform/dienste/gesellschaft/rechtsformen";
import { NAMENSPRUEFUNG_LABEL } from "@/lib/plattform/dienste/register/basis";

const SCHRITTE = ["Projekt & Rechtsform", "Firma & Sitz", "Gesellschafter", "Kapital & Gegenstand", "Prüfen & anlegen"];
const zahlDe = (n, w = "EUR") => `${Number(n || 0).toLocaleString("de-DE")} ${w === "EUR" ? "€" : w}`;

function vorschlagName(projekt, rechtsform) {
  const rf = RECHTSFORMEN[rechtsform];
  const ort = projekt?.gemeinde || projekt?.bundesland || "";
  const basis = ort ? `Solarpark ${ort}` : "Solarpark Projekt";
  return `${basis} ${rf?.kurz || "GmbH"}`;
}

export default function GruendungsAssistent({ auswahl, vorauswahl = "" }) {
  const router = useRouter();
  const [schritt, setSchritt] = useState(0);
  const [fehler, setFehler] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  const gruppe = auswahl.gruppe || [];
  const oi = gruppe[0];
  const startProjekt = (auswahl.projekte || []).find((p) => p.id === vorauswahl && !p.gesellschaftId) || null;
  const startLand = ["AT", "DE", "CH"].includes(startProjekt?.land) ? startProjekt.land : "AT";
  const [g, setG] = useState({
    entwicklungProjektId: startProjekt?.id || "",
    land: startLand,
    rechtsform: rechtsformenFuer(startLand)[0],
    name: "",
    sitz: "",
    bundesland: startProjekt?.bundesland || "",
    anschrift: "",
    gesellschafter: oi ? [{ art: "gruppe", gesellschaftId: oi.id, name: oi.name, anteil: 100, einlage: null }] : [],
    geschaeftsfuehrung: [{ name: auswahl.geschaeftsfuehrung?.[0] || "", geburtsdatum: "", anschrift: "", wohnsitzLand: startLand }],
    komplementaer: { name: "", register: "" },
    stammkapital: RECHTSFORMEN[rechtsformenFuer(startLand)[0]].kapital,
    einzahlung: RECHTSFORMEN[rechtsformenFuer(startLand)[0]].einzahlung,
    gegenstand: "",
    bilanzstichtag: "12-31",
    musterprotokoll: false,
  });
  const [np, setNp] = useState(null);
  const rf = RECHTSFORMEN[g.rechtsform];
  const projekt = (auswahl.projekte || []).find((p) => p.id === g.entwicklungProjektId) || null;
  const kapitalGes = rf.kapital > 0;

  const setze = (feld, wert) => setG((x) => ({ ...x, [feld]: wert }));
  function landWaehlen(land) {
    const r = rechtsformenFuer(land)[0];
    setG((x) => ({ ...x, land, rechtsform: r, stammkapital: RECHTSFORMEN[r].kapital, einzahlung: RECHTSFORMEN[r].einzahlung, geschaeftsfuehrung: x.geschaeftsfuehrung.map((p) => ({ ...p, wohnsitzLand: p.wohnsitzLand || land })) }));
    setNp(null);
  }
  function rechtsformWaehlen(r) {
    setG((x) => ({ ...x, rechtsform: r, stammkapital: Math.max(Number(x.stammkapital) || 0, RECHTSFORMEN[r].kapital), einzahlung: Math.max(Number(x.einzahlung) || 0, RECHTSFORMEN[r].einzahlung) }));
    setNp(null);
  }

  // Einlagen der Kapitalgesellschaft aus Anteil × Stammkapital
  const daten = useMemo(() => {
    const ges = g.gesellschafter.map((x) => ({ ...x, einlage: kapitalGes ? Math.round(((Number(g.stammkapital) || 0) * (Number(x.anteil) || 0)) / 100) : Number(x.einlage) || 0 }));
    return {
      ...g, gesellschafter: ges, name: g.name.trim() || vorschlagName(projekt, g.rechtsform),
      stammkapital: kapitalGes ? Number(g.stammkapital) || 0 : ges.reduce((s, x) => s + x.einlage, 0),
      einzahlung: Number(g.einzahlung) || 0,
      gegenstand: g.gegenstand.trim() || gegenstandVorlage({ land: g.land, typ: projekt?.typ, ort: projekt?.gemeinde }),
      musterprotokoll: g.musterprotokoll && musterprotokollMoeglich({ ...g, gesellschafter: ges }),
    };
  }, [g, projekt, kapitalGes]);
  const pruefung = gruendungPruefen(daten);

  async function namePruefen() {
    setFehler("");
    try {
      setNp(await senden("/api/admin/gesellschaften/namenspruefung", { body: { rechtsform: g.rechtsform, name: daten.name } }));
    } catch (x) {
      setFehler(x.message);
    }
  }

  async function anlegen() {
    setFehler("");
    setLaeuft(true);
    try {
      const body = { ...daten, entwicklungProjektId: g.entwicklungProjektId || null, namenspruefung: {} };
      const r = await senden("/api/admin/gesellschaften", { body });
      router.push(`/portal/admin/gesellschaften/${r.gesellschaft.id}`);
    } catch (x) {
      setFehler(x.message);
      setLaeuft(false);
    }
  }

  const zeileGes = (i, feld, wert) => setG((x) => ({ ...x, gesellschafter: x.gesellschafter.map((y, j) => (j === i ? { ...y, [feld]: wert } : y)) }));
  const zeileGf = (i, feld, wert) => setG((x) => ({ ...x, geschaeftsfuehrung: x.geschaeftsfuehrung.map((y, j) => (j === i ? { ...y, [feld]: wert } : y)) }));

  return (
    <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
      <nav aria-label="Schritte" className="min-w-0">
        <ol className="flex gap-2 overflow-x-auto ov-no-scrollbar xl:flex-col">
          {SCHRITTE.map((s, i) => (
            <li key={s} className="shrink-0">
              <button type="button" onClick={() => setSchritt(i)} aria-current={schritt === i ? "step" : undefined}
                className={cn("flex w-full items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-left text-[13.5px] font-semibold ring-1 ring-inset", schritt === i ? "bg-navy-900 text-white ring-navy-900" : i < schritt ? "bg-ov-50 text-ov-800 ring-ov-200" : "bg-white text-ink-700 ring-ink-200")}>
                <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px]", schritt === i ? "bg-white/15" : "bg-white ring-1 ring-ink-200")}>{i < schritt ? <Check aria-hidden="true" className="h-3.5 w-3.5" /> : i + 1}</span>
                {s}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <Karte titel={SCHRITTE[schritt]} untertitel={`${rf.label} · ${daten.name}`}>
        <div className="space-y-5">
          {schritt === 0 && (
            <>
              <Feld id="ga-projekt" label="Entwicklungsprojekt (optional)" hinweis="Verknüpft die Gesellschaft mit dem Projekt der Projektentwicklung; je Projekt eine Gesellschaft.">
                <select id="ga-projekt" value={g.entwicklungProjektId} onChange={(e) => { const p = auswahl.projekte.find((x) => x.id === e.target.value); setG((x) => ({ ...x, entwicklungProjektId: e.target.value, bundesland: p?.bundesland || x.bundesland })); if (p && ["AT", "DE", "CH"].includes(p.land)) landWaehlen(p.land); }} className={auswahlfeld}>
                  <option value="">Ohne Projekt</option>
                  {(auswahl.projekte || []).map((p) => (
                    <option key={p.id} value={p.id} disabled={!!p.gesellschaftId}>{p.titel} · {p.land} · {Number(p.mwp || 0).toLocaleString("de-DE")} MWp{p.gesellschaftId ? " (bereits gegründet)" : ""}</option>
                  ))}
                </select>
              </Feld>
              <fieldset>
                <legend className="mb-2 text-[13.5px] font-semibold text-ink-700">Land</legend>
                <div className="flex flex-wrap gap-2">{Object.entries(GESELLSCHAFT_LAENDER).map(([k, l]) => <Chip key={k} type="radio" name="ga-land" value={k} checked={g.land === k} onChange={() => landWaehlen(k)}>{l}</Chip>)}</div>
              </fieldset>
              <fieldset>
                <legend className="mb-2 text-[13.5px] font-semibold text-ink-700">Rechtsform</legend>
                <div className="grid gap-3 md:grid-cols-2">
                  {rechtsformenFuer(g.land).map((r) => {
                    const x = RECHTSFORMEN[r];
                    return (
                      <label key={r} className={cn("cursor-pointer rounded-2xl p-4 ring-1 ring-inset has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ov-500", g.rechtsform === r ? "bg-ov-50 ring-ov-400" : "bg-white ring-ink-200 hover:ring-ink-300")}>
                        <input type="radio" name="ga-rf" value={r} checked={g.rechtsform === r} onChange={() => rechtsformWaehlen(r)} className="sr-only" />
                        <span className="font-semibold text-ink-900">{x.label}</span>
                        <span className="mt-1 block text-[12.5px] leading-snug text-ink-600">{x.kapital ? `Mindestkapital ${zahlDe(x.kapital, x.waehrung)}` : "Kein Mindestkapital der KG"} · {x.register}</span>
                        <span className="mt-1 block text-[12px] leading-snug text-ink-500">{x.hinweis}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            </>
          )}

          {schritt === 1 && (
            <>
              <Feld id="ga-name" label="Firma" pflicht hinweis={`Mit Rechtsformzusatz „${rf.kurz}“. Vorschlag: ${vorschlagName(projekt, g.rechtsform)}`}>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input id="ga-name" value={g.name} onChange={(e) => { setze("name", e.target.value); setNp(null); }} placeholder={vorschlagName(projekt, g.rechtsform)} className={eingabe} />
                  <Button type="button" size="sm" variant="navy" icon={Search} className="h-12 shrink-0" onClick={namePruefen}>Name prüfen</Button>
                </div>
              </Feld>
              {np && (
                <div className="rounded-2xl bg-ink-50 px-4 py-3 text-[13.5px]">
                  <p className="flex flex-wrap items-center gap-2"><Badge ton={NAMENSPRUEFUNG_LABEL[np.ergebnis]?.ton}>{NAMENSPRUEFUNG_LABEL[np.ergebnis]?.label}</Badge><span className="text-ink-500">Quelle: {np.quelle === "demo" ? "Demo-Register" : np.quelle}</span></p>
                  {np.hinweise.length > 0 && <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-700">{np.hinweise.map((h) => <li key={h}>{h}</li>)}</ul>}
                  {np.aehnlich.length > 0 && <ul className="mt-2 space-y-0.5 text-ink-600">{np.aehnlich.map((a) => <li key={`${a.nummer}-${a.name}`}>{a.name} · {a.nummer} · {Math.round(a.aehnlichkeit * 100)} % ähnlich</li>)}</ul>}
                  {np.hinweisQuelle && <p className="mt-1 text-[12px] text-ink-500">{np.hinweisQuelle}</p>}
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <Feld id="ga-sitz" label="Sitz (Gemeinde)" pflicht><input id="ga-sitz" value={g.sitz} onChange={(e) => setze("sitz", e.target.value)} className={eingabe} /></Feld>
                <Feld id="ga-bl" label={g.land === "CH" ? "Kanton" : "Bundesland"}><input id="ga-bl" value={g.bundesland} onChange={(e) => setze("bundesland", e.target.value)} className={eingabe} /></Feld>
              </div>
              <Feld id="ga-adr" label="Geschäftsanschrift" hinweis="Häufig die Anschrift der ÖkoInvest GmbH; bei CH ggf. Domizil (c/o)."><input id="ga-adr" value={g.anschrift} onChange={(e) => setze("anschrift", e.target.value)} className={eingabe} /></Feld>
            </>
          )}

          {schritt === 2 && (
            <>
              {rf.komplementaer && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Feld id="ga-komp" label="Komplementär-GmbH" pflicht hinweis="Bestehende Verwaltungs-GmbH oder vorab zu gründen.">
                    <input id="ga-komp" list="ga-gruppe" value={g.komplementaer.name} onChange={(e) => setze("komplementaer", { ...g.komplementaer, name: e.target.value })} className={eingabe} />
                    <datalist id="ga-gruppe">{gruppe.map((x) => <option key={x.id} value={x.name} />)}</datalist>
                  </Feld>
                  <Feld id="ga-komp-reg" label="Register der Komplementärin"><input id="ga-komp-reg" value={g.komplementaer.register} onChange={(e) => setze("komplementaer", { ...g.komplementaer, register: e.target.value })} placeholder="HRB …" className={eingabe} /></Feld>
                </div>
              )}
              <fieldset className="space-y-3">
                <legend className="text-[13.5px] font-semibold text-ink-700">{rf.komplementaer ? "Kommanditisten" : "Gesellschafter"}</legend>
                {g.gesellschafter.map((x, i) => (
                  <div key={i} className="grid gap-2 rounded-2xl p-3 ring-1 ring-ink-200/70 sm:grid-cols-[140px_minmax(0,1fr)_100px_auto]">
                    <label className="sr-only" htmlFor={`ga-art-${i}`}>Art</label>
                    <select id={`ga-art-${i}`} value={x.art} onChange={(e) => zeileGes(i, "art", e.target.value)} className={auswahlfeld}>
                      <option value="gruppe">Gruppe</option><option value="person">Person</option><option value="extern">Extern (Firma)</option>
                    </select>
                    {x.art === "gruppe" ? (
                      <select aria-label="Gruppengesellschaft" value={x.gesellschaftId || ""} onChange={(e) => { const y = gruppe.find((z) => z.id === e.target.value); zeileGes(i, "gesellschaftId", e.target.value); zeileGes(i, "name", y?.name || ""); }} className={auswahlfeld}>
                        <option value="">Bitte wählen</option>
                        {gruppe.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
                      </select>
                    ) : (
                      <input aria-label="Name" value={x.name} onChange={(e) => zeileGes(i, "name", e.target.value)} placeholder={x.art === "person" ? "Vor- und Nachname" : "Firma"} className={eingabe} />
                    )}
                    <input aria-label="Anteil in Prozent" type="number" min={0} max={100} step="0.01" value={x.anteil} onChange={(e) => zeileGes(i, "anteil", e.target.value)} className={eingabe} />
                    <div className="flex items-center gap-2">
                      {!kapitalGes && <input aria-label="Haftsumme" type="number" min={0} value={x.einlage ?? ""} onChange={(e) => zeileGes(i, "einlage", e.target.value)} placeholder="Haftsumme €" className={cn(eingabe, "w-[130px]")} />}
                      <button type="button" aria-label="Gesellschafter entfernen" onClick={() => setG((y) => ({ ...y, gesellschafter: y.gesellschafter.filter((_, j) => j !== i) }))} className="rounded-full p-2 text-ink-500 hover:bg-ink-100"><Trash2 aria-hidden="true" className="h-4 w-4" /></button>
                    </div>
                    {x.art === "person" && (
                      <div className="grid gap-2 sm:col-span-4 sm:grid-cols-2">
                        <input aria-label="Geburtsdatum" type="date" value={x.geburtsdatum || ""} onChange={(e) => zeileGes(i, "geburtsdatum", e.target.value)} className={eingabe} />
                        <input aria-label="Wohnsitzland (ISO)" value={x.wohnsitzLand || ""} onChange={(e) => zeileGes(i, "wohnsitzLand", e.target.value.toUpperCase().slice(0, 2))} placeholder="Wohnsitzland, z. B. AT" className={eingabe} />
                      </div>
                    )}
                  </div>
                ))}
                <Button type="button" size="sm" variant="secondary" icon={Plus} onClick={() => setG((x) => ({ ...x, gesellschafter: [...x.gesellschafter, { art: "extern", name: "", anteil: 0, einlage: null }] }))}>Gesellschafter hinzufügen</Button>
              </fieldset>
              <fieldset className="space-y-3">
                <legend className="text-[13.5px] font-semibold text-ink-700">Geschäftsführung{rf.komplementaer ? " der Komplementärin" : ""}</legend>
                {g.geschaeftsfuehrung.map((x, i) => (
                  <div key={i} className="grid gap-2 rounded-2xl p-3 ring-1 ring-ink-200/70 sm:grid-cols-2">
                    <input aria-label="Name" value={x.name} onChange={(e) => zeileGf(i, "name", e.target.value)} placeholder="Vor- und Nachname" className={eingabe} />
                    <input aria-label="Geburtsdatum" type="date" value={x.geburtsdatum} onChange={(e) => zeileGf(i, "geburtsdatum", e.target.value)} className={eingabe} />
                    <input aria-label="Anschrift" value={x.anschrift} onChange={(e) => zeileGf(i, "anschrift", e.target.value)} placeholder="Anschrift" className={eingabe} />
                    <div className="flex items-center gap-2">
                      <input aria-label="Wohnsitzland" value={x.wohnsitzLand} onChange={(e) => zeileGf(i, "wohnsitzLand", e.target.value.toUpperCase().slice(0, 2))} placeholder="Wohnsitzland" className={eingabe} />
                      <button type="button" aria-label="Geschäftsführer entfernen" onClick={() => setG((y) => ({ ...y, geschaeftsfuehrung: y.geschaeftsfuehrung.filter((_, j) => j !== i) }))} className="rounded-full p-2 text-ink-500 hover:bg-ink-100"><Trash2 aria-hidden="true" className="h-4 w-4" /></button>
                    </div>
                  </div>
                ))}
                <Button type="button" size="sm" variant="secondary" icon={Plus} onClick={() => setG((x) => ({ ...x, geschaeftsfuehrung: [...x.geschaeftsfuehrung, { name: "", geburtsdatum: "", anschrift: "", wohnsitzLand: x.land }] }))}>Geschäftsführung hinzufügen</Button>
              </fieldset>
            </>
          )}

          {schritt === 3 && (
            <>
              <p className="rounded-2xl bg-sand-100 px-4 py-3 text-[13.5px] leading-relaxed text-ink-700">{rf.einzahlungText}</p>
              {kapitalGes && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Feld id="ga-kap" label={`Stammkapital (${rf.waehrung})`} pflicht hinweis={`Mindestens ${zahlDe(rf.kapital, rf.waehrung)}`}><input id="ga-kap" type="number" min={rf.kapital} step="1" value={g.stammkapital} onChange={(e) => setze("stammkapital", e.target.value)} className={eingabe} /></Feld>
                  <Feld id="ga-einz" label={`Bei Gründung eingezahlt (${rf.waehrung})`} pflicht hinweis={`Mindestens ${zahlDe(rf.einzahlung, rf.waehrung)}`}><input id="ga-einz" type="number" min={rf.einzahlung} step="1" value={g.einzahlung} onChange={(e) => setze("einzahlung", e.target.value)} className={eingabe} /></Feld>
                </div>
              )}
              <Feld id="ga-gg" label="Unternehmensgegenstand" hinweis="Vorlage PV-Kraftwerk – bei Bedarf anpassen.">
                <textarea id="ga-gg" rows={6} value={g.gegenstand || daten.gegenstand} onChange={(e) => setze("gegenstand", e.target.value)} className={textbereich} />
              </Feld>
              <div className="grid gap-4 sm:grid-cols-2">
                <Feld id="ga-bst" label="Bilanzstichtag (MM-TT)"><input id="ga-bst" value={g.bilanzstichtag} onChange={(e) => setze("bilanzstichtag", e.target.value)} placeholder="12-31" className={eingabe} /></Feld>
                {rf.musterprotokoll && (
                  <label className="flex items-start gap-2.5 self-end pb-3 text-[13.5px] text-ink-700">
                    <input type="checkbox" checked={g.musterprotokoll} onChange={(e) => setze("musterprotokoll", e.target.checked)} disabled={!musterprotokollMoeglich(daten)} className="mt-1 h-4 w-4 accent-ov-600" />
                    Musterprotokoll verwenden (≤ 3 Gesellschafter, 1 Geschäftsführer)
                  </label>
                )}
              </div>
            </>
          )}

          {schritt === 4 && (
            <>
              <dl className="grid gap-x-6 gap-y-3 text-[14px] sm:grid-cols-2">
                {[["Firma", daten.name], ["Rechtsform", rf.label], ["Sitz", daten.sitz || "–"], ["Projekt", projekt ? projekt.titel : "ohne"], ["Stammkapital", rf.kapital || !kapitalGes ? zahlDe(daten.stammkapital, rf.waehrung) : "–"], ["Einzahlung", zahlDe(daten.einzahlung, rf.waehrung)], ["Gesellschafter", daten.gesellschafter.map((x) => `${x.name || "?"} ${x.anteil} %`).join(", ")], ["Geschäftsführung", daten.geschaeftsfuehrung.map((x) => x.name).filter(Boolean).join(", ") || "–"], ["Namensprüfung", np ? NAMENSPRUEFUNG_LABEL[np.ergebnis]?.label : "wird beim Anlegen durchgeführt"]].map(([l, w]) => (
                  <div key={l} className="min-w-0"><dt className="text-[12.5px] text-ink-500">{l}</dt><dd className="break-words text-ink-900">{w}</dd></div>
                ))}
              </dl>
              {pruefung.length > 0 ? (
                <ul className="list-disc space-y-1 rounded-2xl bg-sun-300/20 py-3 pl-9 pr-4 text-[13.5px] text-ink-800">{pruefung.map((p) => <li key={p}>{p}</li>)}</ul>
              ) : (
                <p className="rounded-2xl bg-ov-50 px-4 py-3 text-[13.5px] text-ov-900">Alle Pflichtangaben vollständig. Nach dem Anlegen erzeugen Sie das Dokumentenpaket (Muster für das Notariat) und arbeiten die Checkliste ab.</p>
              )}
              <Button type="button" icon={Check} onClick={anlegen} disabled={laeuft || pruefung.length > 0}>{laeuft ? "Wird angelegt …" : "Gründung anlegen"}</Button>
            </>
          )}

          <FehlerBox>{fehler}</FehlerBox>
          <div className="flex justify-between gap-2 border-t border-ink-100 pt-4">
            <Button type="button" size="sm" variant="ghost" icon={ArrowLeft} onClick={() => setSchritt((s) => Math.max(0, s - 1))} disabled={schritt === 0}>Zurück</Button>
            {schritt < SCHRITTE.length - 1 && <Button type="button" size="sm" variant="navy" onClick={() => setSchritt((s) => s + 1)}>Weiter <ArrowRight aria-hidden="true" className="h-4 w-4" /></Button>}
          </div>
        </div>
      </Karte>
    </div>
  );
}
