// /portal/eg/[id]/verwaltung – Einstieg der Organe (Obmann/Vorstand, Kassier, Schriftführung, Rechnungsprüfung) in ihre
// Gemeinschaft: offene Aufgaben (Aufnahmen, Zustimmungen beim Netzbetreiber), Kennzahlen, Mitgliederliste (Details je Recht),
// Organe, Tarife mit Vorschlag/Beschluss. Rechte je Kontext-Rolle (eg/rechte.js); ohne Rolle 404. WP1.

import { CalendarClock, ClipboardCheck, Factory, ReceiptText, ShieldCheck, SlidersHorizontal, Users } from "lucide-react";
import { Badge, Hinweis, Karte, Kennzahl, Leer, SeitenKopf, Tabelle, zelle } from "@/components/Portal/ui";
import { Klappe } from "@/components/Portal/Mitglied/teile";
import EgReiter from "@/components/Portal/EG/Stamm/EgReiter";
import { OrganNeu, TarifNeu } from "@/components/Portal/EG/Stamm/Formulare";
import { MitgliederTabelle } from "@/components/Portal/EG/Stamm/Mitglieder";
import { AufnahmeKnoepfe } from "@/components/Portal/EG/Stamm/Aufnahme";
import { EdaFreigaben } from "@/components/Portal/EG/Eda/EdaAktionen";
import TfWuensche from "@/components/Portal/EG/Mitglied/TfWuensche";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { egBackend } from "@/lib/plattform/backend/eg";
import { GEMEINSCHAFT_STATUS, TARIF_STATUS, TEILNAHME_STATUS } from "@/lib/plattform/eg/modell";
import { datum } from "@/lib/plattform/format";

export const metadata = { title: "Verwaltung der Energiegemeinschaft" };
const zahl = (x, s = 0) => (x === null || x === undefined ? "–" : Number(x).toLocaleString("de-DE", { maximumFractionDigits: s }));

export default async function Verwaltung({ params }) {
  const n = await portalNutzer();
  const { id } = await params;
  const d = await laden(() => egBackend().egVerwaltung(n, id));
  const g = d.gemeinschaft;
  const r = d.rechte;
  const url = `/api/portal/eg/${g.id}/verwaltung`;
  const z = g.kennzahlen;
  // Vier-Augen-Freigaben (WP2, Vorstand) und TF-Wünsche der Mitglieder (WP6) – Nachbarpakete fehlertolerant lesen
  const eda = r.eda_freigeben >= 1 ? await egBackend().edaFreigaben(n, g.id).catch(() => null) : null;
  const tfw = r.mitgliederliste >= 1 ? await egBackend().ptTfWuensche(n, g.id).catch(() => null) : null;
  return (
    <div className="space-y-6">
      <SeitenKopf eyebrow={`Verwaltung · ${d.rollenLabels.join(", ")}`} titel={g.name} text={`${g.modellLabel} · ${g.zonelevelLabel} · ${g.netzbetreiberNamen.join(", ")}`}>
        <div className="mt-3"><Badge ton={GEMEINSCHAFT_STATUS[g.status]?.ton}>{g.statusLabel}</Badge></div>
      </SeitenKopf>
      <EgReiter gemeinschaftId={g.id} aktiv="verwaltung" art="organ" rechte={r} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kennzahl label="Aktive Mitglieder" wert={zahl(z.mitgliederAktiv)} hinweis={z.mitgliederOffen ? `${z.mitgliederOffen} Anträge offen` : undefined} icon={Users} />
        <Kennzahl label="Aktive Zählpunkte" wert={zahl(z.zaehlpunkteAktiv)} hinweis={`${z.teilnahmenOffen} in Anmeldung`} icon={ClipboardCheck} />
        <Kennzahl label="Erzeugungsleistung" wert={`${zahl(z.erzeugungsleistungKw, 1)} kW`} hinweis={z.lieferantenpflichten ? "§ 69 ElWG: Lieferantenpflichten" : undefined} icon={Factory} />
        <Kennzahl label="Tarif" wert={g.tarifAktuell ? `${zahl(g.tarifAktuell.bezugspreisCt, 2)} ct` : "–"} hinweis={g.tarifAktuell ? `Einspeisung ${zahl(g.tarifAktuell.einspeisepreisCt, 2)} ct/kWh` : "kein gültiger Tarif"} icon={ReceiptText} />
      </div>

      <Karte titel="Zu erledigen" aktion={<CalendarClock aria-hidden="true" className="h-5 w-5 text-ov-600" />}>
        {d.aufgaben.length ? (
          <ul className="divide-y divide-ink-100">
            {d.aufgaben.map((a, i) => (
              <li key={i} className="flex flex-wrap items-center justify-between gap-3 py-3 text-[14.5px] text-ink-800">
                <span>{a.text}</span>
                {a.art === "aufnahme" && r.mitglied_aufnehmen >= 2 && <AufnahmeKnoepfe mitgliedId={a.mitgliedId} url={url} />}
              </li>
            ))}
          </ul>
        ) : <Leer titel="Alles erledigt" text="Keine offenen Aufnahmen oder Zustimmungen." />}
      </Karte>

      {eda && (
        <Karte titel="Freigaben (Vier-Augen)" untertitel="Massenänderungen beim Netzbetreiber – Abmeldungen und Teilnahmefaktoren" aktion={<ShieldCheck aria-hidden="true" className="h-5 w-5 text-ov-600" />}>
          <EdaFreigaben gemeinschaftId={g.id} freigaben={eda.freigaben} darf={eda.darfFreigeben} />
        </Karte>
      )}

      {tfw && tfw.wuensche.length > 0 && (
        <Karte titel="Wünsche zum Teilnahmefaktor" untertitel="Von Mitgliedern im Portal gestellt" aktion={<SlidersHorizontal aria-hidden="true" className="h-5 w-5 text-ov-600" />}>
          <TfWuensche gemeinschaftId={g.id} wuensche={tfw.wuensche} darfAusloesen={tfw.darfAusloesen} ab={tfw.ab} />
        </Karte>
      )}

      {d.hinweise.length > 0 && <Hinweis ton={d.hinweise.some((h) => h.stufe === "fehler") ? "warn" : "info"} titel="Hinweise"><ul className="list-disc space-y-1 pl-5">{d.hinweise.map((h, i) => <li key={i}>{h.text}</li>)}</ul></Hinweis>}

      <Karte titel="Teilnahmen nach Status">
        <div className="flex flex-wrap gap-2">{Object.entries(d.teilnahmenStatus).map(([s, k]) => <Badge key={s} ton={TEILNAHME_STATUS[s]?.ton}>{TEILNAHME_STATUS[s]?.label}: {k}</Badge>)}</div>
      </Karte>

      <Karte titel="Mitglieder" untertitel={r.stammdaten >= 1 ? "mit Zählpunkten und Teilnahmen" : "Name und Status"} aktion={<Users aria-hidden="true" className="h-5 w-5 text-ov-600" />}>
        <MitgliederTabelle mitglieder={d.mitglieder} teilnahmen={d.teilnahmen || []} zaehlpunkte={d.zaehlpunkte || []} rechte={r} url={url} exportUrl={url} />
      </Karte>

      <Karte titel="Organe">
        <Tabelle kopf={["Funktion", "Person", "Periode"]}>
          {d.organe.map((o) => <tr key={o.id} className={o.wirksam ? "" : "text-ink-400"}><td className={zelle}>{o.funktionLabel}</td><td className={zelle}>{o.personName}</td><td className={zelle}>{datum(o.von)}–{o.bis ? datum(o.bis) : "offen"}</td></tr>)}
        </Tabelle>
        {r.organe_statuten >= 2 && <div className="mt-4"><Klappe titel="Funktion eintragen (nach Wahl in der Versammlung)"><OrganNeu url={url} /></Klappe></div>}
      </Karte>

      <Karte titel="Tarife" untertitel={r.tarife >= 2 ? "Beschluss durch den Vorstand bzw. die Generalversammlung" : "Vorschläge an den Vorstand"}>
        <ul className="space-y-1 text-[14px] text-ink-700">
          {d.tarife.map((t) => <li key={t.id}>{t.bezeichnung}: {zahl(t.bezugspreisCt, 4)} / {zahl(t.einspeisepreisCt, 4)} ct/kWh ab {datum(t.gueltigAb)} · {TARIF_STATUS[t.status]}</li>)}
        </ul>
        {r.tarife >= 1 && <div className="mt-4"><Klappe titel={r.tarife >= 2 ? "Neuen Tarif beschließen" : "Tarif vorschlagen"}><TarifNeu url={url} vorlage={g.tarifAktuell} darfBeschluss={r.tarife >= 2} /></Klappe></div>}
      </Karte>
    </div>
  );
}
