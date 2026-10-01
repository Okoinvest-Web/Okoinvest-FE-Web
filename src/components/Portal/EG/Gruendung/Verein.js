"use client";

// Vereinsorganisation einer Gemeinschaft (WP5): Mitglieder- bzw. Generalversammlungen über das bestehende Versammlungsmodul
// (Einladung mit Frist, Online-Abstimmung, Auszählung, Protokoll mit Prüfsumme), Beschlussregister, Organe und
// Funktionsperioden (Organ-Einträge über WP1), Mitgliedsbeiträge, Statuten und Dokumente, Auflösung. Rechte serverseitig.

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/components/ui/cn";
import { Feld, auswahlfeld, eingabe, textbereich } from "@/components/Portal/felder";
import { Badge, Tabelle, zelle } from "@/components/Portal/ui";
import { Klappe, Knopf, Meldung, useAktion } from "@/components/Portal/Mitglied/teile";
import { senden } from "@/lib/plattform/client";
import { ORGAN_FUNKTIONEN } from "@/lib/plattform/eg/modell";
import { BESCHLUSS_GREMIEN, BESCHLUSS_KATEGORIEN, BEITRAG_STATUS } from "@/lib/plattform/eg/verein";
import { GV_ARTEN, GV_FORMEN, MEHRHEITEN, STIMMEN } from "@/lib/plattform/mitglied/versammlung";
import { DokumentGenerator } from "./Dokumente";
import { Befunde, datumDe, eurDe } from "./teile";
import { abfragen } from "@/components/ui/Rueckfrage";

const dz = (s) => (s ? `${datumDe(s)}, ${String(s).slice(11, 16)} Uhr` : "–");

function Versammlung({ v, url, rechte }) {
  const id = useId();
  const a = useAktion(url);
  const [stimmen, setStimmen] = useState({});
  const [ab, setAb] = useState({ versammlungsleiter: "", protokollfuehrer: "", anwesend: "", notiz: "", tops: {} });
  const [zu, setZu] = useState(false);
  const beschluesse = v.tagesordnung.filter((t) => t.beschluss);
  const saal = ["praesenz", "hybrid"].includes(v.form);
  const los = (aktion, daten, text) => a.ausfuehren({ aktion, id: v.id, daten }, text);
  return (
    <li className="rounded-2xl bg-white p-4 ring-1 ring-inset ring-ink-200">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-display text-[16px] font-bold text-ink-900">{v.titel}</p>
          <p className="text-[13px] text-ink-500">{dz(v.datum)} · {GV_FORMEN[v.form]}{v.ort ? ` · ${v.ort}` : ""}{v.abstimmungBis ? ` · Online-Abstimmung bis ${dz(v.abstimmungBis)}` : ""}</p>
        </div>
        <Badge ton={v.ton}>{v.statusLabel}</Badge>
      </div>
      {v.einleitung && <p className="mt-2 text-[13.5px] text-ink-700">{v.einleitung}</p>}
      <ol className="mt-3 list-decimal space-y-0.5 pl-5 text-[13.5px] text-ink-800">
        {v.tagesordnung.map((t) => <li key={t.id}>{t.titel}{t.beschluss && <span className="ml-1 text-[12px] text-ink-500">(Beschluss, {MEHRHEITEN[t.mehrheit]?.label}{t.satzung ? ", Statutenänderung" : ""})</span>}</li>)}
      </ol>
      {v.zugang && <p className="mt-2 text-[13px] text-ink-600">Zugang: {v.zugang}</p>}
      {v.absage && <p className="mt-2 text-[13px] text-ink-700">Abgesagt: {v.absage.grund}</p>}
      {v.eigeneStimme && <p className="mt-2 text-[13px] text-ov-800">Ihre Stimme wurde am {datumDe(v.eigeneStimme.am)} abgegeben.</p>}
      {v.darfAbstimmen && (
        <form className="mt-3 space-y-2 rounded-2xl bg-ov-50 p-3" onSubmit={(e) => { e.preventDefault(); los("gv_abstimmen", { stimmen }, "Ihre Stimme ist gespeichert."); }}>
          <p className="text-[14px] font-semibold text-ink-900">Online abstimmen</p>
          {beschluesse.map((t) => (
            <fieldset key={t.id} className="text-[13.5px]">
              <legend className="font-medium text-ink-800">{t.titel}</legend>
              <div className="mt-1 flex flex-wrap gap-3">{Object.entries(STIMMEN).map(([k, l]) => <label key={k} className="flex items-center gap-1.5"><input type="radio" name={`${id}-${t.id}`} value={k} checked={stimmen[t.id] === k} onChange={() => setStimmen({ ...stimmen, [t.id]: k })} className="accent-ov-600" />{l}</label>)}</div>
            </fieldset>
          ))}
          <Knopf variante="primary" type="submit" disabled={a.laeuft || beschluesse.some((t) => !stimmen[t.id])}>Stimme abgeben (nicht änderbar)</Knopf>
        </form>
      )}
      {v.zwischenstand && <p className="mt-2 text-[13px] text-ink-600">Zwischenstand: {v.abgegeben} von {v.stimmberechtigt} Stimmberechtigten haben online abgestimmt.</p>}
      {v.ergebnis && (
        <div className="mt-3 rounded-2xl bg-ink-50 p-3 text-[13.5px]">
          <p className="font-semibold text-ink-900">Ergebnis · Beteiligung {v.ergebnis.beteiligungPct} % ({v.ergebnis.teilgenommen} von {v.ergebnis.stimmberechtigt})</p>
          <ul className="mt-1 space-y-0.5">{v.ergebnis.tops.map((t) => <li key={t.id}>{t.titel}: {t.ja} Ja, {t.nein} Nein, {t.enthaltung} Enthaltung – <strong className={t.angenommen ? "text-ov-800" : "text-danger-700"}>{t.angenommen ? "angenommen" : "abgelehnt"}</strong></li>)}</ul>
          {v.protokoll && <p className="mt-2 break-all text-[12px] text-ink-500">Protokoll: Leitung {v.protokoll.versammlungsleiter}, Protokoll {v.protokoll.protokollfuehrer} · Prüfsumme der Stimmzettel (SHA-256) {v.protokoll.sha256}</p>}
        </div>
      )}
      {rechte.gv >= 2 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {v.status === "entwurf" && <Knopf variante="primary" onClick={() => los("gv_einladen", {}, "Einladung versendet.")} disabled={a.laeuft}>Einladen</Knopf>}
          {v.status === "eingeladen" && ["online", "hybrid", "schriftlich"].includes(v.form) && <Knopf onClick={() => los("gv_oeffnen", {}, "Online-Abstimmung geöffnet.")} disabled={a.laeuft}>Online-Abstimmung öffnen</Knopf>}
          {["eingeladen", "abstimmung"].includes(v.status) && <Knopf onClick={() => setZu(!zu)}>Abschließen …</Knopf>}
          {!["abgeschlossen", "abgesagt"].includes(v.status) && <Knopf variante="gefahr" onClick={async () => { const g = await abfragen({ titel: "Versammlung absagen?", text: "Die Versammlung kann danach nicht mehr stattfinden.", details: [{ label: "Versammlung", wert: v.titel }, { label: "Datum", wert: dz(v.datum) }], label: "Grund der Absage", pflicht: true, mehrzeilig: true, gefahr: true, bestaetigenText: "Versammlung absagen" }); if (g) los("gv_absagen", { grund: g }, "Abgesagt."); }} disabled={a.laeuft}>Absagen</Knopf>}
        </div>
      )}
      {zu && (
        <form className="mt-3 grid gap-3 rounded-2xl bg-ink-50 p-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); los("gv_abschliessen", { ...ab, anwesend: Number(ab.anwesend) || 0 }, "Versammlung abgeschlossen – Beschlüsse im Register."); }}>
          <Feld id={`${id}-vl`} label="Versammlungsleitung" pflicht><input id={`${id}-vl`} className={eingabe} value={ab.versammlungsleiter} onChange={(e) => setAb({ ...ab, versammlungsleiter: e.target.value })} /></Feld>
          <Feld id={`${id}-pf`} label="Protokollführung" pflicht><input id={`${id}-pf`} className={eingabe} value={ab.protokollfuehrer} onChange={(e) => setAb({ ...ab, protokollfuehrer: e.target.value })} /></Feld>
          {saal && <Feld id={`${id}-an`} label="Anwesende im Saal"><input id={`${id}-an`} className={eingabe} inputMode="numeric" value={ab.anwesend} onChange={(e) => setAb({ ...ab, anwesend: e.target.value })} /></Feld>}
          {saal && beschluesse.map((t) => (
            <div key={t.id} className="sm:col-span-2">
              <p className="text-[13px] font-medium text-ink-800">{t.titel} – Stimmen im Saal</p>
              <div className="mt-1 grid grid-cols-3 gap-2">{["ja", "nein", "enthaltung"].map((k) => <input key={k} aria-label={`${t.titel} ${k}`} placeholder={STIMMEN[k]} className={eingabe} inputMode="numeric" value={ab.tops[t.id]?.[k] ?? ""} onChange={(e) => setAb({ ...ab, tops: { ...ab.tops, [t.id]: { ...(ab.tops[t.id] || {}), [k]: e.target.value } } })} />)}</div>
            </div>
          ))}
          <Feld id={`${id}-no`} label="Notiz zum Protokoll" className="sm:col-span-2"><textarea id={`${id}-no`} rows={2} className={textbereich} value={ab.notiz} onChange={(e) => setAb({ ...ab, notiz: e.target.value })} /></Feld>
          <div className="sm:col-span-2"><Knopf variante="primary" type="submit" disabled={a.laeuft}>Abschließen und auszählen</Knopf></div>
        </form>
      )}
      <div className="mt-2"><Meldung fehler={a.fehler} ok={a.ok} /></div>
    </li>
  );
}

function NeueVersammlung({ url, vorlage = [], konfig }) {
  const id = useId();
  const a = useAktion(url);
  const [d, setD] = useState({ titel: "", art: "ordentlich", form: konfig?.onlineGv ? "hybrid" : "praesenz", datum: "", ort: "", zugang: "", abstimmungBis: "", einleitung: "", weitere: "" });
  const [auswahl, setAuswahl] = useState(() => vorlage.map(() => true));
  const s = (k) => (e) => setD({ ...d, [k]: e.target.value });
  const tagesordnung = () => [...vorlage.filter((_, i) => auswahl[i]), ...d.weitere.split("\n").map((x) => x.trim()).filter(Boolean).map((titel) => ({ titel, beschluss: false }))];
  return (
    <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); a.ausfuehren({ aktion: "gv_speichern", daten: { ...d, tagesordnung: tagesordnung() } }, "Versammlung als Entwurf angelegt."); }}>
      <Feld id={`${id}-t`} label="Titel" pflicht className="sm:col-span-2"><input id={`${id}-t`} className={eingabe} value={d.titel} onChange={s("titel")} placeholder="Ordentliche Mitgliederversammlung 2026" /></Feld>
      <Feld id={`${id}-a`} label="Art"><select id={`${id}-a`} className={auswahlfeld} value={d.art} onChange={s("art")}>{Object.entries(GV_ARTEN).map(([k, l]) => <option key={k} value={k}>{l.replace("Generalversammlung", "Versammlung")}</option>)}</select></Feld>
      <Feld id={`${id}-f`} label="Form" hinweis={konfig?.onlineGv ? "Online laut Statuten zulässig." : "Online-Formen nur mit Statutengrundlage."}><select id={`${id}-f`} className={auswahlfeld} value={d.form} onChange={s("form")}>{Object.entries(GV_FORMEN).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Feld>
      <Feld id={`${id}-d`} label="Beginn" pflicht hinweis={`Einladungsfrist mindestens ${konfig?.einladungsfristTage || 14} Tage.`}><input id={`${id}-d`} type="datetime-local" className={eingabe} value={d.datum} onChange={s("datum")} /></Feld>
      <Feld id={`${id}-b`} label="Online-Abstimmung bis"><input id={`${id}-b`} type="datetime-local" className={eingabe} value={d.abstimmungBis} onChange={s("abstimmungBis")} /></Feld>
      <Feld id={`${id}-o`} label="Ort"><input id={`${id}-o`} className={eingabe} value={d.ort} onChange={s("ort")} /></Feld>
      <Feld id={`${id}-z`} label="Zugang (Link, Einwahl)"><input id={`${id}-z`} className={eingabe} value={d.zugang} onChange={s("zugang")} /></Feld>
      <Feld id={`${id}-e`} label="Einleitung" className="sm:col-span-2"><textarea id={`${id}-e`} rows={2} className={textbereich} value={d.einleitung} onChange={s("einleitung")} /></Feld>
      <fieldset className="sm:col-span-2">
        <legend className="text-[13.5px] font-semibold text-ink-700">Tagesordnung (Vorlage)</legend>
        <ul className="mt-1 space-y-1 text-[13.5px]">{vorlage.map((t, i) => <li key={i}><label className="flex items-start gap-2"><input type="checkbox" className="mt-1 h-4 w-4 accent-ov-600" checked={auswahl[i]} onChange={(e) => setAuswahl(auswahl.map((x, j) => (j === i ? e.target.checked : x)))} />{t.titel}{t.beschluss && <span className="text-[12px] text-ink-500">(Beschluss)</span>}</label></li>)}</ul>
      </fieldset>
      <Feld id={`${id}-w`} label="Weitere Punkte (je Zeile, ohne Abstimmung)" className="sm:col-span-2"><textarea id={`${id}-w`} rows={2} className={textbereich} value={d.weitere} onChange={s("weitere")} /></Feld>
      <div className="sm:col-span-2"><Meldung fehler={a.fehler} ok={a.ok} /><Knopf variante="primary" type="submit" disabled={a.laeuft} className="mt-2">Als Entwurf speichern</Knopf></div>
    </form>
  );
}

function Beschluesse({ liste, url, darf }) {
  const id = useId();
  const a = useAktion(url);
  const [d, setD] = useState({ gremium: "vorstand", datum: "", gegenstand: "", kategorie: "sonstiges", text: "", ja: "", nein: "", enthaltung: "", mehrheit: "einfach" });
  const s = (k) => (e) => setD({ ...d, [k]: e.target.value });
  return (
    <div className="space-y-4">
      {darf && (
        <Klappe titel="Beschluss erfassen (Vorstand, Umlauf, Versammlung)">
          <form className="grid gap-3 sm:grid-cols-3" onSubmit={(e) => { e.preventDefault(); a.ausfuehren({ aktion: "beschluss_speichern", daten: d }, "Beschluss im Register."); }}>
            <Feld id={`${id}-g`} label="Gremium"><select id={`${id}-g`} className={auswahlfeld} value={d.gremium} onChange={s("gremium")}>{Object.entries(BESCHLUSS_GREMIEN).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Feld>
            <Feld id={`${id}-d`} label="Datum"><input id={`${id}-d`} type="date" className={eingabe} value={d.datum} onChange={s("datum")} /></Feld>
            <Feld id={`${id}-k`} label="Kategorie"><select id={`${id}-k`} className={auswahlfeld} value={d.kategorie} onChange={s("kategorie")}>{Object.entries(BESCHLUSS_KATEGORIEN).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Feld>
            <Feld id={`${id}-ge`} label="Gegenstand" className="sm:col-span-3"><input id={`${id}-ge`} className={eingabe} value={d.gegenstand} onChange={s("gegenstand")} /></Feld>
            <Feld id={`${id}-t`} label="Wortlaut" className="sm:col-span-3"><textarea id={`${id}-t`} rows={2} className={textbereich} value={d.text} onChange={s("text")} /></Feld>
            <Feld id={`${id}-j`} label="Ja"><input id={`${id}-j`} className={eingabe} inputMode="numeric" value={d.ja} onChange={s("ja")} /></Feld>
            <Feld id={`${id}-n`} label="Nein"><input id={`${id}-n`} className={eingabe} inputMode="numeric" value={d.nein} onChange={s("nein")} /></Feld>
            <Feld id={`${id}-e`} label="Enthaltung"><input id={`${id}-e`} className={eingabe} inputMode="numeric" value={d.enthaltung} onChange={s("enthaltung")} /></Feld>
            <div className="sm:col-span-3"><Meldung fehler={a.fehler} ok={a.ok} /><Knopf variante="primary" type="submit" disabled={a.laeuft} className="mt-2">Erfassen</Knopf></div>
          </form>
        </Klappe>
      )}
      {liste.length ? (
        <Tabelle kopf={["Datum", "Gremium", "Gegenstand", "Ergebnis"]}>
          {liste.map((b) => (
            <tr key={b.id}>
              <td className={zelle}>{datumDe(b.datum)}</td>
              <td className={zelle}>{BESCHLUSS_GREMIEN[b.gremium]}<span className="block text-[12px] text-ink-500">{BESCHLUSS_KATEGORIEN[b.kategorie]}</span></td>
              <td className={zelle}><span className="font-medium text-ink-900">{b.gegenstand}</span>{b.text && <span className="block whitespace-pre-line text-[12.5px] text-ink-600">{b.text}</span>}</td>
              <td className={zelle}><Badge ton={b.angenommen ? "ok" : "warn"}>{b.angenommen ? "angenommen" : "abgelehnt"}</Badge><span className="block text-[12px] text-ink-500">{b.ja}/{b.nein}/{b.enthaltung} · {MEHRHEITEN[b.mehrheit]?.label}</span></td>
            </tr>
          ))}
        </Tabelle>
      ) : <p className="text-[14px] text-ink-500">Noch keine Beschlüsse.</p>}
    </div>
  );
}

function Organe({ v, url }) {
  const id = useId();
  const a = useAktion(url);
  const [d, setD] = useState({ funktion: "obmann", name: "", email: "", von: v.heute, bis: "", zeichnungsberechtigt: false });
  const s = (k) => (e) => setD({ ...d, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const darf = v.rechte.organe >= 2;
  return (
    <div className="space-y-4">
      {v.organCheck && <Befunde liste={v.organCheck.befunde} leer="Die Besetzung der Organe ist vollständig." />}
      <Tabelle kopf={["Funktion", "Person", "Funktionsperiode", ""]}>
        {v.organe.map((o) => (
          <tr key={o.id} className={o.wirksam ? "" : "opacity-60"}>
            <td className={zelle}>{o.funktionLabel}{o.zeichnungsberechtigt && <span className="block text-[12px] text-ov-700">zeichnungsberechtigt</span>}</td>
            <td className={zelle}>{o.personName}{o.kontoId === null && v.rechte.organ && <span className="block text-[12px] text-ink-500">ohne Portalkonto</span>}</td>
            <td className={zelle}>{datumDe(o.von)} – {o.bis ? datumDe(o.bis) : "offen"}</td>
            <td className={zelle}>{darf && o.wirksam && <Knopf onClick={async () => { const b = await abfragen({ titel: "Funktion beenden?", details: [{ label: "Funktion", wert: o.funktionLabel }, { label: "Person", wert: o.personName }], label: "Beenden zum", typ: "date", standard: v.heute, pflicht: true, bestaetigenText: "Funktion beenden" }); if (b) a.ausfuehren({ aktion: "organ_beenden", id: o.id, daten: { bis: b } }, "Funktion beendet."); }} disabled={a.laeuft} className="h-8 text-[12.5px]">Beenden</Knopf>}</td>
          </tr>
        ))}
      </Tabelle>
      {v.organCheck?.faellig?.length > 0 && <p className="text-[13px] text-ink-600">Neuwahl vorbereiten: {v.organCheck.faellig.map((x) => `${x.funktionLabel} ${x.name} (${x.abgelaufen ? "abgelaufen" : "endet"} ${datumDe(x.ende)})`).join(" · ")}</p>}
      {darf && (
        <Klappe titel="Funktion eintragen (z. B. nach einer Wahl)">
          <form className="grid gap-3 sm:grid-cols-3" onSubmit={(e) => { e.preventDefault(); a.ausfuehren({ aktion: "organ_speichern", daten: d }, "Eingetragen."); }}>
            <Feld id={`${id}-f`} label="Funktion"><select id={`${id}-f`} className={auswahlfeld} value={d.funktion} onChange={s("funktion")}>{Object.entries(ORGAN_FUNKTIONEN).map(([k, f]) => <option key={k} value={k}>{f.label}</option>)}</select></Feld>
            <Feld id={`${id}-n`} label="Name"><input id={`${id}-n`} className={eingabe} value={d.name} onChange={s("name")} /></Feld>
            <Feld id={`${id}-e`} label="E-Mail (verknüpft ein Portalkonto)"><input id={`${id}-e`} type="email" className={eingabe} value={d.email} onChange={s("email")} /></Feld>
            <Feld id={`${id}-v`} label="Von"><input id={`${id}-v`} type="date" className={eingabe} value={d.von} onChange={s("von")} /></Feld>
            <Feld id={`${id}-b`} label="Bis (optional)"><input id={`${id}-b`} type="date" className={eingabe} value={d.bis} onChange={s("bis")} /></Feld>
            <label className="flex items-center gap-2 self-end pb-3 text-[13.5px] text-ink-700"><input type="checkbox" className="h-4 w-4 accent-ov-600" checked={d.zeichnungsberechtigt} onChange={s("zeichnungsberechtigt")} />zeichnungsberechtigt</label>
            <div className="sm:col-span-3"><Knopf variante="primary" type="submit" disabled={a.laeuft}>Eintragen</Knopf></div>
          </form>
        </Klappe>
      )}
      <Meldung fehler={a.fehler} ok={a.ok} />
    </div>
  );
}

function Beitraege({ v, url }) {
  const id = useId();
  const a = useAktion(url);
  const [d, setD] = useState({ jahr: v.heute.slice(0, 4), anteilig: false, einhebung: "gesondert" });
  const [auswahl, setAuswahl] = useState([]);
  const u = v.beitragsUebersicht;
  const jahr = Number(d.jahr);
  const liste = v.beitraege.filter((b) => b.jahr === jahr);
  const darf = v.rechte.buchhaltung >= 2;
  return (
    <div className="space-y-4">
      <p className="text-[13.5px] text-ink-600">Tarif: {v.beitragTarif ? `${v.beitragTarif.bezeichnung} – Mitgliedsbeitrag ${eurDe(v.beitragTarif.mitgliedsbeitragJahr)} pro Jahr, Beitrittsgebühr ${eurDe(v.beitragTarif.einmalgebuehrBeitritt)}` : "kein gültiger Tarif"}. Beiträge können mit der Energieabrechnung (WP4) oder gesondert eingehoben werden – nicht doppelt.</p>
      {u && <div className="flex flex-wrap gap-2"><Badge>Soll {eurDe(u.sollEur)}</Badge><Badge ton="ok">bezahlt {eurDe(u.bezahltEur)}</Badge><Badge ton={u.offenEur ? "warn" : "neutral"}>offen {eurDe(u.offenEur)}</Badge></div>}
      {darf && (
        <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); a.ausfuehren({ aktion: "beitraege_vorschreiben", daten: { jahr, anteilig: d.anteilig, einhebung: d.einhebung } }, "Beiträge vorgeschrieben."); }}>
          <Feld id={`${id}-j`} label="Jahr"><input id={`${id}-j`} className={`${eingabe} w-28`} inputMode="numeric" value={d.jahr} onChange={(e) => setD({ ...d, jahr: e.target.value })} /></Feld>
          <Feld id={`${id}-e`} label="Einhebung"><select id={`${id}-e`} className={auswahlfeld} value={d.einhebung} onChange={(e) => setD({ ...d, einhebung: e.target.value })}>{Object.entries(v.beitragEinhebung).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Feld>
          <label className="flex items-center gap-2 pb-3 text-[13.5px] text-ink-700"><input type="checkbox" className="h-4 w-4 accent-ov-600" checked={d.anteilig} onChange={(e) => setD({ ...d, anteilig: e.target.checked })} />bei Beitritt im Jahr anteilig</label>
          <Knopf variante="primary" type="submit" disabled={a.laeuft}>Vorschreiben</Knopf>
        </form>
      )}
      {liste.length > 0 && (
        <>
          {darf && <div className="flex flex-wrap gap-2">{Object.entries(BEITRAG_STATUS).map(([k, l]) => <Knopf key={k} disabled={!auswahl.length || a.laeuft} onClick={() => a.ausfuehren({ aktion: "beitrag_status", daten: { ids: auswahl, status: k } }, `${auswahl.length} → ${l}`).then(() => setAuswahl([]))}>Auswahl: {l}</Knopf>)}</div>}
          <Tabelle kopf={["", "Mitglied", "Art", "Betrag", "Status"]}>
            {liste.map((b) => (
              <tr key={b.id}>
                <td className={zelle}>{darf && <input type="checkbox" aria-label={`${b.mitgliedName} auswählen`} className="h-4 w-4 accent-ov-600" checked={auswahl.includes(b.id)} onChange={(e) => setAuswahl(e.target.checked ? [...auswahl, b.id] : auswahl.filter((x) => x !== b.id))} />}</td>
                <td className={zelle}>{b.mitgliedName}<span className="block text-[12px] text-ink-500">Nr. {b.mitgliedsnummer}</span></td>
                <td className={zelle}>{b.art === "jahresbeitrag" ? "Mitgliedsbeitrag" : "Beitrittsgebühr"}<span className="block text-[12px] text-ink-500">{v.beitragEinhebung[b.einhebung]}</span></td>
                <td className={zelle}>{eurDe(b.betragEur)}</td>
                <td className={zelle}><Badge ton={b.status === "bezahlt" ? "ok" : b.status === "offen" ? "warn" : "neutral"}>{BEITRAG_STATUS[b.status]}</Badge></td>
              </tr>
            ))}
          </Tabelle>
        </>
      )}
      <Meldung fehler={a.fehler} ok={a.ok} />
    </div>
  );
}

function Statuten({ v, url }) {
  const id = useId();
  const a = useAktion(url);
  const [d, setD] = useState(v.statuten);
  const s = (k) => (e) => setD({ ...d, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const darf = v.rechte.organe >= 2;
  return (
    <form className="grid gap-3 sm:grid-cols-3" onSubmit={(e) => { e.preventDefault(); a.ausfuehren({ aktion: "statuten_speichern", daten: d }, "Statuten-Angaben gespeichert."); }}>
      <Feld id={`${id}-t`} label="Tätigkeitsbereich" className="sm:col-span-3"><input id={`${id}-t`} className={eingabe} value={d.taetigkeitsgebiet} onChange={s("taetigkeitsgebiet")} disabled={!darf} /></Feld>
      <Feld id={`${id}-k`} label="Austrittsfrist (Wochen)"><input id={`${id}-k`} className={eingabe} value={d.kuendigungsfristWochen} onChange={s("kuendigungsfristWochen")} disabled={!darf} /></Feld>
      <Feld id={`${id}-f`} label="Funktionsperiode (Jahre)"><input id={`${id}-f`} className={eingabe} value={d.funktionsperiodeJahre} onChange={s("funktionsperiodeJahre")} disabled={!darf} /></Feld>
      <Feld id={`${id}-e`} label="Einladungsfrist (Tage)"><input id={`${id}-e`} className={eingabe} value={d.einladungsfristTage} onChange={s("einladungsfristTage")} disabled={!darf} /></Feld>
      <Feld id={`${id}-g`} label="Ordentliche Versammlung alle … Jahre"><input id={`${id}-g`} className={eingabe} value={d.gvTurnusJahre} onChange={s("gvTurnusJahre")} disabled={!darf} /></Feld>
      <Feld id={`${id}-ta`} label="Tarife beschließt"><select id={`${id}-ta`} className={auswahlfeld} value={d.tarifeDurch} onChange={s("tarifeDurch")} disabled={!darf}><option value="vorstand">Vorstand</option><option value="gv">Mitgliederversammlung</option></select></Feld>
      <label className="flex items-center gap-2 self-end pb-3 text-[13.5px] text-ink-700"><input type="checkbox" className="h-4 w-4 accent-ov-600" checked={!!d.onlineGv} onChange={s("onlineGv")} disabled={!darf} />Online-Versammlung laut Statuten</label>
      {darf && <div className="sm:col-span-3"><Meldung fehler={a.fehler} ok={a.ok} /><Knopf variante="primary" type="submit" disabled={a.laeuft} className="mt-2">Speichern</Knopf></div>}
    </form>
  );
}

function Aufloesung({ v }) {
  const router = useRouter();
  const [fehler, setFehler] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  const url = `/api/portal/eg/${v.gemeinschaft.id}/aufloesung`;
  const los = async (body) => {
    setLaeuft(true);
    setFehler("");
    try {
      await senden(url, { body });
      router.refresh();
    } catch (e) {
      setFehler(e.message);
    } finally {
      setLaeuft(false);
    }
  };
  const au = v.aufloesung;
  if (v.rechte.organe < 1) return null;
  return (
    <div className="space-y-3">
      {!au?.gestartetAm ? (
        <>
          <p className="text-[13.5px] leading-relaxed text-ink-600">Die Auflösung beginnt mit dem Beschluss der Mitglieder- bzw. Generalversammlung (Zwei-Drittel-Mehrheit). Die Checkliste führt durch Abmeldung aller Zählpunkte (nicht rückwirkend), Kündigung beim Netzbetreiber, Schlussabrechnung, Vermögensverwendung, Behördenanzeige, Finanzamt, ebUtilities und Aufbewahrung (Fachkonzept 2.7).</p>
          {v.rechte.organe >= 2 && <Knopf variante="gefahr" disabled={laeuft} onClick={async () => { const g = await abfragen({ titel: "Auflösung einleiten?", text: "Die Gemeinschaft geht in Auflösung, die Checkliste startet.", label: "Auflösungsbeschluss", hilfe: "Datum, Gremium und Ergebnis der Abstimmung", pflicht: true, mehrzeilig: true, gefahr: true, bestaetigenText: "Auflösung einleiten" }); if (g) los({ aktion: "starten", grund: g }); }}>Auflösung einleiten</Knopf>}
        </>
      ) : (
        <>
          <p className="text-[13.5px] text-ink-700">Eingeleitet am {datumDe(au.gestartetAm)} · {au.offen} Pflichtpunkt(e) offen</p>
          <ul className="space-y-1.5 text-[13.5px]">
            {au.punkte.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-2">
                <input type="checkbox" aria-label={p.text} className="h-4 w-4 accent-ov-600" checked={p.erledigt} disabled={laeuft || v.rechte.organe < 2 || p.auto === true} onChange={(e) => los({ aktion: "punkt", punkt: p.id, erledigt: e.target.checked })} />
                <span className={cn("min-w-0 flex-1", p.erledigt && "text-ink-500 line-through")}>{p.text} <span className="text-[12px] text-ink-500">({p.quelle}){p.pflicht ? "" : " · optional"}</span></span>
              </li>
            ))}
          </ul>
          {au.abschliessbar && v.rechte.organe >= 2 && <Knopf variante="primary" disabled={laeuft} onClick={() => los({ aktion: "abschliessen" })}>Auflösung abschließen</Knopf>}
        </>
      )}
      <Meldung fehler={fehler} />
    </div>
  );
}

const REITER = [
  { id: "versammlungen", label: "Versammlungen" },
  { id: "beschluesse", label: "Beschlüsse" },
  { id: "organe", label: "Organe" },
  { id: "beitraege", label: "Mitgliedsbeiträge", recht: "buchhaltung" },
  { id: "statuten", label: "Statuten & Dokumente", organ: true },
  { id: "aufloesung", label: "Auflösung", organ: true },
];

export default function VereinAnsicht({ verein: v, start = "versammlungen", vorlagenFelder = {} }) {
  const [reiter, setReiter] = useState(start);
  const url = `/api/portal/eg/${v.gemeinschaft.id}/verein`;
  const sichtbar = REITER.filter((r) => (!r.recht || v.rechte[r.recht] >= 1) && (!r.organ || v.rechte.organ));
  return (
    <div className="space-y-5">
      <div className="-mx-1 overflow-x-auto" role="tablist" aria-label="Vereinsorganisation">
        <div className="flex min-w-max gap-1 px-1">
          {sichtbar.map((r) => <button key={r.id} type="button" role="tab" aria-selected={reiter === r.id} onClick={() => setReiter(r.id)} className={cn("rounded-full px-3.5 py-2 text-[13.5px] font-semibold transition", reiter === r.id ? "bg-navy-800 text-white" : "bg-white text-ink-700 ring-1 ring-ink-200 hover:bg-ink-50")}>{r.label}</button>)}
        </div>
      </div>
      {reiter === "versammlungen" && (
        <div className="space-y-4">
          <p className={cn("rounded-xl px-3.5 py-2.5 text-[13.5px] ring-1 ring-inset", v.gvPflicht.ueberfaellig ? "bg-sun-300/20 ring-sun-400/40" : "bg-ink-50 ring-ink-200")}>{v.gvPflicht.text} <span className="text-[12px] text-ink-500">({v.gvPflicht.quelle})</span></p>
          {v.versammlungen.length ? <ul className="space-y-3">{v.versammlungen.map((x) => <Versammlung key={x.id} v={x} url={url} rechte={v.rechte} />)}</ul> : <p className="text-[14px] text-ink-500">Noch keine Versammlungen.</p>}
          {v.rechte.organ && v.rechte.gv >= 1 && <Klappe titel="Neue Versammlung vorbereiten"><NeueVersammlung url={url} vorlage={v.tagesordnungVorlage} konfig={v.gvKonfig} /></Klappe>}
        </div>
      )}
      {reiter === "beschluesse" && <Beschluesse liste={v.beschluesse} url={url} darf={v.rechte.organ && (v.rechte.organe >= 2 || v.rechte.gv >= 2)} />}
      {reiter === "organe" && <Organe v={v} url={url} />}
      {reiter === "beitraege" && <Beitraege v={v} url={url} />}
      {reiter === "statuten" && (
        <div className="space-y-6">
          <Statuten v={v} url={url} />
          <DokumentGenerator vorlagen={v.vorlagen} felder={vorlagenFelder} gemeinschaftId={v.gemeinschaft.id} dokumente={v.dokumente} vorgaben={v.statuten} />
        </div>
      )}
      {reiter === "aufloesung" && <Aufloesung v={v} />}
    </div>
  );
}
