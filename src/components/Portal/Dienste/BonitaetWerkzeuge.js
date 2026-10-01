"use client";

// Bonitätsauskünfte im Backoffice (Leitung, Transaktion, Compliance): beauftragen (mit Information des Betroffenen),
// Ergebnis ansehen (Einsicht protokolliert), manuell freigeben, Pflicht vor LOI/Gebot einstellen.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck, Eye, Gauge, ShieldCheck } from "lucide-react";
import Button from "@/components/ui/Button";
import { Badge, Karte } from "@/components/Portal/ui";
import { ErfolgBox, FehlerBox, Feld, auswahlfeld, eingabe, textbereich } from "@/components/Portal/felder";
import { senden } from "@/lib/plattform/client";
import { datumZeit, eur } from "@/lib/plattform/format";
import { BONITAET_AMPEL } from "@/lib/plattform/dienste/bonitaet/basis";

const AMPEL_FARBE = { gruen: "bg-ov-500", gelb: "bg-sun-400", rot: "bg-danger-600", unbekannt: "bg-ink-300" };
const GELTUNG = { "": "Standard (Umgebung)", firmen: "Alle Investoren-Firmen", alle: "Alle Investoren", pilot: "Nur Pilot-Konten", aus: "Aus" };
const GRUND = { fehlt: "keine Auskunft", offen: "Auskunft offen", veraltet: "Auskunft veraltet", rot: "rote Ampel – Freigabe nötig", keine_daten: "keine Daten – Freigabe nötig" };

export function Ampel({ ampel }) {
  const a = BONITAET_AMPEL[ampel] || BONITAET_AMPEL.unbekannt;
  return (
    <Badge ton={a.ton}>
      <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${AMPEL_FARBE[ampel] || AMPEL_FARBE.unbekannt}`} />
      {a.label}
    </Badge>
  );
}

export default function BonitaetWerkzeuge({ daten }) {
  const router = useRouter();
  const [fehler, setFehler] = useState("");
  const [erfolg, setErfolg] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  const [form, setForm] = useState({ subjekt: "", land: "AT", registernummer: "", anlass: "loi", rechtsgrundlage: "berechtigtes_interesse", informieren: true, interesseId: "" });
  const [detail, setDetail] = useState(null);
  const [begruendung, setBegruendung] = useState("");
  const [e, setE] = useState(daten.einstellungen);
  const [pilot, setPilot] = useState("");
  const schreiben = daten.schreiben;

  const setze = (k) => (ev) => setForm((f) => ({ ...f, [k]: ev.target.type === "checkbox" ? ev.target.checked : ev.target.value }));

  async function beauftragen(ev) {
    ev.preventDefault();
    setFehler("");
    setErfolg("");
    const [art, id] = form.subjekt.split(":");
    if (!art || !id) return setFehler("Bitte wählen Sie Organisation oder Konto.");
    setLaeuft(true);
    try {
      const r = await senden("/api/admin/bonitaet", { body: { subjekt: { art, id }, land: form.land, registernummer: form.registernummer, anlass: form.anlass, rechtsgrundlage: form.rechtsgrundlage, informieren: form.informieren, interesseId: form.interesseId || null } });
      setErfolg(`Auskunft ${r.auskunft.id} liegt vor${r.auskunft.informiertAm ? " – Betroffene wurden informiert" : ""}.`);
      router.refresh();
    } catch (x) {
      setFehler(x.message);
    } finally {
      setLaeuft(false);
    }
  }

  async function oeffnen(id) {
    setFehler("");
    try {
      setDetail(await senden(`/api/admin/bonitaet/${id}`, { method: "GET" }));
      setBegruendung("");
    } catch (x) {
      setFehler(x.message);
    }
  }

  async function freigeben() {
    setFehler("");
    try {
      const r = await senden(`/api/admin/bonitaet/${detail.auskunft.id}`, { body: { begruendung } });
      setDetail((d) => ({ ...d, auskunft: r.auskunft }));
      router.refresh();
    } catch (x) {
      setFehler(x.message);
    }
  }

  async function einstellen(teil) {
    setFehler("");
    try {
      const r = await senden("/api/admin/bonitaet/einstellungen", { method: "PUT", body: teil });
      setE((alt) => ({ ...alt, ...r.einstellungen, pilotKonten: alt.pilotKonten }));
      setErfolg("Einstellungen gespeichert.");
      router.refresh();
    } catch (x) {
      setFehler(x.message);
    }
  }

  const a = detail?.auskunft;
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0 space-y-6">
        {daten.offen.length > 0 && (
          <Karte titel="Offene Voraussetzungen" untertitel="Investoren mit freigegebenem Datenraum – vor LOI bzw. Gebot fehlt eine gültige Auskunft">
            <ul className="divide-y divide-ink-100">
              {daten.offen.map((o) => (
                <li key={o.subjekt.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <span className="min-w-0">
                    <span className="font-semibold text-ink-900">{o.subjekt.name}</span>
                    <span className="block text-[12.5px] text-ink-500">{o.subjekt.art === "organisation" ? "Organisation" : "Konto"} · Interesse {o.interesseId} · {GRUND[o.grund] || o.grund}</span>
                  </span>
                  {schreiben && (
                    <Button type="button" size="sm" variant="secondary" icon={ClipboardCheck} onClick={() => setForm((f) => ({ ...f, subjekt: `${o.subjekt.art}:${o.subjekt.id}`, interesseId: o.interesseId, anlass: "loi" }))}>Übernehmen</Button>
                  )}
                </li>
              ))}
            </ul>
          </Karte>
        )}

        <Karte titel="Auskünfte" untertitel={`${daten.auskuenfte.length} Auskünfte · Ergebnisse nur für Leitung, Transaktion und Compliance`} innen="p-0">
          {daten.auskuenfte.length === 0 ? (
            <p className="px-5 py-10 text-center text-[14px] text-ink-500 md:px-6">Noch keine Auskünfte.</p>
          ) : (
            <ul className="divide-y divide-ink-100">
              {daten.auskuenfte.map((x) => (
                <li key={x.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 md:px-6">
                  <span className="min-w-0">
                    <span className="font-semibold text-ink-900">{x.subjekt?.name}</span>
                    <span className="block text-[12.5px] text-ink-500">{x.id} · {x.anbieterLabel} · {datumZeit(x.auskunftAm)} · {x.anlassLabel}{x.demo ? " · Demo" : ""}</span>
                  </span>
                  <span className="flex flex-wrap items-center gap-2">
                    <Ampel ampel={x.ampel} />
                    {!x.gueltig && <Badge ton="warn">{GRUND[x.gueltigGrund] || "nicht gültig"}</Badge>}
                    {x.freigabe && <Badge ton="info">manuell freigegeben</Badge>}
                    <Button type="button" size="sm" variant="ghost" icon={Eye} onClick={() => oeffnen(x.id)}>Details</Button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Karte>

        {a && (
          <Karte titel={`Auskunft ${a.id}`} untertitel={`${a.subjekt?.name} · ${a.anbieterLabel} · ${datumZeit(a.auskunftAm)}`} aktion={<Ampel ampel={a.ampel} />}>
            <dl className="grid gap-x-6 gap-y-3 text-[14px] sm:grid-cols-2">
              <div><dt className="text-[12.5px] text-ink-500">Score</dt><dd className="font-semibold text-ink-900">{a.score ?? "–"} <span className="font-normal text-ink-500">({a.skala})</span></dd></div>
              <div><dt className="text-[12.5px] text-ink-500">Kreditlimit (Empfehlung)</dt><dd className="font-semibold text-ink-900">{a.kreditlimit != null ? (a.waehrung === "EUR" ? eur(a.kreditlimit) : `${a.kreditlimit.toLocaleString("de-DE")} ${a.waehrung}`) : "–"}</dd></div>
              <div><dt className="text-[12.5px] text-ink-500">Ausfallwahrscheinlichkeit</dt><dd className="text-ink-900">{a.ausfallwahrscheinlichkeit != null ? `${(a.ausfallwahrscheinlichkeit * 100).toLocaleString("de-DE", { maximumFractionDigits: 2 })} %` : "–"}</dd></div>
              <div><dt className="text-[12.5px] text-ink-500">Zahlungsweise</dt><dd className="text-ink-900">{a.zahlungsweise || "–"}</dd></div>
              <div className="sm:col-span-2"><dt className="text-[12.5px] text-ink-500">Negativmerkmale</dt><dd className="text-ink-900">{a.negativmerkmale?.length ? a.negativmerkmale.join(" · ") : "keine"}</dd></div>
              <div className="sm:col-span-2"><dt className="text-[12.5px] text-ink-500">Rechtsgrundlage · Information</dt><dd className="text-ink-900">{daten.rechtsgrundlagen[a.rechtsgrundlage] || a.rechtsgrundlage} · {a.informiertAm ? `informiert am ${datumZeit(a.informiertAm)}` : "nicht informiert"}</dd></div>
              <div className="sm:col-span-2"><dt className="text-[12.5px] text-ink-500">Referenz · beauftragt von</dt><dd className="text-ink-900">{a.referenz || "–"} · {a.von || "–"}</dd></div>
            </dl>
            {a.freigabe && <p className="mt-4 rounded-2xl bg-navy-50 px-4 py-3 text-[13.5px] text-navy-800">Manuell freigegeben von {a.freigabe.von} am {datumZeit(a.freigabe.am)}: {a.freigabe.begruendung}</p>}
            {schreiben && !a.freigabe && ["rot", "unbekannt"].includes(a.ampel) && (
              <div className="mt-4 space-y-2">
                <Feld id="bo-begr" label="Trotzdem für LOI/Gebot freigeben – Begründung" hinweis="Z. B. Sicherheiten, Finanzierungsbestätigung einer Bank, Konzernbürgschaft. Wird protokolliert.">
                  <textarea id="bo-begr" rows={3} value={begruendung} onChange={(ev) => setBegruendung(ev.target.value)} className={textbereich} />
                </Feld>
                <Button type="button" size="sm" variant="navy" icon={ShieldCheck} onClick={freigeben} disabled={begruendung.trim().length < 10}>Freigeben</Button>
              </div>
            )}
            {(detail.zugriffe || []).length > 0 && (
              <details className="mt-4 text-[12.5px] text-ink-600">
                <summary className="cursor-pointer font-semibold text-ink-800">Zugriffsprotokoll ({detail.zugriffe.length})</summary>
                <ul className="mt-2 space-y-1">{detail.zugriffe.map((z, i) => <li key={i}>{datumZeit(z.am)} · {z.nutzer} · {z.text}</li>)}</ul>
              </details>
            )}
          </Karte>
        )}
        <FehlerBox>{fehler}</FehlerBox>
        <ErfolgBox>{erfolg}</ErfolgBox>
      </div>

      <div className="min-w-0 space-y-6">
        {schreiben && (
          <Karte titel="Auskunft einholen" untertitel={`Anbieter: ${daten.konfig.label}${daten.konfig.demo ? " (Simulation)" : ""}`}>
            <form onSubmit={beauftragen} className="space-y-4">
              <Feld id="bo-subjekt" label="Unternehmen bzw. Konto" pflicht>
                <select id="bo-subjekt" value={form.subjekt} onChange={setze("subjekt")} className={auswahlfeld} required>
                  <option value="">Bitte wählen</option>
                  {daten.kandidaten.map((k) => <option key={`${k.art}:${k.id}`} value={`${k.art}:${k.id}`}>{k.art === "organisation" ? "Organisation" : "Konto"}: {k.name}</option>)}
                </select>
              </Feld>
              <div className="grid grid-cols-2 gap-3">
                <Feld id="bo-land" label="Land">
                  <select id="bo-land" value={form.land} onChange={setze("land")} className={auswahlfeld}><option value="AT">Österreich</option><option value="DE">Deutschland</option><option value="CH">Schweiz</option></select>
                </Feld>
                <Feld id="bo-reg" label="Registernummer">
                  <input id="bo-reg" value={form.registernummer} onChange={setze("registernummer")} placeholder="FN / HRB / CHE" className={eingabe} />
                </Feld>
              </div>
              <Feld id="bo-anlass" label="Anlass">
                <select id="bo-anlass" value={form.anlass} onChange={setze("anlass")} className={auswahlfeld}>{Object.entries(daten.anlaesse).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
              </Feld>
              <Feld id="bo-rg" label="Rechtsgrundlage">
                <select id="bo-rg" value={form.rechtsgrundlage} onChange={setze("rechtsgrundlage")} className={auswahlfeld}>{Object.entries(daten.rechtsgrundlagen).map(([k, l]) => <option key={k} value={k}>{l.split(" – ")[0]}</option>)}</select>
              </Feld>
              <label className="flex items-start gap-2.5 text-[13.5px] text-ink-700">
                <input type="checkbox" checked={form.informieren} onChange={setze("informieren")} className="mt-1 h-4 w-4 accent-ov-600" />
                Betroffene informieren (Art. 13/14 DSGVO – Glocke und E-Mail, ohne Ergebnis)
              </label>
              <Button type="submit" size="sm" icon={Gauge} disabled={laeuft}>{laeuft ? "Wird abgefragt …" : "Auskunft einholen"}</Button>
            </form>
          </Karte>
        )}

        <Karte titel="Pflicht vor LOI und Gebot" untertitel={`Wirksam: ${GELTUNG[e.geltungWirksam] || e.geltungWirksam} · gültig ${e.gueltigTage} Tage`}>
          <div className="space-y-4">
            <Feld id="bo-geltung" label="Geltung">
              <select id="bo-geltung" value={e.geltung || ""} onChange={(ev) => einstellen({ geltung: ev.target.value || null })} disabled={!schreiben} className={auswahlfeld}>
                {Object.entries(GELTUNG).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </Feld>
            <Feld id="bo-tage" label="Auskunft gilt (Tage)">
              <input id="bo-tage" type="number" min={7} max={730} defaultValue={e.gueltigTage} onBlur={(ev) => Number(ev.target.value) !== e.gueltigTage && einstellen({ gueltigTage: Number(ev.target.value) })} disabled={!schreiben} className={eingabe} />
            </Feld>
            <label className="flex items-start gap-2.5 text-[13.5px] text-ink-700">
              <input type="checkbox" checked={!!e.rotSperrt} onChange={(ev) => einstellen({ rotSperrt: ev.target.checked })} disabled={!schreiben} className="mt-1 h-4 w-4 accent-ov-600" />
              Rote Ampel sperrt LOI/Gebot bis zur manuellen Freigabe
            </label>
            {e.geltungWirksam === "pilot" && (
              <div className="space-y-2">
                <p className="text-[13px] text-ink-600">Pilot-Konten: {(e.pilotKonten || []).map((p) => p.name).join(", ") || "keine"}</p>
                {schreiben && (
                  <div className="flex gap-2">
                    <label htmlFor="bo-pilot" className="sr-only">Konto-Kennung</label>
                    <input id="bo-pilot" value={pilot} onChange={(ev) => setPilot(ev.target.value.trim())} placeholder="U-26-…" className={eingabe} />
                    <Button type="button" size="sm" variant="secondary" className="h-12 shrink-0" onClick={() => einstellen({ pilotKonto: { id: pilot, an: true } })} disabled={!pilot}>Hinzufügen</Button>
                  </div>
                )}
              </div>
            )}
            <p className="text-[12px] leading-snug text-ink-500">Die Ampel ist ein Hinweis – über die Zulassung zum LOI entscheidet ein Mensch (keine automatisierte Einzelentscheidung, Art. 22 DSGVO).</p>
          </div>
        </Karte>
      </div>
    </div>
  );
}
