// /portal/ausschreibungen – Versorger-Portal (Rolle „lieferant“): nur Ausschreibungen, zu denen der Versorger eingeladen ist.

import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText } from "lucide-react";
import { Karte, Leer, SeitenKopf } from "@/components/Portal/ui";
import { Hinweis, StatusBadgeEnergie, Tabelle, datumZeit, fmt, monatText } from "@/components/Portal/Energie/teile";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { energieBackend } from "@/lib/plattform/backend/energie";
import { LIEFERANT_BEDINGUNGEN } from "@/lib/plattform/energie/texte";

export const metadata = { title: "Angebotsanfragen Strom" };

const ERGEBNIS = { zuschlag: "Zuschlag", absage: "Absage", ohne_angebot: "ohne Angebot", abgebrochen: "abgebrochen" };

export default async function LieferantAusschreibungen() {
  const n = await portalNutzer({ rollen: ["lieferant"] });
  if (n.rollen.includes("admin")) redirect("/portal/admin/energie/ausschreibungen");
  const liste = await laden(() => energieBackend().energieAusschreibungen(n, {}));
  return (
    <>
      <SeitenKopf eyebrow="Versorger-Portal" titel="Angebotsanfragen" text="Ausschreibungen von ÖkoInvest für Gewerbe- und Industriekunden (einzeln oder im Pool), zu denen Sie eingeladen sind – mit anonymisiertem Lastprofil, Preisblatt, Fristen und Fragen." />
      {liste.length ? (
        <Karte titel="Ihre Einladungen" innen="p-0 md:p-2">
          <Tabelle
            kopf={["Los", "Lieferbeginn", "Menge", "Runde / Frist", "Ihre Angebote", "Status"]}
            rechts={[2, 4]}
            zeilen={liste.map((a) => [
              <div key={a.id}>
                <Link href={`/portal/ausschreibungen/${a.id}`} className="font-semibold text-ov-700 hover:text-ov-800">{a.los}</Link>
                <p className="text-[12px] text-ink-500">{a.titel}</p>
              </div>,
              monatText(a.lieferbeginn),
              a.jahresMengeMwh ? `${fmt(a.jahresMengeMwh)} MWh` : "–",
              a.runde ? `R${a.runde.nr} · ${datumZeit(a.runde.frist)}${a.darfBieten ? " · offen" : ""}` : "–",
              a.eigeneAngebote,
              a.ergebnis ? ERGEBNIS[a.ergebnis] || a.ergebnis : <StatusBadgeEnergie key="s" status={a.status} />,
            ])}
          />
        </Karte>
      ) : (
        <Leer icon={FileText} titel="Noch keine Angebotsanfragen" text="Sobald ÖkoInvest Sie zu einer Ausschreibung einlädt, erscheint sie hier. Sie erhalten zusätzlich eine E-Mail." />
      )}
      <div className="mt-6">
        <Hinweis>
          <span className="whitespace-pre-line">{LIEFERANT_BEDINGUNGEN}</span>
        </Hinweis>
      </div>
    </>
  );
}
