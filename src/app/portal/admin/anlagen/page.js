import Link from "next/link";
import { BellRing, CalendarClock, Plug, Plus, ShieldAlert, SunMedium, TriangleAlert } from "lucide-react";
import Button from "@/components/ui/Button";
import { Karte, SeitenKopf } from "@/components/Portal/ui";
import StoerungenListe from "@/components/Portal/Anlagen/StoerungenListe";
import { AmpelBadge, Wert } from "@/components/Portal/Anlagen/teile";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { anlagenBackend } from "@/lib/plattform/backend/anlagen";
import { anlagenMitStatus } from "@/lib/plattform/messdaten/auswertung";
import { darfSchreiben } from "@/lib/plattform/rechte";
import { kw, kwh, kwpText } from "@/lib/plattform/anlagen";

export const metadata = { title: "Anlagen & Störungen" };

export default async function AnlagenLeitstandSeite() {
  const n = await portalNutzer({ admin: true });
  const b = anlagenBackend();
  // Übersicht zuerst: bildet im Demo-Betrieb die Störungsregeln nach, der Leitstand zeigt danach den aktuellen Stand
  const uebersicht = await laden(() => anlagenMitStatus(n));
  const [leitstand, alle, kunden] = await Promise.all([laden(() => b.anlagenLeitstand(n)), laden(() => b.stoerungen(n, { status: "alle", limit: 300 })), b.anlagenKunden(n).catch(() => ({ betrieb: [] }))]);
  const z = leitstand.zaehler;
  const schreiben = darfSchreiben(n, "anlagen");

  return (
    <>
      <SeitenKopf
        eyebrow="Backoffice · Betrieb"
        titel="Anlagen & Störungen"
        text="Störungs-Leitstand über alle Contracting-Anlagen, sortiert nach Priorität (Schwere, Alter, unquittiert). Anlagen anlegen, Kunden zuordnen und Datenlogger verbinden."
        aktionen={
          <>
            <Button href="/portal/anlagen" size="sm" variant="secondary" icon={SunMedium}>Monitoring aller Anlagen</Button>
            {schreiben && <Button href="/portal/admin/anlagen/neu" size="sm" icon={Plus}>Anlage anlegen</Button>}
          </>
        }
      />
      <section aria-label="Kennzahlen" className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Wert ton="dunkel" icon={TriangleAlert} label="Offene Störungen" wert={String(z.offen + z.inArbeit)} hinweis={`${z.inArbeit} in Arbeit`} />
        <Wert icon={BellRing} label="Unquittiert" wert={String(z.unquittiert)} />
        <Wert icon={ShieldAlert} label="Hoch / kritisch" wert={String(z.kritisch)} />
        <Wert icon={Plug} label="Geräte ohne Nachricht" wert={String(z.geraeteWartend)} />
        <Wert icon={CalendarClock} label="Wartungen ≤ 14 Tage" wert={String(z.wartungenFaellig)} />
        <Wert icon={SunMedium} label="Anlagen" wert={String(z.anlagen)} hinweis={`${uebersicht.ampeln.laeuft} laufen · ${uebersicht.ampeln.offline} offline`} />
      </section>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Karte titel="Störungs-Leitstand" untertitel="Quittieren, zuweisen, Status setzen – Kunden sehen Status und öffentliche Kommentare">
          <StoerungenListe stoerungen={alle} betrieb={kunden.betrieb || []} mitAnlage leer="Keine Störungen – alle Anlagen laufen." />
        </Karte>
        <Karte titel="Anlagen" untertitel={`${uebersicht.anlagen.length} Anlagen · ${kwpText(uebersicht.summe.kwp)} · jetzt ${kw(uebersicht.summe.leistungKw)}`} innen="p-0">
          <ul className="divide-y divide-ink-100">
            {uebersicht.anlagen.map((a) => (
              <li key={a.id} className="flex items-start justify-between gap-3 px-5 py-3.5 md:px-6">
                <div className="min-w-0">
                  <Link href={`/portal/anlagen/${a.id}`} className="block truncate font-semibold text-ink-900 hover:text-ov-700">{a.name}</Link>
                  <p className="truncate text-[12.5px] text-ink-500">{a.organisation?.name || a.kunde?.firma || "ohne Kunde"} · {a.typLabel} · heute {kwh(a.heute?.erzeugungKwh)}</p>
                  {schreiben && <Link href={`/portal/admin/anlagen/${a.id}`} className="text-[12.5px] font-semibold text-ov-700 hover:text-ov-800">Stammdaten & Geräte</Link>}
                </div>
                <AmpelBadge id={a.ampel.id} grund={a.ampel.grund} klein />
              </li>
            ))}
          </ul>
        </Karte>
      </div>
    </>
  );
}
