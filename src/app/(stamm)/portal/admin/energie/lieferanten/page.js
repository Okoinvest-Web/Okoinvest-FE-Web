import { Karte, SeitenKopf, Badge } from "@/components/Portal/ui";
import { LieferantAktionen, LieferantNeu } from "@/components/Portal/Energie/Formulare";
import { DeskNavigation, Hinweis, StatusBadgeEnergie, Tabelle, datum, fmt } from "@/components/Portal/Energie/teile";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { energieBackend } from "@/lib/plattform/backend/energie";
import { darfSchreiben } from "@/lib/plattform/rechte";

export const metadata = { title: "Lieferantenstamm Energie" };

export default async function Lieferanten() {
  const n = await portalNutzer({ admin: true });
  const b = energieBackend();
  const schreiben = darfSchreiben(n, "energie");
  const [liste, ausschreibungen] = await Promise.all([laden(() => b.energieLieferanten(n)), laden(() => b.energieAusschreibungen(n, {}))]);
  const details = await Promise.all(liste.map((l) => laden(() => b.energieLieferant(n, l.id))));
  const offen = ausschreibungen.filter((a) => ["laufend", "entwurf"].includes(a.status)).map((a) => ({ id: a.id, titel: a.titel }));
  return (
    <>
      <SeitenKopf eyebrow="Backoffice · Energiebeschaffung" titel="Lieferantenstamm" text="Energieversorger in Deutschland und Österreich mit Ansprechpartnern, Bewertung, Teilnahmehistorie und KYB-Status. Portal-Konten entstehen nur über Einladung." />
      <DeskNavigation aktiv="lieferanten" />
      <Karte titel="Versorger" untertitel={`${liste.length} Einträge`} innen="p-0 md:p-2">
        <Tabelle
          kopf={["Versorger", "Gebiete", "Bewertung", "Einladungen", "Angebote", "Zuschläge", "Portal", "KYB"]}
          rechts={[2, 3, 4, 5]}
          zeilen={liste.map((l) => [
            <a key={l.id} href={`#${l.id}`} className="font-semibold text-ov-700 hover:text-ov-800">{l.name}</a>,
            l.gebiete.join(", "),
            l.sterne ? `${fmt(l.sterne, 1)} von 5` : "–",
            l.teilnahme.eingeladen,
            `${l.teilnahme.angebote}${l.teilnahme.quote !== null ? ` (${l.teilnahme.quote} %)` : ""}`,
            l.teilnahme.zuschlaege,
            l.konten.length ? `${l.konten.length} Konto` : "E-Mail",
            <Badge key="k" ton={l.kyb.verifiziert ? "ok" : "neutral"}>{l.kyb.verifiziert ? "verifiziert" : l.kyb.status}</Badge>,
          ])}
        />
      </Karte>
      {schreiben && (
        <Karte titel="Neuer Versorger" className="mt-6">
          <LieferantNeu />
        </Karte>
      )}
      <div className="mt-6 grid gap-6">
        {details.map((l) => (
          <Karte key={l.id} id={l.id} titel={l.name} untertitel={`${l.land} · liefert ${l.gebiete.join("/")}${l.demo ? " · Demo" : ""} · ${l.status}`}>
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="grid gap-4">
                <Tabelle kopf={["Ansprechpartner", "E-Mail", "Funktion"]} zeilen={l.ansprechpartner.map((x) => [x.name || "–", x.email || "–", x.funktion || "–"])} leer="Keine Ansprechpartner." />
                <p className="text-[13.5px] text-ink-700">Portal-Konten: {l.konten.length ? l.konten.map((k) => k.email).join(", ") : "keine – Einladung per E-Mail"}{l.offeneEinladungen.length ? ` · ${l.offeneEinladungen.length} offene Einladung(en)` : ""}</p>
                {l.notiz && <p className="text-[13.5px] text-ink-600">{l.notiz}</p>}
              </div>
              <div className="grid gap-4">
                <Tabelle kopf={["Teilnahme", "Status", "Runden", "Ergebnis"]} zeilen={l.historie.map((h) => [h.titel, <StatusBadgeEnergie key="s" status={h.status} />, h.runden.length ? h.runden.join(", ") : "kein Angebot", h.zuschlag ? "Zuschlag" : "–"])} leer="Noch keine Teilnahme." />
                <ul className="grid gap-1 text-[13px] text-ink-600">{l.bewertungen.slice(-3).map((x) => <li key={x.id}><strong>{x.sterne} von 5</strong> {x.text} <span className="text-ink-400">({x.von}, {datum(x.am)})</span></li>)}</ul>
              </div>
            </div>
            {schreiben && <div className="mt-5 border-t border-ink-100 pt-5"><LieferantAktionen l={l} ausschreibungen={offen} /></div>}
          </Karte>
        ))}
      </div>
      <div className="mt-6"><Hinweis>Versorger geben Angebote nur nach abgeschlossener KYB-Prüfung ab, sofern die Freigabe-Sperren aktiv sind (Compliance-Einstellungen). Zuschläge setzen die Verifizierung stets voraus, wenn das Gating aktiv ist.</Hinweis></div>
    </>
  );
}
