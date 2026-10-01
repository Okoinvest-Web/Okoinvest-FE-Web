// /portal/eg – Energiegemeinschaft im Portal (WP6): eigene Mitgliedschaften mit Status Schritt für Schritt, offene
// Aufgaben (Zustimmung beim Netzbetreiber mit Frist), Mehrfachteilnahme, Einstieg für Organe (WP1-Verwaltung) und Gemeinden,
// für Interessenten die Gemeinschaftssuche mit Eignungscheck. Nur eigene Daten (ptUebersicht).

import Link from "next/link";
import { ArrowRight, Building2, Calculator, FileJson, Landmark, Search, SlidersHorizontal, SunMedium, Users } from "lucide-react";
import { Badge, Karte, PfeilLink, SeitenKopf } from "@/components/Portal/ui";
import { TfBalken, ZustimmungJetzt } from "@/components/Portal/EG/Mitglied/Teile";
import GemeinschaftFinden from "@/components/Portal/EG/Mitglied/GemeinschaftFinden";
import { ct, datumDe, zpKurz } from "@/components/Portal/EG/Mitglied/format";
import { portalNutzer } from "@/lib/plattform/server/seite";
import { egBackend } from "@/lib/plattform/backend/eg";
import { GEMEINSCHAFT_STATUS, MITGLIED_STATUS } from "@/lib/plattform/eg/modell";

/** Download (API, kein Client-Routing) */
const AUSKUNFT = "/api/portal/eg/datenauskunft?download=1";

export const metadata = { title: "Energiegemeinschaft" };

export default async function Seite() {
  const n = await portalNutzer();
  const d = await egBackend().ptUebersicht(n);
  const aktiv = d.mitgliedschaften.filter((m) => m.mitglied.status !== "ausgeschieden");
  const mehrfach = d.mehrfach.filter((z) => z.mehrfach || z.richtung === "erzeugung");
  return (
    <div className="space-y-6">
      <SeitenKopf
        eyebrow="Mein Portal"
        titel="Energiegemeinschaft"
        text={aktiv.length ? "Ihr Gemeinschaftsstrom, Ihre Zählpunkte und alles, was als Nächstes zu tun ist – an einem Ort." : "Strom aus Anlagen in Ihrer Nähe beziehen oder Ihren Überschuss an Nachbarn weitergeben: Finden Sie eine passende Gemeinschaft."}
        aktionen={
          <>
            <a href={AUSKUNFT} className="inline-flex h-10 items-center gap-1.5 rounded-full bg-white px-4 text-[13.5px] font-semibold text-ink-900 ring-1 ring-inset ring-ink-200 hover:bg-ink-50">
              <FileJson aria-hidden="true" className="h-4 w-4 text-ov-700" /> Meine Daten (Art. 15)
            </a>
            <Link href="/portal/eg/beitritt" className="inline-flex h-10 items-center gap-1.5 rounded-full bg-ov-600 px-4 text-[13.5px] font-semibold text-white hover:bg-ov-700">
              <Search aria-hidden="true" className="h-4 w-4" /> Gemeinschaft finden
            </Link>
          </>
        }
      />

      {d.aufgaben.map((a) => {
        const ms = d.mitgliedschaften.find((m) => m.gemeinschaft.id === a.gemeinschaftId);
        const t = ms?.teilnahmen.find((x) => x.id === a.teilnahmeId);
        if (t?.schritte.aktuell === "zustimmung" && !t.schritte.schritte.some((s) => s.zustand === "fehler")) return <ZustimmungJetzt key={a.teilnahmeId} frist={a.frist} anleitung={t.anleitung} gemeinschaftName={a.gemeinschaft} />;
        return (
          <div key={a.teilnahmeId} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-sun-300/15 px-5 py-4 ring-1 ring-sun-400/50">
            <p className="text-[14.5px] text-ink-800"><strong>{a.gemeinschaft}</strong> · Zählpunkt {zpKurz(a.zaehlpunktnummer)}: {a.text}</p>
            <PfeilLink href={`/portal/eg/${a.gemeinschaftId}`}>Details</PfeilLink>
          </div>
        );
      })}

      {aktiv.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {aktiv.map((ms) => (
            <Link key={ms.mitglied.id} href={`/portal/eg/${ms.gemeinschaft.id}`} className="group flex flex-col rounded-[2rem] bg-white p-5 ring-1 ring-ink-200/70 transition-shadow hover:shadow-[0_20px_48px_-24px_rgba(3,18,43,0.35)] hover:ring-ov-200 md:p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-ov-700">{ms.gemeinschaft.modellKurz} · {ms.gemeinschaft.ort}</p>
                  <h2 className="mt-1 font-display text-[20px] font-bold leading-snug text-ink-900">{ms.gemeinschaft.name}</h2>
                </div>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ov-50 text-ov-600 transition-colors group-hover:bg-ov-600 group-hover:text-white"><SunMedium aria-hidden="true" className="h-5 w-5" /></span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge ton={MITGLIED_STATUS[ms.mitglied.status]?.ton}>Mitglied: {ms.mitglied.statusLabel}</Badge>
                {ms.gemeinschaft.status !== "aktiv" && <Badge ton={GEMEINSCHAFT_STATUS[ms.gemeinschaft.status]?.ton}>{ms.gemeinschaft.statusLabel}</Badge>}
                {ms.organ && <Badge ton="dunkel">Organ</Badge>}
                {ms.mitglied.austrittZum && <Badge ton="warn">Austritt {datumDe(ms.mitglied.austrittZum)}</Badge>}
              </div>
              <ul className="mt-5 space-y-4">
                {ms.teilnahmen.map((t) => (
                  <li key={t.id}>
                    <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2 text-[13.5px]">
                      <span className="font-semibold text-ink-800">{t.richtungLabel} {zpKurz(t.zaehlpunktnummer)}{t.bezeichnung ? ` · ${t.bezeichnung}` : ""}</span>
                      <span className="text-ink-500">{t.statusLabel} · TF {t.teilnahmefaktor} %</span>
                    </div>
                    <div className="flex gap-1" aria-label={`Schritt ${t.schritte.schritte.findIndex((s) => s.id === t.schritte.aktuell) + 1} von 6`}>
                      {t.schritte.schritte.map((s) => <span key={s.id} className={`h-1.5 flex-1 rounded-full ${s.zustand === "erledigt" ? "bg-ov-500" : s.zustand === "aktuell" ? "bg-ov-300" : s.zustand === "fehler" ? "bg-sun-400" : "bg-ink-100"}`} />)}
                    </div>
                  </li>
                ))}
                {!ms.teilnahmen.length && <li className="text-[13.5px] text-ink-500">Noch kein Zählpunkt angemeldet.</li>}
              </ul>
              <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-4 text-[13.5px]">
                <span className="text-ink-600">{ms.tarif ? <>Bezug <strong className="ov-num text-ink-900">{ct(ms.tarif.bezugspreisCt)}</strong> · Einspeisung <strong className="ov-num text-ink-900">{ct(ms.tarif.einspeisepreisCt)}</strong> je kWh</> : "Preisblatt folgt"}</span>
                <span className="inline-flex items-center gap-1 font-semibold text-ov-700">Dashboard <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {(d.organe.length > 0 || d.gemeinde || mehrfach.length > 0) && (
        <div className="grid gap-4 md:grid-cols-3">
          {d.organe.map((o) => (
            <Einstieg key={o.id} href={o.href} icon={Users} titel={`Verwaltung: ${o.name}`} text="Aufnahmen, Zustimmungen, Mitglieder, Tarife – für Vorstand, Kassa und Rechnungsprüfung." />
          ))}
          {d.gemeinde && <Einstieg href="/portal/eg/gemeinde" icon={Landmark} titel="Gemeinde-Sicht" text="Gemeindegebäude, Sozialquote nach § 68 Abs. 6 ElWG und Bürgerbeteiligung auf einen Blick." />}
          {mehrfach.length > 0 && <Einstieg href="/portal/eg/mehrfach" icon={SlidersHorizontal} titel="Mehrfachteilnahme" text={`${mehrfach.length} Zählpunkt${mehrfach.length === 1 ? "" : "e"} – Teilnahmefaktoren über bis zu fünf Gemeinschaften verteilen.`} />}
        </div>
      )}

      {mehrfach.filter((z) => z.mehrfach).length > 0 && (
        <Karte titel="Ihre Zählpunkte in mehreren Gemeinschaften" untertitel="Summe der Teilnahmefaktoren höchstens 100 % (ElWG § 71 Abs. 5)" aktion={<PfeilLink href="/portal/eg/mehrfach">Anpassen</PfeilLink>}>
          <ul className="space-y-5">
            {mehrfach.filter((z) => z.mehrfach).map((z) => (
              <li key={z.zaehlpunktId}>
                <p className="mb-2 text-[13.5px] font-semibold text-ink-800">{z.richtung === "erzeugung" ? "Erzeugung" : "Verbrauch"} {zpKurz(z.zaehlpunktnummer)}</p>
                <TfBalken z={z} />
              </li>
            ))}
          </ul>
        </Karte>
      )}

      {!aktiv.length && (
        <Karte titel="Passende Gemeinschaft finden" untertitel="Postleitzahl eingeben – wir zeigen, welche Gemeinschaften für Ihren Anschluss in Frage kommen.">
          <GemeinschaftFinden gemeinschaften={d.offeneGemeinschaften} plz={d.plz} />
        </Karte>
      )}

      {d.interessen.length > 0 && (
        <Karte titel="Ihr Interesse" untertitel="Wir melden uns, sobald eine passende Gemeinschaft Mitglieder aufnimmt.">
          <ul className="divide-y divide-ink-100">
            {d.interessen.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-[14px] text-ink-700">
                <span>PLZ {i.plz} · {i.rolle === "erzeuger" ? "Erzeuger/in" : i.rolle === "prosumer" ? "Prosumer" : "Verbraucher/in"} · seit {datumDe(i.am)}</span>
                <Badge ton={i.status === "beigetreten" ? "ok" : "info"}>{i.statusLabel}</Badge>
              </li>
            ))}
          </ul>
        </Karte>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Einstieg href="/energiegemeinschaften/rechner" icon={Calculator} titel="Was bringt mir eine Gemeinschaft?" text="Ersparnis-Rechner mit den Netzentgelt-Regeln 2026 und 2027 – in einer Minute." />
        <Einstieg href="/portal/eg/gruendung" icon={Building2} titel="Selbst eine Gemeinschaft gründen" text="Als Gemeinde, Verein oder Nachbarschaft: Wir begleiten Gründung, Netzbetreiber und Betrieb." />
      </div>
    </div>
  );
}

function Einstieg({ href, icon: Icon, titel, text }) {
  return (
    <Link href={href} className="group flex gap-4 rounded-3xl bg-white p-5 ring-1 ring-ink-200/70 transition-shadow hover:shadow-[0_12px_32px_-18px_rgba(3,18,43,0.35)] hover:ring-ov-200">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-navy-950 text-ov-300"><Icon aria-hidden="true" className="h-5 w-5" /></span>
      <span className="min-w-0">
        <span className="flex items-center gap-1 font-display text-[16px] font-bold text-ink-900">{titel}<ArrowRight aria-hidden="true" className="h-4 w-4 text-ov-700 transition-transform group-hover:translate-x-0.5" /></span>
        <span className="mt-1 block text-[13.5px] leading-relaxed text-ink-600">{text}</span>
      </span>
    </Link>
  );
}
