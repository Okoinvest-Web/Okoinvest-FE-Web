import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Hinweis, SeitenKopf } from "@/components/Portal/ui";
import Sperrliste from "@/components/Portal/Akquise2/Sperrliste";
import { laden, portalNutzer } from "@/lib/plattform/server/seite";
import { akquise2Backend } from "@/lib/plattform/backend/akquise2";
import { darfSchreiben, unterrollen } from "@/lib/plattform/rechte";

export const metadata = { title: "Sperrliste Akquise" };

export default async function SperrlisteSeite() {
  const n = await portalNutzer({ admin: true });
  const r = await laden(() => akquise2Backend().sperrliste(n));
  return (
    <div className="space-y-2">
      <Link href="/portal/admin/akquise/kampagnen" className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-ov-700 hover:text-ov-800">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Kampagnen
      </Link>
      <SeitenKopf eyebrow="Backoffice · Akquise" titel="Sperrliste" text="Wer widerspricht, wird nie wieder angeschrieben – in keiner Kampagne. Gesperrt werden die Person (Name + PLZ) und ihre Flurstücke; neue Kampagnen überspringen gesperrte Flurstücke schon vor der Grundbuchabfrage." />
      <Hinweis ton="info" className="mb-4">Gespeichert werden nur Abgleichswerte (verschlüsselter Hash) und eine maskierte Anzeige – kein Klartext-Name, keine Anschrift. Aufheben nur durch die Leitung bei irrtümlicher Erfassung (protokolliert).</Hinweis>
      <Sperrliste eintraege={r.eintraege} darfSchreiben={darfSchreiben(n, "geodaten") && darfSchreiben(n, "akquise")} leitung={unterrollen(n).includes("leitung")} />
    </div>
  );
}
