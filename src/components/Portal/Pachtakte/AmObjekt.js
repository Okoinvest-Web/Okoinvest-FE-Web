// Pachtakte an der Fläche (Server-Komponente): Kurzstand des Pachtvertrags mit Link zur Pachtakte – für den
// Eigentümer (/portal/pachtvertraege) bzw. das Backoffice (/portal/admin/pachtakten/[id]). Nur ab Status „Vertrag“.
import Link from "next/link";
import { Badge, Karte } from "@/components/Portal/ui";
import { pachtakteBackend } from "@/lib/plattform/backend/pachtakte";
import { darfLesen } from "@/lib/plattform/rechte";
import { datumDe } from "@/lib/plattform/pachtakte";

const AB_VERTRAG = ["vertrag", "planung", "bau", "betrieb"];

export default async function PachtakteAmObjekt({ nutzer, flaeche }) {
  if (!flaeche || !AB_VERTRAG.includes(flaeche.status)) return null;
  const admin = nutzer?.rollen?.includes("admin");
  let eintrag = null;
  try {
    if (admin) {
      if (!darfLesen(nutzer, "pachtakte")) return null;
      const d = await pachtakteBackend().pachtakteBackoffice(nutzer);
      const v = d.vertraege.find((x) => x.flaecheId === flaeche.id);
      if (v) eintrag = { href: `/portal/admin/pachtakten/${v.id}`, bezeichnung: v.bezeichnung, status: v.statusLabel, frist: v.naechsteFrist, offen: v.offeneAnliegen };
    } else if (flaeche.nutzerId === nutzer?.id) {
      const d = await pachtakteBackend().meinePachtakte(nutzer);
      const a = d.vertraege.find((x) => x.vertrag.flaecheId === flaeche.id);
      if (a) eintrag = { href: "/portal/pachtvertraege", bezeichnung: a.vertrag.bezeichnung, status: a.vertrag.statusLabel, frist: a.fristen.find((f) => f.tage !== null && f.tage >= 0) || null, offen: a.anliegen.filter((x) => ["eingereicht", "in_pruefung", "rueckfrage"].includes(x.status)).length };
    }
  } catch {
    return null;
  }
  return (
    <Karte titel="Pachtvertrag" untertitel="Fristen, Anliegen, Rückbau und Jahresbescheinigung">
      {eintrag ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-ink-900">{eintrag.bezeichnung}</p>
            <Badge ton="ok">{eintrag.status}</Badge>
          </div>
          {eintrag.frist && <p className="mt-2 text-[13.5px] text-ink-600">Nächste Frist: {datumDe(eintrag.frist.datum)} · {eintrag.frist.titel}</p>}
          {eintrag.offen > 0 && <p className="mt-1 text-[13.5px] text-ink-600">{eintrag.offen} Anliegen in Bearbeitung</p>}
          <Link href={eintrag.href} className="mt-3 inline-flex text-[14px] font-semibold text-ov-700 hover:text-ov-800">Zur Pachtakte</Link>
        </>
      ) : (
        <p className="text-[14px] leading-relaxed text-ink-600">Der Pachtvertrag wird vorbereitet. Sobald er unterschrieben und erfasst ist, finden Sie Fristen, Sicherheiten und Anliegen unter <Link href={admin ? "/portal/admin/pachtakten" : "/portal/pachtvertraege"} className="font-semibold text-ov-700">Pachtverträge</Link>.</p>
      )}
    </Karte>
  );
}
