// /portal/energie – Energie & Lastgang (Fachprüfung Kapitalseite): Abnahmestellen mit MaLo/MeLo bzw. Zählpunkt,
// Liefervertrag und Entlastungen; Lastgang-Import mit Analyse, PV-Deckung und Pool-Ersparnis → Angebotsanfrage.
// Rolle „unternehmen“ (Backoffice liest mit ?nutzerId=).

import { Gauge, SunMedium } from "lucide-react";
import Button from "@/components/ui/Button";
import Begriff from "@/components/Portal/Bedienung/Begriff";
import { Hinweis, Karte, SeitenKopf } from "@/components/Portal/ui";
import Abnahmestellen from "@/components/Portal/Fach/Energie/Abnahmestellen";
import Lastgang from "@/components/Portal/Fach/Energie/Lastgang";
import { portalNutzer, laden, istAdmin } from "@/lib/plattform/server/seite";
import { fachBackend } from "@/lib/plattform/backend/fach";

export const metadata = { title: "Energie & Lastgang" };

export default async function EnergieSeite({ searchParams }) {
  const sp = await searchParams;
  const n = await portalNutzer({ rollen: ["unternehmen"] });
  const admin = istAdmin(n);
  const d = await laden(() => fachBackend().energieDaten(n, { nutzerId: admin ? sp?.nutzerId : undefined }));
  const eigen = n.rollen.includes("unternehmen") && !(admin && sp?.nutzerId);
  return (
    <div className="space-y-6">
      <SeitenKopf
        eyebrow="Reststrom-Pool & Contracting"
        titel="Energie & Lastgang"
        text="Ihre Abnahmestellen mit Mess- und Marktlokation, Liefervertrag und Entlastungen – und die Analyse Ihres Lastgangs: Spitze, Benutzungsstunden, Grundlast, Wochenprofil, PV-Potenzial und Ersparnis im Reststrom-Pool."
        aktionen={<Button href="/portal/anlagen" size="sm" variant="secondary" icon={SunMedium}>Mein Solarstrom</Button>}
      />
      <Hinweis ton="info" icon={Gauge} titel="Wofür wir diese Angaben brauchen">
        Für ein belastbares Angebot braucht der Pool die <Begriff id="marktlokation">Marktlokation</Begriff>, die Messart (<Begriff id="rlm">RLM</Begriff> oder <Begriff id="slp">SLP</Begriff>) und idealerweise den <Begriff id="lastgang">Lastgang</Begriff> der letzten zwölf Monate. Ihre Daten nutzen wir nur für Analyse und Angebot; die Zeitreihe verlässt das Portal nicht.
      </Hinweis>
      <Karte titel="Abnahmestellen" untertitel="Je Zähler bzw. Standort eine Abnahmestelle – Prüfung der Identifikatoren beim Speichern">
        {eigen ? <Abnahmestellen liste={d.abnahmestellen} /> : <p className="text-[14px] text-ink-600">{d.abnahmestellen.length} Abnahmestellen (nur lesen).</p>}
      </Karte>
      <Karte titel="Lastgang & Analyse" untertitel="CSV mit Viertelstunden- oder Stundenwerten – bis zu drei Jahre">
        <Lastgang lastgaenge={d.lastgaenge} abnahmestellen={d.abnahmestellen} unternehmen={eigen} />
      </Karte>
    </div>
  );
}
