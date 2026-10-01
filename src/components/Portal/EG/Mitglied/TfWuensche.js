"use client";

// Teilnahmefaktor-Wünsche der Mitglieder (WP6) in Verwaltung und Backoffice: Liste mit Vorprüfung, Auswahl und Auslösen als
// TF-Änderung beim Netzbetreiber (EC_PRTFACT_CHG über WP2 edaTfAendern) bzw. Ablehnen mit Grund. Fachliche Prüfung
// (eine Änderung pro Tag, Σ TF ≤ 100 %, Vier-Augen bei Masse) ausschließlich im Backend. Daten: GET /api/portal/eg/[id]/tf-wuensche.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, X } from "lucide-react";
import Button from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { ErfolgBox, FehlerBox, eingabe } from "@/components/Portal/felder";
import { senden } from "@/lib/plattform/client";

const datumDe = (t) => (t ? String(t).slice(0, 10).split("-").reverse().join(".") : "–");
const zpKurz = (nr) => (nr ? `…${String(nr).slice(-8)}` : "–");

export default function TfWuensche({ gemeinschaftId, wuensche = [], darfAusloesen = false, ab = "" }) {
  const router = useRouter();
  const [auswahl, setAuswahl] = useState(() => new Set(wuensche.filter((w) => w.ok).map((w) => w.id)));
  const [datum, setDatum] = useState(ab);
  const [grund, setGrund] = useState("");
  const [laeuft, setLaeuft] = useState("");
  const [fehler, setFehler] = useState("");
  const [erfolg, setErfolg] = useState("");
  const [details, setDetails] = useState([]);
  const url = `/api/portal/eg/${gemeinschaftId}/tf-wuensche`;
  if (!wuensche.length) return <p className="text-[13.5px] text-ink-500">Keine offenen Wünsche der Mitglieder.</p>;
  const ids = [...auswahl];

  async function los(entscheidung) {
    setLaeuft(entscheidung);
    setFehler("");
    setErfolg("");
    setDetails([]);
    try {
      const r = await senden(url, { body: { wunschIds: ids, entscheidung, ab: datum, grund } });
      setErfolg(entscheidung === "ablehnen" ? `${r.abgelehnt} Wunsch/Wünsche abgelehnt.` : `${r.gemeldet} Änderung(en) ab ${datumDe(r.ab)} gemeldet${r.freigabeNoetig ? " – wartet auf die Vier-Augen-Freigabe des Vorstands" : ""}${r.fehler.length ? `, ${r.fehler.length} nicht möglich` : ""}.`);
      setDetails(r.fehler || []);
      router.refresh();
    } catch (e) {
      setFehler(e.message);
    } finally {
      setLaeuft("");
    }
  }

  return (
    <div className="space-y-3">
      <ul className="divide-y divide-ink-100 rounded-2xl ring-1 ring-inset ring-ink-200/80">
        {wuensche.map((w) => (
          <li key={w.id} className="flex items-start gap-3 px-4 py-3">
            {darfAusloesen && (
              <input type="checkbox" className="mt-1 h-4 w-4 accent-ov-600" checked={auswahl.has(w.id)} onChange={() => setAuswahl((s) => {
                const n = new Set(s);
                if (n.has(w.id)) n.delete(w.id);
                else n.add(w.id);
                return n;
              })} aria-label={`Wunsch von ${w.mitgliedName || "Mitglied"} auswählen`} />
            )}
            <div className="min-w-0">
              <p className="font-semibold text-ink-900">{w.mitgliedName || "Mitglied"}{w.mitgliedsnummer ? <span className="font-normal text-ink-500"> · Nr. {w.mitgliedsnummer}</span> : null}</p>
              <p className="text-[13px] text-ink-600">Teilnahmefaktor <span className="ov-num">{w.aktuellTf ?? w.von} %</span> → <strong className="ov-num">{w.nach} %</strong> · Zählpunkt <span className="font-mono text-[12px]">{zpKurz(w.zaehlpunktnummer)}</span> · gewünscht am {datumDe(w.am)}</p>
              {!w.ok && <p className="mt-0.5 text-[12.5px] text-danger-700">{w.fehler.join(" ")}</p>}
            </div>
          </li>
        ))}
      </ul>
      {darfAusloesen ? (
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-[12.5px] font-semibold text-ink-600">
            Gültig ab
            <input type="date" className={cn(eingabe, "mt-1 h-10 w-auto")} value={datum} min={ab} onChange={(e) => setDatum(e.target.value)} />
          </label>
          <Button size="sm" icon={Send} disabled={!ids.length || !!laeuft} onClick={() => los("melden")}>
            Beim Netzbetreiber melden
          </Button>
          <input className={cn(eingabe, "h-10 min-w-0 flex-1 sm:max-w-xs")} placeholder="Grund bei Ablehnung" value={grund} onChange={(e) => setGrund(e.target.value)} aria-label="Grund der Ablehnung" />
          <Button size="sm" variant="secondary" icon={X} disabled={!ids.length || !grund.trim() || !!laeuft} onClick={() => los("ablehnen")}>
            Ablehnen
          </Button>
        </div>
      ) : (
        <p className="text-[13px] text-ink-500">Die Betriebsführung meldet die Wünsche elektronisch beim Netzbetreiber (eine Änderung pro Tag und Zählpunkt); größere Mengen gibt der Vorstand im Vier-Augen-Prinzip frei.</p>
      )}
      <ErfolgBox>{erfolg}</ErfolgBox>
      <FehlerBox>{fehler}</FehlerBox>
      {details.length > 0 && <ul className="list-disc space-y-0.5 pl-5 text-[12.5px] text-ink-600">{details.map((f) => <li key={f.id}>{f.fehler}</li>)}</ul>}
    </div>
  );
}
