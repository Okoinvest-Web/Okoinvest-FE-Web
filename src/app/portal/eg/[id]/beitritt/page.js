// /portal/eg/[id]/beitritt – Beitritt online zu einer Gemeinschaft (WP6): Zählpunkte mit Eignungscheck, Angaben, Zahlung,
// Verträge, elektronische Unterschrift, danach Weiterleitung in die Zustimmung beim Netzbetreiber.
// Gemeinschaft aus den offenen Gemeinschaften (ptUebersicht, ohne Personendaten); bereits Mitglied → Hinweis.

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Clock3, ShieldCheck, Users } from "lucide-react";
import { SeitenKopf } from "@/components/Portal/ui";
import BeitrittAssistent from "@/components/Portal/EG/Mitglied/BeitrittAssistent";
import { portalNutzer } from "@/lib/plattform/server/seite";
import { egBackend } from "@/lib/plattform/backend/eg";
import { EG_MODELLE } from "@/lib/plattform/eg/modell";

export const metadata = { title: "Energiegemeinschaft beitreten" };

export default async function Beitritt({ params }) {
  const n = await portalNutzer();
  const { id } = await params;
  const d = await egBackend().ptUebersicht(n);
  const schon = d.mitgliedschaften.find((m) => m.gemeinschaft.id === id && !["interessent", "ausgeschieden", "abgelehnt"].includes(m.mitglied.status));
  if (schon) {
    return (
      <div className="space-y-6">
        <SeitenKopf eyebrow="Beitritt" titel={schon.gemeinschaft.name} text={`Sie sind bereits Mitglied bzw. Ihr Antrag liegt vor (${schon.mitglied.statusLabel}).`} />
        <Link href={`/portal/eg/${id}`} className="inline-flex h-11 items-center gap-1.5 rounded-full bg-ov-600 px-5 text-[14.5px] font-semibold text-white hover:bg-ov-700">Zum Dashboard <ArrowRight aria-hidden="true" className="h-4 w-4" /></Link>
      </div>
    );
  }
  const g = d.offeneGemeinschaften.find((x) => x.id === id);
  if (!g) notFound();
  const art = n.rollen?.includes("kommune") ? "gemeinde" : n.rollen?.includes("landwirt") ? "landwirt" : n.rollen?.includes("unternehmen") ? "kmu" : "privat";
  return (
    <div className="space-y-6">
      <SeitenKopf eyebrow={`Beitritt · ${EG_MODELLE[g.modell]?.label}`} titel={g.name} text={g.beschreibung || `${g.ort}${g.netzbetreiberNamen.length ? ` · Netz: ${g.netzbetreiberNamen.join(", ")}` : ""}`}>
        <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[13.5px] text-ink-600">
          <li className="flex items-center gap-1.5"><Clock3 aria-hidden="true" className="h-4 w-4 text-ov-600" /> rund 5 Minuten</li>
          <li className="flex items-center gap-1.5"><ShieldCheck aria-hidden="true" className="h-4 w-4 text-ov-600" /> keine Kaution, Ihr Lieferant bleibt</li>
          <li className="flex items-center gap-1.5"><Users aria-hidden="true" className="h-4 w-4 text-ov-600" /> {g.mitglieder} Mitglieder</li>
        </ul>
      </SeitenKopf>
      <BeitrittAssistent gemeinschaft={g} netzbetreiber={d.netzbetreiber} vorbelegung={{ art, vorname: n.vorname, nachname: n.nachname, firma: n.firma, telefon: n.telefon, plz: d.plz }} />
    </div>
  );
}
