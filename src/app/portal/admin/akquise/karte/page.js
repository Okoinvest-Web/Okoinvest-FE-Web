import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import AkquiseKarte from "@/components/Portal/Geodaten/AkquiseKarte";
import { portalNutzer } from "@/lib/plattform/server/seite";
import { darfSchreiben } from "@/lib/plattform/rechte";
import { geodatenModus } from "@/lib/plattform/geodaten";

export const metadata = { title: "Akquise-Karte" };

// Akquise-Cockpit mit Karte: nur Backoffice-Unterrollen mit Bereich „geodaten“ (Leitung, Akquise) – sonst 404.
export default async function AkquiseKarteSeite() {
  const n = await portalNutzer({ admin: true });
  const modus = geodatenModus();
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[12.5px] font-semibold uppercase tracking-wide text-ov-700">Backoffice · Akquise</p>
          <h1 className="font-display text-[24px] font-bold text-ink-900 md:text-[28px]">Akquise-Karte</h1>
          <p className="text-[14px] text-ink-600 sm:hidden">Kandidatenflächen mit Score, Netzanschluss und Schutzgebieten.{modus === "demo" && " Demo-Daten."}</p>
          <p className="hidden max-w-3xl text-[14px] text-ink-600 sm:block">
            Kandidatenflächen aus Kataster, Schlägen, Gelände und Schutzgebieten – bewertet nach Größe, Form, Neigung, Nutzung, Abstand, Netzanschluss (Trasse und Kosten) und Widmungslage.
            {modus === "demo" && " Demo-Betrieb: synthetische Parzellen rund um Braunau/Innviertel, Umspannwerke aus OpenStreetMap."}
          </p>
        </div>
        <Link href="/portal/admin/akquise" className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-ov-700 hover:text-ov-800">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Akquise-Pipeline
        </Link>
      </div>
      {modus ? (
        <AkquiseKarte darfSchreiben={darfSchreiben(n, "geodaten") && darfSchreiben(n, "akquise")} />
      ) : (
        <p className="rounded-3xl bg-white p-6 text-[14px] text-ink-700 ring-1 ring-ink-200">Der Geodaten-Dienst ist nicht konfiguriert (GEODATEN_URL, GEODATEN_TOKEN – siehe docs/AKQUISE-GEODATEN.md).</p>
      )}
    </div>
  );
}
