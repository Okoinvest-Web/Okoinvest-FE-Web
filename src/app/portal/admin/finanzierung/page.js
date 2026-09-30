import Link from "next/link";
import { AlertTriangle, Banknote, Building, Calculator, FilePlus2, FolderKanban, Gauge, Landmark, Scale } from "lucide-react";
import { Badge, Karte, Leer, SeitenKopf } from "@/components/Portal/ui";
import Reiter from "@/components/Portal/Anlagen/Reiter";
import { Wert } from "@/components/Portal/Anlagen/teile";
import { AmpelBadge, teur, datumDe } from "@/components/Portal/Finanzierung/teile";
import { BankFormular, FallAnlegen, GeschaeftsmodellRechner, KnopfAktion } from "@/components/Portal/Finanzierung/Aktionen";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { finanzierungBackend } from "@/lib/plattform/backend/finanzierung";
import { FALL_STATUS } from "@/lib/plattform/finanzierung/bank";
import { cockpitStandard } from "@/lib/plattform/finanzierung/kern";

export const metadata = { title: "Finanzierung & Banken" };

const REITER = [
  { id: "uebersicht", label: "Finanzierungsfälle", icon: FolderKanban },
  { id: "neu", label: "Fall anlegen", icon: FilePlus2 },
  { id: "banken", label: "Bankenstamm", icon: Landmark },
  { id: "geschaeftsmodell", label: "Geschäftsmodell-Vergleich", icon: Scale },
];

export default async function FinanzierungBackofficeSeite({ searchParams }) {
  const n = await portalNutzer({ admin: true });
  const sp = (await searchParams) || {};
  const tab = REITER.some((r) => r.id === sp.tab) ? sp.tab : "uebersicht";
  const b = finanzierungBackend();
  const u = await laden(() => b.fzUebersicht(n));
  const k = u.kennzahlen;

  let inhalt = null;
  if (tab === "uebersicht") {
    inhalt = (
      <>
        <section aria-label="Kennzahlen" className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Wert ton="dunkel" icon={FolderKanban} label="Aktive Fälle" wert={String(k.faelleAktiv)} />
          <Wert icon={Banknote} label="Angefragtes Volumen" wert={teur(k.volumenAngefragt)} />
          <Wert icon={Landmark} label="Kreditvolumen (Verträge)" wert={teur(k.kreditvolumen)} />
          <Wert icon={AlertTriangle} label="Covenant rot" wert={String(k.ampelRot)} />
          <Wert icon={Gauge} label="Frühwarnung" wert={String(k.ampelGelb)} />
          <Wert icon={Calculator} label="Reporting fällig (14 Tage)" wert={String(k.reportingFaellig)} />
        </section>
        <Karte titel="Finanzierungsfälle" untertitel={`Covenant-Prüfung täglich (zuletzt ${u.covenantLaufAm ? new Date(u.covenantLaufAm).toLocaleString("de-DE") : "noch nie"})`} aktion={u.darfSchreiben ? <KnopfAktion url="/api/admin/finanzierung/covenants" text="Covenants jetzt prüfen" ok="Prüfung abgeschlossen." hell /> : null} innen="p-0">
          {u.faelle.length === 0 ? (
            <div className="p-6"><Leer icon={FolderKanban} titel="Noch keine Finanzierungsfälle" text="Legen Sie einen Fall aus einem Entwicklungsprojekt oder einer Anlage an." /></div>
          ) : (
            <ul className="divide-y divide-ink-100">
              {u.faelle.map((f) => (
                <li key={f.id}>
                  <Link href={`/portal/admin/finanzierung/${f.id}`} className="flex flex-col gap-2 px-5 py-4 hover:bg-ink-50/60 md:flex-row md:items-center md:gap-4 md:px-6">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold text-ink-900">{f.titel}</p>
                      <p className="text-[12.5px] text-ink-500">{f.spv || "SPV offen"} · {String(f.mwp).replace(".", ",")} MWp · {f.land} · Bedarf {teur(f.betragWunsch)}{f.bezug ? ` · ${f.bezug.titel}` : ""}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge ton={FALL_STATUS[f.status]?.ton}>{f.statusLabel}</Badge>
                      {f.anfragenAnzahl > 0 && <Badge>{f.termsheetsAnzahl}/{f.anfragenAnzahl} Term Sheets</Badge>}
                      {f.geschaeftsmodell && <Badge ton="info">{f.geschaeftsmodell.label}</Badge>}
                      {f.covenant && <AmpelBadge id={f.covenant.ampel?.id} />}
                      {f.reporting?.naechsteFrist && <span className="text-[12px] text-ink-500">Reporting bis {datumDe(f.reporting.naechsteFrist)}</span>}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Karte>
      </>
    );
  } else if (tab === "neu") {
    const auswahl = await laden(() => b.fzAuswahl(n));
    inhalt = (
      <Karte titel="Finanzierungsfall anlegen" untertitel="Der Finanzierungsbedarf wird aus den Projektkosten vorbelegt (Entwicklungsprojekt: Standard-Capex je kWp + Entwicklungsbudget; Anlage: Contracting-Vertrag). Alle Annahmen sind danach im Financial Model änderbar.">
        {u.darfSchreiben ? <FallAnlegen auswahl={auswahl} /> : <p className="text-[14px] text-ink-500">Ihre Backoffice-Rolle darf hier nur lesen.</p>}
      </Karte>
    );
  } else if (tab === "banken") {
    inhalt = (
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Karte titel="Bankenstamm" untertitel="Banken erhalten Anfragen per E-Mail mit persönlichem, befristetem Link; Portalzugang nur zum freigegebenen Bankenpaket." innen="p-0">
          <ul className="divide-y divide-ink-100">
            {u.banken.map((x) => (
              <li key={x.id} className="px-5 py-3.5 md:px-6">
                <p className="flex flex-wrap items-center gap-2 text-[14.5px] font-semibold text-ink-900"><Building aria-hidden="true" className="h-4 w-4 text-ov-600" />{x.name}<Badge>{x.land}</Badge>{x.portalKonten > 0 && <Badge ton="ok">{x.portalKonten} Portal-Konto</Badge>}</p>
                <p className="mt-0.5 text-[12.5px] text-ink-500">{x.ansprechpartner} · {x.email}{x.schwerpunkt ? ` · ${x.schwerpunkt}` : ""} · {x.anfragen} Anfrage(n)</p>
              </li>
            ))}
          </ul>
        </Karte>
        <Karte titel="Bank anlegen">{u.darfSchreiben ? <BankFormular /> : <p className="text-[14px] text-ink-500">Nur lesen.</p>}</Karte>
      </div>
    );
  } else {
    inhalt = (
      <Karte titel="Geschäftsmodell-Vergleich (frei)" untertitel="Beispielprojekt 10 MWp Freifläche DE. Für ein konkretes Projekt den Vergleich im Finanzierungsfall nutzen – dort legt die Leitung das Modell fest.">
        <GeschaeftsmodellRechner eingaben={cockpitStandard({ land: "DE", mwp: 10 })} />
      </Karte>
    );
  }

  return (
    <>
      <SeitenKopf eyebrow="Backoffice" titel="Finanzierung & Banken" text="Eigenbetrieb mit Bankfinanzierung: Finanzierungsbedarf, Anfrage an mehrere Banken, Bankenpaket, Term-Sheet-Vergleich, Kreditvertrag und Covenant-Monitoring im Betrieb." />
      <Reiter basis="/portal/admin/finanzierung" aktiv={tab} tabs={REITER} label="Bereiche der Finanzierung" />
      {inhalt}
    </>
  );
}
