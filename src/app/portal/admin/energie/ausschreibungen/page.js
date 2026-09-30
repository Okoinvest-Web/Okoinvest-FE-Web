import Link from "next/link";
import { Karte, SeitenKopf } from "@/components/Portal/ui";
import { AusschreibungNeu } from "@/components/Portal/Energie/Formulare";
import { DeskNavigation, Hinweis, StatusBadgeEnergie, Tabelle, datumZeit, fmt, monatText } from "@/components/Portal/Energie/teile";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { energieBackend } from "@/lib/plattform/backend/energie";
import { RECHTSHINWEISE } from "@/lib/plattform/energie/texte";
import { darfSchreiben } from "@/lib/plattform/rechte";

export const metadata = { title: "Ausschreibungen Strom" };

export default async function Ausschreibungen() {
  const n = await portalNutzer({ admin: true });
  const b = energieBackend();
  const schreiben = darfSchreiben(n, "energie");
  const [liste, kunden, lieferanten, e] = await Promise.all([laden(() => b.energieAusschreibungen(n, {})), laden(() => b.energieKunden(n)), laden(() => b.energieLieferanten(n)), laden(() => b.energieEinstellungen(n))]);
  return (
    <>
      <SeitenKopf eyebrow="Backoffice · Energiebeschaffung" titel="Ausschreibungen" text="Bieterwettbewerb unter Energieversorgern: anonymisiertes Los (ein Kunde oder Pool), Produktvarianten, verdeckte Angebote in Runden, normierter Vergleich auf das Kundenprofil, Zuschlag erst nach Kundenfreigabe." />
      <DeskNavigation aktiv="ausschreibungen" />
      <Karte titel="Laufende und abgeschlossene Ausschreibungen" innen="p-0 md:p-2">
        <Tabelle
          kopf={["Ausschreibung", "Kunden", "Menge", "Lieferbeginn", "Runde / Frist", "Angebote", "bester Preis", "Status"]}
          rechts={[2, 5, 6]}
          zeilen={liste.map((a) => [
            <div key={a.id}>
              <Link href={`/portal/admin/energie/ausschreibungen/${a.id}`} className="font-semibold text-ov-700 hover:text-ov-800">{a.titel}</Link>
              <p className="text-[12px] text-ink-500">{a.los} · {a.zone}</p>
            </div>,
            a.kunden.join(", "),
            `${fmt(a.mengeMwh)} MWh`,
            monatText(a.lieferbeginn),
            a.runde ? `R${a.runde.nr} · ${datumZeit(a.runde.frist)}` : "–",
            a.runde ? `${a.angebote}/${a.runde.eingeladen}` : "–",
            a.besterCt ? `${fmt(a.besterCt, 3)} ct` : "–",
            <StatusBadgeEnergie key="s" status={a.status} />,
          ])}
          leer="Noch keine Ausschreibung."
        />
      </Karte>
      {schreiben && (
        <Karte titel="Neue Ausschreibung" untertitel="Kunden mit aktiver Beschaffungsvollmacht wählen; Versorger ohne Portal-Konto erhalten eine E-Mail mit Angebotslink" className="mt-6">
          <AusschreibungNeu kunden={kunden} lieferanten={lieferanten} standardRegel={e.einstellungen.bestpreisRegelStandard} />
        </Karte>
      )}
      <div className="mt-6 grid gap-3">
        <Hinweis>{RECHTSHINWEISE.privat}</Hinweis>
        <Hinweis ton="warn">{RECHTSHINWEISE.vergaberecht}</Hinweis>
      </div>
    </>
  );
}
