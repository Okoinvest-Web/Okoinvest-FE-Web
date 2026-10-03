// /portal/admin/eg/simulation – Simulation einer Energiegemeinschaft vor der Gründung bzw. für Änderungen (WP3, Fachkonzept 4.7):
// Teilnehmer mit Standardlastprofilen oder eigenem Lastgang, PV je Standort, Eigenverbrauch hinter dem Zähler, dynamische bzw.
// statische Zuteilung, Gemeinschaftsspeicher, Vergleich nach Nahebereich (Regeltabelle Netzentgelt), Ersparnis je Teilnehmer.
// ?gemeinschaft=<id> übernimmt Mitglieder, gemessenen Jahresverbrauch und Anlagen einer bestehenden Gemeinschaft.

import Link from "next/link";
import { Hinweis, SeitenKopf } from "@/components/Portal/ui";
import SimulationRechner from "@/components/Portal/EG/Energie/SimulationRechner";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { egBackend } from "@/lib/plattform/backend/eg";

export const metadata = { title: "Simulation Energiegemeinschaft" };

export default async function Seite({ searchParams }) {
  const n = await portalNutzer({ admin: true });
  const sp = (await searchParams) || {};
  const gid = String(sp.gemeinschaft || "");
  const b = egBackend();
  const liste = await laden(() => b.egGemeinschaften(n, {}));
  const g = gid ? liste.gemeinschaften.find((x) => x.id === gid) : null;
  const vorlage = g ? (await laden(() => b.enSimulation(n, { daten: { gemeinschaftId: g.id, nurVorlage: true } }))).vorlage : null;
  const gespeichert = (await laden(() => b.enSimulationen(n, { gemeinschaftId: g?.id || "" }))).simulationen;
  return (
    <div className="space-y-6">
      <SeitenKopf eyebrow="Backoffice · Energiegemeinschaften" titel={g ? `Simulation: ${g.name}` : "Simulation"} text="Eigendeckung, Überschuss und Ersparnis je Teilnehmer vor der Gründung – mit Lastprofilen, PV-Erträgen, Speicher und Vergleich der Nahebereiche (EEG lokal, regional, BEG, GEA)." />
      <nav aria-label="Vorlage wählen" className="flex flex-wrap gap-2 text-[13.5px]">
        <Link href="/portal/admin/eg/simulation" className={`rounded-full px-3 py-1.5 font-semibold ring-1 ring-inset ${!g ? "bg-ov-600 text-white ring-ov-600" : "bg-white text-ink-700 ring-ink-200 hover:bg-ov-50"}`}>Neue Gemeinschaft</Link>
        {liste.gemeinschaften.map((x) => (
          <Link key={x.id} href={`/portal/admin/eg/simulation?gemeinschaft=${x.id}`} className={`rounded-full px-3 py-1.5 font-semibold ring-1 ring-inset ${g?.id === x.id ? "bg-ov-600 text-white ring-ov-600" : "bg-white text-ink-700 ring-ink-200 hover:bg-ov-50"}`}>{x.name}</Link>
        ))}
      </nav>
      {vorlage?.hinweis && <Hinweis ton="info">{vorlage.hinweis}</Hinweis>}
      <SimulationRechner key={g?.id || "neu"} url="/api/admin/eg/simulation" vorlage={vorlage} gemeinschaftId={g?.id || ""} gespeichert={gespeichert} darfSpeichern={!!liste.darfSchreiben} />
      <p className="text-[12.5px] text-ink-500">Rechenkern auch für den öffentlichen Rechner (ohne Personendaten). Standardlastprofile angenähert (Originalprofile APCS/E-Control, Lizenz zu bestätigen); PV aus Sonnenstand und Monatsanteilen, PVGIS-Anbindung folgt. Keine Steuer- oder Rechtsberatung.</p>
    </div>
  );
}
