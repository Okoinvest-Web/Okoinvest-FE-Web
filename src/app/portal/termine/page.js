import { CalendarDays } from "lucide-react";
import { Karte, Leer, SeitenKopf } from "@/components/Portal/ui";
import TerminBuchen from "@/components/Portal/Termine/TerminBuchen";
import TerminListe from "@/components/Portal/Termine/TerminListe";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { serviceBackend } from "@/lib/plattform/backend/service";
import { TERMIN_ARTEN, TERMIN_ART_IDS } from "@/lib/plattform/termine";

export const metadata = { title: "Termine" };

export default async function TermineSeite({ searchParams }) {
  const n = await portalNutzer();
  const sp = await searchParams;
  const termine = await laden(() => serviceBackend().termine(n, {}));
  const jetzt = Date.now();
  const eigene = termine.filter((t) => !t.mitarbeiter?.id || t.mitarbeiter.id !== n.id);
  const kommend = eigene.filter((t) => new Date(t.ende).getTime() >= jetzt && ["gebucht", "bestaetigt"].includes(t.status));
  const vergangen = eigene.filter((t) => !kommend.includes(t)).reverse().slice(0, 12);
  const arten = TERMIN_ART_IDS.filter((a) => TERMIN_ARTEN[a].oeffentlich || n.rollen.includes("admin") || (TERMIN_ARTEN[a].rollen || []).some((r) => n.rollen.includes(r)));

  return (
    <>
      <SeitenKopf eyebrow="Termine" titel="Termine & Besichtigungen" text="Besichtigung Ihrer Fläche, Beratung per Telefon oder Video, Termine mit der Gemeinde und Datenraum-Sessions – freie Zeiten wählen, Bestätigung mit Kalenderdatei per E-Mail." />
      <div className="space-y-6">
        <section aria-labelledby="t-kommend">
          <h2 id="t-kommend" className="mb-3 font-display text-[18px] font-bold text-ink-900">Kommende Termine</h2>
          <TerminListe termine={kommend} leer={<Leer icon={CalendarDays} titel="Keine kommenden Termine" text="Buchen Sie unten einen freien Termin – Sie erhalten sofort eine Bestätigung mit Kalenderdatei." />} />
        </section>
        <Karte titel="Neuen Termin buchen" untertitel="Alle Zeiten in mitteleuropäischer Zeit (Wien/Berlin)">
          <TerminBuchen arten={arten} startArt={sp?.art} />
        </Karte>
        {vergangen.length > 0 && (
          <section aria-labelledby="t-vergangen">
            <h2 id="t-vergangen" className="mb-3 font-display text-[18px] font-bold text-ink-900">Vergangene und abgesagte Termine</h2>
            <TerminListe termine={vergangen} />
          </section>
        )}
      </div>
    </>
  );
}
