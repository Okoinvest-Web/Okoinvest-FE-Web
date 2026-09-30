// src/components/Portal/Finanzen/teile.js
//
// Kleine Bausteine „Finanzen & Abrechnung“ (Server- und Client-tauglich, ohne Hooks): Beträge, Status-Badges,
// PDF-Link, Belegliste (Tabelle ab md, Karten mobil) und Monatsdiagramm (Inline-SVG).

import { FileDown } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { Badge } from "@/components/Portal/ui";
import { ZAHLUNGSSTATUS } from "@/lib/plattform/finanzen/konstanten";

export const euro = (x) => (Number.isFinite(Number(x)) ? `${Number(x).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €` : "–");
export const euro0 = (x) => (Number.isFinite(Number(x)) ? `${Math.round(Number(x)).toLocaleString("de-DE")} €` : "–");
export const kwh = (x) => (Number.isFinite(Number(x)) ? `${Math.round(Number(x)).toLocaleString("de-DE")} kWh` : "–");
export function tag(iso) {
  if (!/^\d{4}-\d{2}-\d{2}/.test(String(iso || ""))) return "–";
  const [j, m, t] = String(iso).slice(0, 10).split("-");
  return `${t}.${m}.${j}`;
}
export const zeitraum = (z) => (z?.von ? (z.von === z.bis ? tag(z.von) : `${tag(z.von)} – ${tag(z.bis)}`) : "–");

export function ZahlungBadge({ status, className }) {
  const s = ZAHLUNGSSTATUS[status] || ZAHLUNGSSTATUS.offen;
  return <Badge ton={s.ton} className={className}>{s.label}</Badge>;
}

export function PdfLink({ id, nummer, klein = false }) {
  return (
    <a
      href={`/api/portal/finanzen/${id}/pdf?anzeigen=1`}
      target="_blank"
      rel="noopener"
      className={cn("inline-flex items-center gap-1.5 rounded-full font-semibold text-ov-700 ring-1 ring-inset ring-ov-200 hover:bg-ov-50 hover:text-ov-800", klein ? "px-2.5 py-1 text-[12.5px]" : "px-3 py-1.5 text-[13px]")}
    >
      <FileDown aria-hidden="true" className="h-3.5 w-3.5" />
      PDF<span className="sr-only"> {nummer} öffnen</span>
    </a>
  );
}

/**
 * Belegliste. `spalten`: zusätzliche Anzeige („empfaenger“ fürs Backoffice), `aktionen(b)` rendert rechts (Backoffice).
 */
export function BelegListe({ belege = [], leer = "Noch keine Belege.", mitEmpfaenger = false, aktionen = null, betragLabel = "Betrag" }) {
  if (!belege.length) return <p className="px-5 py-8 text-center text-[14px] text-ink-500 md:px-6">{leer}</p>;
  return (
    <>
      <div className="hidden md:block">
        <table className="w-full text-left text-[14px]">
          <thead className="border-b border-ink-100 text-[12px] uppercase tracking-wide text-ink-500">
            <tr>
              <th scope="col" className="px-6 py-3 font-semibold">Beleg</th>
              {mitEmpfaenger && <th scope="col" className="px-3 py-3 font-semibold">Empfänger</th>}
              <th scope="col" className="px-3 py-3 font-semibold">Zeitraum</th>
              <th scope="col" className="px-3 py-3 text-right font-semibold">{betragLabel}</th>
              <th scope="col" className="px-3 py-3 font-semibold">Fällig</th>
              <th scope="col" className="px-3 py-3 font-semibold">Status</th>
              <th scope="col" className="px-6 py-3 text-right font-semibold"><span className="sr-only">Aktionen</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {belege.map((b) => (
              <tr key={b.id} className="align-top">
                <td className="px-6 py-3">
                  <p className="ov-num font-semibold text-ink-900">{b.nummer}</p>
                  <p className="max-w-[22rem] truncate text-[12.5px] text-ink-500" title={b.bezugText}>{b.artLabel}{b.kennzahlen?.gelieferteKwh ? ` · ${kwh(b.kennzahlen.gelieferteKwh)}` : ""}</p>
                </td>
                {mitEmpfaenger && <td className="max-w-[14rem] truncate px-3 py-3 text-ink-700" title={b.empfaenger}>{b.empfaenger}</td>}
                <td className="whitespace-nowrap px-3 py-3 text-ink-700">{zeitraum(b.zeitraum)}</td>
                <td className="ov-num whitespace-nowrap px-3 py-3 text-right font-semibold text-ink-900">{euro(b.brutto)}</td>
                <td className="whitespace-nowrap px-3 py-3 text-ink-700">{tag(b.faelligAm)}</td>
                <td className="px-3 py-3">
                  <ZahlungBadge status={b.zahlungsstatus} />
                  {b.bezahltAm && <p className="mt-1 text-[12px] text-ink-500">am {tag(b.bezahltAm)}</p>}
                </td>
                <td className="px-6 py-3 text-right">
                  <div className="flex flex-wrap justify-end gap-1.5">
                    <PdfLink id={b.id} nummer={b.nummer} klein />
                    {aktionen?.(b)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="divide-y divide-ink-100 md:hidden">
        {belege.map((b) => (
          <li key={b.id} className="px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="ov-num font-semibold text-ink-900">{b.nummer}</p>
                <p className="text-[12.5px] text-ink-500">{zeitraum(b.zeitraum)}</p>
                {mitEmpfaenger && <p className="truncate text-[12.5px] text-ink-600">{b.empfaenger}</p>}
              </div>
              <p className="ov-num shrink-0 font-display text-[17px] font-bold text-ink-900">{euro(b.brutto)}</p>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <ZahlungBadge status={b.zahlungsstatus} />
              <span className="text-[12.5px] text-ink-500">fällig {tag(b.faelligAm)}</span>
              <span className="ml-auto flex flex-wrap gap-1.5">
                <PdfLink id={b.id} nummer={b.nummer} klein />
                {aktionen?.(b)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

const MONAT_KURZ = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

/** Monatsbalken (kWh geliefert) mit Rechnungsbetrag – Inline-SVG, skaliert mit der Breite */
export function MonatsDiagramm({ monate = [] }) {
  if (!monate.length) return <p className="text-[14px] text-ink-500">Für dieses Jahr liegen noch keine Monatsabrechnungen vor.</p>;
  const max = Math.max(1, ...monate.map((m) => m.kwh));
  const B = 640;
  const H = 210;
  const unten = 34;
  const breite = B / 12;
  return (
    <figure>
      <svg viewBox={`0 0 ${B} ${H}`} role="img" aria-label="Gelieferter PV-Strom je Monat" className="h-auto w-full">
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1="0" x2={B} y1={(H - unten) * (1 - f) + 8} y2={(H - unten) * (1 - f) + 8} className="stroke-ink-100" strokeWidth="1" />
        ))}
        {Array.from({ length: 12 }, (_, i) => {
          const m = monate.find((x) => Number(x.monat.slice(5)) === i + 1);
          const h = m ? ((H - unten - 16) * m.kwh) / max : 0;
          const x = i * breite + breite * 0.18;
          return (
            <g key={i}>
              {m && <rect x={x} y={H - unten - h} width={breite * 0.64} height={Math.max(h, 1)} rx="5" className="fill-ov-500" />}
              <text x={i * breite + breite / 2} y={H - 14} textAnchor="middle" className="fill-ink-500 text-[11px]">{MONAT_KURZ[i]}</text>
              {m && <text x={i * breite + breite / 2} y={H - unten - h - 5} textAnchor="middle" className="fill-ink-700 text-[10px] font-semibold">{Math.round(m.kwh / 1000).toLocaleString("de-DE")}</text>}
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-1 text-[12.5px] text-ink-500">Gelieferter PV-Strom je Monat in MWh (geeichte Zählerstände, Erzeugung abzüglich Einspeisung).</figcaption>
    </figure>
  );
}
