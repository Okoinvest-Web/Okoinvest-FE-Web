"use client";

// Investor-Aktionen im Portfolio: Zahlung zu einem Kapitalabruf melden, Wiederverkauf über die Börse anfragen bzw.
// zurückziehen, Verkäuferprovision für den Börsen-Entwurf annehmen. Alle Prüfungen serverseitig (portfolio/kern.js).

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Send, Undo2, Store } from "lucide-react";
import Button from "@/components/ui/Button";
import { Feld, FehlerBox, auswahlfeld, eingabe, textbereich } from "@/components/Portal/felder";
import { senden } from "@/lib/plattform/client";

function useAktion(positionId) {
  const router = useRouter();
  const [fehler, setFehler] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  async function los(body) {
    setFehler("");
    setLaeuft(true);
    try {
      await senden(`/api/portal/portfolio/${positionId}`, { body });
      router.refresh();
      return true;
    } catch (x) {
      setFehler(x.message);
      return false;
    } finally {
      setLaeuft(false);
    }
  }
  return { fehler, laeuft, los };
}

export function AbrufMelden({ positionId, abrufId }) {
  const { fehler, laeuft, los } = useAktion(positionId);
  const [referenz, setReferenz] = useState("");
  return (
    <form
      className="mt-3 flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        los({ aktion: "abruf_melden", abrufId, referenz });
      }}
    >
      <Feld id={`ref-${abrufId}`} label="Verwendungszweck / Referenz (optional)" className="min-w-[200px] flex-1">
        <input id={`ref-${abrufId}`} value={referenz} onChange={(e) => setReferenz(e.target.value)} maxLength={80} className={`${eingabe} h-10 text-[14px]`} />
      </Feld>
      <Button type="submit" size="sm" icon={Send} disabled={laeuft}>Zahlung angewiesen</Button>
      <div className="w-full"><FehlerBox>{fehler}</FehlerBox></div>
    </form>
  );
}

export function WiederverkaufAnfragen({ positionId, anteilMax = 100, heuteMonat }) {
  const { fehler, laeuft, los } = useAktion(positionId);
  const [offen, setOffen] = useState(false);
  const [d, setD] = useState({ preisvorstellung: "", zeitpunkt: heuteMonat, struktur: "share", anteilProzent: String(anteilMax), grund: "" });
  const setze = (k) => (e) => setD((x) => ({ ...x, [k]: e.target.value }));
  if (!offen) return <Button type="button" variant="secondary" size="sm" icon={Store} onClick={() => setOffen(true)}>Wiederverkauf über die Börse anfragen</Button>;
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (await los({ aktion: "wiederverkauf", ...d })) setOffen(false);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Feld id="wv-preis" label="Preisvorstellung (optional, gesamt)" hinweis="Leer lassen, wenn ÖkoInvest eine Indikation erstellen soll.">
          <input id="wv-preis" inputMode="numeric" value={d.preisvorstellung} onChange={setze("preisvorstellung")} className={eingabe} />
        </Feld>
        <Feld id="wv-zeit" label="Verkauf ab" pflicht>
          <input id="wv-zeit" type="month" min={heuteMonat} required value={d.zeitpunkt} onChange={setze("zeitpunkt")} className={eingabe} />
        </Feld>
        <Feld id="wv-struktur" label="Struktur">
          <select id="wv-struktur" value={d.struktur} onChange={setze("struktur")} className={auswahlfeld}>
            <option value="share">Anteilskauf (Share Deal)</option>
            <option value="asset">Kauf der Anlage (Asset Deal)</option>
          </select>
        </Feld>
        <Feld id="wv-anteil" label="Anteil in %" hinweis={`Höchstens Ihr Anteil (${anteilMax} %).`}>
          <input id="wv-anteil" type="number" min="1" max={anteilMax} step="0.01" value={d.anteilProzent} onChange={setze("anteilProzent")} className={eingabe} />
        </Feld>
      </div>
      <Feld id="wv-grund" label="Was soll verkauft werden und warum?" pflicht hinweis="Nur für ÖkoInvest – erscheint nicht in der Börse.">
        <textarea id="wv-grund" required minLength={10} maxLength={600} value={d.grund} onChange={setze("grund")} className={textbereich} />
      </Feld>
      <FehlerBox>{fehler}</FehlerBox>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" icon={Send} disabled={laeuft}>Anfrage senden</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOffen(false)}>Abbrechen</Button>
      </div>
    </form>
  );
}

export function WiederverkaufZurueck({ positionId }) {
  const { fehler, laeuft, los } = useAktion(positionId);
  return (
    <div className="space-y-2">
      <Button type="button" size="sm" variant="ghost" icon={Undo2} disabled={laeuft} onClick={() => los({ aktion: "wiederverkauf_zurueck" })}>Anfrage zurückziehen</Button>
      <FehlerBox>{fehler}</FehlerBox>
    </div>
  );
}

export function ProvisionAnnehmen({ positionId, text }) {
  const { fehler, laeuft, los } = useAktion(positionId);
  const [ok, setOk] = useState(false);
  return (
    <div className="space-y-3">
      <label className="flex items-start gap-2.5 text-[14px] text-ink-700">
        <input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} className="mt-1 h-4 w-4 accent-ov-600" />
        <span>{text}</span>
      </label>
      <Button type="button" size="sm" icon={Check} disabled={!ok || laeuft} onClick={() => los({ aktion: "provision_akzeptieren" })}>Provision annehmen</Button>
      <FehlerBox>{fehler}</FehlerBox>
    </div>
  );
}
