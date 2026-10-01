// Server-Ansichten der Abrechnung (WP4) für Backoffice (/portal/admin/eg/[id]/abrechnung, /buchhaltung) und Organe
// (/portal/eg/[id]/abrechnung, /kasse): Perioden mit Vier-Augen-Ablauf, Vorschau mit Prüfungen und Prüfpfad je Belegzeile,
// Belege, Zahlungen, Mahnwesen, Kassabuch, Einnahmen-Ausgaben-Rechnung, UVA, Kleinunternehmer-Monitor, Exporte.
// Keine Fachlogik: alle Zahlen kommen aus dem Backend (eg/*.js).

import Link from "next/link";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, BadgeCheck, BookOpenCheck, Check, Coins, Download, FileText, GitCompareArrows, Landmark, ReceiptText, Scale, ShieldCheck, Wallet } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { Badge, Hinweis, Karte, Kennzahl, Leer } from "@/components/Portal/ui";
import { Klappe } from "@/components/Portal/Mitglied/teile";
import { BelegStorno, BuchungNeu, CamtImport, Einstellungen, MahnlaufKnopf, PeriodeAnlegen, PeriodeKnoepfe, ProbeVergleich, Pruefvermerk, ZahlungErfassen, ZahlungslaufKnoepfe, ZahlungslaufStart } from "./Aktionen";

export const eur = (x) => (x === null || x === undefined || x === "" ? "–" : `${Number(x).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`);
export const kwh = (x, s = 1) => (x === null || x === undefined ? "–" : `${Number(x).toLocaleString("de-DE", { maximumFractionDigits: s })} kWh`);
export const tag = (d) => (d ? String(d).slice(0, 10).split("-").reverse().join(".") : "–");
const ct = (x) => `${Number(x).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 4 })} ct`;

const SCHRITTE = [
  { id: "offen", label: "Angelegt" },
  { id: "vorschau", label: "Vorschau" },
  { id: "freigabe_teilweise", label: "1. Freigabe" },
  { id: "freigegeben", label: "2. Freigabe" },
  { id: "versendet", label: "Versendet" },
  { id: "abgeschlossen", label: "Abgeschlossen" },
];

/** Status-Pipeline der Periode – reine Anzeige (keine Knöpfe), Stepper-Optik mit Verbindungslinien. */
function Ablauf({ status }) {
  if (status === "probe" || status === "storniert") return <Badge ton={status === "probe" ? "info" : "neutral"}>{status === "probe" ? "Probe-Abrechnung – erzeugt keine Belege" : "Storniert"}</Badge>;
  const i = SCHRITTE.findIndex((s) => s.id === status);
  return (
    <ol className="flex items-start" aria-label={`Ablauf der Periode: Schritt ${i + 1} von ${SCHRITTE.length}, ${SCHRITTE[i]?.label || status}`}>
      {SCHRITTE.map((s, j) => {
        const erledigt = j < i || (j === i && status === "abgeschlossen");
        const jetzt = j === i && !erledigt;
        return (
          <li key={s.id} aria-current={j === i ? "step" : undefined} className="relative flex min-w-0 flex-1 flex-col items-center text-center">
            {j > 0 && <span aria-hidden="true" className={cn("absolute right-1/2 top-[13px] h-0.5 w-full", j <= i ? "bg-ov-500" : "bg-ink-200")} />}
            <span className={cn("relative z-10 flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-bold", erledigt && "bg-ov-600 text-white", jetzt && "bg-white text-navy-700 ring-2 ring-navy-700", !erledigt && !jetzt && "bg-white text-ink-500 ring-1 ring-inset ring-ink-200")}>
              {erledigt ? <Check aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={3} /> : j + 1}
            </span>
            <span className={cn("mt-1.5 hidden px-0.5 text-[12px] leading-tight sm:block", jetzt ? "font-semibold text-ink-900" : erledigt ? "text-ink-700" : "text-ink-500")}>{s.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Vorschau-Diff zum Vorzeitraum (Wow-Moment 10): Summen und auffällige Mitglieder (±10 % oder neu/weggefallen).
 * Nur Darstellung – vergleicht die Bruttobeträge der Belege beider Perioden je Mitgliedsnummer und Belegart.
 */
function VorschauDiff({ jetzt = [], vorher = [], vorherLabel = "" }) {
  const summe = (liste) => {
    const m = new Map();
    for (const b of liste) {
      if (!b || b.typ === "storno" || b.status === "storniert") continue;
      const k = `${b.mitgliedsnummer}|${b.typ === "gutschrift" ? "gutschrift" : "rechnung"}`;
      const alt = m.get(k) || { nr: b.mitgliedsnummer, name: b.empfaenger?.name || "", typ: b.typ === "gutschrift" ? "Gutschrift" : "Rechnung", betrag: 0 };
      alt.betrag += Number(b.summen?.brutto) || 0;
      m.set(k, alt);
    }
    return m;
  };
  const a = summe(jetzt);
  const b = summe(vorher);
  const zeilen = [...new Set([...a.keys(), ...b.keys()])].map((k) => {
    const n = a.get(k);
    const v = b.get(k);
    const neu = n?.betrag ?? 0;
    const alt = v?.betrag ?? 0;
    const pct = alt ? ((neu - alt) / Math.abs(alt)) * 100 : null;
    const grund = !v ? "neu dabei" : !n ? "diesmal kein Beleg" : "";
    return { k, nr: (n || v).nr, name: (n || v).name, typ: (n || v).typ, neu, alt, diff: neu - alt, pct, grund };
  });
  const auffaellig = zeilen.filter((z) => z.grund || (z.pct !== null && Math.abs(z.pct) >= 10)).sort((x, y) => Math.abs(y.diff) - Math.abs(x.diff));
  const gesamt = (m, typ) => [...m.values()].filter((x) => x.typ === typ).reduce((s, x) => s + x.betrag, 0);
  const vergleich = [
    { label: "Rechnungen", neu: gesamt(a, "Rechnung"), alt: gesamt(b, "Rechnung") },
    { label: "Gutschriften", neu: gesamt(a, "Gutschrift"), alt: gesamt(b, "Gutschrift") },
  ];
  return (
    <Karte titel="Veränderung zum Vorzeitraum" untertitel={`Vergleich mit ${vorherLabel} · ${auffaellig.length ? `${auffaellig.length} auffällige Position${auffaellig.length === 1 ? "" : "en"} (±10 % oder neu)` : "keine Auffälligkeiten"}`} icon={GitCompareArrows}>
      <div className="grid gap-3 sm:grid-cols-2">
        {vergleich.map((x) => {
          const d = x.neu - x.alt;
          const p = x.alt ? (d / Math.abs(x.alt)) * 100 : null;
          return (
            <div key={x.label} className="rounded-2xl bg-sand-50 p-4 ring-1 ring-sand-200">
              <p className="text-[12.5px] text-ink-500">{x.label}</p>
              <p className="ov-num mt-0.5 font-display text-[22px] font-extrabold tracking-tight text-ink-900">{eur(x.neu)}</p>
              <p className="ov-num mt-0.5 flex items-center gap-1 text-[12.5px] text-ink-600">
                {d > 0 ? <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5 text-navy-600" /> : d < 0 ? <ArrowDownRight aria-hidden="true" className="h-3.5 w-3.5 text-navy-600" /> : null}
                {d === 0 ? "unverändert" : `${d > 0 ? "+" : "−"}${eur(Math.abs(d))}${p !== null ? ` (${d > 0 ? "+" : "−"}${Math.abs(p).toLocaleString("de-DE", { maximumFractionDigits: 1 })} %)` : ""}`} · vorher {eur(x.alt)}
              </p>
            </div>
          );
        })}
      </div>
      {auffaellig.length > 0 && (
        <ul className="mt-4 divide-y divide-ink-100 rounded-2xl ring-1 ring-ink-200/70">
          {auffaellig.slice(0, 8).map((z) => (
            <li key={z.k} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-[13px]">
              <span className="min-w-0 text-ink-800"><strong className="font-semibold">{z.name || `Nr. ${z.nr}`}</strong> <span className="text-ink-500">· Nr. {z.nr} · {z.typ}</span></span>
              <span className="ov-num flex items-center gap-2 text-ink-700">
                {eur(z.alt)} → <strong className="text-ink-900">{eur(z.neu)}</strong>
                <Badge ton={z.grund ? "info" : "warn"}>{z.grund || `${z.diff > 0 ? "+" : "−"}${Math.abs(z.pct).toLocaleString("de-DE", { maximumFractionDigits: 0 })} %`}</Badge>
              </span>
            </li>
          ))}
          {auffaellig.length > 8 && <li className="px-4 py-2.5 text-[12.5px] text-ink-500">… und {auffaellig.length - 8} weitere – siehe Belege unten.</li>}
        </ul>
      )}
      <p className="mt-3 text-[12.5px] text-ink-500">Typische Gründe: neuer oder abgemeldeter Zählpunkt, geänderter Teilnahmefaktor, Saison (Sonnenstunden), nachgelieferte Werte des Netzbetreibers.</p>
    </Karte>
  );
}

const kurzZp = (z) => (z ? `…${String(z).slice(-8)}` : "");

/** Ein Beleg (Entwurf oder final) mit Positionen und aufklappbarem Prüfpfad */
function BelegZeile({ b, apiPeriode, darfStorno, entwurf }) {
  return (
    <li className="px-5 py-4 md:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[14.5px] font-semibold text-ink-900">
            {b.nummer ? <span className="ov-num">{b.nummer}</span> : <span className="text-ink-500">Entwurf</span>} · {b.typ === "gutschrift" ? "Gutschrift" : b.typ === "storno" ? "Storno" : "Rechnung"} · {b.empfaenger?.name}
            <span className="font-normal text-ink-500"> · Nr. {b.mitgliedsnummer}</span>
          </p>
          <p className="mt-0.5 text-[12.5px] text-ink-600">
            {b.typ !== "gutschrift" && b.energie?.eigendeckung !== undefined && `Eigendeckung ${kwh(b.energie.eigendeckung)}${b.energie.quoteEigendeckung !== null && b.energie.quoteEigendeckung !== undefined ? ` (${String(b.energie.quoteEigendeckung).replace(".", ",")} % des Verbrauchs)` : ""} · `}
            {b.typ === "gutschrift" && b.energie && `eingebracht ${kwh(b.energie.eingebracht)} · `}
            {(b.summen?.hinweise || [])[0] ? `${b.summen.hinweise[0].slice(0, 70)}${b.summen.hinweise[0].length > 70 ? " …" : ""}` : "20 % USt"}
            {b.zahlweg?.art === "lastschrift" ? " · Lastschrift" : b.zahlweg?.art === "ueberweisung" ? " · Überweisung" : ""}
            {b.ersparnis?.summeEur ? ` · Vorteil ca. ${eur(b.ersparnis.summeEur)}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {b.statusLabel && <Badge ton={b.ton}>{b.statusLabel}</Badge>}
          <span className="ov-num text-[15px] font-bold text-ink-900">{eur(b.summen?.brutto)}</span>
        </div>
      </div>
      {((b.fehler || []).length > 0 || (b.warnungen || []).length > 0) && (
        <ul className="mt-2 space-y-1 text-[12.5px]">
          {(b.fehler || []).map((f) => <li key={f} className="flex gap-1.5 text-danger-700"><AlertTriangle aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0" />{f}</li>)}
          {(b.warnungen || []).map((f) => <li key={f} className="text-ink-600">Hinweis: {f}</li>)}
        </ul>
      )}
      <details className="group mt-2">
        <summary className="cursor-pointer text-[12.5px] font-semibold text-ov-700 hover:text-ov-800">Positionen und Prüfpfad ({(b.positionen || []).length})</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-[12.5px]">
            <thead><tr className="text-ink-500"><th className="py-1 pr-2 font-semibold">Leistung</th><th className="py-1 pr-2 text-right font-semibold">Menge</th><th className="py-1 pr-2 text-right font-semibold">Preis</th><th className="py-1 pr-2 text-right font-semibold">Netto</th><th className="py-1 font-semibold">USt</th></tr></thead>
            <tbody>
              {(b.positionen || []).map((p) => (
                <tr key={p.nr} className="border-t border-ink-100 align-top">
                  <td className="py-1.5 pr-2 text-ink-800">
                    {p.text}{p.zaehlpunkt ? ` · ZP ${kurzZp(p.zaehlpunkt)}` : ""}
                    {(p.pruefpfad || []).length > 0 && (
                      <ul className="mt-1 space-y-0.5 text-[11.5px] text-ink-500">
                        {p.pruefpfad.map((s, i) => <li key={i}><span className="font-semibold text-ink-600">{s.frage}:</span> {s.antwort}{s.quelle ? ` (${s.quelle})` : ""}</li>)}
                      </ul>
                    )}
                  </td>
                  <td className="ov-num py-1.5 pr-2 text-right">{p.einheit === "kWh" ? kwh(p.menge, 3) : `${String(p.menge).replace(".", ",")} ${p.einheit}`}</td>
                  <td className="ov-num py-1.5 pr-2 text-right">{p.preisEinheit === "ct/kWh" ? ct(p.preis) : eur(p.preis)}</td>
                  <td className="ov-num py-1.5 pr-2 text-right font-semibold">{eur(p.netto)}</td>
                  <td className="py-1.5">{p.ust?.label}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-[12px] text-ink-600">Netto {eur(b.summen?.netto)} · USt {eur(b.summen?.ust)}{b.summen?.rcSteuer ? ` · Steuerschuld der Gemeinschaft (Reverse Charge) ${eur(b.summen.rcSteuer)}` : ""} · {b.herkunft?.text}</p>
        </div>
      </details>
      {!entwurf && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {b.pdfUrl && <a href={`${b.pdfUrl}?anzeigen=1`} target="_blank" rel="noopener" className="inline-flex h-8 items-center gap-1 rounded-full bg-white px-3 text-[12.5px] font-semibold text-ink-900 ring-1 ring-inset ring-ink-200 hover:bg-ink-50"><FileText aria-hidden="true" className="h-3.5 w-3.5 text-ov-700" />PDF</a>}
          {b.hash && <span className="text-[12px] text-ink-500" title={b.hash}>Prüfsumme {b.hash.slice(0, 12)}…</span>}
          {darfStorno && b.typ !== "storno" && b.status !== "storniert" && <BelegStorno api={apiPeriode} belegId={b.id} nummer={b.nummer} />}
        </div>
      )}
    </li>
  );
}

/**
 * Abrechnungs-Arbeitsplatz. `d` = abPerioden, `pd` = abPeriodeAktion(lesen) der gewählten Periode (oder null),
 * `basis` = Seitenpfad (für ?periode=), `kontoId` des Nutzers (eigene Freigabe erkennen).
 */
export function AbrechnungAnsicht({ d, pd, basis, kontoId, vorher = null }) {
  const api = `/api/portal/eg/${d.gemeinschaft.id}/abrechnung`;
  const s = d.stufen;
  const p = pd?.periode;
  const v = p?.vorschau;
  const kann = { rechnen: d.darfRechnen, freigabe1: s.freigabe1 >= 2, freigabe2: s.freigabe2 >= 2, versand: s.versand >= 2, storno: s.freigabe1 >= 2 || s.freigabe2 >= 2 };
  const meineFreigabe = !!p?.freigaben?.some((f) => f.kontoId === kontoId);
  const ku = d.ku;
  return (
    <div className="space-y-6">
      <section aria-label="Kennzahlen" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kennzahl ton="dunkel" icon={Wallet} label="Offene Forderungen" wert={eur(d.kennzahlen.offeneForderungen)} hinweis={d.kennzahlen.ueberfaellig ? `${d.kennzahlen.ueberfaellig} überfällig` : "nichts überfällig"} />
        <Kennzahl icon={Coins} label="Offene Gutschriften" wert={eur(d.kennzahlen.offeneGutschriften)} hinweis="an Erzeuger auszuzahlen" />
        <Kennzahl icon={ReceiptText} label="Belege im Jahr" wert={String(d.kennzahlen.belegeJahr)} hinweis={d.kennzahlen.luecken.length ? "Nummernlücke prüfen" : "fortlaufend, lückenlos"} />
        <Kennzahl icon={Scale} label="Kleinunternehmergrenze" wert={ku.status === "regelbesteuert" ? "regelbesteuert" : `${String(ku.quote).replace(".", ",")} %`} hinweis={ku.status === "regelbesteuert" ? "Option U 12" : `hochgerechnet ${String(ku.quotePrognose).replace(".", ",")} % von 55.000 €`} />
      </section>
      {["warnung", "toleranz", "ueberschritten"].includes(ku.status) && <Hinweis ton="warn" titel="Kleinunternehmer-Monitor"><p>{ku.text}</p><p className="mt-1">{ku.option.empfehlung} {ku.option.hinweis}</p></Hinweis>}
      {d.gemeinschaft.lieferantenpflichten && <Hinweis titel="Lieferantenpflichten nach § 69 ElWG">Erzeugungsleistung über 100 kW: Rechnungen mit Fälligkeit, Energiewerten und Zählpunktbezeichnungen, Wahl Monats- oder Jahresrechnung je Mitglied, Erläuterung auf Verlangen kostenlos. Die Plattform prüft das bei jeder Vorschau.</Hinweis>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <Karte titel="Perioden" innen="p-0">
            {d.perioden.length ? (
              <ul className="divide-y divide-ink-100">
                {d.perioden.map((x) => (
                  <li key={x.id}>
                    <Link href={`${basis}?periode=${x.id}`} aria-current={p?.id === x.id ? "page" : undefined} className={cn("flex items-center justify-between gap-2 px-5 py-3 text-[13.5px] hover:bg-ov-50/60", p?.id === x.id && "bg-ov-50")}>
                      <span className="min-w-0"><span className="block font-semibold text-ink-900">{tag(x.von)} – {tag(x.bis)}</span><span className="text-[12px] text-ink-500">{x.artLabel}{x.anzahlBelege ? ` · ${x.anzahlBelege} Belege` : ""}{x.datenquelle === "ersatz" ? " · Ersatzdaten (Demo)" : ""}</span></span>
                      <Badge ton={x.ton}>{x.statusLabel}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : <p className="px-5 py-6 text-[14px] text-ink-500">Noch keine Perioden.</p>}
          </Karte>
          {d.darfRechnen && <Karte titel="Neue Periode"><PeriodeAnlegen api={api} vorschlaege={d.vorschlaege} /></Karte>}
        </div>

        <div className="min-w-0 space-y-6">
          {!p ? <Leer icon={ReceiptText} titel="Periode wählen" text="Wählen Sie links eine Periode oder legen Sie eine neue an. Abgerechnet werden die Werte des Netzbetreibers – frühestens ab dem 20. des Folgemonats." /> : (
            <>
              <Karte titel={`${p.artLabel} ${tag(p.von)} – ${tag(p.bis)}`} untertitel={`${p.statusLabel}${p.datenquelle === "ersatz" ? " · Ersatzdaten (Demo, WP3 nicht verfügbar)" : p.datenquelle === "netzbetreiber" ? " · Werte des Netzbetreibers" : ""} · empfohlen ab ${tag(p.fruehestens)}`}>
                <div className="space-y-4">
                  <Ablauf status={p.status} />
                  {(p.freigaben || []).length > 0 && (
                    <ul className="flex flex-wrap gap-2 text-[12.5px]">
                      {p.freigaben.map((f, i) => <li key={i}><Badge ton="ok"><BadgeCheck aria-hidden="true" className="h-3.5 w-3.5" />{f.auge}. Auge: {f.name || "–"} · {tag(f.am)}</Badge></li>)}
                    </ul>
                  )}
                  <PeriodeKnoepfe api={`${api}/perioden/${p.id}`} periode={p} kann={kann} meineFreigabe={meineFreigabe && p.status === "freigabe_teilweise"} />
                  {v && (
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-2xl bg-sand-50 p-4 text-[13px] ring-1 ring-sand-200 sm:grid-cols-4">
                      <div><dt className="text-ink-500">Eigendeckung</dt><dd className="ov-num font-semibold">{kwh(v.kennzahlen.eigendeckung)}</dd></div>
                      <div><dt className="text-ink-500">Eingebracht</dt><dd className="ov-num font-semibold">{kwh(v.kennzahlen.eingebracht)}</dd></div>
                      <div><dt className="text-ink-500">Rechnungen</dt><dd className="ov-num font-semibold">{v.kennzahlen.rechnungen} · {eur(v.kennzahlen.bruttoRechnungen)}</dd></div>
                      <div><dt className="text-ink-500">Gutschriften</dt><dd className="ov-num font-semibold">{v.kennzahlen.gutschriften} · {eur(v.kennzahlen.bruttoGutschriften)}</dd></div>
                      <div><dt className="text-ink-500">Eigendeckungsquote</dt><dd className="ov-num font-semibold">{v.kennzahlen.quoteEigendeckung === null ? "–" : `${String(v.kennzahlen.quoteEigendeckung).replace(".", ",")} %`}</dd></div>
                      <div><dt className="text-ink-500">Deckungsbeitrag Energie</dt><dd className="ov-num font-semibold">{eur(v.kennzahlen.deckungsbeitrag)}</dd></div>
                      <div><dt className="text-ink-500">Steuerschuld Reverse Charge</dt><dd className="ov-num font-semibold">{eur(v.kennzahlen.rcSteuer)}</dd></div>
                      <div><dt className="text-ink-500">Vorteil der Mitglieder</dt><dd className="ov-num font-semibold">{eur(v.kennzahlen.ersparnisSumme)}</dd></div>
                    </dl>
                  )}
                </div>
              </Karte>

              {vorher?.periode && (v?.belege?.length > 0 || pd.belege.length > 0) && (
                <VorschauDiff jetzt={pd.belege.length ? pd.belege : v.belege} vorher={vorher.belege || []} vorherLabel={`${vorher.periode.artLabel || "Periode"} ${tag(vorher.periode.von)} – ${tag(vorher.periode.bis)}`} />
              )}

              {v && (
                <Karte titel="Prüfungen" untertitel={`${v.pruefung.fehler.length} blockierend · ${v.pruefung.warnungen.length} Hinweise · Kontrolle Eigendeckung = eingebrachte Erzeugung ${v.kontrolle.ok ? "erfüllt" : "abweichend"}`}>
                  {v.pruefung.fehler.length === 0 && v.pruefung.warnungen.length === 0 && <p className="flex items-center gap-2 text-[14px] text-ov-800"><ShieldCheck aria-hidden="true" className="h-4 w-4" />Alle Pflichtangaben, Steuerfälle und Daten in Ordnung – bereit zur Freigabe.</p>}
                  <ul className="space-y-1.5 text-[13px]">
                    {v.pruefung.fehler.map((f, i) => <li key={`f${i}`} className="flex gap-1.5 text-danger-700"><AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />{f.text}</li>)}
                    {v.pruefung.warnungen.map((f, i) => <li key={`w${i}`} className="text-ink-700">Hinweis: {f.text}</li>)}
                    {[...(v.hinweiseDaten || []), ...v.pruefung.hinweise].map((h, i) => <li key={`h${i}`} className="text-ink-600">{h}</li>)}
                    {(v.ausgeschlossen || []).length > 0 && <li className="text-ink-600">{v.ausgeschlossen.length} Mitglied(er) mit anderem Abrechnungsrhythmus (§ 69 Abs. 3 ElWG) – in der passenden Periode.</li>}
                  </ul>
                </Karte>
              )}

              {p.status === "probe" && v && (
                <Karte titel="Kontrollabrechnung gegen das Vorsystem" untertitel="Wechselgarantie: Abweichungen zeilengenau erklären">
                  <ProbeVergleich api={`${api}/perioden/${p.id}`} />
                  {p.vergleich && (
                    <div className="mt-4 overflow-x-auto">
                      <p className="mb-2 text-[13px] text-ink-700">Neu {eur(p.vergleich.summeNeu)} · Vorsystem {eur(p.vergleich.summeAlt)} · {p.vergleich.auffaellig} Abweichung(en)</p>
                      <table className="w-full min-w-[520px] text-left text-[12.5px]">
                        <thead><tr className="text-ink-500"><th className="py-1">Nr.</th><th className="py-1">Mitglied</th><th className="py-1">Beleg</th><th className="py-1 text-right">Neu</th><th className="py-1 text-right">Vorsystem</th><th className="py-1 text-right">Differenz</th></tr></thead>
                        <tbody>{p.vergleich.zeilen.map((z) => <tr key={`${z.mitgliedsnummer}-${z.typ}`} className={cn("border-t border-ink-100", z.auffaellig && "bg-warn-50")}><td className="py-1">{z.mitgliedsnummer}</td><td className="py-1">{z.name || (z.nurAlt ? "nur im Vorsystem" : "")}</td><td className="py-1">{z.typ}</td><td className="ov-num py-1 text-right">{eur(z.neu)}</td><td className="ov-num py-1 text-right">{eur(z.alt)}</td><td className="ov-num py-1 text-right font-semibold">{eur(z.differenz)}</td></tr>)}</tbody>
                      </table>
                    </div>
                  )}
                </Karte>
              )}

              {(pd.belege.length > 0 || v?.belege?.length > 0) && (
                <Karte titel={pd.belege.length ? "Belege" : "Belege (Entwurf – Nummern bei Freigabe)"} innen="p-0">
                  <ul className="divide-y divide-ink-100">
                    {(pd.belege.length ? pd.belege : v.belege).map((b, i) => <BelegZeile key={b.id || `e${i}`} b={b} apiPeriode={`${api}/perioden/${p.id}`} darfStorno={kann.storno} entwurf={!pd.belege.length} />)}
                  </ul>
                </Karte>
              )}

              {(p.verlauf || []).length > 0 && <Karte titel="Verlauf"><ul className="space-y-1 text-[12.5px] text-ink-600">{[...p.verlauf].reverse().map((x, i) => <li key={i}>{tag(x.am)} · {x.text}</li>)}</ul></Karte>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const TABS = [
  { id: "zahlungen", label: "Zahlungen", icon: Landmark },
  { id: "mahnwesen", label: "Mahnwesen", icon: AlertTriangle },
  { id: "kassa", label: "Kassabuch & Buchungen", icon: BookOpenCheck },
  { id: "steuer", label: "E/A-Rechnung & Steuer", icon: Scale },
  { id: "export", label: "Export & Prüfung", icon: Download },
];

/**
 * Kassa & Buchhaltung. `p` = abPerioden, `bh` = abBuchungen (oder null ohne Recht), `mahn` = abMahnlauf, `mandate`, `belege`.
 */
export function KasseAnsicht({ p, bh, mahn, mandate, belege = [], tab, basis, kontoId }) {
  const api = `/api/portal/eg/${p.gemeinschaft.id}/abrechnung`;
  const s = p.stufen;
  const aktiv = TABS.some((t) => t.id === tab) ? tab : "zahlungen";
  const offen = belege.filter((b) => b.offen > 0 && !["entwurf", "storniert"].includes(b.status));
  return (
    <div className="space-y-6">
      <nav aria-label="Bereiche Kassa" className="-mx-1 overflow-x-auto">
        <ul className="flex min-w-max gap-1 px-1">
          {TABS.filter((t) => t.id !== "steuer" || bh).map((t) => (
            <li key={t.id}><Link href={`${basis}?tab=${t.id}`} aria-current={t.id === aktiv ? "page" : undefined} className={cn("inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold ring-1 ring-inset", t.id === aktiv ? "bg-navy-900 text-white ring-navy-900" : "bg-white text-ink-700 ring-ink-200 hover:bg-ink-50")}><t.icon aria-hidden="true" className="h-4 w-4" />{t.label}</Link></li>
          ))}
        </ul>
      </nav>

      {aktiv === "zahlungen" && (
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="min-w-0 space-y-6">
            {s.sepa >= 2 && <Karte titel="Zahlungslauf erstellen" untertitel="Lastschrift mit Vorabankündigung auf dem Beleg · Prosumer werden verrechnet · Datei nach Freigabe durch eine zweite Person"><ZahlungslaufStart api={`${api}/zahlungen`} heute={p.heute} /></Karte>}
            <Karte titel="Zahlungsläufe und Importe" innen="p-0">
              {p.zahlungslaeufe.length ? (
                <ul className="divide-y divide-ink-100">
                  {p.zahlungslaeufe.map((z) => (
                    <li key={z.id} className="space-y-1.5 px-5 py-3 text-[13.5px] md:px-6">
                      <p className="flex flex-wrap items-center justify-between gap-2"><span className="font-semibold text-ink-900">{z.artLabel || z.art} · {z.anzahl} Posten</span><span className="ov-num font-semibold">{eur(z.summe)}</span></p>
                      <p className="text-[12.5px] text-ink-600">{tag(z.erstelltAm)}{z.ausfuehrungAm ? ` · Ausführung ${tag(z.ausfuehrungAm)}` : ""} · Status {z.status}{(z.freigaben || []).length ? ` · Freigaben: ${z.freigaben.map((f) => f.name).join(", ")}` : ""}</p>
                      {["pain008", "pain001"].includes(z.art) && s.sepa >= 1 && <ZahlungslaufKnoepfe api={`${api}/zahlungen/${z.id}`} lauf={z} eigeneFreigabe={(z.freigaben || []).some((f) => f.kontoId === kontoId)} />}
                    </li>
                  ))}
                </ul>
              ) : <p className="px-6 py-6 text-[14px] text-ink-500">Noch keine Zahlungsläufe.</p>}
            </Karte>
            {s.sepa >= 2 && <Karte titel="Kontoauszug abgleichen" untertitel="camt.053/054 – Belegnummer im Verwendungszweck bzw. End-to-End-ID; Rücklastschriften werden erkannt"><CamtImport api={`${api}/camt`} /></Karte>}
          </div>
          <div className="min-w-0 space-y-6">
            <Karte titel="Offene Posten" untertitel={`${offen.length} Belege offen`} innen="p-0">
              {offen.length ? (
                <ul className="divide-y divide-ink-100">
                  {offen.map((b) => (
                    <li key={b.id} className="px-5 py-3 md:px-6">
                      <p className="flex flex-wrap items-center justify-between gap-2 text-[13.5px]"><span><span className="ov-num font-semibold text-ink-900">{b.nummer}</span> · {b.empfaenger?.name}</span><span className="ov-num font-semibold">{eur(b.offen)}</span></p>
                      <p className="text-[12.5px] text-ink-600">{b.typLabel} · fällig {tag(b.faelligAm)}{b.zahlweg?.art ? ` · ${b.zahlweg.art === "lastschrift" ? "Lastschrift" : "Überweisung"}` : ""}{b.zahlungslaufId ? " · im Zahlungslauf" : ""}{b.ruecklastschrift ? ` · Rücklastschrift (${b.ruecklastschrift.grund})` : ""}{(b.mahnungen || []).length ? ` · ${b.mahnungen[b.mahnungen.length - 1].label}` : ""}</p>
                      {s.sepa >= 2 && <ZahlungErfassen api={`${api}/belege/${b.id}/zahlung`} offen={b.offen} heute={p.heute} />}
                    </li>
                  ))}
                </ul>
              ) : <p className="px-6 py-6 text-[14px] text-ink-500">Keine offenen Posten.</p>}
            </Karte>
            {mandate && (
              <Karte titel="SEPA-Mandate" untertitel="Referenz, Datum, Verfall nach 36 Monaten ohne Einzug" innen="p-0">
                <ul className="divide-y divide-ink-100">
                  {mandate.mandate.map((m) => (
                    <li key={m.mitgliedId} className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5 text-[13px] md:px-6">
                      <span>{m.mitgliedsnummer} · {m.name}<span className="text-ink-500">{m.referenz ? ` · ${m.referenz} vom ${tag(m.datum)}` : ""}</span></span>
                      {m.pruefung.ok ? <Badge ton="ok">gültig</Badge> : <Badge ton="warn">{m.pruefung.fehler[0]}</Badge>}
                    </li>
                  ))}
                </ul>
              </Karte>
            )}
          </div>
        </div>
      )}

      {aktiv === "mahnwesen" && mahn && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <Karte titel="Mahnvorschläge" untertitel="Faire Stufen: Erinnerung ohne Gebühr, schutzbedürftige Haushalte gebührenfrei, keine automatische Sperre" innen="p-0">
            {mahn.vorschlaege.length ? (
              <ul className="divide-y divide-ink-100">
                {mahn.vorschlaege.map((x) => (
                  <li key={x.belegId} className="px-5 py-3 text-[13.5px] md:px-6">
                    <p className="flex flex-wrap items-center justify-between gap-2"><span><span className="ov-num font-semibold">{x.nummer}</span> · {x.empfaenger}</span><span className="ov-num font-semibold">{eur(x.offen)}</span></p>
                    <p className="text-[12.5px] text-ink-600">{x.tage} Tage überfällig · {x.label}{x.faellig ? ` · Gebühr ${eur(x.gebuehr)} · neue Frist ${tag(x.frist)}` : ` · ${x.grund}`}{x.sozial ? " · schutzbedürftig, gebührenfrei" : ""}</p>
                    {x.hinweisEskalation && <p className="text-[12.5px] text-ink-700">{x.hinweisEskalation}</p>}
                  </li>
                ))}
              </ul>
            ) : <p className="px-6 py-6 text-[14px] text-ink-500">Keine überfälligen Rechnungen.</p>}
          </Karte>
          <Karte titel="Mahnlauf">
            <p className="mb-3 text-[13.5px] text-ink-700">{mahn.konfig.stufen.map((x) => `${x.label}: ab ${x.abTagen} Tagen, ${eur(x.gebuehr)}`).join(" · ")}</p>
            {s.sepa >= 2 ? <MahnlaufKnopf api={`${api}/mahnlauf`} anzahl={mahn.vorschlaege.filter((x) => x.faellig).length} /> : <p className="text-[13.5px] text-ink-600">Mahnungen erstellen Kassier bzw. Organisator.</p>}
          </Karte>
        </div>
      )}

      {aktiv === "kassa" && bh && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <div className="min-w-0 space-y-6">
            <Karte titel={`Kassabuch ${bh.jahr}`} untertitel={`Endbestand ${eur(bh.kassabuch.endbestand)}`} innen="p-0">
              {bh.kassabuch.fehler.length > 0 && <p className="px-5 pt-3 text-[13px] text-red-700">{bh.kassabuch.fehler[0]}</p>}
              {bh.kassabuch.zeilen.length ? (
                <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-left text-[13px]"><thead><tr className="text-ink-500"><th className="px-5 py-2">Nr.</th><th className="py-2">Datum</th><th className="py-2">Beleg</th><th className="py-2">Text</th><th className="py-2 text-right">Ein</th><th className="py-2 text-right">Aus</th><th className="px-5 py-2 text-right">Stand</th></tr></thead>
                  <tbody>{bh.kassabuch.zeilen.map((z) => <tr key={z.nr} className="border-t border-ink-100"><td className="px-5 py-1.5">{z.nr}</td><td className="py-1.5">{tag(z.datum)}</td><td className="py-1.5">{z.belegNr}</td><td className="py-1.5">{z.text}</td><td className="ov-num py-1.5 text-right">{z.einnahme ? eur(z.einnahme) : ""}</td><td className="ov-num py-1.5 text-right">{z.ausgabe ? eur(z.ausgabe) : ""}</td><td className="ov-num px-5 py-1.5 text-right font-semibold">{eur(z.saldo)}</td></tr>)}</tbody></table></div>
              ) : <p className="px-6 py-6 text-[14px] text-ink-500">Noch keine Barbewegungen.</p>}
            </Karte>
            <Karte titel="Buchungen" untertitel="Zuflussprinzip: Zahlungseingänge aus Kontoauszug bzw. Erfassung, Ausgaben manuell" innen="p-0">
              <ul className="max-h-[480px] divide-y divide-ink-100 overflow-y-auto">
                {bh.buchungen.slice(0, 200).map((x) => <li key={x.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-2 text-[12.5px] md:px-6"><span className="min-w-0">{tag(x.datum)} · <span className="ov-num">{x.konto}</span> · {x.text}</span><span className={cn("ov-num font-semibold", x.kategorie === "ausgabe" ? "text-ink-700" : "text-ov-800")}>{x.kategorie === "ausgabe" ? "−" : ""}{eur(Math.abs(x.betrag))}</span></li>)}
              </ul>
            </Karte>
          </div>
          {s.buchhaltung >= 2 && <Karte titel="Buchung erfassen"><BuchungNeu api={`${api}/buchhaltung`} konten={bh.konten} heute={p.heute} /></Karte>}
        </div>
      )}

      {aktiv === "steuer" && bh && (
        <div className="grid gap-6 xl:grid-cols-2">
          <Karte titel={`Einnahmen-Ausgaben-Rechnung ${bh.jahr}`} untertitel={bh.ea.vereinsText}>
            <dl className="space-y-1 text-[13.5px]">
              {bh.ea.einnahmen.map((x) => <div key={x.konto} className="flex justify-between gap-3"><dt>{x.konto} · {x.label}</dt><dd className="ov-num">{eur(x.betrag)}</dd></div>)}
              <div className="flex justify-between gap-3 border-t border-ink-100 pt-1 font-semibold"><dt>Summe Einnahmen</dt><dd className="ov-num">{eur(bh.ea.summeEinnahmen)}</dd></div>
              {bh.ea.ausgaben.map((x) => <div key={x.konto} className="flex justify-between gap-3"><dt>{x.konto} · {x.label}</dt><dd className="ov-num">{eur(x.betrag)}</dd></div>)}
              <div className="flex justify-between gap-3 border-t border-ink-100 pt-1 font-semibold"><dt>Summe Ausgaben</dt><dd className="ov-num">{eur(bh.ea.summeAusgaben)}</dd></div>
              <div className="flex justify-between gap-3 border-t border-ink-200 pt-1 text-[15px] font-bold"><dt>Ergebnis</dt><dd className="ov-num">{eur(bh.ea.ergebnis)}</dd></div>
            </dl>
            <p className="mt-3 text-[12.5px] text-ink-600">Vermögen: Bank {eur(bh.ea.vermoegen.bankEnde)} · Kassa {eur(bh.ea.vermoegen.kassaEnde)} · Forderungen {eur(bh.ea.vermoegen.offeneForderungen)} · Verbindlichkeiten {eur(bh.ea.vermoegen.offeneVerbindlichkeiten)} (VerG § 21)</p>
          </Karte>
          <div className="min-w-0 space-y-6">
            <Karte titel="Kleinunternehmer-Monitor" untertitel={bh.ku.text}>
              <p className="text-[13.5px] text-ink-700">Umsatz {eur(bh.ku.umsatzBrutto)} · Hochrechnung {eur(bh.ku.prognoseBrutto)} · Grenze 55.000 € (Toleranz 60.500 €)</p>
              <p className="mt-2 text-[13px] text-ink-700">Option U 12: Entlastung der Gemeinschaft {eur(bh.ku.option.entlastungGemeinschaft)} (davon Reverse-Charge-Steuer ohne Vorsteuer {eur(bh.ku.option.rcSteuerNichtAbziehbar)}) gegen zusätzliche USt der Mitglieder {eur(bh.ku.option.ustAufMitglieder)}. {bh.ku.option.empfehlung}</p>
              <p className="mt-1 text-[12px] text-ink-500">{bh.ku.option.hinweis}</p>
            </Karte>
            <Karte titel="UVA-Vorbereitung je Quartal" untertitel="Kennzahlen U 30 (zu bestätigen) – mit der Steuerberatung abstimmen" innen="p-0">
              <ul className="divide-y divide-ink-100">
                {bh.uva.map((u) => (
                  <li key={u.quartal} className="px-5 py-3 text-[12.5px] md:px-6">
                    <p className="flex justify-between font-semibold text-ink-900"><span>Q{u.quartal} {bh.jahr}</span><span className="ov-num">Zahllast {eur(u.zahllast)}</span></p>
                    <p className="text-ink-600">{u.kennzahlen.filter((k) => k.betrag || k.steuer).map((k) => `KZ ${k.kz}: ${eur(k.betrag)}${k.steuer !== undefined ? ` (Steuer ${eur(k.steuer)})` : ""}`).join(" · ") || "keine Umsätze"}</p>
                  </li>
                ))}
              </ul>
              <p className="border-t border-ink-100 px-5 py-3 text-[12px] text-ink-500 md:px-6">{bh.uva[0]?.hinweis}</p>
            </Karte>
          </div>
        </div>
      )}

      {aktiv === "export" && (
        <div className="grid gap-6 xl:grid-cols-2">
          {bh ? (
            <Karte titel="Export für Steuerberatung und Rechnungsprüfung" untertitel={`Geschäftsjahr ${bh.jahr} · jeder Export wird protokolliert`}>
              <ul className="grid gap-2 sm:grid-cols-2">
                {[...Object.entries(bh.exportArten), ["paket", "Jahresabschluss-Paket (JSON) für Rechnungsprüfer"]].map(([art, label]) => (
                  <li key={art}><a href={`${api}/export?art=${art}&jahr=${bh.jahr}`} className="flex h-full items-center gap-2 rounded-2xl bg-white px-4 py-3 text-[13.5px] font-semibold text-ink-900 ring-1 ring-inset ring-ink-200 hover:bg-ov-50"><Download aria-hidden="true" className="h-4 w-4 shrink-0 text-ov-700" />{label}</a></li>
                ))}
              </ul>
              <p className="mt-3 text-[12px] text-ink-500">Kontenrahmen und Steuercodes vor dem ersten Import mit der Steuerberatung abstimmen. {bh.luecken.length ? `Nummernlücken: ${bh.luecken.map((l) => l.fehlt.slice(0, 3).join(", ")).join(" · ")}` : "Nummernkreise lückenlos."}</p>
            </Karte>
          ) : null}
          <div className="min-w-0 space-y-6">
            {bh && (
              <Karte titel="Rechnungsprüfung" untertitel="Prüfvermerk mit Prüfsumme (VerG § 21 Abs. 2–5)">
                {bh.pruefvermerke.length > 0 && <ul className="mb-4 space-y-1 text-[13px] text-ink-700">{bh.pruefvermerke.map((x) => <li key={x.id}><ShieldCheck aria-hidden="true" className="mr-1 inline h-4 w-4 text-ov-600" />{x.jahr}: {x.ergebnis.replace("_", " ")} · {x.pruefer} · {tag(x.am)}</li>)}</ul>}
                {bh.stufen.pruefen >= 2 ? <Pruefvermerk api={`${api}/buchhaltung`} jahr={bh.jahr} /> : <p className="text-[13.5px] text-ink-600">Den Prüfvermerk erteilen die Rechnungsprüfer.</p>}
              </Karte>
            )}
            {(s.buchhaltung >= 2 || s.tarife >= 2) && <Klappe titel="Einstellungen der Abrechnung"><Einstellungen api={api} einstellungen={p.einstellungen} darfBuchhaltung={s.buchhaltung >= 2} darfTarife={s.tarife >= 2} /></Klappe>}
          </div>
        </div>
      )}
    </div>
  );
}
