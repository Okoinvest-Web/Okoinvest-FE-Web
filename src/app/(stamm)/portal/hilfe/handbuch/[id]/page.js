// /portal/hilfe/handbuch/[id] – Handbuch je Rolle bzw. Backoffice-Unterrolle (docs/handbuch/<id>.md) im Portal.
// Nur Handbücher der eigenen Rollen (Backoffice sieht alle); ID aus fester Liste (kein Pfadzugriff von außen).
// Datei wird synchron gelesen (kein awaited fs im Render – siehe docs/BRIEFING.md, Ressourcenregel 5).

import { readFileSync } from "node:fs";
import path from "node:path";
import { notFound } from "next/navigation";
import { BookOpen } from "lucide-react";
import Button from "@/components/ui/Button";
import { Hinweis, Karte, SeitenKopf } from "@/components/Portal/ui";
import HandbuchText from "@/components/Portal/Querschnitt/HandbuchText";
import { portalNutzer } from "@/lib/plattform/server/seite";
import { HANDBUECHER, HANDBUCH_IDS, handbuchErlaubt } from "@/lib/plattform/querschnitt";

export const metadata = { title: "Handbuch" };

function lesen(id) {
  try {
    return readFileSync(path.join(process.cwd(), "docs", "handbuch", `${id}.md`), "utf8").slice(0, 200_000);
  } catch {
    return null;
  }
}

export default async function Handbuch({ params }) {
  const n = await portalNutzer();
  const { id } = await params;
  if (!HANDBUCH_IDS.includes(id) || !handbuchErlaubt(id, n.rollen || [])) notFound();
  const text = lesen(id);
  const ohneTitel = text ? text.replace(/^#\s+.*\n/, "") : "";
  return (
    <div className="space-y-6">
      <SeitenKopf eyebrow="Hilfe · Handbuch" titel={HANDBUECHER[id].titel} text="Praxisnahe Anleitung für Ihre Rolle. Keine Rechts-, Steuer- oder Anlageberatung – verbindlich sind Verträge und Nutzungsbedingungen." aktionen={<Button href="/portal/hilfe/handbuch" variant="secondary" size="sm" icon={BookOpen}>Alle Handbücher</Button>} />
      <Karte>
        {text ? <HandbuchText markdown={ohneTitel} /> : <Hinweis ton="info" titel="Handbuch derzeit nicht verfügbar">Die Handbuch-Datei liegt auf diesem Server nicht vor. Bitte wenden Sie sich über „Nachrichten“ an das Backoffice.</Hinweis>}
      </Karte>
    </div>
  );
}
