// /portal/eg/[id]/kasse – Organe: Kassa und Buchhaltung (Kassier, Vorstand lesend, Rechnungsprüfung).
// Zahlungen (SEPA-Lastschrift/-Überweisung mit Vier-Augen, camt-Abgleich, Mandate, offene Posten), Mahnwesen mit fairen
// Gebühren, Kassabuch und Buchungen, Einnahmen-Ausgaben-Rechnung, UVA-Vorbereitung, Kleinunternehmer-Monitor, Exporte
// (BMD, RZL, DATEV), Jahresabschluss-Paket und Prüfvermerk der Rechnungsprüfung. Rechte prüft das Backend (WP4).

import { SeitenKopf } from "@/components/Portal/ui";
import EgReiter from "@/components/Portal/EG/Stamm/EgReiter";
import { KasseAnsicht } from "@/components/Portal/EG/Abrechnung/Ansichten";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { egBackend } from "@/lib/plattform/backend/eg";

export const metadata = { title: "Kassa und Buchhaltung" };

const versuch = async (fn) => {
  try {
    return await fn();
  } catch {
    return null;
  }
};

export default async function Seite({ params, searchParams }) {
  const n = await portalNutzer();
  const { id } = await params;
  const sp = (await searchParams) || {};
  const b = egBackend();
  const p = await laden(() => b.abPerioden(n, id));
  const [bh, mahn, mandate, belege] = await Promise.all([
    p.stufen.buchhaltung >= 1 ? versuch(() => b.abBuchungen(n, id, { jahr: sp.jahr || "" })) : null,
    versuch(() => b.abMahnlauf(n, id, {})),
    p.stufen.sepa >= 1 ? versuch(() => b.abMandate(n, id)) : null,
    versuch(() => b.abBelege(n, { gemeinschaftId: id })),
  ]);
  return (
    <div className="space-y-6">
      <SeitenKopf eyebrow="Energiegemeinschaft · Kassa & Buchhaltung" titel={`Kassa · ${p.gemeinschaft.name}`} text="Zahlungsverkehr, Vereinsbuchhaltung und Steuer an einem Ort – mit Vier-Augen-Prinzip für Zahlungsdateien und einem Prüfpfad für die Rechnungsprüfung. Keine Steuerberatung." />
      <EgReiter gemeinschaftId={id} aktiv="kasse" art="organ" rechte={p.rechte} />
      <KasseAnsicht p={p} bh={bh} mahn={mahn} mandate={mandate} belege={belege?.belege || []} tab={sp.tab} basis={`/portal/eg/${id}/kasse`} kontoId={n.id} />
    </div>
  );
}
