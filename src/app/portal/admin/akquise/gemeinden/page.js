import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Hinweis, SeitenKopf } from "@/components/Portal/ui";
import GemeindenScreening from "@/components/Portal/Akquise2/GemeindenScreening";
import { laden, portalNutzer } from "@/lib/plattform/server/seite";
import { darfSchreiben, unterrollen } from "@/lib/plattform/rechte";
import { gemeindenScreening } from "@/lib/plattform/geodaten/akquise2";
import * as geo from "@/lib/plattform/geodaten";

export const metadata = { title: "Gemeinde-Screening" };

// Gemeinde-Screening (A1b): nur Backoffice-Unterrollen Leitung/Akquise (Bereich „geodaten“), sonst 404.
export default async function GemeindenSeite() {
  const n = await portalNutzer({ admin: true });
  const modus = geo.geodatenModus();
  const start = modus ? await laden(() => gemeindenScreening(n, {})) : { gemeinden: [], labels: { bauleitplanung: {}, kriterienkatalog: {}, konkurrenz: {} } };
  const u = modus ? await laden(() => geo.uebersicht(n)) : { gebiete: {} };
  return (
    <div className="space-y-2">
      <Link href="/portal/admin/akquise" className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-ov-700 hover:text-ov-800">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Akquise-Pipeline
      </Link>
      <SeitenKopf eyebrow="Backoffice · Akquise-Strategie" titel="Gemeinde-Screening" text="Welche Gemeinde zuerst? Ranking aus Flächenpotenzial, Qualität der besten Flächen, Netzkapazität, Stand der Bauleitplanung, Flächenkulisse und bekanntem Wettbewerb – mit Übergabe an die Kommune-Ansprache." />
      <Hinweis ton="info" className="mb-4">Punkte: Flächenpotenzial 35 · Qualität 15 · Netz 15 · Bauleitplanung 15 · Kulisse/Widmung 10 · Wettbewerb 10. Stufe A ab 65, B ab 45. Der Stand der Bauleitplanung kommt aus kommunalen Anliegen oder wird hier gepflegt; Konkurrenzhinweise nur mit Quelle.</Hinweis>
      <GemeindenScreening start={start} gebiete={u.gebiete || {}} darfSchreiben={darfSchreiben(n, "geodaten") && darfSchreiben(n, "akquise")} leitung={unterrollen(n).includes("leitung")} />
    </div>
  );
}
