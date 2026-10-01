"use client";

// Anfrage eines Gründungsauftrags (WP5): Paketwahl, Eckdaten der künftigen bzw. bestehenden Gemeinschaft, Kontakt.
// Prüfungen laufen serverseitig (eg/gruendung.js auftragBereinigen); hier nur Eingabe und Hinweise zur Wahl.

import { useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Chip, Feld, auswahlfeld, eingabe, textbereich } from "@/components/Portal/felder";
import { Knopf, Meldung } from "@/components/Portal/Mitglied/teile";
import { senden } from "@/lib/plattform/client";
import { EG_MODELLE, RECHTSFORMEN, ZONELEVEL } from "@/lib/plattform/eg/modell";
import { ALTDIENSTLEISTER, BUNDESLAENDER_GR, GR_PAKETE, ZONELEVEL_STANDARD } from "@/lib/plattform/eg/gruendung";

export default function GrAnfrage({ netzbetreiber = [], basis = "/portal/eg/gruendung", admin = false, startPaket = "" }) {
  const id = useId();
  const router = useRouter();
  const [d, setD] = useState({
    paket: GR_PAKETE[startPaket] ? startPaket : "gruendung", arbeitsname: "", modell: "eeg", zonelevel: 3, rechtsform: "verein", plz: "", ort: "", bundesland: "", netzbetreiberId: "",
    erwarteteMitglieder: "", erzeugungKwp: "", speicherKwh: "", haushaltErzeugung: false, gemeindeBeteiligt: false, investitionGeplant: false, nachricht: "",
    ansprechpartner: { name: "", email: "", telefon: "" }, bestehend: { name: "", altdienstleister: "eegfaktura", marktpartnerId: "", gemeinschaftsId: "", mitglieder: "", zaehlpunkte: "", letzteAbrechnung: "", verteilmodell: "dynamisch" },
    einwilligung: false, auftraggeberEmail: "",
  });
  const [laeuft, setLaeuft] = useState(false);
  const [fehler, setFehler] = useState("");
  const s = (k) => (e) => setD({ ...d, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const sb = (k) => (e) => setD({ ...d, bestehend: { ...d.bestehend, [k]: e.target.value } });
  const sa = (k) => (e) => setD({ ...d, ansprechpartner: { ...d.ansprechpartner, [k]: e.target.value } });
  const zonen = useMemo(() => Object.entries(ZONELEVEL).filter(([, z]) => z.modelle.includes(d.modell)), [d.modell]);
  const rechtsperson = EG_MODELLE[d.modell]?.rechtsperson;
  const wechsel = d.paket === "wechsel";

  async function absenden(e) {
    e.preventDefault();
    setLaeuft(true);
    setFehler("");
    try {
      const r = await senden("/api/portal/eg/gruendung", { body: { daten: { ...d, zonelevel: Number(d.zonelevel) } } });
      router.push(`${basis}/${r.auftrag.id}`);
    } catch (err) {
      setFehler(err.message);
      setLaeuft(false);
    }
  }

  return (
    <form onSubmit={absenden} className="space-y-6">
      <fieldset>
        <legend className="text-[14px] font-semibold text-ink-900">Was dürfen wir für Sie tun?</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {Object.entries(GR_PAKETE).map(([k, p]) => (
            <label key={k} className={`cursor-pointer rounded-2xl p-4 ring-1 ring-inset transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ov-500 ${d.paket === k ? "bg-ov-50 ring-ov-500" : "bg-white ring-ink-200 hover:ring-ink-300"}`}>
              <input type="radio" name={`${id}-paket`} value={k} checked={d.paket === k} onChange={s("paket")} className="sr-only" />
              <span className="block font-display text-[15.5px] font-bold text-ink-900">{p.label}</span>
              <span className="mt-1 block text-[13.5px] leading-relaxed text-ink-600">{p.text}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Feld id={`${id}-name`} label={wechsel ? "Name der Gemeinschaft" : "Arbeitsname der Gemeinschaft"} pflicht className="sm:col-span-2">
          <input id={`${id}-name`} className={eingabe} value={d.arbeitsname} onChange={s("arbeitsname")} required minLength={3} placeholder="z. B. Sonnenstrom Musterdorf" />
        </Feld>
        <Feld id={`${id}-modell`} label="Modell">
          <select id={`${id}-modell`} className={auswahlfeld} value={d.modell} onChange={(e) => { const m = e.target.value; setD({ ...d, modell: m, zonelevel: ZONELEVEL_STANDARD[m], rechtsform: EG_MODELLE[m].rechtsperson ? (d.rechtsform === "keine" ? "verein" : d.rechtsform) : "keine" }); }}>
            {Object.entries(EG_MODELLE).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
          </select>
        </Feld>
        <Feld id={`${id}-zl`} label="Nahebereich (Zonelevel)" hinweis="Klärt die Netzbetreiber-Auskunft (§ 70 Abs. 6 ElWG).">
          <select id={`${id}-zl`} className={auswahlfeld} value={d.zonelevel} onChange={s("zonelevel")}>
            {zonen.map(([k, z]) => <option key={k} value={k}>{k} – {z.label}{z.phase > 1 ? " (ab 04/2027)" : ""}</option>)}
          </select>
        </Feld>
        <Feld id={`${id}-rf`} label="Rechtsform (Wunsch)" hinweis={rechtsperson ? "Empfehlung folgt im Machbarkeits-Check." : "Keine eigene Rechtsperson nötig."}>
          <select id={`${id}-rf`} className={auswahlfeld} value={d.rechtsform} onChange={s("rechtsform")} disabled={!rechtsperson}>
            {Object.entries(RECHTSFORMEN).filter(([k]) => (rechtsperson ? k !== "keine" : k === "keine")).map(([k, r]) => <option key={k} value={k}>{r.label}</option>)}
          </select>
        </Feld>
        <Feld id={`${id}-plz`} label="PLZ" pflicht>
          <input id={`${id}-plz`} className={eingabe} inputMode="numeric" maxLength={4} value={d.plz} onChange={s("plz")} required />
        </Feld>
        <Feld id={`${id}-ort`} label="Ort">
          <input id={`${id}-ort`} className={eingabe} value={d.ort} onChange={s("ort")} />
        </Feld>
        <Feld id={`${id}-bl`} label="Bundesland">
          <select id={`${id}-bl`} className={auswahlfeld} value={d.bundesland} onChange={s("bundesland")}>
            <option value="">– wählen –</option>
            {Object.entries(BUNDESLAENDER_GR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Feld>
        <Feld id={`${id}-nb`} label="Netzbetreiber" hinweis="Steht auf der Netzrechnung; sonst ermitteln wir ihn.">
          <select id={`${id}-nb`} className={auswahlfeld} value={d.netzbetreiberId} onChange={s("netzbetreiberId")}>
            <option value="">unbekannt</option>
            {netzbetreiber.map((nb) => <option key={nb.id} value={nb.id}>{nb.name}</option>)}
          </select>
        </Feld>
        <Feld id={`${id}-mg`} label="Erwartete Mitglieder">
          <input id={`${id}-mg`} className={eingabe} inputMode="numeric" value={d.erwarteteMitglieder} onChange={s("erwarteteMitglieder")} />
        </Feld>
        <Feld id={`${id}-kw`} label="Erzeugungsleistung (kWp)" hinweis="Über 100 kW gelten Lieferantenpflichten (§ 69 ElWG).">
          <input id={`${id}-kw`} className={eingabe} inputMode="decimal" value={d.erzeugungKwp} onChange={s("erzeugungKwp")} />
        </Feld>
        <Feld id={`${id}-sp`} label="Speicher (kWh, geplant)">
          <input id={`${id}-sp`} className={eingabe} inputMode="decimal" value={d.speicherKwh} onChange={s("speicherKwh")} />
        </Feld>
      </div>
      <div className="flex flex-wrap gap-2">
        <Chip checked={d.gemeindeBeteiligt} onChange={s("gemeindeBeteiligt")}>Gemeinde beteiligt</Chip>
        <Chip checked={d.investitionGeplant} onChange={s("investitionGeplant")}>Eigene Anlagen der Gemeinschaft geplant</Chip>
        <Chip checked={d.haushaltErzeugung} onChange={s("haushaltErzeugung")}>Erzeugung überwiegend von Haushalten</Chip>
      </div>

      {wechsel && (
        <fieldset className="rounded-2xl bg-sand-50 p-4 ring-1 ring-inset ring-ink-200/70">
          <legend className="px-1 text-[14px] font-semibold text-ink-900">Bestehende Gemeinschaft</legend>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Feld id={`${id}-bn`} label="Name laut Vereinsregister bzw. Firmenbuch" className="sm:col-span-2"><input id={`${id}-bn`} className={eingabe} value={d.bestehend.name} onChange={sb("name")} /></Feld>
            <Feld id={`${id}-alt`} label="Bisheriger Dienstleister"><select id={`${id}-alt`} className={auswahlfeld} value={d.bestehend.altdienstleister} onChange={sb("altdienstleister")}>{Object.entries(ALTDIENSTLEISTER).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Feld>
            <Feld id={`${id}-vm`} label="Verteilmodell"><select id={`${id}-vm`} className={auswahlfeld} value={d.bestehend.verteilmodell} onChange={sb("verteilmodell")}><option value="dynamisch">dynamisch</option><option value="statisch">statisch</option></select></Feld>
            <Feld id={`${id}-mp`} label="Marktpartner-ID" hinweis="z. B. RC100015"><input id={`${id}-mp`} className={eingabe} value={d.bestehend.marktpartnerId} onChange={sb("marktpartnerId")} /></Feld>
            <Feld id={`${id}-gid`} label="Gemeinschafts-ID (33 Zeichen)" className="sm:col-span-2"><input id={`${id}-gid`} className={eingabe} value={d.bestehend.gemeinschaftsId} onChange={sb("gemeinschaftsId")} /></Feld>
            <Feld id={`${id}-la`} label="Letzter abgerechneter Monat"><input id={`${id}-la`} type="month" className={eingabe} value={d.bestehend.letzteAbrechnung} onChange={sb("letzteAbrechnung")} /></Feld>
            <Feld id={`${id}-bm`} label="Mitglieder"><input id={`${id}-bm`} className={eingabe} inputMode="numeric" value={d.bestehend.mitglieder} onChange={sb("mitglieder")} /></Feld>
            <Feld id={`${id}-bz`} label="Zählpunkte"><input id={`${id}-bz`} className={eingabe} inputMode="numeric" value={d.bestehend.zaehlpunkte} onChange={sb("zaehlpunkte")} /></Feld>
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-ink-600">Beim Wechsel bleiben alle Zählpunkte angemeldet – keine erneute Zustimmung der Mitglieder im Netzbetreiber-Portal (Fachkonzept 2.6).</p>
        </fieldset>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Feld id={`${id}-an`} label="Ansprechperson"><input id={`${id}-an`} className={eingabe} value={d.ansprechpartner.name} onChange={sa("name")} /></Feld>
        <Feld id={`${id}-ae`} label="E-Mail"><input id={`${id}-ae`} type="email" className={eingabe} value={d.ansprechpartner.email} onChange={sa("email")} /></Feld>
        <Feld id={`${id}-at`} label="Telefon"><input id={`${id}-at`} className={eingabe} value={d.ansprechpartner.telefon} onChange={sa("telefon")} /></Feld>
        <Feld id={`${id}-na`} label="Nachricht" className="sm:col-span-3"><textarea id={`${id}-na`} rows={3} className={textbereich} value={d.nachricht} onChange={s("nachricht")} placeholder="Wer macht mit, welche Anlagen gibt es, was ist Ihr Zeitplan?" /></Feld>
        {admin && <Feld id={`${id}-ag`} label="Für Auftraggeber (E-Mail eines Portalkontos)" className="sm:col-span-3" hinweis="Leer lassen, um den Auftrag selbst anzulegen."><input id={`${id}-ag`} type="email" className={eingabe} value={d.auftraggeberEmail} onChange={s("auftraggeberEmail")} /></Feld>}
      </div>
      <label className="flex items-start gap-3 text-[14px] leading-relaxed text-ink-700">
        <input type="checkbox" className="mt-1 h-4 w-4 accent-ov-600" checked={d.einwilligung} onChange={s("einwilligung")} required={!admin} />
        <span>Ich bin einverstanden, dass ÖkoInvest meine Angaben zur Erstellung eines Angebots verarbeitet (Art. 6 Abs. 1 lit. b DSGVO). Das Angebot ist unverbindlich.</span>
      </label>
      <Meldung fehler={fehler} />
      <Knopf variante="primary" type="submit" disabled={laeuft} className="h-11 px-5">{laeuft ? "Wird gesendet …" : "Anfrage senden"}</Knopf>
    </form>
  );
}
