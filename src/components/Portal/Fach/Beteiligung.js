"use client";

// Mitglieder: Interesse an der Genossenschaft (im Aufbau – unverbindliche Vormerkung mit Hinweisen nach GenG/OR)
// und Teilnahme an einer Energiegemeinschaft DE/AT/CH mit den richtigen Stammdaten. Prüfung serverseitig.

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { Chip, ErfolgBox, Feld, FehlerBox, auswahlfeld, eingabe, textbereich } from "@/components/Portal/felder";
import { senden } from "@/lib/plattform/client";
import { LAENDER } from "@/lib/plattform/konstanten";
import { ANTEIL_BEISPIEL_EUR, GENO_HINWEISE, MITGLIED_ARTEN, MITGLIED_INTERESSEN } from "@/lib/plattform/fach/mitglied";
import { EG_FORMEN, EG_ROLLEN, maloPruefen, zaehlpunktPruefen } from "@/lib/plattform/fach/energie";
import { PruefHinweise } from "./DatenblattFormular";

function Pruefung({ r }) {
  if (!r) return null;
  const Icon = r.ok ? CheckCircle2 : XCircle;
  return <p className={cn("mt-1.5 flex items-center gap-1.5 text-[12.5px] font-medium", r.ok ? "text-ov-700" : "text-red-700")}><Icon aria-hidden="true" className="h-4 w-4" />{r.ok ? "gültig" : r.fehler}</p>;
}

export function GenoFormular({ geno }) {
  const id = useId();
  const router = useRouter();
  const [g, setG] = useState({
    land: geno?.land || "DE",
    anteile: String(geno?.anteile || "4"),
    art: geno?.art || "privat",
    interessen: geno?.interessen || ["beteiligung"],
    bestaetigt: geno?.bestaetigt || {},
    bemerkung: geno?.bemerkung || "",
  });
  const [fehler, setFehler] = useState("");
  const [ok, setOk] = useState(geno ? `Vorgemerkt am ${new Date(geno.geaendertAm || geno.erstelltAm).toLocaleDateString("de-DE")}.` : "");
  const setze = (k, v) => setG((x) => ({ ...x, [k]: v }));
  const hinweise = GENO_HINWEISE[g.land];
  const anteile = Math.max(0, Math.round(Number(g.anteile) || 0));

  async function speichern(e) {
    e.preventDefault();
    setFehler("");
    try {
      await senden("/api/portal/fach/mitglied", { method: "PUT", body: { art: "geno", daten: { ...g, anteile } } });
      setOk("Ihr Interesse ist vorgemerkt. Sobald die Genossenschaft eingetragen ist und Anteile gezeichnet werden können, erhalten Sie Satzung und Beitrittserklärung.");
      router.refresh();
    } catch (err) {
      setFehler(err.message);
    }
  }

  return (
    <form onSubmit={speichern} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Feld id={`${id}-la`} label="Wohnsitz bzw. Sitz" pflicht>
          <select id={`${id}-la`} className={auswahlfeld} value={g.land} onChange={(e) => setze("land", e.target.value)}>
            {Object.entries(LAENDER).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Feld>
        <Feld id={`${id}-art`} label="Beitritt als" pflicht>
          <select id={`${id}-art`} className={auswahlfeld} value={g.art} onChange={(e) => setze("art", e.target.value)}>
            {Object.entries(MITGLIED_ARTEN).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Feld>
        <Feld id={`${id}-an`} label="Geplante Anteile" pflicht hinweis={`Beispielrechnung: ${anteile} × ${ANTEIL_BEISPIEL_EUR} € = ${(anteile * ANTEIL_BEISPIEL_EUR).toLocaleString("de-DE")} € – Höhe des Anteils legt erst die Satzung fest.`}>
          <input id={`${id}-an`} inputMode="numeric" required className={eingabe} value={g.anteile} onChange={(e) => setze("anteile", e.target.value)} />
        </Feld>
      </div>
      <fieldset>
        <legend className="mb-2 text-[13.5px] font-semibold text-ink-700">Was interessiert Sie? *</legend>
        <div className="flex flex-wrap gap-2">
          {Object.entries(MITGLIED_INTERESSEN).map(([k, v]) => (
            <Chip key={k} value={k} checked={g.interessen.includes(k)} onChange={() => setze("interessen", g.interessen.includes(k) ? g.interessen.filter((x) => x !== k) : [...g.interessen, k])}>{v}</Chip>
          ))}
        </div>
      </fieldset>
      <fieldset className="space-y-2">
        <legend className="mb-1 text-[13.5px] font-semibold text-ink-700">Bitte lesen und bestätigen *</legend>
        {hinweise.map((h) => (
          <label key={h.id} className="flex items-start gap-3 rounded-2xl bg-white p-3.5 text-[13.5px] leading-relaxed text-ink-700 ring-1 ring-inset ring-ink-200/70">
            <input type="checkbox" checked={g.bestaetigt[h.id] === true} onChange={(e) => setze("bestaetigt", { ...g.bestaetigt, [h.id]: e.target.checked })} className="mt-1 h-4 w-4 shrink-0 accent-[#558227]" />
            <span><span className="font-semibold text-ink-900">{h.titel}.</span> {h.text}</span>
          </label>
        ))}
      </fieldset>
      <Feld id={`${id}-bm`} label="Anmerkung (optional)">
        <textarea id={`${id}-bm`} rows={2} maxLength={500} className={textbereich} value={g.bemerkung} onChange={(e) => setze("bemerkung", e.target.value)} />
      </Feld>
      <FehlerBox>{fehler}</FehlerBox>
      <ErfolgBox>{ok}</ErfolgBox>
      <Button type="submit">{geno ? "Vormerkung aktualisieren" : "Unverbindlich vormerken"}</Button>
    </form>
  );
}

export function EgFormular({ eg }) {
  const id = useId();
  const router = useRouter();
  const [t, setT] = useState({
    land: eg?.land || "AT",
    form: eg?.form || "",
    rolle: eg?.rolle || "bezug",
    maloId: eg?.maloId || "",
    zaehlpunkt: eg?.zaehlpunkt || "",
    zaehlpunktEinspeisung: eg?.zaehlpunktEinspeisung || "",
    netzbetreiber: eg?.netzbetreiber || "",
    plz: eg?.plz || "",
    ort: eg?.ort || "",
    jahresverbrauchKwh: eg?.jahresverbrauchKwh ?? "",
    anlageKwp: eg?.anlageKwp ?? "",
    smartMeter: eg?.smartMeter === true ? "ja" : eg?.smartMeter === false ? "nein" : "",
    datenfreigabe: eg?.datenfreigabe === true ? "ja" : eg?.datenfreigabe === false ? "nein" : "",
  });
  const [fehler, setFehler] = useState("");
  const [ok, setOk] = useState("");
  const setze = (k, v) => setT((x) => ({ ...x, [k]: v, ...(k === "land" ? { form: "" } : {}) }));
  const idPruef = t.land === "DE" ? (t.maloId ? maloPruefen(t.maloId) : null) : t.zaehlpunkt ? zaehlpunktPruefen(t.zaehlpunkt, t.land) : null;
  const einPruef = t.land !== "DE" && t.rolle !== "bezug" && t.zaehlpunktEinspeisung ? zaehlpunktPruefen(t.zaehlpunktEinspeisung, t.land) : null;

  async function speichern(e) {
    e.preventDefault();
    setFehler("");
    try {
      await senden("/api/portal/fach/mitglied", { method: "PUT", body: { art: "eg", daten: t } });
      setOk("Gespeichert – wir prüfen, welche Gemeinschaft in Ihrem Netzgebiet in Frage kommt.");
      router.refresh();
    } catch (err) {
      setFehler(err.message);
    }
  }

  return (
    <form onSubmit={speichern} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Feld id={`${id}-la`} label="Land" pflicht>
          <select id={`${id}-la`} className={auswahlfeld} value={t.land} onChange={(e) => setze("land", e.target.value)}>
            {Object.entries(LAENDER).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Feld>
        <Feld id={`${id}-fo`} label="Form" pflicht className="sm:col-span-2">
          <select id={`${id}-fo`} required className={auswahlfeld} value={t.form} onChange={(e) => setze("form", e.target.value)}>
            <option value="">– bitte wählen –</option>
            {Object.entries(EG_FORMEN[t.land]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Feld>
        <Feld id={`${id}-ro`} label="Teilnahme als" pflicht>
          <select id={`${id}-ro`} className={auswahlfeld} value={t.rolle} onChange={(e) => setze("rolle", e.target.value)}>
            {Object.entries(EG_ROLLEN).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Feld>
        {t.land === "DE" ? (
          <Feld id={`${id}-malo`} label="Marktlokations-ID (MaLo)" pflicht className="sm:col-span-2" hinweis={!idPruef ? "11 Ziffern, auf Ihrer Stromrechnung" : undefined}>
            <input id={`${id}-malo`} required inputMode="numeric" className={eingabe} value={t.maloId} onChange={(e) => setze("maloId", e.target.value)} />
            <Pruefung r={idPruef} />
          </Feld>
        ) : (
          <Feld id={`${id}-zp`} label={t.land === "AT" ? "Zählpunktnummer (Bezug)" : "Messpunktbezeichnung"} pflicht className="sm:col-span-2" hinweis={!idPruef ? `33 Zeichen, beginnt mit ${t.land}` : undefined}>
            <input id={`${id}-zp`} required className={eingabe} value={t.zaehlpunkt} onChange={(e) => setze("zaehlpunkt", e.target.value)} />
            <Pruefung r={idPruef} />
          </Feld>
        )}
        {t.land !== "DE" && t.rolle !== "bezug" && (
          <Feld id={`${id}-zpe`} label="Zählpunktnummer Einspeisung" className="sm:col-span-3" hinweis={!einPruef ? "Überschusseinspeisung hat in der Regel einen eigenen Zählpunkt" : undefined}>
            <input id={`${id}-zpe`} className={eingabe} value={t.zaehlpunktEinspeisung} onChange={(e) => setze("zaehlpunktEinspeisung", e.target.value)} />
            <Pruefung r={einPruef} />
          </Feld>
        )}
        <Feld id={`${id}-nb`} label="Netzbetreiber" pflicht>
          <input id={`${id}-nb`} required className={eingabe} value={t.netzbetreiber} onChange={(e) => setze("netzbetreiber", e.target.value)} />
        </Feld>
        <Feld id={`${id}-plz`} label="Postleitzahl" pflicht>
          <input id={`${id}-plz`} required className={eingabe} value={t.plz} onChange={(e) => setze("plz", e.target.value)} />
        </Feld>
        <Feld id={`${id}-ort`} label="Ort">
          <input id={`${id}-ort`} className={eingabe} value={t.ort} onChange={(e) => setze("ort", e.target.value)} />
        </Feld>
        <Feld id={`${id}-jv`} label="Jahresverbrauch (kWh)">
          <input id={`${id}-jv`} inputMode="decimal" className={eingabe} value={t.jahresverbrauchKwh} onChange={(e) => setze("jahresverbrauchKwh", e.target.value)} />
        </Feld>
        {t.rolle !== "bezug" && (
          <Feld id={`${id}-kwp`} label="Eigene Anlage (kWp)">
            <input id={`${id}-kwp`} inputMode="decimal" className={eingabe} value={t.anlageKwp} onChange={(e) => setze("anlageKwp", e.target.value)} />
          </Feld>
        )}
        <Feld id={`${id}-sm`} label={t.land === "DE" ? "Intelligentes Messsystem vorhanden" : "Smart Meter (Viertelstundenwerte)"}>
          <select id={`${id}-sm`} className={auswahlfeld} value={t.smartMeter} onChange={(e) => setze("smartMeter", e.target.value)}>
            <option value="">Nicht bekannt</option>
            <option value="ja">Ja</option>
            <option value="nein">Nein</option>
          </select>
        </Feld>
        {t.land === "AT" && (
          <Feld id={`${id}-df`} label="Datenfreigabe im Netzbetreiber-Portal">
            <select id={`${id}-df`} className={auswahlfeld} value={t.datenfreigabe} onChange={(e) => setze("datenfreigabe", e.target.value)}>
              <option value="">Noch nicht</option>
              <option value="ja">Erteilt</option>
            </select>
          </Feld>
        )}
      </div>
      {eg?.hinweise?.length > 0 && <PruefHinweise hinweise={eg.hinweise} />}
      <FehlerBox>{fehler}</FehlerBox>
      <ErfolgBox>{ok}</ErfolgBox>
      <Button type="submit">Teilnahmedaten speichern</Button>
    </form>
  );
}
