"use client";

// Registersuche und -abruf (Firmenbuch AT, Handelsregister DE, Zefix CH). Mit `kycFallId` legt der Abruf die Auskunft
// (Metadaten + PDF-Verweis, Abrufdatum) als Hinweis im KYC-Fall ab – nur für die Compliance.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, FileDown, Search } from "lucide-react";
import Button from "@/components/ui/Button";
import { Badge, Karte } from "@/components/Portal/ui";
import { ErfolgBox, FehlerBox, auswahlfeld, eingabe } from "@/components/Portal/felder";
import { senden } from "@/lib/plattform/client";

const LAENDER = { AT: "Österreich – Firmenbuch", DE: "Deutschland – Handelsregister", CH: "Schweiz – Zefix" };
const STATUS_TON = { aktiv: "ok", geloescht: "warn", in_loeschung: "warn", in_liquidation: "warn" };

export default function RegisterSuche({ kycFallId = null, land: startLand = "AT", q: startQ = "", nummer: startNummer = "", schreiben = true, titel = "Registerauskunft", kompakt = false }) {
  const router = useRouter();
  const [land, setLand] = useState(["AT", "DE", "CH"].includes(startLand) ? startLand : "AT");
  const [q, setQ] = useState(startQ);
  const [treffer, setTreffer] = useState(null);
  const [fehler, setFehler] = useState("");
  const [erfolg, setErfolg] = useState(null);
  const [laeuft, setLaeuft] = useState(false);

  async function suchen(ev) {
    ev?.preventDefault();
    setFehler("");
    setLaeuft(true);
    try {
      const r = await senden(`/api/admin/register?land=${land}&q=${encodeURIComponent(q)}`, { method: "GET" });
      setTreffer(r);
    } catch (x) {
      setFehler(x.message);
    } finally {
      setLaeuft(false);
    }
  }

  async function abrufen(nummer) {
    setFehler("");
    setErfolg(null);
    setLaeuft(true);
    try {
      const r = await senden("/api/admin/register", { body: { land, nummer, kycFallId, zweck: kycFallId ? `KYB-Prüfung ${kycFallId}` : "Prüfung Geschäftspartner" } });
      setErfolg(r.auskunft);
      if (kycFallId) router.refresh();
    } catch (x) {
      setFehler(x.message);
    } finally {
      setLaeuft(false);
    }
  }

  return (
    <Karte titel={titel} untertitel={kycFallId ? "Abruf wird mit Abrufdatum als Hinweis im KYC-Fall hinterlegt" : "Suche nach Firmenname, Abruf per Registernummer"}>
      <form onSubmit={suchen} className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="reg-land" className="sr-only">Register</label>
        <select id="reg-land" value={land} onChange={(e) => setLand(e.target.value)} className={`${auswahlfeld} sm:w-[230px]`}>
          {Object.entries(LAENDER).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <label htmlFor="reg-q" className="sr-only">Firmenname</label>
        <input id="reg-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Firmenname" className={eingabe} />
        <Button type="submit" size="sm" variant="navy" icon={Search} disabled={laeuft || q.trim().length < 2} className="h-12 shrink-0">Suchen</Button>
      </form>
      {startNummer && schreiben && (
        <p className="mt-3 text-[13px] text-ink-600">
          Angegebene Registernummer: <strong>{startNummer}</strong>{" "}
          <button type="button" onClick={() => abrufen(startNummer)} disabled={laeuft} className="font-semibold text-ov-700 underline-offset-2 hover:underline">direkt abrufen</button>
        </p>
      )}
      <div className="mt-3 space-y-3">
        <FehlerBox>{fehler}</FehlerBox>
        {erfolg && (
          <ErfolgBox>
            Abgerufen: {erfolg.name || "keine Firma gefunden"} · {erfolg.nummer} ·{" "}
            <a href={`/api/admin/register/${erfolg.id}/pdf`} target="_blank" rel="noopener" className="font-semibold underline">PDF</a>
            {kycFallId ? " · im KYC-Fall hinterlegt" : ""}
          </ErfolgBox>
        )}
        {treffer && (
          <>
            {treffer.hinweis && <p className="text-[12.5px] text-ink-500">{treffer.hinweis}</p>}
            {treffer.treffer.length === 0 ? (
              <p className="text-[14px] text-ink-500">Keine Treffer.</p>
            ) : (
              <ul className={`divide-y divide-ink-100 rounded-2xl ring-1 ring-ink-200/70 ${kompakt ? "max-h-[320px] overflow-y-auto" : ""}`}>
                {treffer.treffer.map((t) => (
                  <li key={`${t.nummer}-${t.name}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 font-semibold text-ink-900"><Building2 aria-hidden="true" className="h-4 w-4 shrink-0 text-ink-400" /><span className="break-words">{t.name}</span></span>
                      <span className="block text-[12.5px] text-ink-500">{[t.nummer, t.rechtsform, t.sitz].filter(Boolean).join(" · ")}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      {t.status && <Badge ton={STATUS_TON[t.status] || "neutral"}>{t.status.replace("_", " ")}</Badge>}
                      {schreiben && t.nummer && (
                        <Button type="button" size="sm" variant="secondary" icon={FileDown} disabled={laeuft} onClick={() => abrufen(t.nummer)}>Abrufen</Button>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </Karte>
  );
}
