// /portal/admin/leitung – Leitungs-Cockpit (Querschnitt, Team 10). Nur Unterrolle „Leitung“ (sonst 404).
// Unternehmens-Kennzahlen aus allen Modulen über deren rechtegeprüfte Operationen (server/leitung.js),
// Management-Bericht als PDF je Monat, Absprung in die Fachbereiche und das Revisionsprotokoll.

import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, BadgeEuro, Banknote, Info, LandPlot, Link2, PlugZap, ScanFace, SunMedium, TrendingUp } from "lucide-react";
import { Hinweis, Karte, Kennzahl, PfeilLink, SeitenKopf } from "@/components/Portal/ui";
import ManagementberichtKnopf from "@/components/Portal/Querschnitt/ManagementberichtKnopf";
import DigestKnopf from "@/components/Portal/Querschnitt/DigestKnopf";
import { portalNutzer } from "@/lib/plattform/server/seite";
import { leitungKennzahlen } from "@/lib/plattform/server/leitung";
import { unterrollen } from "@/lib/plattform/rechte";
import { datumZeit, eur, prozent } from "@/lib/plattform/format";
import { fmt } from "@/lib/rechner/annahmen";
import { cn } from "@/components/ui/cn";
import KpiKachel from "@/components/ui/KpiKachel"; // T3: Kennzahlen-Reihe 2.0
import Stagger from "@/components/ui/Stagger"; // T3
import Reveal from "@/components/ui/Reveal"; // T3: Balken-Einlauf

export const metadata = { title: "Leitungs-Cockpit" };

const n1 = (x, st = 1) => (Number.isFinite(Number(x)) ? fmt(Number(x), st) : "–");
const fehlt = (blk) => (blk?.ok ? null : blk?.fehler || "nicht verfügbar");

function Balken({ zeilen, format = (x) => n1(x), leer = "Keine Daten." }) {
  const max = Math.max(1, ...zeilen.map((z) => z.wert || 0));
  if (!zeilen.length) return <p className="text-[14px] text-ink-500">{leer}</p>;
  return (
    <Reveal as="ol" dir="ohne" className="space-y-2.5">
      {zeilen.map((z, i) => (
        <li key={z.label} className="grid grid-cols-[minmax(0,6.5rem)_minmax(0,1fr)_minmax(0,7rem)] items-center gap-3 text-[13.5px] sm:grid-cols-[minmax(0,9rem)_minmax(0,1fr)_minmax(0,9.5rem)]">
          <span className="truncate text-ink-600" title={z.label}>{z.label}</span>
          <span className="h-3 overflow-hidden rounded-full bg-ink-100">
            <span className={cn("ov-balken-x block h-3 rounded-full", z.ton === "navy" ? "bg-navy-500" : "bg-ov-500")} style={{ width: `${Math.max(z.wert ? 2 : 0, ((z.wert || 0) / max) * 100)}%`, "--i": i }} />
          </span>
          <span className="ov-num truncate text-right font-bold text-ink-900">{format(z.wert)}{z.zusatz ? <span className="ml-1 text-[11.5px] font-normal text-ink-500">{z.zusatz}</span> : null}</span>
        </li>
      ))}
    </Reveal>
  );
}

function Nicht({ text }) {
  return <p className="flex items-center gap-2 text-[14px] text-ink-500"><Info aria-hidden="true" className="h-4 w-4 shrink-0" />{text}</p>;
}

export default async function LeitungsCockpit() {
  const n = await portalNutzer({ admin: true });
  if (!unterrollen(n).includes("leitung")) notFound();
  const k = await leitungKennzahlen(n);
  const { pipeline: p, flaechen: f, deals: d, energie: e, anlagen: a, kyc, finanzen: fi, finanzierung: fz, boerse, betrieb } = k;

  return (
    <div className="space-y-6">
      <SeitenKopf
        eyebrow="Backoffice · Leitung"
        titel="Leitungs-Cockpit"
        text={`Unternehmens-Kennzahlen aus allen Bereichen – Stand ${datumZeit(k.stand)}. Jeder Wert führt in den Fachbereich; der Management-Bericht fasst den Monat als PDF zusammen.`}
        aktionen={<ManagementberichtKnopf />}
      />

      {k.hinweise.length > 0 && (
        <Hinweis ton={k.hinweise.some((h) => h.ton === "warn") ? "warn" : "info"} icon={AlertTriangle} titel="Worauf die Leitung heute schauen sollte">
          <ul className="mt-1 space-y-1">
            {k.hinweise.map((h) => (
              <li key={h.text}><Link href={h.href} className="underline underline-offset-2 hover:text-ov-800">{h.text}</Link></li>
            ))}
          </ul>
        </Hinweis>
      )}

      <Stagger className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        <KpiKachel label="Entwicklungs-Pipeline" wert={p.ok ? `${n1(p.mwp)} MWp` : "–"} hinweis={p.ok ? `${fmt(p.anzahl)} Projekte · gewichtet ${n1(p.mwpGewichtet)} MWp` : fehlt(p)} icon={TrendingUp} href="/portal/admin/entwicklung" />
        <KpiKachel label="Gesicherte Fläche" wert={f.ok ? `${n1(f.gesichertHa)} ha` : "–"} hinweis={f.ok ? `${fmt(f.gesichertAnzahl)} Flächen · in Prüfung ${n1(f.pipelineHa)} ha` : fehlt(f)} icon={LandPlot} href="/portal/admin/flaechen" />
        <KpiKachel label="Provisionen offen" wert={d.ok ? eur(d.offen + d.inRechnung) : "–"} hinweis={d.ok ? `bezahlt ${new Date().getFullYear()}: ${eur(d.bezahltJahr)} · gesamt ${eur(d.bezahlt)}` : fehlt(d)} icon={BadgeEuro} href="/portal/admin/deals" />
        <KpiKachel label="Offene Posten" wert={fi.ok ? eur(fi.forderungenOffen) : "–"} hinweis={fi.ok ? `${fmt(fi.forderungenAnzahl || 0)} Forderungen · überfällig ${eur(fi.ueberfaellig)}` : fehlt(fi)} icon={Banknote} href="/portal/admin/finanzen" ton="dunkel" />
      </Stagger>

      <div className="grid gap-6 xl:grid-cols-2">
        <Karte titel="Pipeline je Phase" untertitel="Offene Entwicklungsprojekte, MWp" aktion={<PfeilLink href="/portal/admin/entwicklung">Portfolio</PfeilLink>}>
          {p.ok ? (
            <>
              <Balken zeilen={p.jePhase.map((x) => ({ label: x.label, wert: x.mwp, zusatz: `${x.anzahl}×` }))} format={(x) => `${n1(x)} MWp`} />
              <p className="mt-4 text-[13px] text-ink-500">
                Pipeline-Wert gewichtet {eur(p.wert)} · {fmt(p.verzug)} Meilensteine im Verzug · {fmt(p.fristen30)} Fristen in 30 Tagen. Börse: {n1(boerse.mwp)} MWp sichtbar, {fmt(boerse.inPruefung || 0)} in Prüfung.
              </p>
            </>
          ) : <Nicht text={fehlt(p)} />}
        </Karte>

        <Karte titel="COD-Prognose je Jahr" untertitel={p.ok && p.zielJahr ? `Ziel rund ${fmt(p.zielJahr)} MWp pro Jahr` : "Inbetriebnahme laut Projektplan"}>
          {p.ok ? (
            <Balken
              zeilen={p.jeJahr.slice(0, 8).map((j) => ({ label: String(j.jahr), wert: j.mwp, zusatz: `gew. ${n1(j.mwpGewichtet)}`, ton: p.zielJahr && j.mwp >= p.zielJahr ? "ov" : "navy" }))}
              format={(x) => `${n1(x)} MWp`}
              leer="Noch keine Projekte mit COD-Prognose."
            />
          ) : null}
          {p.ok && p.zielJahr && p.jeJahr.length > 0 ? (
            <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-ink-500">
              <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-ov-500" />Ziel erreicht (≥ {fmt(p.zielJahr)} MWp)</span>
              <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-navy-500" />unter Ziel</span>
            </p>
          ) : null}
          {p.ok ? null : <Nicht text={fehlt(p)} />}
        </Karte>

        <Karte titel="Flächen & Deals" aktion={<PfeilLink href="/portal/admin/berichte">Berichte</PfeilLink>}>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="min-w-0">
              <p className="text-[12.5px] font-semibold uppercase tracking-wider text-ink-500">Gesichert je Land</p>
              {f.ok ? <div className="mt-3"><Balken zeilen={f.jeLand.map((x) => ({ label: x.land, wert: x.ha }))} format={(x) => `${n1(x)} ha`} /></div> : <Nicht text={fehlt(f)} />}
              {f.ok && <p className="mt-3 text-[13px] text-ink-500">davon Agri-PV {n1(f.agriHa)} ha · {fmt(f.pachtangebotOffen)} Pachtangebote offen</p>}
            </div>
            <div className="min-w-0 space-y-2 text-[14px]">
              <p className="text-[12.5px] font-semibold uppercase tracking-wider text-ink-500">Transaktion</p>
              {boerse.ok ? (
                <ul className="space-y-1.5 text-ink-700">
                  <li>NDA-Anfragen offen: <strong className="ov-num">{fmt(boerse.ndaOffen)}</strong></li>
                  <li>LOIs zu entscheiden: <strong className="ov-num">{fmt(boerse.loiOffen)}</strong></li>
                  <li>Verkaufte Projekte: <strong className="ov-num">{fmt(boerse.verkauft)}</strong></li>
                  {d.ok && d.closing && <li>Closings offen: <strong className="ov-num">{fmt(d.closing.offen || 0)}</strong> · vollzogen {fmt(d.closing.vollzogen || 0)} ({eur(d.closing.volumen || 0)})</li>}
                </ul>
              ) : <Nicht text={fehlt(boerse)} />}
            </div>
          </div>
        </Karte>

        <Karte titel="Anlagen-Performance" untertitel={a.ok ? `Quelle: ${a.quelle === "simulator" ? "Simulator (Demo)" : "Messdatendienst"}` : undefined} aktion={<PfeilLink href="/portal/admin/anlagen">Leitstand</PfeilLink>}>
          {a.ok ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Kennzahl label="Installierte Leistung" wert={`${n1(a.kwp / 1000, 2)} MWp`} hinweis={`${fmt(a.anzahl)} Anlagen${a.speicherKwh ? ` · Speicher ${n1(a.speicherKwh / 1000, 1)} MWh` : ""}`} icon={SunMedium} />
              <Kennzahl label="Erzeugung seit 1.1." wert={`${n1(a.erzeugungJahrMwh)} MWh`} hinweis={a.spezErtrag ? `spez. Ertrag ${fmt(a.spezErtrag)} kWh/kWp · CO₂ ${n1(a.co2JahrT)} t vermieden` : "noch keine Messwerte"} />
              <div className="sm:col-span-2 text-[13.5px] text-ink-600">
                Ampel: {fmt(a.ampeln.laeuft || 0)} laufen · {fmt(a.ampeln.warnung || 0)} Warnung · {fmt(a.ampeln.stoerung || 0)} Störung · {fmt(a.ampeln.offline || 0)} offline
                {a.verfuegbarkeit !== null && <> · Verfügbarkeit {prozent(a.verfuegbarkeit, 0)}</>}
                {a.messfehler && <span className="block text-ink-500">Messdaten: {a.messfehler}</span>}
              </div>
            </div>
          ) : <Nicht text={fehlt(a)} />}
        </Karte>

        <Karte titel="Energie-Pool" aktion={<PfeilLink href="/portal/admin/energie">Handelsdesk</PfeilLink>}>
          {e.ok ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Kennzahl label="Kunden im Pool" wert={fmt(e.kunden)} hinweis={`${n1(e.jahresGwh, 2)} GWh Jahresbedarf`} icon={PlugZap} />
              <Kennzahl label="Absicherung (Hedge)" wert={e.hedgeQuote === null ? "–" : prozent(e.hedgeQuote, 0)} hinweis={`${fmt(e.tranchen)} Tranchen beschafft`} />
            </div>
          ) : <Nicht text={fehlt(e)} />}
        </Karte>

        <Karte titel="Compliance & Finanzierung" aktion={<PfeilLink href="/portal/admin/compliance">KYC</PfeilLink>}>
          <div className="grid gap-4 sm:grid-cols-2">
            {kyc.ok ? (
              <Kennzahl label="KYC-Rückstau" wert={fmt(kyc.warteschlange || 0)} hinweis={`${fmt(kyc.zweitpruefung || 0)} Vier-Augen · ${fmt(kyc.nachgefordert || 0)} nachgefordert · ${fmt(kyc.treffer || 0)} Treffer`} icon={ScanFace} href="/portal/admin/compliance" />
            ) : <Nicht text={`KYC: ${fehlt(kyc)}`} />}
            {fz.ok ? (
              <Kennzahl label="Bankfinanzierung" wert={eur(fz.kreditvolumen || 0)} hinweis={`${fmt(fz.faelleAktiv || 0)} Fälle · Covenant rot ${fmt(fz.ampelRot || 0)} / gelb ${fmt(fz.ampelGelb || 0)}`} icon={Banknote} href="/portal/admin/finanzierung" />
            ) : <Nicht text={`Finanzierung: ${fehlt(fz)}`} />}
            {fi.ok && <p className="sm:col-span-2 text-[13.5px] text-ink-600">Gutschriften offen {eur(fi.gutschriftenOffen)} ({fmt(fi.gutschriftenAnzahl || 0)}{fi.gutschriftenGesperrt ? `, ${fmt(fi.gutschriftenGesperrt)} gesperrt` : ""}) · {fmt(fi.klaerfaelleOffen || 0)} Klärfälle · {fmt(fi.pachtvertraegeAktiv || 0)} aktive Pachtverträge</p>}
          </div>
        </Karte>
      </div>

      <Karte titel="Betrieb & Nachvollziehbarkeit" aktion={<PfeilLink href="/portal/admin/protokoll">Revisionsprotokoll durchsuchen</PfeilLink>}>
        {betrieb.ok ? (
          <ul className="grid gap-3 text-[14px] text-ink-700 sm:grid-cols-2 lg:grid-cols-4">
            <li><Link href="/portal/admin/vorgaenge" className="hover:text-ov-700">Offene Vorgänge: <strong className="ov-num">{fmt(betrieb.vorgaengeOffen)}</strong> ({fmt(betrieb.neu7)} neu in 7 Tagen)</Link></li>
            <li><Link href="/portal/admin/vorgaenge?ohne=1" className="hover:text-ov-700">Ohne Zuständigen: <strong className="ov-num">{fmt(betrieb.ohneZustaendig)}</strong></Link></li>
            <li><Link href="/portal/admin/aufgaben?ansicht=ueberfaellig" className="hover:text-ov-700">Überfällige Wiedervorlagen: <strong className="ov-num">{fmt(betrieb.aufgabenUeberfaellig)}</strong></Link></li>
            <li><Link href="/portal/nachrichten?filter=ungelesen" className="hover:text-ov-700">Ungelesene Nachrichten: <strong className="ov-num">{fmt(betrieb.ungelesen)}</strong></Link></li>
          </ul>
        ) : <Nicht text={fehlt(betrieb)} />}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-[12.5px] text-ink-500"><Link2 aria-hidden="true" className="h-4 w-4 shrink-0" /> Jeder Abruf des Management-Berichts wird im hash-verketteten Protokoll vermerkt.</p>
          <DigestKnopf />
        </div>
      </Karte>
    </div>
  );
}
