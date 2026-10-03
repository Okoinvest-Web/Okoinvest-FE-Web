// /portal/admin/grundbuch/[id] – Grundbuch-Akte: Schritte je Land (Status, Frist, Nachweis, Unterschrift über das
// Signatur-Modul), Kostenschätzung, Muster-Dokumente, Stammdaten, Verlauf.
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Angaben, Badge, Hinweis, Karte, SeitenKopf } from "@/components/Portal/ui";
import GrundbuchSchritte from "@/components/Portal/Closing/GrundbuchSchritte";
import { GrundbuchStammdaten } from "@/components/Portal/Closing/GrundbuchFormulare";
import { KostenTabelle, MusterLinks, StatusBadgeGb } from "@/components/Portal/Closing/GrundbuchAnzeige";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { closingBackend } from "@/lib/plattform/backend/closing";
import { datumZeit } from "@/lib/plattform/format";

export const metadata = { title: "Grundbuch-Akte" };

export default async function GrundbuchAkteSeite({ params }) {
  const n = await portalNutzer({ admin: true });
  const { id } = await params;
  const a = await laden(() => closingBackend().gbAkte(n, id));
  const g = a.grundstueck || {};
  return (
    <>
      <Link href="/portal/admin/grundbuch" className="mb-3 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-ink-600 hover:text-ov-700"><ArrowLeft aria-hidden="true" className="h-4 w-4" /> Grundbuch & Dienstbarkeiten</Link>
      <SeitenKopf
        eyebrow={`Grundbuch · ${a.landLabel} · ${a.objektArtLabel}`}
        titel={a.titel}
        text={[a.id, a.rechtLabel, a.eigentuemerName].filter(Boolean).join(" · ")}
        aktionen={<div className="flex flex-wrap items-center gap-2">{a.ueberfaellig > 0 && <Badge ton="warn">{a.ueberfaellig} Frist(en) überschritten</Badge>}<StatusBadgeGb status={a.status} label={a.statusLabel} /></div>}
      />
      {a.abgebrochen && <Hinweis ton="warn" className="mb-5">Diese Akte ist abgebrochen. Schritte können erst nach Wiederaufnahme bearbeitet werden.</Hinweis>}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-6">
          <Karte titel="Schritte" untertitel={`${a.fortschritt.erledigt} von ${a.fortschritt.gesamt} erledigt${a.naechster ? ` · nächster Schritt: ${a.naechster.label}` : ""}`}>
            <GrundbuchSchritte akte={JSON.parse(JSON.stringify(a))} schreiben={a.darfBearbeiten} />
          </Karte>
          <Karte titel="Grundstück & Beteiligte">
            <Angaben items={[
              { label: "Bezug", wert: a.bezug ? <Link href={a.bezug.link} className="font-semibold text-ov-700 hover:text-ov-800">{a.bezug.titel}</Link> : "ohne Bezug" },
              { label: "Vertrag", wert: a.vertragBezug },
              { label: a.land === "AT" ? "KG / EZ" : a.land === "CH" ? "Grundbuch" : "Grundbuch / Blatt", wert: g.grundbuch || "–" },
              { label: a.land === "AT" ? "Grundstücke" : a.land === "CH" ? "Parzellen" : "Flurstücke", wert: g.flurstuecke || "–" },
              { label: "Gebäude / Dach", wert: g.gebaeude },
              { label: "Eigentümer/in", wert: `${a.eigentuemerName || "–"}${a.eigentuemerAnzahl > 1 ? ` (${a.eigentuemerAnzahl} Unterschriften)` : ""}` },
              { label: "Portal-Konto", wert: a.eigentuemerId ? "vorhanden – sieht die Akte im Portal" : "keins (Unterschrift nur per Upload)" },
              { label: "Berechtigte/r", wert: a.berechtigter },
              { label: "Grundpfandgläubiger", wert: (a.pfandglaeubiger || []).map((x) => [x.name, x.recht].filter(Boolean).join(" – ")).join("; ") || "keine angegeben" },
              { label: "Laufzeit", wert: `${a.laufzeitJahre} Jahre ab ${a.laufzeitBeginn || "Inbetriebnahme"}` },
            ]} />
          </Karte>
          {a.darfBearbeiten && (
            <Karte titel="Stammdaten bearbeiten">
              <GrundbuchStammdaten akte={JSON.parse(JSON.stringify(a))} />
            </Karte>
          )}
        </div>
        <div className="min-w-0 space-y-6">
          <Karte titel="Muster-Dokumente" untertitel="PDF – zur Prüfung durch Rechtsanwalt bzw. Notar">
            <MusterLinks akte={a} />
            <p className="mt-3 text-[12px] leading-snug text-ink-500">In Frappe zusätzlich als Druckformate (Jinja) an „Plattform Grundbuch Vorgang“.</p>
          </Karte>
          <Karte titel="Kostenschätzung" untertitel="Orientierung mit Quelle">
            <KostenTabelle kosten={a.kosten} />
          </Karte>
          <Karte titel="Verlauf">
            {a.verlauf.length ? (
              <ol className="space-y-2.5 text-[13.5px]">
                {[...a.verlauf].reverse().slice(0, 30).map((x, i) => <li key={i}><span className="text-ink-500">{datumZeit(x.am)}</span><br /><span className="text-ink-800">{x.text}</span></li>)}
              </ol>
            ) : <p className="text-[14px] text-ink-500">Noch keine Einträge.</p>}
          </Karte>
        </div>
      </div>
    </>
  );
}
