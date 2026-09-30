// src/components/Portal/Planung/Reiter.js – Server-Bausteine zum Einbinden in die Projektentwicklung:
//   PlanungReiter      Backoffice-Reiter „Pläne“ (/portal/admin/entwicklung/[id]?reiter=planung)
//   KalkulationReiter  Backoffice-Reiter „Kostenkalkulation“ (?reiter=kalkulation)
//   PlanungExtern      Abschnitt „Pläne“ auf /portal/entwicklung/[id] (Gutachter/Planer, Co-Investor) – ohne Zugriff unsichtbar
// Daten werden serverseitig über planungBackend() geladen (Rechte prüft das Backend).

import { PlattformFehler } from "@/lib/plattform/fehler";
import { laden } from "@/lib/plattform/server/seite";
import { planungBackend } from "@/lib/plattform/backend/planung";
import Planliste from "./Planliste";
import Kalkulation from "./Kalkulation";

export async function PlanungReiter({ nutzer, projektId }) {
  const daten = await laden(() => planungBackend().planungListe(nutzer, projektId));
  return <Planliste projektId={projektId} daten={daten} kalkulationLink={`/portal/admin/entwicklung/${projektId}?reiter=kalkulation`} />;
}

export async function KalkulationReiter({ nutzer, projektId }) {
  const daten = await laden(() => planungBackend().kalkulationHolen(nutzer, projektId));
  return <Kalkulation projektId={projektId} daten={daten} />;
}

export async function PlanungExtern({ nutzer, projektId }) {
  let daten = null;
  try {
    daten = await planungBackend().planungListe(nutzer, projektId);
  } catch (e) {
    if (e instanceof PlattformFehler && [401, 403, 404].includes(e.status)) return null;
    throw e;
  }
  if (!daten.plaene.length && !daten.rechte.neuerPlan) return null;
  return <Planliste projektId={projektId} daten={daten} extern />;
}
