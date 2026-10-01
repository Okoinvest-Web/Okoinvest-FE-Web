"use client";

// Energiegemeinschaften WP1 – Formulare für Stammdaten (Backoffice /portal/admin/eg/**, Organe /portal/eg/[id]/verwaltung):
// Gemeinschaft anlegen/bearbeiten, Status, Organe, Anlage, Tarif, Migration aus dem Prototyp. Keine Fachlogik: Prüfung
// serverseitig (eg/*.js); die Formulare zeigen nur die Auswahllisten aus eg/modell.js und die Meldungen des Servers.

import { useId, useState } from "react";
import { Feld, auswahlfeld, eingabe, textbereich } from "@/components/Portal/felder";
import { Knopf, Meldung, useAktion } from "@/components/Portal/Mitglied/teile";
import {
  ANLAGE_ARTEN, EDA_ANBINDUNGEN, EG_MODELLE, FOERDERUNGEN, GEMEINSCHAFT_STATUS, NUTZUNGSMODELLE, ORGAN_FUNKTIONEN, RECHTSFORMEN, TARIF_BESCHLUSS, TARIF_STATUS, UST_STATUS,
  VERTEILMODELLE, ZONELEVEL, ABRECHNUNGSRHYTHMEN,
} from "@/lib/plattform/eg/modell";

const Auswahl = ({ id, label, wert, setzen, optionen, leer, className, disabled }) => (
  <Feld id={id} label={label} className={className}>
    <select id={id} className={auswahlfeld} value={wert ?? ""} onChange={(e) => setzen(e.target.value)} disabled={disabled}>
      {leer !== undefined && <option value="">{leer}</option>}
      {Object.entries(optionen).map(([k, v]) => <option key={k} value={k}>{typeof v === "string" ? v : v.label}</option>)}
    </select>
  </Feld>
);
const Text = ({ id, label, wert, setzen, className, typ = "text", hinweis, ...rest }) => (
  <Feld id={id} label={label} className={className} hinweis={hinweis}>
    <input id={id} type={typ} className={eingabe} value={wert ?? ""} onChange={(e) => setzen(e.target.value)} {...rest} />
  </Feld>
);

/** Neue Gemeinschaft (Backoffice) – Pflichtangaben, alles Weitere auf der Detailseite */
export function GemeinschaftNeu({ netzbetreiber = [] }) {
  const id = useId();
  const a = useAktion("/api/admin/eg");
  const [d, setD] = useState({ name: "", modell: "eeg", zonelevel: "3", netzbetreiber: "", rechtsform: "verein", verteilmodell: "dynamisch" });
  const s = (k) => (v) => setD({ ...d, [k]: v });
  const zonen = Object.fromEntries(Object.entries(ZONELEVEL).filter(([, z]) => z.modelle.includes(d.modell)).map(([k, z]) => [k, `${k} – ${z.label}`]));
  return (
    <form className="space-y-4" onSubmit={async (e) => {
      e.preventDefault();
      const r = await a.ausfuehren({ aktion: "anlegen", daten: { ...d, zonelevel: Number(d.zonelevel), netzbetreiber: d.netzbetreiber ? [d.netzbetreiber] : [] } }, "Gemeinschaft angelegt.");
      if (r?.gemeinschaft?.id) window.location.assign(`/portal/admin/eg/${r.gemeinschaft.id}`);
    }}>
      <div className="grid gap-3 sm:grid-cols-3">
        <Text id={`${id}-n`} label="Name" wert={d.name} setzen={s("name")} className="sm:col-span-3" required />
        <Auswahl id={`${id}-m`} label="Modell" wert={d.modell} setzen={(v) => setD({ ...d, modell: v, zonelevel: String(Object.entries(ZONELEVEL).find(([, z]) => z.modelle.includes(v))?.[0] || 1), rechtsform: EG_MODELLE[v].rechtsperson ? "verein" : "keine" })} optionen={Object.fromEntries(Object.entries(EG_MODELLE).map(([k, v]) => [k, v.label]))} />
        <Auswahl id={`${id}-z`} label="Nahebereich (Zonelevel)" wert={d.zonelevel} setzen={s("zonelevel")} optionen={zonen} />
        <Auswahl id={`${id}-nb`} label="Netzbetreiber" wert={d.netzbetreiber} setzen={s("netzbetreiber")} leer="– wählen –" optionen={Object.fromEntries(netzbetreiber.map((x) => [x.id, x.name]))} />
        <Auswahl id={`${id}-r`} label="Rechtsform" wert={d.rechtsform} setzen={s("rechtsform")} optionen={RECHTSFORMEN} />
        <Auswahl id={`${id}-v`} label="Verteilmodell" wert={d.verteilmodell} setzen={s("verteilmodell")} optionen={VERTEILMODELLE} />
      </div>
      <Meldung fehler={a.fehler} ok={a.ok} />
      <Knopf variante="primary" type="submit" disabled={a.laeuft}>Gemeinschaft anlegen</Knopf>
    </form>
  );
}

/** Migration aus dem Prototyp: erst Vorschau, dann Übernahme */
export function MigrationPrototyp() {
  const a = useAktion("/api/admin/eg");
  const [vorschau, setVorschau] = useState(null);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Knopf disabled={a.laeuft} onClick={async () => setVorschau(await a.ausfuehren({ aktion: "migration_vorschau" }, "Vorschau erstellt."))}>Vorschau der Übernahme</Knopf>
        {vorschau?.anzahl?.gemeinschaften > 0 && <Knopf variante="primary" disabled={a.laeuft} onClick={async () => { await a.ausfuehren({ aktion: "migration" }, "Übernommen – bitte Consent-IDs per EC_PODLIST abgleichen."); setVorschau(null); }}>{vorschau.anzahl.gemeinschaften} Gemeinschaft(en) übernehmen</Knopf>}
      </div>
      {vorschau && (
        <div className="rounded-2xl bg-sand-50 p-4 text-[14px] text-ink-700 ring-1 ring-ink-200/70">
          <p className="font-semibold text-ink-900">{vorschau.anzahl.gemeinschaften} Gemeinschaften · {vorschau.anzahl.mitglieder} Mitglieder · {vorschau.anzahl.zaehlpunkte} Zählpunkte · {vorschau.anzahl.teilnahmen} Teilnahmen</p>
          {vorschau.warnungen?.length > 0 && <ul className="mt-2 list-disc space-y-1 pl-5">{vorschau.warnungen.map((w, i) => <li key={i}>{w}</li>)}</ul>}
          {vorschau.uebersprungen?.length > 0 && <p className="mt-2 text-ink-500">Übersprungen: {vorschau.uebersprungen.map((u) => `${u.name} (${u.grund})`).join(" · ")}</p>}
        </div>
      )}
      <Meldung fehler={a.fehler} ok={a.ok} />
    </div>
  );
}

/** Stammdaten der Gemeinschaft (Recht „organe_statuten“) */
export function StammdatenFormular({ g, netzbetreiber = [], url, darf = true }) {
  const id = useId();
  const a = useAktion(url);
  const [d, setD] = useState(() => ({ ...g, zonelevel: String(g.zonelevel), sitzAdresse: { ...g.sitzAdresse }, dienstleistung: { ...g.dienstleistung } }));
  const s = (k) => (v) => setD({ ...d, [k]: v });
  const sa = (k) => (v) => setD({ ...d, sitzAdresse: { ...d.sitzAdresse, [k]: v } });
  const dl = (k) => (v) => setD({ ...d, dienstleistung: { ...d.dienstleistung, [k]: v } });
  const zonen = Object.fromEntries(Object.entries(ZONELEVEL).filter(([, z]) => z.modelle.includes(d.modell)).map(([k, z]) => [k, `${k} – ${z.label}`]));
  const nbOpt = Object.fromEntries(netzbetreiber.map((x) => [x.id, x.name]));
  return (
    <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); a.ausfuehren({ aktion: "speichern", daten: { ...d, zonelevel: Number(d.zonelevel) } }, "Stammdaten gespeichert."); }}>
      <fieldset disabled={!darf} className="grid gap-3 sm:grid-cols-4">
        <Text id={`${id}-n`} label="Name" wert={d.name} setzen={s("name")} className="sm:col-span-2" />
        <Text id={`${id}-k`} label="Kurzname" wert={d.kurzname} setzen={s("kurzname")} />
        <Auswahl id={`${id}-m`} label="Modell" wert={d.modell} setzen={s("modell")} optionen={Object.fromEntries(Object.entries(EG_MODELLE).map(([k, v]) => [k, v.kurz]))} />
        <Auswahl id={`${id}-z`} label="Zonelevel" wert={d.zonelevel} setzen={s("zonelevel")} optionen={zonen} className="sm:col-span-2" />
        <Text id={`${id}-nr`} label="Nahebereichs-Referenz (Trafo, UW, Anschlussobjekt)" wert={d.nahebereichRef} setzen={s("nahebereichRef")} className="sm:col-span-2" />
        <Auswahl id={`${id}-r`} label="Rechtsform" wert={d.rechtsform} setzen={s("rechtsform")} optionen={RECHTSFORMEN} />
        <Text id={`${id}-zvr`} label="ZVR-Zahl" wert={d.zvrZahl} setzen={s("zvrZahl")} />
        <Text id={`${id}-fn`} label="Firmenbuchnummer" wert={d.firmenbuchnummer} setzen={s("firmenbuchnummer")} />
        <Text id={`${id}-st`} label="Statuten-Version" wert={d.statutenVersion} setzen={s("statutenVersion")} />
        <Text id={`${id}-sa`} label="Sitz: Straße" wert={d.sitzAdresse.strasse} setzen={sa("strasse")} className="sm:col-span-2" />
        <Text id={`${id}-sp`} label="PLZ" wert={d.sitzAdresse.plz} setzen={sa("plz")} inputMode="numeric" />
        <Text id={`${id}-so`} label="Ort" wert={d.sitzAdresse.ort} setzen={sa("ort")} />
        <Text id={`${id}-e`} label="E-Mail" wert={d.email} setzen={s("email")} typ="email" className="sm:col-span-2" />
        <Text id={`${id}-t`} label="Telefon" wert={d.telefon} setzen={s("telefon")} className="sm:col-span-2" />
        <Feld id={`${id}-nb`} label="Netzbetreiber (BEG bzw. Zonelevel 5/7: mehrere, Strg/⌘ für Mehrfachauswahl)" className="sm:col-span-2">
          <select id={`${id}-nb`} multiple className={`${eingabe} h-28 py-2`} value={d.netzbetreiber} onChange={(e) => setD({ ...d, netzbetreiber: [...e.target.selectedOptions].map((o) => o.value) })}>
            {Object.entries(nbOpt).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Feld>
        <Text id={`${id}-mp`} label="Marktpartner-ID (ebUtilities)" wert={d.marktpartnerId} setzen={s("marktpartnerId")} />
        <Auswahl id={`${id}-eda`} label="EDA-Anbindung" wert={d.edaAnbindung} setzen={s("edaAnbindung")} optionen={EDA_ANBINDUNGEN} />
        <Text id={`${id}-gid`} label="Gemeinschafts-ID (33 Zeichen)" wert={d.gemeinschaftsId} setzen={s("gemeinschaftsId")} className="sm:col-span-2" spellCheck={false} />
        <Auswahl id={`${id}-vm`} label="Verteilmodell" wert={d.verteilmodell} setzen={s("verteilmodell")} optionen={VERTEILMODELLE} />
        <Auswahl id={`${id}-ar`} label="Abrechnungsrhythmus" wert={d.abrechnungsrhythmus} setzen={s("abrechnungsrhythmus")} optionen={ABRECHNUNGSRHYTHMEN} />
        <Auswahl id={`${id}-u`} label="Umsatzsteuer" wert={d.ustStatus} setzen={s("ustStatus")} optionen={UST_STATUS} className="sm:col-span-2" />
        <Text id={`${id}-uid`} label="UID" wert={d.uid} setzen={s("uid")} />
        <Text id={`${id}-fa`} label="Finanzamt" wert={d.finanzamt} setzen={s("finanzamt")} />
        <Text id={`${id}-ib`} label="IBAN" wert={d.iban} setzen={s("iban")} className="sm:col-span-2" />
        <Text id={`${id}-ci`} label="SEPA-Gläubiger-ID" wert={d.creditorId} setzen={s("creditorId")} className="sm:col-span-2" />
        <Feld id={`${id}-dla`} label="Dienstleistung ÖkoInvest" className="sm:col-span-2">
          <label className="flex h-11 items-center gap-2 text-[14px] text-ink-800"><input id={`${id}-dla`} type="checkbox" checked={!!d.dienstleistung.aktiv} onChange={(e) => dl("aktiv")(e.target.checked)} /> Dienstleistungs- und AV-Vertrag aktiv (Organisator)</label>
        </Feld>
        <Text id={`${id}-dls`} label="Dienstleistung seit" wert={d.dienstleistung.seit} setzen={dl("seit")} typ="date" />
        <Text id={`${id}-oa`} label="Organisator angezeigt am" wert={d.organisatorAngezeigtAm} setzen={s("organisatorAngezeigtAm")} typ="date" />
        <Feld id={`${id}-b`} label="Beschreibung" className="sm:col-span-4"><textarea id={`${id}-b`} rows={2} className={textbereich} value={d.beschreibung || ""} onChange={(e) => s("beschreibung")(e.target.value)} /></Feld>
      </fieldset>
      <Meldung fehler={a.fehler} ok={a.ok} />
      {darf && <Knopf variante="primary" type="submit" disabled={a.laeuft}>Stammdaten speichern</Knopf>}
    </form>
  );
}

/** Statuswechsel der Gemeinschaft (nur erlaubte Folgezustände) */
export function StatusWechsel({ g, url }) {
  const id = useId();
  const a = useAktion(url);
  const naechste = GEMEINSCHAFT_STATUS[g.status]?.naechste || [];
  const [nach, setNach] = useState(naechste[0] || "");
  const [grund, setGrund] = useState("");
  if (!naechste.length) return <p className="text-[14px] text-ink-500">Kein weiterer Statuswechsel vorgesehen.</p>;
  return (
    <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); a.ausfuehren({ aktion: "status", nach, grund }, "Status geändert."); }}>
      <Auswahl id={`${id}-n`} label="Neuer Status" wert={nach} setzen={setNach} optionen={Object.fromEntries(naechste.map((k) => [k, GEMEINSCHAFT_STATUS[k].label]))} className="min-w-[220px]" />
      <Text id={`${id}-g`} label="Beschluss / Grund (bei Auflösung Pflicht)" wert={grund} setzen={setGrund} className="min-w-[240px] flex-1" />
      <Knopf variante="navy" type="submit" disabled={a.laeuft}>Status setzen</Knopf>
      <div className="w-full"><Meldung fehler={a.fehler} ok={a.ok} /></div>
    </form>
  );
}

/** Organ eintragen (Konto per E-Mail oder nur Name) */
export function OrganNeu({ url }) {
  const id = useId();
  const a = useAktion(url);
  const [d, setD] = useState({ funktion: "obmann", name: "", email: "", von: new Date().toISOString().slice(0, 10), bis: "", zeichnungsberechtigt: false });
  const s = (k) => (v) => setD({ ...d, [k]: v });
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); a.ausfuehren({ aktion: "organ", daten: d }, "Funktion eingetragen."); }}>
      <div className="grid gap-3 sm:grid-cols-3">
        <Auswahl id={`${id}-f`} label="Funktion" wert={d.funktion} setzen={s("funktion")} optionen={ORGAN_FUNKTIONEN} />
        <Text id={`${id}-n`} label="Name" wert={d.name} setzen={s("name")} />
        <Text id={`${id}-e`} label="E-Mail (verknüpft vorhandenes Portalkonto)" wert={d.email} setzen={s("email")} typ="email" />
        <Text id={`${id}-v`} label="Funktionsperiode von" wert={d.von} setzen={s("von")} typ="date" />
        <Text id={`${id}-b`} label="bis (optional)" wert={d.bis} setzen={s("bis")} typ="date" />
        <Feld id={`${id}-z`} label="Zeichnung"><label className="flex h-11 items-center gap-2 text-[14px] text-ink-800"><input id={`${id}-z`} type="checkbox" checked={d.zeichnungsberechtigt} onChange={(e) => s("zeichnungsberechtigt")(e.target.checked)} /> zeichnungsberechtigt</label></Feld>
      </div>
      <Meldung fehler={a.fehler} ok={a.ok} />
      <Knopf variante="primary" type="submit" disabled={a.laeuft}>Funktion eintragen</Knopf>
    </form>
  );
}

export function OrganBeenden({ organ, url }) {
  const a = useAktion(url);
  if (organ.status === "beendet") return null;
  return (
    <span className="inline-flex flex-col gap-1">
      <Knopf variante="gefahr" disabled={a.laeuft} onClick={() => a.ausfuehren({ aktion: "organ_beenden", id: organ.id, bis: new Date().toISOString().slice(0, 10) }, "Funktion beendet.")}>Beenden</Knopf>
      {a.fehler && <span role="alert" className="text-[12.5px] text-danger-700">{a.fehler}</span>}
    </span>
  );
}

/** Anlage erfassen */
export function AnlageNeu({ url, mitglieder = [] }) {
  const id = useId();
  const a = useAktion(url);
  const [d, setD] = useState({ bezeichnung: "", art: "pv", kwp: "", engpassleistungKw: "", nutzungsmodell: "ueberschuss", foerderung: "keine", eigentuemerMitgliedId: "", haushalt: false, inbetriebnahme: "" });
  const s = (k) => (v) => setD({ ...d, [k]: v });
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); a.ausfuehren({ aktion: "anlage", daten: d }, "Anlage gespeichert."); }}>
      <div className="grid gap-3 sm:grid-cols-4">
        <Text id={`${id}-b`} label="Bezeichnung" wert={d.bezeichnung} setzen={s("bezeichnung")} className="sm:col-span-2" />
        <Auswahl id={`${id}-a`} label="Art" wert={d.art} setzen={s("art")} optionen={ANLAGE_ARTEN} />
        <Text id={`${id}-k`} label="kWp" wert={d.kwp} setzen={s("kwp")} inputMode="decimal" />
        <Text id={`${id}-e`} label="Engpassleistung kW" wert={d.engpassleistungKw} setzen={s("engpassleistungKw")} inputMode="decimal" />
        <Auswahl id={`${id}-n`} label="Nutzungsmodell" wert={d.nutzungsmodell} setzen={s("nutzungsmodell")} optionen={NUTZUNGSMODELLE} />
        <Auswahl id={`${id}-f`} label="Förderung" wert={d.foerderung} setzen={s("foerderung")} optionen={FOERDERUNGEN} />
        <Text id={`${id}-i`} label="Inbetriebnahme" wert={d.inbetriebnahme} setzen={s("inbetriebnahme")} typ="date" />
        <Auswahl id={`${id}-m`} label="Eigentümer (Mitglied)" wert={d.eigentuemerMitgliedId} setzen={s("eigentuemerMitgliedId")} leer="– Gemeinschaft / Dritte –" optionen={Object.fromEntries(mitglieder.map((m) => [m.id, `${m.mitgliedsnummer} · ${m.name}`]))} className="sm:col-span-2" />
        <Feld id={`${id}-h`} label="§ 69 ElWG" className="sm:col-span-2"><label className="flex h-11 items-center gap-2 text-[14px] text-ink-800"><input id={`${id}-h`} type="checkbox" checked={d.haushalt} onChange={(e) => s("haushalt")(e.target.checked)} /> Erzeuger ist Haushalt (Schwelle 30 kW)</label></Feld>
      </div>
      <Meldung fehler={a.fehler} ok={a.ok} />
      <Knopf variante="primary" type="submit" disabled={a.laeuft}>Anlage speichern</Knopf>
    </form>
  );
}

/** Tarif anlegen (Entwurf = Vorschlag; beschlossen/aktiv = Vorstand bzw. Backoffice) */
export function TarifNeu({ url, vorlage = null, darfBeschluss = true }) {
  const id = useId();
  const a = useAktion(url);
  const heute = new Date().toISOString().slice(0, 10);
  const [d, setD] = useState({ bezeichnung: vorlage ? `${vorlage.bezeichnung} (neu)` : "Preisblatt", gueltigAb: heute, bezugspreisCt: String(vorlage?.bezugspreisCt ?? ""), einspeisepreisCt: String(vorlage?.einspeisepreisCt ?? ""), grundgebuehrMonat: String(vorlage?.grundgebuehrMonat ?? "0"), zaehlpunktgebuehrMonat: String(vorlage?.zaehlpunktgebuehrMonat ?? "0"), mitgliedsbeitragJahr: String(vorlage?.mitgliedsbeitragJahr ?? "0"), status: darfBeschluss ? "aktiv" : "entwurf", beschluss: { art: "vorstand", datum: heute, referenz: "" }, zeitfenster: vorlage?.zeitfenster || [] });
  const s = (k) => (v) => setD({ ...d, [k]: v });
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); a.ausfuehren({ aktion: "tarif", daten: d }, d.status === "entwurf" ? "Tarif-Vorschlag gespeichert." : "Tarif gespeichert – der bisherige endet am Vortag."); }}>
      <div className="grid gap-3 sm:grid-cols-4">
        <Text id={`${id}-b`} label="Bezeichnung" wert={d.bezeichnung} setzen={s("bezeichnung")} className="sm:col-span-2" />
        <Text id={`${id}-g`} label="Gültig ab" wert={d.gueltigAb} setzen={s("gueltigAb")} typ="date" />
        <Auswahl id={`${id}-s`} label="Status" wert={d.status} setzen={s("status")} optionen={darfBeschluss ? { entwurf: TARIF_STATUS.entwurf, beschlossen: TARIF_STATUS.beschlossen, aktiv: TARIF_STATUS.aktiv } : { entwurf: "Vorschlag" }} />
        <Text id={`${id}-bp`} label="Bezugspreis netto (ct/kWh)" wert={d.bezugspreisCt} setzen={s("bezugspreisCt")} inputMode="decimal" />
        <Text id={`${id}-ep`} label="Einspeisepreis netto (ct/kWh)" wert={d.einspeisepreisCt} setzen={s("einspeisepreisCt")} inputMode="decimal" />
        <Text id={`${id}-gg`} label="Grundgebühr je Monat (€)" wert={d.grundgebuehrMonat} setzen={s("grundgebuehrMonat")} inputMode="decimal" />
        <Text id={`${id}-mb`} label="Mitgliedsbeitrag je Jahr (€)" wert={d.mitgliedsbeitragJahr} setzen={s("mitgliedsbeitragJahr")} inputMode="decimal" />
        <Auswahl id={`${id}-ba`} label="Beschluss durch" wert={d.beschluss.art} setzen={(v) => setD({ ...d, beschluss: { ...d.beschluss, art: v } })} optionen={TARIF_BESCHLUSS} />
        <Text id={`${id}-bd`} label="Beschluss vom" wert={d.beschluss.datum} setzen={(v) => setD({ ...d, beschluss: { ...d.beschluss, datum: v } })} typ="date" />
        <Text id={`${id}-br`} label="Beschluss-Referenz" wert={d.beschluss.referenz} setzen={(v) => setD({ ...d, beschluss: { ...d.beschluss, referenz: v } })} className="sm:col-span-2" />
      </div>
      {d.zeitfenster.length > 0 && <p className="text-[13px] text-ink-500">Zeitfenster aus der Vorlage werden übernommen: {d.zeitfenster.map((z) => `${z.label} ${z.von}–${z.bis}`).join(", ")}.</p>}
      <Meldung fehler={a.fehler} ok={a.ok} />
      <Knopf variante="primary" type="submit" disabled={a.laeuft}>Tarif speichern</Knopf>
    </form>
  );
}
