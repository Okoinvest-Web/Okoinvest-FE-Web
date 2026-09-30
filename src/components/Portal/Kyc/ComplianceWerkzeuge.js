"use client";

// Compliance-Werkzeuge im Backoffice: Freigabe-Sperren je Schritt (Gating), Geltung, Vier-Augen, Einzelabgleich
// gegen die Sanktionsliste, Fristen-Lauf (Ausweis-Ablauf, Wiederholungsprüfung, Löschfristen).

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Search } from "lucide-react";
import Button from "@/components/ui/Button";
import { Karte } from "@/components/Portal/ui";
import { Chip, ErfolgBox, FehlerBox, Feld, eingabe, auswahlfeld } from "@/components/Portal/felder";
import { senden } from "@/lib/plattform/client";

const GELTUNG = { "": "Standard (Umgebung)", alle: "Alle Konten", pilot: "Nur Pilot-Konten", aus: "Aus (nur Hinweise)" };

export default function ComplianceWerkzeuge({ einstellungen }) {
  const router = useRouter();
  const [e, setE] = useState(einstellungen);
  const [fehler, setFehler] = useState("");
  const [erfolg, setErfolg] = useState("");
  const [name, setName] = useState("");
  const [geb, setGeb] = useState("");
  const [art, setArt] = useState("person");
  const [treffer, setTreffer] = useState(null);
  const [lauf, setLauf] = useState(null);

  async function speichern(teil) {
    setFehler("");
    setErfolg("");
    try {
      const r = await senden("/api/admin/compliance/einstellungen", { method: "PUT", body: teil });
      setE((alt) => ({ ...alt, ...r.einstellungen, pilotKonten: alt.pilotKonten }));
      setErfolg("Einstellungen gespeichert.");
      router.refresh();
    } catch (x) {
      setFehler(x.message);
    }
  }

  async function pruefen(ev) {
    ev.preventDefault();
    setFehler("");
    try {
      const r = await senden("/api/admin/compliance/sanktionen", { body: { name, geburtsdatum: geb, art } });
      setTreffer(r.treffer);
    } catch (x) {
      setFehler(x.message);
    }
  }

  async function fristen() {
    setFehler("");
    try {
      setLauf(await senden("/api/admin/compliance/fristen", { body: {} }));
      router.refresh();
    } catch (x) {
      setFehler(x.message);
    }
  }

  return (
    <>
      <Karte titel="Freigabe-Sperren" untertitel={`Wirksam: ${GELTUNG[e.geltungWirksam] || e.geltungWirksam}`}>
        <FehlerBox>{fehler}</FehlerBox>
        <ErfolgBox>{erfolg}</ErfolgBox>
        <p className="text-[13px] leading-relaxed text-ink-600">Diese Schritte sind nur mit Status „verifiziert“ möglich (Standard: an).</p>
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Schritte mit Verifizierungspflicht">
          {Object.entries(e.schritte || {}).map(([k, s]) => (
            <Chip key={k} name={`g-${k}`} value="1" checked={e.gating?.[k] !== false} onChange={(ev) => speichern({ gating: { [k]: ev.target.checked } }) && setE({ ...e, gating: { ...e.gating, [k]: ev.target.checked } })}>
              {s.label}
            </Chip>
          ))}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Feld id="c-geltung" label="Geltung" hinweis={e.geltungUmgebung ? `Umgebung: PLATTFORM_KYC_GATING=${e.geltungUmgebung}` : "Produktion: alle · Entwicklung: Pilot-Konten"}>
            <select id="c-geltung" className={auswahlfeld} value={e.geltung || ""} onChange={(ev) => speichern({ geltung: ev.target.value || null }) && setE({ ...e, geltung: ev.target.value || null })}>
              {Object.entries(GELTUNG).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </Feld>
          <Feld id="c-schwelle" label="Treffer-Schwelle" hinweis="Ähnlichkeit 0,70–0,99 (Standard 0,88)">
            <input id="c-schwelle" className={eingabe} inputMode="decimal" defaultValue={e.trefferSchwelle} onBlur={(ev) => speichern({ trefferSchwelle: ev.target.value.replace(",", ".") })} />
          </Feld>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Chip name="vier" value="1" checked={!!e.vierAugenBeiHoch} onChange={(ev) => speichern({ vierAugenBeiHoch: ev.target.checked }) && setE({ ...e, vierAugenBeiHoch: ev.target.checked })}>Vier-Augen bei Risiko hoch</Chip>
          <Chip name="vierimmer" value="1" checked={!!e.vierAugenImmer} onChange={(ev) => speichern({ vierAugenImmer: ev.target.checked }) && setE({ ...e, vierAugenImmer: ev.target.checked })}>Vier-Augen immer</Chip>
        </div>
        {(e.pilotKonten || []).length > 0 && (
          <p className="mt-4 break-words text-[12.5px] text-ink-500">Pilot-Konten ({e.pilotKonten.length}): {e.pilotKonten.slice(0, 4).map((p) => p.email || p.id).join(", ")}{e.pilotKonten.length > 4 ? " …" : ""}</p>
        )}
        <p className="mt-2 text-[12.5px] text-ink-500">Hochrisiko-Drittländer: {(e.hochrisikoLaender || []).join(", ") || "–"} (EU-Liste in der jeweils geltenden Fassung pflegen)</p>
      </Karte>

      <Karte titel="Einzelabgleich" untertitel="Name gegen die Sanktionsliste prüfen (wird protokolliert)">
        <form onSubmit={pruefen} className="space-y-3">
          <Feld id="s-name" label="Name bzw. Firma"><input id="s-name" className={eingabe} value={name} onChange={(ev) => setName(ev.target.value)} /></Feld>
          <div className="grid gap-3 sm:grid-cols-2">
            <Feld id="s-geb" label="Geburtsdatum"><input id="s-geb" type="date" className={eingabe} value={geb} onChange={(ev) => setGeb(ev.target.value)} /></Feld>
            <Feld id="s-art" label="Art">
              <select id="s-art" className={auswahlfeld} value={art} onChange={(ev) => setArt(ev.target.value)}><option value="person">Person</option><option value="organisation">Organisation</option></select>
            </Feld>
          </div>
          <Button type="submit" size="sm" variant="navy" icon={Search}>Prüfen</Button>
        </form>
        {treffer && (
          <div className="mt-4" role="status">
            {treffer.length === 0 ? <p className="text-[14px] text-ov-800">Kein Treffer oberhalb der Schwelle.</p> : (
              <ul className="space-y-2">
                {treffer.map((t) => (
                  <li key={t.eintragId} className="rounded-xl bg-sun-300/20 px-3 py-2 text-[13.5px] ring-1 ring-inset ring-sun-400/40">
                    <strong>{t.name}</strong> · Ähnlichkeit {Math.round(t.score * 100)} % · Geburtsdatum {t.geburtsdatum} · {t.euRef || t.eintragId} {t.programm && `(${t.programm})`}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Karte>

      <Karte titel="Fristen" untertitel="Läuft im Betrieb täglich automatisch (Frappe-Scheduler)">
        <p className="text-[13px] leading-relaxed text-ink-600">Erinnerung vor Ausweis-Ablauf, wiederkehrende Überprüfung je Risiko ({e.wiederholungMonate?.hoch}/{e.wiederholungMonate?.mittel}/{e.wiederholungMonate?.niedrig} Monate), Neuabgleich bei neuem Listenstand, Löschung {e.aufbewahrungJahre} Jahre nach Ende der Geschäftsbeziehung.</p>
        <Button className="mt-3" size="sm" variant="secondary" icon={CalendarClock} onClick={fristen}>Fristen jetzt prüfen</Button>
        {lauf && (
          <p className="mt-3 text-[13px] text-ink-700" role="status">
            Erinnert: {lauf.ausweisErinnert + lauf.wiederholungErinnert} · fällig gesetzt: {lauf.abgelaufen} · neu abgeglichen: {lauf.neuAbgeglichen} (neue Treffer: {lauf.neueTreffer}) · gelöscht: {lauf.geloescht}
          </p>
        )}
      </Karte>
    </>
  );
}
