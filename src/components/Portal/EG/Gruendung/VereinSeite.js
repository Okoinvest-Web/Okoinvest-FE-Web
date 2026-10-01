// Seitenrahmen Vereinsorganisation (WP5) für Backoffice (/portal/admin/eg/[id]/organe, /versammlungen) und Portal
// (/portal/eg/[id]/verein, /versammlungen). Serverkomponente: lädt grVersammlungen und Kontext, bindet die Reiterleiste ein.

import { Gavel, Landmark, ScrollText, Users } from "lucide-react";
import { Badge, Kennzahl, SeitenKopf } from "@/components/Portal/ui";
import EgReiter from "@/components/Portal/EG/Stamm/EgReiter";
import VereinAnsicht from "./Verein";
import { laden } from "@/lib/plattform/server/seite";
import { egBackend } from "@/lib/plattform/backend/eg";
import { VORLAGEN } from "@/lib/plattform/eg/vertraege";
import { datumDe } from "./teile";

export default async function VereinSeite({ nutzer, gemeinschaftId, art = "portal", start = "versammlungen", reiter = "versammlungen" }) {
  const b = egBackend();
  const v = await laden(() => b.grVersammlungen(nutzer, gemeinschaftId));
  let rechte = null;
  if (art !== "admin") {
    try {
      rechte = (await b.egKontext(nutzer, { gemeinschaftId })).gemeinschaften[0]?.rechte || null;
    } catch {
      rechte = null;
    }
  }
  const felder = Object.fromEntries((v.vorlagen || []).map((x) => [x.id, VORLAGEN[x.id]?.felder || []]));
  const naechste = v.versammlungen.filter((x) => ["entwurf", "eingeladen", "abstimmung"].includes(x.status)).sort((p, q) => String(p.datum).localeCompare(String(q.datum)))[0];
  const wirksam = v.organe.filter((o) => o.wirksam).length;
  return (
    <div className="space-y-6">
      <SeitenKopf eyebrow={`${v.gemeinschaft.modellKurz} · ${v.gemeinschaft.rechtsformLabel}`} titel={v.gemeinschaft.name} text="Organe, Mitglieder- bzw. Generalversammlungen, Beschlüsse, Mitgliedsbeiträge, Statuten und Auflösung – nach VerG 2002 bzw. GenG, mit Online-Abstimmung und Protokoll mit Prüfsumme.">
        <div className="mt-3 flex flex-wrap gap-2"><Badge ton="info">{v.gemeinschaft.statusLabel}</Badge>{v.rollen?.length > 0 && <Badge>{v.rollen.join(", ")}</Badge>}</div>
      </SeitenKopf>
      {art === "admin" ? <EgReiter gemeinschaftId={gemeinschaftId} aktiv={reiter} art="admin" /> : v.rechte.organ && rechte ? <EgReiter gemeinschaftId={gemeinschaftId} aktiv="versammlungen" art="organ" rechte={rechte} /> : null}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kennzahl label="Nächste Versammlung" wert={naechste ? datumDe(naechste.datum) : "–"} hinweis={naechste ? naechste.statusLabel : v.gvPflicht.text} icon={Users} />
        <Kennzahl label="Beschlüsse" wert={v.beschluesse.length} hinweis={v.beschluesse[0] ? `zuletzt ${datumDe(v.beschluesse[0].datum)}` : "noch keine"} icon={Gavel} />
        <Kennzahl label="Organe" wert={wirksam} hinweis={v.organCheck ? (v.organCheck.ok ? "Besetzung vollständig" : "Besetzung prüfen") : "wirksame Funktionen"} icon={Landmark} />
        <Kennzahl label="Dokumente" wert={v.dokumente.length} hinweis="Statuten, Verträge, Anzeigen (Muster)" icon={ScrollText} />
      </div>
      <VereinAnsicht verein={v} start={start} vorlagenFelder={felder} />
    </div>
  );
}
