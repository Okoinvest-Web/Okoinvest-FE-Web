// /portal/eg/[id] – Mitglieder-Dashboard einer Energiegemeinschaft (WP6): Status jeder Teilnahme Schritt für Schritt mit
// Fristhinweis und Anleitung je Netzbetreiber, Gemeinschaftsstrom (Anteil, Ersparnis inkl. Netzentgelt, CO₂), grüne Stunden,
// Preisblatt, Empfehlungen, Mehrfachteilnahme, Belege, eigene Daten und Kündigung. Recht „eigene_daten“; ohne Rolle 404.

import Link from "next/link";
import { FileText, Lightbulb, ReceiptText, Settings2, SlidersHorizontal, Sun, UserRound } from "lucide-react";
import { Angaben, Badge, Karte, Leer, PfeilLink, SeitenKopf } from "@/components/Portal/ui";
import { Klappe } from "@/components/Portal/Mitglied/teile";
import { Empfehlungen, GrueneStunden, Meilensteine, TeilnahmeStatus, TfBalken } from "@/components/Portal/EG/Mitglied/Teile";
import EnergieKarte from "@/components/Portal/EG/Mitglied/EnergieKarte";
import { Kuendigung, OptimiererVorschlag, TfWunsch } from "@/components/Portal/EG/Mitglied/Aktionen";
import { ct, datumDe, eur, zpKurz } from "@/components/Portal/EG/Mitglied/format";
import { portalNutzer, laden } from "@/lib/plattform/server/seite";
import { egBackend } from "@/lib/plattform/backend/eg";
import { MITGLIED_STATUS, RECHNUNGSWEGE } from "@/lib/plattform/eg/modell";

/** Download (API, kein Client-Routing) */
const AUSKUNFT = "/api/portal/eg/datenauskunft?download=1";

export const metadata = { title: "Meine Energiegemeinschaft" };

export default async function Dashboard({ params }) {
  const n = await portalNutzer();
  const { id } = await params;
  const d = await laden(() => egBackend().ptGemeinschaft(n, id));
  const g = d.gemeinschaft;
  const m = d.mitglied;
  const verwaltung = d.organ ? (
    <Link href={`/portal/eg/${g.id}/verwaltung`} className="inline-flex h-10 items-center gap-1.5 rounded-full bg-navy-950 px-4 text-[13.5px] font-semibold text-white hover:bg-navy-900">
      <Settings2 aria-hidden="true" className="h-4 w-4" /> Verwaltung
    </Link>
  ) : null;
  if (!m) {
    return (
      <div className="space-y-6">
        <SeitenKopf eyebrow={`${g.modellKurz} · ${g.ort}`} titel={g.name} aktionen={verwaltung} />
        <Leer icon={UserRound} titel="Sie sind hier nicht als Mitglied eingetragen" text="Ihre Rolle in dieser Gemeinschaft ist eine Organ-Funktion. Mitgliederdaten, Aufnahmen und Tarife finden Sie in der Verwaltung." aktion={verwaltung} />
      </div>
    );
  }
  const tf = d.teilnahmen.filter((t) => ["entwurf", "aktiv"].includes(t.status));
  const hatErzeugung = d.teilnahmen.some((t) => t.richtung === "erzeugung");
  const tarif = d.tarif;
  return (
    <div className="space-y-6">
      <SeitenKopf eyebrow={`${g.modellLabel} · ${g.ort}`} titel={g.name} text={`Mitglied Nr. ${m.mitgliedsnummer} · ${m.artLabel}${m.beitrittAm ? ` · seit ${datumDe(m.beitrittAm)}` : ""}`} aktionen={verwaltung}>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge ton={MITGLIED_STATUS[m.status]?.ton}>Mitgliedschaft: {m.statusLabel}</Badge>
          {m.austrittZum && <Badge ton="warn">Austritt zum {datumDe(m.austrittZum)}</Badge>}
          {g.organisator && <Badge ton="info">Betreut durch ÖkoInvest</Badge>}
        </div>
      </SeitenKopf>

      <Karte titel="Ihre Zählpunkte" untertitel="Was passiert ist, was als Nächstes kommt – Schritt für Schritt">
        {d.teilnahmen.length ? (
          <ul className="divide-y divide-ink-100">
            {d.teilnahmen.map((t) => <li key={t.id} className="py-5 first:pt-0 last:pb-0"><TeilnahmeStatus t={t} gemeinschaftName={g.name} /></li>)}
          </ul>
        ) : <Leer titel="Noch kein Zählpunkt" text="Sobald Ihr Zählpunkt erfasst ist, sehen Sie hier jeden Schritt bis zum ersten Gemeinschaftsstrom." />}
      </Karte>

      <EnergieKarte energie={d.energie} hatErzeugung={hatErzeugung} />

      <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
        <Karte titel="Wann gibt es viel Gemeinschaftsstrom?" untertitel="Verbrauch in diese Zeiten legen – das erhöht Ihren Anteil" aktion={<Sun aria-hidden="true" className="h-5 w-5 text-sun-500" />}>
          <GrueneStunden stunden={d.stunden} heute={d.heute} />
        </Karte>
        <Karte titel="Preisblatt" untertitel={tarif ? tarif.bezeichnung : "noch kein gültiges Preisblatt"} aktion={<ReceiptText aria-hidden="true" className="h-5 w-5 text-ov-600" />}>
          {tarif ? (
            <div className="space-y-4">
              <dl className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-sand-50 p-3.5"><dt className="text-[12.5px] text-ink-500">Bezug aus der Gemeinschaft</dt><dd className="ov-num mt-0.5 font-display text-[22px] font-extrabold text-ink-900">{ct(tarif.bezugspreisCt)}</dd><dd className="text-[12px] text-ink-500">je kWh netto</dd></div>
                <div className="rounded-2xl bg-sand-50 p-3.5"><dt className="text-[12.5px] text-ink-500">Einspeisung in die Gemeinschaft</dt><dd className="ov-num mt-0.5 font-display text-[22px] font-extrabold text-ink-900">{ct(tarif.einspeisepreisCt)}</dd><dd className="text-[12px] text-ink-500">je kWh netto</dd></div>
              </dl>
              {(tarif.zeitfenster || []).length > 0 && (
                <ul className="space-y-1.5 text-[13.5px] text-ink-700">
                  {tarif.zeitfenster.map((z) => <li key={z.id || z.label} className="flex flex-wrap justify-between gap-2"><span>{z.label} {z.von}–{z.bis} Uhr{z.monate?.length ? ` (Monate ${z.monate.join(", ")})` : ""}</span><span className="ov-num font-semibold">{ct(z.bezugspreisCt)}</span></li>)}
                </ul>
              )}
              <p className="text-[12.5px] leading-relaxed text-ink-500">{[tarif.grundgebuehrMonat ? `Grundgebühr ${eur(tarif.grundgebuehrMonat)}/Monat` : "", tarif.mitgliedsbeitragJahr ? `Mitgliedsbeitrag ${eur(tarif.mitgliedsbeitragJahr)}/Jahr` : ""].filter(Boolean).join(" · ")}{d.netzentgelt ? ` · Netzentgelt: ${d.netzentgelt}` : ""}</p>
            </div>
          ) : <p className="text-[14px] text-ink-600">Die Gemeinschaft beschließt das Preisblatt; wir informieren Sie vor jeder Änderung.</p>}
        </Karte>
      </div>

      {(d.empfehlungen.length > 0 || d.meilensteine.length > 0) && (
        <Karte titel="Tipps für mehr Gemeinschaftsstrom" untertitel="Nur Empfehlungen – nichts wird ferngesteuert" aktion={<Lightbulb aria-hidden="true" className="h-5 w-5 text-ov-600" />}>
          <Empfehlungen liste={d.empfehlungen} />
          {d.meilensteine.length > 0 && <div className="mt-6"><p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.16em] text-ink-500">Ihre Meilensteine dieses Jahr</p><Meilensteine liste={d.meilensteine} /></div>}
        </Karte>
      )}

      {(tf.length > 0 || d.mehrfach.some((z) => z.mehrfach)) && (
        <Karte titel="Teilnahmefaktor" untertitel="Welcher Anteil Ihres Zählpunkts dieser Gemeinschaft zugeordnet ist" aktion={<SlidersHorizontal aria-hidden="true" className="h-5 w-5 text-ov-600" />}>
          <div className="space-y-5">
            {d.tfVorschlag && (
              <div className="rounded-2xl bg-ov-50 p-4 ring-1 ring-ov-200">
                <p className="font-semibold text-ov-900">Vorschlag des Optimierers{d.tfVorschlag.mehrwertEur ? `: rund ${eur(d.tfVorschlag.mehrwertEur)} mehr im Jahr` : ""}</p>
                <ul className="mt-1.5 space-y-0.5 text-[13.5px] text-ink-700">{d.tfVorschlag.vorschlaege.map((v) => <li key={v.gemeinschaftId || v.teilnahmeId}>{v.label || v.gemeinschaftId}: {v.aktuellTf !== null ? `${v.aktuellTf} % → ` : ""}<strong>{v.teilnahmefaktor} %</strong></li>)}</ul>
              </div>
            )}
            {d.teilnahmen.filter((t) => t.richtung === "erzeugung" && t.status === "aktiv").slice(0, 1).map((t) => <OptimiererVorschlag key={t.id} zaehlpunktId={t.zaehlpunktId} />)}
            {d.mehrfach.filter((z) => z.mehrfach).map((z) => <div key={z.zaehlpunktId}><p className="mb-2 text-[13.5px] font-semibold text-ink-800">Zählpunkt {zpKurz(z.zaehlpunktnummer)} in {z.anzahl} Gemeinschaften</p><TfBalken z={z} /></div>)}
            {tf.map((t) => {
              const z = d.mehrfach.find((x) => x.zaehlpunktId === t.zaehlpunktId);
              return (
                <Klappe key={t.id} titel={`Teilnahmefaktor ändern: ${t.richtungLabel} ${zpKurz(t.zaehlpunktnummer)} (derzeit ${t.teilnahmefaktor} %)${t.tfWunsch ? ` – Wunsch ${t.tfWunsch.nach} % offen` : ""}`}>
                  <TfWunsch teilnahme={t} freiTf={z ? z.freiTf : null} />
                </Klappe>
              );
            })}
            <PfeilLink href="/portal/eg/mehrfach">Alle Gemeinschaften und Zählpunkte</PfeilLink>
          </div>
        </Karte>
      )}

      <Karte titel="Belege" untertitel="Rechnungen und Gutschriften der Gemeinschaft" aktion={<FileText aria-hidden="true" className="h-5 w-5 text-ov-600" />}>
        {d.belege.liste.length ? (
          <ul className="divide-y divide-ink-100">
            {d.belege.liste.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-[14px]">
                <span className="min-w-0 text-ink-800"><strong>{b.nummer || b.id}</strong> · {b.typLabel || b.typ}{b.von ? ` ${datumDe(b.von)}–${datumDe(b.bis)}` : ` · ${datumDe(b.datum || b.erstelltAm)}`}{b.ersparnis?.gesamtEur ? <span className="block text-[12.5px] text-ink-500">Ihr Vorteil laut Beleg (Schätzung): {eur(b.ersparnis.gesamtEur)}</span> : null}</span>
                <span className="flex items-center gap-3">{b.statusLabel && <Badge ton={b.ton}>{b.statusLabel}</Badge>}<span className="ov-num font-semibold text-ink-900">{eur(b.brutto ?? b.betrag)}</span>{b.id && <a href={b.pdfUrl || `/api/portal/eg/belege/${b.id}`} className="font-semibold text-ov-700 hover:text-ov-800">PDF</a>}</span>
              </li>
            ))}
          </ul>
        ) : <Leer icon={FileText} titel="Noch keine Belege" text={d.belege.verfuegbar ? "Die erste Abrechnung erstellt die Gemeinschaft nach dem ersten vollständigen Monat mit Werten des Netzbetreibers (frühestens ab dem 20. des Folgemonats)." : d.belege.hinweis || "Die Abrechnung wird gerade angebunden."} />}
      </Karte>

      <Karte titel="Meine Angaben" untertitel="Änderungen bitte über die Gemeinschaft" aktion={<UserRound aria-hidden="true" className="h-5 w-5 text-ov-600" />}>
        <Angaben items={[
          { label: "Name", wert: m.name },
          { label: "Anschrift", wert: [m.person?.strasse, [m.person?.plz, m.person?.ort].filter(Boolean).join(" ")].filter(Boolean).join(", ") },
          { label: "IBAN", wert: m.iban || "–" },
          { label: "SEPA-Mandat", wert: m.sepaMandat ? `${m.sepaMandat.referenz} vom ${datumDe(m.sepaMandat.datum)}` : "nicht erteilt" },
          { label: "Rechnungsweg", wert: RECHNUNGSWEGE[m.rechnungsweg] || m.rechnungsweg },
          { label: "Datenauskunft", wert: <a href={AUSKUNFT} className="font-semibold text-ov-700 hover:text-ov-800">Alle gespeicherten Daten herunterladen (Art. 15 DSGVO)</a>, breit: true },
        ]} />
        {(d.aktionen.kuendigen || d.aktionen.zurueckziehen) && <div className="mt-5"><Kuendigung mitglied={m} fruehestens={d.aktionen.kuendigungFruehestens} zurueckziehen={d.aktionen.zurueckziehen} /></div>}
      </Karte>
    </div>
  );
}
