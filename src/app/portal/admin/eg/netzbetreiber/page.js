// /portal/admin/eg/netzbetreiber – Backoffice: Verteilnetzbetreiber (Netzbetreibernummer, EDA-Adresse, Vertragsweg) und
// Netzentgelt-Regeltabelle (bis 31.12.2026 SNE-V 2018 nach Modell, ab 01.01.2027 Platzhalter nach Zonelevel). WP1.

import { Network, Scale } from "lucide-react";
import { Badge, Hinweis, Karte, SeitenKopf, Tabelle, zelle } from "@/components/Portal/ui";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { egBackend } from "@/lib/plattform/backend/eg";
import { REGEL_STATUS, VERTRAGSWEGE } from "@/lib/plattform/eg/modell";
import { BUNDESLAENDER } from "@/lib/plattform/eg/netzbetreiber";
import { datum } from "@/lib/plattform/format";

export const metadata = { title: "Netzbetreiber & Netzentgelte" };
const TON = { gesichert: "ok", entwurf: "info", platzhalter: "warn", zu_bestaetigen: "warn", offen: "neutral" };

export default async function Netzbetreiber() {
  const n = await portalNutzer({ admin: true });
  const b = egBackend();
  const [nb, r] = await Promise.all([laden(() => b.egNetzbetreiber(n)), laden(() => b.egNetzentgeltRegeln(n))]);
  return (
    <div className="space-y-6">
      <SeitenKopf eyebrow="Backoffice · Energiegemeinschaften" titel="Netzbetreiber & Netzentgelte" text="Stammdaten der Verteilnetzbetreiber und die versionierte Regeltabelle für den reduzierten Netznutzungs-Arbeitspreis. Maßgeblich bleibt die Netzrechnung des Netzbetreibers – die Plattform weist die Ersparnis nur als Schätzung aus." />
      <Hinweis ton="warn" titel="Kennungen prüfen">Netzbetreibernummern und EDA-Adressen sind nur eingetragen, wo sie öffentlich erkennbar sind, und stehen auf „zu bestätigen“, bis sie gegen das ebUtilities-Marktpartnerverzeichnis geprüft sind. Kontaktwege laut Koordinationsstelle – Formulare vor Einsatz prüfen.</Hinweis>
      <Karte titel="Verteilnetzbetreiber" untertitel={`${nb.netzbetreiber.length} Einträge`} aktion={<Network aria-hidden="true" className="h-5 w-5 text-ov-600" />}>
        <Tabelle kopf={["Netzbetreiber", "Bundesland", "Nummer / EDA", "Vertragsweg", "Kontakt"]}>
          {nb.netzbetreiber.map((x) => (
            <tr key={x.id}>
              <td className={zelle}><span className="font-semibold text-ink-900">{x.kurzname}</span><span className="block text-[12.5px] text-ink-500">{x.name}</span></td>
              <td className={zelle}>{x.bundesland.map((k) => BUNDESLAENDER[k] || k).join(", ")}</td>
              <td className={zelle}>{x.nbNummer ? <span className="font-mono text-[13px]">{x.nbNummer}{x.marktpartnerId ? ` · ${x.marktpartnerId}` : ""}</span> : "–"}<span className="mt-1 block"><Badge ton={TON[x.nbNummerStatus]}>{x.nbNummerStatus === "zu_bestaetigen" ? "zu bestätigen" : x.nbNummerStatus}</Badge></span></td>
              <td className={zelle}>{VERTRAGSWEGE[x.vertragsweg] || x.vertragsweg}<span className="block text-[12.5px] text-ink-500">{x.besonderheiten}</span></td>
              <td className={`${zelle} break-all text-[13px]`}>{x.kontaktEmail || "–"}{(x.portalUrl || x.formularUrl) && <a href={x.portalUrl || x.formularUrl} target="_blank" rel="noopener noreferrer" className="block font-semibold text-ov-700 hover:text-ov-800">Seite des Netzbetreibers</a>}</td>
            </tr>
          ))}
        </Tabelle>
      </Karte>
      <Karte titel="Netzentgelt-Regeln" untertitel="Reduktion des Netznutzungs-Arbeitspreises; reduzierter Arbeitspreis kaufmännisch auf 2 Kommastellen (ct/kWh)" aktion={<Scale aria-hidden="true" className="h-5 w-5 text-ov-600" />}>
        <Tabelle kopf={["Gültig", "Bezug", "Netzebenen", "Reduktion", "Abgabenbefreit", "Status / Quelle"]}>
          {r.regeln.map((x) => (
            <tr key={x.id}>
              <td className={zelle}>{x.gueltigAb ? datum(x.gueltigAb) : "bisher"}–{x.gueltigBis ? datum(x.gueltigBis) : "offen"}</td>
              <td className={zelle}>{x.bezug === "modell" ? `Modell ${x.modelle.map((m) => m.toUpperCase()).join(", ")}` : `Zonelevel ${x.zonelevel.join(", ")}`}</td>
              <td className={zelle}>NE {x.netzebenen.join(", ")}</td>
              <td className={`${zelle} ov-num font-semibold`}>{x.reduktionPct ? `−${x.reduktionPct} %` : "keine"}</td>
              <td className={zelle}>{x.abgabenBefreitModelle.map((m) => m.toUpperCase()).join(", ") || "–"}</td>
              <td className={zelle}><Badge ton={TON[x.status]}>{REGEL_STATUS[x.status]}</Badge><a href={x.quelleUrl} target="_blank" rel="noopener noreferrer" className="mt-1 block text-[12.5px] text-ov-700 hover:text-ov-800">{x.quelle}</a></td>
            </tr>
          ))}
        </Tabelle>
      </Karte>
    </div>
  );
}
