import { Coins, Gauge, Map as KarteIcon, Sparkles, Trophy, Zap } from "lucide-react";
import Button from "@/components/ui/Button";
import { Hinweis, Karte, Kennzahl, Leer, SeitenKopf } from "@/components/Portal/ui";
import Kanban from "@/components/Portal/Dealroom/Kanban";
import Suchprofile from "@/components/Portal/Dealroom/Suchprofile";
import { Verteilung } from "@/components/Portal/Dealroom/Diagramme";
import { portalNutzer } from "@/lib/plattform/server/seite";
import { dealroom } from "@/lib/plattform/backend/dealroom";
import { LAENDER, PROJEKT_TYPEN } from "@/lib/plattform/konstanten";
import { PHASEN } from "@/lib/invest/markt";
import { fmt } from "@/lib/rechner/annahmen";

export const metadata = { title: "Deal-Pipeline" };

export default async function Pipeline() {
  const n = await portalNutzer({ rollen: ["investor"] });
  const pl = await dealroom().pipeline(n);
  const k = pl.kennzahlen;
  const verteilung = (obj, labels, reihenfolge) =>
    Object.entries(obj)
      .map(([id, x]) => ({ id, label: labels(id), wert: x.mwp, text: `${x.anzahl} ${x.anzahl === 1 ? "Projekt" : "Projekte"}` }))
      .sort((a, b) => (reihenfolge ? reihenfolge.indexOf(a.id) - reihenfolge.indexOf(b.id) : b.wert - a.wert));

  return (
    <div className="space-y-6">
      <SeitenKopf
        eyebrow="Investor"
        titel="Deal-Pipeline"
        text="Alle Projekte von „Beobachten“ bis „Gewonnen“ – mit privaten Notizen, Tags, eigenen Suchprofilen und Portfolio-Kennzahlen."
        aktionen={
          <>
            <Button href="/portal/boerse" variant="secondary" size="sm" icon={Sparkles}>Projektbörse</Button>
            <Button href="/portal/boerse/karte" variant="secondary" size="sm" icon={KarteIcon}>Karte</Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kennzahl label="MWp in der Pipeline" wert={fmt(k.mwpPipeline, k.mwpPipeline < 100 ? 1 : 0)} hinweis={`${k.aktiv} aktive ${k.aktiv === 1 ? "Projekt" : "Projekte"}`} icon={Zap} ton="dunkel" />
        <Kennzahl label="Ø Preis je kWp" wert={k.preisProKwpMittel ? `${fmt(k.preisProKwpMittel)} €` : "–"} hinweis={k.preisBasis ? `gewichtet über ${k.preisBasis} Projekte mit Preisangabe` : "keine Preisangaben"} icon={Coins} />
        <Kennzahl label="Gewonnen" wert={fmt(k.gewonnen)} hinweis={k.mwpGewonnen ? `${fmt(k.mwpGewonnen, 1)} MWp gekauft` : "noch kein Abschluss"} icon={Trophy} />
        <Kennzahl label="Suchprofile" wert={fmt(pl.suchprofile.length)} hinweis={`${pl.suchprofile.reduce((s, p) => s + p.treffer, 0)} Treffer in der Börse`} icon={Gauge} />
      </div>

      {pl.karten.length ? (
        <Karte titel="Deal-Kanban" untertitel="Spalte aus dem Status Ihres Interesses – eigene Einordnung per Ziehen oder Auswahlfeld (nur für Sie).">
          <Kanban karten={pl.karten} tags={pl.tags} />
        </Karte>
      ) : (
        <Leer icon={Sparkles} titel="Noch keine Projekte in der Pipeline" text="Merken Sie Projekte in der Börse oder fragen Sie per Klick-NDA den Datenraum an – sie erscheinen dann hier." aktion={<Button href="/portal/boerse" size="sm">Zur Projektbörse</Button>} />
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Karte titel="Länder" untertitel="MWp aktiver Deals">
          <Verteilung eintraege={verteilung(k.laender, (id) => LAENDER[id] || id)} leer="Noch keine aktiven Deals." />
        </Karte>
        <Karte titel="Phasen" untertitel="MWp aktiver Deals">
          <Verteilung eintraege={verteilung(k.phasen, (id) => PHASEN.find((p) => p.id === id)?.label || id, PHASEN.map((p) => p.id))} leer="Noch keine aktiven Deals." />
        </Karte>
        <Karte titel="Projekttypen" untertitel="MWp aktiver Deals">
          <Verteilung eintraege={verteilung(k.typen, (id) => PROJEKT_TYPEN[id] || id)} leer="Noch keine aktiven Deals." />
        </Karte>
      </div>

      <Karte titel="Gespeicherte Suchprofile" untertitel="Mehrere Profile parallel – eines davon kann Ihr Alarm-Profil für neue Projekte sein.">
        <Suchprofile profile={pl.suchprofile} />
        {n.suchprofil && <Hinweis ton="neutral" className="mt-4">Alarm-Profil am Konto: {n.suchprofil.benachrichtigen ? `aktiv ab ${n.suchprofil.schwelle || 70} % Passung` : "ohne Benachrichtigung"} – bearbeiten unter „Profil & Suchprofil“.</Hinweis>}
      </Karte>
    </div>
  );
}
